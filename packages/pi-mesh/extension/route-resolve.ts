import type { PeerInfo } from "./types.ts";

/**
 * The routing address for a peer.
 *
 * Durable-id routing: prefer the stable mesh identity (`peer.meshId`) over the
 * per-connection sidecar clientId (`peer.id`). Every live incarnation subscribes
 * to `pi/mesh/session/${durableId}` on identity resolution, so routing by the
 * durable id survives clientId churn (reconnect / resume). Peers with no resolved
 * identity yet (legacy or pre-identity) fall back to their clientId.
 */
/**
 * Why live resolution failed, as data rather than as prose.
 *
 * The distinction is not cosmetic: 'no peer by that name' is a legitimate reason to
 * consult the offline registry, while 'two live peers claim that name' is a message
 * for a human. Callers comparing error strings would invert silently the day a
 * message was reworded, which is the bug class this removes.
 */
export type DurableRouteFailureReason = "no-match" | "ambiguous";

export class DurableRouteError extends Error {
	readonly reason: DurableRouteFailureReason;
	constructor(reason: DurableRouteFailureReason, message: string) {
		super(message);
		this.name = "DurableRouteError";
		this.reason = reason;
	}
}

/** True only for a failure the offline registry is allowed to answer. */
export function isNoMatchFailure(err: unknown): boolean {
	return err instanceof DurableRouteError && err.reason === "no-match";
}

/** True only for the refusal that must NOT fall through to a mailbox or a topic:
 *  several live sessions claim the address, so any fallback is a coin toss that
 *  still reports 'sent'. */
export function isAmbiguousFailure(err: unknown): boolean {
	return err instanceof DurableRouteError && err.reason === "ambiguous";
}

export function selectRoute(peer: PeerInfo): string {
	return peer.meshId ?? peer.id;
}

function peerLabel(peer: PeerInfo): string {
	return peer.nickname?.trim() || peer.name?.trim() || peer.id.slice(0, 8);
}

/** Collapse peers that share a durable mesh id (or, lacking one, a connection id) into the
 *  most-recently-seen one. Two entries for the SAME durable identity — e.g. a stale
 *  clientId left by a restart before stale-peer eviction (~90s) — are one peer, not an
 *  ambiguity. Prefer the live incarnation (highest lastSeen). */
function dedupByIdentity(peers: PeerInfo[]): PeerInfo[] {
	const best = new Map<string, PeerInfo>();
	for (const p of peers) {
		const key = p.meshId ?? p.id;
		const ex = best.get(key);
		if (!ex || (p.lastSeen ?? 0) > (ex.lastSeen ?? 0)) best.set(key, p);
	}
	return Array.from(best.values());
}

/**
 * Resolve a raw target (durable mesh id, sidecar clientId, session id, nickname,
 * or id/meshId prefix) to a concrete ROUTE — the durable id when the matched peer
 * has one, else its clientId.
 *
 * Match order (most specific first):
 *   1. exact id / sessionId / meshId
 *   2. exact nickname / name (case-insensitive)
 *   3. id / meshId / sessionId prefix (needle length >= 6)
 *
 * Throws with a human-readable message on no-match or ambiguity — same surface as
 * the previous inline resolver, now durable-aware and unit-testable.
 */
/** A registered-but-offline revivable session, reduced to what routing needs. */
export interface OfflineDurableTarget {
	durableId: string;
	nickname?: string;
}

export type OfflineDurableResolution
	= { kind: "resolved"; durableId: string }
	| { kind: "ambiguous"; durableIds: string[] }
	| { kind: "none" };

/**
 * Resolve a raw target against the OFFLINE durable registry by nickname.
 *
 * Lives apart from resolveDurableTarget because the two lookups answer different
 * questions: the live one resolves a roster entry to a ROUTE, this one resolves a
 * name to a durable id that has no roster entry at all. The matcher is pure and the
 * caller supplies the candidates, so the ambiguity rule is testable without a
 * filesystem and the scan can be reused by both the delivery path and the message
 * that explains a refusal.
 *
 * Same rule the live roster uses: exact case-insensitive nickname, and duplicates of
 * ONE durable id are not an ambiguity - they are one session listed twice.
 */
