import { afterEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TeamLeader, getRecoverableToolRetry } from "./leader.ts";
import type { SpawnConfig, WorkerHandle } from "./types.js";

const cleanupDirs: string[] = [];
const cleanupPids: number[] = [];

function makeTempDir(prefix: string): string {
	const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
	cleanupDirs.push(dir);
	return dir;
}

function writeWorkerSession(sessionDir: string, errorMessage: string, assistantText: string) {
	const sessionFile = path.join(sessionDir, "worker.jsonl");
	const entries = [
		{ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() },
		{
			type: "message",
			timestamp: new Date().toISOString(),
			message: {
				role: "assistant",
				content: [{ type: "text", text: assistantText }],
				stopReason: "error",
				errorMessage,
			},
		},
	];
	fs.writeFileSync(sessionFile, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
	fs.writeFileSync(path.join(sessionDir, "stderr.log"), `${errorMessage}\n`, "utf-8");
	fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");
	return sessionFile;
}

function makeFakePiBinary(binDir: string, invocationLog: string) {
	const scriptPath = path.join(binDir, "pi");
	fs.mkdirSync(binDir, { recursive: true });
	fs.writeFileSync(
		scriptPath,
		`#!/bin/sh\nprintf '%s\\n' \"$@\" >> ${JSON.stringify(invocationLog)}\nsleep 30\n`,
		{ mode: 0o755 },
	);
	return scriptPath;
}

function makeLeaderHarness(baseDir: string) {
	const maiNoteLog = path.join(baseDir, "mai-notes.log");
	const sendMessageLog = path.join(baseDir, "send-message.log");
	const fakePi = {
		exec: async (cmd: string, args: string[]) => {
			if (cmd !== "mai") throw new Error(`unexpected command: ${cmd}`);
			if (args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "open", comments: [] }) };
			}
			if (args[0] === "add-note") {
				fs.appendFileSync(maiNoteLog, `${args[1]} :: ${args.slice(2).join(" ")}\n`);
				return { stdout: "" };
			}
			if (args[0] === "close") {
				return { stdout: "" };
			}
			return { stdout: "" };
		},
		sendMessage: (...args: unknown[]) => {
			try {
				fs.mkdirSync(path.dirname(sendMessageLog), { recursive: true });
				fs.appendFileSync(sendMessageLog, `${JSON.stringify(args)}\n`);
			} catch {}
		},
	};

	const leader = new TeamLeader(fakePi as any);
	const leaderAny = leader as any;
	leaderAny.unwatchWorker = () => {};
	leaderAny.startActivityMonitor = () => {};
	leaderAny.renderWidget = () => {};
	leaderAny.scheduleWorkerCleanup = () => {};
	leaderAny.notifyLLM = () => {};
	leaderAny.notifiedTerminal = new Set();
	leaderAny.ctx = {
		cwd: "/tmp/test-repo",
		sessionManager: { getSessionFile: () => path.join(baseDir, "leader-session.jsonl") },
		ui: { setWidget: () => {} },
	};

	return { leader: leaderAny, maiNoteLog, sendMessageLog };
}

async function waitForFile(pathname: string, timeoutMs = 2000): Promise<string> {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (fs.existsSync(pathname)) {
			return fs.readFileSync(pathname, "utf-8");
		}
		await Bun.sleep(25);
	}
	throw new Error(`Timed out waiting for ${pathname}`);
}

afterEach(() => {
	for (const pid of cleanupPids.splice(0)) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {}
	}
	for (const dir of cleanupDirs.splice(0)) {
		try {
			fs.rmSync(dir, { recursive: true, force: true });
		} catch {}
	}
});

describe("getRecoverableToolRetry", () => {
	test("matches malformed JSON tool-call errors and includes escape guidance", () => {
		const recovery = getRecoverableToolRetry(
			"\n  error: Bad escaped character in JSON at position 111 (line 1 column 112)\n  last assistant: stopReason: error | error: Bad escaped character in JSON at position 111 (line 1 column 112)",
		);

		expect(recovery).not.toBeNull();
		expect(recovery?.error).toContain("Bad escaped character in JSON");
		expect(recovery?.prompt).toContain("\\\\x1b");
		expect(recovery?.prompt).toContain("execute_code");
	});

	test("ignores unrelated provider errors", () => {
		const recovery = getRecoverableToolRetry("\n  error: rate limit exceeded");
		expect(recovery).toBeNull();
	});
});

