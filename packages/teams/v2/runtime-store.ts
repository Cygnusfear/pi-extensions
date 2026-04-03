import type { TeamRecord, WorkerAttemptRecord, WorkerFact, WorkerRecord } from "./state.ts";
import type { WorkerSessionMode } from "./protocol.ts";
import { reduceTeam } from "./reducer.ts";

export function createTeamRecord(teamId: string, leaderEpoch: string): TeamRecord {
	return {
		teamId,
		leaderEpoch,
		createdAt: Date.now(),
		workers: {},
	};
}

export function upsertWorker(team: TeamRecord, input: {
	workerId: string;
	name: string;
	attemptId: string;
	sessionMode: WorkerSessionMode;
	sessionDir: string;
	sessionFile?: string;
	pid?: number;
	startedAt: number;
}): TeamRecord {
	const existing = team.workers[input.workerId];
	const nextAttempt: WorkerAttemptRecord = {
		attemptId: input.attemptId,
		workerId: input.workerId,
		leaderEpoch: team.leaderEpoch,
		sessionMode: input.sessionMode,
		sessionDir: input.sessionDir,
		sessionFile: input.sessionFile,
		pid: input.pid,
		startedAt: input.startedAt,
		facts: [],
	};
	const nextWorker: WorkerRecord = existing
		? {
				...existing,
				name: input.name,
				currentAttemptId: input.attemptId,
				attempts: [...existing.attempts, nextAttempt],
			}
		: {
				workerId: input.workerId,
				name: input.name,
				desiredState: "running",
				currentAttemptId: input.attemptId,
				lifecycle: "created",
				attempts: [nextAttempt],
			};
	return reduceTeam({
		...team,
		workers: {
			...team.workers,
			[input.workerId]: nextWorker,
		},
	});
}

export function appendFact(team: TeamRecord, workerId: string, fact: WorkerFact): TeamRecord {
	const worker = team.workers[workerId];
	if (!worker || !worker.currentAttemptId) return team;
	const nextWorker: WorkerRecord = {
		...worker,
		attempts: worker.attempts.map((attempt) =>
			attempt.attemptId === worker.currentAttemptId
				? { ...attempt, facts: [...attempt.facts, fact] }
				: attempt,
		),
	};
	return reduceTeam({
		...team,
		workers: {
			...team.workers,
			[workerId]: nextWorker,
		},
	});
}
