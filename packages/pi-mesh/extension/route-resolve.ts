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
export function resolveDurableTarget(peers: PeerInfo[], rawTarget: string): string {
	const needle = rawTarget.trim();
	const needleLower = needle.toLowerCase();

	// 1. Exact ID / sessionId / durable meshId match
	const byExact = peers.find(
		(peer) => peer.id === needle || peer.sessionId === needle || peer.meshId === needle,
	);
	if (byExact) return selectRoute(byExact);

	// 2. Case-insensitive exact name/nickname match
	const byLabel = dedupByIdentity(peers.filter((peer) => {
		const nickname = peer.nickname?.trim().toLowerCase();
		const name = peer.name?.trim().toLowerCase();
		return nickname === needleLower || name === needleLower;
	}));
	if (byLabel.length === 1) return selectRoute(byLabel[0]);
	if (byLabel.length > 1) {
		const matched = byLabel
			.map((peer) => `${peerLabel(peer)} (${peer.id.slice(0, 8)})`)
			.join(", ");
		throw new Error(`Peer name '${needle}' is ambiguous: ${matched}`);
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
		if (byPrefix.length === 1) return selectRoute(byPrefix[0]);
		if (byPrefix.length > 1) {
			const matched = byPrefix
				.map((peer) => `${peerLabel(peer)} (${peer.id.slice(0, 8)})`)
				.join(", ");
			throw new Error(`Session id '${needle}' is ambiguous: ${matched}`);
		}
	}

	const available = peers.map((p) => `${peerLabel(p)} (${p.id.slice(0, 8)})`).join(", ");
	throw new Error(`No peer matching '${needle}'. Online: ${available || "none"}`);
}
