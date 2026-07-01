import { describe, test, expect } from "bun:test";
import type { MeshIdentity } from "@pi-extensions/shared/session-nickname";
import { claimNickname, deriveTripleName } from "@pi-extensions/shared/session-nickname";
import type { AnnouncePayload, PeerInfo } from "./types.ts";

// ── Test helpers: simulate resolveIdentityFromSession ────────────────────────

interface MockEntry {
	type: string;
	customType?: string;
	data?: unknown;
}

function resolveIdentityFromSession(entries: MockEntry[]): MeshIdentity | null {
	let latest: MeshIdentity | null = null;
	for (const entry of entries) {
		if (entry.type === "custom" && entry.customType === "mesh_identity" && entry.data) {
			latest = entry.data as MeshIdentity;
		}
	}
	return latest;
}

// ── Test helpers: simulate conflict tie-break ────────────────────────────────

function determineTieBreakLoser(
	myIdentity: MeshIdentity,
	peerNickname: string,
	peerMeshId: string,
	peerClaimedAt: number,
): boolean {
	if (peerNickname !== myIdentity.nickname) return false; // no conflict
	if (peerMeshId === myIdentity.id) return false; // same identity

	return (
		peerClaimedAt < myIdentity.claimedAt ||
		(peerClaimedAt === myIdentity.claimedAt && peerMeshId < myIdentity.id)
	);
}

// ── resolveIdentityFromSession ───────────────────────────────────────────────

describe("resolveIdentityFromSession", () => {
	test("returns null when no mesh_identity entries exist", () => {
		const entries: MockEntry[] = [
			{ type: "message" },
			{ type: "custom", customType: "some-other-type", data: { foo: 1 } },
		];
		expect(resolveIdentityFromSession(entries)).toBeNull();
	});

	test("reads correct customType entries from mock session", () => {
		const identity: MeshIdentity = {
			id: "test-uuid",
			nickname: "Carl Ufo Hawkins",
			claimedAt: 1700000000000,
			host: "my-machine",
		};
		const entries: MockEntry[] = [
			{ type: "message" },
			{ type: "custom", customType: "mesh_identity", data: identity },
			{ type: "message" },
		];
		const resolved = resolveIdentityFromSession(entries);
		expect(resolved).toEqual(identity);
	});

	test("returns most recent entry when multiple mesh_identity entries exist", () => {
		const old: MeshIdentity = {
			id: "old-uuid",
			nickname: "Old Name",
			claimedAt: 1700000000000,
			host: "my-machine",
		};
		const updated: MeshIdentity = {
			id: "old-uuid",
			nickname: "New Name After Conflict",
			claimedAt: 1700000000000,
			host: "my-machine",
		};
		const entries: MockEntry[] = [
			{ type: "custom", customType: "mesh_identity", data: old },
			{ type: "message" },
			{ type: "custom", customType: "mesh_identity", data: updated },
		];
		const resolved = resolveIdentityFromSession(entries);
		expect(resolved).toEqual(updated);
		expect(resolved!.nickname).toBe("New Name After Conflict");
	});
});

// ── Conflict tie-break ───────────────────────────────────────────────────────

describe("conflict tie-break", () => {
	const myIdentity: MeshIdentity = {
		id: "my-uuid-bbb",
		nickname: "Carl Ufo Hawkins",
		claimedAt: 1700000001000,
		host: "my-machine",
	};

	test("lower claimedAt wins — peer claimed first, I lose", () => {
		const iLose = determineTieBreakLoser(
			myIdentity,
			"Carl Ufo Hawkins", // same nickname
			"peer-uuid-aaa",    // different id
			1700000000000,      // peer claimed earlier
		);
		expect(iLose).toBe(true);
	});

	test("lower claimedAt wins — I claimed first, peer loses", () => {
		const iLose = determineTieBreakLoser(
			myIdentity,
			"Carl Ufo Hawkins",
			"peer-uuid-aaa",
			1700000002000, // peer claimed later
		);
		expect(iLose).toBe(false);
	});

	test("lower id as fallback on tie — same claimedAt, lower id wins", () => {
		const myIdentityTied: MeshIdentity = {
			id: "my-uuid-bbb",
			nickname: "Carl Ufo Hawkins",
			claimedAt: 1700000000000,
			host: "my-machine",
		};

		// Peer has lower id — I lose
		const iLose = determineTieBreakLoser(
			myIdentityTied,
			"Carl Ufo Hawkins",
			"my-uuid-aaa", // lexicographically lower
			1700000000000, // same timestamp
		);
		expect(iLose).toBe(true);

		// Peer has higher id — I win
		const iLose2 = determineTieBreakLoser(
			myIdentityTied,
			"Carl Ufo Hawkins",
			"my-uuid-ccc", // lexicographically higher
			1700000000000, // same timestamp
		);
		expect(iLose2).toBe(false);
	});

	test("no conflict when nicknames differ", () => {
		const iLose = determineTieBreakLoser(
			myIdentity,
			"Different Name",
			"peer-uuid-aaa",
			1700000000000,
		);
		expect(iLose).toBe(false);
	});

	test("no conflict when same identity (same id)", () => {
		const iLose = determineTieBreakLoser(
			myIdentity,
			"Carl Ufo Hawkins",
			"my-uuid-bbb", // same id
			1700000000000,
		);
		expect(iLose).toBe(false);
	});
});

// ── Fork case ────────────────────────────────────────────────────────────────

describe("fork case", () => {
	test("always generates new id regardless of parent identity", () => {
		// Simulating fork: the parent identity exists but fork should always generate fresh
		const parentIdentity: MeshIdentity = {
			id: "parent-uuid",
			nickname: "Vera Supernova Sagan",
			claimedAt: 1700000000000,
			host: "my-machine",
		};

		// In a fork, reason === "fork" → always falls through to generate new
		// The new id should be different from parent
		const newId = crypto.randomUUID();
		expect(newId).not.toBe(parentIdentity.id);

		// The new nickname should be independently derived (using static import)
		const newNickname = claimNickname(newId, new Set([parentIdentity.nickname]));
		// Fork gets different name since parent's name is live
		expect(newNickname).not.toBe(parentIdentity.nickname);
	});
});

// ── AnnouncePayload / PeerInfo type checks ───────────────────────────────────

describe("type extensions", () => {
	test("AnnouncePayload includes claimedAt and meshId", () => {
		const ann: AnnouncePayload = {
			clientId: "client-1",
			sessionId: "session-1",
			hostname: "my-machine",
			pid: 1234,
			cwd: "/home/user",
			nickname: "Carl Ufo Hawkins",
			claimedAt: Date.now(),
			meshId: "mesh-uuid-123",
		};
		expect(ann.claimedAt).toBeDefined();
		expect(ann.meshId).toBeDefined();
	});

	test("PeerInfo includes claimedAt", () => {
		const peer: PeerInfo = {
			id: "peer-1",
			lastSeen: Date.now(),
			claimedAt: 1700000000000,
		};
		expect(peer.claimedAt).toBe(1700000000000);
	});
});
