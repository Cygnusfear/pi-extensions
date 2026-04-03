import { describe, expect, test } from "bun:test";
import { TeamLeader } from "./leader.ts";
import type { WorkerHandle } from "./types.js";

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
			workers: {
				"worker-1": {
					workerInstanceId: "w-1",
					name: "worker-1",
					pid: 999999,
					ticketId: "tk-1",
					sessionDir: "/tmp/session-dir",
					sessionFile: "/tmp/session-dir/session.jsonl",
					worktreePath: null,
					status: "done",
					spawnedAt: now,
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
});
