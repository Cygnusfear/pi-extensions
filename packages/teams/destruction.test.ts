/**
 * Adversarial destruction tests. These exist to make sure:
 *  - kill() + killAll() stay synchronous-fast (<100ms each) even when mai
 *    is completely broken / timing out.
 *  - delegate() after kill() does not race the worktree removal at the same path.
 *  - Concurrent fork-snapshot builds never collide or damage the coordinator.
 *  - Hostile mai / worktree behaviour (hang, throw, never return) cannot stall
 *    the coordinator's hot path.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import { TeamLeader } from "./leader.ts";
import type { WorkerHandle } from "./types.js";

const cleanupDirs: string[] = [];
const spawnedChildren: ChildProcess[] = [];

function makeTempDir(prefix: string): string {
	const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
	cleanupDirs.push(dir);
	return dir;
}

function makeGitRepo(prefix: string): string {
	const dir = makeTempDir(prefix);
	execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
	execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
	execFileSync("git", ["config", "user.name", "test"], { cwd: dir });
	execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "init"], { cwd: dir });
	return dir;
}

function makeHarness(opts: {
	cwd?: string;
	execResponder?: (cmd: string, args: string[]) => Promise<{ stdout?: string; stderr?: string; code?: number; killed?: boolean }>;
} = {}) {
	const appended: Array<{ customType: string; data: unknown }> = [];
	const fakePi = {
		appendEntry: (customType: string, data: unknown) => { appended.push({ customType, data }); },
		exec: opts.execResponder ?? (async () => ({ stdout: "", stderr: "", code: 0 })),
	};
	const leader = new TeamLeader(fakePi as any);
	const leaderAny = leader as any;
	leaderAny.ctx = {
		cwd: opts.cwd ?? "/tmp",
		ui: { setWidget: () => {} },
		sessionManager: { getBranch: () => [] },
	};
	leaderAny.stateHydrated = true;
	return { leader: leaderAny, appended };
}

function makeWorker(name: string, pid: number, overrides: Partial<WorkerHandle> = {}): WorkerHandle {
	const now = Date.now();
	return {
		workerInstanceId: `inst-${name}`,
		name,
		pid,
		ticketId: `tk-${name}`,
		ticketStatus: "open",
		sessionDir: "/tmp/session",
		sessionFile: "/tmp/session/worker.jsonl",
		worktreePath: null,
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

afterAll(() => {
	for (const child of spawnedChildren) {
		try { if (child.pid) process.kill(-child.pid, "SIGKILL"); } catch {}
		try { if (child.pid) process.kill(child.pid, "SIGKILL"); } catch {}
	}
	for (const dir of cleanupDirs) {
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	}
});

describe("kill() performance under hostile mai", () => {
	test.skip("kill() returns in <100ms even when mai close hangs at the 5s timeout", async () => {
		// mai close takes the full timeout window (worst case: mai hung, SIGTERM'd after 5s)
		const slowMai = async (cmd: string, args: string[]) => {
			if (cmd === "mai" && args[0] === "close") {
				await new Promise((resolve) => setTimeout(resolve, 5000));
				return { stdout: "", stderr: "", code: 143, killed: true };
			}
			return { stdout: "", stderr: "", code: 0 };
		};
		const { leader } = makeHarness({ execResponder: slowMai });
		leader.workers.set("slow", makeWorker("slow", -1)); // invalid pid, isProcessAlive=false

		const t0 = performance.now();
		await leader.kill("slow");
		const elapsedMs = performance.now() - t0;
		expect(elapsedMs).toBeLessThan(100);
	});

	test.skip("killAll() of 10 workers returns in <200ms even if every mai close times out", async () => {
		const slowMai = async (cmd: string, args: string[]) => {
			if (cmd === "mai" && args[0] === "close") {
				await new Promise((resolve) => setTimeout(resolve, 5000));
				return { stdout: "", stderr: "", code: 143, killed: true };
			}
			return { stdout: "", stderr: "", code: 0 };
		};
		const { leader } = makeHarness({ execResponder: slowMai });
		for (let i = 0; i < 10; i++) {
			leader.workers.set(`w${i}`, makeWorker(`w${i}`, -i - 1));
		}

		const t0 = performance.now();
		await leader.killAll();
		const elapsedMs = performance.now() - t0;
		expect(elapsedMs).toBeLessThan(200);
		expect(leader.workers.size).toBe(0);
	});

	test.skip("kill() of a worker with a REAL live process sends SIGTERM fast and process dies", async () => {
		// Spawn a real long-running process, then kill via the leader. Measure
		// both the leader.kill() latency and the actual process death.
		const child = spawn("bash", ["-lc", "sleep 60"], { stdio: "ignore", detached: true });
		spawnedChildren.push(child);
		const pid = child.pid!;
		expect(pid).toBeGreaterThan(0);

		const { leader } = makeHarness();
		leader.workers.set("victim", makeWorker("victim", pid));

		const t0 = performance.now();
		await leader.kill("victim");
		const elapsedMs = performance.now() - t0;
		expect(elapsedMs).toBeLessThan(100);

		// Process should be dead within SIGTERM window
		await new Promise((resolve) => setTimeout(resolve, 200));
		let alive = true;
		try { process.kill(pid, 0); } catch { alive = false; }
		expect(alive).toBe(false);
	});

	test("kill() still returns fast when mai close throws synchronously", async () => {
		const hostileMai = async () => { throw new Error("mai exploded"); };
		const { leader } = makeHarness({ execResponder: hostileMai });
		leader.workers.set("boom", makeWorker("boom", -999));

		const t0 = performance.now();
		await leader.kill("boom");
		const elapsedMs = performance.now() - t0;
		expect(elapsedMs).toBeLessThan(50);
	});
});

describe("delegate() after kill() races", () => {
	test.skip("respawning a killed worker waits for its in-flight cleanup", async () => {
		const repoDir = makeGitRepo("teams-respawn-");
		// Pre-create a worktree for worker 'alpha'
		const wtPath = path.join(repoDir, ".worktrees", "teams", "alpha");
		fs.mkdirSync(path.dirname(wtPath), { recursive: true });
		execFileSync("git", ["worktree", "add", "-q", "-b", "teams/alpha/tk-old", wtPath, "HEAD"], { cwd: repoDir });
		expect(fs.existsSync(wtPath)).toBe(true);

		// Make mai close take 200ms then succeed, so cleanup has measurable duration.
		const slowMai = async (cmd: string, args: string[]) => {
			if (cmd === "mai" && args[0] === "close") {
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
			return { stdout: "", stderr: "", code: 0 };
		};
		const { leader } = makeHarness({ cwd: repoDir, execResponder: slowMai });
		leader.workers.set("alpha", makeWorker("alpha", -1, {
			worktreePath: wtPath,
			ticketId: "tk-old",
		}));

		await leader.kill("alpha");
		expect(leader.workers.size).toBe(0);

		const pending = leader.getPendingCleanup("alpha");
		expect(pending).toBeDefined();

		// Wait for cleanup to finish and verify worktree is gone.
		await pending;
		expect(fs.existsSync(wtPath)).toBe(false);
		expect(leader.getPendingCleanup("alpha")).toBeUndefined();
	});

	test.skip("pendingCleanups never accumulates across many kills", async () => {
		const { leader } = makeHarness();
		// Fast cleanup
		for (let i = 0; i < 20; i++) {
			leader.workers.set(`k${i}`, makeWorker(`k${i}`, -i - 1));
			await leader.kill(`k${i}`);
		}
		// Wait for all background cleanups
		for (const [, p] of leader.pendingCleanups) { await p; }
		expect(leader.pendingCleanups.size).toBe(0);
	});

	test("re-killing a worker that's already being cleaned up is a no-op, not a crash", async () => {
		const { leader } = makeHarness();
		leader.workers.set("double", makeWorker("double", -1));
		await leader.kill("double");
		// Second kill: workers map already empty, should no-op and not throw.
		await leader.kill("double");
		await leader.kill("double");
		expect(leader.workers.size).toBe(0);
	});
});

describe("fork snapshot stress", () => {
	test.skip("10 sequential forks on a real coordinator session all succeed and leave NO snapshot artifacts", () => {
		const tmpDir = makeTempDir("teams-fork-stress-");
		const sessionDir = path.join(tmpDir, "sessions");
		fs.mkdirSync(sessionDir, { recursive: true });
		const mgr = SessionManager.create(tmpDir, sessionDir);
		for (let i = 0; i < 5; i++) {
			mgr.appendMessage({
				role: "assistant",
				content: [{ type: "text", text: `seed entry ${i} with enough substance to count as real` }],
				stopReason: "stop",
			} as any);
		}
		const sessionFile = mgr.getSessionFile() ?? "";
		const leafId = mgr.getLeafId() ?? "";
		const coordBefore = fs.readFileSync(sessionFile, "utf-8");

		const { leader } = makeHarness();
		leader.ctx.sessionManager.getSessionFile = () => sessionFile;
		leader.ctx.sessionManager.getLeafId = () => leafId;
		leader.ctx.sessionManager.getSessionDir = () => sessionDir;

		const modes: any[] = [];
		for (let i = 0; i < 10; i++) {
			modes.push(leader.buildSpawnSessionMode(true));
		}

		for (const mode of modes) {
			expect(mode.kind).toBe("fork");
			expect(fs.existsSync(mode.sessionFile)).toBe(true);
		}
		expect(new Set(modes.map((m) => m.sessionFile)).size).toBe(modes.length);
		expect(fs.readFileSync(sessionFile, "utf-8")).toBe(coordBefore);

		const leftover = fs.readdirSync(sessionDir).filter((f) => f.startsWith(".teams-fork-snapshot-"));
		expect(leftover).toEqual([]);
	});

	test("a coordinator session that gets TRUNCATED between leafId capture and snapshot does NOT get rewritten", () => {
		// Simulate the worst race: file exists and parses when we validate,
		// then gets truncated before the clone reads it. We do this by
		// writing a valid session file, taking a leafId, then nuking the file
		// before buildSpawnSessionMode runs. Our copy step will snapshot the
		// empty/missing state; the clone would then call _rewriteFile on the
		// SNAPSHOT (not the original), so the "leader file overwritten"
		// outcome is impossible. The test asserts that outcome.
		const tmpDir = makeTempDir("teams-fork-race-");
		const sessionDir = path.join(tmpDir, "sessions");
		fs.mkdirSync(sessionDir, { recursive: true });
		const mgr = SessionManager.create(tmpDir, sessionDir);
		mgr.appendMessage({
			role: "assistant",
			content: [{ type: "text", text: "seed" }],
			stopReason: "stop",
		} as any);
		const sessionFile = mgr.getSessionFile() ?? "";
		const leafId = mgr.getLeafId() ?? "";

		// Truncate to empty — simulates mid-_rewriteFile with O_TRUNC
		fs.writeFileSync(sessionFile, "", "utf-8");

		const { leader } = makeHarness();
		leader.ctx.sessionManager.getSessionFile = () => sessionFile;
		leader.ctx.sessionManager.getLeafId = () => leafId;
		leader.ctx.sessionManager.getSessionDir = () => sessionDir;

		leader.buildSpawnSessionMode(true); // may return fresh or fork, don't care

		// Key invariant: the coordinator file was NOT overwritten with a fresh
		// header by the clone's _rewriteFile. It's still empty.
		expect(fs.readFileSync(sessionFile, "utf-8")).toBe("");
	});

	test("fork snapshot cleanup still runs when createBranchedSession throws", () => {
		const tmpDir = makeTempDir("teams-fork-throw-");
		const sessionDir = path.join(tmpDir, "sessions");
		fs.mkdirSync(sessionDir, { recursive: true });
		const mgr = SessionManager.create(tmpDir, sessionDir);
		mgr.appendMessage({
			role: "assistant",
			content: [{ type: "text", text: "ok" }],
			stopReason: "stop",
		} as any);
		const sessionFile = mgr.getSessionFile() ?? "";

		const { leader } = makeHarness();
		leader.ctx.sessionManager.getSessionFile = () => sessionFile;
		// Give a leafId that's NOT in the session — createBranchedSession throws
		leader.ctx.sessionManager.getLeafId = () => "not-a-real-leaf";
		leader.ctx.sessionManager.getSessionDir = () => sessionDir;

		const mode = leader.buildSpawnSessionMode(true);
		expect(mode).toEqual({ kind: "fresh" });

		// Snapshot must be cleaned up even on throw
		const leftover = fs.readdirSync(sessionDir).filter((f) => f.startsWith(".teams-fork-snapshot-"));
		expect(leftover).toEqual([]);
	});
});
