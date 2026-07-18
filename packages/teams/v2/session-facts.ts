import { createHash } from "node:crypto";
import type { SessionEntry, SessionHeader } from "@earendil-works/pi-coding-agent";
import type {
	AttemptIdentity,
	JsonValue,
	LifecycleAck,
	LifecycleFact,
	LifecycleFactKind,
	LifecycleMigrationMarker,
} from "./state.ts";

export const LIFECYCLE_FACT_ENTRY_TYPE = "teams-lifecycle-fact-v4";
/** Legacy (read-only): acknowledgment entries written by the retired provider-correlation design. */
export const LIFECYCLE_ACK_ENTRY_TYPE = "teams-lifecycle-ack-v1";
/** customType of the injected lifecycle batch message. Its persisted custom_message entry IS the delivery record. */
export const TEAM_EVENT_MESSAGE_TYPE = "team-event";
export const LIFECYCLE_MIGRATION_ENTRY_TYPE = "teams-lifecycle-migration-v1";
export const WORKER_FINISH_PENDING_ENTRY_TYPE = "teams-worker-finish-pending-v1";

export interface SessionEntryLike {
	type: string;
	id?: string;
	parentId?: string | null;
	customType?: string;
	data?: unknown;
	details?: unknown;
	message?: unknown;
}

export interface SessionFactAccess {
	getSessionId(): string;
	getSessionFile(): string | undefined;
	getEntries(): SessionEntryLike[];
	getBranch(): SessionEntryLike[];
	getHeader(): SessionHeader | null;
}

export interface FactAppender {
	appendEntry<T = unknown>(customType: string, data?: T): void;
}

export interface AppendFactResult {
	status: "appended" | "duplicate";
	fact: LifecycleFact;
}

/** Durable sender-side evidence written in the worker's own Pi session. */
export interface WorkerFinishPending extends AttemptIdentity {
	schemaVersion: 1;
	status: "done" | "quit";
	summary: string;
	eventId: string;
	createdAt: number;
}

export class LifecycleStorageError extends Error {
	constructor(message: string, readonly causeValue?: unknown) {
		super(message);
		this.name = "LifecycleStorageError";
	}
}

export function isJsonValue(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every(isJsonValue);
	if (typeof value !== "object") return false;
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) return false;
	return Object.entries(value as Record<string, unknown>).every(([key, child]) => key.length > 0 && isJsonValue(child));
}

function normalizeJson(value: JsonValue): JsonValue {
	if (Array.isArray(value)) return value.map(normalizeJson);
	if (value && typeof value === "object") {
		const normalized: Record<string, JsonValue> = {};
		for (const key of Object.keys(value).sort()) normalized[key] = normalizeJson(value[key]!);
		return normalized;
	}
	return value;
}

export function canonicalJson(value: JsonValue): string {
	if (!isJsonValue(value)) throw new TypeError("Lifecycle identity accepts finite JSON values only");
	return JSON.stringify(normalizeJson(value));
}

export function canonicalFactIdentity(fact: LifecycleFact): string {
	return canonicalJson({
		schemaVersion: fact.schemaVersion,
		coordinatorSessionId: fact.coordinatorSessionId,
		teamId: fact.teamId,
		workerId: fact.workerId,
		attemptId: fact.attemptId,
		kind: fact.kind,
		authoritativePayload: fact.payload,
	});
}

