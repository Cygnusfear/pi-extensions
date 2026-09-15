import { describe, expect, test } from "bun:test";
import { resolveDurableTarget, resolveOfflineDurableTarget, selectRoute } from "./route-resolve.ts";
import type { PeerInfo } from "./types.ts";

function peer(p: Partial<PeerInfo> & { id: string }): PeerInfo {
	return { lastSeen: Date.now(), ...p };
}

describe("selectRoute — durable id is the route", () => {
	test("prefers the durable meshId over the sidecar clientId", () => {
		expect(selectRoute(peer({ id: "client-1", meshId: "durable-abc" }))).toBe("durable-abc");
	});
	test("falls back to clientId when no identity resolved yet", () => {
		expect(selectRoute(peer({ id: "client-1" }))).toBe("client-1");
	});
});

describe("resolveDurableTarget — durable-id routing", () => {
	const peers: PeerInfo[] = [
		peer({ id: "client-A", meshId: "durable-A", sessionId: "sess-A", nickname: "Carl Ufo Hawkins" }),
		peer({ id: "client-B", meshId: "durable-B", sessionId: "sess-B", nickname: "Vera Supernova Sagan" }),
	];

	test("resolves an exact durable id to the durable route", () => {
		expect(resolveDurableTarget(peers, "durable-A")).toBe("durable-A");
	});

	test("resolves an exact clientId to that peer's durable route (not the clientId)", () => {
		// Addressing by the transient clientId still routes over the durable topic.
		expect(resolveDurableTarget(peers, "client-A")).toBe("durable-A");
	});

	test("resolves a nickname to the durable route", () => {
		expect(resolveDurableTarget(peers, "vera supernova sagan")).toBe("durable-B");
	});

	test("resolves a unique durable-id prefix to the durable route", () => {
		const solo = [peer({ id: "cX", meshId: "durable-unique-123456", nickname: "Solo Nova Ryle" })];
		expect(resolveDurableTarget(solo, "durable-unique")).toBe("durable-unique-123456");
	});

	test("an ambiguous durable-id prefix throws", () => {
		expect(() => resolveDurableTarget(peers, "durable")).toThrow(/ambiguous/);
	});

	test("CHURN PROOF: the durable id stays routable after the clientId changes", () => {
		// Same durable identity, brand-new sidecar clientId (reconnect / resume).
		const beforeChurn = [peer({ id: "client-OLD", meshId: "durable-X", nickname: "Nadia Pulsar Ryle" })];
		const afterChurn = [peer({ id: "client-NEW", meshId: "durable-X", nickname: "Nadia Pulsar Ryle" })];
		// Addressed by the durable id, the resolved ROUTE is identical across churn.
		expect(resolveDurableTarget(beforeChurn, "durable-X")).toBe("durable-X");
		expect(resolveDurableTarget(afterChurn, "durable-X")).toBe("durable-X");
		// Addressed by the STABLE nickname, the route is the durable id both times —
		// never the (now-stale) clientId.
		expect(resolveDurableTarget(beforeChurn, "Nadia Pulsar Ryle")).toBe("durable-X");
		expect(resolveDurableTarget(afterChurn, "Nadia Pulsar Ryle")).toBe("durable-X");
	});

	test("throws with the online list when nothing matches", () => {
		expect(() => resolveDurableTarget(peers, "nobody")).toThrow(/No peer matching/);
	});

	test("legacy peer without a durable id still routes by clientId", () => {
		const legacy = [peer({ id: "legacy-client", nickname: "Old Timer" })];
		expect(resolveDurableTarget(legacy, "legacy-client")).toBe("legacy-client");
		expect(resolveDurableTarget(legacy, "old timer")).toBe("legacy-client");
	});

	test("STALE-DUPLICATE PROOF: two clientIds for the same durable id+nickname (a restart before ~90s eviction) resolve, not ambiguous", () => {
		const peers = [
			peer({ id: "client-STALE", meshId: "durable-H", nickname: "The Hooman", lastSeen: 1000 }),
			peer({ id: "client-LIVE", meshId: "durable-H", nickname: "The Hooman", lastSeen: 2000 }),
		];
		// Before the fix this threw "ambiguous"; the duplicate (same durable identity) now collapses to one.
		expect(resolveDurableTarget(peers, "The Hooman")).toBe("durable-H");
		expect(resolveDurableTarget(peers, "durable-H")).toBe("durable-H");
	});
});

describe("resolveOfflineDurableTarget — nickname routing for offline peers (kal-sbc4q4l9)", () => {
	const dur = (durableId: string, nickname?: string) => ({ durableId, nickname });

	test("an offline peer's nickname resolves to its durable id", () => {
		const c = [dur("durable-valencia", "Valencia")];
		expect(resolveOfflineDurableTarget(c, "Valencia")).toEqual({ kind: "resolved", durableId: "durable-valencia" });
	});

	test("matching is case-insensitive and ignores surrounding whitespace", () => {
		const c = [dur("d-1", "Jedidah Uranus Medeiros")];
		// Surrounding whitespace and case are normalised; INTERNAL spacing is not, on
		// purpose. Folding runs of spaces would be a matching policy nobody asked for and
		// it manufactures collisions between distinct nicknames, so the resolver stays
		// byte-exact on the inside of a name.
		expect(resolveOfflineDurableTarget(c, "  Jedidah Uranus Medeiros  ")).toEqual({ kind: "resolved", durableId: "d-1" });
		expect(resolveOfflineDurableTarget(c, "Jedidah  Uranus Medeiros").kind).toBe("none");
	});

	test("two registrations sharing one durable id are not an ambiguity", () => {
		const c = [dur("d-1", "Valencia"), dur("d-1", "Valencia")];
		expect(resolveOfflineDurableTarget(c, "valencia").kind).toBe("resolved");
	});

	test("a genuinely ambiguous nickname names every candidate", () => {
		const c = [dur("d-2", "Valencia"), dur("d-1", "valencia")];
		const r = resolveOfflineDurableTarget(c, "Valencia");
		expect(r.kind).toBe("ambiguous");
		if (r.kind === "ambiguous") expect(r.durableIds).toEqual(["d-1", "d-2"]);
	});

	test("no match and blank input both yield none rather than a guess", () => {
		const c = [dur("d-1", "Valencia")];
		expect(resolveOfflineDurableTarget(c, "Nobody").kind).toBe("none");
		expect(resolveOfflineDurableTarget(c, "   ").kind).toBe("none");
		expect(resolveOfflineDurableTarget([], "Valencia").kind).toBe("none");
	});

	test("a descriptor with no nickname cannot match any name", () => {
		expect(resolveOfflineDurableTarget([dur("d-1"), dur("d-2", undefined)], "d-1").kind).toBe("none");
	});
});
// kal-sbc4q4l9: an offline peer must be addressable by nickname. The matcher is pure
// and takes candidates, so these rules are pinned without touching the filesystem —
// the same matcher both the delivery path and the refusal message use, so the two
// cannot disagree about what "ambiguous" means.
