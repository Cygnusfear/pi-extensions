import { test, expect } from "bun:test";
import { toDocumentCoordinates, snapshotStore, annotationOffset, contentAnchor, anchorPosition, referenceAnchor, type LayoutSection } from "./annotation-coordinates.ts";

// Proves this change's coordinate conversion preserves every legacy record.
test("document conversion translates current notes, preserves history, and runs once", () => {
	const snapshot = { document: { store: {
		doc: { id: "doc", typeName: "document", x: 0, y: 0, meta: {} },
		live: { id: "live", typeName: "shape", type: "frontpage-embed", parentId: "page:page", x: 100, y: 50, props: { slug: "proof", ts: 0, w: 500, h: 900 } },
		past: { id: "past", typeName: "shape", type: "frontpage-embed", parentId: "page:page", x: 900, y: 50, props: { slug: "proof", ts: 1, w: 500, h: 900 } },
		note: { id: "note", typeName: "shape", type: "note", parentId: "page:page", x: 120, y: 80 },
		old: { id: "old", typeName: "shape", type: "draw", parentId: "page:page", x: 920, y: 80 },
	} } };
	const converted = toDocumentCoordinates(snapshot, "proof");
	const records = snapshotStore(converted)!;
	expect(Object.keys(records)).toHaveLength(5);
	expect(records.note).toMatchObject({ x: 20, y: 30 });
	expect(records.old).toMatchObject({ x: 920, y: 80, meta: { frontpageLegacy: "historical or ambiguous canvas attachment" } });
	expect(annotationOffset(converted)).toEqual({ x: 0, y: 0 });
	expect(toDocumentCoordinates(converted, "proof")).toEqual(converted);
	expect(snapshot.document.store.note.x).toBe(120);
});

test("item anchors follow reflow and reordered items, not a reused index or duplicate section", () => {
	const section: LayoutSection = { id: "s1", x: 10, y: 100, w: 300, h: 200, items: [{ idx: 0, tag: "p", text: "the target", x: 10, y: 120, w: 300, h: 60 }] };
	const anchor = contentAnchor({ x: 100, y: 140 }, { x: 40, y: 130 }, [section])!;
	expect(anchor.item?.text).toBe("the target");
	const moved = { ...section, items: [{ ...section.items![0]!, idx: 2, x: 20, y: 250, w: 600 }] };
	expect(anchorPosition(anchor, [moved])).toEqual({ x: 80, y: 260 });
	expect(anchorPosition(anchor, [{ ...moved, items: [{ ...moved.items[0]!, text: "different content" }] }])).toBeNull();
	expect(contentAnchor({ x: 100, y: 140 }, { x: 40, y: 130 }, [section, section])).toBeNull();
});

// An explicit item must not be replaced by proximity when its note sits in the margin.
test("explicit margin anchors retain the item and reject ambiguous or unusable targets", () => {
	const section: LayoutSection = { id: "s1", x: 10, y: 100, w: 300, h: 200, items: [{ idx: 0, tag: "p", text: "target", x: 10, y: 120, w: 300, h: 60 }] };
	const anchor = referenceAnchor({ section: "s1", item: 0 }, { x: 410, y: 130 }, [section])!;
	expect(anchor.item?.text).toBe("target");
	expect(anchorPosition(anchor, [section])).toEqual({ x: 410, y: 130 });
	expect(referenceAnchor({ section: "s1", item: 9 }, { x: 410, y: 130 }, [section])).toBeNull();
	expect(referenceAnchor({ section: "s1" }, { x: 410, y: 130 }, [section, section])).toBeNull();
	expect(anchorPosition({ ...anchor, xFraction: Infinity }, [section])).toBeNull();
});
