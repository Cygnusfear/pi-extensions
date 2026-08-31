import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

function makeFakePi() {
	const handlers = new Map<string, Array<(...args: any[]) => any>>();
	const execCalls: Array<{ cmd: string; args: string[]; opts?: unknown }> = [];
	const entries: Array<{ type: string; customType?: string; data?: unknown; message?: unknown }> = [
		{ type: "message", message: { role: "assistant", content: [] } },
	];
	const tools = new Map<string, any>();

	return {
		handlers,
		execCalls,
		entries,
		tools,
		pi: {
			on: (event: string, cb: (...args: any[]) => any) => {
				const list = handlers.get(event) ?? [];
				list.push(cb);
				handlers.set(event, list);
			},
			appendEntry: (customType: string, data?: unknown) => {
				entries.push({ type: "custom", customType, data });
			},
			exec: async (cmd: string, args: string[], opts?: unknown) => {
				execCalls.push({ cmd, args, opts });
				return { code: 0, stdout: "", stderr: "" };
			},
			registerTool: (tool: any) => { tools.set(tool.name, tool); },
		} as any,
		emit: async (event: string, ...args: any[]) => {
			for (const cb of handlers.get(event) ?? []) {
				await cb(...args);
			}
			await Bun.sleep(0);
		},
	};
}

function makeCtx(cwd: string, options: { sessionFile?: string; assistant?: boolean } = {}) {
	return {
		cwd,
		sessionManager: {
			getEntries: () => options.assistant === false ? [] : [{ type: "message", message: { role: "assistant", content: [] } }],
			getSessionFile: () => options.sessionFile === undefined ? "/tmp/worker-session.jsonl" : options.sessionFile || undefined,
		},
	};
}

function installAckingMesh(tells: Array<{ id: string; payload: any }> = []) {
	let onMessage: ((inbound: { message: { from: string; payload: unknown } }) => void) | undefined;
	(globalThis as any).__piMesh = {
		getIdentity: () => ({ id: "worker-durable-1" }),
		on: (event: string, callback: typeof onMessage) => { if (event === "message") onMessage = callback; },
		tell: (id: string, payload: any) => { tells.push({ id, payload }); },
		tellAndWaitForReceipt: async (id: string, payload: any) => {
			tells.push({ id, payload });
			if (payload.type === "worker.finish") {
				onMessage?.({ message: { from: "coordinator-mesh-1", payload: {
					version: 1, teamId: payload.teamId, leaderEpoch: payload.leaderEpoch,
					workerId: payload.workerId, attemptId: payload.attemptId, from: "leader", to: "worker",
					seq: 1, type: "leader.ack", sentAt: Date.now(), correlationId: payload.payload.eventId, payload: { eventId: payload.payload.eventId, phase: "persisted" },
				} } });
			}
			return { phase: "delivered" };
		},
	};
}

async function importRunWorker() {
	const mod = await import(`./worker.ts?test=${Date.now()}-${Math.random()}`);
	return mod.runWorker;
}

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_MESH = (globalThis as { __piMesh?: unknown }).__piMesh;

