import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isReviveDescriptor } from "@pi-extensions/shared/revive-descriptor";
import {
	buildLeaderLeasePath,
	commitActivationLease,
	readActivationLease,
	releaseActivationLease,
	tryAcquireActivationLease,
} from "./lease.ts";
import { buildWorkerLaunchEnvironment, createWorkerSpawnDependencies, resumeWorker, spawnWorker } from "./spawner.ts";
import type { SpawnConfig, WorkerHandle } from "./types.ts";

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

function fakePiDependencies(piPath: string) {
	return createWorkerSpawnDependencies({
		resolve: () => ({ kind: "resolved" as const, executable: { path: piPath, source: "PATH" as const } }),
	});
}

function resumeConfig(dir: string, file: string): SpawnConfig {
	return {
		workerId: "w1",
		workerInstanceId: "w1",
		ticketId: "tk-1",
		workerName: "lock-worker",
		useWorktree: false,
		cwd: dir,
		repoRoot: dir,
		sessionDir: dir,
		leaderSessionFile: path.join(dir, "leader.jsonl"),
		sessionMode: { kind: "resume", sessionFile: file },
	};
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


function tempDirForProjection(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spawner-env-projection-"));
	cleanupDirs.push(dir);
	return dir;
}

describe("worker launch environment projection", () => {
	test("projects the complete typed contract and rejects the entire inherited Teams namespace", () => {
		const dir = tempDirForProjection();
		const file = path.join(dir, "session.jsonl");
		const inherited = {
			PATH: "/safe/bin",
			LANG: "en_US.UTF-8",
			NON_TEAMS_SENTINEL: "retained",
			PI_TEAMS_WORKER: "0",
			PI_TEAMS_COORDINATOR_SESSION_ID: "stale-session",
			PI_TEAMS_COORDINATOR_ID: "stale-mesh",
			PI_TEAMS_COORDINATOR_SESSION_NAME: "Stale Session",
			PI_TEAMS_COORDINATOR_NICKNAME: "Stale Nick",
			PI_TEAMS_COORDINATOR_FUTURE: "stale-future-provenance",
			PI_TEAMS_FUTURE: "stale-future-behavior",
			PI_TEAMS_FREEFORM: "1",
			PI_TEAMS_HAS_TOOLS: "1",
			PI_TEAMS_WORKER_HEARTBEAT_MS: "999999",
			PI_TEAMS_REVIVE_DESCRIPTOR: "/stale/revive-descriptor.json",
		};
		const config: SpawnConfig = {
			...resumeConfig(dir, file),
			teamId: "team-current",
			leaderEpoch: "epoch-current",
			coordinatorSessionId: "current-session",
			coordinatorMeshId: "current-mesh",
			coordinatorSessionName: "Current Session",
			coordinatorNickname: "Current Nick",
			ticketCwd: "/current/ticket-cwd",
			freeform: true,
			hasTools: true,
		};
		const current = buildWorkerLaunchEnvironment(config, inherited);
		expect(current).toMatchObject({
			PATH: "/safe/bin",
			LANG: "en_US.UTF-8",
			NON_TEAMS_SENTINEL: "retained",
			PI_TEAMS_LAUNCH_CONTRACT_VERSION: "1",
			PI_TEAMS_WORKER: "1",
			PI_TEAMS_WORKER_ID: "w1",
			PI_TEAMS_WORKER_INSTANCE_ID: "w1",
			PI_TEAMS_TICKET_ID: "tk-1",
			PI_TEAMS_LEADER_SESSION: path.join(dir, "leader.jsonl"),
			PI_TEAMS_WORKER_NAME: "lock-worker",
			PI_TEAMS_LEASE_FILE: buildLeaderLeasePath(path.join(dir, "leader.jsonl")),
			PI_TEAMS_TEAM_ID: "team-current",
			PI_TEAMS_LEADER_EPOCH: "epoch-current",
			PI_TEAMS_COORDINATOR_SESSION_ID: "current-session",
			PI_TEAMS_COORDINATOR_ID: "current-mesh",
			PI_TEAMS_COORDINATOR_SESSION_NAME: "Current Session",
			PI_TEAMS_COORDINATOR_NICKNAME: "Current Nick",
			PI_TEAMS_TICKET_CWD: "/current/ticket-cwd",
			PI_TEAMS_FREEFORM: "1",
			PI_TEAMS_HAS_TOOLS: "1",
			PI_TEAMS_SESSION_MODE: JSON.stringify({ kind: "resume", sessionFile: file }),
		});
		expect(Object.keys(current).filter((key) => key.startsWith("PI_TEAMS_")).sort()).toEqual([
			"PI_TEAMS_LAUNCH_CONTRACT_VERSION",
			"PI_TEAMS_WORKER",
			"PI_TEAMS_WORKER_ID",
			"PI_TEAMS_WORKER_INSTANCE_ID",
			"PI_TEAMS_TICKET_ID",
			"PI_TEAMS_LEADER_SESSION",
			"PI_TEAMS_WORKER_NAME",
			"PI_TEAMS_LEASE_FILE",
			"PI_TEAMS_TEAM_ID",
			"PI_TEAMS_LEADER_EPOCH",
			"PI_TEAMS_COORDINATOR_SESSION_ID",
			"PI_TEAMS_COORDINATOR_ID",
			"PI_TEAMS_COORDINATOR_SESSION_NAME",
			"PI_TEAMS_COORDINATOR_NICKNAME",
			"PI_TEAMS_TICKET_CWD",
			"PI_TEAMS_FREEFORM",
			"PI_TEAMS_HAS_TOOLS",
			"PI_TEAMS_SESSION_MODE",
		].sort());

		const nested = buildWorkerLaunchEnvironment({
			...resumeConfig(dir, file),
			coordinatorSessionId: "nested-session",
			hasTools: false,
			freeform: false,
			sessionMode: undefined,
		}, inherited);
		expect(nested).toMatchObject({
			PATH: "/safe/bin",
			LANG: "en_US.UTF-8",
			NON_TEAMS_SENTINEL: "retained",
			PI_TEAMS_LAUNCH_CONTRACT_VERSION: "1",
			PI_TEAMS_WORKER: "1",
			PI_TEAMS_COORDINATOR_SESSION_ID: "nested-session",
		});
		for (const key of [
			"PI_TEAMS_COORDINATOR_ID",
			"PI_TEAMS_COORDINATOR_SESSION_NAME",
			"PI_TEAMS_COORDINATOR_NICKNAME",
			"PI_TEAMS_COORDINATOR_FUTURE",
			"PI_TEAMS_FUTURE",
			"PI_TEAMS_HAS_TOOLS",
			"PI_TEAMS_FREEFORM",
			"PI_TEAMS_WORKER_HEARTBEAT_MS",
			"PI_TEAMS_REVIVE_DESCRIPTOR",
		]) expect(nested[key]).toBeUndefined();
	});
});
describe("resumeWorker — per-worker activation lock (part C)", () => {
	test("REFUSES a resume when a LIVE incarnation already holds the activation lease", () => {
		const { dir, file } = tmpSession();
		// Simulate an already-live incarnation holding the lease (this process is alive).
		const held = tryAcquireActivationLease(file);
		expect(held.acquired).toBe(true);
		commitActivationLease(file, held.epoch!, process.pid);

		const result = resumeWorker(makeHandle(dir, file), "resume message", resumeConfig(dir, file));

		expect(result.kind).toBe("refused"); // refused — no second Pi process spawned
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
			const deps = fakePiDependencies(path.join(binDir, "pi"));
			const a = resumeWorker(makeHandle(dir, file), "msg-a", resumeConfig(dir, file), deps, fullEnv);
			const b = resumeWorker(makeHandle(dir, file), "msg-b", resumeConfig(dir, file), deps, fullEnv);
			const spawned = [a, b].filter((result) => result.kind === "started");
			expect(spawned).toHaveLength(1); // one wins, one refuses → session.jsonl intact
			for (const result of spawned) if (result.process.pid) cleanupPids.push(result.process.pid);
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
			const result = resumeWorker(
				makeHandle(dir, file),
				"msg",
				{ ...resumeConfig(dir, file), coordinatorSessionId: "coord-session", coordinatorMeshId: "coord-durable-id", coordinatorSessionName: "Coordinator Session", coordinatorNickname: "Canonical Coordinator" },
				fakePiDependencies(path.join(binDir, "pi")),
				{ ...process.env, PI_TEAMS_COORDINATOR_SESSION_ID: "stale-session", PI_TEAMS_COORDINATOR_ID: "stale-id", PI_TEAMS_COORDINATOR_SESSION_NAME: "Stale Session", PI_TEAMS_COORDINATOR_NICKNAME: "Stale Nick" },
			);
			expect(result.kind).toBe("started");
			if (result.kind !== "started") throw new Error("expected started resume");
			if (result.process.pid) cleanupPids.push(result.process.pid);

			// Descriptor written next to the session file, valid, with coordinator supervisor.
			const desc = JSON.parse(fs.readFileSync(path.join(dir, "revive-descriptor.json"), "utf-8"));
			expect(isReviveDescriptor(desc)).toBe(true);
			expect(desc.command).toBe(path.join(binDir, "pi"));
			expect(desc.args).toContain("--session");
			expect(desc.args).toContain(file);
			expect(desc.supervisors).toEqual(["coord-durable-id"]);
			expect(desc.env.PI_TEAMS_LAUNCH_CONTRACT_VERSION).toBe("1");
			expect(desc.env.PI_TEAMS_WORKER).toBe("1");
			expect(desc.env.PI_TEAMS_WORKER_ID).toBe("w1");
			expect(desc.env.PI_TEAMS_TICKET_ID).toBe("tk-1");
			expect(desc.env.PI_TEAMS_COORDINATOR_SESSION_NAME).toBe("Coordinator Session");
			expect(desc.env.PI_TEAMS_COORDINATOR_NICKNAME).toBe("Canonical Coordinator");
			expect(desc.env.PI_TEAMS_COORDINATOR_SESSION_ID).toBe("coord-session");
			expect(desc.env.PI_TEAMS_COORDINATOR_ID).toBe("coord-durable-id");

			// Lease committed to the live child pid.
			const lease = readActivationLease(file);
			expect(lease!.workerPid).toBe(result.process.pid);
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
