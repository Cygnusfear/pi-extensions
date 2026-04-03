import { describe, expect, test } from "bun:test";
import { TeamLeader } from "./leader.ts";
import type { WorkerHandle } from "./types.js";
import { createWorkerCommentEnvelope } from "./v2/mesh-adapter.ts";

function makeWorker(overrides: Partial<WorkerHandle> = {}): WorkerHandle {
	const now = Date.now();
	return {
		workerInstanceId: "w-1",
		name: "worker-1",
		pid: 12345,
		ticketId: "tk-1",
		ticketStatus: "open",
		lastNote: "hello",
		sessionDir: "/tmp/session-dir",
		sessionFile: "/tmp/session-dir/session.jsonl",
		worktreePath: null,
		model: undefined,
		hasTools: false,
		status: "running",
		spawnedAt: now,
		lastActivityAt: now,
		lastProcessActivityAt: now,
		lastOutputAt: now,
		hasActiveChildProcess: false,
		activeChildProcessCount: 0,
		lastSeenCommentCount: 0,
		routeState: "pending",
		...overrides,
	};
}

function makeHarness(branch: any[] = []) {
	const appended: Array<{ customType: string; data: unknown }> = [];
	const fakePi = {
		appendEntry: (customType: string, data: unknown) => {
			appended.push({ customType, data });
		},
	};
	const leader = new TeamLeader(fakePi as any);
	const leaderAny = leader as any;
	leaderAny.ctx = {
		ui: { setWidget: () => {} },
		sessionManager: {
			getBranch: () => branch,
		},
	};
	leaderAny.stateHydrated = true;
	return { leader: leaderAny, appended };
}

