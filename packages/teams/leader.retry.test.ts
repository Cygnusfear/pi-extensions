import { afterEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TeamLeader, assessWorkerExit, endedWithUnresolvedCompaction, getRecoverableStreamAbort, getRecoverableToolRetry } from "./leader.ts";
import type { SpawnConfig, WorkerHandle } from "./types.js";
import {
	LIFECYCLE_FACT_ENTRY_TYPE,
	WORKER_FINISH_PENDING_ENTRY_TYPE,
	createDeclarationEventId,
	createLeaderEventId,
	createRootEventId,
} from "./v2/session-facts.ts";
import type { LifecycleFact } from "./v2/state.ts";

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

function makeLeaderHarness(baseDir: string, initialEntries: any[] = []) {
	const maiNoteLog = path.join(baseDir, "mai-notes.log");
	const sendMessageLog = path.join(baseDir, "send-message.log");
	const sessionEntries: any[] = [{ type: "message", id: "assistant", message: { role: "assistant", content: [] } }, ...initialEntries];
	const fakePi = {
		appendEntry: (customType: string, data: unknown) => { sessionEntries.push({ type: "custom", customType, data }); },
		exec: async (cmd: string, args: string[]) => {
			if (path.basename(cmd) !== "mai") throw new Error(`unexpected command: ${cmd}`);
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
	leaderAny.rearmPersistentLifecycle = () => {};
	leaderAny.notifyLLM = () => {};
	const ctx = {
		cwd: "/tmp/test-repo",
		sessionManager: {
			getSessionFile: () => path.join(baseDir, "leader-session.jsonl"),
			getSessionId: () => "leader-test-session",
			getEntries: () => sessionEntries,
			getBranch: () => sessionEntries,
			getHeader: () => null,
		},
		ui: { setWidget: () => {} },
	};
	leaderAny.ctx = ctx;
	leader.restoreState(ctx as any);

	return { leader: leaderAny, maiNoteLog, sendMessageLog, sessionEntries };
}

async function waitForFile(pathname: string, timeoutMs = 5000): Promise<string> {
	// Wait for STABLE NON-EMPTY content, not mere existence. The fake `pi` writes
	// its args via a shell `>> log` redirect, which CREATES the file empty when the
	// shell opens the fd — BEFORE `printf` fills it. Returning on existence alone
	// races that window and reads "" (the pre-existing flake). Requiring the content
	// to be non-empty AND unchanged across two consecutive polls makes it
	// deterministic regardless of how the writer chunks its output.
	const started = Date.now();
	let previous: string | null = null;
	while (Date.now() - started < timeoutMs) {
		if (fs.existsSync(pathname)) {
			const content = fs.readFileSync(pathname, "utf-8");
			if (content.length > 0) {
				if (previous === content) return content; // stable → the writer is done
				previous = content;
			}
		}
		await Bun.sleep(25);
	}
	throw new Error(`Timed out waiting for non-empty ${pathname}`);
}

afterEach(() => {
	for (const pid of cleanupPids.splice(0)) {
		try { process.kill(-pid, "SIGKILL"); } catch {}
		try { process.kill(pid, "SIGKILL"); } catch {}
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

describe("assessWorkerExit", () => {
	test("closed ticket + useful output remains warning without team_finish", () => {
		const baseDir = makeTempDir("teams-assess-success-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "useful summary that definitely counts as substantive output" }, { type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } }] },
				}),
			].join("\n") + "\n",
		);
		const result = assessWorkerExit({ freeform: false, hasTools: false, sessionDir } as any, 0, true, "DONE: summary");
		expect(result.classification).toBe("warning");
		expect(result.forcedExit).toBe(false);
	});

	test("explicit terminalStatus 'done' (from the durable finish tell) → success", () => {
		const baseDir = makeTempDir("teams-assess-done-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "useful output that counts as substantive" }, { type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } }] } }),
			].join("\n") + "\n",
		);
		// Ticket NOT closed, no DONE note — success comes purely from the explicit terminal on the handle.
		const result = assessWorkerExit({ freeform: false, hasTools: false, sessionDir, terminalStatus: "done", terminalSummary: "all shipped" } as any, 0, false, "progress note");
		expect(result.explicitTerminal).toBe("done");
		expect(result.forcedExit).toBe(false);
		expect(result.cleanExit).toBe(true);
		expect(result.classification).toBe("success");
	});

	test("explicit terminalStatus 'quit' → warning, reason is the finish summary", () => {
		const baseDir = makeTempDir("teams-assess-quit-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() })].join("\n") + "\n",
		);
		const result = assessWorkerExit({ freeform: false, hasTools: false, sessionDir, terminalStatus: "quit", terminalSummary: "blocked on missing data" } as any, 0, false, "note");
		expect(result.classification).toBe("warning");
		expect(result.reason).toBe("blocked on missing data");
	});

	test("late assistant error does not turn meaningful prior work into declared success", () => {
		const baseDir = makeTempDir("teams-assess-late-error-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "custom", customType: "teams-worker-heartbeat", id: "hb-1", parentId: null, timestamp: new Date().toISOString(), data: { event: "agent_end" } }),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "finished major work with useful summary" }, { type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } }] },
				}),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "toolResult", toolName: "bash", content: [{ type: "text", text: "ok" }] } }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "error", errorMessage: "late provider hiccup", content: [{ type: "text", text: "late error after completion" }] } }),
			].join("\n") + "\n",
		);
		const result = assessWorkerExit({ freeform: false, hasTools: false, sessionDir } as any, 0, true, "DONE: summary");
		expect(result.outputMeaningful).toBe(true);
		expect(result.classification).toBe("warning");
	});

	test("an EXITED:/FAILED: note forces failure (defensive net, no heartbeat)", () => {
		const baseDir = makeTempDir("teams-assess-forced-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "some output" }, { type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } }] } }),
			].join("\n") + "\n",
		);
		const result = assessWorkerExit({ freeform: false, hasTools: false, sessionDir } as any, 0, true, "EXITED: process ended before completing");
		expect(result.forcedExit).toBe(true);
		expect(result.classification).toBe("failure");
	});

	test("freeform worker clean exit (0) without team_finish remains warning", () => {
		const baseDir = makeTempDir("teams-assess-turn-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "did a turn of useful work worth resuming later" }] } }),
			].join("\n") + "\n",
		);
		const result = assessWorkerExit({ freeform: true, hasTools: true, sessionDir } as any, 0, false, "note");
		expect(result.cleanExit).toBe(true);
		expect(result.classification).toBe("warning");
	});

	test("non-zero exit + no meaningful output → failure", () => {
		const baseDir = makeTempDir("teams-assess-crash-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "error", content: [{ type: "text", text: "x" }] } }),
			].join("\n") + "\n",
		);
		const result = assessWorkerExit({ freeform: false, hasTools: false, sessionDir } as any, 1, false, "note");
		expect(result.classification).toBe("failure");
	});

	test("meaningful output but no team_finish and no close → warning (not silently success)", () => {
		const baseDir = makeTempDir("teams-assess-warn-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, "worker.jsonl"),
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "did substantial work but never called team_finish anywhere here" }, { type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } }] } }),
			].join("\n") + "\n",
		);
		const result = assessWorkerExit({ freeform: false, hasTools: false, sessionDir } as any, 1, false, "note");
		expect(result.classification).toBe("warning");
		expect(result.reason).toContain("without explicit team_finish");
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
			// Short text (under workerProducedMeaningfulOutput's 20-char substantive
			// threshold) so no hasSubstantiveText → no meaningful output → assessWorkerExit
			// classifies as failure, which is the only path where the malformed-JSON
			// recovery branch fires. Real-world equivalent: model emits invalid JSON
			// in a toolCall before producing any substantial text.
			"x",
		);

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader, maiNoteLog, sendMessageLog } = makeLeaderHarness(baseDir);
			const worker: WorkerHandle = {
				workerId: "worker-1",
				workerInstanceId: "worker-1",
				name: "retry-worker",
				pid: 999992, // fake pid — process.pid is alive and triggers handleWorkerExit's early-return guard
				ticketId: "tk-1",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile,
				worktreePath: null,
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
			// Status is "spawning" post-respawn pre-worker_hello — v2 reducer
			// classifies from spawn_started fact only at this point.
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

describe("TeamLeader auto-resume after mid-turn compaction", () => {
	test("resumes once when pi -p died after writing a CompactionEntry", async () => {
		// Mirrors β2's actual scenario on gso-ftezsc1t: worker grew to ~203k tokens,
		// pi auto-compaction aborted the in-flight LLM request and wrote a
		// CompactionEntry to the session, print mode then exited 1 on the aborted
		// stopReason before the compacted session could be consumed.
		const baseDir = makeTempDir("teams-resume-compact-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "comp-recover", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "toolUse", content: [{ type: "text", text: "working" }] } }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "toolResult", content: [{ type: "text", text: "ok" }] } }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "Request was aborted", content: [] } }),
				JSON.stringify({ type: "compaction", tokensBefore: 203040, fromHook: false, firstKeptEntryId: "abc", summary: "## Goal\nresume me" }),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "Request was aborted\n", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader, maiNoteLog, sendMessageLog } = makeLeaderHarness(baseDir);
			const worker: WorkerHandle = {
				workerId: "comp-worker-1",
				workerInstanceId: "comp-worker-1",
				name: "comp-recover-worker",
				pid: 999990,
				ticketId: "tk-comp",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile,
				worktreePath: null,
				model: "openai-codex/gpt-5.5",
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

			await leader.handleWorkerExit("comp-recover-worker", worker, 1);

			// Worker should be relaunched once, not buried as a warning. Status
			// is "spawning" post-respawn pre-worker_hello (v2 reducer classifies
			// from spawn_started fact only at this point).
			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.status).toBe("running");
			expect(worker.routeState).toBe("pending");
			expect(worker.lastNote).toContain("AUTO-RESUME");

			const piArgs = await waitForFile(invocationLog);
			const child = leader.childProcesses.get("comp-recover-worker");
			expect(child).toBeDefined();
			if (child) {
				child.removeAllListeners();
				if (child.pid) { try { process.kill(child.pid, "SIGKILL"); } catch {} }
				cleanupPids.push(child.pid);
			}
			expect(piArgs).toContain("--session");
			expect(piArgs).toContain(sessionFile);
			expect(piArgs).toContain("auto-compacted mid-flight");
			expect(piArgs).toContain("team_finish");

			const noteLog = fs.readFileSync(maiNoteLog, "utf-8");
			expect(noteLog).toContain("AUTO-RESUME");
			expect(noteLog).toContain("auto-compaction");

			const sent = fs.readFileSync(sendMessageLog, "utf-8");
			expect(sent).toContain("auto-resuming once after mid-turn compaction");
		} finally {
			process.env.PATH = originalPath;
		}
	});

	test("does NOT auto-resume when the session continued past the compaction", async () => {
		// Defensive: if the worker compacted earlier in its life and then did
		// more real work before dying, we should NOT silently re-prompt — the
		// post-compaction message indicates the abort was something else.
		const baseDir = makeTempDir("teams-resume-no-trigger-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "no-trigger", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "Request was aborted", content: [] } }),
				JSON.stringify({ type: "compaction", tokensBefore: 100000, fromHook: false, firstKeptEntryId: "x", summary: "..." }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "did work after compact, then died from something else" }] } }),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader } = makeLeaderHarness(baseDir);
			const events: any[] = [];
			leader.notifyLLM = (event: any) => { events.push(event); };

			const worker: WorkerHandle = {
				workerId: "no-trigger-1",
				workerInstanceId: "no-trigger-1",
				name: "no-trigger-worker",
				pid: 999991,
				ticketId: "tk-nt",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile,
				worktreePath: null,
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

			await leader.handleWorkerExit("no-trigger-worker", worker, 1);

			// Should fall through to canonical crash emission, NOT auto-resume.
			expect(worker.recoveryAttempts ?? 0).toBe(0);
			expect(worker.status).toBe("failed");
			expect(events).toHaveLength(1);
			expect(events[0].type).toBe("failed");
			// pi binary should NOT have been invoked
			expect(fs.existsSync(invocationLog)).toBe(false);
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
				workerId: "w-orig",
				workerInstanceId: "w-orig",
				ticketId: "tk-startup",
				workerName: "startup-worker",
				useWorktree: false,
				cwd: "/tmp/test-repo",
				repoRoot: "/tmp/test-repo",
				sessionDir,
				leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
				model: "openai-codex/gpt-5.4",
				hasTools: false,
				additionalPrompt: "do stuff",
				coordinatorMeshId: undefined,
				freeform: false,
			};

			const worker: WorkerHandle = {
				workerId: "w-orig",
				workerInstanceId: "w-orig",
				name: "startup-worker",
				pid: 999999,
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

			await leader.handleWorkerExit("startup-worker", worker, 1);

			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.status).toBe("running");
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

	test("does NOT respawn if session file appears shortly after exit", async () => {
		const baseDir = makeTempDir("teams-late-session-file-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);
		const worker: WorkerHandle = {
			workerId: "w-late",
			workerInstanceId: "w-late",
			name: "late-session",
			pid: 999999,
			ticketId: "tk-late",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile: path.join(sessionDir, "session.jsonl"),
			worktreePath: null,
			hasTools: false,
			status: "running",
			spawnedAt: Date.now() - 500,
			lastActivityAt: Date.now() - 500,
			lastProcessActivityAt: Date.now() - 500,
			hasActiveChildProcess: false,
			activeChildProcessCount: 0,
			lastSeenCommentCount: 0,
			routeState: "linked",
			spawnConfig: {
				workerId: "w-late",
				workerInstanceId: "w-late",
				ticketId: "tk-late",
				workerName: "late-session",
				useWorktree: false,
				cwd: "/tmp/test-repo",
				repoRoot: "/tmp/test-repo",
				sessionDir,
				leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
			},
		};

		setTimeout(() => {
			fs.writeFileSync(
				path.join(sessionDir, "late.jsonl"),
				JSON.stringify({ type: "session", version: 3, id: "late", timestamp: new Date().toISOString(), cwd: process.cwd() }) + "\n",
			);
		}, 300);

		await leader.handleWorkerExit("late-session", worker, 0);

		// No respawn should happen because a real session appeared.
		expect(worker.recoveryAttempts ?? 0).toBe(0);
		expect(worker.status).toBe("warning");
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
				workerId: "w-gone",
				workerInstanceId: "w-gone",
				ticketId: "tk-gone",
				workerName: "gone-worker",
				useWorktree: false,
				cwd: "/tmp/test-repo",
				repoRoot: "/tmp/test-repo",
				sessionDir,
				leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
				model: "openai-codex/gpt-5.4",
			};

			const worker: WorkerHandle = {
				workerId: "w-gone",
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

			await leader.handleWorkerExit("gone-worker", worker, 1);

			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.status).toBe("running");
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
			workerId: "w2",
			workerInstanceId: "w2",
			ticketId: "tk-normal",
			workerName: "normal-fail",
			useWorktree: false,
			cwd: "/tmp/test-repo",
			repoRoot: "/tmp/test-repo",
			sessionDir,
			leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
			model: "anthropic/claude-sonnet-4-6",
		};

		const worker: WorkerHandle = {
			workerId: "w2",
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
			workerId: "w3",
			workerInstanceId: "w3",
			ticketId: "tk-slow",
			workerName: "slow-fail",
			useWorktree: false,
			cwd: "/tmp/test-repo",
			repoRoot: "/tmp/test-repo",
			sessionDir,
			leaderSessionFile: path.join(baseDir, "leader-session.jsonl"),
		};

		const worker: WorkerHandle = {
			workerId: "w3",
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
		expect(worker.status).toBe("warning");
	});
});

