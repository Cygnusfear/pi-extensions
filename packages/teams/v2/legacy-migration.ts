import type { SessionHeader } from "@earendil-works/pi-coding-agent";
import type { WorkerSessionMode } from "./protocol.ts";
import type { JsonValue, LifecycleFact, LifecycleMigrationMarker } from "./state.ts";
import {
	LIFECYCLE_MIGRATION_ENTRY_TYPE,
	createLeaderEventId,
	createRootEventId,
	parseMigrationMarker,
	sha256Id,
	type SessionEntryLike,
	type SessionFactWriter,
} from "./session-facts.ts";

interface LegacyAttempt {
	workerInstanceId?: string;
	pid?: number;
	sessionDir?: string;
	sessionFile?: string;
	spawnedAt?: number;
	sessionMode?: WorkerSessionMode;
	exitCode?: number | null;
	spawnError?: string;
}

interface LegacyWorker {
	workerId?: string;
	workerInstanceId?: string;
	name?: string;
	pid?: number;
	ticketId?: string;
	sessionDir?: string;
	sessionFile?: string;
	worktreePath?: string | null;
	model?: string;
	hasTools?: boolean;
	status?: string;
	spawnedAt?: number;
	freeform?: boolean;
	terminalStatus?: "done" | "quit";
	terminalSummary?: string;
	attempts?: LegacyAttempt[];
	spawnError?: string;
	killedAt?: number;
}

interface LegacySnapshot {
	version?: number;
	v2TeamId?: string | null;
	v2TeamRecord?: LegacyV2TeamRecord;
	workers?: Record<string, LegacyWorker>;
	savedAt?: number;
	clearedAt?: number;
}

interface LegacyV2Fact {
	type?: string;
	at?: number;
	pid?: number;
	exitCode?: number | null;
	summary?: string;
	outcome?: string;
	reason?: string;
}

interface LegacyV2Attempt {
	attemptId?: string;
	workerId?: string;
	leaderEpoch?: string;
	sessionMode?: WorkerSessionMode;
	sessionDir?: string;
	sessionFile?: string;
	pid?: number;
	startedAt?: number;
	exitCode?: number | null;
	facts?: LegacyV2Fact[];
}

interface LegacyV2Worker {
	workerId?: string;
	name?: string;
	currentAttemptId?: string;
	attempts?: LegacyV2Attempt[];
}

interface LegacyV2TeamRecord {
	teamId?: string;
	leaderEpoch?: string;
	workers?: Record<string, LegacyV2Worker>;
}

export interface LegacyMigrationPlan {
	skipped: boolean;
	reason?: "fork" | "already_migrated" | "no_legacy_entries";
	facts: LifecycleFact[];
	marker?: LifecycleMigrationMarker;
}

function asLegacySnapshot(value: unknown): LegacySnapshot | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as LegacySnapshot;
	if (!candidate.workers || typeof candidate.workers !== "object") return null;
	return candidate;
}

function legacyMode(attempt: LegacyAttempt, worker: LegacyWorker): WorkerSessionMode {
	const mode = attempt.sessionMode;
	if (mode?.kind === "fresh" || mode?.kind === "fork" || mode?.kind === "resume") return mode;
	const sessionFile = attempt.sessionFile ?? worker.sessionFile ?? "";
	return sessionFile ? { kind: "resume", sessionFile } : { kind: "fresh" };
}

function attemptKey(sessionId: string, teamId: string, workerId: string, attempt: LegacyAttempt, worker: LegacyWorker): string {
	return sha256Id("teams:attempt:legacy:", {
		coordinatorSessionId: sessionId,
		teamId,
		workerId,
		workerInstanceId: attempt.workerInstanceId ?? worker.workerInstanceId ?? "unknown",
		spawnedAt: attempt.spawnedAt ?? worker.spawnedAt ?? 0,
		pid: attempt.pid ?? worker.pid ?? 0,
		sessionMode: legacyMode(attempt, worker) as unknown as JsonValue,
	});
}

function existingMarker(entries: readonly SessionEntryLike[], sessionId: string): LifecycleMigrationMarker | null {
	for (const entry of entries) {
		if (entry.type !== "custom" || entry.customType !== LIFECYCLE_MIGRATION_ENTRY_TYPE) continue;
		const marker = parseMigrationMarker(entry.data);
		if (marker?.coordinatorSessionId === sessionId) return marker;
	}
	return null;
}

