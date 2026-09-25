/**
 * git-ai extension — availability state machine (kal-d5wtk8tp).
 *
 * Drives the real exported extension factory with a fake ExtensionAPI and a real
 * child process standing in for the git-ai binary (GIT_AI_BIN). Proves:
 *  - session_start performs NO `git-ai --version` probe; the first real
 *    checkpoint spawn is what proves availability;
 *  - checkpoint payload content and Pre→Post order are preserved;
 *  - a pre-spawn failure warns ONCE and skips further attempts for the session;
 *  - session_start resets the state so a later session retries;
 *  - concurrent first edits share ONE availability attempt and no checkpoint
 *    payload is dropped by the handshake.
 *
 * Each test uses its own temp git repo and its own fake-binary log file.
 * Global registries (edit hooks, sandbox fns) are restored after every test.
 */
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
// existsSync doubles as the probe-killer assertion (review finding 1).
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import loadExtension from "./git-ai.ts";
import { getEditHooks, unregisterEditHook } from "../../shared/src/edit-hooks.ts";
import { getSandboxFnNames, unregisterSandboxFn } from "../../shared/src/sandbox-registry.ts";

type Handler = (event: any, ctx: any) => any;

function makeFakePi() {
	const handlers = new Map<string, Handler[]>();
	const pi = {
		on(event: string, handler: Handler) {
			const list = handlers.get(event) ?? [];
			list.push(handler);
			handlers.set(event, list);
		},
		registerTool(_tool: unknown) { /* not exercised here */ },
	};
	return {
		pi: pi as any,
		fire: async (event: string, evt: any, ctx: any) => {
			for (const handler of handlers.get(event) ?? []) await handler(evt, ctx);
		},
	};
}

// The fake binary appends each stdin payload as one line to $GIT_AI_TEST_LOG,
// so the log doubles as a spawn counter and a payload recorder.
const FAKE_BIN_BODY = `#!/bin/sh
cat >> "$GIT_AI_TEST_LOG"
printf '\\n' >> "$GIT_AI_TEST_LOG"
`;

function writeFakeBin(dir: string): string {
	const binPath = join(dir, "fake-git-ai");
	writeFileSync(binPath, FAKE_BIN_BODY);
	chmodSync(binPath, 0o755);
	return binPath;
}

function initTempRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), "git-ai-test-repo-"));
	scratchDirs.push(dir);
	execFileSync("git", ["init", "-q"], { cwd: dir });
	writeFileSync(join(dir, "seed.txt"), "seed\n");
	execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "add", "."], { cwd: dir });
	execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "seed"], { cwd: dir });
	return dir;
}

function readPayloads(logPath: string): any[] {
	if (!existsSync(logPath)) return [];
	return readFileSync(logPath, "utf8")
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line));
}

const toolCtx = (repoDir: string) => ({
	cwd: repoDir,
	sessionManager: {
		getSessionFile: () => "/nonexistent/session.jsonl",
		getSessionId: () => "sess-test",
		getSessionName: () => null,
	},
});

const editEvent = (path: string) => ({ toolName: "edit", input: { path } });

let scratchDirs: string[] = [];
let savedGitAiBin: string | undefined;
let savedGitAiTestLog: string | undefined;
let initialHooks: ReturnType<typeof getEditHooks> = [];
let initialSandboxNames: string[] = [];

beforeAll(() => {
	savedGitAiBin = process.env.GIT_AI_BIN;
	savedGitAiTestLog = process.env.GIT_AI_TEST_LOG;
	initialHooks = getEditHooks();
	initialSandboxNames = getSandboxFnNames();
});

function restoreEnv(name: "GIT_AI_BIN" | "GIT_AI_TEST_LOG", saved: string | undefined) {
	if (saved === undefined) delete process.env[name];
	else process.env[name] = saved;
}

afterEach(() => {
	// Restore global registries: every loadExtension() call registers an edit
	// hook (module-load IIFE) and session_start registers the gitAi sandbox fn.
	for (const hook of getEditHooks()) {
		if (!initialHooks.includes(hook)) unregisterEditHook(hook);
	}
	for (const name of getSandboxFnNames()) {
		if (!initialSandboxNames.includes(name)) unregisterSandboxFn(name);
	}
	for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
	scratchDirs = [];
	restoreEnv("GIT_AI_BIN", savedGitAiBin);
	restoreEnv("GIT_AI_TEST_LOG", savedGitAiTestLog);
});

afterAll(() => {
	restoreEnv("GIT_AI_BIN", savedGitAiBin);
	restoreEnv("GIT_AI_TEST_LOG", savedGitAiTestLog);
});

function makeScratch(): { dir: string; logPath: string; repoDir: string } {
	const dir = mkdtempSync(join(tmpdir(), "git-ai-test-"));
	scratchDirs.push(dir);
	const logPath = join(dir, "calls.log");
	process.env.GIT_AI_TEST_LOG = logPath;
	return { dir, logPath, repoDir: initTempRepo() };
}

