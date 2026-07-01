export const SESSION_PHASE_EVENT_KIND = "teams:phase-event" as const;
export const SESSION_PHASE_EVENT_VERSION = 1 as const;

export interface SessionPhaseEventPayload {
	stage: string;
	label: string;
	icon: string;
	color: string;
	sessionId?: string;
}

/**
 * Typed phase transition emitted by status(stage).
 *
 * The transport is intentionally just "a mesh payload" so status() does not
 * import teams. Teams consumes it when the process is a worker and the spawn
 * env contributes the supervisor channel metadata.
 */
export interface SessionPhaseEvent {
	kind: typeof SESSION_PHASE_EVENT_KIND;
	version: typeof SESSION_PHASE_EVENT_VERSION;
	from: "worker";
	to: "leader";
	teamId: string;
	leaderEpoch: string;
	workerId: string;
	attemptId: string;
	seq: number;
	sentAt: number;
	meshId?: string;
	payload: SessionPhaseEventPayload;
}

export function isSessionPhaseEvent(payload: unknown): payload is SessionPhaseEvent {
	if (!payload || typeof payload !== "object") return false;
	const p = payload as Record<string, unknown>;
	if (p.kind !== SESSION_PHASE_EVENT_KIND || p.version !== SESSION_PHASE_EVENT_VERSION) return false;
	if (p.from !== "worker" || p.to !== "leader") return false;
	if (typeof p.teamId !== "string" || typeof p.leaderEpoch !== "string") return false;
	if (typeof p.workerId !== "string" || typeof p.attemptId !== "string") return false;
	if (typeof p.seq !== "number" || typeof p.sentAt !== "number") return false;
	if (p.meshId !== undefined && typeof p.meshId !== "string") return false;
	const data = p.payload as Record<string, unknown> | undefined;
	return !!data
		&& typeof data.stage === "string"
		&& typeof data.label === "string"
		&& typeof data.icon === "string"
		&& typeof data.color === "string"
		&& (data.sessionId === undefined || typeof data.sessionId === "string");
}
