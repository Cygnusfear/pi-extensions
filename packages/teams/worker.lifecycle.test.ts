import { afterEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

function makeFakePi() {
	const handlers = new Map<string, Array<(...args: any[]) => any>>();
	const execCalls: Array<{ cmd: string; args: string[]; opts?: unknown }> = [];
	const entries: Array<{ type: string; data?: unknown }> = [];
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
			appendEntry: (type: string, data?: unknown) => {
				entries.push({ type, data });
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

async function importRunWorker() {
	mock.module("@pi-extensions/pi-mesh/extension/pi-mesh.js", () => ({
		PiMesh: class {
			start() {}
			joinChannel() {}
			chat() {}
			tell() {}
			stop() {}
			self() { return { id: "mesh-self" }; }
		},
	}));
	const mod = await import(`./worker.ts?test=${Date.now()}-${Math.random()}`);
	return mod.runWorker;
}

const ORIGINAL_ENV = { ...process.env };

function setWorkerEnv(extra: Record<string, string | undefined> = {}) {
	process.env.PI_TEAMS_TICKET_ID = "tk-1";
	process.env.PI_TEAMS_WORKER_NAME = "worker-1";
	process.env.PI_TEAMS_WORKER_INSTANCE_ID = "inst-1";
	process.env.PI_TEAMS_GRACE_PERIOD_MS = "0";
	delete process.env.PI_TEAMS_CHANNEL_ID;
	delete process.env.PI_TEAMS_COORDINATOR_ID;
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
});

describe("teams worker lifecycle", () => {
	test("session_shutdown does not mutate ticket outcome", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi, { autoCloseOnAgentEnd: true, autoCloseOnSessionShutdown: true });

		await fake.emit("session_shutdown", {}, { cwd: "/tmp/repo" });

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		const close = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "close");
		expect(addNote).toBeUndefined();
		expect(close).toBeUndefined();
	});

	test("team_finish done writes DONE and closes ticket", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi, { autoCloseOnAgentEnd: true, autoCloseOnSessionShutdown: true });

		await fake.tools.get("team_finish").execute("id", { status: "done", summary: "all good" }, null, null, { cwd: "/tmp/repo" });

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		const close = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "close");
		expect(addNote?.args.at(-1)).toBe("DONE: all good");
		expect(close?.args[1]).toBe("tk-1");
	});

	test("team_finish quit writes QUIT and closes ticket", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi, { autoCloseOnAgentEnd: true, autoCloseOnSessionShutdown: true });

		await fake.tools.get("team_finish").execute("id", { status: "quit", summary: "blocked by missing data" }, null, null, { cwd: "/tmp/repo" });

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		const close = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "close");
		expect(addNote?.args.at(-1)).toBe("QUIT: blocked by missing data");
		expect(close?.args[1]).toBe("tk-1");
	});

	test("team_comment can post a file-backed markdown note", async () => {
		setWorkerEnv();
		const fake = makeFakePi();
		const runWorker = await importRunWorker();
		runWorker(fake.pi, { autoCloseOnAgentEnd: true, autoCloseOnSessionShutdown: true });

		const repoDir = fs.mkdtempSync(path.join(process.cwd(), "teams-worker-comment-"));
		const notePath = path.join(repoDir, "review.md");
		fs.writeFileSync(notePath, "# Review\n\n- keeps code fences safe\n", "utf-8");

		await fake.tools.get("team_comment").execute("id", { filePath: notePath }, null, null, { cwd: repoDir });

		const addNote = fake.execCalls.find((c) => path.basename(c.cmd) === "mai" && c.args[0] === "add-note");
		expect(addNote?.args).toEqual(["add-note", "tk-1", "--file", notePath]);
		fs.rmSync(repoDir, { recursive: true, force: true });
	});
});
