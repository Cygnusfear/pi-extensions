import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isReviveDescriptor } from "@pi-extensions/shared/revive-descriptor";
import {
	commitActivationLease,
	readActivationLease,
	releaseActivationLease,
	tryAcquireActivationLease,
} from "./lease.ts";
import { resumeWorker, spawnWorker } from "./spawner.ts";
import type { WorkerHandle } from "./types.ts";

const cleanupDirs: string[] = [];
const cleanupPids: number[] = [];
const cleanupLeases: string[] = [];

function tmpSession(): { dir: string; file: string } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spawner-activation-"));
	cleanupDirs.push(dir);
	const file = path.join(dir, "session.jsonl");
	fs.writeFileSync(file, "");
	cleanupLeases.push(file);
	return { dir, file };
}

function makeFakePi(binDir: string, invocationLog: string) {
	fs.mkdirSync(binDir, { recursive: true });
	fs.writeFileSync(
		path.join(binDir, "pi"),
		`#!/bin/sh\nprintf '%s\\n' "$@" >> ${JSON.stringify(invocationLog)}\nsleep 30\n`,
		{ mode: 0o755 },
	);
}

function makeHandle(dir: string, file: string): WorkerHandle {
	return {
		workerInstanceId: "w1",
		name: "lock-worker",
		pid: 999991,
		ticketId: "tk-1",
		ticketStatus: "open",
		sessionDir: dir,
		sessionFile: file,
		worktreePath: null,
		model: "anthropic/claude-sonnet-4-6",
		status: "grace",
		spawnedAt: Date.now() - 1000,
		lastActivityAt: Date.now() - 1000,
		lastProcessActivityAt: Date.now() - 1000,
		hasActiveChildProcess: false,
		activeChildProcessCount: 0,
		lastSeenCommentCount: 0,
		routeState: "resumable",
	};
}

afterEach(() => {
	for (const pid of cleanupPids.splice(0)) {
		try { process.kill(-pid, "SIGKILL"); } catch {}
		try { process.kill(pid, "SIGKILL"); } catch {}
	}
	for (const dir of cleanupDirs.splice(0)) {
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	}
	for (const f of cleanupLeases.splice(0)) {
		const rec = readActivationLease(f);
		if (rec) releaseActivationLease(f, rec.epoch);
	}
});

describe("resumeWorker — per-worker activation lock (part C)", () => {
	test("REFUSES a resume when a LIVE incarnation already holds the activation lease", () => {
		const { dir, file } = tmpSession();
		// Simulate an already-live incarnation holding the lease (this process is alive).
		const held = tryAcquireActivationLease(file);
		expect(held.acquired).toBe(true);
		commitActivationLease(file, held.epoch!, process.pid);

		const child = resumeWorker(makeHandle(dir, file), "resume message", {});
		expect(child).toBeNull(); // refused — no second `pi --session` spawned
		// The original lease is untouched (single live incarnation preserved).
		expect(readActivationLease(file)!.workerPid).toBe(process.pid);
	});

	test("two CONCURRENT resumes → exactly one spawns, the other is refused", () => {
		const { dir, file } = tmpSession();
		const binDir = path.join(dir, "bin");
		makeFakePi(binDir, path.join(dir, "pi-invocation.log"));
		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;
		try {
			const fullEnv = { ...process.env } as Record<string, string>;
			const a = resumeWorker(makeHandle(dir, file), "msg-a", fullEnv);
			const b = resumeWorker(makeHandle(dir, file), "msg-b", fullEnv);
			const spawned = [a, b].filter((c): c is NonNullable<typeof c> => c !== null);
			expect(spawned).toHaveLength(1); // one wins, one refuses → session.jsonl intact
			for (const c of spawned) if (c.pid) cleanupPids.push(c.pid);
		} finally {
			process.env.PATH = originalPath;
		}
	});

	test("a successful resume writes the revive descriptor (ADD-1) + commits the lease", () => {
		const { dir, file } = tmpSession();
		const binDir = path.join(dir, "bin");
		makeFakePi(binDir, path.join(dir, "pi-invocation.log"));
		const originalPath = process.env.PATH ?? "";
		process.env.PATH = `${binDir}:${originalPath}`;
		try {
			const child = resumeWorker(makeHandle(dir, file), "msg", { ...process.env, PI_TEAMS_COORDINATOR_ID: "coord-durable-id", PI_TEAMS_TICKET_ID: "tk-1" } as Record<string, string>);
			expect(child).not.toBeNull();
			if (child?.pid) cleanupPids.push(child.pid);

			// Descriptor written next to the session file, valid, with coordinator supervisor.
			const desc = JSON.parse(fs.readFileSync(path.join(dir, "revive-descriptor.json"), "utf-8"));
			expect(isReviveDescriptor(desc)).toBe(true);
			expect(desc.command).toBe("pi");
			expect(desc.args).toContain("--session");
			expect(desc.args).toContain(file);
			expect(desc.supervisors).toEqual(["coord-durable-id"]);
			expect(desc.env.PI_TEAMS_TICKET_ID).toBe("tk-1");

			// Lease committed to the live child pid.
			const lease = readActivationLease(file);
			expect(lease!.workerPid).toBe(child!.pid);
		} finally {
			process.env.PATH = originalPath;
		}
	});
});


describe("adopt activation path", () => {
	test("spawnWorker refuses adopt mode before any session side effect", () => {
		const { dir, file } = tmpSession();
		const logDir = path.join(dir, "logs");
		expect(() => spawnWorker({
			workerId: "adopt-worker",
			workerInstanceId: "adopt-attempt",
			ticketId: "pe-adopt",
			workerName: "adopted",
			useWorktree: false,
			cwd: dir,
			repoRoot: dir,
			sessionDir: logDir,
			leaderSessionFile: path.join(dir, "leader.jsonl"),
			sessionMode: { kind: "adopt", sessionFile: file, sessionId: "source-session" },
		})).toThrow("must be activated through resumeWorker");
		expect(fs.existsSync(logDir)).toBe(false);
	});
});
