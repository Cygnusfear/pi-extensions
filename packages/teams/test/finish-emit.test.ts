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

const TEAM_ID = "team-test1234";

type SentMessage = { content: string; triggerTurn: boolean };

function makeLeader() {
	const sent: SentMessage[] = [];
	const fakePi = {
		exec: async () => ({ stdout: "" }),
		sendMessage: (
			msg: { content: string },
			options?: { triggerTurn?: boolean },
		) => {
			sent.push({
				content: msg.content,
				triggerTurn: options?.triggerTurn === true,
			});
		},
	};
	const leader = new TeamLeader(fakePi as never) as unknown as Record<
		string,
		unknown
	> &
		TeamLeader;
	const leaderAny = leader as never as Record<string, never>;
	Object.assign(leaderAny, {
		renderWidget: () => {},
		persistStateIfHydrated: () => {},
		startActivityMonitor: () => {},
		scheduleWorkerCleanup: () => {},
		queueAmbientChatForResumableWorkers: () => {},
		v2TeamId: TEAM_ID,
	});
	(leader as never as { ensureV2Team: () => void }).ensureV2Team();
	return { leader, sent };
}

function makeWorker(
	name: string,
	overrides?: Partial<WorkerHandle>,
): WorkerHandle {
	return {
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
		workerId: worker.name,
		attemptId: worker.workerInstanceId,
		seq: 1,
		status,
		summary,
	});
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
	l.workers.set(worker.name, worker);
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
				subscribeToEvents: (fn: (e: { type: string }) => void) => void;
			}
		).subscribeToEvents((e) => seen.push(e.type));
		dispatchFinish(leader, worker, "done", "done summary");
		await settle();
		expect(seen).toContain("completed");
		expect(sent.length).toBe(1);
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
		const notify = (
			leader as never as { notifyLLM: (e: unknown) => void }
		).notifyLLM.bind(leader);
		notify({
			type: "stuck",
			worker: { ...worker },
			idleSeconds: 300,
			first: true,
		});
		await settle();
		expect(sent.length).toBe(1);
		expect(sent[0].triggerTurn).toBe(true);
		notify({
			type: "stuck",
			worker: { ...worker },
			idleSeconds: 360,
			first: false,
		});
		await settle();
		expect(sent.length).toBe(2);
		expect(sent[1].triggerTurn).toBe(true);
	});
});
