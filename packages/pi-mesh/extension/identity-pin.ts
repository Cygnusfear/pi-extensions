import type { MeshIdentity } from "@pi-extensions/shared/session-nickname";
import { claimNickname } from "@pi-extensions/shared/session-nickname";
import type { PeerInfo } from "./types.ts";

/**
 * v1a identity-pin: decide which display nickname a REUSED identity keeps.
 *
 * On reload / resume / revive the durable session's mesh id is REUSED (not
 * re-minted), so the id — and therefore the deterministic nickname — is pinned.
 * We only reclaim a NEW display nickname when a DIFFERENT identity already holds
 * this one. A lingering same-id predecessor (a just-exited incarnation still in
 * the 90s stale-peer window) is our OWN id and must NOT trigger a rename — that
 * mis-detection is exactly the churn (Simon→Robert) the pin removes.
 *
 * Pure + deterministic so /resume-keeps-the-same-name is directly unit-testable.
 */
export function resolveReuseNickname(
	existing: MeshIdentity,
	peers: PeerInfo[],
): { nickname: string; changed: boolean } {
	const conflicting = new Set(
		peers
			.filter((p) => (p.meshId ?? p.id) !== existing.id)
			.map((p) => p.nickname)
			.filter((n): n is string => typeof n === "string" && n.length > 0),
	);
	if (!conflicting.has(existing.nickname)) {
		return { nickname: existing.nickname, changed: false };
	}
	return { nickname: claimNickname(existing.id, conflicting), changed: true };
}

/**
 * Does this session_start reason REUSE the durable session's existing identity
 * (the pin), rather than mint a fresh one?
 *
 *   reuse  → reload | resume | startup | any unknown reason | rebirth /new
 *   mint   → fork | a genuinely new /new session (no rebirth marker)
 *
 * `resume` reuses even when a peer with the same id is still live: a lingering
 * predecessor is the common case; genuine concurrent single-activation is the
 * v1c activation-lease's job, not an id re-mint.
 */
export function isIdentityReuseReason(reason: string, hasRebirthMarker: boolean): boolean {
	if (reason === "fork") return false;
	if (reason === "new") return hasRebirthMarker;
	return true;
}
