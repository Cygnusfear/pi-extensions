
import type { SessionPhaseEvent } from "@pi-extensions/shared/session-phase-event";
import type { WorkerSessionMode } from "./v2/protocol.ts";
import type { StuckCause } from "./v2/state.ts";
import type { SessionActivityScanState } from "./activity.ts";

export interface WorkerAttempt {
	workerId: string;
	workerInstanceId: string;
	pid: number;
	sessionDir: string;
	sessionFile: string;
	spawnedAt: number;
	sessionMode?: WorkerSessionMode;
	exitCode?: number | null;
	spawnError?: string;
}

export interface WorkerHandle {
	/** Stable logical worker/session identity. Display name is never an identity key. */
	workerId: string;
	workerInstanceId: string;
	name: string;
	pid: number;
	ticketId: string;
	ticketStatus?: string;
	lastNote?: string;
	sessionDir: string;
	sessionFile: string;
	worktreePath: string | null;
	model?: string;
	hasTools?: boolean;
	status: WorkerStatus;
	spawnedAt: number;
	lastActivityAt: number;
	lastProcessActivityAt: number;
	/** Last meaningful agent/session output; excludes heartbeats, hello, phase, and process telemetry. */
	lastOutputAt?: number;
	lastOutputLabel?: string;
	lastSessionMtimeMs?: number;
	/** Runtime-only bounded scanner checkpoint; reconstructible from the session JSONL. */
	sessionActivityScanState?: SessionActivityScanState;
	/** True only when recovery is complete and no partial/backlogged record can hide progress. */
	meaningfulActivityKnown?: boolean;
	hasActiveChildProcess: boolean;
	activeChildProcessCount: number;
	currentCommand?: string;
	currentCommandElapsedSeconds?: number;
	lastSeenCommentCount: number;
	lastStuckWarningAt?: number;
	exitCode?: number | null;
	/** Diagnostic re-check counter for the Bun premature child-exit workaround.
	 *  Unbounded by design: the re-check runs until an observation confirms the
	 *  incarnation is gone, however long that takes. */
	exitRecheckAttempts?: number;
	spawnError?: string;
	attempts?: WorkerAttempt[];
	nickname?: string;
	durableMeshId?: string;
	routeState: WorkerRouteState;
	/** Explicit terminal status DECLARED by the worker via team_finish, captured from the
	 *  durable mesh worker.finish tell on receipt. This is the authoritative terminal source
	 *  read by assessWorkerExit — it replaces the retired heartbeat `worker_terminal` entry
	 *  (explicit-over-inference, per the ADR). */
	terminalStatus?: "done" | "quit";
	terminalSummary?: string;
	freeform?: boolean;
	recoveryAttempts?: number;
	/** Original spawn config — retained so startup-death can respawn from scratch. */
	spawnConfig?: SpawnConfig;
	/** v1c activation lease: the epoch of the CURRENT live incarnation's lease
	 *  (single-activation authority) + the session file it is keyed by. Set on
	 *  spawn/resume, released on exit. */
	activationEpoch?: string;
	activationSessionFile?: string;
	doneAt?: number;
	graceAt?: number;
	resumableUntilAt?: number;
	killedAt?: number;
}

export type WorkerStatus = "spawning" | "running" | "done" | "warning" | "failed" | "killed" | "grace";
export type WorkerRouteState = "pending" | "linked" | "resumable" | "dead";

/** Delay after a persistent worker exits before entering "grace" (resumable) state. */
const doneGraceMs = Number(process.env.PI_TEAMS_DONE_GRACE_MS ?? "20000");
export const DONE_GRACE_MS =
	Number.isFinite(doneGraceMs) && doneGraceMs >= 0 ? Math.floor(doneGraceMs) : 20_000;

/** Maximum time a persistent worker can remain resumable after finishing. */
const resumableWindowMs = Number(process.env.PI_TEAMS_RESUMABLE_WINDOW_MS ?? "120000");
export const RESUMABLE_WINDOW_MS =
	Number.isFinite(resumableWindowMs) && resumableWindowMs >= 0 ? Math.floor(resumableWindowMs) : 120_000;

