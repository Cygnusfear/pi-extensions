export type ProviderLimitNoticeKind =
	| "rate_limited"
	| "quota"
	| "manual_wake"
	| "stuck"
	| "recovered";

/** A display-safe, authoritative identity for a session involved in an alert. */
export interface AlertSessionIdentity {
	sessionId?: string;
	sessionName?: string;
	nickname?: string;
	meshId?: string;
	ticketId?: string;
	workerName?: string;
}

export interface SessionManagerIdentitySource {
	getSessionId?: () => unknown;
	getSessionName?: () => unknown;
}

export interface MeshPeerIdentity {
	id?: unknown;
	meshId?: unknown;
	sessionId?: unknown;
	name?: unknown;
	nickname?: unknown;
}

/** The narrow live-mesh surface needed for provenance; safe for extension mocks. */
export interface MeshIdentitySource {
	self?: () => MeshPeerIdentity;
	getIdentity?: () => { id?: unknown; nickname?: unknown } | null;
	peers?: () => readonly MeshPeerIdentity[];
}

export interface ProviderLimitNotice {
	kind: ProviderLimitNoticeKind;
	model: string;
	operation: "agent" | "rlm";
	failed: AlertSessionIdentity;
	launcher?: AlertSessionIdentity;
	/** Explicit caller-supplied RLM identity only; never derive from raw task text. */
	rlmIdentity?: string;
	/** A bounded, non-secret status phrase such as "auto-resuming in 62s". */
	detail?: string;
}

const MAX_DISPLAY_VALUE = 240;

/** Collapse control/newline whitespace so provenance can never forge alert lines. */
export function normalizeAlertDisplay(value: unknown, maxLength = MAX_DISPLAY_VALUE): string | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = value.replace(/\s+/g, " ").trim();
	if (!normalized) return undefined;
	return Array.from(normalized).slice(0, Math.max(0, maxLength)).join("") || undefined;
}

function safeCall<T>(fn: (() => T) | undefined): T | undefined {
	try {
		return fn?.();
	} catch {
		return undefined;
	}
}

function compactIdentity(identity: AlertSessionIdentity): AlertSessionIdentity {
	const result: AlertSessionIdentity = {
		sessionId: normalizeAlertDisplay(identity.sessionId),
		sessionName: normalizeAlertDisplay(identity.sessionName),
		nickname: normalizeAlertDisplay(identity.nickname),
		meshId: normalizeAlertDisplay(identity.meshId),
		ticketId: normalizeAlertDisplay(identity.ticketId),
		workerName: normalizeAlertDisplay(identity.workerName),
	};
	return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined)) as AlertSessionIdentity;
}

/**
 * Build the failing session's identity at the producer. Session metadata and live
 * mesh identity are intentionally distinct: either can be unavailable independently.
 */
export function currentAlertSessionIdentity(
	sessionManager?: SessionManagerIdentitySource,
	mesh?: MeshIdentitySource,
	environment: Record<string, string | undefined> = process.env,
): AlertSessionIdentity {
	const self = mesh ? safeCall(() => mesh.self?.()) : undefined;
	const durable = mesh ? safeCall(() => mesh.getIdentity?.()) : undefined;
	return compactIdentity({
		sessionId: normalizeAlertDisplay(sessionManager ? safeCall(() => sessionManager.getSessionId?.()) : undefined),
		sessionName: normalizeAlertDisplay(sessionManager ? safeCall(() => sessionManager.getSessionName?.()) : undefined),
		nickname: normalizeAlertDisplay(self?.nickname ?? durable?.nickname),
		meshId: normalizeAlertDisplay(durable?.id ?? self?.meshId),
		ticketId: environment.PI_TEAMS_TICKET_ID,
		workerName: environment.PI_TEAMS_WORKER_NAME,
	});
}

/**
 * Resolve the Teams coordinator from spawn-time facts. A live coordinator peer is
 * only a legacy display fallback; it never creates a launcher relationship.
 */
export function teamsLauncherProvenance(
	environment: Record<string, string | undefined> = process.env,
	mesh?: MeshIdentitySource,
): AlertSessionIdentity | undefined {
	const sessionId = normalizeAlertDisplay(environment.PI_TEAMS_COORDINATOR_SESSION_ID);
	const meshId = normalizeAlertDisplay(environment.PI_TEAMS_COORDINATOR_ID);
	let sessionName = normalizeAlertDisplay(environment.PI_TEAMS_COORDINATOR_SESSION_NAME);
	let nickname = normalizeAlertDisplay(environment.PI_TEAMS_COORDINATOR_NICKNAME);
	if (!sessionId && !meshId && !sessionName && !nickname) return undefined;

	const peers = mesh ? safeCall(() => mesh.peers?.()) : undefined;
	const peer = peers?.find((candidate) =>
		(meshId !== undefined && (normalizeAlertDisplay(candidate.meshId) === meshId || normalizeAlertDisplay(candidate.id) === meshId)) ||
		(sessionId !== undefined && normalizeAlertDisplay(candidate.sessionId) === sessionId),
	);
	if (sessionName === undefined) sessionName = normalizeAlertDisplay(peer?.name);
	if (nickname === undefined) nickname = normalizeAlertDisplay(peer?.nickname);
	return compactIdentity({ sessionId, meshId, sessionName, nickname });
}

function formatIdentity(identity: AlertSessionIdentity): string {
	const primary = identity.sessionName ?? (identity.sessionId ? `session ${identity.sessionId}` : "unknown session");
	return identity.nickname ? `${primary} (${identity.nickname})` : primary;
}

function heading(kind: ProviderLimitNoticeKind): string {
	switch (kind) {
		case "quota": return "🚓 quota / usage window";
		case "manual_wake": return "🚓 manual wake needed";
		case "stuck": return "🚓 still rate-limited";
		case "recovered": return "✅ provider limit recovered";
		default: return "🚓 rate-limited";
	}
}

/** Render structured producer-side provenance into one Telegram-bound mesh tell. */
export function formatProviderLimitNotice(notice: ProviderLimitNotice): string {
	const model = normalizeAlertDisplay(notice.model) ?? "the model";
	const lines = [`${heading(notice.kind)} — ${model}`, `failed: ${formatIdentity(compactIdentity(notice.failed))}`];
	const failed = compactIdentity(notice.failed);
	if (failed.workerName) {
		lines.push(`Teams worker: ${failed.workerName}${failed.ticketId ? ` (ticket ${failed.ticketId})` : ""}`);
	}
	if (notice.operation === "rlm") {
		const rlmIdentity = normalizeAlertDisplay(notice.rlmIdentity);
		lines.push(`operation: RLM${rlmIdentity ? ` (${rlmIdentity})` : ""}`);
	}
	if (notice.launcher) lines.push(`launched by: ${formatIdentity(compactIdentity(notice.launcher))} (Teams coordinator)`);
	const detail = normalizeAlertDisplay(notice.detail);
	if (detail) lines.push(detail);
	return lines.join("\n");
}
