
export interface WorkerHandle {
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
	lastOutputAt?: number;
	lastOutputLabel?: string;
	lastSessionMtimeMs?: number;
	hasActiveChildProcess: boolean;
	activeChildProcessCount: number;
	currentCommand?: string;
	currentCommandElapsedSeconds?: number;
	lastSeenCommentCount: number;
	lastStuckWarningAt?: number;
	exitCode?: number | null;
	spawnError?: string;
	nickname?: string;
	meshClientId?: string;
	routeState: WorkerRouteState;
	freeform?: boolean;
	recoveryAttempts?: number;
	/** Original spawn config — retained so startup-death can respawn from scratch. */
	spawnConfig?: SpawnConfig;
	doneAt?: number;
	graceAt?: number;
	resumableUntilAt?: number;
	killedAt?: number;
}

export type WorkerStatus = "spawning" | "running" | "done" | "failed" | "killed" | "grace";
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
	workerInstanceId: string;
	ticketId: string;
	workerName: string;
	useWorktree: boolean;
	cwd: string;
	/** Repo root — session dirs go here so worktree cleanup can't destroy them. */
	repoRoot: string;
	leaderSessionFile: string;
	model?: string;
	hasTools?: boolean;
	additionalPrompt?: string;
	channelId?: string;
	coordinatorMeshId?: string;
	freeform?: boolean;
}

export type PollEvent =
	| { type: "completed"; worker: WorkerHandle; result: string }
	| { type: "failed"; worker: WorkerHandle; reason: string }
	| { type: "stuck"; worker: WorkerHandle; idleSeconds: number }
	| { type: "comment"; worker: WorkerHandle; comment: string }
	| { type: "alive"; worker: WorkerHandle };

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
