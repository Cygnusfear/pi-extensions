import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TeamLeader } from "./leader.ts";
import {
	commitActivationLease,
	readActivationLease,
	releaseActivationLease,
	tryAcquireActivationLease,
} from "./lease.ts";
import { LIFECYCLE_FACT_ENTRY_TYPE } from "./v2/session-facts.ts";
import type { LifecycleFact } from "./v2/state.ts";
import type { WorkerHandle } from "./types.ts";

const cleanupDirs: string[] = [];
const cleanupPids: number[] = [];

function tempDir(): string {
	const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-leader-adopt-")));
	cleanupDirs.push(dir);
	return dir;
}

function writeSession(baseDir: string, id: string): { cwd: string; file: string; original: string } {
	const cwd = path.join(baseDir, "source-workspace");
	fs.mkdirSync(cwd, { recursive: true });
	const file = path.join(baseDir, `${id}.jsonl`);
	const original = [
		JSON.stringify({ type: "session", version: 3, id, timestamp: new Date().toISOString(), cwd }),
		JSON.stringify({ type: "model_change", id: "model", parentId: null, timestamp: new Date().toISOString(), provider: "anthropic", modelId: "claude-opus-4-8" }),
		JSON.stringify({ type: "custom", customType: "mesh_identity", data: { id: `mesh-${id}`, nickname: "Durable Source" }, id: "mesh", parentId: "model", timestamp: new Date().toISOString() }),
		JSON.stringify({ type: "message", id: "answer", parentId: "mesh", timestamp: new Date().toISOString(), message: { role: "assistant", content: [{ type: "text", text: "existing durable context that must remain in this exact file" }], stopReason: "stop" } }),
	].join("\n") + "\n";
	fs.writeFileSync(file, original);
	return { cwd, file, original };
}

function makeFakePi(binDir: string, invocationLog: string): void {
	fs.mkdirSync(binDir, { recursive: true });
	fs.writeFileSync(
		path.join(binDir, "pi"),
		`#!/bin/sh\n{\n  printf 'BEGIN\\n'\n  printf 'cwd=%s\\n' "$PWD"\n  printf 'mode=%s\\n' "$PI_TEAMS_SESSION_MODE"\n  for arg in "$@"; do printf 'arg=%s\\n' "$arg"; done\n  printf 'END\\n'\n} >> ${JSON.stringify(invocationLog)}\nexit 0\n`,
		{ mode: 0o755 },
	);
}

function makeLeader(baseDir: string, entries: Array<Record<string, unknown>>) {
	const coordinatorFile = path.join(baseDir, "coordinator.jsonl");
	if (!fs.existsSync(coordinatorFile)) {
		fs.writeFileSync(coordinatorFile, `${JSON.stringify({ type: "session", version: 3, id: "coordinator", timestamp: new Date().toISOString(), cwd: baseDir })}\n`);
	}
	const fakePi = {
		appendEntry: (customType: string, data: unknown) => {
			entries.push({ type: "custom", customType, data });
		},
		exec: async (command: string, args: string[]) => {
			if (path.basename(command) !== "mai") throw new Error(`Unexpected command: ${command}`);
			if (args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "open", comments: [] }), code: 0 };
			}
			return { stdout: "", code: 0 };
		},
		sendMessage: () => {},
	};
	const leader = new TeamLeader(fakePi as never);
	const runtime = leader as unknown as {
		restoreState: (ctx: unknown) => void;
		startActivityMonitor: () => void;
		renderWidget: () => void;
		scheduleWorkerCleanup: () => void;
		rearmPersistentLifecycle: () => void;
		notifyLLM: () => void;
		workers: Map<string, { status: string; routeState: string; pid: number; spawnConfig?: { cwd: string; sessionMode?: { kind: string; sessionFile?: string }; model?: string }; worktreePath: string | null }>;
		childProcesses: Map<string, { pid?: number; removeAllListeners: () => void }>;
		adoptSession: TeamLeader["adoptSession"];
		tellWorker: TeamLeader["tellWorker"];
		stopPolling: () => void;
		buildWorkerResumeEnv: (worker: WorkerHandle) => Record<string, string>;
	};
	runtime.startActivityMonitor = () => {};
	runtime.renderWidget = () => {};
	runtime.scheduleWorkerCleanup = () => {};
	runtime.rearmPersistentLifecycle = () => {};
	runtime.notifyLLM = () => {};
	const ctx = {
		cwd: baseDir,
		ui: { setWidget: () => {} },
		modelRegistry: { getAvailable: () => [], getAll: () => [] },
		sessionManager: {
			getSessionFile: () => coordinatorFile,
			getSessionId: () => "coordinator",
			getEntries: () => entries,
			getBranch: () => entries,
			getHeader: () => ({ type: "session", version: 3, id: "coordinator", timestamp: new Date().toISOString(), cwd: baseDir }),
		},
	};
	runtime.restoreState(ctx);
	return runtime;
}

function useFakePi(runtime: ReturnType<typeof makeLeader>, binDir: string): void {
	const buildWorkerResumeEnv = runtime.buildWorkerResumeEnv.bind(runtime);
	runtime.buildWorkerResumeEnv = (worker) => ({
		...buildWorkerResumeEnv(worker),
		PATH: `${binDir}:${process.env.PATH ?? ""}`,
	});
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
	const deadline = Date.now() + 5_000;
	while (Date.now() < deadline) {
		if (predicate()) return;
		await Bun.sleep(20);
	}
	throw new Error(`Timed out waiting for ${label}`);
}

