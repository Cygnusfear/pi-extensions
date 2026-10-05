import { describe, expect, test } from "bun:test";
import { prepareHistorySnapshot } from "./history-snapshot.ts";

const size = { width: 1280, height: 900 };
const storeOf = (prepared: unknown) => (prepared as { document: { store: Record<string, Record<string, unknown>> } }).document.store;

describe("prepareHistorySnapshot", () => {
	test("shows the page an annotation-only snapshot was recorded against", () => {
		const snapshot = { document: { store: { "page:page": { typeName: "page", id: "page:page" }, "shape:note": { typeName: "shape", id: "shape:note", type: "note", index: "a1", props: { text: "hi" } } } } };
		const store = storeOf(prepareHistorySnapshot(snapshot, "doc", 42, size));
		const embed = store["shape:versioned-embed"] as { props: Record<string, unknown>; parentId: string; index: string };
		expect(embed.props).toEqual({ w: 1280, h: 900, slug: "doc", ts: 42 });
		expect(embed.parentId).toBe("page:page");
		expect(embed.index > "a1").toBe(true);
		expect((store["shape:note"] as { props: Record<string, unknown> }).props).toEqual({ text: "hi" });
	});

	test("pins an existing embed to the version being viewed", () => {
		const snapshot = { document: { store: { "shape:embed": { typeName: "shape", id: "shape:embed", type: "frontpage-embed", x: 5, index: "a1", props: { w: 600, h: 400, slug: "doc", ts: 0 } } } } };
		const store = storeOf(prepareHistorySnapshot(snapshot, "doc", 99, size));
		expect(store["shape:embed"]).toEqual({ typeName: "shape", id: "shape:embed", type: "versioned-embed", x: 5, index: "a1", props: { w: 600, h: 400, slug: "doc", ts: 99 } });
		expect(store["shape:versioned-embed"]).toBeUndefined();
	});

	test("reads a snapshot it cannot understand without inventing records", () => {
		expect(storeOf(prepareHistorySnapshot(null, "doc", 1, size))["shape:versioned-embed"]).toBeDefined();
	});
});
