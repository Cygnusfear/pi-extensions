import { describe, expect, test } from "bun:test";
import type { MeshIdentity } from "@pi-extensions/shared/session-nickname";
import { deriveTripleName } from "@pi-extensions/shared/session-nickname";
import { isIdentityReuseReason, resolveReuseNickname } from "./identity-pin.ts";
import type { PeerInfo } from "./types.ts";

function peer(p: Partial<PeerInfo> & { id: string }): PeerInfo {
	return { lastSeen: Date.now(), ...p };
}

const ID = "durable-session-abc";
const identity: MeshIdentity = {
	id: ID,
	nickname: deriveTripleName(ID),
	claimedAt: 1_700_000_000_000,
	host: "host-1",
};

describe("isIdentityReuseReason — resume/revive REUSE the pinned id", () => {
	test("reload / resume / startup reuse", () => {
		expect(isIdentityReuseReason("reload", false)).toBe(true);
		expect(isIdentityReuseReason("resume", false)).toBe(true);
		expect(isIdentityReuseReason("startup", false)).toBe(true);
	});
	test("an unknown reason reuses (conservative — keep the identity)", () => {
		expect(isIdentityReuseReason("whatever", false)).toBe(true);
	});
	test("fork always mints a fresh identity", () => {
		expect(isIdentityReuseReason("fork", false)).toBe(false);
		expect(isIdentityReuseReason("fork", true)).toBe(false);
	});
	test("a genuinely new session mints, but /rebirth reuses", () => {
		expect(isIdentityReuseReason("new", false)).toBe(false);
		expect(isIdentityReuseReason("new", true)).toBe(true); // rebirth marker present
	});
});

describe("resolveReuseNickname — /resume keeps the same name", () => {
	test("no peers → keep the pinned nickname", () => {
		const r = resolveReuseNickname(identity, []);
		expect(r.nickname).toBe(identity.nickname);
		expect(r.changed).toBe(false);
	});

	test("PIN PROOF: a lingering same-id predecessor does NOT rename us", () => {
		// A just-exited incarnation of THIS session still sits in the 90s peer window,
		// announcing the same durable id + same nickname. That is us, not a duplicate.
		const predecessor = peer({ id: "client-OLD", meshId: ID, nickname: identity.nickname });
		const r = resolveReuseNickname(identity, [predecessor]);
		expect(r.nickname).toBe(identity.nickname);
		expect(r.changed).toBe(false);
	});

	test("a DIFFERENT identity holding our nickname → reclaim a new display name", () => {
		// Genuine collision: another session (different durable id) already shows our name.
		const other = peer({ id: "client-Z", meshId: "durable-OTHER", nickname: identity.nickname });
		const r = resolveReuseNickname(identity, [other]);
		expect(r.changed).toBe(true);
		expect(r.nickname).not.toBe(identity.nickname);
	});

	test("unrelated peers with different names → keep the pinned nickname", () => {
		const others = [
			peer({ id: "c1", meshId: "d1", nickname: "Vera Supernova Sagan" }),
			peer({ id: "c2", meshId: "d2", nickname: "Nadia Pulsar Ryle" }),
		];
		const r = resolveReuseNickname(identity, others);
		expect(r.nickname).toBe(identity.nickname);
		expect(r.changed).toBe(false);
	});
});
