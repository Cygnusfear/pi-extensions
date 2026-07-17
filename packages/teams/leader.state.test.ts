import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { TeamLeader } from "./leader.ts";
import { TeamsSubscription, buildPredicate } from "./subscription.ts";
import type { WorkerHandle } from "./types.js";
import { createWorkerCommentEnvelope, createWorkerHelloEnvelope } from "./v2/mesh-adapter.ts";
import { SESSION_PHASE_EVENT_KIND, SESSION_PHASE_EVENT_VERSION } from "@pi-extensions/shared/session-phase-event";
import { unwrapInboundTell } from "@pi-extensions/pi-mesh/extension/tell-protocol.js";

// The mesh "message" event now delivers an already-unwrapped InboundMeshMessage
// (unwrap happens at the mesh source). Feed the leader handler what the mesh
// delivers: unwrapInboundTell(raw). This also exercises the full delivery path
// (wrapped mesh:tell -> mesh-unwrap -> handler binds) for the regression tests.
function deliver(leader: TeamLeader, raw: Parameters<typeof unwrapInboundTell>[0]) {
	return leader.meshMessageHandler(unwrapInboundTell(raw));
}

function makeWorker(overrides: Partial<WorkerHandle> = {}): WorkerHandle {
	const now = Date.now();
	return {
		workerId: "worker-1",
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
	const sent: Array<{ message: unknown; options: unknown }> = [];
	const entries: any[] = [{ type: "message", id: "assistant", message: { role: "assistant", content: [] } }, ...branch];
	const fakePi = {
		appendEntry: (customType: string, data: unknown) => {
			appended.push({ customType, data });
			entries.push({ type: "custom", customType, data });
		},
		sendMessage: (message: unknown, options: unknown) => sent.push({ message, options }),
	};
	const leader = new TeamLeader(fakePi as any);
	const leaderAny = leader as any;
	const ctx = {
		cwd: "/tmp/test-repo",
		ui: { setWidget: () => {} },
		sessionManager: {
			getSessionFile: () => "/tmp/leader-runtime-test.jsonl",
			getSessionId: () => "leader-runtime-session",
			getEntries: () => entries,
			getBranch: () => entries,
			getHeader: () => null,
		},
	};
	leader.restoreState(ctx as any);
	leaderAny.teamId = "team-1";
	leaderAny.ctx = ctx;
	return { leader: leaderAny, appended, sent };
}

describe("TeamLeader runtime and transport integration", () => {
	test("subscription wake sends exactly one host follow-up in the terminal dispatch pass", () => {
		const { leader, sent } = makeHarness();
		const worker = makeWorker({ name: "wake-worker", status: "done" });
		leader.workers.set(worker.name, worker);
		const { filter, predicate } = buildPredicate("wake-worker", "completed");
		new TeamsSubscription(leader, filter, predicate)
			.preventDefault()
			.wake((event) => `host wake: ${event.worker.name}`);

		leader.notifyLLM({ type: "completed", worker: { ...worker }, result: "done" });
		expect(sent).toEqual([{
			message: { customType: "team-event", content: "host wake: wake-worker", display: true },
			options: { deliverAs: "followUp", triggerTurn: true },
		}]);
	});

	test("terminal wake sends one host follow-up for every terminal outcome", () => {
		const { leader, sent } = makeHarness();
		const { filter, predicate } = buildPredicate({ type: "terminal" });
		const subscription = new TeamsSubscription(leader, filter, predicate)
			.each(() => {})
			.wake((event) => `${event.type}: ${event.worker.name}`);
		const events = [
			{ type: "completed", worker: makeWorker({ name: "done", status: "done" }), result: "done" },
			{ type: "warning", worker: makeWorker({ name: "quit", status: "warning" }), reason: "quit" },
			{ type: "failed", worker: makeWorker({ name: "crash", status: "failed" }), reason: "crash" },
			{ type: "turn_finished", worker: makeWorker({ name: "freeform", status: "done", freeform: true }), result: "finished" },
		] as any[];
		for (const event of events) leader.notifyLLM(event);
		expect(sent).toHaveLength(events.length);
		expect(sent.every((entry) => (entry.options as any).deliverAs === "followUp" && (entry.options as any).triggerTurn === true)).toBe(true);
		expect(sent.map((entry) => (entry.message as any).content)).toEqual([
			"completed: done",
			"warning: quit",
			"failed: crash",
			"turn_finished: freeform",
		]);
		subscription.unsubscribe();
	});

	test("mesh message handler wires once and is removed on stopPolling", () => {
		const { leader } = makeHarness();
		const listeners = {
			message: new Set<Function>(),
		};
		const mesh = {
			on: (event: "message", cb: Function) => listeners[event].add(cb),
			off: (event: "message", cb: Function) => listeners[event].delete(cb),
			stop: () => {},
			peers: () => [],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			tellAndWaitForReceipt: async () => ({ phase: "delivered" }),
			ask: async () => ({}),
		};
		leader.setMesh(mesh as any);
		leader.wireMeshMessageEvents();
		expect(listeners.message.size).toBe(1);
		leader.stopPolling();
		expect(listeners.message.size).toBe(0);
	});

	test("mesh direct message handler accepts v2 worker comment envelopes", () => {
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
			peers: () => [{ id: "route-1", meshId: "durable-1", nickname: "Worker Nova" }],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			ask: async () => ({}),
		};
		leader.setMesh(mesh as any);

		deliver(leader, {
			from: "route-1",
			payload: createWorkerCommentEnvelope({
				teamId: "team-1",
				leaderEpoch: "epoch-1",
				workerId: "worker-1",
				attemptId: "attempt-1",
				seq: 1,
				text: "hello over direct tell",
				meshId: "durable-1",
			}),
		});

		expect(notified).toHaveLength(1);
		expect(notified[0]).toMatchObject({ type: "comment", comment: "hello over direct tell" });
		expect(leader.getWorker("worker-1")?.durableMeshId).toBe("durable-1");
	});

	test("mesh direct message handler accepts v2 worker hello envelopes", () => {
		const { leader } = makeHarness();
		leader.renderWidget = () => {};
		leader.workers.set("worker-1", makeWorker({ workerInstanceId: "attempt-1" }));
		const mesh = {
			on: () => {},
			off: () => {},
			stop: () => {},
			peers: () => [{ id: "route-1", meshId: "durable-1", nickname: "Worker Nova" }],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			ask: async () => ({}),
		};
		leader.setMesh(mesh as any);

		deliver(leader, {
			from: "route-1",
			payload: createWorkerHelloEnvelope({
				teamId: "team-1",
				leaderEpoch: "epoch-1",
				workerId: "worker-1",
				attemptId: "attempt-1",
				seq: 1,
				meshId: "durable-1",
				runtime: {
					protocolVersion: 1,
					teamId: "team-1",
					leaderEpoch: "epoch-1",
					workerId: "worker-1",
					attemptId: "attempt-1",
					coordinatorSessionId: "coord-1",
					leasePath: "/tmp/lease.json",
					sessionMode: { kind: "fresh" },
				},
			}),
		});

		expect(leader.getWorker("worker-1")?.routeState).toBe("linked");
		expect(leader.getWorker("worker-1")?.durableMeshId).toBe("durable-1");
	});

	test("duplicate direct payloads are processed once", () => {
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
			peers: () => [],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			ask: async () => ({}),
		};
		leader.setMesh(mesh as any);
		const envelope = createWorkerCommentEnvelope({
			teamId: "team-1",
			leaderEpoch: "epoch-1",
			workerId: "worker-1",
			attemptId: "attempt-1",
			seq: 99,
			text: "same payload",
			meshId: "durable-1",
		});

		deliver(leader, { from: "route-1", payload: envelope });
		deliver(leader, { from: "route-1", payload: envelope });

		expect(notified).toHaveLength(1);
		expect(notified[0]).toMatchObject({ type: "comment", comment: "same payload" });
	});


	test("mesh direct message handler turns status() phase events into teams.on PollEvents", () => {
		const { leader } = makeHarness();
		const observed: any[] = [];
		leader.notifyLLM = (event: any) => observed.push(event);
		leader.renderWidget = () => {};
		leader.workers.set("worker-1", makeWorker({ workerInstanceId: "attempt-1" }));
		const mesh = {
			on: () => {},
			off: () => {},
			stop: () => {},
			peers: () => [{ id: "route-1", meshId: "durable-1", nickname: "Worker Nova" }],
			self: () => ({ id: "mesh-self" }),
			tell: () => {},
			ask: async () => ({}),
		};
		leader.setMesh(mesh as any);

		deliver(leader, {
			from: "route-1",
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
		});

		expect(observed).toHaveLength(1);
		expect(observed[0]).toMatchObject({ type: "phase", phase: { payload: { stage: "implementing" } } });
		expect(leader.getWorker("worker-1")?.durableMeshId).toBe("durable-1");
	});

	// ── Regression: LIVE worker→leader tells arrive WRAPPED in a mesh:tell envelope ──
	// (PiMesh.tell / publishSessionPhaseEvent publish via mesh.tell), NOT as the bare
	// envelope the tests above feed. Pre-fix, meshMessageHandler classified the mesh:tell
	// WRAPPER and dropped the inner envelope → route never bound (identity "…", status
	// stuck "spawning"). These feed the wrapped LIVE shape: they FAIL on pre-fix code
	// (drop) and PASS on the unwrap fix — closing the mock-shape blind spot that hid this
	// for the whole v1d cycle. Bare-envelope tests above pass either way (idempotent unwrap).
	test("mesh handler unwraps a mesh:tell-WRAPPED worker hello (live shape) and binds the route", () => {
		const { leader } = makeHarness();
		leader.renderWidget = () => {};
		leader.workers.set("worker-1", makeWorker({ workerInstanceId: "attempt-1" }));
		const mesh = {
			on: () => {}, off: () => {}, stop: () => {},
			peers: () => [{ id: "route-1", meshId: "durable-1", nickname: "Worker Nova" }],
			self: () => ({ id: "mesh-self" }), tell: () => {}, ask: async () => ({}),
		};
		leader.setMesh(mesh as any);

		const hello = createWorkerHelloEnvelope({
			teamId: "team-1", leaderEpoch: "epoch-1", workerId: "worker-1", attemptId: "attempt-1",
			seq: 1, meshId: "durable-1",
			runtime: {
				protocolVersion: 1, teamId: "team-1", leaderEpoch: "epoch-1", workerId: "worker-1",
				attemptId: "attempt-1", coordinatorSessionId: "coord-1", leasePath: "/tmp/lease.json",
				sessionMode: { kind: "fresh" },
			},
		});

		// LIVE shape: payload IS the mesh:tell envelope whose inner payload is the hello.
		deliver(leader, {
			from: "route-1",
			topic: "session/mesh-self",
			timestamp: Date.now(),
			payload: { kind: "mesh:tell", deliveryId: "d-hello-1", from: "durable-1", payload: hello, timestamp: Date.now() },
		});

		expect(leader.getWorker("worker-1")?.routeState).toBe("linked");
		expect(leader.getWorker("worker-1")?.durableMeshId).toBe("durable-1");
	});

	test("mesh handler unwraps a mesh:tell-WRAPPED status() phase event (live shape)", () => {
		const { leader } = makeHarness();
		const observed: any[] = [];
		leader.notifyLLM = (event: any) => observed.push(event);
		leader.renderWidget = () => {};
		leader.workers.set("worker-1", makeWorker({ workerInstanceId: "attempt-1" }));
		const mesh = {
			on: () => {}, off: () => {}, stop: () => {},
			peers: () => [{ id: "route-1", meshId: "durable-1", nickname: "Worker Nova" }],
			self: () => ({ id: "mesh-self" }), tell: () => {}, ask: async () => ({}),
		};
		leader.setMesh(mesh as any);

		const phase = {
			kind: SESSION_PHASE_EVENT_KIND, version: SESSION_PHASE_EVENT_VERSION, from: "worker", to: "leader",
			teamId: "team-1", leaderEpoch: leader.leaderEpoch, workerId: "worker-1", attemptId: "attempt-1",
			seq: 1, sentAt: Date.now(), meshId: "durable-1",
			payload: { stage: "implementing", label: "implementing", icon: "🏭", color: "amber", sessionId: "sess-1" },
		};

		deliver(leader, {
			from: "route-1",
			topic: "session/mesh-self",
			timestamp: Date.now(),
			payload: { kind: "mesh:tell", deliveryId: "d-phase-1", from: "durable-1", payload: phase, timestamp: Date.now() },
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


});

describe("tellWorker honest delivery receipt (v1d — Cecilia bug 1)", () => {
	function meshWithReceipt(receipt: { phase: string } | Error, spy: { calls: number }) {
		return {
			on: () => {},
			off: () => {},
			stop: () => {},
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