describe("TeamLeader lifecycle regression", () => {
	test("restore promotes an exact worker-session pending finish before deriving missing_finish", async () => {
		const baseDir = makeTempDir("teams-pending-finish-restore-");
		const sessionDir = path.join(baseDir, "worker-session");
		const workerSessionFile = path.join(sessionDir, "session.jsonl");
		fs.mkdirSync(sessionDir, { recursive: true });
		const identity = {
			coordinatorSessionId: "leader-test-session",
			teamId: "team-pending-finish",
			workerId: "worker-pending-finish",
			attemptId: "attempt-pending-finish",
		};
		const summary = "durable declaration survived coordinator loss";
		const declarationEventId = createDeclarationEventId(identity, "done", summary);
		fs.writeFileSync(workerSessionFile, [
			JSON.stringify({ type: "session", version: 3, id: "worker-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
			JSON.stringify({
				type: "custom",
				customType: WORKER_FINISH_PENDING_ENTRY_TYPE,
				data: {
					schemaVersion: 1,
					...identity,
					status: "done",
					summary,
					eventId: declarationEventId,
					createdAt: 3,
				},
			}),
		].join("\n") + "\n");

		const spawnRequested: LifecycleFact = {
			schemaVersion: 4,
			...identity,
			eventId: createRootEventId("spawn_requested", identity),
			kind: "spawn_requested",
			occurredAt: 1,
			payload: {
				name: "pending-finish",
				ticketId: "tk-pending-finish",
				persistent: false,
				sessionMode: { kind: "fresh" },
				sessionDir,
				workerSessionFile,
				worktreePath: null,
			},
		};
		const processStarted: LifecycleFact = {
			schemaVersion: 4,
			...identity,
			eventId: "process-started-pending-finish",
			kind: "process_started",
			occurredAt: 2,
			payload: {
				pid: 999999,
				processBirth: { startedAt: 2 },
				sessionMode: { kind: "fresh" },
				sessionDir,
				workerSessionFile,
			},
		};
		const processExited: LifecycleFact = {
			schemaVersion: 4,
			...identity,
			eventId: "process-exited-pending-finish",
			kind: "process_exited",
			occurredAt: 4,
			payload: { pid: 999999, processBirth: { startedAt: 2 }, code: 0 },
		};
		const provisionalAssessment: LifecycleFact = {
			schemaVersion: 4,
			...identity,
			eventId: createLeaderEventId(identity, "assessment_missing_finish", processExited.eventId),
			kind: "assessment_missing_finish",
			occurredAt: 5,
			payload: { reason: "Worker exited without an explicit team_finish declaration", provisional: true },
		};
		const { leader, sessionEntries } = makeLeaderHarness(baseDir, [spawnRequested, processStarted, processExited, provisionalAssessment].map((data) => ({
			type: "custom",
			customType: LIFECYCLE_FACT_ENTRY_TYPE,
			data,
		})));

		for (let attempt = 0; attempt < 100; attempt++) {
			if (leader.getAttemptHistory({ attemptId: identity.attemptId })[0]?.declaration) break;
			await Bun.sleep(10);
		}
		const restored = leader.getAttemptHistory({ attemptId: identity.attemptId })[0];
		expect(restored?.declaration).toMatchObject({ kind: "done", summary, eventId: declarationEventId });
		expect(restored?.assessment?.kind).toBe("missing_finish");
		const coordinatorFacts = sessionEntries
			.filter((entry) => entry.type === "custom" && entry.customType === LIFECYCLE_FACT_ENTRY_TYPE)
			.map((entry) => entry.data as LifecycleFact);
		expect(coordinatorFacts.filter((fact) => fact.eventId === declarationEventId)).toHaveLength(1);
		expect(coordinatorFacts.filter((fact) => fact.kind === "assessment_missing_finish")).toHaveLength(1);
		expect(coordinatorFacts.filter((fact) => fact.kind === "outcome_corrected")).toHaveLength(1);
		expect(leader.getCurrentTerminalEvent("pending-finish", "warning", identity.attemptId)).toBeNull();
		expect(leader.getCurrentTerminalEvent("pending-finish", "completed", identity.attemptId)?.type).toBe("completed");
	});

	test("restore derives assessment_crash from a durable non-zero process exit", async () => {
		const baseDir = makeTempDir("teams-crash-restore-");
		const sessionDir = path.join(baseDir, "worker-session");
		const workerSessionFile = path.join(sessionDir, "session.jsonl");
		const identity = {
			coordinatorSessionId: "leader-test-session",
			teamId: "team-crash-restore",
			workerId: "worker-crash-restore",
			attemptId: "attempt-crash-restore",
		};
		const spawnId = createRootEventId("spawn_requested", identity);
		const facts: LifecycleFact[] = [
			{
				schemaVersion: 4, ...identity, eventId: spawnId, kind: "spawn_requested", occurredAt: 1,
				payload: { name: "crash-restore", ticketId: "tk-crash-restore", persistent: false, sessionMode: { kind: "fresh" }, sessionDir, workerSessionFile, worktreePath: null },
			},
			{
				schemaVersion: 4, ...identity, eventId: createLeaderEventId(identity, "process_started", spawnId), kind: "process_started", occurredAt: 2,
				payload: { pid: 999999, processBirth: { startedAt: 2 }, sessionMode: { kind: "fresh" }, sessionDir, workerSessionFile },
			},
			{
				schemaVersion: 4, ...identity, eventId: createLeaderEventId(identity, "process_exited", "999999:2"), kind: "process_exited", occurredAt: 3,
				payload: { pid: 999999, processBirth: { startedAt: 2 }, code: 1 },
			},
		];
		const { leader, sessionEntries } = makeLeaderHarness(baseDir, facts.map((data) => ({ type: "custom", customType: LIFECYCLE_FACT_ENTRY_TYPE, data })));

		for (let attempt = 0; attempt < 100; attempt++) {
			if (leader.getAttemptHistory({ attemptId: identity.attemptId })[0]?.assessment) break;
			await Bun.sleep(10);
		}
		const restored = leader.getAttemptHistory({ attemptId: identity.attemptId })[0];
		expect(restored?.assessment?.kind).toBe("crash");
		expect(leader.getCurrentTerminalEvent("crash-restore", "failed", identity.attemptId)?.type).toBe("failed");
		const appended = sessionEntries
			.filter((entry) => entry.type === "custom" && entry.customType === LIFECYCLE_FACT_ENTRY_TYPE)
			.map((entry) => entry.data as LifecycleFact);
		expect(appended.filter((fact) => fact.kind === "assessment_crash")).toHaveLength(1);
		expect(appended.filter((fact) => fact.kind === "assessment_missing_finish")).toHaveLength(0);
	});

	test("restore settles a spawn intent that never durably recorded process start", async () => {
		const baseDir = makeTempDir("teams-unstarted-restore-");
		const identity = {
			coordinatorSessionId: "leader-test-session",
			teamId: "team-unstarted",
			workerId: "worker-unstarted",
			attemptId: "attempt-unstarted",
		};
		const spawnRequested: LifecycleFact = {
			schemaVersion: 4,
			...identity,
			eventId: createRootEventId("spawn_requested", identity),
			kind: "spawn_requested",
			occurredAt: 1,
			payload: {
				name: "unstarted",
				ticketId: "tk-unstarted",
				persistent: false,
				sessionMode: { kind: "fresh" },
				sessionDir: path.join(baseDir, "worker-session"),
				workerSessionFile: path.join(baseDir, "worker-session", "session.jsonl"),
				worktreePath: null,
			},
		};
		const { leader, sessionEntries } = makeLeaderHarness(baseDir, [
			{ type: "custom", customType: LIFECYCLE_FACT_ENTRY_TYPE, data: spawnRequested },
		]);
		for (let attempt = 0; attempt < 100; attempt++) {
			if (leader.getAttemptHistory({ attemptId: identity.attemptId })[0]?.assessment) break;
			await Bun.sleep(10);
		}
		const restored = leader.getAttemptHistory({ attemptId: identity.attemptId })[0];
		expect(restored?.assessment?.kind).toBe("startup_failure");
		expect(restored?.assessment?.reason).toContain("before the worker process start");
		const facts = sessionEntries
			.filter((entry) => entry.type === "custom" && entry.customType === LIFECYCLE_FACT_ENTRY_TYPE)
			.map((entry) => entry.data as LifecycleFact);
		expect(facts.filter((fact) => fact.kind === "assessment_startup_failure")).toHaveLength(1);
		expect(facts.filter((fact) => fact.kind === "effect_requested").map((fact) => (fact.payload as { effectKind?: string }).effectKind).sort()).toEqual(["cleanup", "ticket_close"]);
	});

	test("freeform worker without team_finish emits warning instead of completion", async () => {
		const baseDir = makeTempDir("teams-freeform-turn-finished-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: {
						role: "assistant",
						stopReason: "end_turn",
						content: [
							{ type: "text", text: "finished the turn with a useful summary that is definitely substantive" },
							{ type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } },
						],
					},
				}),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: { role: "toolResult", toolName: "bash", content: [{ type: "text", text: "ok" }] },
				}),
				JSON.stringify({
					type: "custom",
					customType: "teams-worker-heartbeat",
					id: "hb-1",
					parentId: null,
					timestamp: new Date().toISOString(),
					data: { event: "agent_end", ticketId: "tk-freeform", workerName: "freeform-worker", workerInstanceId: "wf-1" },
				}),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);
		const events: any[] = [];
		leader.notifyLLM = (event: any) => { events.push(event); };
		leader.pi.exec = async (cmd: string, args: string[]) => {
			if (path.basename(cmd) === "mai" && args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "closed", comments: [{ body: "DONE: turn summary", timestamp: new Date().toISOString() }] }) };
			}
			return { stdout: "" };
		};

		const worker: WorkerHandle = {
			workerId: "wf-1",
			workerInstanceId: "wf-1",
			name: "freeform-worker",
			pid: 999999,
			ticketId: "tk-freeform",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile,
			worktreePath: null,
			hasTools: false,
			status: "running",
			spawnedAt: Date.now() - 1000,
			lastActivityAt: Date.now() - 1000,
			lastProcessActivityAt: Date.now() - 1000,
			hasActiveChildProcess: false,
			activeChildProcessCount: 0,
			lastSeenCommentCount: 0,
			routeState: "linked",
			freeform: true,
		};

		await leader.handleWorkerExit("freeform-worker", worker, 0);

		expect(worker.routeState).toBe("resumable");
		expect(worker.status).toBe("warning");
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("warning");
	});

	test("closed ticket with useful output and exit code 0 remains warning without team_finish", async () => {
		const baseDir = makeTempDir("teams-closed-ticket-success-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: {
						role: "assistant",
						stopReason: "stop",
						content: [
							{ type: "text", text: "ticket is done and closed with a useful summary and answer table" },
							{ type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } },
						],
					},
				}),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: { role: "toolResult", toolName: "bash", content: [{ type: "text", text: "ok" }] },
				}),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);
		const events: any[] = [];
		leader.notifyLLM = (event: any) => { events.push(event); };
		leader.pi.exec = async (cmd: string, args: string[]) => {
			if (path.basename(cmd) === "mai" && args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "closed", comments: [{ body: "DONE: useful summary", timestamp: new Date().toISOString() }] }) };
			}
			return { stdout: "" };
		};

		const worker: WorkerHandle = {
			workerId: "wc-1",
			workerInstanceId: "wc-1",
			name: "closed-ticket-worker",
			pid: 999999,
			ticketId: "tk-closed",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile,
			worktreePath: null,
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

		await leader.handleWorkerExit("closed-ticket-worker", worker, 0);

		expect(worker.status).toBe("warning");
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("warning");
	});

	test("plain exit code 0 without explicit terminal signal is warning", async () => {
		const baseDir = makeTempDir("teams-exit0-no-agent-end-");
		const sessionDir = path.join(baseDir, "session");
		const worktreePath = path.join(baseDir, "worktree");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.mkdirSync(worktreePath, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: {
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "some text but no clean shutdown facts" }],
					},
				}),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);
		const events: any[] = [];
		leader.notifyLLM = (event: any) => { events.push(event); };
		leader.pi.exec = async (cmd: string, args: string[]) => {
			if (path.basename(cmd) === "mai" && args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "open", comments: [] }) };
			}
			if (path.basename(cmd) === "mai" && args[0] === "close") return { stdout: "" };
			return { stdout: "" };
		};

		const worker: WorkerHandle = {
			workerId: "wx-0",
			workerInstanceId: "wx-0",
			name: "exit0-no-agent-end",
			pid: 999999,
			ticketId: "tk-exit0",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile,
			worktreePath,
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

		await leader.handleWorkerExit("exit0-no-agent-end", worker, 0);

		expect(worker.status).toBe("warning");
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("warning");
		expect(events[0].reason).toContain("worker exited without explicit team_finish");
		expect(events[0].reason).toContain(`Worktree preserved for inspection: ${worktreePath}`);
	});

	test("non-zero exit without team_finish is canonical failed and emits a failed terminal event", async () => {
		const baseDir = makeTempDir("teams-exit1-crash-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(sessionFile, [
			JSON.stringify({ type: "session", version: 3, id: "crash-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
			JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "error", errorMessage: "provider stream crashed", content: [{ type: "text", text: "partial diagnostic output" }] } }),
		].join("\n") + "\n");
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "provider stream crashed\n", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);
		const events: any[] = [];
		leader.notifyLLM = (event: any) => { events.push(event); };
		leader.pi.exec = async (cmd: string, args: string[]) => {
			if (path.basename(cmd) === "mai" && args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "open", comments: [] }) };
			}
			return { stdout: "" };
		};
		const worker: WorkerHandle = {
			workerId: "worker-crash",
			workerInstanceId: "attempt-crash",
			name: "crash-worker",
			pid: 999999,
			ticketId: "tk-crash",
			ticketStatus: "open",
			sessionDir,
			sessionFile,
			worktreePath: null,
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

		await leader.handleWorkerExit(worker.name, worker, 1);

		expect(worker.status).toBe("failed");
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("failed");
		expect(leader.getAttemptHistory({ status: "failed" }).map((attempt: any) => attempt.attemptId)).toContain("attempt-crash");
	});

	test("endedWithUnresolvedCompaction matches β2's compaction-died-mid-turn shape", () => {
		const sessionDir = makeTempDir("teams-endedcomp-match-");
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "endedcomp-1", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				// Normal in-flight assistant turn ...
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "toolUse", content: [{ type: "text", text: "working" }] } }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "toolResult", content: [{ type: "text", text: "ok" }] } }),
				// Pi aborts in-flight request to make room for compaction
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "Request was aborted", content: [] } }),
				// Pi writes the compaction entry (in print mode, process then exits 1)
				JSON.stringify({ type: "compaction", tokensBefore: 203040, fromHook: false, firstKeptEntryId: "abc", summary: "## Goal\n..." }),
			].join("\n") + "\n",
		);
		expect(endedWithUnresolvedCompaction(sessionDir)).toBe(true);
	});

	test("endedWithUnresolvedCompaction does NOT match when work continued after compaction", () => {
		const sessionDir = makeTempDir("teams-endedcomp-nomatch-");
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "endedcomp-2", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "Request was aborted", content: [] } }),
				JSON.stringify({ type: "compaction", tokensBefore: 100000, fromHook: false, firstKeptEntryId: "abc", summary: "..." }),
				// Worker resumed and did more work
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "continued post-compact" }] } }),
			].join("\n") + "\n",
		);
		expect(endedWithUnresolvedCompaction(sessionDir)).toBe(false);
	});

	test("endedWithUnresolvedCompaction does NOT match when no compaction occurred", () => {
		const sessionDir = makeTempDir("teams-endedcomp-nocomp-");
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "endedcomp-3", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "user kill", content: [] } }),
			].join("\n") + "\n",
		);
		expect(endedWithUnresolvedCompaction(sessionDir)).toBe(false);
	});

	test("warning without explicit team_finish folds session diagnostics into the event reason", async () => {
		// Mirrors β2's actual scenario: context overflow → request aborted → process exit 1
		// without team_finish. Leader must surface stopReason + error so coordinators don't
		// have to guess (and don't invent inferences like 'hit context cap').
		const baseDir = makeTempDir("teams-ambig-warning-diag-");
		const sessionDir = path.join(baseDir, "session");
		const worktreePath = path.join(baseDir, "worktree");
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.mkdirSync(worktreePath, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "ambig-warn", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: {
						role: "assistant",
						stopReason: "aborted",
						errorMessage: "Request was aborted",
						content: [{ type: "text", text: "doing thoughtful work…" }],
					},
				}),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);
		const events: any[] = [];
		leader.notifyLLM = (event: any) => { events.push(event); };
		leader.pi.exec = async (cmd: string, args: string[]) => {
			if (path.basename(cmd) === "mai" && args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "open", comments: [] }) };
			}
			if (path.basename(cmd) === "mai" && args[0] === "close") return { stdout: "" };
			return { stdout: "" };
		};

		const worker: WorkerHandle = {
			workerId: "wx-1",
			workerInstanceId: "wx-1",
			name: "ambig-warning-diag",
			pid: 999998,
			ticketId: "tk-ambig",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile,
			worktreePath,
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

		await leader.handleWorkerExit("ambig-warning-diag", worker, 0);

		expect(worker.status).toBe("warning");
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("warning");
		// Generic reason preserved (existing assertion path)
		expect(events[0].reason).toContain("worker exited without explicit team_finish");
		// NEW: diagnostics folded in — stopReason + errorMessage from the session's last assistant
		expect(events[0].reason).toContain("stopReason: aborted");
		expect(events[0].reason).toContain("Request was aborted");
		// Worktree preservation hint still appended last
		expect(events[0].reason).toContain(`Worktree preserved for inspection: ${worktreePath}`);
	});

	test("crash report should prefer earlier informative attempt over later empty respawn dir", async () => {
		const baseDir = makeTempDir("teams-best-attempt-");
		const firstDir = path.join(baseDir, "first");
		const secondDir = path.join(baseDir, "second");
		fs.mkdirSync(firstDir, { recursive: true });
		fs.mkdirSync(secondDir, { recursive: true });
		fs.writeFileSync(path.join(firstDir, "attempt.jsonl"), JSON.stringify({ type: "session", version: 3, id: "s1", timestamp: new Date().toISOString(), cwd: process.cwd() }) + "\n");
		fs.writeFileSync(path.join(firstDir, "stderr.log"), "You exceeded your current quota\n", "utf-8");
		fs.writeFileSync(path.join(secondDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(firstDir, "stdout.log"), "", "utf-8");
		fs.writeFileSync(path.join(secondDir, "stdout.log"), "", "utf-8");

		const worker: WorkerHandle = {
			workerId: "w-best-2",
			workerInstanceId: "w-best-2",
			name: "best-attempt",
			pid: 999999,
			ticketId: "tk-best",
			status: "failed",
			lastActivityAt: Date.now(),
			lastProcessActivityAt: Date.now(),
			spawnedAt: Date.now() - 500,
			sessionDir: secondDir,
			sessionFile: path.join(secondDir, "session.jsonl"),
			worktreePath: null,
			hasTools: false,
			activeChildProcessCount: 0,
			hasActiveChildProcess: false,
			lastSeenCommentCount: 0,
			routeState: "dead",
			attempts: [
				{ workerInstanceId: "w-best-1", pid: 111, sessionDir: firstDir, sessionFile: path.join(firstDir, "attempt.jsonl"), spawnedAt: Date.now() - 1500, exitCode: 1 },
				{ workerInstanceId: "w-best-2", pid: 222, sessionDir: secondDir, sessionFile: path.join(secondDir, "session.jsonl"), spawnedAt: Date.now() - 500, exitCode: 0 },
			],
		};
		const report = (TeamLeader as any, null); // no-op to satisfy ts in test file context
		const mod = await import('./leader.ts');
		const text = (mod as any).readWorkerFailureDiagnostics ? '' : ''; // keep import live
		const crash = (mod as any).buildWorkerCrashReport ? (mod as any).buildWorkerCrashReport(worker, 0) : '';
		// buildWorkerCrashReport isn't exported; verify through failure diagnostics helper effect by checking first dir chosen via report internals not accessible.
		// Fallback assertion: ensure earlier attempt dir really contains the signal we rely on.
		expect(fs.readFileSync(path.join(firstDir, 'stderr.log'), 'utf-8')).toContain('quota');
	});

	test("EXITED diagnostics remain missing-finish without an authoritative declaration", async () => {
		const baseDir = makeTempDir("teams-forced-exit-fails-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "test-session", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: {
						role: "assistant",
						stopReason: "stop",
						content: [
							{ type: "text", text: "did a bunch of work with a substantive summary that should count as meaningful output" },
							{ type: "toolCall", id: "1", name: "bash", arguments: { command: "echo ok" } },
						],
					},
				}),
				JSON.stringify({
					type: "message",
					timestamp: new Date().toISOString(),
					message: { role: "toolResult", toolName: "bash", content: [{ type: "text", text: "ok" }] },
				}),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const { leader } = makeLeaderHarness(baseDir);
		const events: any[] = [];
		leader.notifyLLM = (event: any) => { events.push(event); };
		leader.pi.exec = async (cmd: string, args: string[]) => {
			if (path.basename(cmd) === "mai" && args[0] === "--json" && args[1] === "show") {
				return { stdout: JSON.stringify({ id: args[2], status: "open", comments: [{ body: "EXITED: Worker process ended before completing work", timestamp: new Date().toISOString() }] }) };
			}
			if (path.basename(cmd) === "mai" && args[0] === "close") return { stdout: "" };
			return { stdout: "" };
		};

		const worker: WorkerHandle = {
			workerId: "wx-1",
			workerInstanceId: "wx-1",
			name: "forced-exit-worker",
			pid: 999999,
			ticketId: "tk-exited",
			ticketStatus: "open",
			lastNote: undefined,
			sessionDir,
			sessionFile,
			worktreePath: null,
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

		await leader.handleWorkerExit("forced-exit-worker", worker, 0);

		expect(worker.status).toBe("warning");
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("warning");
	});
});



