import { describe, expect, test } from "bun:test";
import { appendWorkerFact, reduceTeam } from "./reducer.ts";
import type { TeamRecord, WorkerAttemptRecord, WorkerRecord } from "./state.ts";

function createAttempt(overrides: Partial<WorkerAttemptRecord> = {}): WorkerAttemptRecord {
	return {
		attemptId: overrides.attemptId ?? "attempt-1",
		workerId: overrides.workerId ?? "worker-1",
		leaderEpoch: overrides.leaderEpoch ?? "epoch-1",
		sessionMode: overrides.sessionMode ?? { kind: "fork", parentSessionFile: "/tmp/parent.jsonl", parentLeafId: "leaf-1" },
		sessionDir: overrides.sessionDir ?? "/tmp/worker-1",
		startedAt: overrides.startedAt ?? 1,
		facts: overrides.facts ?? [],
		pid: overrides.pid,
		sessionFile: overrides.sessionFile,
		exitCode: overrides.exitCode,
		spawnError: overrides.spawnError,
		endedAt: overrides.endedAt,
	};
}

function createWorker(overrides: Partial<WorkerRecord> = {}): WorkerRecord {
	const attempts = overrides.attempts ?? [createAttempt()];
	return {
		workerId: overrides.workerId ?? "worker-1",
		name: overrides.name ?? "worker",
		desiredState: overrides.desiredState ?? "running",
		currentAttemptId: overrides.currentAttemptId ?? attempts[0]?.attemptId,
		lifecycle: overrides.lifecycle ?? "created",
		attempts,
	};
}

function createTeam(worker: WorkerRecord): TeamRecord {
	return {
		teamId: "team-1",
		leaderEpoch: "epoch-1",
		createdAt: 1,
		workers: {
			[worker.workerId]: worker,
		},
	};
}

describe("teams v2 reducer", () => {
	test("finish_done reduces to done", () => {
		const worker = appendWorkerFact(createWorker(), { type: "finish_done", at: 10, summary: "done" });
		const reduced = reduceTeam(createTeam(worker));
		expect(reduced.workers[worker.workerId]?.lifecycle).toBe("done");
	});

	test("finish_quit reduces to warning", () => {
		const worker = appendWorkerFact(createWorker(), { type: "finish_quit", at: 10, summary: "quit" });
		const reduced = reduceTeam(createTeam(worker));
		expect(reduced.workers[worker.workerId]?.lifecycle).toBe("warning");
	});

	test("lease_stale reduces to orphaned", () => {
		const worker = appendWorkerFact(createWorker(), { type: "lease_stale", at: 10 });
		const reduced = reduceTeam(createTeam(worker));
		expect(reduced.workers[worker.workerId]?.lifecycle).toBe("orphaned");
	});

	test("process_exit without terminal fact reduces to failed", () => {
		const worker = appendWorkerFact(createWorker(), { type: "process_exit", at: 10, exitCode: 1 });
		const reduced = reduceTeam(createTeam(worker));
		expect(reduced.workers[worker.workerId]?.lifecycle).toBe("failed");
	});

	test("worker_hello beats spawning and becomes running", () => {
		let worker = appendWorkerFact(createWorker(), { type: "spawn_started", at: 5, pid: 123 });
		worker = appendWorkerFact(worker, { type: "worker_hello", at: 6 });
		const reduced = reduceTeam(createTeam(worker));
		expect(reduced.workers[worker.workerId]?.lifecycle).toBe("running");
	});
});
