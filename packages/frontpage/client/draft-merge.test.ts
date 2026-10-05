import { describe, expect, test } from "bun:test";
import { mergeDraft } from "./draft-merge.ts";

const snap = (store: Record<string, unknown>) => ({ document: { store, schema: { schemaVersion: 2 } } });
const shape = (id: string, text: string) => ({ id, typeName: "shape", type: "note", meta: {}, props: { text } });

describe("mergeDraft", () => {
	test("applies the draft unchanged when the server has not moved", () => {
		const base = snap({ "shape:a": shape("shape:a", "before") });
		const draft = snap({ "shape:a": shape("shape:a", "edited"), "shape:b": shape("shape:b", "new") });
		const merge = mergeDraft(base, draft, base);
		expect(merge.conflicts).toEqual([]);
		expect(merge.merged).toEqual(draft);
	});

	test("keeps records the server gained while the draft was unsaved", () => {
		const base = snap({ "shape:a": shape("shape:a", "before") });
		const draft = snap({ "shape:a": shape("shape:a", "mine") });
		const server = snap({ "shape:a": shape("shape:a", "before"), "shape:agent": shape("shape:agent", "agent note") });
		const merge = mergeDraft(base, draft, server);
		expect(merge.conflicts).toEqual([]);
		expect(merge.merged).toEqual(snap({ "shape:a": shape("shape:a", "mine"), "shape:agent": shape("shape:agent", "agent note") }));
	});

	test("carries the draft's deletions without resurrecting server records", () => {
		const base = snap({ "shape:a": shape("shape:a", "x"), "shape:b": shape("shape:b", "y") });
		const draft = snap({ "shape:b": shape("shape:b", "y") });
		const server = snap({ "shape:a": shape("shape:a", "x"), "shape:b": shape("shape:b", "y"), "shape:c": shape("shape:c", "z") });
		const merge = mergeDraft(base, draft, server);
		expect(merge.conflicts).toEqual([]);
		expect(Object.keys((merge.merged as { document: { store: Record<string, unknown> } }).document.store).sort()).toEqual(["shape:b", "shape:c"]);
	});

	test("reports the record when both sides changed it", () => {
		const base = snap({ "shape:a": shape("shape:a", "before") });
		const draft = snap({ "shape:a": shape("shape:a", "mine") });
		const server = snap({ "shape:a": shape("shape:a", "theirs") });
		const merge = mergeDraft(base, draft, server);
		expect(merge.conflicts).toEqual(["shape:a"]);
	});

	test("keeps the draft's document shape for other snapshot keys", () => {
		const base = { document: { store: {}, schema: { schemaVersion: 2 } }, session: { pageId: "page:one" } };
		const merge = mergeDraft(base, base, snap({ "shape:a": shape("shape:a", "server") }));
		expect(merge.merged).toEqual({ document: { store: { "shape:a": shape("shape:a", "server") }, schema: { schemaVersion: 2 } }, session: { pageId: "page:one" } });
	});
});