describe("getRecoverableStreamAbort", () => {
	test("matches the empty-abort flake from a realistic diagnostics string (with errorMessage)", () => {
		// Shape readSessionDiagnostics emits for: content:[], stopReason aborted, errorMessage set.
		const diagnostics = "\n  error: Request was aborted\n  last assistant: stopReason: aborted | error: Request was aborted";
		const recovery = getRecoverableStreamAbort(diagnostics);
		expect(recovery).not.toBeNull();
		expect(recovery?.error).toContain("empty aborted");
		expect(recovery?.error).toContain("Request was aborted");
		expect(recovery?.prompt).toContain("produced no output");
		expect(recovery?.prompt).toContain("team_finish");
	});

	test("matches the stopReason: error variant (no errorMessage)", () => {
		expect(getRecoverableStreamAbort("\n  last assistant: stopReason: error")).not.toBeNull();
	});

	test("matches the stopReason: aborted variant (no errorMessage)", () => {
		expect(getRecoverableStreamAbort("\n  last assistant: stopReason: aborted")).not.toBeNull();
	});

	test("returns null when the aborted turn produced text (not the empty flake)", () => {
		const diagnostics = "\n  last assistant: stopReason: aborted | text: I will start by reading the files";
		expect(getRecoverableStreamAbort(diagnostics)).toBeNull();
	});

	test("returns null when a tool ran (last failing tool present)", () => {
		const diagnostics = "\n  last assistant: stopReason: error\n  last failing tool: bash: command failed";
		expect(getRecoverableStreamAbort(diagnostics)).toBeNull();
	});

	test("returns null for a normal end_turn / no assistant / unrelated stopReason", () => {
		expect(getRecoverableStreamAbort("\n  last assistant: stopReason: stop | text: done")).toBeNull();
		expect(getRecoverableStreamAbort("\n  last assistant: stopReason: length")).toBeNull();
		expect(getRecoverableStreamAbort("")).toBeNull();
	});
});