describe("TeamLeader malformed tool JSON recovery", () => {
	test("retries once by resuming the worker session with escape guidance", async () => {
		const baseDir = makeTempDir("teams-retry-test-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = writeWorkerSession(
			sessionDir,
			"Bad escaped character in JSON at position 111 (line 1 column 112)",
			"Step 3: malformed hash_edit call",
		);

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader, maiNoteLog, sendMessageLog } = makeLeaderHarness(baseDir);
			const worker: WorkerHandle = {
				workerInstanceId: "worker-1",
				name: "retry-worker",
				pid: process.pid,
				ticketId: "tk-1",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile,
				worktreePath: baseDir,
				model: "anthropic/claude-sonnet-4-6",
				hasTools: false,
				status: "running",
				spawnedAt: Date.now() - 1000,
				lastActivityAt: Date.now() - 1000,
				lastProcessActivityAt: Date.now() - 1000,
				hasActiveChildProcess: false,
				activeChildProcessCount: 0,
				lastSeenCommentCount: 0,
				routeState: "linked",
			};

			await leader.handleWorkerExit("retry-worker", worker, 1);

			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.status).toBe("running");
			expect(worker.routeState).toBe("pending");
			expect(worker.lastNote).toContain("AUTO-RETRY");

			const piArgs = await waitForFile(invocationLog);

			const child = leader.childProcesses.get("retry-worker");
			expect(child).toBeDefined();
			if (child) {
				child.removeAllListeners();
				if (child.pid) { try { process.kill(child.pid, "SIGKILL"); } catch {} }
				cleanupPids.push(child.pid);
			}
			expect(piArgs).toContain("--session");
			expect(piArgs).toContain(sessionFile);
			expect(piArgs).toContain("Bad escaped character in JSON");
			expect(piArgs).toContain("every literal backslash must be escaped");

			const noteLog = fs.readFileSync(maiNoteLog, "utf-8");
			expect(noteLog).toContain("AUTO-RETRY");
			expect(noteLog).toContain("Bad escaped character in JSON");

			const sent = fs.readFileSync(sendMessageLog, "utf-8");
			expect(sent).toContain("auto-retrying once after malformed tool JSON");
		} finally {
			process.env.PATH = originalPath;
		}
	});
});

