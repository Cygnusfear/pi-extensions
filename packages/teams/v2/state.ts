import type { WorkerSessionMode } from "./protocol.ts";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface AttemptIdentity {
	coordinatorSessionId: string;
	teamId: string;
	workerId: string;
	attemptId: string;
}

export interface ProcessBirth {
	/** Millisecond process start observation used with pid to detect pid reuse. */
	startedAt: number;
}

export type LifecycleFactKind =
	| "team_created"
	| "spawn_requested"
	| "process_started"
	| "process_exited"
	| "stuck"
	| "declaration_done"
	| "declaration_quit"
	| "assessment_missing_finish"
	| "assessment_startup_failure"
	| "assessment_crash"
	| "assessment_killed"
	| "protocol_violation"
	| "cleanup_requested"
	| "cleanup_completed"
	| "cleanup_failed"
	| "effect_requested"
	| "effect_completed"
	| "effect_failed"
	| "outcome_corrected";

export interface LifecycleFact<TPayload extends JsonValue = JsonValue> extends AttemptIdentity {
	schemaVersion: 4;
	eventId: string;
	kind: LifecycleFactKind;
	sourceLeaderEpoch?: string;
	occurredAt: number;
	payload: TPayload;
	diagnostics?: JsonValue;
}

export interface LifecycleAck {
	schemaVersion: 1;
	coordinatorSessionId: string;
	eventId: string;
	runId: string;
	acknowledgedAt: number;
}

export interface LifecycleMigrationMarker {
	schemaVersion: 1;
	coordinatorSessionId: string;
	sourceSchemaVersions: number[];
	importedAttemptIds: string[];
	importedEventIds: string[];
	completedAt: number;
}

export interface TeamCreatedPayload {
	root: "coordinator_session";
}

export interface SpawnRequestedPayload {
	name: string;
	ticketId: string;
	persistent: boolean;
	sessionMode: WorkerSessionMode;
	sessionDir: string;
	workerSessionFile: string;
	worktreePath: string | null;
	model?: string;
	hasTools?: boolean;
}

export interface ProcessStartedPayload {
	pid: number;
	processBirth: ProcessBirth;
	sessionMode: WorkerSessionMode;
	workerSessionFile: string;
	sessionDir: string;
}

export interface ProcessExitedPayload {
	pid: number;
	processBirth: ProcessBirth;
	code: number | null;
	signal?: string;
}

export interface StuckPayload {
	cooldownIndex: number;
	idleSeconds: number;
}

export interface DeclarationPayload {
	summary: string;
}

export interface AssessmentPayload {
	reason: string;
	provisional: boolean;
	legacyAmbiguous?: boolean;
}

export type CleanupPhase = "not_ready" | "pending" | "running" | "completed" | "failed";
export type WorkerRoute = "pending" | "linked" | "resumable" | "dead";
export type ProcessPhase = "created" | "spawning" | "running" | "exited";
export type AssessmentKind =
	| "startup_failure"
	| "crash"
	| "missing_finish"
	| "killed"
	| "legacy_ambiguous"
	| "protocol_violation";

export interface AttemptState extends AttemptIdentity {
	name: string;
	ticketId: string;
	persistent: boolean;
	worktreePath: string | null;
	model?: string;
	hasTools?: boolean;
	sessionMode: WorkerSessionMode;
	process: {
		phase: ProcessPhase;
		pid?: number;
		birth?: ProcessBirth;
		workerSessionFile?: string;
		sessionDir?: string;
		exit?: { code: number | null; signal?: string; observedAt: number; eventId: string };
	};
	declaration: null | {
		kind: "done" | "quit";
		summary: string;
		eventId: string;
		at: number;
	};
	assessment: null | {
		kind: AssessmentKind;
		reason: string;
		diagnostics?: JsonValue;
		eventId: string;
		at: number;
		provisional: boolean;
	};
	cleanup: {
		phase: CleanupPhase;
		effectId?: string;
		error?: string;
	};
	protocolViolation: boolean;
	stuckCount: number;
	factEventIds: string[];
}

export interface WorkerState {
	workerId: string;
	name: string;
	persistent: boolean;
	currentAttemptId: string | null;
	route: WorkerRoute;
	attemptIds: string[];
}

export type ActionableEventType = "completed" | "warning" | "failed" | "stuck" | "outcome_corrected";

/** Public presentation state retained for existing widget/tool adapters. */
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

export interface ActionableLifecycleEvent extends AttemptIdentity {
	eventId: string;
	type: ActionableEventType;
	name: string;
	summary: string;
	occurredAt: number;
}

export interface EffectState {
	effectId: string;
	attemptId: string;
	kind: string;
	phase: "requested" | "completed" | "failed";
	normalizedInputs: JsonValue;
	error?: string;
	requestEventId: string;
	completionEventId?: string;
}

export interface LifecycleProjection {
	coordinatorSessionId: string;
	teamId: string | null;
	workers: Map<string, WorkerState>;
	attempts: Map<string, AttemptState>;
	actionableEvents: Map<string, ActionableLifecycleEvent>;
	effects: Map<string, EffectState>;
	acceptedEventIds: string[];
	protocolViolations: string[];
}

export function createEmptyProjection(coordinatorSessionId: string): LifecycleProjection {
	return {
		coordinatorSessionId,
		teamId: null,
		workers: new Map(),
		attempts: new Map(),
		actionableEvents: new Map(),
		effects: new Map(),
		acceptedEventIds: [],
		protocolViolations: [],
	};
}

export function attemptStatus(attempt: AttemptState): "running" | "completed" | "warning" | "failed" | "killed" | "unknown" {
	if (attempt.protocolViolation) return "failed";
	if (attempt.declaration?.kind === "done") return "completed";
	if (attempt.declaration?.kind === "quit") return "warning";
	if (attempt.assessment?.kind === "killed") return "killed";
	if (attempt.assessment) return attempt.assessment.kind === "missing_finish" || attempt.assessment.kind === "legacy_ambiguous" ? "warning" : "failed";
	if (attempt.process.phase === "running" || attempt.process.phase === "spawning") return "running";
	return "unknown";
}

export interface AttemptPreservePolicy {
	preserveBranch: boolean;
	preserveWorktree: boolean;
}

/** One canonical cleanup policy derived only from reduced lifecycle state. */
export function attemptPreservePolicy(attempt: AttemptState): AttemptPreservePolicy {
	if (attempt.worktreePath === null) return { preserveBranch: false, preserveWorktree: false };
	if (attempt.protocolViolation) return { preserveBranch: true, preserveWorktree: true };
	const ambiguous = attempt.assessment?.kind === "missing_finish"
		|| attempt.assessment?.kind === "legacy_ambiguous";
	const resumable = attempt.persistent && (
		attempt.declaration?.kind === "done"
		|| attempt.assessment?.kind === "missing_finish"
		|| (attempt.assessment?.kind === "startup_failure" && attempt.sessionMode.kind === "resume")
	);
	return {
		preserveBranch: Boolean(attempt.declaration) || ambiguous || attempt.assessment?.kind === "killed" || resumable,
		preserveWorktree: ambiguous || resumable,
	};
}
