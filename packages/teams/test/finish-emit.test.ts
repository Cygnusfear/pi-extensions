// Regression: the worker's team_finish mesh envelope is the AUTHORITATIVE
// terminal signal — the leader must emit the terminal notification immediately
// from the finish tell, not wait for a process exit that may never be observed
// (team_finish does not exit the worker; the v2-terminal lifecycle stops the
// activity monitor; the Bun premature-exit guard used to drop exits silently).
//
// Before this fix a coordinator could sit idle forever while teams.list showed
// "done | v2 done" — no default batch, no subscription dispatch, no .wake().

import { describe, expect, test } from "bun:test";
import { TeamLeader } from "../leader.ts";
import type { WorkerHandle } from "../types.ts";
import { NOTIFY_BATCH_WINDOW_MS } from "../types.ts";
import { createWorkerFinishEnvelope } from "../v2/mesh-adapter.ts";
import { createDeclarationEventId, createLeaderEventId } from "../v2/session-facts.ts";

const TEAM_ID = "team-test1234";

type SentMessage = { content: string; triggerTurn: boolean };

function makeLeader() {
	const sent: SentMessage[] = [];
	const entries: any[] = [{ type: "message", id: "assistant", message: { role: "assistant", content: [] } }];
	const fakePi = {
		appendEntry: (customType: string, data: unknown) => entries.push({ type: "custom", customType, data }),
		exec: async () => ({ stdout: "" }),
		sendMessage: (msg: { content: string }, options?: { triggerTurn?: boolean }) => {
			sent.push({ content: msg.content, triggerTurn: options?.triggerTurn === true });
		},
	};
	const leader = new TeamLeader(fakePi as never) as any;
	const ctx = {
		cwd: "/tmp/test-repo",
		ui: { setWidget: () => {} },
		sessionManager: {
			getSessionFile: () => "/tmp/finish-leader.jsonl",
			getSessionId: () => "finish-leader-session",
			getEntries: () => entries,
			getBranch: () => entries,
			getHeader: () => null,
		},
	};
	leader.restoreState(ctx);
	leader.teamId = TEAM_ID;
	leader.renderWidget = () => {};
	leader.startActivityMonitor = () => {};
	leader.scheduleWorkerCleanup = () => {};
	leader.queueAmbientChatForResumableWorkers = () => {};
	return { leader: leader as TeamLeader, sent };
}

function makeWorker(
	name: string,
	overrides?: Partial<WorkerHandle>,
): WorkerHandle {
	return {
		workerId: name,
		workerInstanceId: `${name}-instance`,
		name,
		pid: 999999999, // never a live pid
		ticketId: `tk-${name}`,
		ticketStatus: "unknown",
		lastNote: "",
		sessionDir: "/tmp/none",
		sessionFile: "/tmp/none/session.jsonl",
		worktreePath: null,
		model: undefined,
		hasTools: false,
		status: "running",
		spawnedAt: Date.now(),
		freeform: true, // skip the reap timer in unit tests
		lastActivityAt: Date.now(),
		lastSeenCommentCount: 0,
		hasActiveChildProcess: false,
		activeChildProcessCount: 0,
		attempts: [],
		...overrides,
	} as WorkerHandle;
}

function finishEnvelope(
	worker: WorkerHandle,
	status: "done" | "quit",
	summary: string,
) {
	return createWorkerFinishEnvelope({
		teamId: TEAM_ID,
		leaderEpoch: (TeamLeader as never as { prototype: never })
			? "epoch-1"
			: "epoch-1",
		workerId: worker.workerId,
		attemptId: worker.workerInstanceId,
		seq: 1,
		status,
		summary,
		eventId: createDeclarationEventId({ coordinatorSessionId: "finish-leader-session", teamId: TEAM_ID, workerId: worker.workerId, attemptId: worker.workerInstanceId }, status, summary),
	});
}

function registerWorker(leader: TeamLeader, worker: WorkerHandle) {
	const l = leader as any;
	l.recordSpawnRequested({ workerId: worker.workerId, workerInstanceId: worker.workerInstanceId, ticketId: worker.ticketId, workerName: worker.name, useWorktree: false, cwd: "/tmp/test-repo", repoRoot: "/tmp/test-repo", sessionDir: worker.sessionDir, leaderSessionFile: "/tmp/finish-leader.jsonl", teamId: TEAM_ID, leaderEpoch: l.leaderEpoch, coordinatorSessionId: "finish-leader-session", freeform: true, sessionMode: { kind: "fresh" } }, worker.sessionFile);
	l.workers.set(worker.name, worker);
	l.recordProcessStart(worker, worker.spawnedAt, worker.pid);
}

