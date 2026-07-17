import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { autoCommitWorktreeChanges } from "../worktree.ts";
import { TeamsSubscription } from "../subscription.ts";
import {
	MAX_DELIVERY_BODY_CHARS,
	MAX_EVENTS_PER_DELIVERY,
	ProviderDeliveryTracker,
	buildPendingDelivery,
	extractEventMarkers,
	providerPayloadExposesConversation,
} from "./delivery.ts";
import { executeDurableEffect, pendingEffects } from "./effects.ts";
import { planLegacyMigration } from "./legacy-migration.ts";
import { LifecycleAccumulator, reduceLifecycleFacts } from "./reducer.ts";
import { LifecycleRuntimeStore } from "./runtime-store.ts";
import {
	LIFECYCLE_ACK_ENTRY_TYPE,
	LIFECYCLE_FACT_ENTRY_TYPE,
	WORKER_FINISH_PENDING_ENTRY_TYPE,
	SessionFactWriter,
	branchAcknowledgedEventIds,
	canonicalFactIdentity,
	createDeclarationEventId,
	createEffectId,
	createLeaderEventId,
	createRootEventId,
	factsForSession,
	hasAssistantMessage,
	parseLifecycleFact,
	workerFinishPendingForAttempt,
	type SessionEntryLike,
} from "./session-facts.ts";
import { attemptPreservePolicy, attemptStatus, type AttemptIdentity, type JsonValue, type LifecycleAck, type LifecycleFact } from "./state.ts";

const SESSION = "session-1";
const TEAM = "team-1";

function id(attemptId = "attempt-1", workerId = "worker-1", sessionId = SESSION): AttemptIdentity {
	return { coordinatorSessionId: sessionId, teamId: TEAM, workerId, attemptId };
}

function fact(
	kind: LifecycleFact["kind"],
	payload: JsonValue,
	options: { attemptId?: string; workerId?: string; eventId?: string; at?: number; sessionId?: string; diagnostics?: JsonValue } = {},
): LifecycleFact {
	const identity = id(options.attemptId, options.workerId, options.sessionId);
	return {
		schemaVersion: 4,
		...identity,
		eventId: options.eventId ?? createLeaderEventId(identity, kind, `${kind}:${options.at ?? 1}`),
		kind,
		occurredAt: options.at ?? 1,
		payload,
		...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
	};
}

function spawnFacts(options: { attemptId?: string; workerId?: string; name?: string; persistent?: boolean; at?: number } = {}): LifecycleFact[] {
	const attemptId = options.attemptId ?? "attempt-1";
	const workerId = options.workerId ?? "worker-1";
	const identity = id(attemptId, workerId);
	const at = options.at ?? 1;
	const spawnId = createRootEventId("spawn_requested", { ...identity });
	return [
		{
			schemaVersion: 4, ...identity, eventId: spawnId, kind: "spawn_requested", occurredAt: at,
			payload: {
				name: options.name ?? "worker", ticketId: `ticket-${attemptId}`,
				persistent: options.persistent ?? false, sessionMode: { kind: "fresh" },
				sessionDir: `/tmp/${attemptId}`, workerSessionFile: `/tmp/${attemptId}/session.jsonl`, worktreePath: null,
			},
		},
		{
			schemaVersion: 4, ...identity, eventId: createLeaderEventId(identity, "process_started", spawnId),
			kind: "process_started", occurredAt: at + 1,
			payload: { pid: 100 + at, processBirth: { startedAt: at }, sessionMode: { kind: "fresh" }, workerSessionFile: `/tmp/${attemptId}/session.jsonl`, sessionDir: `/tmp/${attemptId}` },
		},
	];
}

function entry(data: LifecycleFact, parentId = "assistant"): SessionEntryLike {
	return { type: "custom", id: `entry-${data.eventId}`, parentId, customType: LIFECYCLE_FACT_ENTRY_TYPE, data };
}

function ackEntry(eventId: string, parentId = "assistant", sessionId = SESSION): SessionEntryLike {
	const data: LifecycleAck = { schemaVersion: 1, coordinatorSessionId: sessionId, eventId, runId: "run", acknowledgedAt: 1 };
	return { type: "custom", id: `ack-${eventId}`, parentId, customType: LIFECYCLE_ACK_ENTRY_TYPE, data };
}

function makeWriter(options: { sessionId?: string; sessionFile?: string; assistant?: boolean; throwAppend?: boolean } = {}) {
	const sessionId = options.sessionId ?? SESSION;
	const entries: SessionEntryLike[] = options.assistant === false ? [] : [{ type: "message", id: "assistant", message: { role: "assistant" } }];
	const branch = [...entries];
	const appended: Array<{ customType: string; data: unknown }> = [];
	const session = {
		getSessionId: () => sessionId,
		getSessionFile: () => options.sessionFile === undefined ? "/tmp/coordinator.jsonl" : options.sessionFile || undefined,
		getEntries: () => entries,
		getBranch: () => branch,
		getHeader: () => ({ type: "session", version: 3, id: sessionId, timestamp: new Date(0).toISOString(), cwd: "/tmp" }) as never,
	};
	const pi = {
		appendEntry: (customType: string, data: unknown) => {
			if (options.throwAppend) throw new Error("disk full");
			appended.push({ customType, data });
			const next = { type: "custom", customType, data } as SessionEntryLike;
			entries.push(next);
			branch.push(next);
		},
	};
	return { writer: new SessionFactWriter(pi, session, entries), session, entries, branch, appended };
}