export function planLegacyMigration(
	entries: readonly SessionEntryLike[],
	header: SessionHeader | null,
	coordinatorSessionId: string,
	teamId: string,
	sourceLeaderEpoch = "legacy-migration",
): LegacyMigrationPlan {
	if (header?.parentSession) return { skipped: true, reason: "fork", facts: [] };
	if (existingMarker(entries, coordinatorSessionId)) return { skipped: true, reason: "already_migrated", facts: [] };

	const snapshots: LegacySnapshot[] = [];
	for (const entry of entries) {
		if (entry.type !== "custom" || entry.customType !== "teams-leader-state") continue;
		const snapshot = asLegacySnapshot(entry.data);
		if (snapshot) snapshots.push(snapshot);
	}
	if (snapshots.length === 0) return { skipped: true, reason: "no_legacy_entries", facts: [] };

	const factsById = new Map<string, LifecycleFact>();
	const importedAttemptIds = new Set<string>();
	const teamIdentity = { coordinatorSessionId, teamId, workerId: "__team__", attemptId: "__team__" };
	const teamEventId = createRootEventId("team_created", { coordinatorSessionId, teamId });
	factsById.set(teamEventId, {
		schemaVersion: 4,
		...teamIdentity,
		eventId: teamEventId,
		kind: "team_created",
		sourceLeaderEpoch,
		occurredAt: Number(snapshots[0]?.savedAt ?? 0),
		payload: { root: "coordinator_session" },
	});

	// v3 snapshots embedded the previous reducer record beside worker handles.
	// Import every attempt/fact from every physical leaf before consulting the
	// lossy handle snapshot so declarations from older attempts are preserved.
	const v2AttemptIds = new Set<string>();
	for (const snapshot of snapshots) {
		for (const [workerKey, record] of Object.entries(snapshot.v2TeamRecord?.workers ?? {})) {
			const workerId = record.workerId ?? workerKey;
			const name = record.name ?? workerKey;
			const handle = snapshot.workers?.[name]
				?? Object.values(snapshot.workers ?? {}).find((candidate) => candidate.workerInstanceId === record.currentAttemptId)
				?? {};
			for (const legacyAttempt of record.attempts ?? []) {
				if (!legacyAttempt.attemptId) continue;
				const attemptId = legacyAttempt.attemptId;
				v2AttemptIds.add(attemptId);
				importedAttemptIds.add(attemptId);
				const identity = { coordinatorSessionId, teamId, workerId, attemptId };
				const mode = legacyAttempt.sessionMode ?? legacyMode({}, handle);
				const sessionDir = legacyAttempt.sessionDir ?? handle.sessionDir ?? "";
				const workerSessionFile = legacyAttempt.sessionFile ?? handle.sessionFile ?? "";
				const startedAt = legacyAttempt.startedAt ?? handle.spawnedAt ?? snapshot.savedAt ?? 0;
				const spawnId = createRootEventId("spawn_requested", { coordinatorSessionId, teamId, workerId, attemptId });
				factsById.set(spawnId, {
					schemaVersion: 4, ...identity, eventId: spawnId, kind: "spawn_requested", sourceLeaderEpoch,
					occurredAt: startedAt,
					payload: {
						name, ticketId: handle.ticketId ?? "legacy-unknown", persistent: Boolean(handle.freeform),
						sessionMode: mode, sessionDir, workerSessionFile, worktreePath: handle.worktreePath ?? null,
						...(handle.model ? { model: handle.model } : {}),
						...(handle.hasTools !== undefined ? { hasTools: handle.hasTools } : {}),
					},
				});

				let startId: string | null = null;
				let exitId: string | null = null;
				let hasDeclaration = false;
				for (let index = 0; index < (legacyAttempt.facts ?? []).length; index++) {
					const old = legacyAttempt.facts![index]!;
					const at = old.at ?? startedAt;
					const cause = `legacy-v2:${old.type ?? "unknown"}:${at}:${index}`;
					if (old.type === "spawn_started") {
						const pid = old.pid ?? legacyAttempt.pid;
						if (typeof pid !== "number" || pid <= 0) continue;
						startId = createLeaderEventId(identity, "process_started", spawnId);
						factsById.set(startId, {
							schemaVersion: 4, ...identity, eventId: startId, kind: "process_started", sourceLeaderEpoch,
							occurredAt: at, payload: { pid, processBirth: { startedAt }, sessionMode: mode, workerSessionFile, sessionDir },
						});
					} else if (old.type === "finish_done" || old.type === "finish_quit") {
						const kind = old.type === "finish_done" ? "declaration_done" : "declaration_quit";
						const eventId = createLeaderEventId(identity, kind, cause);
						factsById.set(eventId, {
							schemaVersion: 4, ...identity, eventId, kind, sourceLeaderEpoch,
							occurredAt: at, payload: { summary: old.summary ?? `Legacy ${kind}` },
						});
						hasDeclaration = true;
					} else if (old.type === "process_exit") {
						const pid = legacyAttempt.pid ?? old.pid;
						if (typeof pid !== "number" || pid <= 0) continue;
						exitId = createLeaderEventId(identity, "process_exited", `${pid}:${startedAt}`);
						factsById.set(exitId, {
							schemaVersion: 4, ...identity, eventId: exitId, kind: "process_exited", sourceLeaderEpoch,
							occurredAt: at, payload: { pid, processBirth: { startedAt }, code: old.exitCode ?? legacyAttempt.exitCode ?? null },
						});
					} else if (old.type === "worker_killed") {
						const eventId = createLeaderEventId(identity, "assessment_killed", exitId ?? cause);
						factsById.set(eventId, {
							schemaVersion: 4, ...identity, eventId, kind: "assessment_killed", sourceLeaderEpoch,
							occurredAt: at, payload: { reason: old.reason ?? "Legacy worker killed", provisional: false },
						});
					} else if (old.type === "exit_assessed" && !hasDeclaration) {
						const kind = old.outcome === "failed" ? "assessment_crash" : "assessment_missing_finish";
						const eventId = createLeaderEventId(identity, kind, exitId ?? cause);
						factsById.set(eventId, {
							schemaVersion: 4, ...identity, eventId, kind, sourceLeaderEpoch,
							occurredAt: at,
							payload: { reason: old.reason ?? "Legacy attempt ended without an explicit declaration", provisional: false, ...(kind === "assessment_missing_finish" ? { legacyAmbiguous: true } : {}) },
						});
					}
				}
			}
		}
	}

	interface MergedAttempt { worker: LegacyWorker; attempt: LegacyAttempt; name: string; snapshotAt: number; isLatest: boolean }
	const merged = new Map<string, MergedAttempt>();
	for (const snapshot of snapshots) {
		for (const [nameKey, worker] of Object.entries(snapshot.workers ?? {})) {
			const name = worker.name ?? nameKey;
			const logicalSeed = worker.workerInstanceId ?? `${name}:${worker.ticketId ?? "unknown"}:${worker.spawnedAt ?? 0}`;
			const workerId = worker.workerId
				?? sha256Id("teams:worker:legacy:", { coordinatorSessionId, teamId, workerInstanceId: logicalSeed });
			const attempts = worker.attempts?.length ? worker.attempts : [{
				workerInstanceId: worker.workerInstanceId,
				pid: worker.pid,
				sessionDir: worker.sessionDir,
				sessionFile: worker.sessionFile,
				spawnedAt: worker.spawnedAt,
				exitCode: undefined,
				spawnError: worker.spawnError,
			}];
			for (let index = 0; index < attempts.length; index++) {
				const attempt = attempts[index]!;
				if (attempt.workerInstanceId && v2AttemptIds.has(attempt.workerInstanceId)) continue;
				const attemptId = attemptKey(coordinatorSessionId, teamId, workerId, attempt, worker);
				const key = `${workerId}:${attemptId}`;
				const previous = merged.get(key);
				if (!previous || (snapshot.savedAt ?? 0) >= previous.snapshotAt) {
					merged.set(key, { worker, attempt, name, snapshotAt: snapshot.savedAt ?? 0, isLatest: index === attempts.length - 1 });
				}
			}
		}
	}

	for (const [key, item] of merged) {
		const separator = key.indexOf(":teams:attempt:legacy:");
		const workerId = key.slice(0, separator);
		const attemptId = key.slice(separator + 1);
		importedAttemptIds.add(attemptId);
		const identity = { coordinatorSessionId, teamId, workerId, attemptId };
		const mode = legacyMode(item.attempt, item.worker);
		const sessionDir = item.attempt.sessionDir ?? item.worker.sessionDir ?? "";
		const workerSessionFile = item.attempt.sessionFile ?? item.worker.sessionFile ?? "";
		const spawnId = createRootEventId("spawn_requested", { coordinatorSessionId, teamId, workerId, attemptId });
		factsById.set(spawnId, {
			schemaVersion: 4,
			...identity,
			eventId: spawnId,
			kind: "spawn_requested",
			sourceLeaderEpoch,
			occurredAt: item.attempt.spawnedAt ?? item.worker.spawnedAt ?? item.snapshotAt,
			payload: {
				name: item.name,
				ticketId: item.worker.ticketId ?? "legacy-unknown",
				persistent: Boolean(item.worker.freeform),
				sessionMode: mode,
				sessionDir,
				workerSessionFile,
				worktreePath: item.worker.worktreePath ?? null,
				...(item.worker.model ? { model: item.worker.model } : {}),
				...(item.worker.hasTools !== undefined ? { hasTools: item.worker.hasTools } : {}),
			},
		});

		const pid = item.attempt.pid ?? item.worker.pid;
		const startedAt = item.attempt.spawnedAt ?? item.worker.spawnedAt ?? item.snapshotAt;
		let startId: string | null = null;
		if (typeof pid === "number" && pid > 0) {
			startId = createLeaderEventId(identity, "process_started", spawnId);
			factsById.set(startId, {
				schemaVersion: 4,
				...identity,
				eventId: startId,
				kind: "process_started",
				sourceLeaderEpoch,
				occurredAt: startedAt,
				payload: { pid, processBirth: { startedAt }, sessionMode: mode, workerSessionFile, sessionDir },
			});
		}

		const explicit = item.isLatest ? item.worker.terminalStatus : undefined;
		if (explicit) {
			const declarationKind = explicit === "done" ? "declaration_done" : "declaration_quit";
			const declarationId = createLeaderEventId(identity, declarationKind, startId ?? spawnId);
			factsById.set(declarationId, {
				schemaVersion: 4,
				...identity,
				eventId: declarationId,
				kind: declarationKind,
				sourceLeaderEpoch,
				occurredAt: item.snapshotAt,
				payload: { summary: item.worker.terminalSummary ?? `Legacy ${explicit} declaration` },
			});
		}

		const terminalStatus = ["done", "warning", "failed", "killed", "idle", "grace"].includes(item.worker.status ?? "");
		const hasExitEvidence = item.attempt.exitCode !== undefined || terminalStatus || Boolean(item.attempt.spawnError);
		if (hasExitEvidence && typeof pid === "number" && pid > 0) {
			const exitId = createLeaderEventId(identity, "process_exited", `${pid}:${startedAt}`);
			factsById.set(exitId, {
				schemaVersion: 4,
				...identity,
				eventId: exitId,
				kind: "process_exited",
				sourceLeaderEpoch,
				occurredAt: item.snapshotAt,
				payload: { pid, processBirth: { startedAt }, code: item.attempt.exitCode ?? null },
			});
			if (!explicit) {
				const assessmentKind = item.attempt.spawnError ? "assessment_startup_failure" : "assessment_missing_finish";
				const assessmentId = createLeaderEventId(identity, assessmentKind, exitId);
				factsById.set(assessmentId, {
					schemaVersion: 4,
					...identity,
					eventId: assessmentId,
					kind: assessmentKind,
					sourceLeaderEpoch,
					occurredAt: item.snapshotAt,
					payload: {
						reason: item.attempt.spawnError ?? "Legacy attempt ended without an explicit declaration",
						provisional: false,
						...(!item.attempt.spawnError ? { legacyAmbiguous: true } : {}),
					},
				});
			}
		}
	}

	const facts = [...factsById.values()];
	const marker: LifecycleMigrationMarker = {
		schemaVersion: 1,
		coordinatorSessionId,
		sourceSchemaVersions: [...new Set(snapshots.map((snapshot) => snapshot.version ?? 0))].sort((a, b) => a - b),
		importedAttemptIds: [...importedAttemptIds].sort(),
		importedEventIds: facts.map((fact) => fact.eventId).sort(),
		completedAt: Date.now(),
	};
	return { skipped: false, facts, marker };
}

export function runLegacyMigration(
	writer: SessionFactWriter,
	entries: readonly SessionEntryLike[],
	header: SessionHeader | null,
	teamId: string,
	onFact: (fact: LifecycleFact) => void,
	sourceLeaderEpoch?: string,
): LegacyMigrationPlan {
	const plan = planLegacyMigration(entries, header, writer.coordinatorSessionId, teamId, sourceLeaderEpoch);
	if (plan.skipped || !plan.marker) return plan;
	for (const fact of plan.facts) {
		writer.appendFact(fact);
		onFact(fact);
	}
	writer.appendMigrationMarker(plan.marker);
	return plan;
}