describe("TeamLeader state persistence", () => {
	test("renderWidget no longer persists state and dedupe ignores volatile fields", () => {
		const { leader, appended } = makeHarness();
		leader.workers.set("worker-1", makeWorker());

		leader.renderWidget();
		expect(appended).toHaveLength(0);

		leader.persistStateIfHydrated();
		expect(appended).toHaveLength(1);

		const worker = leader.workers.get("worker-1");
		worker.lastActivityAt += 5000;
		worker.lastOutputAt += 5000;
		worker.lastNote = "new note";
		worker.ticketStatus = "in_progress";
		worker.lastSeenCommentCount = 99;

		leader.renderWidget();
		leader.persistStateIfHydrated();
		expect(appended).toHaveLength(1);

		worker.status = "done";
		leader.persistStateIfHydrated();
		expect(appended).toHaveLength(2);
	});

	test("restoreState seeds dedupe signature so immediate render does not append duplicate snapshot", () => {
		const now = Date.now();
		const snapshot = {
			version: 3,
			meshChannelId: null,
			v2TeamId: "team-1",
			workers: {
				"worker-1": {
					workerInstanceId: "w-1",
					attempts: [{
						workerInstanceId: "w-1",
						pid: 999999,
						sessionDir: "/tmp/session-dir",
						sessionFile: "/tmp/session-dir/session.jsonl",
						spawnedAt: now,
						sessionMode: { kind: "resume", sessionFile: "/tmp/session-dir/session.jsonl" },
					}],
					name: "worker-1",
					pid: 999999,
					ticketId: "tk-1",
					sessionDir: "/tmp/session-dir",
					sessionFile: "/tmp/session-dir/session.jsonl",
					worktreePath: null,
					status: "done",
					spawnedAt: now,
					sessionMode: { kind: "resume", sessionFile: "/tmp/session-dir/session.jsonl" },
					freeform: true,
					routeState: "resumable",
					doneAt: now,
					graceAt: now - 1000,
					resumableUntilAt: now + 60_000,
				},
			},
			savedAt: now,
		};
		const branch = [
			{
				type: "custom",
				customType: "teams-leader-state",
				data: snapshot,
			},
		];
		const { leader, appended } = makeHarness(branch);
		leader.restoreState(leader.ctx);
		expect(appended).toHaveLength(0);
		expect(leader.getV2CurrentSessionMode("worker-1")).toEqual({ kind: "resume", sessionFile: "/tmp/session-dir/session.jsonl" });
		expect(leader.getWorker("worker-1")?.attempts).toHaveLength(1);
	});

	test("mesh handlers wire once and are removed on stopPolling", () => {
		const { leader } = makeHarness();
		const listeners = {
			channel: new Set<Function>(),
			message: new Set<Function>(),
		};
		const mesh = {
			on: (event: "channel" | "message", cb: Function) => listeners[event].add(cb),
			off: (event: "channel" | "message", cb: Function) => listeners[event].delete(cb),
			stop: () => {},
			joinChannel: () => {},
			peers: () => [],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			ask: async () => ({}),
			chat: () => {},
		};
		leader.setMesh(mesh as any);
		leader._wireMeshChannelEvents();
		leader._wireMeshChannelEvents();
		expect(listeners.channel.size).toBe(1);
		expect(listeners.message.size).toBe(1);
		leader.stopPolling();
		expect(listeners.channel.size).toBe(0);
		expect(listeners.message.size).toBe(0);
	});

	test("mesh channel handler accepts v2 worker comment envelopes", () => {
		const { leader } = makeHarness();
		const notified: Array<{ type: string; comment?: string }> = [];
		leader.notifyLLM = (event: { type: string; comment?: string }) => notified.push(event);
		leader.queueAmbientChatForResumableWorkers = () => {};
		leader.renderWidget = () => {};
		leader.workers.set("worker-1", makeWorker({ workerInstanceId: "attempt-1" }));
		const mesh = {
			on: () => {},
			off: () => {},
			stop: () => {},
			joinChannel: () => {},
			peers: () => [],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			ask: async () => ({}),
			chat: () => {},
		};
		leader.setMesh(mesh as any);
		leader._wireMeshChannelEvents();

		leader.meshChannelHandler({
			from: "mesh-worker-1",
			channel: "teams-v2-team-1",
			payload: createWorkerCommentEnvelope({
				teamId: "team-1",
				leaderEpoch: "epoch-1",
				workerId: "worker-1",
				attemptId: "attempt-1",
				seq: 1,
				text: "hello from v2",
			}),
			timestamp: Date.now(),
		});

		expect(notified).toHaveLength(1);
		expect(notified[0]).toMatchObject({ type: "comment", comment: "hello from v2" });
	});

	test("buildSpawnSessionMode prefers a real forked session when branching is available", () => {
		const { leader } = makeHarness();
		leader.ctx.sessionManager.getSessionFile = () => "/tmp/leader.jsonl";
		leader.ctx.sessionManager.getLeafId = () => "leaf-1";
		leader.ctx.sessionManager.createBranchedSession = () => "/tmp/forked.jsonl";

		expect(leader.buildSpawnSessionMode()).toEqual({
			kind: "fork",
			parentSessionFile: "/tmp/leader.jsonl",
			parentLeafId: "leaf-1",
			sessionFile: "/tmp/forked.jsonl",
		});
	});

	test("buildSpawnSessionMode falls back to fresh when branching is unavailable", () => {
		const { leader } = makeHarness();
		leader.ctx.sessionManager.getSessionFile = () => "/tmp/leader.jsonl";
		leader.ctx.sessionManager.getLeafId = () => null;

		expect(leader.buildSpawnSessionMode()).toEqual({ kind: "fresh" });
	});

	test("v2 getters expose reduced lifecycle and current session mode", () => {
		const { leader } = makeHarness();
		leader.ctx.sessionManager.getSessionFile = () => "/tmp/leader.jsonl";
		leader.ctx.sessionManager.getLeafId = () => "leaf-1";
		leader.ctx.sessionManager.createBranchedSession = () => "/tmp/forked.jsonl";
		const worker = makeWorker({ workerInstanceId: "attempt-1" });
		leader.workers.set("worker-1", worker);
		leader.upsertV2WorkerFromHandle(worker);
		leader.appendV2Fact("worker-1", { type: "spawn_started", at: 1, pid: worker.pid });
		leader.appendV2Fact("worker-1", { type: "worker_hello", at: 2 });

		expect(leader.getV2WorkerLifecycle("worker-1")).toBe("running");
		expect(leader.getV2CurrentSessionMode("worker-1")).toEqual({
			kind: "fresh",
		});
	});
});
