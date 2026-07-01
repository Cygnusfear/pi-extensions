import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { TeamLeader } from "./leader.ts";
import type { WorkerHandle } from "./types.js";
import { createWorkerCommentEnvelope } from "./v2/mesh-adapter.ts";
import { SESSION_PHASE_EVENT_KIND, SESSION_PHASE_EVENT_VERSION } from "@pi-extensions/shared/session-phase-event";

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
			v2TeamRecord: {
				teamId: "team-1",
				leaderEpoch: "epoch-old",
				createdAt: now,
				workers: {
					"worker-1": {
						workerId: "worker-1",
						name: "worker-1",
						desiredState: "running",
						currentAttemptId: "w-1",
						lifecycle: "done",
						attempts: [{
							attemptId: "w-1",
							workerId: "worker-1",
							leaderEpoch: "epoch-old",
							sessionMode: { kind: "resume", sessionFile: "/tmp/session-dir/session.jsonl" },
							sessionDir: "/tmp/session-dir",
							sessionFile: "/tmp/session-dir/session.jsonl",
							startedAt: now,
							pid: 999999,
							facts: [{ type: "spawn_started", at: now, pid: 999999 }, { type: "worker_hello", at: now }, { type: "finish_done", at: now, summary: "done" }],
						}],
					},
				},
			},
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
		expect(leader.getWorker("worker-1")?.status).toBe("done");
		expect(leader.getWorker("worker-1")?.ticketStatus).toBe("closed");
		expect(leader.getV2WorkerLifecycle("worker-1")).toBe("done");
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

	test("mesh channel handler turns status() phase events into teams.on PollEvents", () => {
		const { leader } = makeHarness();
		const observed: any[] = [];
		leader.notifyLLM = (event: any) => observed.push(event);
		leader.renderWidget = () => {};
		leader.v2TeamId = "team-1";
		leader.workers.set("worker-1", makeWorker({ workerInstanceId: "attempt-1" }));
		const mesh = {
			on: () => {},
			off: () => {},
			stop: () => {},
			joinChannel: () => {},
			peers: () => [{ id: "route-1", meshId: "durable-1", nickname: "Worker Nova" }],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			ask: async () => ({}),
			chat: () => {},
		};
		leader.setMesh(mesh as any);
		leader._wireMeshChannelEvents();

		leader.meshChannelHandler({
			from: "route-1",
			channel: "teams-v2-team-1",
			payload: {
				kind: SESSION_PHASE_EVENT_KIND,
				version: SESSION_PHASE_EVENT_VERSION,
				from: "worker",
				to: "leader",
				teamId: "team-1",
				leaderEpoch: leader.leaderEpoch,
				workerId: "worker-1",
				attemptId: "attempt-1",
				seq: 1,
				sentAt: Date.now(),
				meshId: "durable-1",
				payload: { stage: "implementing", label: "implementing", icon: "🏭", color: "amber", sessionId: "sess-1" },
			},
			timestamp: Date.now(),
		});

		expect(observed).toHaveLength(1);
		expect(observed[0]).toMatchObject({ type: "phase", phase: { payload: { stage: "implementing" } } });
		expect(leader.getWorker("worker-1")?.durableMeshId).toBe("durable-1");
	});

	test("buildSpawnSessionMode defaults to fresh even when branching is available", () => {
		const { leader } = makeHarness();
		const forked = path.join(process.cwd(), `.tmp-fork-${Date.now()}.jsonl`);
		fs.writeFileSync(forked, JSON.stringify({ type: "session", version: 3, id: "forked", timestamp: new Date().toISOString(), cwd: process.cwd() }) + "\n");
		leader.ctx.sessionManager.getSessionFile = () => "/tmp/leader.jsonl";
		leader.ctx.sessionManager.getLeafId = () => "leaf-1";
		leader.ctx.sessionManager.createBranchedSession = () => forked;

		expect(leader.buildSpawnSessionMode()).toEqual({ kind: "fresh" });
		fs.rmSync(forked, { force: true });
	});

	test("buildSpawnSessionMode can opt into fork mode via env", () => {
		const { leader } = makeHarness();
		const previous = process.env.PI_TEAMS_PREFER_FORK;
		process.env.PI_TEAMS_PREFER_FORK = "1";
		const forked = path.join(process.cwd(), `.tmp-fork-${Date.now()}.jsonl`);
		fs.writeFileSync(forked, JSON.stringify({ type: "session", version: 3, id: "forked", timestamp: new Date().toISOString(), cwd: process.cwd() }) + "\n");
		leader.ctx.sessionManager.getSessionFile = () => "/tmp/leader.jsonl";
		leader.ctx.sessionManager.getLeafId = () => "leaf-1";
		leader.ctx.sessionManager.createBranchedSession = () => forked;

		expect(leader.buildSpawnSessionMode()).toEqual({
			kind: "fork",
			parentSessionFile: "/tmp/leader.jsonl",
			parentLeafId: "leaf-1",
			sessionFile: forked,
		});
		fs.rmSync(forked, { force: true });
		if (previous === undefined) delete process.env.PI_TEAMS_PREFER_FORK;
		else process.env.PI_TEAMS_PREFER_FORK = previous;
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

	test("upsertV2WorkerFromHandle preserves explicit attempt session mode", () => {
		const { leader } = makeHarness();
		const worker = makeWorker({
			attempts: [{
				workerInstanceId: "attempt-1",
				pid: 12345,
				sessionDir: "/tmp/session-dir",
				sessionFile: "/tmp/session-dir/session.jsonl",
				spawnedAt: Date.now(),
				sessionMode: { kind: "fork", parentSessionFile: "/tmp/leader.jsonl", parentLeafId: "leaf-1", sessionFile: "/tmp/forked.jsonl" },
			}],
		});
		leader.workers.set("worker-1", worker);
		leader.upsertV2WorkerFromHandle(worker);
		expect(leader.getV2CurrentSessionMode("worker-1")).toEqual({
			kind: "fork",
			parentSessionFile: "/tmp/leader.jsonl",
			parentLeafId: "leaf-1",
			sessionFile: "/tmp/forked.jsonl",
		});
	});

	test("getWorkers prunes stale recovered spawning workers with dead pids and empty sessions", () => {
		const { leader } = makeHarness();
		leader.workers.set("ghost", makeWorker({
			name: "ghost",
			pid: 999999,
			status: "spawning",
			spawnedAt: Date.now() - 120_000,
			sessionDir: "/tmp/no-such-session-dir",
			sessionFile: "/tmp/no-such-session-dir/session.jsonl",
			routeState: "pending",
		}));

		const workers = leader.getWorkers();
		expect(workers[0]?.status).toBe("failed");
		expect(workers[0]?.routeState).toBe("dead");
	});
});