describe("git-ai availability state machine (kal-d5wtk8tp)", () => {
	test("session_start performs NO version probe; first edits checkpoint in order", async () => {
		const { dir, logPath, repoDir } = makeScratch();
		process.env.GIT_AI_BIN = writeFakeBin(dir);
		const fake = makeFakePi();
		loadExtension(fake.pi);
		await fake.fire("session_start", {}, toolCtx(repoDir));

		// No spawn happened during session_start. Asserted on the log FILE'S
		// EXISTENCE, not its parsed payloads: the fake bin creates the log on
		// ANY invocation — including a `--version` probe, whose empty stdin
		// would leave only a blank line that readPayloads filters away. The
		// payload-level assertion alone could not kill a reintroduced probe
		// (review finding 1); this one can.
		expect(existsSync(logPath)).toBe(false);
		expect(readPayloads(logPath)).toEqual([]);

		const ctx = toolCtx(repoDir);
		await fake.fire("tool_call", editEvent(join(repoDir, "a.ts")), ctx);
		await fake.fire("tool_result", editEvent(join(repoDir, "a.ts")), ctx);

		const payloads = readPayloads(logPath);
		expect(payloads).toHaveLength(2);
		// Order preserved: PreToolUse (human) before PostToolUse (ai_agent).
		expect(payloads[0].type).toBe("human");
		expect(payloads[1].type).toBe("ai_agent");
		expect(payloads[0].will_edit_filepaths).toEqual([join(repoDir, "a.ts")]);
		expect(payloads[1].edited_filepaths).toEqual([join(repoDir, "a.ts")]);
		expect(payloads[1].conversation_id).toBe("sess-test");
	});

	test("a pre-spawn failure warns once and skips further attempts until reset", async () => {
		const { dir, repoDir } = makeScratch();
		// GIT_AI_BIN must point at a file that EXISTS but cannot execute:
		// resolveGitAiBin() skips env candidates that fail existsSync and falls
		// back to the developer's real ~/.local/bin/git-ai, so a merely-missing
		// path would silently test the real binary instead of the failure path.
		const nonExecutable = join(dir, "non-executable-git-ai");
		writeFileSync(nonExecutable, "not executable\n"); // default 0o644: exists, no +x
		process.env.GIT_AI_BIN = nonExecutable;
		const warnings: string[] = [];
		const originalWarn = console.warn;
		console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(" ")); };
		try {
			const fake = makeFakePi();
			loadExtension(fake.pi);
			await fake.fire("session_start", {}, toolCtx(repoDir));
			const ctx = toolCtx(repoDir);

			await fake.fire("tool_call", editEvent(join(repoDir, "a.ts")), ctx);
			await fake.fire("tool_call", editEvent(join(repoDir, "b.ts")), ctx);
			await fake.fire("tool_result", editEvent(join(repoDir, "b.ts")), ctx);

			const gitAiWarnings = warnings.filter((w) => w.startsWith("[git-ai]"));
			expect(gitAiWarnings).toHaveLength(1);
			expect(gitAiWarnings[0]).toContain("disabled for this session");

			// session_start resets: the next edit attempts a spawn again (and warns
			// again, because the binary is still missing).
			await fake.fire("session_start", {}, ctx);
			await fake.fire("tool_call", editEvent(join(repoDir, "c.ts")), ctx);
			expect(warnings.filter((w) => w.startsWith("[git-ai]"))).toHaveLength(2);
		} finally {
			console.warn = originalWarn;
		}
	});

	test("concurrent first edits against a BROKEN binary warn exactly once (shared attempt)", async () => {
		// Review finding 2: with a working binary every attempt is a checkpoint,
		// so payload counts cannot distinguish shared from unshared attempts.
		// The observable the sharing exists to produce is the warn-once under
		// concurrency: two simultaneous first edits, ONE warning, not two.
		const { dir, repoDir } = makeScratch();
		const nonExecutable = join(dir, "non-executable-git-ai");
		writeFileSync(nonExecutable, "not executable\n");
		process.env.GIT_AI_BIN = nonExecutable;
		const warnings: string[] = [];
		const originalWarn = console.warn;
		console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(" ")); };
		try {
			const fake = makeFakePi();
			loadExtension(fake.pi);
			const ctx = toolCtx(repoDir);
			await fake.fire("session_start", {}, ctx);
			await Promise.all([
				fake.fire("tool_call", editEvent(join(repoDir, "p.ts")), ctx),
				fake.fire("tool_call", editEvent(join(repoDir, "q.ts")), ctx),
			]);
			expect(warnings.filter((w) => w.startsWith("[git-ai]"))).toHaveLength(1);
		} finally {
			console.warn = originalWarn;
		}
	});

	test("concurrent first edits share ONE availability attempt and drop no payload", async () => {
		const { dir, logPath, repoDir } = makeScratch();
		process.env.GIT_AI_BIN = writeFakeBin(dir);
		const fake = makeFakePi();
		loadExtension(fake.pi);
		const ctx = toolCtx(repoDir);
		await fake.fire("session_start", {}, ctx);

		await Promise.all([
			fake.fire("tool_call", editEvent(join(repoDir, "x.ts")), ctx),
			fake.fire("tool_call", editEvent(join(repoDir, "y.ts")), ctx),
		]);

		// Both callers emitted their own PreToolUse checkpoint — the waiter fell
		// through after the shared attempt instead of being dropped — and the
		// shared attempt itself was made only once (2 payloads, not 3+).
		const payloads = readPayloads(logPath);
		expect(payloads).toHaveLength(2);
		expect(payloads.every((p) => p.type === "human")).toBe(true);

		// Once available, subsequent checkpoints flow normally.
		await fake.fire("tool_result", editEvent(join(repoDir, "x.ts")), ctx);
		const after = readPayloads(logPath);
		expect(after).toHaveLength(3);
		expect(after[2].type).toBe("ai_agent");
	});
});
