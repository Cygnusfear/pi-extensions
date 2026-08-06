import { afterEach, describe, expect, test } from "bun:test";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readActivationLease } from "./lease.ts";
import {
	createPiExecutableResolver,
	createWorkerSpawnDependencies,
	resumeWorker,
	spawnWorker,
} from "./spawner.ts";
import type { SpawnConfig, WorkerHandle } from "./types.ts";

const cleanupDirs: string[] = [];

function tempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pe-52ei8nq4-"));
	cleanupDirs.push(dir);
	return dir;
}

function workerHandle(dir: string, sessionFile: string): WorkerHandle {
	return {
		workerId: "logical-worker",
		workerInstanceId: "resume-attempt",
		name: "resume-worker",
		pid: 424242,
		ticketId: "pe-52ei8nq4",
		sessionDir: dir,
		sessionFile,
		worktreePath: null,
		status: "grace",
		spawnedAt: 1,
		lastActivityAt: 1,
		lastProcessActivityAt: 1,
		hasActiveChildProcess: false,
		activeChildProcessCount: 0,
		lastSeenCommentCount: 0,
		routeState: "resumable",
		attempts: [],
	};
}

function freshConfig(root: string): SpawnConfig {
	return {
		workerId: "fresh-worker",
		workerInstanceId: "fresh-attempt",
		ticketId: "pe-52ei8nq4",
		workerName: "fresh-worker",
		useWorktree: false,
		cwd: root,
		repoRoot: root,
		sessionDir: path.join(root, "worker-session"),
		leaderSessionFile: path.join(root, "leader.jsonl"),
	};
}

function resumeConfig(root: string, handle: WorkerHandle, sessionFile: string): SpawnConfig {
	return {
		...freshConfig(root),
		workerId: handle.workerId,
		workerInstanceId: handle.workerInstanceId,
		ticketId: handle.ticketId,
		workerName: handle.name,
		cwd: root,
		sessionDir: handle.sessionDir,
		sessionMode: { kind: "resume", sessionFile },
	};
}

function unavailableDependencies(root: string) {
	return createWorkerSpawnDependencies(createPiExecutableResolver({
		env: { PATH: path.join(root, "no-pi-on-path") },
		argv: [],
		homeDir: path.join(root, "home-without-bun"),
	}));
}

function resolvedDependencies(executable: string, spawnProcess: typeof import("node:child_process").spawn) {
	return createWorkerSpawnDependencies(createPiExecutableResolver({
		env: { PI_BIN: executable, PATH: "" },
		argv: [],
		homeDir: path.dirname(executable),
	}), spawnProcess);
}

