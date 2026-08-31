import type {
	ActionableLifecycleEvent,
	AssessmentKind,
	AssessmentPayload,
	AttemptState,
	DeclarationPayload,
	EffectState,
	JsonValue,
	LifecycleFact,
	LifecycleProjection,
	ProcessExitedPayload,
	ProcessStartedPayload,
	SpawnRequestedPayload,
	StuckPayload,
	WorkerState,
} from "./state.ts";
import { createEmptyProjection } from "./state.ts";
import { canonicalFactIdentity, createLeaderEventId } from "./session-facts.ts";

function jsonObject(value: JsonValue): Record<string, JsonValue> {
	return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringField(payload: JsonValue, key: string, fallback = ""): string {
	const value = jsonObject(payload)[key];
	return typeof value === "string" ? value : fallback;
}

function boolField(payload: JsonValue, key: string, fallback = false): boolean {
	const value = jsonObject(payload)[key];
	return typeof value === "boolean" ? value : fallback;
}

function makeAttempt(fact: LifecycleFact, payload: SpawnRequestedPayload): AttemptState {
	return {
		coordinatorSessionId: fact.coordinatorSessionId,
		teamId: fact.teamId,
		workerId: fact.workerId,
		attemptId: fact.attemptId,
		name: payload.name,
		ticketId: payload.ticketId,
		persistent: payload.persistent,
		...(payload.executionCwd ? { executionCwd: payload.executionCwd } : {}),
		worktreePath: payload.worktreePath,
		...(payload.model ? { model: payload.model } : {}),
		...(payload.hasTools !== undefined ? { hasTools: payload.hasTools } : {}),
		sessionMode: payload.sessionMode,
		process: {
			phase: "spawning",
			workerSessionFile: payload.workerSessionFile,
			sessionDir: payload.sessionDir,
		},
		declaration: null,
		assessment: null,
		cleanup: { phase: "not_ready" },
		protocolViolation: false,
		stuckCount: 0,
		factEventIds: [fact.eventId],
	};
}

function actionable(
	fact: LifecycleFact,
	attempt: AttemptState,
	type: ActionableLifecycleEvent["type"],
	summary: string,
): ActionableLifecycleEvent {
	return {
		coordinatorSessionId: fact.coordinatorSessionId,
		teamId: fact.teamId,
		workerId: fact.workerId,
		attemptId: fact.attemptId,
		eventId: fact.eventId,
		type,
		name: attempt.name,
		summary,
		occurredAt: fact.occurredAt,
	};
}

function workerForAttempt(state: LifecycleProjection, attempt: AttemptState): WorkerState {
	const existing = state.workers.get(attempt.workerId);
	if (existing) return existing;
	const worker: WorkerState = {
		workerId: attempt.workerId,
		name: attempt.name,
		persistent: attempt.persistent,
		currentAttemptId: attempt.attemptId,
		route: "pending",
		attemptIds: [attempt.attemptId],
	};
	state.workers.set(worker.workerId, worker);
	return worker;
}

function assessmentKind(fact: LifecycleFact, payload: AssessmentPayload): AssessmentKind {
	if (payload.legacyAmbiguous) return "legacy_ambiguous";
	switch (fact.kind) {
		case "assessment_startup_failure": return "startup_failure";
		case "assessment_crash": return "crash";
		case "assessment_killed": return "killed";
		case "protocol_violation": return "protocol_violation";
		default: return "missing_finish";
	}
}

function markProtocolViolation(state: LifecycleProjection, fact: LifecycleFact, reason: string): void {
	const attempt = state.attempts.get(fact.attemptId);
	if (!attempt) {
		state.protocolViolations.push(reason);
		return;
	}
	attempt.protocolViolation = true;
	attempt.assessment = {
		kind: "protocol_violation",
		reason,
		eventId: fact.eventId,
		at: fact.occurredAt,
		provisional: false,
	};
	state.protocolViolations.push(reason);
	state.actionableEvents.set(fact.eventId, actionable(fact, attempt, "failed", reason));
	const worker = workerForAttempt(state, attempt);
	worker.route = "dead";
}

function applyAcceptedFact(state: LifecycleProjection, fact: LifecycleFact): void {
	state.acceptedEventIds.push(fact.eventId);
	if (fact.kind === "team_created") {
		state.teamId ??= fact.teamId;
		return;
	}

	if (state.teamId === null) state.teamId = fact.teamId;
	if (fact.kind === "spawn_requested") {
		const payload = fact.payload as unknown as SpawnRequestedPayload;
		const existingAttempt = state.attempts.get(fact.attemptId);
		if (!existingAttempt) state.attempts.set(fact.attemptId, makeAttempt(fact, payload));
		const attempt = state.attempts.get(fact.attemptId)!;
		let worker = state.workers.get(fact.workerId);
		if (!worker) {
			worker = {
				workerId: fact.workerId,
				name: payload.name,
				persistent: payload.persistent,
				currentAttemptId: fact.attemptId,
				route: "pending",
				attemptIds: [fact.attemptId],
			};
			state.workers.set(fact.workerId, worker);
		} else {
			worker.name = payload.name;
			worker.persistent = payload.persistent;
			worker.currentAttemptId = fact.attemptId;
			worker.route = "pending";
			if (!worker.attemptIds.includes(fact.attemptId)) worker.attemptIds.push(fact.attemptId);
		}
		attempt.factEventIds = [fact.eventId];
		return;
	}

	const attempt = state.attempts.get(fact.attemptId);
	if (!attempt) {
		state.protocolViolations.push(`Fact ${fact.eventId} (${fact.kind}) precedes spawn_requested for attempt ${fact.attemptId}`);
		return;
	}
	attempt.factEventIds.push(fact.eventId);
	const worker = workerForAttempt(state, attempt);

	switch (fact.kind) {
		case "process_started": {
			const payload = fact.payload as unknown as ProcessStartedPayload;
			attempt.process = {
				phase: "running",
				pid: payload.pid,
				birth: payload.processBirth,
				workerSessionFile: payload.workerSessionFile,
				sessionDir: payload.sessionDir,
			};
			worker.currentAttemptId = fact.attemptId;
			worker.route = "pending";
			break;
		}
		case "process_exited": {
			const payload = fact.payload as unknown as ProcessExitedPayload;
			attempt.process.phase = "exited";
			attempt.process.pid = payload.pid;
			attempt.process.birth = payload.processBirth;
			attempt.process.exit = {
				code: payload.code,
				...(payload.signal ? { signal: payload.signal } : {}),
				observedAt: fact.occurredAt,
				eventId: fact.eventId,
			};
			if (worker.currentAttemptId === attempt.attemptId) {
				worker.route = attempt.persistent && attempt.declaration?.kind === "done" ? "resumable" : "dead";
			}
			break;
		}
		case "declaration_done":
		case "declaration_quit": {
			const payload = fact.payload as unknown as DeclarationPayload;
			const kind = fact.kind === "declaration_done" ? "done" : "quit";
			if (attempt.declaration) {
				if (attempt.declaration.kind !== kind || attempt.declaration.summary !== payload.summary) {
					markProtocolViolation(state, fact, `Conflicting declaration for attempt ${fact.attemptId}; first declaration remains authoritative`);
				}
				break;
			}
			attempt.declaration = { kind, summary: payload.summary, eventId: fact.eventId, at: fact.occurredAt };
			worker.route = attempt.persistent && attempt.process.phase === "exited" && kind === "done" ? "resumable" : (attempt.process.phase === "exited" ? "dead" : worker.route);
			state.actionableEvents.set(
				fact.eventId,
				actionable(fact, attempt, kind === "done" ? "completed" : "warning", kind === "done" ? payload.summary : `QUIT: ${payload.summary}`),
			);
			break;
		}
		case "assessment_missing_finish":
		case "assessment_startup_failure":
		case "assessment_crash":
		case "assessment_killed": {
			if (attempt.declaration) break;
			const payload = fact.payload as unknown as AssessmentPayload;
			const kind = assessmentKind(fact, payload);
			attempt.assessment = {
				kind,
				reason: payload.reason,
				...(fact.diagnostics === undefined ? {} : { diagnostics: fact.diagnostics }),
				eventId: fact.eventId,
				at: fact.occurredAt,
				provisional: payload.provisional,
			};
			worker.route = attempt.persistent && (
				kind === "missing_finish"
				|| (kind === "startup_failure"
					&& (attempt.sessionMode.kind === "resume" || attempt.sessionMode.kind === "adopt"))
			)
				? "resumable"
				: "dead";
			const type = kind === "missing_finish" || kind === "legacy_ambiguous" ? "warning" : "failed";
			const diagnosticDetail = fact.diagnostics && typeof fact.diagnostics === "object" && !Array.isArray(fact.diagnostics)
				&& typeof fact.diagnostics.detail === "string"
				? fact.diagnostics.detail
				: "";
			const summary = diagnosticDetail && diagnosticDetail !== payload.reason
				? `${payload.reason}\n${diagnosticDetail}`
				: payload.reason;
			state.actionableEvents.set(fact.eventId, actionable(fact, attempt, type, summary));
			break;
		}
		case "protocol_violation":
			markProtocolViolation(state, fact, stringField(fact.payload, "reason", `Protocol violation for ${fact.attemptId}`));
			break;
		case "stuck": {
			const payload = fact.payload as unknown as StuckPayload;
			attempt.stuckCount = Math.max(attempt.stuckCount, payload.cooldownIndex + 1);
			const cause = payload.cause ?? "liveness";
			const childCount = payload.activeChildProcessCount !== undefined
				? ` ${payload.activeChildProcessCount} active child process${payload.activeChildProcessCount === 1 ? "" : "es"}.`
				: "";
			const command = payload.command ? ` Current command: ${payload.command}${payload.commandElapsedSeconds !== undefined ? ` (${payload.commandElapsedSeconds}s)` : ""}.` : "";
			const lastOutputAt = payload.lastOutputAt !== undefined && Number.isFinite(payload.lastOutputAt)
				? ` at ${new Date(payload.lastOutputAt).toISOString()}`
				: "";
			const lastOutput = payload.lastOutputLabel ? ` Last output: ${payload.lastOutputLabel}${lastOutputAt}.` : "";
			const summary = cause === "output_silence"
				? `P0: no meaningful worker output for ${payload.idleSeconds}s. Investigate now; do not continue waiting blindly.${command}${childCount}${lastOutput}`
				: `stuck ${payload.idleSeconds}s idle`;
			state.actionableEvents.set(fact.eventId, actionable(fact, attempt, "stuck", summary));
			break;
		}
		case "outcome_corrected":
			state.actionableEvents.set(fact.eventId, actionable(fact, attempt, "outcome_corrected", stringField(fact.payload, "summary", attempt.declaration?.summary ?? "Outcome corrected")));
			break;
		case "cleanup_requested":
			attempt.cleanup = { phase: "pending", effectId: stringField(fact.payload, "effectId") };
			break;
		case "cleanup_completed":
			attempt.cleanup = { phase: "completed", effectId: stringField(fact.payload, "effectId") };
			break;
		case "cleanup_failed":
			attempt.cleanup = { phase: "failed", effectId: stringField(fact.payload, "effectId"), error: stringField(fact.payload, "error") };
			break;
		case "effect_requested": {
			const payload = jsonObject(fact.payload);
			const effectId = stringField(fact.payload, "effectId");
			if (!effectId) break;
			const effectKind = stringField(fact.payload, "effectKind");
			state.effects.set(effectId, {
				effectId,
				attemptId: fact.attemptId,
				kind: effectKind,
				phase: "requested",
				normalizedInputs: payload.normalizedInputs ?? null,
				requestEventId: fact.eventId,
			});
			if (effectKind === "cleanup") attempt.cleanup = { phase: "pending", effectId };
			break;
		}
		case "effect_completed":
		case "effect_failed": {
			const effectId = stringField(fact.payload, "effectId");
			const effect = state.effects.get(effectId);
			if (!effect) break;
			effect.phase = fact.kind === "effect_completed" ? "completed" : "failed";
			effect.completionEventId = fact.eventId;
			if (fact.kind === "effect_failed") effect.error = stringField(fact.payload, "error");
			if (effect.kind === "cleanup") {
				attempt.cleanup = fact.kind === "effect_completed"
					? { phase: "completed", effectId }
					: { phase: "failed", effectId, error: effect.error };
			}
			break;
		}
	}
}

export class LifecycleAccumulator {
	private projection: LifecycleProjection;
	private readonly identities = new Map<string, string>();

	constructor(readonly coordinatorSessionId: string) {
		this.projection = createEmptyProjection(coordinatorSessionId);
	}

	append(fact: LifecycleFact): "accepted" | "duplicate" | "conflict" | "foreign" {
		if (fact.coordinatorSessionId !== this.coordinatorSessionId) return "foreign";
		const canonical = canonicalFactIdentity(fact);
		const existing = this.identities.get(fact.eventId);
		if (existing !== undefined) {
			if (existing === canonical) return "duplicate";
			const conflictId = createLeaderEventId(fact, "protocol_violation", fact.eventId, { conflictingCanonicalIdentity: canonical });
			const violation: LifecycleFact = {
				...fact,
				eventId: conflictId,
				kind: "protocol_violation",
				payload: { conflictingEventId: fact.eventId, reason: `Conflicting authoritative payload for eventId ${fact.eventId}` },
			};
			if (!this.identities.has(conflictId)) {
				this.identities.set(conflictId, canonicalFactIdentity(violation));
				applyAcceptedFact(this.projection, violation);
			}
			return "conflict";
		}
		this.identities.set(fact.eventId, canonical);
		applyAcceptedFact(this.projection, fact);
		return "accepted";
	}

	current(): LifecycleProjection {
		return this.projection;
	}
}

/** Pure physical-order fold. The input facts are never mutated and no I/O occurs. */
export function reduceLifecycleFacts(coordinatorSessionId: string, facts: readonly LifecycleFact[]): LifecycleProjection {
	const accumulator = new LifecycleAccumulator(coordinatorSessionId);
	for (const fact of facts) accumulator.append(fact);
	return accumulator.current();
}