describe("TeamLeader startup-death respawn", () => {
	test("respawns once when worker dies before creating a session file", async () => {
		const baseDir = makeTempDir("teams-startup-death-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		// Only stderr/stdout logs, NO .jsonl — simulates startup death
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "[core-edit-ui] Loaded\n", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader, maiNoteLog, sendMessageLog } = makeLeaderHarness(baseDir);

			const spawnConfig: SpawnConfig = {
				workerInstanceId: "w-orig",
				ticketId: "tk-startup",
				workerName: "startup-worker",
				useWorktree: false,
				cwd: "/tmp/test-repo",
				repoRoot: "/tmp/test-repo",
				leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
				model: "openai-codex/gpt-5.4",
				hasTools: false,
				additionalPrompt: "do stuff",
				channelId: undefined,
				coordinatorMeshId: undefined,
				freeform: false,
			};

			const worker: WorkerHandle = {
				workerInstanceId: "w-orig",
				name: "startup-worker",
				pid: process.pid,
				ticketId: "tk-startup",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile: path.join(sessionDir, "session.jsonl"),
				worktreePath: null,
				model: "openai-codex/gpt-5.4",
				hasTools: false,
				status: "running",
				spawnedAt: Date.now() - 900, // < 5s ago
				lastActivityAt: Date.now() - 900,
				lastProcessActivityAt: Date.now() - 900,
				hasActiveChildProcess: false,
				activeChildProcessCount: 0,
				lastSeenCommentCount: 0,
				routeState: "linked",
				spawnConfig,
			};

			await leader.handleWorkerExit("startup-worker", worker, 0);

			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.status).toBe("spawning");
			expect(worker.routeState).toBe("pending");
			expect(worker.lastNote).toContain("AUTO-RESPAWN");

			// The new session dir should differ from the original
			expect(worker.sessionDir).not.toBe(sessionDir);

			const piArgs = await waitForFile(invocationLog);

			const child = leader.childProcesses.get("startup-worker");
			expect(child).toBeDefined();
			if (child) {
				child.removeAllListeners();
				if (child.pid) { try { process.kill(child.pid, "SIGKILL"); } catch {} }
				cleanupPids.push(child.pid);
			}
			expect(piArgs).toContain("--non-interactive");
			expect(piArgs).toContain("--session-dir");
			expect(piArgs).toContain("--model");
			expect(piArgs).toContain("openai-codex/gpt-5.4");

			const noteLog = fs.readFileSync(maiNoteLog, "utf-8");
			expect(noteLog).toContain("AUTO-RESPAWN");
			expect(noteLog).toContain("before creating a session file");

			const sent = fs.readFileSync(sendMessageLog, "utf-8");
			expect(sent).toContain("auto-respawning once");
		} finally {
			process.env.PATH = originalPath;
		}
	});

	test("respawns when session directory was destroyed externally (long runtime)", async () => {
		const baseDir = makeTempDir("teams-sessdir-gone-");
		const sessionDir = path.join(baseDir, "session-gone");
		// Do NOT create sessionDir — simulates external deletion

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader, maiNoteLog, sendMessageLog } = makeLeaderHarness(baseDir);

			const spawnConfig: SpawnConfig = {
				workerInstanceId: "w-gone",
				ticketId: "tk-gone",
				workerName: "gone-worker",
				useWorktree: false,
				cwd: "/tmp/test-repo",
				repoRoot: "/tmp/test-repo",
				leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
				model: "openai-codex/gpt-5.4",
			};

			const worker: WorkerHandle = {
				workerInstanceId: "w-gone",
				name: "gone-worker",
				pid: 999999,
				ticketId: "tk-gone",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile: path.join(sessionDir, "session.jsonl"),
				worktreePath: null,
				model: "openai-codex/gpt-5.4",
				hasTools: false,
				status: "running",
				spawnedAt: Date.now() - 726_000, // 726s — well over 5s
				lastActivityAt: Date.now() - 726_000,
				lastProcessActivityAt: Date.now() - 726_000,
				hasActiveChildProcess: false,
				activeChildProcessCount: 0,
				lastSeenCommentCount: 0,
				routeState: "linked",
				spawnConfig,
			};

			await leader.handleWorkerExit("gone-worker", worker, 0);

			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.status).toBe("spawning");
			expect(worker.lastNote).toContain("AUTO-RESPAWN");
			expect(worker.lastNote).toContain("destroyed externally");

			const piArgs = await waitForFile(invocationLog);

			const child = leader.childProcesses.get("gone-worker");
			if (child) {
				child.removeAllListeners();
				if (child.pid) { try { process.kill(child.pid, "SIGKILL"); } catch {} }
				cleanupPids.push(child.pid);
			}

			expect(piArgs).toContain("--model");
			expect(piArgs).toContain("openai-codex/gpt-5.4");

			const noteLog = fs.readFileSync(maiNoteLog, "utf-8");
			expect(noteLog).toContain("destroyed externally");
		} finally {
			process.env.PATH = originalPath;
		}
	});

	test("does NOT respawn if session file exists (normal failure)", async () => {
		const baseDir = makeTempDir("teams-no-respawn-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		// HAS a .jsonl — normal failure, not startup death
		writeWorkerSession(sessionDir, "rate limit exceeded", "some text");

		const { leader } = makeLeaderHarness(baseDir);

		const spawnConfig: SpawnConfig = {
			workerInstanceId: "w2",
			ticketId: "tk-normal",
			workerName: "normal-fail",
			useWorktree: false,
			cwd: "/tmp/test-repo",
			repoRoot: "/tmp/test-repo",
			leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
			model: "anthropic/claude-sonnet-4-6",
		};

		const worker: WorkerHandle = {
			workerInstanceId: "w2",
			name: "normal-fail",
			pid: 999999,
			ticketId: "tk-normal",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile: path.join(sessionDir, "worker.jsonl"),
			worktreePath: null,
			model: "anthropic/claude-sonnet-4-6",
			hasTools: false,
			status: "running",
			spawnedAt: Date.now() - 800,
			lastActivityAt: Date.now() - 800,
			lastProcessActivityAt: Date.now() - 800,
			hasActiveChildProcess: false,
			activeChildProcessCount: 0,
			lastSeenCommentCount: 0,
			routeState: "linked",
			spawnConfig,
		};

		await leader.handleWorkerExit("normal-fail", worker, 1);

		// Should NOT have respawned — session file existed
		expect(worker.recoveryAttempts ?? 0).toBe(0);
		expect(worker.status).toBe("failed");
	});

	test("does NOT respawn if runtime > 5s", async () => {
		const baseDir = makeTempDir("teams-no-respawn-slow-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);

		const spawnConfig: SpawnConfig = {
			workerInstanceId: "w3",
			ticketId: "tk-slow",
			workerName: "slow-fail",
			useWorktree: false,
			cwd: "/tmp/test-repo",
			repoRoot: "/tmp/test-repo",
			leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
		};

		const worker: WorkerHandle = {
			workerInstanceId: "w3",
			name: "slow-fail",
			pid: 999999,
			ticketId: "tk-slow",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile: path.join(sessionDir, "session.jsonl"),
			worktreePath: null,
			hasTools: false,
			status: "running",
			spawnedAt: Date.now() - 10_000, // 10s ago — too long
			lastActivityAt: Date.now() - 10_000,
			lastProcessActivityAt: Date.now() - 10_000,
			hasActiveChildProcess: false,
			activeChildProcessCount: 0,
			lastSeenCommentCount: 0,
			routeState: "linked",
			spawnConfig,
		};

		await leader.handleWorkerExit("slow-fail", worker, 0);

		expect(worker.recoveryAttempts ?? 0).toBe(0);
		expect(worker.status).toBe("failed");
	});
});