function terminalFacts(attemptId = "attempt-1", workerId = "worker-1", name = "worker", persistent = false): LifecycleFact[] {
	const base = spawnFacts({ attemptId, workerId, name, persistent });
	const identity = id(attemptId, workerId);
	const summary = `done ${attemptId}`;
	return [...base, {
		schemaVersion: 4, ...identity, eventId: createDeclarationEventId(identity, "done", summary),
		kind: "declaration_done", occurredAt: 3, payload: { summary },
	}];
}

function projectionWith(facts: LifecycleFact[]) {
	return reduceLifecycleFacts(SESSION, facts);
}

describe("session-native Teams lifecycle graduation matrix", () => {
	test("01 Eleanor: an earlier same-name attempt cannot suppress the later notification", () => {
		const facts = [...terminalFacts("a1", "w1", "same"), ...terminalFacts("a2", "w2", "same")];
		const projection = projectionWith(facts);
		const batch = buildPendingDelivery(projection, []);
		expect(batch?.eventIds).toEqual([
			createDeclarationEventId(id("a1", "w1"), "done", "done a1"),
			createDeclarationEventId(id("a2", "w2"), "done", "done a2"),
		]);
	});

	test("02 Hakeem: all-leaf truth survives 429s and branch rewind replays until ack", () => {
		const facts = terminalFacts();
		const projection = projectionWith(facts);
		const terminalId = facts.at(-1)!.eventId;
		const abandoned = facts.map((item) => entry(item, "abandoned-leaf"));
		expect(factsForSession(abandoned, SESSION)).toHaveLength(facts.length);
		const tracker = new ProviderDeliveryTracker();
		const harness = makeWriter();
		tracker.beginRun("429-run");
		tracker.setDeliveredBatch([terminalId]);
		tracker.observeContext([{ content: `[teams-event:${terminalId}]` }]);
		tracker.beforeProviderRequest({ messages: [{ content: `[teams-event:${terminalId}]` }] });
		tracker.afterProviderResponse(429);
		tracker.messageEnd({ role: "assistant", stopReason: "error" });
		expect(tracker.acknowledgeSuccessfulDelivery(harness.writer)).toEqual([]);
		expect(buildPendingDelivery(projection, [])?.eventIds).toContain(terminalId);
		expect(buildPendingDelivery(projection, [ackEntry(terminalId)])).toBeNull();
		expect(buildPendingDelivery(projection, [])?.eventIds).toContain(terminalId);
	});

	test("03 finish-first and exit-first reduce to the same declared outcome", () => {
		const base = spawnFacts();
		const identity = id();
		const declaration: LifecycleFact = { schemaVersion: 4, ...identity, eventId: createDeclarationEventId(identity, "done", "ok"), kind: "declaration_done", occurredAt: 3, payload: { summary: "ok" } };
		const exit = fact("process_exited", { pid: 101, processBirth: { startedAt: 1 }, code: 0 }, { at: 4 });
		for (const ordered of [[...base, declaration, exit], [...base, exit, declaration]]) {
			const attempt = projectionWith(ordered).attempts.get("attempt-1")!;
			expect(attemptStatus(attempt)).toBe("completed");
			expect(attempt.process.phase).toBe("exited");
		}
	});

	test("04 exit code zero without finish remains missing-finish warning", () => {
		const facts = [...spawnFacts(), fact("process_exited", { pid: 101, processBirth: { startedAt: 1 }, code: 0 }, { at: 3 }), fact("assessment_missing_finish", { reason: "missing finish", provisional: false }, { at: 4 })];
		const attempt = projectionWith(facts).attempts.get("attempt-1")!;
		expect(attemptStatus(attempt)).toBe("warning");
		expect(attempt.declaration).toBeNull();
	});

	test("05 declaration persistence precedes application acknowledgement", () => {
		const harness = makeWriter();
		const declaration = terminalFacts().at(-1)!;
		harness.writer.appendFact(declaration);
		harness.writer.appendAck({ schemaVersion: 1, coordinatorSessionId: SESSION, eventId: declaration.eventId, runId: "after-persist", acknowledgedAt: 2 });
		expect(harness.appended.map((item) => item.customType)).toEqual([LIFECYCLE_FACT_ENTRY_TYPE, LIFECYCLE_ACK_ENTRY_TYPE]);
	});

	test("06 lost finish acknowledgement retries exactly and can be re-acknowledged", () => {
		const harness = makeWriter();
		const declaration = terminalFacts().at(-1)!;
		expect(harness.writer.appendFact(declaration).status).toBe("appended");
		expect(harness.writer.appendFact({ ...declaration, occurredAt: 999, diagnostics: { retry: true } }).status).toBe("duplicate");
		harness.writer.appendAck({ schemaVersion: 1, coordinatorSessionId: SESSION, eventId: declaration.eventId, runId: "retry", acknowledgedAt: 3 });
		expect(harness.appended.filter((item) => item.customType === LIFECYCLE_FACT_ENTRY_TYPE)).toHaveLength(1);
	});

	test("07 conflicting declarations produce protocol violation without overwrite", () => {
		const identity = id();
		const done: LifecycleFact = { schemaVersion: 4, ...identity, eventId: createDeclarationEventId(identity, "done", "first"), kind: "declaration_done", occurredAt: 3, payload: { summary: "first" } };
		const quit: LifecycleFact = { schemaVersion: 4, ...identity, eventId: createDeclarationEventId(identity, "quit", "second"), kind: "declaration_quit", occurredAt: 4, payload: { summary: "second" } };
		const attempt = projectionWith([...spawnFacts(), done, quit]).attempts.get("attempt-1")!;
		expect(attempt.declaration).toMatchObject({ kind: "done", summary: "first" });
		expect(attempt.protocolViolation).toBeTrue();
		expect(attemptStatus(attempt)).toBe("failed");
	});

	test("08 reload after every transition restores the identical projection", () => {
		const facts = [...terminalFacts(), fact("process_exited", { pid: 101, processBirth: { startedAt: 1 }, code: 0 }, { at: 4 })];
		for (let count = 1; count <= facts.length; count++) {
			const current = facts.slice(0, count);
			const direct = projectionWith(current);
			const restored = new LifecycleRuntimeStore(SESSION, current.map((item) => entry(item))).projection();
			expect([...restored.acceptedEventIds]).toEqual([...direct.acceptedEventIds]);
			expect([...restored.attempts.keys()]).toEqual([...direct.attempts.keys()]);
		}
	});

	test("09 branch switch changes ack visibility but not canonical state", () => {
		const facts = terminalFacts();
		const projection = projectionWith(facts);
		const terminalId = facts.at(-1)!.eventId;
		expect(buildPendingDelivery(projection, [ackEntry(terminalId)])).toBeNull();
		expect(buildPendingDelivery(projection, [])?.eventIds).toEqual([terminalId]);
		expect(projection.attempts.get("attempt-1")?.declaration?.kind).toBe("done");
	});

	test("10 compaction preserves facts and only final successful-context markers are acked", () => {
		const facts = [...terminalFacts("a1", "w1"), ...terminalFacts("a2", "w2")];
		const [event1, event2] = facts.filter((item) => item.kind === "declaration_done").map((item) => item.eventId);
		const entries: SessionEntryLike[] = [...facts.map((item) => entry(item)), { type: "compaction", id: "compact" }];
		expect(factsForSession(entries, SESSION)).toHaveLength(facts.length);
		const harness = makeWriter();
		const tracker = new ProviderDeliveryTracker();
		tracker.beginRun("compact-run");
		tracker.setDeliveredBatch([event1!, event2!]);
		tracker.beforeProviderRequest({ messages: [{ content: `[teams-event:${event2}]` }] });
		tracker.afterProviderResponse(200);
		tracker.messageEnd({ role: "assistant", stopReason: "stop" });
		expect(tracker.acknowledgeSuccessfulDelivery(harness.writer)).toEqual([event2]);
	});

	test("11 ordinary, branched, and cross-directory forks ignore copied parent lifecycle and legacy entries", () => {
		const parentFacts = terminalFacts();
		for (const parentSession of ["/tmp/parent.jsonl", "/other/repo/parent.jsonl", "/tmp/clone.jsonl"]) {
			const header = { type: "session", version: 3, id: "child", timestamp: new Date(0).toISOString(), cwd: "/tmp", parentSession } as never;
			const legacy = { type: "custom", customType: "teams-leader-state", data: { version: 3, workers: { worker: { name: "worker", workerInstanceId: "old" } } } };
			expect(planLegacyMigration([legacy], header, "child", "child-team").reason).toBe("fork");
			expect(factsForSession(parentFacts.map((item) => entry(item)), "child")).toEqual([]);
		}
	});

	test("12 child attempts never affect parent attempts", () => {
		const parent = new LifecycleRuntimeStore(SESSION, terminalFacts().map((item) => entry(item)));
		const childFacts = terminalFacts("child-attempt", "child-worker").map((item) => ({ ...item, coordinatorSessionId: "child" }));
		const child = new LifecycleRuntimeStore("child", [...terminalFacts().map((item) => entry(item)), ...childFacts.map((item) => entry(item))]);
		expect(parent.projection().attempts.has("child-attempt")).toBeFalse();
		expect(child.projection().attempts.has("attempt-1")).toBeFalse();
		expect(child.projection().attempts.has("child-attempt")).toBeTrue();
	});

	test("13 append failure enters storage_degraded and releases no later write", () => {
		const harness = makeWriter({ throwAppend: true });
		const declaration = terminalFacts().at(-1)!;
		expect(() => harness.writer.appendFact(declaration)).toThrow("storage_degraded");
		expect(harness.writer.storageDegraded).toBeTrue();
		expect(() => harness.writer.appendFact(declaration)).toThrow("storage_degraded");
		expect(harness.appended).toHaveLength(0);
	});

	test("14 no-session delegation guard refuses before a spawn fact can append", () => {
		const harness = makeWriter({ sessionFile: "" });
		expect(() => harness.writer.assertWritable()).toThrow("--no-session");
		expect(harness.appended).toHaveLength(0);
	});

	test("15 legacy migration unions all leaves, preserves declarations, and marks ambiguity conservatively", () => {
		const first = {
			type: "custom", customType: "teams-leader-state", data: {
				version: 3, savedAt: 10, workers: {
					done: { name: "done", workerInstanceId: "done-a", ticketId: "t1", pid: 201, spawnedAt: 1, terminalStatus: "done", terminalSummary: "explicit", status: "done" },
					persistent: { name: "persistent", workerId: "logical:teams:attempt:legacy:stable", workerInstanceId: "persistent-a", ticketId: "tp", spawnedAt: 3, attempts: [{ workerInstanceId: "persistent-a", spawnedAt: 3 }] },
				},
			},
		};
		const second = {
			type: "custom", customType: "teams-leader-state", data: {
				version: 3, savedAt: 20, workers: {
					ambiguous: { name: "ambiguous", workerInstanceId: "amb-a", ticketId: "t2", pid: 202, spawnedAt: 2, status: "warning" },
					persistent: { name: "persistent", workerId: "logical:teams:attempt:legacy:stable", workerInstanceId: "persistent-b", ticketId: "tp", spawnedAt: 4, attempts: [{ workerInstanceId: "persistent-b", spawnedAt: 4 }] },
				},
			},
		};
		const plan = planLegacyMigration([first, second], null, SESSION, TEAM);
		expect(plan.skipped).toBeFalse();
		const projection = projectionWith(plan.facts);
		expect([...projection.attempts.values()].some((attempt) => attempt.declaration?.summary === "explicit")).toBeTrue();
		const ambiguous = [...projection.attempts.values()].find((attempt) => attempt.name === "ambiguous")!;
		expect(ambiguous.assessment?.kind).toBe("legacy_ambiguous");
		expect(ambiguous.declaration).toBeNull();
		expect(projection.workers.get("logical:teams:attempt:legacy:stable")?.attemptIds).toHaveLength(2);
	});

	test("15b one reduced-state cleanup policy covers every terminal assessment", () => {
		const policyFor = (kind: "done" | "quit" | "missing" | "crash" | "killed", persistent = false) => {
			const facts = spawnFacts({ persistent });
			(facts[0]!.payload as Record<string, unknown>).worktreePath = "/tmp/worker-worktree";
			if (kind === "done" || kind === "quit") {
				facts.push(fact(kind === "done" ? "declaration_done" : "declaration_quit", { summary: kind }, { at: 3 }));
			} else {
				const assessmentKind = kind === "missing" ? "assessment_missing_finish" : kind === "crash" ? "assessment_crash" : "assessment_killed";
				facts.push(fact(assessmentKind, { reason: kind, provisional: kind === "missing" }, { at: 3 }));
			}
			return attemptPreservePolicy(reduceLifecycleFacts(SESSION, facts).attempts.get("attempt-1")!);
		};

		expect(policyFor("done")).toEqual({ preserveBranch: true, preserveWorktree: false });
		expect(policyFor("done", true)).toEqual({ preserveBranch: true, preserveWorktree: true });
		expect(policyFor("quit")).toEqual({ preserveBranch: true, preserveWorktree: false });
		expect(policyFor("missing")).toEqual({ preserveBranch: true, preserveWorktree: true });
		expect(policyFor("crash")).toEqual({ preserveBranch: false, preserveWorktree: false });
		expect(policyFor("killed")).toEqual({ preserveBranch: true, preserveWorktree: false });

		const resumableFailure = [spawnFacts({ persistent: true })[0]!];
		(resumableFailure[0]!.payload as Record<string, unknown>).worktreePath = "/tmp/resumable-worktree";
		(resumableFailure[0]!.payload as Record<string, unknown>).sessionMode = { kind: "resume", sessionFile: "/tmp/resumable/session.jsonl" };
		resumableFailure.push(fact("assessment_startup_failure", { reason: "resume activation failed", provisional: false }, { at: 3 }));
		expect(attemptPreservePolicy(reduceLifecycleFacts(SESSION, resumableFailure).attempts.get("attempt-1")!))
			.toEqual({ preserveBranch: true, preserveWorktree: true });

		const conflicting = spawnFacts();
		(conflicting[0]!.payload as Record<string, unknown>).worktreePath = "/tmp/worker-worktree";
		conflicting.push(fact("declaration_done", { summary: "done" }, { at: 3 }));
		conflicting.push(fact("declaration_quit", { summary: "quit" }, { at: 4 }));
		expect(attemptPreservePolicy(reduceLifecycleFacts(SESSION, conflicting).attempts.get("attempt-1")!))
			.toEqual({ preserveBranch: true, preserveWorktree: true });
	});

	test("16 deterministic cleanup commit trailer reconciles without a duplicate commit", async () => {
		const repo = fs.mkdtempSync(path.join(os.tmpdir(), "teams-effect-test-"));
		try {
			execFileSync("git", ["init", "-q"], { cwd: repo });
			execFileSync("git", ["config", "user.email", "teams@test.invalid"], { cwd: repo });
			execFileSync("git", ["config", "user.name", "Teams Test"], { cwd: repo });
			fs.writeFileSync(path.join(repo, "base.txt"), "base\n");
			execFileSync("git", ["add", "."], { cwd: repo });
			execFileSync("git", ["commit", "-qm", "base"], { cwd: repo });
			fs.writeFileSync(path.join(repo, "work.txt"), "work\n");
			const effectId = "teams:effect:v1:test";
			expect(await autoCommitWorktreeChanges(repo, effectId)).toBeTrue();
			const firstHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
			expect(execFileSync("git", ["log", "-1", "--format=%B"], { cwd: repo, encoding: "utf8" })).toContain(`Teams-Effect-Id: ${effectId}`);
			expect(await autoCommitWorktreeChanges(repo, effectId)).toBeFalse();
			expect(execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim()).toBe(firstHead);
		} finally {
			fs.rmSync(repo, { recursive: true, force: true });
		}
	});

	test("17 roster eviction cannot erase reducer history or pending delivery", () => {
		const store = new LifecycleRuntimeStore(SESSION, terminalFacts().map((item) => entry(item)));
		const liveRoster = new Map([["worker", { presentation: true }]]);
		liveRoster.clear();
		expect(store.history({ name: "worker" })).toHaveLength(1);
		expect(buildPendingDelivery(store.projection(), [])?.eventIds).toHaveLength(1);
	});

	test("18 subscription name binding does not replay an older same-name attempt", async () => {
		const listeners = new Set<(event: any) => void>();
		const oldWorker = { name: "same", workerInstanceId: "old" };
		const fakeLeader = {
			getCurrentAttemptId: () => undefined,
			subscribeToEvents: (listener: (event: any) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
			subscribeToWorkerDisposal: () => () => {},
			getCurrentTerminalEvent: () => ({ type: "completed", worker: oldWorker, result: "old", attemptId: "old" }),
			getWorker: () => undefined,
			wakeFromSubscription: () => {},
		} as never;
		const sub = new TeamsSubscription(fakeLeader, { name: "same", type: "completed" }, (event: any) => event.type === "completed");
		let resolved = false;
		void sub.then(() => { resolved = true; });
		await Promise.resolve();
		expect(resolved).toBeFalse();
		for (const listener of listeners) listener({ type: "completed", worker: { name: "same", workerInstanceId: "new" }, result: "new", attemptId: "new", preventDefault() {}, stopPropagation() {}, defaultPrevented: false, propagationStopped: false });
		await Promise.resolve();
		expect(resolved).toBeTrue();
	});

	test("19 every stuck cooldown event is independently pending and acknowledged", () => {
		const facts = [...spawnFacts(), fact("stuck", { cooldownIndex: 0, idleSeconds: 300 }, { eventId: createLeaderEventId(id(), "stuck", "stuck:0", { cooldownIndex: 0 }), at: 3 }), fact("stuck", { cooldownIndex: 1, idleSeconds: 600 }, { eventId: createLeaderEventId(id(), "stuck", "stuck:1", { cooldownIndex: 1 }), at: 4 })];
		const projection = projectionWith(facts);
		const stuckIds = facts.filter((item) => item.kind === "stuck").map((item) => item.eventId);
		expect(buildPendingDelivery(projection, [])?.eventIds).toEqual(stuckIds);
		expect(buildPendingDelivery(projection, [ackEntry(stuckIds[0]!)])?.eventIds).toEqual([stuckIds[1]]);
	});

	test("20 persistent resume creates a new attempt and keeps the prior attempt resumable in history", () => {
		const first = terminalFacts("first", "logical", "persistent", true);
		const exit = fact("process_exited", { pid: 101, processBirth: { startedAt: 1 }, code: 0 }, { attemptId: "first", workerId: "logical", at: 4 });
		const second = spawnFacts({ attemptId: "second", workerId: "logical", name: "persistent", persistent: true, at: 10 });
		const projection = projectionWith([...first, exit, ...second]);
		expect(projection.attempts.get("first")?.declaration?.kind).toBe("done");
		expect(projection.attempts.get("second")?.process.phase).toBe("running");
		expect(projection.workers.get("logical")?.currentAttemptId).toBe("second");
		expect(projection.workers.get("logical")?.attemptIds).toEqual(["first", "second"]);

		const resumeIdentity = id("resume-refused", "logical");
		const resumeSpawn: LifecycleFact = {
			schemaVersion: 4, ...resumeIdentity,
			eventId: createRootEventId("spawn_requested", resumeIdentity), kind: "spawn_requested", occurredAt: 10,
			payload: { name: "persistent", ticketId: "ticket-first", persistent: true, sessionMode: { kind: "resume", sessionFile: "/tmp/first/session.jsonl" }, sessionDir: "/tmp/first", workerSessionFile: "/tmp/first/session.jsonl", worktreePath: null },
		};
		const resumeFailure = fact("assessment_startup_failure", { reason: "activation lease unavailable", provisional: false }, { attemptId: "resume-refused", workerId: "logical", eventId: createLeaderEventId(resumeIdentity, "assessment_startup_failure", resumeSpawn.eventId), at: 11 });
		const refusedProjection = projectionWith([...first, exit, resumeSpawn, resumeFailure]);
		expect(attemptStatus(refusedProjection.attempts.get("resume-refused")!)).toBe("failed");
		expect(refusedProjection.workers.get("logical")?.route).toBe("resumable");

		const missingFinish = fact("assessment_missing_finish", { reason: "turn ended without declaration", provisional: true }, {
			attemptId: "second", workerId: "logical", at: 12,
		});
		const secondExit = fact("process_exited", { pid: 110, processBirth: { startedAt: 10 }, code: 0 }, {
			attemptId: "second", workerId: "logical", at: 11,
		});
		const parked = projectionWith([...first, exit, ...second, secondExit, missingFinish]);
		expect(attemptStatus(parked.attempts.get("second")!)).toBe("warning");
		expect(parked.workers.get("logical")?.route).toBe("resumable");
	});

	test("21 64 near-simultaneous terminal appends have no loss and preserve physical order", async () => {
		const harness = makeWriter();
		const facts = Array.from({ length: 64 }, (_, index) => fact("team_created", { root: "coordinator_session" }, { attemptId: `a-${index}`, workerId: `w-${index}`, eventId: createRootEventId("team_created", { index }), at: index }));
		await Promise.all(facts.map(async (item) => harness.writer.appendFact(item)));
		const persisted = factsForSession(harness.entries, SESSION);
		expect(persisted.map((item) => item.eventId)).toEqual(facts.map((item) => item.eventId));
		expect(reduceLifecycleFacts(SESSION, persisted).acceptedEventIds).toEqual(facts.map((item) => item.eventId));
	});

	test("22 1,000 attempts and 20,000 facts restore linearly without snapshot growth", () => {
		const facts: LifecycleFact[] = [];
		for (let attemptIndex = 0; attemptIndex < 1_000; attemptIndex++) {
			const attemptId = `perf-a-${attemptIndex}`;
			const workerId = `perf-w-${attemptIndex}`;
			facts.push(...spawnFacts({ attemptId, workerId, name: `worker-${attemptIndex}`, at: attemptIndex * 30 + 1 }));
			for (let index = 0; index < 18; index++) {
				facts.push(fact("stuck", { cooldownIndex: index, idleSeconds: 300 + index }, { attemptId, workerId, eventId: createLeaderEventId(id(attemptId, workerId), "stuck", `stuck:${index}`, { cooldownIndex: index }), at: attemptIndex * 30 + index + 3 }));
			}
		}
		const started = performance.now();
		const store = new LifecycleRuntimeStore(SESSION, facts.map((item) => entry(item)));
		const elapsed = performance.now() - started;
		expect(facts).toHaveLength(20_000);
		expect(store.projection().attempts).toHaveLength(1_000);
		expect(store.projection().acceptedEventIds).toHaveLength(20_000);
		expect(elapsed).toBeLessThan(4_000);
	});

	test("23 10,000-entry branch ack scan is linear and delivery remains bounded", () => {
		const facts = Array.from({ length: 30 }, (_, index) => terminalFacts(`a${index}`, `w${index}`, `n${index}`)).flat();
		const projection = projectionWith(facts);
		const branch: SessionEntryLike[] = Array.from({ length: 10_000 }, (_, index) => ({ type: "custom", customType: "unrelated", data: { index } }));
		const started = performance.now();
		expect(branchAcknowledgedEventIds(branch, SESSION).size).toBe(0);
		const batch = buildPendingDelivery(projection, branch);
		const elapsed = performance.now() - started;
		expect(batch?.eventIds).toHaveLength(MAX_EVENTS_PER_DELIVERY);
		expect(elapsed).toBeLessThan(1_000);
		const identity = id("oversized", "oversized-worker");
		const summary = "x".repeat(MAX_DELIVERY_BODY_CHARS * 2);
		const oversized = projectionWith([
			...spawnFacts({ attemptId: "oversized", workerId: "oversized-worker", name: "oversized" }),
			{ schemaVersion: 4, ...identity, eventId: createDeclarationEventId(identity, "done", summary), kind: "declaration_done", occurredAt: 3, payload: { summary } },
		]);
		expect(buildPendingDelivery(oversized, [])?.content.length).toBeLessThanOrEqual(MAX_DELIVERY_BODY_CHARS);
	});

	test("24 restart between fact append and notification replays the pending event", () => {
		const facts = terminalFacts();
		const entries = facts.map((item) => entry(item));
		const restarted = new LifecycleRuntimeStore(SESSION, entries);
		expect(buildPendingDelivery(restarted.projection(), [])?.eventIds).toEqual([facts.at(-1)!.eventId]);
	});

	test("25 restart between effect request and completion reconciles idempotently", async () => {
		const baseFacts = spawnFacts();
		const firstHarness = makeWriter();
		for (const item of baseFacts) firstHarness.writer.appendFact(item);
		const identity = id();
		const normalizedInputs = { ticketId: "ticket-1" } as JsonValue;
		const effectId = createEffectId(identity, "ticket_close", normalizedInputs);
		const requested = fact("effect_requested", { effectId, effectKind: "ticket_close", normalizedInputs }, { eventId: createLeaderEventId(identity, "effect_requested", effectId), at: 3 });
		firstHarness.writer.appendFact(requested);
		const restarted = new LifecycleRuntimeStore(SESSION, firstHarness.entries);
		expect(pendingEffects(restarted.projection())).toHaveLength(1);
		const restartedWriter = new SessionFactWriter({ appendEntry: (customType, data) => firstHarness.session.getEntries().push({ type: "custom", customType, data }) }, firstHarness.session, firstHarness.entries);
		let executions = 0;
		await executeDurableEffect(restartedWriter, restarted.projection(), { identity, effectKind: "ticket_close", normalizedInputs }, async () => { executions++; }, (item) => { restarted.append(item); });
		expect(executions).toBe(1);
		expect(pendingEffects(restarted.projection())).toHaveLength(0);
		await executeDurableEffect(restartedWriter, restarted.projection(), { identity, effectKind: "ticket_close", normalizedInputs }, async () => { executions++; }, (item) => { restarted.append(item); });
		expect(executions).toBe(1);

		const retryInputs = { ticketId: "ticket-2" } as JsonValue;
		await expect(executeDurableEffect(
			restartedWriter, restarted.projection(),
			{ identity, effectKind: "ticket_note", normalizedInputs: retryInputs },
			async () => { throw new Error("first transient failure"); },
			(item) => { restarted.append(item); },
		)).rejects.toThrow("first transient failure");
		expect(pendingEffects(restarted.projection()).map((effect) => effect.kind)).toContain("ticket_note");
		await executeDurableEffect(
			restartedWriter, restarted.projection(),
			{ identity, effectKind: "ticket_note", normalizedInputs: retryInputs },
			async () => undefined,
			(item) => { restarted.append(item); },
		);
		expect(pendingEffects(restarted.projection()).map((effect) => effect.kind)).not.toContain("ticket_note");
	});

	test("26 session switch discards the old projection and rejects old-session facts", () => {
		const oldFacts = terminalFacts();
		const oldStore = new LifecycleRuntimeStore(SESSION, oldFacts.map((item) => entry(item)));
		const newStore = new LifecycleRuntimeStore("new-session", oldFacts.map((item) => entry(item)));
		expect(oldStore.projection().attempts).toHaveLength(1);
		expect(newStore.projection().attempts).toHaveLength(0);
		expect(newStore.append(oldFacts[0]!)).toBe("foreign");
	});

	test("27 pending worker finish survives exit and yields at most one deterministic correction", () => {
		const base = spawnFacts();
		const identity = id();
		const pendingSummary = "recovered";
		const pendingEventId = createDeclarationEventId(identity, "done", pendingSummary);
		const workerEntries: SessionEntryLike[] = [{
			type: "custom",
			customType: WORKER_FINISH_PENDING_ENTRY_TYPE,
			data: { schemaVersion: 1, ...identity, status: "done", summary: pendingSummary, eventId: pendingEventId, createdAt: 5 },
		}];
		const recoveredPending = workerFinishPendingForAttempt(workerEntries, identity);
		expect(recoveredPending).toMatchObject({ status: "done", summary: pendingSummary, eventId: pendingEventId });
		expect(workerFinishPendingForAttempt(workerEntries, { ...identity, attemptId: "other-attempt" })).toBeNull();
		const exit = fact("process_exited", { pid: 101, processBirth: { startedAt: 1 }, code: 0 }, { at: 3 });
		const provisional = fact("assessment_missing_finish", { reason: "pending transport", provisional: true }, { eventId: createLeaderEventId(identity, "assessment_missing_finish", exit.eventId), at: 4 });
		const declaration: LifecycleFact = { schemaVersion: 4, ...identity, eventId: recoveredPending!.eventId, kind: "declaration_done", occurredAt: 5, payload: { summary: recoveredPending!.summary }, diagnostics: { recoveredFromWorkerSession: "/worker/session.jsonl" } };
		const correctionId = createLeaderEventId(identity, "outcome_corrected", provisional.eventId, { declarationEventId: declaration.eventId });
		const correction = fact("outcome_corrected", { provisionalEventId: provisional.eventId, declarationEventId: declaration.eventId, summary: "Outcome corrected: recovered" }, { eventId: correctionId, at: 6 });
		const accumulator = new LifecycleAccumulator(SESSION);
		for (const item of [...base, exit, provisional, declaration, correction, { ...correction, occurredAt: 999 }]) accumulator.append(item);
		const projection = accumulator.current();
		expect(projection.attempts.get("attempt-1")?.declaration?.summary).toBe("recovered");
		expect([...projection.actionableEvents.values()].filter((event) => event.type === "outcome_corrected")).toHaveLength(1);
	});

	test("28 derived assessments, corrections, and stuck facts have stable IDs across reload", () => {
		const identity = id();
		const exitId = createLeaderEventId(identity, "process_exited", "101:1");
		const first = [
			createLeaderEventId(identity, "assessment_missing_finish", exitId),
			createLeaderEventId(identity, "outcome_corrected", "assessment", { declarationEventId: "declaration" }),
			createLeaderEventId(identity, "stuck", "stuck:3", { cooldownIndex: 3 }),
		];
		const second = [
			createLeaderEventId({ ...identity }, "assessment_missing_finish", exitId),
			createLeaderEventId({ ...identity }, "outcome_corrected", "assessment", { declarationEventId: "declaration" }),
			createLeaderEventId({ ...identity }, "stuck", "stuck:3", { cooldownIndex: 3 }),
		];
		expect(second).toEqual(first);
	});

	test("29 reordered keys and diagnostic timestamps duplicate; authoritative change conflicts", () => {
		const harness = makeWriter();
		const original = fact("protocol_violation", { conflictingEventId: "conflict", reason: "same", nested: { a: 1, b: 2 } }, { eventId: "same-event", diagnostics: { at: 1 } });
		const reordered = fact("protocol_violation", { nested: { b: 2, a: 1 }, reason: "same", conflictingEventId: "conflict" }, { eventId: "same-event", at: 99, diagnostics: { at: 99 } });
		expect(canonicalFactIdentity(reordered)).toBe(canonicalFactIdentity(original));
		expect(harness.writer.appendFact(original).status).toBe("appended");
		expect(harness.writer.appendFact(reordered).status).toBe("duplicate");
		expect(() => harness.writer.appendFact({ ...reordered, payload: { conflictingEventId: "conflict", reason: "changed" } })).toThrow("Conflicting lifecycle eventId");
		expect(parseLifecycleFact({ ...fact("spawn_requested", {}), payload: {} })).toBeNull();
	});

	test("30 provider request matrix acknowledges only terminal successful-request markers", () => {
		const marker = "event-1";
		const run = (steps: (tracker: ProviderDeliveryTracker) => void) => {
			const harness = makeWriter();
			const tracker = new ProviderDeliveryTracker();
			tracker.beginRun("matrix");
			tracker.setDeliveredBatch([marker]);
			steps(tracker);
			return tracker.acknowledgeSuccessfulDelivery(harness.writer);
		};
		expect(run((tracker) => { tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(429); tracker.messageEnd({ role: "assistant", stopReason: "error" }); })).toEqual([]);
		expect(run((tracker) => { tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.messageEnd({ role: "assistant", stopReason: "error" }); })).toEqual([]);
		expect(run((tracker) => { tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "error" }); })).toEqual([]);
		expect(run((tracker) => { tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(429); tracker.messageEnd({ role: "assistant", stopReason: "error" }); tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "stop" }); })).toEqual([marker]);
		expect(run((tracker) => { tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "toolUse" }); tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(429); tracker.messageEnd({ role: "assistant", stopReason: "error" }); })).toEqual([]);
		expect(run((tracker) => { tracker.observeContext(`[teams-event:${marker}]`); tracker.beforeProviderRequest(undefined, false); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "stop" }); })).toEqual([marker]);
		expect(providerPayloadExposesConversation({ model: "opaque-adapter-metadata" })).toBeFalse();
		expect(run((tracker) => { tracker.observeContext(`[teams-event:${marker}]`); tracker.beforeProviderRequest({ model: "opaque-adapter-metadata" }); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "stop" }); })).toEqual([marker]);
		expect(providerPayloadExposesConversation({ messages: [] })).toBeTrue();
		expect(run((tracker) => { tracker.observeContext(`[teams-event:${marker}]`); tracker.beforeProviderRequest({ messages: [] }); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "stop" }); })).toEqual([]);
		expect(run((tracker) => { tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "toolUse" }); tracker.beforeProviderRequest({ messages: [] }); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "stop" }); })).toEqual([]);
		expect(run((tracker) => { tracker.beforeProviderRequest(`[teams-event:${marker}]`); tracker.afterProviderResponse(200); tracker.messageEnd({ role: "assistant", stopReason: "aborted" }); })).toEqual([]);
	});

	test("31 coordinator and worker persistence guards reject pre-first-assistant buffering", () => {
		const buffered = makeWriter({ assistant: false });
		expect(hasAssistantMessage(buffered.entries)).toBeFalse();
		expect(() => buffered.writer.assertWritable()).toThrow("first assistant message");
		expect(buffered.appended).toHaveLength(0);
		buffered.entries.push({ type: "message", message: { role: "assistant" } });
		buffered.writer.noteAssistantMessage();
		expect(() => buffered.writer.assertWritable()).not.toThrow();
		const noSession = makeWriter({ sessionFile: "", assistant: true });
		expect(() => noSession.writer.assertWritable()).toThrow("persisted Pi session");
		expect(extractEventMarkers({ content: "worker finish has no lifecycle marker" }).size).toBe(0);
	});
});