export function sha256Id(prefix: string, value: JsonValue): string {
	return `${prefix}${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

export function createLeaderEventId(
	identity: AttemptIdentity,
	kind: LifecycleFactKind,
	causeEventId: string,
	extra?: JsonValue,
): string {
	return sha256Id("teams:event:v4:", {
		coordinatorSessionId: identity.coordinatorSessionId,
		teamId: identity.teamId,
		workerId: identity.workerId,
		attemptId: identity.attemptId,
		kind,
		causeEventId,
		...(extra === undefined ? {} : { extra }),
	});
}

export function createDeclarationEventId(
	identity: AttemptIdentity,
	status: "done" | "quit",
	summary: string,
): string {
	return sha256Id("teams:event:v4:", {
		...identity,
		kind: status === "done" ? "declaration_done" : "declaration_quit",
		payload: { summary },
	});
}

export function createRootEventId(kind: "team_created" | "spawn_requested", root: JsonValue): string {
	return sha256Id("teams:event:v4:", { kind, root });
}

export function createEffectId(identity: AttemptIdentity, effectKind: string, normalizedInputs: JsonValue): string {
	return sha256Id("teams:effect:v1:", {
		coordinatorSessionId: identity.coordinatorSessionId,
		teamId: identity.teamId,
		workerId: identity.workerId,
		attemptId: identity.attemptId,
		effectKind,
		normalizedInputs,
	});
}

const FACT_KINDS = new Set<LifecycleFactKind>([
	"team_created", "spawn_requested", "process_started", "process_exited", "stuck",
	"declaration_done", "declaration_quit", "assessment_missing_finish", "assessment_startup_failure",
	"assessment_crash", "assessment_killed", "protocol_violation", "cleanup_requested",
	"cleanup_completed", "cleanup_failed", "effect_requested", "effect_completed", "effect_failed",
	"outcome_corrected",
]);

function nonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function finiteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function recordValue(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: null;
}

function validProcessBirth(value: unknown): boolean {
	const birth = recordValue(value);
	return birth !== null && finiteNumber(birth.startedAt);
}

function validSessionMode(value: unknown): boolean {
	const mode = recordValue(value);
	if (!mode || !nonEmptyString(mode.kind)) return false;
	if (mode.kind === "fresh") return true;
	if (mode.kind === "resume") return nonEmptyString(mode.sessionFile);
	if (mode.kind === "adopt") {
		return nonEmptyString(mode.sessionFile) && nonEmptyString(mode.sessionId);
	}
	return mode.kind === "fork"
		&& nonEmptyString(mode.parentSessionFile)
		&& nonEmptyString(mode.parentLeafId)
		&& nonEmptyString(mode.sessionFile);
}

function validLifecyclePayload(kind: LifecycleFactKind, value: JsonValue): boolean {
	const payload = recordValue(value);
	if (!payload) return false;
	switch (kind) {
		case "team_created":
			return payload.root === "coordinator_session";
		case "spawn_requested":
			return nonEmptyString(payload.name)
				&& nonEmptyString(payload.ticketId)
				&& typeof payload.persistent === "boolean"
				&& (payload.executionCwd === undefined || nonEmptyString(payload.executionCwd))
				&& validSessionMode(payload.sessionMode)
				&& typeof payload.sessionDir === "string"
				&& typeof payload.workerSessionFile === "string"
				&& (payload.worktreePath === null || nonEmptyString(payload.worktreePath))
				&& (payload.model === undefined || typeof payload.model === "string")
				&& (payload.hasTools === undefined || typeof payload.hasTools === "boolean");
		case "process_started":
			return Number.isInteger(payload.pid)
				&& (payload.pid as number) > 0
				&& validProcessBirth(payload.processBirth)
				&& validSessionMode(payload.sessionMode)
				&& typeof payload.workerSessionFile === "string"
				&& typeof payload.sessionDir === "string";
		case "process_exited":
			return Number.isInteger(payload.pid)
				&& (payload.pid as number) > 0
				&& validProcessBirth(payload.processBirth)
				&& (payload.code === null || Number.isInteger(payload.code))
				&& (payload.signal === undefined || typeof payload.signal === "string");
		case "stuck":
			return Number.isInteger(payload.cooldownIndex)
				&& (payload.cooldownIndex as number) >= 0
				&& finiteNumber(payload.idleSeconds)
				&& payload.idleSeconds >= 0;
		case "declaration_done":
		case "declaration_quit":
			return typeof payload.summary === "string";
		case "assessment_missing_finish":
		case "assessment_startup_failure":
		case "assessment_crash":
		case "assessment_killed":
			return typeof payload.reason === "string"
				&& typeof payload.provisional === "boolean"
				&& (payload.legacyAmbiguous === undefined || typeof payload.legacyAmbiguous === "boolean");
		case "protocol_violation":
			return nonEmptyString(payload.conflictingEventId) && typeof payload.reason === "string";
		case "cleanup_requested":
			return nonEmptyString(payload.effectId)
				&& typeof payload.preserveBranch === "boolean"
				&& typeof payload.preserveWorktree === "boolean";
		case "cleanup_completed":
			return nonEmptyString(payload.effectId);
		case "cleanup_failed":
			return nonEmptyString(payload.effectId) && typeof payload.error === "string";
		case "effect_requested":
			return nonEmptyString(payload.effectId)
				&& nonEmptyString(payload.effectKind)
				&& isJsonValue(payload.normalizedInputs);
		case "effect_completed":
			return nonEmptyString(payload.effectId);
		case "effect_failed":
			return nonEmptyString(payload.effectId) && typeof payload.error === "string";
		case "outcome_corrected":
			return nonEmptyString(payload.provisionalEventId)
				&& nonEmptyString(payload.declarationEventId)
				&& typeof payload.summary === "string";
	}
}

export function parseLifecycleFact(value: unknown): LifecycleFact | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<LifecycleFact>;
	if (candidate.schemaVersion !== 4) return null;
	if (!nonEmptyString(candidate.coordinatorSessionId) || !nonEmptyString(candidate.teamId)) return null;
	if (!nonEmptyString(candidate.workerId) || !nonEmptyString(candidate.attemptId) || !nonEmptyString(candidate.eventId)) return null;
	if (!candidate.kind || !FACT_KINDS.has(candidate.kind)) return null;
	if (!Number.isFinite(candidate.occurredAt) || !isJsonValue(candidate.payload) || !validLifecyclePayload(candidate.kind, candidate.payload)) return null;
	if (candidate.sourceLeaderEpoch !== undefined && !nonEmptyString(candidate.sourceLeaderEpoch)) return null;
	if (candidate.diagnostics !== undefined && !isJsonValue(candidate.diagnostics)) return null;
	return candidate as LifecycleFact;
}

export function parseLifecycleAck(value: unknown): LifecycleAck | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<LifecycleAck>;
	if (candidate.schemaVersion !== 1 || !nonEmptyString(candidate.coordinatorSessionId)) return null;
	if (!nonEmptyString(candidate.eventId) || !nonEmptyString(candidate.runId) || !Number.isFinite(candidate.acknowledgedAt)) return null;
	return candidate as LifecycleAck;
}

export function parseMigrationMarker(value: unknown): LifecycleMigrationMarker | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<LifecycleMigrationMarker>;
	if (candidate.schemaVersion !== 1 || !nonEmptyString(candidate.coordinatorSessionId)) return null;
	if (!Array.isArray(candidate.sourceSchemaVersions) || !candidate.sourceSchemaVersions.every(Number.isFinite)) return null;
	if (!Array.isArray(candidate.importedAttemptIds) || !candidate.importedAttemptIds.every(nonEmptyString)) return null;
	if (!Array.isArray(candidate.importedEventIds) || !candidate.importedEventIds.every(nonEmptyString)) return null;
	if (!Number.isFinite(candidate.completedAt)) return null;
	return candidate as LifecycleMigrationMarker;
}

export function parseWorkerFinishPending(value: unknown): WorkerFinishPending | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<WorkerFinishPending>;
	if (candidate.schemaVersion !== 1) return null;
	if (!nonEmptyString(candidate.coordinatorSessionId) || !nonEmptyString(candidate.teamId)) return null;
	if (!nonEmptyString(candidate.workerId) || !nonEmptyString(candidate.attemptId)) return null;
	if (candidate.status !== "done" && candidate.status !== "quit") return null;
	if (typeof candidate.summary !== "string" || !nonEmptyString(candidate.eventId)) return null;
	if (!finiteNumber(candidate.createdAt)) return null;
	return candidate as WorkerFinishPending;
}

/** Find sender evidence for exactly one attempt. Display names never participate. */
export function workerFinishPendingForAttempt(
	entries: readonly SessionEntryLike[],
	identity: AttemptIdentity,
): WorkerFinishPending | null {
	for (const entry of entries) {
		if (entry.type !== "custom" || entry.customType !== WORKER_FINISH_PENDING_ENTRY_TYPE) continue;
		const pending = parseWorkerFinishPending(entry.data);
		if (!pending) continue;
		if (
			pending.coordinatorSessionId === identity.coordinatorSessionId
			&& pending.teamId === identity.teamId
			&& pending.workerId === identity.workerId
			&& pending.attemptId === identity.attemptId
		) return pending;
	}
	return null;
}

export function factsForSession(entries: readonly SessionEntryLike[], coordinatorSessionId: string): LifecycleFact[] {
	const facts: LifecycleFact[] = [];
	for (const entry of entries) {
		if (entry.type !== "custom" || entry.customType !== LIFECYCLE_FACT_ENTRY_TYPE) continue;
		const fact = parseLifecycleFact(entry.data);
		if (fact?.coordinatorSessionId === coordinatorSessionId) facts.push(fact);
	}
	return facts;
}

/**
 * Delivery record scan: every eventId carried by a persisted team-event
 * custom message. The custom_message entry participates in LLM context, so
 * its presence in the session tree is proof the model has (or will have) the
 * event in context — the entry is append-only and survives compaction.
 */
export function deliveredTeamEventIds(entries: readonly SessionEntryLike[]): Set<string> {
	const delivered = new Set<string>();
	for (const entry of entries) {
		if (entry.type !== "custom_message" || entry.customType !== TEAM_EVENT_MESSAGE_TYPE) continue;
		const details = entry.details;
		if (!details || typeof details !== "object") continue;
		const eventIds = (details as { eventIds?: unknown }).eventIds;
		if (!Array.isArray(eventIds)) continue;
		for (const eventId of eventIds) if (typeof eventId === "string" && eventId) delivered.add(eventId);
	}
	return delivered;
}

export function branchAcknowledgedEventIds(branch: readonly SessionEntryLike[], coordinatorSessionId: string): Set<string> {
	const acknowledged = new Set<string>();
	for (const entry of branch) {
		if (entry.type !== "custom" || entry.customType !== LIFECYCLE_ACK_ENTRY_TYPE) continue;
		const ack = parseLifecycleAck(entry.data);
		if (ack?.coordinatorSessionId === coordinatorSessionId) acknowledged.add(ack.eventId);
	}
	return acknowledged;
}

export function hasAssistantMessage(entries: readonly SessionEntryLike[]): boolean {
	return entries.some((entry) => {
		if (entry.type !== "message" || !entry.message || typeof entry.message !== "object") return false;
		return (entry.message as { role?: unknown }).role === "assistant";
	});
}

export class SessionFactWriter {
	private readonly identities = new Map<string, string>();
	private assistantMaterialized: boolean;
	private degradedError: LifecycleStorageError | null = null;
	readonly coordinatorSessionId: string;

	constructor(
		private readonly pi: FactAppender,
		private readonly session: SessionFactAccess,
		entries: readonly SessionEntryLike[],
	) {
		this.coordinatorSessionId = session.getSessionId();
		this.assistantMaterialized = hasAssistantMessage(entries);
		for (const fact of factsForSession(entries, this.coordinatorSessionId)) {
			const canonical = canonicalFactIdentity(fact);
			if (!this.identities.has(fact.eventId)) this.identities.set(fact.eventId, canonical);
		}
	}

	get storageDegraded(): boolean { return this.degradedError !== null; }
	get storageError(): LifecycleStorageError | null { return this.degradedError; }

	assertWritable(): void {
		if (this.degradedError) throw this.degradedError;
		if (this.session.getSessionId() !== this.coordinatorSessionId) {
			throw new LifecycleStorageError("Teams lifecycle writer is bound to a different coordinator session");
		}
		if (!this.session.getSessionFile()) {
			throw new LifecycleStorageError("Teams requires a persisted Pi session; --no-session cannot delegate workers");
		}
		if (!this.assistantMaterialized) {
			// Re-check live: the first assistant message of a fresh session lands
			// after this writer was constructed. The session is the only truth —
			// no host hook is needed to observe it.
			this.assistantMaterialized = hasAssistantMessage(this.session.getEntries());
		}
		if (!this.assistantMaterialized) {
			throw new LifecycleStorageError("Teams lifecycle persistence is unavailable before the first assistant message is materialized");
		}
	}

	appendFact(fact: LifecycleFact): AppendFactResult {
		this.assertWritable();
		const parsed = parseLifecycleFact(fact);
		if (!parsed) throw new LifecycleStorageError("Invalid Teams lifecycle fact");
		if (parsed.coordinatorSessionId !== this.coordinatorSessionId) {
			throw new LifecycleStorageError("Lifecycle fact coordinatorSessionId does not match the live session");
		}
		const canonical = canonicalFactIdentity(parsed);
		const existing = this.identities.get(parsed.eventId);
		if (existing !== undefined) {
			if (existing !== canonical) throw new LifecycleStorageError(`Conflicting lifecycle eventId ${parsed.eventId}`);
			return { status: "duplicate", fact: parsed };
		}
		try {
			this.pi.appendEntry(LIFECYCLE_FACT_ENTRY_TYPE, parsed);
		} catch (error) {
			this.degradedError = new LifecycleStorageError("Teams lifecycle append failed; runtime entered storage_degraded", error);
			throw this.degradedError;
		}
		this.identities.set(parsed.eventId, canonical);
		return { status: "appended", fact: parsed };
	}

	appendMigrationMarker(marker: LifecycleMigrationMarker): void {
		this.assertWritable();
		const parsed = parseMigrationMarker(marker);
		if (!parsed || parsed.coordinatorSessionId !== this.coordinatorSessionId) throw new LifecycleStorageError("Invalid Teams lifecycle migration marker");
		try {
			this.pi.appendEntry(LIFECYCLE_MIGRATION_ENTRY_TYPE, parsed);
		} catch (error) {
			this.degradedError = new LifecycleStorageError("Teams lifecycle migration marker append failed; runtime entered storage_degraded", error);
			throw this.degradedError;
		}
	}
}

export type { SessionEntry };
