import { describe, expect, test } from "bun:test";
import { buildSessionTailSnapshotFromLeaf, projectMeaningfulSessionEntries } from "./session-view.ts";

// A raw "message" entry the projector recognises.
function msg(role: string, text: string, ts = "2026-06-05T10:00:00.000Z") {
	return { type: "message", timestamp: ts, message: { role, content: text } };
}
// A linked-list branch: e0 (root) -> e1 -> ... -> e(n-1) (leaf), each via parentId.
function linkedBranch(n: number) {
	const arr = Array.from({ length: n }, (_, i) => ({ id: "e" + i, parentId: i > 0 ? "e" + (i - 1) : null, ...msg("user", "m" + i) }));
	const byId = new Map(arr.map((e) => [e.id, e]));
	return { leaf: arr[n - 1] ?? null, getEntry: (id: string) => byId.get(id) ?? null };
}

describe("projectMeaningfulSessionEntries — index offset", () => {
	test("indexOffset shifts entry indices to absolute positions", () => {
		const projected = projectMeaningfulSessionEntries([msg("user", "a"), msg("assistant", "b")], 100);
		expect(projected.map((e) => e.index)).toEqual([100, 101]);
	});
	test("default offset preserves legacy 0-based indices", () => {
		expect(projectMeaningfulSessionEntries([msg("user", "a")])[0].index).toBe(0);
	});
});

describe("buildSessionTailSnapshotFromLeaf — O(window) parentId walk", () => {
	test("returns at most windowN entries from the tail (newest last)", () => {
		const b = linkedBranch(50);
		const snap = buildSessionTailSnapshotFromLeaf(() => b.leaf, b.getEntry, 40, 15);
		expect(snap.entries.length).toBe(15);
		expect(snap.entries[snap.entries.length - 1].text).toBe("m49");
	});

	test("walks back at most tailRaw entries (bounded; does NOT materialise the whole branch)", () => {
		const b = linkedBranch(50);
		// tailRaw=40 -> walk back 40 from leaf (m49..m10); windowN=15 -> last 15 -> m35..m49
		const snap = buildSessionTailSnapshotFromLeaf(() => b.leaf, b.getEntry, 40, 15);
		expect(snap.entries[0].text).toBe("m35");
		expect(snap.total).toBe(40); // projected count within the tail, not the whole branch
	});

	test("short branch: returns everything", () => {
		const b = linkedBranch(1);
		const snap = buildSessionTailSnapshotFromLeaf(() => b.leaf, b.getEntry, 40, 15);
		expect(snap.entries.length).toBe(1);
		expect(snap.entries[0].text).toBe("m0");
	});

	test("null leaf is safe and yields the empty-window text", () => {
		const snap = buildSessionTailSnapshotFromLeaf(() => null, () => null, 40, 15);
		expect(snap.entries).toEqual([]);
		expect(snap.total).toBe(0);
		expect(snap.text).toBe("(no meaningful entries in that window)");
	});

	test("skips non-meaningful entries (e.g. heartbeats) in the walked tail", () => {
		const e0 = { id: "e0", parentId: null, ...msg("user", "real-1") };
		const hb = { id: "e1", parentId: "e0", type: "custom", customType: "teams-worker-heartbeat", data: "noise" };
		const e2 = { id: "e2", parentId: "e1", ...msg("assistant", "real-2") };
		const byId = new Map<string, unknown>([["e0", e0], ["e1", hb], ["e2", e2]]);
		const snap = buildSessionTailSnapshotFromLeaf(() => e2, (id) => byId.get(id) ?? null, 40, 15);
		expect(snap.entries.map((e) => e.text)).toEqual(["real-1", "real-2"]);
	});

	test("respects tailRaw bound: only the last tailRaw raw entries are walked", () => {
		const b = linkedBranch(100);
		const snap = buildSessionTailSnapshotFromLeaf(() => b.leaf, b.getEntry, 5, 5);
		// only 5 raw entries walked -> m95..m99
		expect(snap.entries.map((e) => e.text)).toEqual(["m95", "m96", "m97", "m98", "m99"]);
		expect(snap.total).toBe(5);
	});
});