export interface SpawnConfig {
	workerId: string;
	workerInstanceId: string;
	ticketId: string;
	workerName: string;
	useWorktree: boolean;
	cwd: string;
	/** Repo root — session dirs go here so worktree cleanup can't destroy them. */
	repoRoot: string;
	/** Attempt-stable directory chosen before spawn_requested is persisted. */
	sessionDir: string;
	leaderSessionFile: string;
	model?: string;
	hasTools?: boolean;
	additionalPrompt?: string;
	teamId?: string;
	leaderEpoch?: string;
	/** Canonical coordinator Pi session identity; distinct from the mesh route. */
	coordinatorSessionId?: string;
	coordinatorMeshId?: string;
	/** Coordinator display identity captured at spawn/resume for provenance. */
	coordinatorSessionName?: string;
	coordinatorNickname?: string;
	ticketCwd?: string;
	ticketText?: string;
	freeform?: boolean;
	sessionMode?: WorkerSessionMode;
}

export type PollEvent = (
	| { type: "completed"; worker: WorkerHandle; result: string }
	| { type: "warning"; worker: WorkerHandle; reason: string }
	| { type: "failed"; worker: WorkerHandle; reason: string }
	| { type: "stuck"; worker: WorkerHandle; idleSeconds: number; cause: StuckCause; first?: boolean }
	| { type: "comment"; worker: WorkerHandle; comment: string }
	| { type: "phase"; worker: WorkerHandle; phase: SessionPhaseEvent }
	| { type: "alive"; worker: WorkerHandle }
) & { lifecycleEventId?: string; attemptId?: string };

const pollMs = Number(process.env.PI_TEAMS_POLL_INTERVAL_MS ?? "1000");
export const POLL_INTERVAL_MS = Number.isFinite(pollMs) && pollMs >= 250 ? Math.floor(pollMs) : 1000;

const activityPollMs = Number(process.env.PI_TEAMS_ACTIVITY_POLL_MS ?? "5000");
export const ACTIVITY_POLL_INTERVAL_MS =
	Number.isFinite(activityPollMs) && activityPollMs >= 1000 ? Math.floor(activityPollMs) : 5000;

const stuckThresholdMs = Number(process.env.PI_TEAMS_STUCK_THRESHOLD_MS ?? `${5 * 60 * 1000}`);
export const STUCK_THRESHOLD_MS =
	Number.isFinite(stuckThresholdMs) && stuckThresholdMs >= 30_000
		? Math.floor(stuckThresholdMs)
		: 5 * 60 * 1000;

const outputSilenceThresholdMs = Number(process.env.PI_TEAMS_OUTPUT_SILENCE_THRESHOLD_MS ?? `600000`);
/** Maximum meaningful-output silence before the coordinator is durably woken to investigate. */
export const OUTPUT_SILENCE_THRESHOLD_MS =
	Number.isFinite(outputSilenceThresholdMs) && outputSilenceThresholdMs >= 30_000
		? Math.floor(outputSilenceThresholdMs)
		: 10 * 60 * 1000;

/** Grace period after agent_end before auto-closing ticket. Gives coordinator time to follow up. */
const gracePeriodMs = Number(process.env.PI_TEAMS_GRACE_PERIOD_MS ?? "120000");
export const GRACE_PERIOD_MS =
	Number.isFinite(gracePeriodMs) && gracePeriodMs >= 0 ? Math.floor(gracePeriodMs) : 120_000;

const stuckWarningCooldownMs = Number(process.env.PI_TEAMS_STUCK_WARNING_COOLDOWN_MS ?? "60000");
export const STUCK_WARNING_COOLDOWN_MS =
	Number.isFinite(stuckWarningCooldownMs) && stuckWarningCooldownMs >= 10_000
		? Math.floor(stuckWarningCooldownMs)
		: 60_000;

const notifyBatchWindowMs = Number(process.env.PI_TEAMS_NOTIFY_BATCH_WINDOW_MS ?? "150");
export const NOTIFY_BATCH_WINDOW_MS =
	Number.isFinite(notifyBatchWindowMs) && notifyBatchWindowMs >= 0
		? Math.floor(notifyBatchWindowMs)
		: 150;

export const TEAMS_TAG = "team";
export const WORKER_ENV_PREFIX = "PI_TEAMS";
