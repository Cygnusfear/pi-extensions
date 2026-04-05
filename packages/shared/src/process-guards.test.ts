/**
 * Tests for process-guards.ts
 *
 * Two categories:
 * - blocked — commands that broadcast signals to many/all processes
 * - safe    — commands that target specific PIDs or named processes
 */

import { describe, test, expect } from "bun:test";
import { isProcessKillBroadcast } from "./process-guards.ts";

function expectBlocked(cmd: string, reasonContains?: string) {
	const result = isProcessKillBroadcast(cmd);
	expect(result).not.toBeNull();
	if (reasonContains) {
		expect(result!.reason).toContain(reasonContains);
	}
}

function expectSafe(cmd: string) {
	expect(isProcessKillBroadcast(cmd)).toBeNull();
}

// ═══════════════════════════════════════════════════════════════
// The exact incident that motivated this guard
// ═══════════════════════════════════════════════════════════════

describe("the incident", () => {
	test("blocks kill -KILL -- -1 (the catastrophe)", () =>
		expectBlocked("kill -KILL -- -1", "nuke"));
	test("blocks kill -KILL -1", () => expectBlocked("kill -KILL -1", "nuke"));
	test("blocks kill -9 -- -1", () => expectBlocked("kill -9 -- -1", "nuke"));
	test("blocks kill -9 -1", () => expectBlocked("kill -9 -1", "nuke"));
	test("blocks kill -- -1 (implicit SIGTERM)", () =>
		expectBlocked("kill -- -1", "nuke"));
	test("blocks kill -SIGKILL -- -1", () =>
		expectBlocked("kill -SIGKILL -- -1", "nuke"));
	test("blocks kill -TERM -1", () => expectBlocked("kill -TERM -1", "nuke"));
	test("blocks kill -HUP -1", () => expectBlocked("kill -HUP -1", "nuke"));
	test("blocks kill -1 -1 (signal 1 broadcast)", () =>
		expectBlocked("kill -1 -1", "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// Process group targets
// ═══════════════════════════════════════════════════════════════

describe("kill 0 — current process group", () => {
	test("blocks kill -9 0", () => expectBlocked("kill -9 0", "process group"));
	test("blocks kill -- 0", () => expectBlocked("kill -- 0", "process group"));
	test("blocks kill -TERM 0", () =>
		expectBlocked("kill -TERM 0", "process group"));
	test("blocks kill -SIGKILL -- 0", () =>
		expectBlocked("kill -SIGKILL -- 0", "process group"));
});

describe("kill -N — negative PID / process group", () => {
	test("blocks kill -9 -1234", () =>
		expectBlocked("kill -9 -1234", "process group 1234"));
	test("blocks kill -- -999", () =>
		expectBlocked("kill -- -999", "process group 999"));
	test("blocks kill -KILL -- -42", () =>
		expectBlocked("kill -KILL -- -42", "process group 42"));
});

// ═══════════════════════════════════════════════════════════════
// Signal flag variations
// ═══════════════════════════════════════════════════════════════

describe("signal flag variations", () => {
	test("blocks kill -s KILL -1", () =>
		expectBlocked("kill -s KILL -1", "nuke"));
	test("blocks kill -s KILL -- -1", () =>
		expectBlocked("kill -s KILL -- -1", "nuke"));
	test("blocks kill -n 9 -1", () => expectBlocked("kill -n 9 -1", "nuke"));
	test("blocks kill -sKILL -- -1 (no space)", () =>
		expectBlocked("kill -sKILL -- -1", "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// Path / prefix variations
// ═══════════════════════════════════════════════════════════════

describe("kill binary path variations", () => {
	test("blocks /bin/kill -9 -1", () =>
		expectBlocked("/bin/kill -9 -1", "nuke"));
	test("blocks /usr/bin/kill -9 -1", () =>
		expectBlocked("/usr/bin/kill -9 -1", "nuke"));
	test("blocks sudo kill -9 -1", () =>
		expectBlocked("sudo kill -9 -1", "nuke"));
	test("blocks \\kill -9 -1 (alias bypass)", () =>
		expectBlocked("\\kill -9 -1", "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// Nested / wrapped shells
// ═══════════════════════════════════════════════════════════════

describe("nested shell wrappers", () => {
	test("blocks sh -c 'kill -9 -1'", () =>
		expectBlocked("sh -c 'kill -9 -1'", "nuke"));
	test('blocks bash -c "kill -KILL -- -1"', () =>
		expectBlocked('bash -c "kill -KILL -- -1"', "nuke"));
	test("blocks eval 'kill -9 -1'", () =>
		expectBlocked("eval 'kill -9 -1'", "nuke"));
	test("blocks nested double quotes", () =>
		expectBlocked('sh -c "kill -9 \\"-1\\""', "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// Chained commands
// ═══════════════════════════════════════════════════════════════

describe("chained commands", () => {
	test("blocks echo hi; kill -9 -1", () =>
		expectBlocked("echo hi; kill -9 -1", "nuke"));
	test("blocks ls && kill -9 -1", () =>
		expectBlocked("ls && kill -9 -1", "nuke"));
	test("blocks kill -9 -1 || echo fallback", () =>
		expectBlocked("kill -9 -1 || echo fallback", "nuke"));
	test("blocks mid-chain kill", () =>
		expectBlocked("cd /tmp && kill -9 -1 && ls", "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// pkill / killall
// ═══════════════════════════════════════════════════════════════

describe("pkill broad selectors", () => {
	test("blocks pkill -u $USER", () =>
		expectBlocked("pkill -u $USER", "current user"));
	test("blocks pkill --user $USER", () =>
		expectBlocked("pkill --user $USER", "current user"));
	test("blocks pkill -U $USER", () =>
		expectBlocked("pkill -U $USER", "current user"));
	test("blocks pkill -u $LOGNAME", () =>
		expectBlocked("pkill -u $LOGNAME", "current user"));
	test("blocks pkill -u `whoami`", () =>
		expectBlocked("pkill -u `whoami`", "current user"));
	test("blocks pkill -u $(whoami)", () =>
		expectBlocked("pkill -u $(whoami)", "current user"));
	test("blocks pkill -9 (no pattern)", () =>
		expectBlocked("pkill -9", "too broad"));
	test("blocks pkill . (wildcard)", () =>
		expectBlocked("pkill .", "every running process"));
	test("blocks pkill '.*' (wildcard)", () =>
		expectBlocked("pkill '.*'", "every running process"));
});

describe("killall broad selectors", () => {
	test("blocks killall -u $USER", () =>
		expectBlocked("killall -u $USER", "current user"));
	test("blocks killall (no pattern)", () =>
		expectBlocked("killall", "too broad"));
	test("blocks killall -9 (no pattern)", () =>
		expectBlocked("killall -9", "too broad"));
	test("blocks killall . (wildcard)", () =>
		expectBlocked("killall .", "every running process"));
});

// ═══════════════════════════════════════════════════════════════
// Safe commands — must pass through
// ═══════════════════════════════════════════════════════════════

describe("safe kill commands", () => {
	test("allows kill 1234", () => expectSafe("kill 1234"));
	test("allows kill -9 1234", () => expectSafe("kill -9 1234"));
	test("allows kill -KILL 5678", () => expectSafe("kill -KILL 5678"));
	test("allows kill -TERM 99999", () => expectSafe("kill -TERM 99999"));
	test("allows kill -s KILL 12345", () => expectSafe("kill -s KILL 12345"));
	test("allows kill -- 1234", () => expectSafe("kill -- 1234"));
	test("allows kill -l (list signals)", () => expectSafe("kill -l"));
	test("allows kill -l HUP", () => expectSafe("kill -l HUP"));
	test("allows multiple positive PIDs", () =>
		expectSafe("kill -9 1234 5678 9012"));
	test("allows $(pidof chrome)", () => expectSafe("kill -9 $(pidof chrome)"));
	test("allows $PID variable", () => expectSafe("kill -9 $PID"));
	test("allows kill from PID file", () =>
		expectSafe("kill -9 $(cat app.pid)"));
});

describe("safe pkill / killall", () => {
	test("allows pkill chrome", () => expectSafe("pkill chrome"));
	test("allows pkill -9 node", () => expectSafe("pkill -9 node"));
	test("allows pkill -f pattern", () => expectSafe("pkill -f my-app"));
	test("allows killall chrome", () => expectSafe("killall chrome"));
	test("allows killall -9 node", () => expectSafe("killall -9 node"));
	test("allows pkill -i Chrome", () => expectSafe("pkill -i Chrome"));
});

describe("commands without kill", () => {
	test("allows ls -1", () => expectSafe("ls -1"));
	test("allows head -1", () => expectSafe("head -1 file.txt"));
	test("allows echo -1", () => expectSafe("echo -1"));
	test("allows python script with -1", () =>
		expectSafe("python script.py --timeout -1"));
	test("allows plain text", () =>
		expectSafe("echo 'kill -9 -1 is dangerous'"));
});

// ═══════════════════════════════════════════════════════════════
// Wrapper commands (timeout, nice, etc.)
// ═══════════════════════════════════════════════════════════════

describe("wrapper commands", () => {
	test("blocks timeout 5 kill -9 -1", () =>
		expectBlocked("timeout 5 kill -9 -1", "nuke"));
	test("blocks nice kill -9 -1", () =>
		expectBlocked("nice kill -9 -1", "nuke"));
	test("blocks nohup kill -9 -1", () =>
		expectBlocked("nohup kill -9 -1", "nuke"));
	test("blocks env FOO=bar kill -9 -1", () =>
		expectBlocked("env FOO=bar kill -9 -1", "nuke"));
	test("blocks FOO=bar kill -9 -1 (inline env)", () =>
		expectBlocked("FOO=bar kill -9 -1", "nuke"));
	test("blocks exec kill -9 -1", () =>
		expectBlocked("exec kill -9 -1", "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// Pipeline stages
// ═══════════════════════════════════════════════════════════════

describe("pipelines", () => {
	test("blocks ps aux | kill -9 -1 (last stage)", () =>
		expectBlocked("ps aux | kill -9 -1", "nuke"));
	test("blocks yes | kill -9 -1 | head", () =>
		expectBlocked("yes | kill -9 -1 | head", "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// The buggy-agent scenario — test code that sets pid=-1
// ═══════════════════════════════════════════════════════════════

describe("realistic agent-runs-a-script scenarios", () => {
	// Note: the ORIGINAL incident involved a test file that computed pid=-1 at
	// runtime inside Node, then called process.kill(-1). The guard cannot see
	// inside a `bun test` invocation. But if the agent composes the kill
	// directly on the shell (e.g. while debugging), the guard catches it.
	test("blocks direct kill attempt from agent", () =>
		expectBlocked("kill -KILL -- -1", "nuke"));
	test("blocks sh -c wrapper of the kill", () =>
		expectBlocked("sh -c 'kill -KILL -- -1'", "nuke"));
	test("blocks background-detached variant", () =>
		expectBlocked("sh -c 'sleep 5 && kill -KILL -- -1' &", "nuke"));
});

// ═══════════════════════════════════════════════════════════════
// Edge cases: variable obfuscation is NOT caught (documented limit)
// ═══════════════════════════════════════════════════════════════

describe("documented limits (not caught)", () => {
	// These bypass the guard — documented here so future maintainers know.
	// The agent would have to intentionally obfuscate; a bug won't produce these.
	test("does not catch K=-1; kill -9 $K (variable)", () =>
		expectSafe("K=-1; kill -9 $K"));
	test("does not catch kill -9 $(echo -1)", () =>
		expectSafe("kill -9 $(echo -1)"));
});