function setWorkerEnv(extra: Record<string, string | undefined> = {}) {
	installAckingMesh();
	process.env.PI_TEAMS_TICKET_ID = "tk-1";
	process.env.PI_TEAMS_WORKER_NAME = "worker-1";
	process.env.PI_TEAMS_WORKER_ID = "worker-id-1";
	process.env.PI_TEAMS_WORKER_INSTANCE_ID = "inst-1";
	process.env.PI_TEAMS_TEAM_ID = "team-1";
	process.env.PI_TEAMS_COORDINATOR_SESSION_ID = "coordinator-session-1";
	process.env.PI_TEAMS_COORDINATOR_ID = "coordinator-mesh-1";
	process.env.PI_TEAMS_GRACE_PERIOD_MS = "0";
	for (const [k, v] of Object.entries(extra)) {
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
}

afterEach(() => {
	for (const key of Object.keys(process.env)) {
		if (!(key in ORIGINAL_ENV)) delete process.env[key];
	}
	for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
	if (ORIGINAL_MESH === undefined) delete (globalThis as { __piMesh?: unknown }).__piMesh;
	else (globalThis as { __piMesh?: unknown }).__piMesh = ORIGINAL_MESH;
});

describe("teams worker lifecycle", () => {
	test("session_shutdown does not mutate ticket outcome", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);

		await fake.emit("session_shutdown", {}, makeCtx("/tmp/repo"));

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		const close = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "close");
		expect(addNote).toBeUndefined();
		expect(close).toBeUndefined();
	});

	test("team_finish done writes DONE note and does NOT close the ticket (coordinator owns close — Cecilia fold)", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);
		await fake.emit("session_start", {}, makeCtx("/tmp/repo"));

		await fake.tools.get("team_finish").execute("id", { status: "done", summary: "all good" }, null, null, makeCtx("/tmp/repo"));

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		const close = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "close");
		expect(addNote?.args.at(-1)).toBe("DONE: all good");
		expect(close).toBeUndefined();
	});

	test("team_finish quit writes QUIT note and does NOT close the ticket (coordinator owns close — Cecilia fold)", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);
		await fake.emit("session_start", {}, makeCtx("/tmp/repo"));

		await fake.tools.get("team_finish").execute("id", { status: "quit", summary: "blocked by missing data" }, null, null, makeCtx("/tmp/repo"));

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		const close = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "close");
		expect(addNote?.args.at(-1)).toBe("QUIT: blocked by missing data");
		expect(close).toBeUndefined();
	});

	test("team_finish fails closed before a worker session is persisted and flushed", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);

		await expect(fake.tools.get("team_finish").execute(
			"id", { status: "done", summary: "must not escape" }, null, null,
			makeCtx("/tmp/repo", { sessionFile: "", assistant: true }),
		)).rejects.toThrow("persisted worker Pi session");
		await expect(fake.tools.get("team_finish").execute(
			"id", { status: "done", summary: "must not escape" }, null, null,
			makeCtx("/tmp/repo", { assistant: false }),
		)).rejects.toThrow("assistant message");
		expect(fake.entries.some((entry) => entry.customType === "teams-worker-finish-pending-v1")).toBeFalse();
	});

	test("team_finish retries only the exact declaration already pending in the worker session", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);
		const ctx = {
			cwd: "/tmp/repo",
			sessionManager: {
				getEntries: () => fake.entries,
				getSessionFile: () => "/tmp/worker-session.jsonl",
			},
		};

		await expect(fake.tools.get("team_finish").execute(
			"id", { status: "done", summary: "original" }, null, null, ctx,
		)).rejects.toThrow("coordinator route is unavailable");
		await expect(fake.tools.get("team_finish").execute(
			"id", { status: "quit", summary: "replacement" }, null, null, ctx,
		)).rejects.toThrow("conflicts with the declaration already pending");
		expect(fake.entries.filter((entry) => entry.customType === "teams-worker-finish-pending-v1")).toHaveLength(1);
	});

	test("mai note runs in the worker's OWN cwd, not the leader ticketCwd (Cecilia bug 4)", async () => {
		// Leader launched from a NON-repo dir → PI_TEAMS_TICKET_CWD is not a git repo.
		setWorkerEnv({ PI_TEAMS_TICKET_CWD: "/leader/not-a-git-repo" });
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);
		await fake.emit("session_start", {}, makeCtx("/worker/own/repo"));

		// team_finish note
		await fake.tools.get("team_finish").execute("id", { status: "done", summary: "ok" }, null, null, makeCtx("/worker/own/repo"));
		const finishNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		expect((finishNote?.opts as { cwd?: string })?.cwd).toBe("/worker/own/repo");

		// team_comment note (inline)
		await fake.tools.get("team_comment").execute("id", { message: "progress" }, null, null, makeCtx("/worker/own/repo"));
		const commentNote = fake.execCalls.filter((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note").at(-1);
		expect((commentNote?.opts as { cwd?: string })?.cwd).toBe("/worker/own/repo");
	});

	test("team_comment can post a file-backed markdown note", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);

		const repoDir = fs.mkdtempSync(path.join(process.cwd(), "teams-worker-comment-"));
		const notePath = path.join(repoDir, "review.md");
		fs.writeFileSync(notePath, "# Review\n\n- keeps code fences safe\n", "utf-8");

		await fake.tools.get("team_comment").execute("id", { filePath: notePath }, null, null, { cwd: repoDir });

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		expect(addNote?.args).toEqual(["add-note", "tk-1", "--file", notePath]);
		fs.rmSync(repoDir, { recursive: true, force: true });
	});

	test("team_comment sends only ordinary durable mesh tells", async () => {
		setWorkerEnv({
			PI_TEAMS_COORDINATOR_ID: "coord-durable-1",
			PI_TEAMS_TEAM_ID: "team-1",
			PI_TEAMS_LEADER_EPOCH: "epoch-1",
		});
		const tells: Array<{ id: string; payload: any }> = [];
		(globalThis as any).__piMesh = {
			getIdentity: () => ({ id: "worker-durable-1" }),
			on: () => {},
			tell: (id: string, payload: any) => tells.push({ id, payload }),
			tellAndWaitForReceipt: async () => ({ phase: "delivered" }),
		};
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi);

		await fake.emit("session_start", {}, makeCtx("/worker/own/repo"));
		await fake.tools.get("team_comment").execute("id", { message: "progress over ordinary mesh" }, null, null, makeCtx("/worker/own/repo"));

		expect(tells.map((m) => [m.id, m.payload.type])).toEqual([
			["coord-durable-1", "worker.hello"],
			["coord-durable-1", "worker.comment"],
		]);
		expect(tells[0]?.payload.meshId).toBe("worker-durable-1");
		expect(tells[1]?.payload.meshId).toBe("worker-durable-1");
	});
});