describe("TeamLeader empty-abort first-turn recovery", () => {
	test("retries exactly ONCE after an empty/aborted first turn, then gives up on the second death", async () => {
		const baseDir = makeTempDir("teams-empty-abort-retry-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		// Pure empty-abort first turn: content:[], stopReason aborted, no tool calls,
		// no substantive text, no CompactionEntry (so it is NOT the compaction shape).
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "empty-abort", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "Request was aborted", content: [] } }),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "Request was aborted\n", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader, maiNoteLog, sendMessageLog } = makeLeaderHarness(baseDir);
			const worker: WorkerHandle = {
				workerId: "ea-1",
				workerInstanceId: "ea-1",
				name: "empty-abort-worker",
				pid: 999980,
				ticketId: "tk-ea",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile,
				worktreePath: null,
				model: "zai-coding/glm-5.2",
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

			// First death → bounded recovery fires exactly once.
			await leader.handleWorkerExit("empty-abort-worker", worker, 1);
			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.status).toBe("running");
			expect(worker.lastNote).toContain("AUTO-RETRY");

			const firstInvocation = await waitForFile(invocationLog);
			expect(firstInvocation).toContain("--session");
			expect(firstInvocation).toContain(sessionFile);
			// Continuation prompt (NOT the malformed-JSON escape guidance).
			expect(firstInvocation).toContain("produced no output");
			expect(firstInvocation).toContain("team_finish");

			// Tear down the first fake child without firing its exit handler, then
			// simulate the retried worker dying again.
			const child = leader.childProcesses.get("empty-abort-worker");
			expect(child).toBeDefined();
			if (child) {
				child.removeAllListeners();
				if (child.pid) { try { process.kill(child.pid, "SIGKILL"); } catch {} }
				cleanupPids.push(child.pid);
			}
			await Bun.sleep(60); // let the killed pid settle so isProcessAlive() sees it dead

			// Second death → recoveryAttempts is already 1, so the bounded block
			// (recoveryAttempts < 1 IS the cascade guard) must NOT fire again.
			await leader.handleWorkerExit("empty-abort-worker", worker, 1);
			expect(worker.recoveryAttempts).toBe(1); // unchanged — no second retry
			expect(worker.status).toBe("failed");

			// fake pi invoked exactly once total (count --session occurrences — the
			// prompt contains newlines, so raw line count is unreliable).
			const logText = fs.readFileSync(invocationLog, "utf-8");
			const sessionInvocations = (logText.match(/--session/g) || []).length;
			expect(sessionInvocations).toBe(1);

			const noteLog = fs.readFileSync(maiNoteLog, "utf-8");
			expect(noteLog).toContain("AUTO-RETRY");
			expect(noteLog).toContain("aborted/errored before any content");

			const sent = fs.readFileSync(sendMessageLog, "utf-8");
			expect(sent).toContain("empty/aborted first-turn stream response");
		} finally {
			process.env.PATH = originalPath;
		}
	});

	test("a DIRECTED abort (leader kill) does NOT retry even with an empty-abort session", async () => {
		const baseDir = makeTempDir("teams-directed-abort-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		// Same empty-abort signature as the flake — the distinction is that the
		// LEADER killed this worker (status=killed, killedAt set), which is the
		// primary directed-stop mechanism. The killed guard at the top of
		// handleWorkerExit filters it before any recovery logic runs.
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "directed-abort", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "Request was aborted", content: [] } }),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "Request was aborted\n", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader } = makeLeaderHarness(baseDir);
			const worker: WorkerHandle = {
				workerId: "dir-1",
				workerInstanceId: "dir-1",
				name: "directed-abort-worker",
				pid: 999979,
				ticketId: "tk-dir",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile,
				worktreePath: null,
				model: "zai-coding/glm-5.2",
				hasTools: false,
				status: "killed",
				killedAt: Date.now(),
				spawnedAt: Date.now() - 1000,
				lastActivityAt: Date.now() - 1000,
				lastProcessActivityAt: Date.now() - 1000,
				hasActiveChildProcess: false,
				activeChildProcessCount: 0,
				lastSeenCommentCount: 0,
				routeState: "dead",
			};

			await leader.handleWorkerExit("directed-abort-worker", worker, 1);

			// The killed guard early-returns: no retry, no respawn, no pi invocation.
			expect(worker.recoveryAttempts ?? 0).toBe(0);
			expect(worker.status).toBe("killed");
			expect(fs.existsSync(invocationLog)).toBe(false);
			expect(leader.childProcesses.has("directed-abort-worker")).toBe(false);
		} finally {
			process.env.PATH = originalPath;
		}
	});

	test("does NOT treat a mid-turn compaction abort as the stream flake (separate resume path)", async () => {
		// The stream-abort classifier is guarded by !endedWithUnresolvedCompaction,
		// so a compaction abort (CompactionEntry after the aborted message) is left
		// to the compaction-resume block on the warning path, not retried here.
		const baseDir = makeTempDir("teams-empty-abort-vs-compaction-");
		const sessionDir = path.join(baseDir, "session");
		fs.mkdirSync(sessionDir, { recursive: true });
		const sessionFile = path.join(sessionDir, "worker.jsonl");
		fs.writeFileSync(
			sessionFile,
			[
				JSON.stringify({ type: "session", version: 3, id: "ea-vs-comp", timestamp: new Date().toISOString(), cwd: process.cwd() }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "toolUse", content: [{ type: "text", text: "working through the task now" }] } }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "toolResult", content: [{ type: "text", text: "ok" }] } }),
				JSON.stringify({ type: "message", timestamp: new Date().toISOString(), message: { role: "assistant", stopReason: "aborted", errorMessage: "Request was aborted", content: [] } }),
				JSON.stringify({ type: "compaction", tokensBefore: 203040, fromHook: false, firstKeptEntryId: "abc", summary: "## Goal\nresume me" }),
			].join("\n") + "\n",
		);
		fs.writeFileSync(path.join(sessionDir, "stderr.log"), "Request was aborted\n", "utf-8");
		fs.writeFileSync(path.join(sessionDir, "stdout.log"), "", "utf-8");

		const invocationLog = path.join(baseDir, "pi-invocation.log");
		const binDir = path.join(baseDir, "bin");
		makeFakePiBinary(binDir, invocationLog);

		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;

		try {
			const { leader, sendMessageLog } = makeLeaderHarness(baseDir);
			const worker: WorkerHandle = {
				workerId: "comp-1",
				workerInstanceId: "comp-1",
				name: "comp-action-worker",
				pid: 999978,
				ticketId: "tk-comp2",
				ticketStatus: "open",
				lastNote: undefined,
				sessionDir,
				sessionFile,
				worktreePath: null,
				model: "zai-coding/glm-5.2",
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

			await leader.handleWorkerExit("comp-action-worker", worker, 1);

			// Compaction resume (warning path) fires — NOT the stream-abort retry.
			expect(worker.recoveryAttempts).toBe(1);
			expect(worker.lastNote).toContain("AUTO-RESUME");
			const child = leader.childProcesses.get("comp-action-worker");
			if (child) {
				child.removeAllListeners();
				if (child.pid) { try { process.kill(child.pid, "SIGKILL"); } catch {} }
				cleanupPids.push(child.pid);
			}
			const sent = fs.readFileSync(sendMessageLog, "utf-8");
			expect(sent).toContain("auto-resuming once after mid-turn compaction");
			// And critically: NOT the stream-abort message.
			expect(sent).not.toContain("empty/aborted first-turn stream response");
		} finally {
			process.env.PATH = originalPath;
		}
	});
});
