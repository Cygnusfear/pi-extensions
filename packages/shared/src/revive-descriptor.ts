export const REVIVE_DESCRIPTOR_KIND = "mesh:revive-descriptor" as const;
export const REVIVE_DESCRIPTOR_VERSION = 1 as const;

/**
 * The persisted revive descriptor — the shared cross-lane data contract that
 * makes a hibernated durable session REVIVABLE.
 *
 * Written by the SPAWNER (teams.delegate for a worker; a future CLI/human path
 * for a normal session) because it owns the semantic spawn params (model,
 * ticket, worktree, PI_TEAMS_* env) that pi-mesh's process-view cannot see.
 * Read by the ACTIVATOR (pi-mesh) to reconstruct the revive.
 *
 * Two write sites, one schema (ADD-1, contract pe-jimphzxj):
 *   1. spawner writes a PARTIAL descriptor next to the session file (durableId
 *      unknown at spawn — it is minted inside the child's pi-mesh).
 *   2. pi-mesh, on identity resolution, reads that partial, fills durableId +
 *      sessionId + nickname, and materialises the CANONICAL descriptor keyed by
 *      the durable id (so the activator can find it from a bare durable id).
 *
 * "revivable = durable session record EXISTS AND a persisted revive descriptor
 * EXISTS AND activation authorized" (contract). Absent the descriptor → dead →
 * the sender's mesh_tell acks 'undeliverable', never a false 'delivered'.
 */
export interface ReviveDescriptor {
	kind: typeof REVIVE_DESCRIPTOR_KIND;
	version: typeof REVIVE_DESCRIPTOR_VERSION;
	/** Durable mesh id (the pinned identity). Absent in the spawner's PARTIAL
	 *  descriptor (minted inside the child), present in the canonical one. */
	durableId?: string;
	/** pi session id — metadata; can change across resume, unlike durableId. */
	sessionId?: string;
	/** Deterministic display nickname (fn(durableId)) — convenience for logs. */
	nickname?: string;
	/** The session jsonl file the revive continues (`pi --session <file>`). */
	sessionFile: string;
	/** Working directory the incarnation runs in. */
	cwd: string;
	/** The executable to relaunch (always "pi" today). */
	command: string;
	/** Full argv for the relaunch, e.g. ["--session", file, "--model", model]. */
	args: string[];
	/** Model id, when pinned at spawn. */
	model?: string;
	/** Ticket the session is anchored to (teams worker). */
	ticketId?: string;
	/** Worktree path when the incarnation runs in a git worktree. */
	worktreePath?: string;
	/** Allow-listed env the revive must restore (PI_TEAMS_* for a worker). */
	env?: Record<string, string>;
	/** Durable ids authorized to be NOTIFIED to revive this session (v1) and,
	 *  later, to activate it (v2). For a worker: its coordinator's durable id. */
	supervisors?: string[];
	/** unix ms of the last write — lets the activator prefer the freshest. */
	updatedAt: number;
}

/** Env keys the revive descriptor is allowed to carry. Keep this tight — the
 *  descriptor is persisted user-level, so it must never leak secrets. Only the
 *  teams coordination vars a revive genuinely needs are allow-listed. */
export const REVIVE_DESCRIPTOR_ENV_ALLOWLIST: readonly string[] = [
	"PI_TEAMS_WORKER",
	"PI_TEAMS_WORKER_INSTANCE_ID",
	"PI_TEAMS_TICKET_ID",
	"PI_TEAMS_TICKET_CWD",
	"PI_TEAMS_WORKER_NAME",
	"PI_TEAMS_TEAM_ID",
	"PI_TEAMS_LEADER_EPOCH",
	"PI_TEAMS_LEADER_SESSION",
	"PI_TEAMS_LEASE_FILE",
	"PI_TEAMS_CHANNEL_ID",
	"PI_TEAMS_COORDINATOR_ID",
	"PI_TEAMS_HAS_TOOLS",
	"PI_TEAMS_FREEFORM",
	"PI_TEAMS_SESSION_MODE",
];

/** Project a full process env down to only the allow-listed revive keys. */
export function pickReviveDescriptorEnv(
	env: Record<string, string | undefined>,
	allowlist: readonly string[] = REVIVE_DESCRIPTOR_ENV_ALLOWLIST,
): Record<string, string> {
	const picked: Record<string, string> = {};
	for (const key of allowlist) {
		const value = env[key];
		if (typeof value === "string" && value.length > 0) picked[key] = value;
	}
	return picked;
}

export function isReviveDescriptor(value: unknown): value is ReviveDescriptor {
	if (!value || typeof value !== "object") return false;
	const d = value as Record<string, unknown>;
	if (d.kind !== REVIVE_DESCRIPTOR_KIND || d.version !== REVIVE_DESCRIPTOR_VERSION) return false;
	if (typeof d.sessionFile !== "string" || d.sessionFile.length === 0) return false;
	if (typeof d.cwd !== "string") return false;
	if (typeof d.command !== "string" || d.command.length === 0) return false;
	if (!Array.isArray(d.args) || !d.args.every((a) => typeof a === "string")) return false;
	if (typeof d.updatedAt !== "number") return false;
	if (d.durableId !== undefined && typeof d.durableId !== "string") return false;
	if (d.sessionId !== undefined && typeof d.sessionId !== "string") return false;
	if (d.nickname !== undefined && typeof d.nickname !== "string") return false;
	if (d.model !== undefined && typeof d.model !== "string") return false;
	if (d.ticketId !== undefined && typeof d.ticketId !== "string") return false;
	if (d.worktreePath !== undefined && typeof d.worktreePath !== "string") return false;
	if (d.supervisors !== undefined) {
		if (!Array.isArray(d.supervisors) || !d.supervisors.every((s) => typeof s === "string")) return false;
	}
	if (d.env !== undefined) {
		if (!d.env || typeof d.env !== "object") return false;
		for (const v of Object.values(d.env as Record<string, unknown>)) {
			if (typeof v !== "string") return false;
		}
	}
	return true;
}

/** Build a descriptor with kind/version/updatedAt stamped. Callers supply the
 *  semantic fields; this keeps every write site honest about the envelope. */
export function buildReviveDescriptor(
	fields: Omit<ReviveDescriptor, "kind" | "version" | "updatedAt"> & { updatedAt?: number },
): ReviveDescriptor {
	return {
		kind: REVIVE_DESCRIPTOR_KIND,
		version: REVIVE_DESCRIPTOR_VERSION,
		...fields,
		updatedAt: fields.updatedAt ?? Date.now(),
	};
}
