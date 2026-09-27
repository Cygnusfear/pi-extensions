import { describe, expect, test } from "bun:test";
import { PiMesh } from "./pi-mesh.ts";
import type { AnnouncePayload, PeerInfo } from "./types.ts";

/**
 * pe-rp4pdsnq: the roster was keyed by the EPHEMERAL sidecar clientId, so a
 * session that reconnected held two entries in peers() until the stale one
 * aged out (90s cutoff, 30s sweep), and every reconnect fired a spurious
 * peer-join (and, later, a spurious peer-leave). Any consumer iterating
 * peers() and telling each entry told one identity twice.
 *
 * These drive the REAL PiMesh roster code (_handleAnnounce and the eviction
 * sweep) directly — no sidecar needed, the roster is pure in-process state.
 */

interface RosterInternals {
  _handleAnnounce(ann: AnnouncePayload): void;
  _evictStalePeers(now: number): void;
  peerMap: Map<string, PeerInfo>;
}

function makeMesh() {
  const mesh = new PiMesh();
  const internals = mesh as unknown as RosterInternals;
  const joins: PeerInfo[] = [];
  const leaves: PeerInfo[] = [];
  mesh.on<PeerInfo>("peer-join", (p) => joins.push(p));
  mesh.on<PeerInfo>("peer-leave", (p) => leaves.push(p));
  return { mesh, internals, joins, leaves };
}

function ann(clientId: string, extra: Partial<AnnouncePayload> = {}): AnnouncePayload {
  return {
    clientId,
    zid: `zid-${clientId}`,
    sessionId: "sess-A",
    nickname: "Ada",
    hostname: "box",
    pid: 1,
    cwd: "/w",
    meshId: "mesh-A",
    claimedAt: 1000,
    ...extra,
  } as AnnouncePayload;
}

/** Age one raw client entry so the next sweep sees it as stale. */
function age(internals: RosterInternals, clientId: string, lastSeen: number): void {
  const p = internals.peerMap.get(clientId);
  if (!p) throw new Error(`no raw entry ${clientId}`);
  internals.peerMap.set(clientId, { ...p, lastSeen });
}

describe("pe-rp4pdsnq: one roster entry per session identity", () => {
  test("reconnect (same meshId, new clientId) -> one entry, id is the fresh clientId", () => {
    const { mesh, internals } = makeMesh();
    internals._handleAnnounce(ann("client-old"));
    age(internals, "client-old", Date.now() - 5_000);
    internals._handleAnnounce(ann("client-new"));

    const peers = mesh.peers();
    expect(peers).toHaveLength(1);
    expect(peers[0].id).toBe("client-new");
    expect(peers[0].meshId).toBe("mesh-A");
  });

  test("two legitimate live clients of one identity (presence + child) -> one entry", () => {
    const { mesh, internals } = makeMesh();
    internals._handleAnnounce(ann("presence-client", { sessionId: undefined }));
    internals._handleAnnounce(ann("child-client"));
    // Both keep heartbeating; whichever announced last is the freshest.
    age(internals, "child-client", Date.now() - 1_000);
    internals._handleAnnounce(ann("presence-client", { sessionId: undefined }));

    const peers = mesh.peers();
    expect(peers).toHaveLength(1);
    expect(peers[0].id).toBe("presence-client");
    // Both raw clients stay resolvable, so a message FROM the non-freshest
    // client still maps to the durable identity (mesh:control authorisation).
    expect(mesh.peerByClientId("child-client")?.meshId).toBe("mesh-A");
    expect(mesh.peerByClientId("presence-client")?.meshId).toBe("mesh-A");
  });

  test("different identities sharing a nickname stay separate", () => {
    const { mesh, internals, joins } = makeMesh();
    internals._handleAnnounce(ann("c1", { meshId: "mesh-A", sessionId: "sess-A", nickname: "Ada" }));
    internals._handleAnnounce(ann("c2", { meshId: "mesh-B", sessionId: "sess-B", nickname: "Ada" }));

    const peers = mesh.peers();
    expect(peers).toHaveLength(2);
    expect(peers.map((p) => p.meshId).sort()).toEqual(["mesh-A", "mesh-B"]);
    expect(joins).toHaveLength(2);
  });

  test("identity-less peers fall back to sessionId, then clientId", () => {
    const { mesh, internals } = makeMesh();
    internals._handleAnnounce(ann("c1", { meshId: undefined, sessionId: "sess-X" }));
    internals._handleAnnounce(ann("c2", { meshId: undefined, sessionId: "sess-X" }));
    internals._handleAnnounce(ann("c3", { meshId: undefined, sessionId: undefined }));
    internals._handleAnnounce(ann("c4", { meshId: undefined, sessionId: undefined }));
    expect(mesh.peers()).toHaveLength(3);
  });

  test("a fresh client's pre-identity announce (no meshId yet) bridges to its session's meshId", () => {
    const { mesh, internals, joins } = makeMesh();
    internals._handleAnnounce(ann("client-old"));
    expect(joins).toHaveLength(1);
    age(internals, "client-old", Date.now() - 5_000);
    // New process, same session: first announce precedes identity resolution.
    internals._handleAnnounce(ann("client-new", { meshId: undefined }));
    expect(mesh.peers()).toHaveLength(1);
    expect(mesh.peers()[0].id).toBe("client-new");
    // Then setIdentity() re-announces with the meshId.
    internals._handleAnnounce(ann("client-new"));
    expect(mesh.peers()).toHaveLength(1);
    expect(joins).toHaveLength(1);
  });
});

describe("pe-rp4pdsnq: no spurious peer-join / peer-leave on reconnect", () => {
  test("a new client for an identity already present is not a join", () => {
    const { internals, joins } = makeMesh();
    internals._handleAnnounce(ann("client-old"));
    internals._handleAnnounce(ann("client-new"));
    internals._handleAnnounce(ann("client-new")); // heartbeat
    expect(joins).toHaveLength(1);
    expect(joins[0].id).toBe("client-old");
  });

  test("the stale client ageing out while another client of the identity is live is not a leave", () => {
    const { mesh, internals, leaves } = makeMesh();
    const now = Date.now();
    internals._handleAnnounce(ann("client-old"));
    internals._handleAnnounce(ann("client-new"));
    age(internals, "client-old", now - 100_000);

    internals._evictStalePeers(now);
    expect(leaves).toHaveLength(0);
    expect(mesh.peers()).toHaveLength(1);
    expect(mesh.peers()[0].id).toBe("client-new");
    expect(internals.peerMap.has("client-old")).toBe(false);
  });

  test("the identity's last client going away IS a leave, emitted once", () => {
    const { mesh, internals, leaves } = makeMesh();
    const now = Date.now();
    internals._handleAnnounce(ann("client-old"));
    internals._handleAnnounce(ann("client-new"));
    age(internals, "client-old", now - 100_000);
    age(internals, "client-new", now - 95_000);

    internals._evictStalePeers(now);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].meshId).toBe("mesh-A");
    expect(mesh.peers()).toHaveLength(0);
  });

  test("a genuinely new identity still joins and leaves", () => {
    const { internals, joins, leaves } = makeMesh();
    const now = Date.now();
    internals._handleAnnounce(ann("c1"));
    internals._handleAnnounce(ann("c2", { meshId: "mesh-B", sessionId: "sess-B", nickname: "Bo" }));
    expect(joins.map((p) => p.id)).toEqual(["c1", "c2"]);
    age(internals, "c2", now - 100_000);
    internals._evictStalePeers(now);
    expect(leaves.map((p) => p.id)).toEqual(["c2"]);
  });
});
