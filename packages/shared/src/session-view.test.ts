import { describe, expect, test } from "bun:test";
import {
	buildSessionTailSnapshotFromLeaf,
	capSessionViewEntries,
	formatSessionViewEntries,
	projectMeaningfulSessionEntries,
	SESSION_VIEW_TOTAL_CHARS,
	TELL_ACK_ENTRY_CHARS,
	TELL_ACK_TOTAL_CHARS,
} from "./session-view.ts";

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

describe("shouldIncludeCustomEntry — noise filtering (context-pollution)", () => {
	test("teams-leader-state (the 104KB bookkeeping blob) is excluded from the projection", () => {
		const entries = [
			{ type: "custom", customType: "teams-leader-state", data: { v2TeamRecord: { workers: { w: "x".repeat(5000) } } } },
			{ type: "custom", customType: "team-event", data: "worker completed: review done" },
		];
		const projected = projectMeaningfulSessionEntries(entries);
		// leader-state is internal bookkeeping → filtered out of every session-view surface
		expect(projected.find((e) => e.label === "teams-leader-state")).toBeUndefined();
		// team-event is meaningful worker activity → kept
		expect(projected.find((e) => e.label === "team-event")).toBeDefined();
	});
	test("teams-worker-heartbeat stays filtered (regression)", () => {
		const projected = projectMeaningfulSessionEntries([{ type: "custom", customType: "teams-worker-heartbeat", data: "tick" }]);
		expect(projected.length).toBe(0);
	});
});

describe("session-view caps — a single fat entry can never flood (context-pollution)", () => {
	test("formatSessionViewEntries bounds per-entry AND total", () => {
		const fat = [{ index: 0, label: "tool result", text: "x".repeat(50_000), type: "message" }];
		const out = formatSessionViewEntries(fat);
		expect(out.length).toBeLessThanOrEqual(SESSION_VIEW_TOTAL_CHARS + 120);
		expect(out).toContain("chars truncated");
	});
	test("capSessionViewEntries bounds the WIRE entries[] text (not just rendered)", () => {
		const fat = [{ index: 0, label: "x", text: "y".repeat(10_000), type: "message" }];
		const capped = capSessionViewEntries(fat, 300);
		expect(capped[0].text.length).toBeLessThan(400);
		// identity-returns when nothing needs truncating
		const small = [{ index: 0, label: "x", text: "ok", type: "message" }];
		expect(capSessionViewEntries(small)).toBe(small);
	});
	test("tell-ack snapshot stays a tiny glance even with a fat leaf entry", () => {
		const fatLeaf = {
			id: "L", parentId: null, type: "message", timestamp: "2026-06-05T10:00:00.000Z",
			message: { role: "assistant", content: "z".repeat(40_000) },
		};
		const snap = buildSessionTailSnapshotFromLeaf(() => fatLeaf, () => null);
		expect(snap.text.length).toBeLessThanOrEqual(TELL_ACK_TOTAL_CHARS + 120);
		expect(snap.entries[0].text.length).toBeLessThanOrEqual(TELL_ACK_ENTRY_CHARS + 80);
	});
});

describe("capSessionViewEntries — TOTAL array budget (closes the entries[] review finding)", () => {
	test("a wide window of many entries returns a bounded array — newest within budget", () => {
		// 200 entries x 100 chars = 20000 > 4000 budget → only the newest fit
		const many = Array.from({ length: 200 }, (_, i) => ({ index: i, label: "m", text: "x".repeat(100), type: "message" }));
		const capped = capSessionViewEntries(many);
		const totalChars = capped.reduce((s, e) => s + e.text.length, 0);
		expect(totalChars).toBeLessThanOrEqual(SESSION_VIEW_TOTAL_CHARS + 120);
		expect(capped.length).toBeLessThan(many.length); // dropped older entries
		expect(capped[capped.length - 1].index).toBe(199); // kept the NEWEST
	});
	test("small arrays under budget identity-return", () => {
		const small = [{ index: 0, label: "x", text: "ok", type: "message" }];
		expect(capSessionViewEntries(small)).toBe(small);
	});
});