export function resolveOfflineDurableTarget(
	candidates: readonly OfflineDurableTarget[],
	rawTarget: string,
): OfflineDurableResolution {
	const needle = rawTarget.trim().toLowerCase();
	if (!needle) return { kind: "none" };
	const ids = new Set<string>();
	for (const c of candidates) {
		const nickname = c.nickname?.trim().toLowerCase();
		if (nickname && nickname === needle) ids.add(c.durableId);
	}
	if (ids.size === 1) {
		// Guarded rather than asserted: an `!` here is precisely the lie this gate
		// exists to catch, and a resolved-but-undefined id would be worse than the
		// 'none' we fall back to.
		const only = [...ids][0];
		if (only !== undefined) return { kind: "resolved", durableId: only };
		return { kind: "none" };
	}
	if (ids.size > 1) return { kind: "ambiguous", durableIds: [...ids].sort() };
	return { kind: "none" };
}

export function resolveDurableTarget(peers: PeerInfo[], rawTarget: string): string {
	const needle = rawTarget.trim();
	const needleLower = needle.toLowerCase();

	// 1. Exact ID / sessionId / durable meshId match.
	//
	// Two entries for ONE identity (a stale clientId from a restart, a presence
	// child) are one peer and route normally - that is what dedupByIdentity is for.
	// Two DIFFERENT identities claiming the same id are not a tie to break: a session
	// resumed from another's file reuses its durable id, so picking either delivered
	// to whichever subscribed first while the sender still saw 'sent'. Refuse, naming
	// both, so the caller can fix the address.
	const exact = dedupByIdentity(
		peers.filter(
			(peer) => peer.id === needle || peer.sessionId === needle || peer.meshId === needle,
		),
	);
	if (exact.length === 1) {
		const only = exact[0];
		if (only) return selectRoute(only);
	}
	if (exact.length > 1) {
		const matched = exact.map((peer) => `${peerLabel(peer)} (${peer.id.slice(0, 8)})`).join(", ");
		throw new DurableRouteError(
			"ambiguous",
			`Session id '${needle}' is claimed by ${exact.length} live sessions: ${matched}. Address the intended one by nickname or by its own id.`,
		);
	}

	// 2. Case-insensitive exact name/nickname match
	const byLabel = dedupByIdentity(peers.filter((peer) => {
		const nickname = peer.nickname?.trim().toLowerCase();
		const name = peer.name?.trim().toLowerCase();
		return nickname === needleLower || name === needleLower;
	}));
	const soleLabel = byLabel.length === 1 ? byLabel[0] : undefined;
	if (soleLabel) return selectRoute(soleLabel);
	if (byLabel.length > 1) {
		const matched = byLabel
			.map((peer) => `${peerLabel(peer)} (${peer.id.slice(0, 8)})`)
			.join(", ");
		throw new DurableRouteError("ambiguous", `Peer name '${needle}' is ambiguous: ${matched}`);
	}

	// 3. ID / meshId / sessionId prefix match
	if (needle.length >= 6) {
		const byPrefix = dedupByIdentity(peers.filter((peer) => {
			const peerId = peer.id ?? "";
			const peerSessionId = peer.sessionId ?? "";
			const peerMeshId = peer.meshId ?? "";
			return (
				peerId.startsWith(needle) ||
				peerSessionId.startsWith(needle) ||
				peerMeshId.startsWith(needle)
			);
		}));
		const solePrefix = byPrefix.length === 1 ? byPrefix[0] : undefined;
	if (solePrefix) return selectRoute(solePrefix);
		if (byPrefix.length > 1) {
			const matched = byPrefix
				.map((peer) => `${peerLabel(peer)} (${peer.id.slice(0, 8)})`)
				.join(", ");
			throw new DurableRouteError("ambiguous", `Session id '${needle}' is ambiguous: ${matched}`);
		}
	}

	const available = peers.map((p) => `${peerLabel(p)} (${p.id.slice(0, 8)})`).join(", ");
	throw new DurableRouteError("no-match", `No peer matching '${needle}'. Online: ${available || "none"}`);
}
