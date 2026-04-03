import type { TeamRecord, WorkerAttemptRecord, WorkerFact, WorkerLifecycleState, WorkerRecord } from "./state.ts";

function classifyLifecycle(attempt: WorkerAttemptRecord): WorkerLifecycleState {
	const facts = attempt.facts;
	if (facts.some((fact) => fact.type === "finish_done")) return "done";
	if (facts.some((fact) => fact.type === "finish_quit")) return "warning";
	const assessed = [...facts].reverse().find((fact) => fact.type === "exit_assessed");
	if (assessed?.type === "exit_assessed") {
		if (assessed.outcome === "success") return "done";
		if (assessed.outcome === "warning") return "warning";
		if (assessed.outcome === "turn_finished") return "resumable";
		if (assessed.outcome === "failed") return "failed";
	}
	if (facts.some((fact) => fact.type === "worker_killed")) return "killed";
	if (facts.some((fact) => fact.type === "lease_stale")) return "orphaned";
	if (facts.some((fact) => fact.type === "process_exit")) return "failed";
	if (facts.some((fact) => fact.type === "worker_hello")) return "running";
	if (facts.some((fact) => fact.type === "spawn_started")) return "spawning";
	return "created";
}

export function appendWorkerFact(worker: WorkerRecord, fact: WorkerFact): WorkerRecord {
	if (!worker.currentAttemptId) return worker;
	return {
		...worker,
		attempts: worker.attempts.map((attempt) =>
			attempt.attemptId === worker.currentAttemptId
				? { ...attempt, facts: [...attempt.facts, fact] }
				: attempt,
		),
	};
}

export function reduceWorkerLifecycle(worker: WorkerRecord): WorkerRecord {
	const currentAttempt = worker.currentAttemptId
		? worker.attempts.find((attempt) => attempt.attemptId === worker.currentAttemptId)
		: worker.attempts.at(-1);
	if (!currentAttempt) return worker;
	return {
		...worker,
		lifecycle: classifyLifecycle(currentAttempt),
	};
}

export function reduceTeam(team: TeamRecord): TeamRecord {
	const workers = Object.fromEntries(
		Object.entries(team.workers).map(([workerId, worker]) => [workerId, reduceWorkerLifecycle(worker)]),
	) as TeamRecord["workers"];
	return { ...team, workers };
}
