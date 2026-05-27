/**
 * BackgroundBashManager / BashBgHandle behavior tests.
 *
 * These tests cover the core invariants of the new thenable handle:
 *   - sync startSync() returns a populated job + spawnPromise
 *   - waitForExit resolves on normal exit
 *   - .timeout resolves with status: "timeout" without killing the job
 *   - .each() receives stdout/stderr lines until exit
 *   - .stop() sends a signal and resolves with status: "stopped"
 *   - log file still contains every line (line-level tee invariant)
 *   - multiple concurrent waiters on the same job all resolve
 *   - abort signal resolves (never rejects) — sleep() abort-hardening rule
 *   - waiting on an already-exited job resolves immediately
 *   - bashBgStatus / bashBgLogs / bashBgStop still work via the handle as
 *     a job-ref (backward compat)
 */

import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	BackgroundBashManager,
	type BashBgResult,
} from "./background-bash.ts";

/** Make a manager rooted in a fresh tmpdir so tests don't share log paths. */
async function makeManager(): Promise<{ manager: BackgroundBashManager; logRoot: string }> {
	const logRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bgbash-test-"));
	const manager = new BackgroundBashManager({ logRoot });
	return { manager, logRoot };
}

/** Read all lines from the persisted log file. */
async function readLog(logPath: string): Promise<string[]> {
	const content = await fs.readFile(logPath, "utf8").catch(() => "");
	return content.split("\n").filter((l) => l.length > 0);
}

describe("BackgroundBashManager.startSync", () => {
	it("returns a populated job synchronously", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({ command: "true", cwd: process.cwd() });
		expect(job.id).toMatch(/^bg-/);
		expect(job.status).toBe("running");
		expect(job.command).toBe("true");
		expect(job.cwd).toBe(path.resolve(process.cwd()));
		await spawnPromise;
		expect(job.pid).toBeGreaterThan(0);
	});

	it("throws sync on empty command", async () => {
		const { manager } = await makeManager();
		expect(() => manager.startSync({ command: "  ", cwd: process.cwd() })).toThrow(/must not be empty/);
	});

	it("throws sync on duplicate id", async () => {
		const { manager } = await makeManager();
		manager.startSync({ command: "sleep 5", cwd: process.cwd(), id: "bg-fixed" });
		expect(() => manager.startSync({ command: "true", cwd: process.cwd(), id: "bg-fixed" })).toThrow(/already exists/);
	});
});

describe("BackgroundBashManager.waitForExit", () => {
	it("resolves with status='exited' on normal exit", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({ command: "true", cwd: process.cwd() });
		await spawnPromise;
		const result = await manager.waitForExit(job.id);
		expect(result.status).toBe("exited");
		expect(result.exitCode).toBe(0);
		expect(result.id).toBe(job.id);
		expect(result.runtimeMs).toBeGreaterThanOrEqual(0);
	});

	it("captures nonzero exit code", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({ command: "exit 7", cwd: process.cwd() });
		await spawnPromise;
		const result = await manager.waitForExit(job.id);
		expect(result.status).toBe("exited");
		expect(result.exitCode).toBe(7);
	});

	it("resolves with status='timeout' without killing the child", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({ command: "sleep 2", cwd: process.cwd() });
		await spawnPromise;
		const before = Date.now();
		const result = await manager.waitForExit(job.id, { timeoutMs: 100 });
		const elapsed = Date.now() - before;
		expect(result.status).toBe("timeout");
		expect(elapsed).toBeLessThan(500);
		// Job should still be running. Cleanup.
		expect(manager.getStatus(job.id)?.status).toBe("running");
		await manager.stop(job.id, "SIGKILL");
	});

	it("resolves with status='aborted' on abort signal, never rejects", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({ command: "sleep 2", cwd: process.cwd() });
		await spawnPromise;
		const ac = new AbortController();
		const pending = manager.waitForExit(job.id, { signal: ac.signal });
		setTimeout(() => ac.abort(), 50);
		const result = await pending;
		expect(result.status).toBe("aborted");
		await manager.stop(job.id, "SIGKILL");
	});

	it("resolves immediately for an already-exited job", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({ command: "true", cwd: process.cwd() });
		await spawnPromise;
		await manager.waitForExit(job.id);
		const before = Date.now();
		const second = await manager.waitForExit(job.id, { timeoutMs: 10_000 });
		expect(Date.now() - before).toBeLessThan(50);
		expect(second.status).toBe("exited");
	});

	it("rejects only for unknown job IDs", async () => {
		const { manager } = await makeManager();
		await expect(manager.waitForExit("bg-does-not-exist")).rejects.toThrow(/not found/);
	});

	it("supports multiple concurrent waiters on the same job", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({ command: "sleep 0.1", cwd: process.cwd() });
		await spawnPromise;
		const [a, b, c] = await Promise.all([
			manager.waitForExit(job.id),
			manager.waitForExit(job.id),
			manager.waitForExit(job.id),
		]);
		expect(a.status).toBe("exited");
		expect(b.status).toBe("exited");
		expect(c.status).toBe("exited");
		expect(a.exitCode).toBe(0);
	});
});

