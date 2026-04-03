import type { AttemptId, LeaderEpoch, TeamId, WorkerId, WorkerSessionMode } from "./protocol.ts";

export type WorkerDesiredState = "running" | "stopped";

export type WorkerLifecycleState =
	| "created"
	| "spawning"
	| "running"
	| "finishing"
	| "done"
	| "warning"
	| "failed"
	| "killed"
	| "orphaned"
	| "resumable";

export type WorkerFact =
	| { type: "spawn_requested"; at: number }
	| { type: "spawn_started"; at: number; pid?: number }
	| { type: "session_detected"; at: number; sessionFile: string }
	| { type: "worker_hello"; at: number }
	| { type: "comment_posted"; at: number; text: string }
	| { type: "finish_done"; at: number; summary: string }
	| { type: "finish_quit"; at: number; summary: string }
	| { type: "process_exit"; at: number; exitCode: number | null }
	| { type: "lease_stale"; at: number }
	| { type: "leader_shutdown"; at: number }
	| { type: "resume_attached"; at: number };

export interface WorkerAttemptRecord {
	attemptId: AttemptId;
	workerId: WorkerId;
	leaderEpoch: LeaderEpoch;
	sessionMode: WorkerSessionMode;
	sessionDir: string;
	sessionFile?: string;
	pid?: number;
	startedAt: number;
	endedAt?: number;
	exitCode?: number | null;
	spawnError?: string;
	facts: WorkerFact[];
}

export interface WorkerRecord {
	workerId: WorkerId;
	name: string;
	desiredState: WorkerDesiredState;
	currentAttemptId?: AttemptId;
	lifecycle: WorkerLifecycleState;
	attempts: WorkerAttemptRecord[];
}

export interface TeamRecord {
	teamId: TeamId;
	leaderEpoch: LeaderEpoch;
	createdAt: number;
	workers: Record<WorkerId, WorkerRecord>;
}
