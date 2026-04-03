/**
 * Stress test: spawn workers the exact same way teams does and verify
 * every single one creates a session file.
 *
 * This catches the real bug: extensions (like foresight) blocking
 * before_agent_start and preventing session file creation.
 *
 * We don't test full worker completion (that needs real mai tickets).
 * We test the critical path: spawn → extensions load → session created.
 */
import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnWorker } from "./spawner.ts";
import type { SpawnConfig } from "./types.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const cleanupDirs: string[] = [];
const cleanupPids: number[] = [];

function makeTempDir(prefix: string): string {
	const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
	cleanupDirs.push(dir);
	return dir;
}

afterAll(() => {
	for (const pid of cleanupPids.splice(0)) {
		try { process.kill(pid, "SIGKILL"); } catch {}
	}
	// Small delay for processes to actually die before we rm dirs
	Bun.sleepSync(500);
	for (const dir of cleanupDirs.splice(0)) {
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	}
});

/** Wait for a .jsonl file to appear in the session directory. */
async function waitForSessionFile(sessionDir: string, timeoutMs: number): Promise<string | null> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const files = fs.readdirSync(sessionDir).filter(f => f.endsWith(".jsonl"));
			if (files.length > 0) return path.join(sessionDir, files[0]);
		} catch {}
		await Bun.sleep(100);
	}
	return null;
}

function spawnTestWorker(baseDir: string, name: string): ReturnType<typeof spawnWorker> {
	const config: SpawnConfig = {
		workerInstanceId: `stress-${name}-${Date.now()}`,
		ticketId: `stress-tk-${name}`,
		workerName: name,
		useWorktree: false,
		cwd: REPO_ROOT,
		repoRoot: baseDir,
		leaderSessionFile: path.join(baseDir, "leader.jsonl"),
		model: undefined,
		hasTools: false,
		additionalPrompt: "Say exactly 'ok' and nothing else.",
		freeform: false,
	};

	return spawnWorker(config);
}

/**
 * Spawn N workers concurrently, wait for each to create a session file,
 * then kill them all. Returns results for assertions.
 */
async function spawnBatchAndVerify(
	baseDir: string,
	count: number,
	sessionTimeoutMs: number,
): Promise<{ idx: number; hasSession: boolean; elapsedMs: number; stderr: string }[]> {
	const start = Date.now();
	const workers = Array.from({ length: count }, (_, i) => {
		const { process: child, handle } = spawnTestWorker(baseDir, `w${i}`);
		cleanupPids.push(child.pid!);
		return { child, handle, idx: i };
	});

	const results = await Promise.all(workers.map(async ({ child, handle, idx }) => {
		const sessionFile = await waitForSessionFile(handle.sessionDir, sessionTimeoutMs);
		const elapsedMs = Date.now() - start;

		// Kill the worker — we don't need it to complete, just to create a session
		try { child.kill("SIGKILL"); } catch {}

		let stderr = "";
		try { stderr = fs.readFileSync(path.join(handle.sessionDir, "stderr.log"), "utf-8").trim(); } catch {}

		return { idx, hasSession: sessionFile !== null, elapsedMs, stderr };
	}));

	return results;
}

describe("spawn stress — session file creation", () => {

	test("1 worker creates session file", async () => {
		const baseDir = makeTempDir("spawn-stress-1-");
		const results = await spawnBatchAndVerify(baseDir, 1, 30_000);
		expect(results[0].hasSession).toBe(true);
		console.log(`1 worker: session in ${results[0].elapsedMs}ms`);
	}, 45_000);

	test("5 concurrent workers all create session files", async () => {
		const baseDir = makeTempDir("spawn-stress-5-");
		const results = await spawnBatchAndVerify(baseDir, 5, 30_000);

		const failures = results.filter(r => !r.hasSession);
		if (failures.length > 0) {
			console.error("FAILURES:");
			for (const f of failures) console.error(`  w${f.idx}: ${f.stderr.slice(-200)}`);
		}

		const times = results.map(r => r.elapsedMs).sort((a, b) => a - b);
		console.log(`5 workers: all sessions in p50=${times[2]}ms max=${times[4]}ms`);
		expect(failures.length).toBe(0);
	}, 60_000);

	test("10 concurrent workers all create session files", async () => {
		const baseDir = makeTempDir("spawn-stress-10-");
		const results = await spawnBatchAndVerify(baseDir, 10, 30_000);

		const failures = results.filter(r => !r.hasSession);
		if (failures.length > 0) {
			console.error("FAILURES:");
			for (const f of failures) console.error(`  w${f.idx}: ${f.stderr.slice(-200)}`);
		}

		const times = results.map(r => r.elapsedMs).sort((a, b) => a - b);
		console.log(`10 workers: all sessions in p50=${times[4]}ms p90=${times[8]}ms max=${times[9]}ms`);
		expect(failures.length).toBe(0);
	}, 60_000);

	test("20 concurrent workers — max pressure", async () => {
		const baseDir = makeTempDir("spawn-stress-20-");
		const results = await spawnBatchAndVerify(baseDir, 20, 45_000);

		const failures = results.filter(r => !r.hasSession);
		if (failures.length > 0) {
			console.error("FAILURES:");
			for (const f of failures) console.error(`  w${f.idx}: ${f.stderr.slice(-200)}`);
		}

		const times = results.map(r => r.elapsedMs).sort((a, b) => a - b);
		console.log(`20 workers: p50=${times[9]}ms p90=${times[17]}ms p95=${times[18]}ms max=${times[19]}ms`);
		expect(failures.length).toBe(0);
	}, 90_000);

	test("3 sequential batches of 10 — sustained load", async () => {
		for (let batch = 0; batch < 3; batch++) {
			const baseDir = makeTempDir(`spawn-stress-seq-${batch}-`);
			const results = await spawnBatchAndVerify(baseDir, 10, 30_000);

			const failures = results.filter(r => !r.hasSession);
			const times = results.map(r => r.elapsedMs).sort((a, b) => a - b);
			console.log(`batch ${batch + 1}/3: ${10 - failures.length}/10 ok, max=${times[9]}ms`);

			expect(failures.length).toBe(0);
		}
	}, 120_000);
});