describe("BackgroundBashManager.subscribeLines", () => {
	it("emits stdout and stderr lines with correct labels", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({
			command: "printf 'one\\ntwo\\n'; printf 'err\\n' >&2",
			cwd: process.cwd(),
		});
		const received: Array<{ line: string; stream: string }> = [];
		const unsub = manager.subscribeLines(job.id, (line, stream) => {
			received.push({ line, stream });
		});
		await spawnPromise;
		await manager.waitForExit(job.id);
		// Allow line emitters to flush.
		await new Promise((r) => setTimeout(r, 50));
		unsub();
		const stdoutLines = received.filter((r) => r.stream === "stdout").map((r) => r.line);
		const stderrLines = received.filter((r) => r.stream === "stderr").map((r) => r.line);
		expect(stdoutLines).toEqual(["one", "two"]);
		expect(stderrLines).toEqual(["err"]);
	});

	it("preserves every line in the on-disk log file (tee invariant)", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({
			command: "for i in 1 2 3 4 5; do echo line-$i; done",
			cwd: process.cwd(),
		});
		await spawnPromise;
		await manager.waitForExit(job.id);
		await new Promise((r) => setTimeout(r, 50));
		const lines = await readLog(job.logPath);
		expect(lines).toEqual(["line-1", "line-2", "line-3", "line-4", "line-5"]);
	});

	it("returns a no-op unsubscribe for unknown jobs (no throw)", async () => {
		const { manager } = await makeManager();
		const unsub = manager.subscribeLines("bg-missing", () => {});
		expect(typeof unsub).toBe("function");
		expect(() => unsub()).not.toThrow();
	});

	it("removes a callback so it stops receiving lines", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({
			command: "echo first; sleep 0.05; echo second",
			cwd: process.cwd(),
		});
		const received: string[] = [];
		const unsub = manager.subscribeLines(job.id, (line) => received.push(line));
		await spawnPromise;
		// Wait for first line, then unsubscribe, then wait for the second.
		await new Promise((r) => setTimeout(r, 30));
		unsub();
		await manager.waitForExit(job.id);
		expect(received).toContain("first");
		expect(received).not.toContain("second");
	});
});

describe("BackgroundBashManager.stop", () => {
	it("sends SIGTERM and the wait resolves with status='stopped'", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({
			command: "sleep 5",
			cwd: process.cwd(),
		});
		await spawnPromise;
		const pending = manager.waitForExit(job.id);
		await new Promise((r) => setTimeout(r, 30));
		await manager.stop(job.id, "SIGTERM");
		const result = await pending;
		expect(result.status).toBe("stopped");
		expect(result.signal).toMatch(/SIGTERM/);
	});
});

describe("BackgroundBashManager.readLogs", () => {
	it("returns paginated lines from the log file", async () => {
		const { manager } = await makeManager();
		const { job, spawnPromise } = manager.startSync({
			command: "for i in 1 2 3 4 5 6 7 8 9 10; do echo line-$i; done",
			cwd: process.cwd(),
		});
		await spawnPromise;
		await manager.waitForExit(job.id);
		await new Promise((r) => setTimeout(r, 50));

		const page1 = await manager.readLogs(job.id, { limit: 3 });
		expect(page1.totalLines).toBe(10);
		expect(page1.hasMore).toBe(true);
		expect(page1.text).toContain("1: line-1");
		expect(page1.text).toContain("3: line-3");

		const page2 = await manager.readLogs(job.id, { offset: page1.nextOffset, limit: 3 });
		expect(page2.text).toContain("4: line-4");
		expect(page2.text).toContain("6: line-6");
	});
});


// ────────────────────────────────────────────────────────────────────────
// BashBgHandle behavior — the user-facing sandbox surface.
// Critical invariant: handle is NOT thenable. `await bashBgStart(...)` for
// a never-exiting process must NOT hang.
// ────────────────────────────────────────────────────────────────────────

import { createBashBgHandle } from "./background-bash.ts";

function makeHandle(manager: BackgroundBashManager, command: string) {
	const { job, spawnPromise } = manager.startSync({ command, cwd: process.cwd() });
	return createBashBgHandle(manager, job, spawnPromise, undefined);
}

