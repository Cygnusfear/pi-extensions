export interface Point { x: number; y: number }
export interface Bounds extends Point { w: number; h: number }
export interface LayoutItem extends Bounds { idx: number; tag: string; text: string }
export interface LayoutSection extends Bounds { id: string; items?: LayoutItem[] }
export interface ContentAnchor {
	section: string;
	item?: { idx: number; tag: string; text: string };
	xFraction: number;
	yOffset: number;
}
interface RecordShape extends Point {
	id: string;
	typeName: string;
	type?: string;
	parentId?: string;
	props?: Record<string, unknown>;
	meta?: Record<string, unknown>;
}
export function snapshotStore(snapshot: unknown): Record<string, RecordShape> | undefined {
	const value = snapshot as { document?: { store?: Record<string, RecordShape> }; store?: Record<string, RecordShape> } | null;
	return value?.document?.store ?? value?.store;
}
export function hasDocumentCoordinates(snapshot: unknown): boolean {
	return Object.values(snapshotStore(snapshot) ?? {}).some(r => r.typeName === "document" && r.meta?.frontpageCoordinates === "document");
}
export function annotationOffset(snapshot: unknown): Point {
	if (hasDocumentCoordinates(snapshot)) return { x: 0, y: 0 };
	const shapes = Object.values(snapshotStore(snapshot) ?? {});
	const embeds = shapes.filter(r => r.type === "frontpage-embed");
	const live = embeds.find(r => r.props?.ts === 0) ?? embeds[0];
	return { x: live?.x ?? 0, y: live?.y ?? 0 };
}
function edgeDistance(point: Point, bounds: Bounds): number {
	return Math.hypot(Math.max(bounds.x - point.x, 0, point.x - bounds.x - bounds.w), Math.max(bounds.y - point.y, 0, point.y - bounds.y - bounds.h));
}

/** Migrate coordinates, never delete records or attach ambiguous historic work. */
export function toDocumentCoordinates(snapshot: unknown, slug: string): unknown {
	const copy = structuredClone(snapshot);
	const store = snapshotStore(copy);
	if (!store || hasDocumentCoordinates(copy)) return copy;
	const records = Object.values(store);
	const embeds = records.filter(r => r.typeName === "shape" && r.type === "frontpage-embed");
	const live = embeds.filter(r => r.props?.ts === 0 && r.props?.slug === slug);
	const current = live.length === 1 && live[0]?.parentId?.startsWith("page:") ? live[0] : undefined;
	for (const shape of records) {
		if (shape.typeName !== "shape" || shape.type === "frontpage-embed") continue;
		// Translate roots only; children inherit their parent's transform.
		if (shape.parentId && !shape.parentId.startsWith("page:")) continue;
		if (!embeds.length) continue;
		const center = { x: shape.x + Number(shape.props?.w ?? 0) / 2, y: shape.y + Number(shape.props?.h ?? 0) / 2 };
		const candidates = embeds.filter(embed => embed.parentId === shape.parentId).map(embed => ({ embed, distance: edgeDistance(center, { x: embed.x, y: embed.y, w: Number(embed.props?.w ?? 0), h: Number(embed.props?.h ?? 0) }) })).sort((a, b) => a.distance - b.distance);
		const nearest = candidates[0];
		const unique = candidates.length === 1 || (nearest && candidates[1] && nearest.distance < candidates[1].distance);
		if (current && shape.parentId === current.parentId && nearest?.embed.id === current.id && unique) {
			shape.x -= current.x;
			shape.y -= current.y;
		} else {
			shape.meta = { ...shape.meta, frontpageLegacy: "historical or ambiguous canvas attachment" };
		}
	}
	if (current) { current.x = 0; current.y = 0; }
	for (const record of records) {
		if (record.typeName === "document") record.meta = { ...record.meta, frontpageCoordinates: "document" };
	}
	return copy;
}

/** Use actual overlap for item attribution; do not promote a nearby item to fact. */
export function contentAnchor(point: Point, origin: Point, sections: LayoutSection[]): ContentAnchor | null {
	const overlapping = sections.filter(s => edgeDistance(point, s) === 0).sort((a, b) => a.w * a.h - b.w * b.h);
	const nearest = sections.map(s => ({ s, distance: edgeDistance(point, s) })).sort((a, b) => a.distance - b.distance);
	const section = overlapping[0] ?? (nearest[0]?.distance === nearest[1]?.distance ? undefined : nearest[0]?.s);
	if (!section || sections.filter(s => s.id === section.id).length !== 1 || section.w <= 0) return null;
	const item = section.items?.filter(i => edgeDistance(point, i) === 0).sort((a, b) => a.w * a.h - b.w * b.h)[0];
	const target = item ?? section;
	return {
		section: section.id,
		...(item ? { item: { idx: item.idx, tag: item.tag, text: item.text } } : {}),
		xFraction: (origin.x - target.x) / target.w,
		yOffset: origin.y - target.y,
	};
}
export function anchorPosition(anchor: ContentAnchor, sections: LayoutSection[]): Point | null {
	if (!anchor || typeof anchor !== "object" || typeof anchor.section !== "string" || !Number.isFinite(anchor.xFraction) || !Number.isFinite(anchor.yOffset)) return null;
	const matches = sections.filter(s => s.id === anchor.section);
	if (matches.length !== 1) return null;
	const section = matches[0]!;
	let target: Bounds = section;
	if (anchor.item) {
		// Item indexes can move. A unique unchanged item is evidence; a reused
		// index with different text is not.
		const items = section.items?.filter(i => i.tag === anchor.item!.tag && i.text === anchor.item!.text) ?? [];
		if (items.length !== 1) return null;
		target = items[0]!;
	}
	const point = { x: target.x + anchor.xFraction * target.w, y: target.y + anchor.yOffset };
	return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
}

/** Preserve the explicit target even when a note is placed outside its bounds. */
export function referenceAnchor(ref: { section?: string; item?: number }, origin: Point, sections: LayoutSection[]): ContentAnchor | null {
	const matches = sections.filter(s => s.id === ref.section);
	if (matches.length !== 1) return null;
	const section = matches[0]!;
	const items = typeof ref.item === "number" ? section.items?.filter(i => i.idx === ref.item) ?? [] : [];
	if (ref.item !== undefined && items.length !== 1) return null;
	const item = items[0];
	const target = item ?? section;
	if (target.w <= 0) return null;
	return { section: section.id, ...(item ? { item: { idx: item.idx, tag: item.tag, text: item.text } } : {}), xFraction: (origin.x - target.x) / target.w, yOffset: origin.y - target.y };
}
