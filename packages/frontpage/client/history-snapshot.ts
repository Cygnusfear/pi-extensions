import { getIndexAbove, type IndexKey } from "@tldraw/utils";

const EMBED_TYPES = new Set(["frontpage-embed", "versioned-embed"]);

interface ShapeRecord {
	typeName?: string;
	type?: string;
	id?: string;
	index?: string;
	parentId?: string;
	props?: Record<string, unknown>;
}

function dimension(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Prepare a history snapshot for the Time Machine.
 *
 * The Time Machine shows a version in a READ-ONLY editor, and a read-only
 * editor refuses to create or update shapes. So the historical page is put into
 * the snapshot before it is loaded: every embed becomes the versioned embed
 * that fetches that version's HTML, and an annotation-only snapshot gets one at
 * the document's measured extent. Nothing is guessed about the annotations —
 * they are loaded exactly as they were recorded.
 */
export function prepareHistorySnapshot(
	snapshot: unknown,
	slug: string,
	ts: number,
	size: { width: number; height: number },
): unknown {
	const source = (snapshot ?? {}) as { document?: { store?: Record<string, unknown> } };
	const store: Record<string, unknown> = { ...(source.document?.store ?? {}) };
	let embeds = 0;
	let parentId = "page:page";
	let lastIndex: string | undefined;
	for (const [id, record] of Object.entries(store)) {
		if (!record || typeof record !== "object") continue;
		const shape = record as ShapeRecord;
		if (shape.typeName === "page" && typeof shape.id === "string") parentId = shape.id;
		if (shape.typeName !== "shape") continue;
		if (shape.index !== undefined && (lastIndex === undefined || shape.index > lastIndex)) lastIndex = shape.index;
		if (shape.type === undefined || !EMBED_TYPES.has(shape.type)) continue;
		embeds++;
		store[id] = {
			...shape,
			type: "versioned-embed",
			props: {
				w: dimension(shape.props?.w, size.width),
				h: dimension(shape.props?.h, size.height),
				slug,
				ts,
			},
		};
	}
	if (embeds === 0) {
		store["shape:versioned-embed"] = {
			typeName: "shape",
			id: "shape:versioned-embed",
			type: "versioned-embed",
			x: 0,
			y: 0,
			rotation: 0,
			index: lastIndex === undefined ? "a1" : getIndexAbove(lastIndex as IndexKey),
			parentId,
			isLocked: false,
			opacity: 1,
			meta: {},
			props: { w: size.width, h: size.height, slug, ts },
		};
	}
	return { ...source, document: { ...source.document, store } };
}

/** The extent the Time Machine should show a historical page at. */
export function historyStageSize(): { width: number; height: number } {
	return {
		width: Math.max(1200, document.documentElement.scrollWidth),
		height: Math.max(800, document.documentElement.scrollHeight),
	};
}