function writeExecutable(file: string): void {
	fs.writeFileSync(file, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
}

afterEach(() => {
	for (const dir of cleanupDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("Pi worker launch boundary — pe-52ei8nq4", () => {
	test("PATH without pi fails fresh and resume as typed failures without changing persisted session history", () => {
		const root = tempDir();
		const sessionFile = path.join(root, "stopped-session.jsonl");
		const originalHistory = "{\"type\":\"session\",\"id\":\"preserved\"}\n";
		fs.writeFileSync(sessionFile, originalHistory);
		const dependencies = unavailableDependencies(root);

		const fresh = spawnWorker(freshConfig(root), dependencies);
		expect(fresh.kind).toBe("failed");
		if (fresh.kind === "failed") expect(fresh.failure.kind).toBe("pi-unavailable");
		expect(fs.existsSync(path.join(root, "worker-session"))).toBe(false);

		const handle = workerHandle(root, sessionFile);
		const resumed = resumeWorker(handle, "ambient team chat", resumeConfig(root, handle, sessionFile), dependencies, { PATH: path.join(root, "no-pi-on-path") });
		expect(resumed.kind).toBe("failed");
		if (resumed.kind === "failed") expect(resumed.failure.kind).toBe("pi-unavailable");
		expect(fs.readFileSync(sessionFile, "utf8")).toBe(originalHistory);
		expect(handle.attempts).toEqual([]);
		expect(readActivationLease(sessionFile)).toBeNull();
	});


	test("fresh recruit and resume share one absolute Pi CLI capability resolved from custom PATH", async () => {
		const root = tempDir();
		const binDir = path.join(root, "custom-bin");
		fs.mkdirSync(binDir);
		const executable = path.join(binDir, "pi");
		writeExecutable(executable);
		const dependencies = createWorkerSpawnDependencies(createPiExecutableResolver({
			env: { PATH: binDir },
			argv: [],
			homeDir: path.join(root, "home-without-bun"),
		}));

		const config = { ...freshConfig(root), coordinatorSessionId: "coord-session", coordinatorMeshId: "coord-durable-id", coordinatorSessionName: "Coordinator Session", coordinatorNickname: "Canonical Coordinator" };
		const fresh = spawnWorker(config, dependencies);
		expect(fresh.kind).toBe("started");
		if (fresh.kind !== "started") throw new Error("expected fresh launch");
		const stoppedSession = path.join(root, "stopped-session.jsonl");
		fs.writeFileSync(stoppedSession, "{\"type\":\"session\",\"id\":\"resume\"}\n");
		const resumeHandle = workerHandle(root, stoppedSession);
		const resumed = resumeWorker(
			resumeHandle,
			"ambient team chat",
			{ ...config, workerId: resumeHandle.workerId, workerInstanceId: resumeHandle.workerInstanceId, workerName: resumeHandle.name, sessionDir: root, sessionMode: { kind: "resume", sessionFile: stoppedSession } },
			dependencies,
			{
					PATH: path.join(root, "deliberately-empty-child-path"),
					PI_TEAMS_COORDINATOR_SESSION_ID: "stale-session",
					PI_TEAMS_COORDINATOR_ID: "stale-id",
					PI_TEAMS_COORDINATOR_SESSION_NAME: "Stale Session",
					PI_TEAMS_COORDINATOR_NICKNAME: "Stale Nick",
					PI_TEAMS_COORDINATOR_FUTURE: "stale-future-provenance",
					PI_TEAMS_FUTURE: "stale-future-behavior",
					PI_TEAMS_FREEFORM: "1",
					PI_TEAMS_HAS_TOOLS: "1",
				},
		);
		expect(resumed.kind).toBe("started");
		if (resumed.kind !== "started") throw new Error("expected resume launch");
		await Bun.sleep(20);

		const freshDescriptor = JSON.parse(fs.readFileSync(path.join(root, "worker-session", "revive-descriptor.json"), "utf8"));
		const resumeDescriptor = JSON.parse(fs.readFileSync(path.join(root, "revive-descriptor.json"), "utf8"));
		expect(freshDescriptor.command).toBe(executable);
		expect(resumeDescriptor.command).toBe(executable);
		expect(freshDescriptor.env.PI_TEAMS_COORDINATOR_SESSION_NAME).toBe("Coordinator Session");
		expect(freshDescriptor.env.PI_TEAMS_COORDINATOR_NICKNAME).toBe("Canonical Coordinator");
		expect(resumeDescriptor.env.PI_TEAMS_COORDINATOR_SESSION_NAME).toBe("Coordinator Session");
		expect(resumeDescriptor.env.PI_TEAMS_COORDINATOR_NICKNAME).toBe("Canonical Coordinator");
		expect(freshDescriptor.env.PI_TEAMS_COORDINATOR_SESSION_ID).toBe("coord-session");
		expect(freshDescriptor.env.PI_TEAMS_COORDINATOR_ID).toBe("coord-durable-id");
		expect(resumeDescriptor.env.PI_TEAMS_COORDINATOR_SESSION_ID).toBe("coord-session");
		expect(resumeDescriptor.env.PI_TEAMS_COORDINATOR_ID).toBe("coord-durable-id");
		expect(freshDescriptor.env.PI_TEAMS_LAUNCH_CONTRACT_VERSION).toBe("1");
		expect(resumeDescriptor.env.PI_TEAMS_LAUNCH_CONTRACT_VERSION).toBe("1");
		expect(freshDescriptor.env.PI_TEAMS_WORKER).toBe("1");
		expect(resumeDescriptor.env.PI_TEAMS_WORKER).toBe("1");
		expect(freshDescriptor.env.PI_TEAMS_WORKER_ID).toBe("fresh-worker");
		expect(resumeDescriptor.env.PI_TEAMS_WORKER_ID).toBe("logical-worker");
		for (const descriptor of [freshDescriptor, resumeDescriptor]) {
			expect(descriptor.env.PI_TEAMS_COORDINATOR_FUTURE).toBeUndefined();
			expect(descriptor.env.PI_TEAMS_FUTURE).toBeUndefined();
			expect(descriptor.env.PI_TEAMS_FREEFORM).toBeUndefined();
			expect(descriptor.env.PI_TEAMS_HAS_TOOLS).toBeUndefined();
		}
	});

	test("contains Bun-style synchronous launcher throws as a typed terminal candidate", () => {
		const root = tempDir();
		const sessionFile = path.join(root, "stopped-session.jsonl");
		const originalHistory = "{\"type\":\"session\",\"id\":\"sync-preserved\"}\n";
		fs.writeFileSync(sessionFile, originalHistory);
		const executable = path.join(root, "pi");
		writeExecutable(executable);
		const syncThrow = (() => { throw new Error("posix_spawn ENOENT"); }) as unknown as typeof import("node:child_process").spawn;

		const handle = workerHandle(root, sessionFile);
		const result = resumeWorker(handle, "ambient team chat", resumeConfig(root, handle, sessionFile), resolvedDependencies(executable, syncThrow));
		expect(result.kind).toBe("failed");
		if (result.kind === "failed") {
			expect(result.failure.kind).toBe("spawn-threw");
			expect(result.failure.message).toContain("posix_spawn ENOENT");
		}
		expect(fs.readFileSync(sessionFile, "utf8")).toBe(originalHistory);
		expect(readActivationLease(sessionFile)).toBeNull();
	});

	test("contains Node-style asynchronous child error and releases the tentative activation lease", async () => {
		const root = tempDir();
		const sessionFile = path.join(root, "stopped-session.jsonl");
		fs.writeFileSync(sessionFile, "{\"type\":\"session\",\"id\":\"async-preserved\"}\n");
		const executable = path.join(root, "pi");
		writeExecutable(executable);
		const child = Object.assign(new EventEmitter(), { pid: 424243 }) as unknown as ChildProcess;
		const asyncError = (() => {
			queueMicrotask(() => child.emit("error", new Error("ENOENT from Node child error event")));
			return child;
		}) as unknown as typeof import("node:child_process").spawn;

		const handle = workerHandle(root, sessionFile);
		const result = resumeWorker(handle, "ambient team chat", resumeConfig(root, handle, sessionFile), resolvedDependencies(executable, asyncError));
		expect(result.kind).toBe("started");
		if (result.kind !== "started") throw new Error("expected asynchronous launch to start before its error event");
		const failures: string[] = [];
		result.onFailure((failure) => failures.push(`${failure.kind}: ${failure.message}`));
		await Bun.sleep(0);

		expect(failures).toEqual(["spawn-error: ENOENT from Node child error event"]);
		expect(readActivationLease(sessionFile)).toBeNull();
		expect(handle.activationEpoch).toBeUndefined();
		expect(fs.readFileSync(sessionFile, "utf8")).toContain("async-preserved");
	});
});