function dispatchFinish(
	leader: TeamLeader,
	worker: WorkerHandle,
	status: "done" | "quit",
	summary: string,
) {
	const l = leader as never as {
		workers: Map<string, WorkerHandle>;
		leaderEpoch: string;
		handleWorkerToLeaderEnvelope: (envelope: unknown, from: string) => void;
	};
	registerWorker(leader, worker);
	const envelope = finishEnvelope(worker, status, summary) as {
		leaderEpoch: string;
	};
	envelope.leaderEpoch = l.leaderEpoch ?? "epoch-1";
	l.handleWorkerToLeaderEnvelope(envelope, "transport-abc");
}

const settle = () =>
	new Promise((r) => setTimeout(r, NOTIFY_BATCH_WINDOW_MS + 100));

describe("authoritative mesh finish emits the terminal notification", () => {
	test("worker.finish(done) → completed batch with triggerTurn:true, no process exit needed", async () => {
		const { leader, sent } = makeLeader();
		const worker = makeWorker("rev-1");
		dispatchFinish(leader, worker, "done", "PASS 10/10 — all gates green");
		await settle();
		expect(sent.length).toBe(1);
		expect(sent[0].content).toContain("PASS 10/10");
		expect(sent[0].triggerTurn).toBe(true);
	});

	test("worker.finish(done) dispatches armed terminal subscriptions (.wake path)", async () => {
		const { leader, sent } = makeLeader();
		const worker = makeWorker("rev-2");
		const seen: string[] = [];
		(
			leader as never as {
				subscribeToEvents: (fn: (e: { type: string; preventDefault(): void }) => void) => void;
			}
		).subscribeToEvents((e) => {
			seen.push(e.type);
			e.preventDefault();
			(leader as any).wakeFromSubscription(e, `host wake: ${worker.name}`);
		});
		dispatchFinish(leader, worker, "done", "done summary");
		// The wake message already carries the lifecycle marker. before_agent_start
		// must not inject the same pending batch a second time.
		expect((leader as any).prepareDeliveryForAgentRun()).toBeUndefined();
		await settle();
		expect(seen).toContain("completed");
		expect(sent.length).toBe(1);
		expect(sent[0].content.match(/\[teams-event:/g)).toHaveLength(1);
	});

	test("later process-exit re-emit is deduped (no double batch)", async () => {
		const { leader, sent } = makeLeader();
		const worker = makeWorker("rev-3");
		dispatchFinish(leader, worker, "done", "first emit");
		await settle();
		expect(sent.length).toBe(1);
		// Simulate the process-exit pipeline emitting the same terminal event later
		(leader as never as { notifyLLM: (e: unknown) => void }).notifyLLM({
			type: "completed",
			worker: { ...worker },
			result: "exit-path duplicate",
		});
		await settle();
		expect(sent.length).toBe(1);
	});

	test("worker.finish(quit) → warning batch with QUIT summary, triggerTurn:true", async () => {
		const { leader, sent } = makeLeader();
		const worker = makeWorker("rev-4");
		dispatchFinish(leader, worker, "quit", "blocked on missing API key");
		await settle();
		expect(sent.length).toBe(1);
		expect(sent[0].content).toContain("QUIT: blocked on missing API key");
		expect(sent[0].triggerTurn).toBe(true);
	});
});

describe("stuck events wake on every warning", () => {
	test("first and cooldown-repeat stuck warnings both trigger turns", async () => {
		const { leader, sent } = makeLeader();
		const worker = makeWorker("slow-1");
		registerWorker(leader, worker);
		const l = leader as any;
		const identity = { coordinatorSessionId: "finish-leader-session", teamId: TEAM_ID, workerId: worker.workerId, attemptId: worker.workerInstanceId };
		for (const [cooldownIndex, idleSeconds] of [[0, 300], [1, 360]] as const) {
			const eventId = createLeaderEventId(identity, "stuck", `stuck:${cooldownIndex}`, { cooldownIndex });
			l.appendLifecycleFact({
				schemaVersion: 4, ...identity, eventId, kind: "stuck", occurredAt: Date.now(),
				payload: { cooldownIndex, idleSeconds },
			});
			l.notifyLLM({ type: "stuck", worker: { ...worker }, idleSeconds, first: cooldownIndex === 0, lifecycleEventId: eventId, attemptId: worker.workerInstanceId });
			await settle();
		}
		expect(sent).toHaveLength(2);
		expect(sent.every((message) => message.triggerTurn)).toBe(true);
	});
});
