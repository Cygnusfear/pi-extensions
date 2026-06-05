import { describe, expect, test } from "bun:test";
import { buildSessionTailSnapshot, projectMeaningfulSessionEntries } from "./session-view.ts";

// A raw "message" entry the projector recognises.
function msgEntry(role: string, text: string, ts = "2026-06-05T10:00:00.000Z") {
	return { type: "message", timestamp: ts, message: { role, content: text } };
}

describe("projectMeaningfulSessionEntries — index offset", () => {
	test("indexOffset shifts entry indices to absolute branch positions", () => {
		const entries = [msgEntry("user", "a"), msgEntry("assistant", "b")];
		const projected = projectMeaningfulSessionEntries(entries, 100);
		expect(projected.map((e) => e.index)).toEqual([100, 101]);
	});

	test("default offset preserves legacy 0-based indices", () => {
		const projected = projectMeaningfulSessionEntries([msgEntry("user", "a")]);
		expect(projected[0].index).toBe(0);
	});
});

describe("buildSessionTailSnapshot — bounded, absolute, safe", () => {
	test("returns at most windowN entries from the tail", () => {
		const branch = Array.from({ length: 50 }, (_, i) => msgEntry("user", "m" + i));
		const snap = buildSessionTailSnapshot(branch, 40, 15);
		expect(snap.entries.length).toBe(15);
		// last entry is the newest message
		expect(snap.entries[snap.entries.length - 1].text).toBe("m49");
	});

	test("preserves ABSOLUTE branch indices (does not project the whole branch)", () => {
		const branch = Array.from({ length: 50 }, (_, i) => msgEntry("user", "m" + i));
		const snap = buildSessionTailSnapshot(branch, 40, 15);
		// tailRaw=40 → offset 10; windowN=15 → last 15 of the 40 projected → index 35..49
		expect(snap.entries[0].index).toBe(35);
		expect(snap.windowFrom).toBe(35);
		// total reflects only the projected tail (<= tailRaw), not the whole session
		expect(snap.total).toBe(40);
	});

	test("short branch: returns everything, windowFrom is the first index", () => {
		const branch = [msgEntry("user", "only")];
		const snap = buildSessionTailSnapshot(branch, 40, 15);
		expect(snap.entries.length).toBe(1);
		expect(snap.entries[0].index).toBe(0);
		expect(snap.windowFrom).toBe(0);
	});

	test("empty branch is safe and yields the empty-window text", () => {
		const snap = buildSessionTailSnapshot([], 40, 15);
		expect(snap.entries).toEqual([]);
		expect(snap.total).toBe(0);
		expect(snap.text).toBe("(no meaningful entries in that window)");
	});

	test("skips non-meaningful entries (e.g. heartbeats) when projecting the tail", () => {
		const branch = [
			msgEntry("user", "real-1"),
			{ type: "custom", customType: "teams-worker-heartbeat", data: "noise" },
			msgEntry("assistant", "real-2"),
		];
		const snap = buildSessionTailSnapshot(branch, 40, 15);
		expect(snap.entries.map((e) => e.text)).toEqual(["real-1", "real-2"]);
	});
});