afterEach(() => {
	for (const pid of cleanupPids.splice(0)) {
		try { process.kill(-pid, "SIGKILL"); } catch {}
		try { process.kill(pid, "SIGKILL"); } catch {}
	}
	for (const dir of cleanupDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("TeamLeader durable-session adoption", () => {
	test("activates the exact JSONL in its stored cwd, preserves model behavior, survives leader restore, and resumes through tell", async () => {
		const baseDir = tempDir();
		const source = writeSession(baseDir, "source-session");
		const invocationLog = path.join(baseDir, "invocations.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePi(binDir, invocationLog);
		const entries: Array<Record<string, unknown>> = [{ type: "message", id: "assistant", message: { role: "assistant", content: [] } }];
		let first: ReturnType<typeof makeLeader> | undefined;
		let restored: ReturnType<typeof makeLeader> | undefined;
		try {
			first = makeLeader(baseDir, entries);
			useFakePi(first, binDir);
			const handle = await first.adoptSession(
				"pe-adopt",
				"durable",
				{ kind: "file", path: source.file },
				"continue the existing work",
				undefined,
				true,
			);
			if (handle.pid > 0) cleanupPids.push(handle.pid);
			expect(handle.worktreePath).toBeNull();
			expect(handle.spawnConfig?.cwd).toBe(source.cwd);
			expect(handle.spawnConfig?.model).toBeUndefined();
			expect(handle.spawnConfig?.sessionMode).toEqual({ kind: "adopt", sessionFile: source.file, sessionId: "source-session" });
			expect(fs.existsSync(path.join(path.dirname(source.file), "revive-descriptor.json"))).toBe(false);
			expect(fs.existsSync(path.join(handle.sessionDir, "revive-descriptor.json"))).toBe(true);

			await waitFor(() => first?.workers.get("durable")?.routeState === "resumable", "first adopted attempt to become resumable");
			expect(fs.readFileSync(source.file, "utf8")).toBe(source.original);
			const facts = entries
				.filter((entry) => entry.type === "custom" && entry.customType === LIFECYCLE_FACT_ENTRY_TYPE)
				.map((entry) => entry.data as LifecycleFact);
			const spawn = facts.find((fact) => fact.kind === "spawn_requested");
			const started = facts.find((fact) => fact.kind === "process_started");
			expect(spawn).toBeDefined();
			expect(started).toBeDefined();
			expect(facts.indexOf(spawn!)).toBeLessThan(facts.indexOf(started!));
			expect(spawn?.payload).toMatchObject({
				executionCwd: source.cwd,
				workerSessionFile: source.file,
				worktreePath: null,
				sessionMode: { kind: "adopt", sessionFile: source.file, sessionId: "source-session" },
			});

			first.stopPolling();
			restored = makeLeader(baseDir, entries);
			useFakePi(restored, binDir);
			await waitFor(() => restored?.workers.has("durable") === true, "restored adopted relationship");
			const projected = restored.workers.get("durable");
			expect(projected?.routeState).toBe("resumable");
			expect(projected?.spawnConfig?.cwd).toBe(source.cwd);
			expect(await restored.tellWorker("durable", "another turn")).toBe(true);
			const resumed = restored.workers.get("durable");
			if (resumed && resumed.pid > 0) cleanupPids.push(resumed.pid);
			await waitFor(() => (fs.readFileSync(invocationLog, "utf8").match(/BEGIN/g) ?? []).length === 2, "second exact-session invocation");
			await waitFor(() => restored?.workers.get("durable")?.routeState === "resumable", "second adopted attempt to become resumable");

			const log = fs.readFileSync(invocationLog, "utf8");
			const invocations = log.split("BEGIN\n").slice(1);
			expect(invocations).toHaveLength(2);
			for (const invocation of invocations) {
				expect(invocation).toContain(`cwd=${source.cwd}\n`);
				expect(invocation).toContain(`arg=${source.file}\n`);
				expect(invocation).not.toContain("arg=--model\n");
			}
			expect(invocations[0]).toContain('mode={"kind":"adopt"');
			expect(invocations[1]).toContain('mode={"kind":"resume"');
		} finally {
			first?.stopPolling();
			restored?.stopPolling();
		}
	});

	test("rejects a live activation lease before recording adoption intent", async () => {
		const baseDir = tempDir();
		const source = writeSession(baseDir, "leased-session");
		const lease = tryAcquireActivationLease(source.file);
		expect(lease.acquired).toBe(true);
		commitActivationLease(source.file, lease.epoch!, process.pid);
		const entries: Array<Record<string, unknown>> = [{ type: "message", id: "assistant", message: { role: "assistant", content: [] } }];
		const leader = makeLeader(baseDir, entries);
		try {
			await expect(leader.adoptSession("pe-adopt", "leased", { kind: "file", path: source.file }, "continue"))
				.rejects.toThrow("live activation lease");
			const adoptionFacts = entries.filter((entry) => entry.type === "custom" && entry.customType === LIFECYCLE_FACT_ENTRY_TYPE);
			expect(adoptionFacts).toHaveLength(0);
		} finally {
			leader.stopPolling();
			const current = readActivationLease(source.file);
			if (current) releaseActivationLease(source.file, current.epoch);
		}
	});
});