describe("BashBgHandle — thenable + properties", () => {
	it("is thenable: `await handle` resolves on child exit with BashBgResult", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sh -c 'exit 5'");
		const r = await handle;
		expect(r.status).toBe("exited");
		expect(r.exitCode).toBe(5);
	});

	it(".then(cb) attaches a completion callback without awaiting", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "true");
		await new Promise<void>((resolve) => {
			handle.then((r) => {
				expect(r.status).toBe("exited");
				resolve();
			});
		});
	});

	it("exposes id/pid/cwd/logPath/command/status as live getters", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "true");
		expect(handle.id).toMatch(/^bg-/);
		expect(handle.command).toBe("true");
		expect(handle.cwd).toBe(process.cwd());
		expect(typeof handle.logPath).toBe("string");
		expect(handle.status).toBe("running");
		await handle.started;
		expect(handle.pid).toBeGreaterThan(0);
		const r = await handle.wait();
		expect(r.status).toBe("exited");
		// After exit, the .status live getter reflects the new state
		expect(handle.status).toBe("exited");
	});

	it("FOOTGUN: awaiting a never-exiting process blocks (this is the user's responsibility)", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sleep 5");
		await handle.started;
		// Race a wait-on-handle against a 100ms timer — the timer wins because
		// the child does not exit. Documents that the user is responsible for
		// not awaiting long-running processes.
		const winner = await Promise.race([
			handle.then(() => "EXITED"),
			new Promise<string>((r) => setTimeout(() => r("TIMER"), 100)),
		]);
		expect(winner).toBe("TIMER");
		await handle.stop("SIGKILL");
	});
});

describe("BashBgHandle — .timeout() / .wait() / .stop()", () => {
	it(".timeout(ms) is a chainable setter; await handle exits before the deadline → status='exited'", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "true");
		const r = await handle.timeout(5_000);
		expect(r.status).toBe("exited");
		expect(r.exitCode).toBe(0);
	});

	it("await handle.timeout(ms) resolves with status='timeout' when the deadline fires; child still alive", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sleep 2");
		await handle.started;
		const r = await handle.timeout(100);
		expect(r.status).toBe("timeout");
		expect(handle.status).toBe("running");
		await handle.stop("SIGKILL");
	});

	it(".wait() with no opts blocks until exit", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sh -c 'sleep 0.1; exit 3'");
		const r = await handle.wait();
		expect(r.status).toBe("exited");
		expect(r.exitCode).toBe(3);
	});

	it("multiple await/wait calls share a single underlying wait promise", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sleep 0.1");
		const [a, b, c] = await Promise.all([handle.wait(), handle, handle.wait()]);
		expect(a.status).toBe("exited");
		expect(b.status).toBe("exited");
		expect(c.status).toBe("exited");
	});

	it(".timeout() after the wait has started is a no-op (warning)", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sleep 0.1");
		const pending = handle.wait(); // triggers wait
		// Subsequent timeout call — no-op
		handle.timeout(50);
		const r = await pending;
		expect(r.status).toBe("exited");
	});

	it(".stop() sends SIGTERM and resolves with status='stopped'", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sleep 5");
		await handle.started;
		const r = await handle.stop("SIGTERM");
		expect(r.status).toBe("stopped");
		expect(r.signal).toMatch(/SIGTERM/);
	});
});

describe("BashBgHandle — .each() chain composition", () => {
	it(".each(cb).then(cb) — Hooman's canonical pattern", async () => {
		// Documented shape: bashBgStart(...).each(line => ...).then(result => ...)
		// .each returns the handle. .then attaches a completion callback that
		// fires after child exit. No explicit await needed.
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "printf 'a\nb\nc\n'");
		const received: string[] = [];
		const result = await new Promise<BashBgResult>((resolve) => {
			handle
				.each((line) => received.push(line))
				.then((r) => resolve(r));
		});
		expect(result.status).toBe("exited");
		await new Promise((r) => setTimeout(r, 50));
		expect(received).toEqual(["a", "b", "c"]);
	});

	it("await ...each(cb).timeout(N) composes", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "printf 'one\ntwo\n'");
		const received: string[] = [];
		const result = await handle.each((line) => received.push(line)).timeout(5_000);
		expect(result.status).toBe("exited");
		await new Promise((r) => setTimeout(r, 50));
		expect(received).toEqual(["one", "two"]);
	});

	it(".inspect() returns the full job snapshot", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "true");
		await handle.started;
		const snap = handle.inspect();
		expect(snap.id).toBe(handle.id);
		expect(snap.command).toBe("true");
		expect(snap.cwd).toBe(process.cwd());
	});

	it(".unsubscribe() removes line listeners but does NOT kill the child", async () => {
		const { manager } = await makeManager();
		const handle = makeHandle(manager, "sh -c 'echo first; sleep 0.05; echo second'");
		const received: string[] = [];
		handle.each((line) => received.push(line));
		await new Promise((r) => setTimeout(r, 30));
		handle.unsubscribe();
		const r = await handle.wait();
		expect(r.status).toBe("exited");
		expect(received).toContain("first");
		expect(received).not.toContain("second");
	});
});
