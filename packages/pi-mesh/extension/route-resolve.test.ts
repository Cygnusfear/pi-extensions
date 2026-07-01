import { describe, expect, test } from "bun:test";
import { resolveDurableTarget, selectRoute } from "./route-resolve.ts";
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
});