describe("tellWorker honest delivery receipt (v1d — Cecilia bug 1)", () => {
	function meshWithReceipt(receipt: { phase: string } | Error, spy: { calls: number }) {
		return {
			on: () => {},
			off: () => {},
			stop: () => {},
			joinChannel: () => {},
			peers: () => [],
			self: () => ({ id: "mesh-self" }),
			tell: () => {
				throw new Error("tellWorker must NOT use fire-and-forget mesh.tell for a running worker");
			},
			tellAndWaitForReceipt: async (_id: string, _msg: unknown, _phase: string, _to?: number) => {
				spy.calls += 1;
				if (receipt instanceof Error) throw receipt;
				return receipt;
			},
			ask: async () => ({}),
			chat: () => {},
		};
	}

	test("a 'delivered' receipt returns true", async () => {
		const { leader } = makeHarness();
		const spy = { calls: 0 };
		leader.setMesh(meshWithReceipt({ phase: "delivered" }, spy) as any);
		leader.workers.set("worker-1", makeWorker({ routeState: "linked", durableMeshId: "durable-1" }));
		expect(await leader.tellWorker("worker-1", "go")).toBe(true);
		expect(spy.calls).toBe(1);
	});

	test("a 'surfaced' receipt returns true", async () => {
		const { leader } = makeHarness();
		const spy = { calls: 0 };
		leader.setMesh(meshWithReceipt({ phase: "surfaced" }, spy) as any);
		leader.workers.set("worker-1", makeWorker({ routeState: "linked", durableMeshId: "durable-1" }));
		expect(await leader.tellWorker("worker-1", "go")).toBe(true);
	});

	test("an 'undeliverable' receipt returns FALSE (no false-positive — Cecilia bug 1 root)", async () => {
		const { leader } = makeHarness();
		const spy = { calls: 0 };
		leader.setMesh(meshWithReceipt({ phase: "undeliverable" }, spy) as any);
		leader.workers.set("worker-1", makeWorker({ routeState: "linked", durableMeshId: "durable-1" }));
		expect(await leader.tellWorker("worker-1", "go")).toBe(false);
		expect(spy.calls).toBe(1);
	});

	test("a 'refused' (deafened) receipt returns false", async () => {
		const { leader } = makeHarness();
		const spy = { calls: 0 };
		leader.setMesh(meshWithReceipt({ phase: "refused" }, spy) as any);
		leader.workers.set("worker-1", makeWorker({ routeState: "linked", durableMeshId: "durable-1" }));
		expect(await leader.tellWorker("worker-1", "go")).toBe(false);
	});

	test("a receipt timeout/rejection returns false (honest not-delivered)", async () => {
		const { leader } = makeHarness();
		const spy = { calls: 0 };
		leader.setMesh(meshWithReceipt(new Error("mesh_tell: timeout waiting for delivered receipt after 5000ms"), spy) as any);
		leader.workers.set("worker-1", makeWorker({ routeState: "linked", durableMeshId: "durable-1" }));
		expect(await leader.tellWorker("worker-1", "go")).toBe(false);
	});

	test("a worker with no durable route returns false WITHOUT calling the mesh", async () => {
		const { leader } = makeHarness();
		const spy = { calls: 0 };
		leader.setMesh(meshWithReceipt({ phase: "delivered" }, spy) as any);
		leader.workers.set("worker-1", makeWorker({ routeState: "pending", durableMeshId: undefined }));
		expect(await leader.tellWorker("worker-1", "go")).toBe(false);
		expect(spy.calls).toBe(0);
	});

	test("tellAllWorkers counts only the workers whose tell was honestly delivered", async () => {
		const { leader } = makeHarness();
		const spy = { calls: 0 };
		// alive → delivered=true ; ghost → no route → false (mesh not called for it)
		leader.setMesh(meshWithReceipt({ phase: "delivered" }, spy) as any);
		leader.workers.set("alive", makeWorker({ name: "alive", routeState: "linked", durableMeshId: "durable-alive" }));
		leader.workers.set("ghost", makeWorker({ name: "ghost", routeState: "pending", durableMeshId: undefined }));
		expect(await leader.tellAllWorkers("go")).toBe(1);
	});
});

