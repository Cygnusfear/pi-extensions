/**
 * Frontpage v2 Hono server — runs as a Bun SUBPROCESS spawned by the
 * frontpage extension.
 *
 * Why a subprocess: the compiled pi binary loads extensions through jiti with
 * `virtualModules` set to a hard-coded list (typebox + the pi framework). It
 * cannot resolve external packages like hono, react, tldraw from extension
 * code. Running the server as its own Bun process bypasses that restriction
 * entirely — the subprocess has its own module resolution and can `import`
 * whatever it needs from packages/frontpage/node_modules.
 *
 * Lifecycle:
 *   - Spawned by the extension on load via:
 *       bun run packages/frontpage/server-process/server.ts
 *   - Listens on 127.0.0.1:39288 (EADDRINUSE → assume peer running, exit 0).
 *   - Killed by the extension on session_shutdown (SIGTERM, then SIGKILL
 *     if it doesn't release within 1s).
 *
 * Routes (slice 1):
 *   GET  /                          → index of all frontpages
 *   GET  /healthz                   → { ok: true, version: 2, pid }
 *   GET  /page/:slug                → tldraw shell HTML
 *   GET  /page/:slug/embed          → raw frontpage HTML (with layout-shim injected)
 *   GET  /api/page/:slug            → meta + sections summary
 *   GET  /client/bundle.js          → bundled tldraw client
 *   GET  /client/bundle.css         → bundled tldraw CSS
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectBeforeBodyClose } from "./html-inject.ts";

// ---- paths ----
const STORE_DIR = path.join(os.homedir(), ".agent", "frontpage");
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(SCRIPT_DIR, "..");
const CLIENT_DIST = path.join(PKG_ROOT, "dist-client");

const PORT = Number(process.env.FRONTPAGE_PORT ?? 39288);
const HOST = process.env.FRONTPAGE_HOST ?? "127.0.0.1";

function pagePath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.html`);
}
function metaPath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.meta.json`);
}

// ---- Hono app ----
const app = new Hono();

app.get("/", async (c) => {
	const entries = await listFrontpages();
	const rows = entries
		.map(
			(e) =>
				`<li><a href="/page/${encodeURIComponent(e.slug)}">${escapeHtml(e.title)}</a> <span class="muted">${e.slug}</span></li>`,
		)
		.join("\n");
	return c.html(indexHtml(rows, entries.length));
});

app.get("/healthz", (c) => c.json({ ok: true, version: 2, port: PORT, pid: process.pid }));

app.get("/page/:slug", async (c) => {
	const slug = c.req.param("slug");
	const exists = fs.existsSync(pagePath(slug));
	if (!exists) {
		return c.html(`<h1>No frontpage '${escapeHtml(slug)}'</h1><p><a href="/">← index</a></p>`, 404);
	}
	return c.html(shellHtml(slug));
});

interface SectionDiffOnDisk {
	ts: number;
	author: string;
	changedSectionIds: string[];
	addedSectionIds: string[];
	removedSectionIds: string[];
	summary: string;
}

/** Annotate the rendered HTML with diff state: per-section data-changed
 *  attributes + a dismiss pill at the top of the body + the CSS that styles
 *  both. Pure string transform — no DOM parser needed. */
function injectDiffMarkers(html: string, diff: SectionDiffOnDisk | null): string {
	if (!diff) return html;
	const changedSet = new Set(diff.changedSectionIds);
	const addedSet = new Set(diff.addedSectionIds);
	const ageS = Math.max(0, Math.round((Date.now() - diff.ts) / 1000));
	const ageLabel = ageS < 60 ? `${ageS}s ago` : ageS < 3600 ? `${Math.round(ageS / 60)}m ago` : `${Math.round(ageS / 3600)}h ago`;
	const authorLabel = diff.author.startsWith("agent:") ? diff.author.slice(6) : diff.author === "hooman" ? "you" : diff.author;
	const totalChanged = diff.changedSectionIds.length + diff.addedSectionIds.length;
	if (totalChanged === 0 && diff.removedSectionIds.length === 0) return html;

	// 1. Annotate each section element with data-changed when its id matches.
	// Section markup looks like:  <section ... data-id="s3" ...>
	const annotated = html.replace(/data-id="([^"]+)"/g, (m, id: string) => {
		if (addedSet.has(id)) return `${m} data-changed="added" data-change-badge="★ NEW"`;
		if (changedSet.has(id)) return `${m} data-changed="changed" data-change-badge="★ UPDATED"`;
		return m;
	});

	// 2. Inject diff CSS + dismiss pill at the start of <body>.
	const slug = ""; // we'll fill this in via the script's relative URL
	const pillHtml = `
<style>
section[data-changed] {
  position: relative !important;
  border-left: 4px solid var(--fp-diff-color, #eab308) !important;
  background: linear-gradient(to right, rgba(234,179,8,0.05), transparent 200px) !important;
  padding-left: 16px !important;
  transition: opacity 0.3s, border-color 0.3s, background 0.3s;
}
section[data-changed="added"] { --fp-diff-color: #10b981; background: linear-gradient(to right, rgba(16,185,129,0.05), transparent 200px) !important; }
section[data-changed]::after {
  content: attr(data-change-badge);
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--fp-diff-color, #eab308);
  color: white;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  z-index: 5;
}
#frontpage-diff-pill {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(255,255,255,0.96);
  border: 1px solid #e5e7eb;
  box-shadow: 0 6px 24px rgba(0,0,0,0.12);
  padding: 8px 12px 8px 14px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 12px;
  color: #1f2937;
  pointer-events: all;
}
#frontpage-diff-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: #eab308; flex-shrink: 0; }
#frontpage-diff-pill button {
  all: unset;
  background: #1f2937;
  color: white;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
#frontpage-diff-pill button:hover { background: #374151; }
#frontpage-diff-pill.dismissed { opacity: 0; pointer-events: none; transition: opacity 0.3s; }
@media (prefers-color-scheme: dark) {
  #frontpage-diff-pill { background: rgba(30,30,40,0.95); color: #e5e7eb; border-color: #444; }
  #frontpage-diff-pill button { background: #eab308; color: #1f2937; }
}
</style>
<div id="frontpage-diff-pill">
  <span class="dot"></span>
  <span>★ <strong>${totalChanged}</strong> section${totalChanged === 1 ? "" : "s"} updated by <strong>${authorLabel}</strong> · ${ageLabel}</span>
  <button onclick="frontpageDismissDiff()">Got it</button>
</div>
<script>
function frontpageDismissDiff() {
  document.querySelectorAll('section[data-changed]').forEach(function (el) {
    el.removeAttribute('data-changed');
    el.removeAttribute('data-change-badge');
  });
  var pill = document.getElementById('frontpage-diff-pill');
  if (pill) pill.classList.add('dismissed');
  fetch('/api/page/${slug}/dismiss-diff', { method: 'POST' }).catch(function () {});
}
</script>
`;
	return annotated.replace(/<body([^>]*)>/i, (m) => `${m}${pillHtml}`);
}

app.get("/page/:slug/embed", async (c) => {
	const slug = c.req.param("slug");
	try {
		const html = await fsp.readFile(pagePath(slug), "utf8");
		const diff = await readJsonOrEmpty<SectionDiffOnDisk | null>(diffPath(slug), null);
		// Inject slug into the dismiss script (we templated an empty string above).
		const withDiff = injectDiffMarkers(html, diff)
			.replace("/api/page/${slug}/dismiss-diff", `/api/page/${encodeURIComponent(slug)}/dismiss-diff`);
		const injected = injectBeforeBodyClose(withDiff, LAYOUT_BOUNDS_SHIM);
		return c.html(injected);
	} catch {
		return c.html("Not found", 404);
	}
});

// Canvas vision: the browser POSTs a PNG of the whole tldraw canvas (frontpage
// frame + the hooman's drawings) on every change; frontpage_read returns it so
// the agent can SEE handwriting/arrows the text mapping can't convey.
app.post("/api/page/:slug/canvas-image", async (c) => {
	const slug = c.req.param("slug");
	try {
		const buf = Buffer.from(await c.req.arrayBuffer());
		if (buf.length === 0) return c.json({ ok: false, error: "empty body" }, 400);
		await fsp.writeFile(canvasImagePath(slug), buf);
		return c.json({ ok: true, bytes: buf.length });
	} catch (e) {
		return c.json({ ok: false, error: String(e) }, 500);
	}
});

app.get("/api/page/:slug/canvas-image", async (c) => {
	const slug = c.req.param("slug");
	try {
		const buf = await fsp.readFile(canvasImagePath(slug));
		return c.body(buf, 200, { "content-type": "image/png" });
	} catch {
		return c.text("Not found", 404);
	}
});

app.post("/api/page/:slug/dismiss-diff", async (c) => {
	const slug = c.req.param("slug");
	try { await fsp.unlink(diffPath(slug)); } catch { /* didn't exist; fine */ }
	return c.json({ ok: true, slug });
});

app.get("/api/page/:slug", async (c) => {
	const slug = c.req.param("slug");
	try {
		const meta = JSON.parse(await fsp.readFile(metaPath(slug), "utf8"));
		return c.json({
			slug: meta.slug,
			title: meta.spec?.title ?? slug,
			thesis: meta.spec?.thesis ?? "",
			sections: (meta.spec?.sections ?? []).map((s: { id?: string; label?: string; type: string }) => ({
				id: s.id ?? "",
				label: s.label ?? null,
				type: s.type,
			})),
		});
	} catch {
		return c.json({ error: "not found" }, 404);
	}
});

// ---- Persistence: tldraw canvas state + section layout ----

function tldrawPath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.tldraw.json`);
}
function layoutPath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.layout.json`);
}
function historyPath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.history.jsonl`);
}
function canvasImagePath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.canvas.png`);
}
function diffPath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.diff.json`);
}

// Cap on history entries kept per slug. ~50 entries × ~20KB/entry = ~1MB max
// per slug, which is fine for desk use. Older entries get dropped when the
// file gets rotated below.
const HISTORY_MAX_ENTRIES = 50;
// Coalesce window: don't write a NEW history entry if the previous one was
// less than this many ms ago AND came from the same author. Stops a long
// drag operation from filling history with frames.
const HISTORY_COALESCE_MS = 5000;

interface HistoryEntry {
	ts: number;
	author: string;
	shapeCount: number;
	/** tldraw canvas snapshot (document + session) */
	snapshot: unknown;
	/** Full rendered frontpage HTML at this point. Restoring writes this back. */
	html?: string;
	/** Spec + artifact-id sidecar at this point. */
	meta?: unknown;
}

async function readHistory(slug: string): Promise<HistoryEntry[]> {
	try {
		const raw = await fsp.readFile(historyPath(slug), "utf8");
		const out: HistoryEntry[] = [];
		for (const line of raw.split("\n")) {
			if (!line) continue;
			try { out.push(JSON.parse(line)); } catch { /* skip bad lines */ }
		}
		return out;
	} catch {
		return [];
	}
}

async function writeHistory(slug: string, entries: HistoryEntry[]): Promise<void> {
	const trimmed = entries.slice(-HISTORY_MAX_ENTRIES);
	const text = trimmed.map((e) => JSON.stringify(e)).join("\n") + (trimmed.length > 0 ? "\n" : "");
	const p = historyPath(slug);
	const tmp = `${p}.${process.pid}.tmp`;
	await fsp.writeFile(tmp, text, "utf8");
	await fsp.rename(tmp, p);
}

async function readSurfaceState(slug: string): Promise<{ html?: string; meta?: unknown }> {
	const [html, meta] = await Promise.all([
		fsp.readFile(pagePath(slug), "utf8").catch(() => undefined),
		fsp.readFile(metaPath(slug), "utf8").then((t) => JSON.parse(t) as unknown).catch(() => undefined),
	]);
	return { html, meta };
}

async function appendHistoryEntry(slug: string, snapshot: unknown, author: string): Promise<{ appended: boolean; reason?: string }> {
	const entries = await readHistory(slug);
	const last = entries[entries.length - 1];
	const now = Date.now();
	const surface = await readSurfaceState(slug);
	const shapeCount = countShapes(snapshot);
	const entry: HistoryEntry = { ts: now, author, shapeCount, snapshot, html: surface.html, meta: surface.meta };
	if (last && last.author === author && now - last.ts < HISTORY_COALESCE_MS) {
		entries[entries.length - 1] = entry;
		await writeHistory(slug, entries);
		return { appended: false, reason: "coalesced into previous entry" };
	}
	entries.push(entry);
	await writeHistory(slug, entries);
	return { appended: true };
}

function countShapes(snapshot: unknown): number {
	const snap = snapshot as { document?: { store?: Record<string, unknown> }; store?: Record<string, unknown> } | null;
	const store = snap?.document?.store ?? snap?.store;
	if (!store) return 0;
	let n = 0;
	for (const v of Object.values(store)) {
		if (typeof v === "object" && v !== null && (v as { typeName?: string }).typeName === "shape" && (v as { type?: string }).type !== "frontpage-embed") n++;
	}
	return n;
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
	await fsp.mkdir(path.dirname(filePath), { recursive: true });
	const tmp = `${filePath}.${process.pid}.tmp`;
	await fsp.writeFile(tmp, JSON.stringify(data), "utf8");
	await fsp.rename(tmp, filePath);
}

async function readJsonOrEmpty<T>(filePath: string, fallback: T): Promise<T> {
	try {
		return JSON.parse(await fsp.readFile(filePath, "utf8")) as T;
	} catch {
		return fallback;
	}
}

app.get("/api/page/:slug/tldraw", async (c) => {
	const slug = c.req.param("slug");
	const data = await readJsonOrEmpty<Record<string, unknown> | null>(tldrawPath(slug), null);
	return c.json({ slug, snapshot: data });
});

app.put("/api/page/:slug/tldraw", async (c) => {
	const slug = c.req.param("slug");
	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object" || !("snapshot" in body)) {
		return c.json({ error: "expected { snapshot: ..., author?: string }" }, 400);
	}
	const snapshot = (body as { snapshot: unknown }).snapshot;
	// Browser PUTs default to "hooman" — these come from interactive editing.
	const author = typeof (body as { author?: unknown }).author === "string"
		? (body as { author: string }).author
		: "hooman";
	await writeJsonAtomic(tldrawPath(slug), snapshot);
	const histResult = await appendHistoryEntry(slug, snapshot, author);
	return c.json({ ok: true, slug, savedAt: Date.now(), historyAppended: histResult.appended });
});

app.get("/api/page/:slug/layout", async (c) => {
	const slug = c.req.param("slug");
	const data = await readJsonOrEmpty<{ sections: Array<{ id: string; x: number; y: number; w: number; h: number }> }>(
		layoutPath(slug),
		{ sections: [] },
	);
	return c.json({ slug, ...data });
});

app.put("/api/page/:slug/layout", async (c) => {
	const slug = c.req.param("slug");
	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object" || !Array.isArray((body as { sections?: unknown }).sections)) {
		return c.json({ error: "expected { sections: [{ id, x, y, w, h, items?: [...] }, ...] }" }, 400);
	}
	type RawItem = { idx?: unknown; tag?: unknown; cls?: unknown; text?: unknown; x?: unknown; y?: unknown; w?: unknown; h?: unknown };
	type RawSection = { id?: unknown; x?: unknown; y?: unknown; w?: unknown; h?: unknown; items?: unknown };
	const sections = (body as { sections: RawSection[] }).sections
		.filter((s) => typeof s.id === "string" && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.w) && Number.isFinite(s.h))
		.map((s) => {
			const items = Array.isArray(s.items)
				? (s.items as RawItem[])
						.filter((it) => Number.isFinite(it.x) && Number.isFinite(it.y) && Number.isFinite(it.w) && Number.isFinite(it.h))
						.map((it, i) => ({
							idx: typeof it.idx === "number" ? it.idx : i,
							tag: typeof it.tag === "string" ? it.tag : "",
							cls: typeof it.cls === "string" ? it.cls : "",
							text: typeof it.text === "string" ? it.text : "",
							x: it.x as number,
							y: it.y as number,
							w: it.w as number,
							h: it.h as number,
						}))
				: [];
			return { id: s.id as string, x: s.x as number, y: s.y as number, w: s.w as number, h: s.h as number, items };
		});
	await writeJsonAtomic(layoutPath(slug), { sections, updatedAt: Date.now() });
	return c.json({ ok: true, slug, count: sections.length, itemCount: sections.reduce((n, s) => n + s.items.length, 0) });
});

// ---- Spatial mapping: which section does each tldraw shape refer to? ----

interface BoundsItem {
	idx: number;
	tag: string;
	cls: string;
	text: string;
	x: number;
	y: number;
	w: number;
	h: number;
}
interface SectionBounds {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	items?: BoundsItem[];
}

function sectionForPoint(px: number, py: number, sections: SectionBounds[]): { id: string; reason: string } | null {
	if (sections.length === 0) return null;
	// Inside-bounds wins. Tie-break by smallest area (most specific section).
	const containing = sections
		.filter((s) => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h)
		.sort((a, b) => a.w * a.h - b.w * b.h);
	if (containing[0]) return { id: containing[0].id, reason: "geometric-overlap" };
	// Otherwise nearest section by distance to nearest edge.
	let best: { id: string; d: number } | null = null;
	for (const s of sections) {
		const dx = Math.max(s.x - px, 0, px - (s.x + s.w));
		const dy = Math.max(s.y - py, 0, py - (s.y + s.h));
		const d = Math.hypot(dx, dy);
		if (!best || d < best.d) best = { id: s.id, d };
	}
	return best ? { id: best.id, reason: "nearest-section" } : null;
}

/** Find the most specific item (within the given section) the point lands on.
 *  Inside-bounds wins; tie-break by smallest area. Falls back to nearest
 *  item by edge distance, but ONLY if the distance is small enough to be
 *  meaningful (within 80px of an item edge). Returns null otherwise. */
function itemForPoint(px: number, py: number, items: BoundsItem[]): { item: BoundsItem; reason: string } | null {
	if (items.length === 0) return null;
	const containing = items
		.filter((i) => px >= i.x && px <= i.x + i.w && py >= i.y && py <= i.y + i.h)
		.sort((a, b) => a.w * a.h - b.w * b.h);
	if (containing[0]) return { item: containing[0], reason: "inside-item" };
	let best: { item: BoundsItem; d: number } | null = null;
	for (const it of items) {
		const dx = Math.max(it.x - px, 0, px - (it.x + it.w));
		const dy = Math.max(it.y - py, 0, py - (it.y + it.h));
		const d = Math.hypot(dx, dy);
		if (!best || d < best.d) best = { item: it, d };
	}
	if (best && best.d <= 80) return { item: best.item, reason: "nearest-item" };
	return null;
}

// Default footprint for sticky-note shapes (no explicit w/h on props).
// Tldraw renders `size: "s" | "m" | "l" | "xl"` notes at fixed pixel sizes.
// Approximate enough for centroid math; exact px don't matter for which-
// section overlap as long as the centroid lands inside the section bounds.
const NOTE_SIZE_PX: Record<string, number> = { s: 150, m: 200, l: 260, xl: 320 };

/** Walk a tldraw richText ProseMirror doc and concatenate its plain text. */
function extractRichText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as { type?: string; text?: string; content?: unknown[] };
	if (typeof n.text === "string") return n.text;
	if (Array.isArray(n.content)) {
		const sep = n.type === "paragraph" || n.type === "heading" ? "\n" : "";
		return n.content.map((c) => extractRichText(c)).join("").concat(sep);
	}
	return "";
}

function shapeFootprint(type: string, props: Record<string, unknown>): { w: number; h: number } {
	const w = typeof props.w === "number" ? props.w : 0;
	const h = typeof props.h === "number" ? props.h : 0;
	if (w && h) return { w, h };
	if (type === "note") {
		const size = typeof props.size === "string" ? (NOTE_SIZE_PX[props.size as string] ?? 200) : 200;
		return { w: size, h: size };
	}
	// arrows / lines / draws — best-effort, treat as point
	return { w: w || 0, h: h || 0 };
}

/** Map a canvas point to its section + best-effort item attribution. */
function attributePoint(pageCx: number, pageCy: number, sections: SectionBounds[]) {
	const secRef = sectionForPoint(pageCx, pageCy, sections);
	if (!secRef) return { section: null, item: null, reason: null };
	const section = sections.find((s) => s.id === secRef.id);
	const itemRef = section?.items ? itemForPoint(pageCx, pageCy, section.items) : null;
	return {
		section: secRef.id,
		sectionReason: secRef.reason,
		item: itemRef
			? { idx: itemRef.item.idx, tag: itemRef.item.tag, cls: itemRef.item.cls, text: itemRef.item.text }
			: null,
		itemReason: itemRef?.reason ?? null,
	};
}

/** Resolve an arrow endpoint to canvas coords. tldraw arrows have
 *  props.start = { type: "binding"|"point", x?, y?, boundShapeId?, normalizedAnchor? }
 *  When bound, coords are relative to the bound shape's position. When free,
 *  coords are relative to the arrow shape's x/y. */
function resolveArrowEndpoint(
	endpoint: { type?: string; x?: number; y?: number; boundShapeId?: string; normalizedAnchor?: { x: number; y: number } } | undefined,
	arrowX: number,
	arrowY: number,
	store: Record<string, unknown>,
): { x: number; y: number } | null {
	if (!endpoint) return null;
	if (endpoint.type === "binding" && typeof endpoint.boundShapeId === "string") {
		const target = store[endpoint.boundShapeId] as { x?: number; y?: number; props?: { w?: number; h?: number } } | undefined;
		if (!target) return null;
		const tw = target.props?.w ?? 0;
		const th = target.props?.h ?? 0;
		const ax = endpoint.normalizedAnchor?.x ?? 0.5;
		const ay = endpoint.normalizedAnchor?.y ?? 0.5;
		return { x: (target.x ?? 0) + tw * ax, y: (target.y ?? 0) + th * ay };
	}
	if (typeof endpoint.x === "number" && typeof endpoint.y === "number") {
		return { x: arrowX + endpoint.x, y: arrowY + endpoint.y };
	}
	return null;
}

function extractAnnotations(snapshot: unknown, sections: SectionBounds[]): Array<Record<string, unknown>> {
	// Tldraw v3 `getSnapshot()` returns { document: { store, schema }, session }.
	const snap = snapshot as { document?: { store?: Record<string, unknown> }; store?: Record<string, unknown> } | null;
	const store = snap?.document?.store ?? snap?.store;
	if (!store) return [];
	const shapes = Object.values(store).filter(
		(r): r is Record<string, unknown> =>
			typeof r === "object" && r !== null && (r as { typeName?: string }).typeName === "shape",
	);

	// Embed shape gives us the canvas → page offset.
	const embed = shapes.find((s) => s.type === "frontpage-embed") as
		| { x?: number; y?: number; props?: { w?: number; h?: number } }
		| undefined;
	const offsetX = embed?.x ?? 0;
	const offsetY = embed?.y ?? 0;

	const out: Array<Record<string, unknown>> = [];
	for (const s of shapes) {
		const type = s.type as string;
		if (type === "frontpage-embed") continue;
		const sx = typeof s.x === "number" ? (s.x as number) : 0;
		const sy = typeof s.y === "number" ? (s.y as number) : 0;
		const props = (s.props as Record<string, unknown>) ?? {};

		// Arrow gets special treatment: it has TWO endpoints, possibly bound
		// to other shapes. Each endpoint maps to its own section + item.
		if (type === "arrow") {
			const startProp = props.start as { type?: string; x?: number; y?: number; boundShapeId?: string; normalizedAnchor?: { x: number; y: number } } | undefined;
			const endProp = props.end as typeof startProp;
			const startCanvas = resolveArrowEndpoint(startProp, sx, sy, store);
			const endCanvas = resolveArrowEndpoint(endProp, sx, sy, store);
			const startPage = startCanvas ? { x: startCanvas.x - offsetX, y: startCanvas.y - offsetY } : null;
			const endPage = endCanvas ? { x: endCanvas.x - offsetX, y: endCanvas.y - offsetY } : null;
			let label: string | null = null;
			if (typeof props.text === "string" && (props.text as string).length > 0) label = props.text as string;
			else if (props.richText && typeof props.richText === "object") {
				const plain = extractRichText(props.richText).trim();
				if (plain) label = plain;
			}
			out.push({
				id: s.id,
				type: "arrow",
				text: label,
				color: typeof props.color === "string" ? (props.color as string) : null,
				from: startPage ? attributePoint(startPage.x, startPage.y, sections) : null,
				to: endPage ? attributePoint(endPage.x, endPage.y, sections) : null,
				canvasFrom: startCanvas,
				canvasTo: endCanvas,
				meta: (s.meta as Record<string, unknown>) ?? {},
			});
			continue;
		}

		// Notes / text / geo / draw / etc — single centroid attribution.
		const { w, h } = shapeFootprint(type, props);
		const pageCx = sx + w / 2 - offsetX;
		const pageCy = sy + h / 2 - offsetY;
		const attr = attributePoint(pageCx, pageCy, sections);
		let text: string | null = null;
		if (typeof props.text === "string" && (props.text as string).length > 0) {
			text = props.text as string;
		} else if (props.richText && typeof props.richText === "object") {
			const plain = extractRichText(props.richText).trim();
			if (plain) text = plain;
		} else if (Array.isArray(props.lines)) {
			text = "[drawing]";
		}

		out.push({
			id: s.id,
			type,
			text,
			canvasPosition: { x: sx, y: sy, w, h },
			pageCentroid: { x: Math.round(pageCx), y: Math.round(pageCy) },
			refersToSection: attr.section,
			refersToSectionReason: attr.sectionReason,
			refersToItem: attr.item,
			refersToItemReason: attr.itemReason,
			color: typeof props.color === "string" ? (props.color as string) : null,
			meta: (s.meta as Record<string, unknown>) ?? {},
		});
	}
	return out;
}

app.get("/api/page/:slug/state", async (c) => {
	const slug = c.req.param("slug");
	const [snapshot, layout, meta] = await Promise.all([
		readJsonOrEmpty<Record<string, unknown> | null>(tldrawPath(slug), null),
		readJsonOrEmpty<{ sections: SectionBounds[] }>(layoutPath(slug), { sections: [] }),
		readJsonOrEmpty<{ slug: string; spec?: { sections?: Array<{ id?: string; label?: string; type: string }> } } | null>(metaPath(slug), null),
	]);
	const sectionLabels = new Map<string, { label: string | null; type: string }>();
	if (meta?.spec?.sections) {
		for (const s of meta.spec.sections) {
			if (s.id) sectionLabels.set(s.id, { label: s.label ?? null, type: s.type });
		}
	}
	const sections = layout.sections.map((s) => ({
		...s,
		label: sectionLabels.get(s.id)?.label ?? null,
		type: sectionLabels.get(s.id)?.type ?? null,
	}));
	const annotations = extractAnnotations(snapshot, layout.sections);
	return c.json({ slug, sections, annotations, annotationCount: annotations.length });
});

// ---- Agent annotation: append shapes to the canvas ----

interface AnchorRef { section?: string; item?: number }
type AnnotateShapeInput =
	| { kind: "note"; text: string; anchor?: AnchorRef; xy?: { x: number; y: number }; color?: string; size?: string }
	| { kind: "text"; text: string; anchor?: AnchorRef; xy?: { x: number; y: number }; color?: string; size?: string }
	| { kind: "geo"; geo?: string; text?: string; xy: { x: number; y: number }; w: number; h: number; color?: string }
	| { kind: "arrow"; from: AnchorRef | { x: number; y: number }; to: AnchorRef | { x: number; y: number }; text?: string; color?: string };

function rid(): string {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
	let s = "";
	for (let i = 0; i < 16; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
	return s;
}
function shapeId(): string {
	return `shape:agent-${rid()}`;
}
function fractionalIndex(): string {
	// Tldraw uses fractional indices for shape ordering. "a40pq" is the format.
	// We just generate a unique-ish low-priority index that sorts after most
	// existing shapes.
	return `a${rid().slice(0, 6)}`;
}

/** Resolve an anchor ({section,item?} | {x,y}) to PAGE-space coords, given the
 *  current layout.json bounds. Anchored shapes land OFFSET to the right of the
 *  section/item so they don't visually obscure what they refer to. */
function resolveAnchor(
	anchor: AnchorRef | { x: number; y: number },
	sections: SectionBounds[],
	offset = 20,
): { x: number; y: number } | null {
	if ("x" in anchor && "y" in anchor) {
		return { x: anchor.x, y: anchor.y };
	}
	if (!anchor.section) return null;
	const section = sections.find((s) => s.id === anchor.section);
	if (!section) return null;
	if (typeof anchor.item === "number" && section.items) {
		const it = section.items.find((i) => i.idx === anchor.item);
		if (it) return { x: it.x + it.w + offset, y: it.y };
	}
	return { x: section.x + section.w + offset, y: section.y };
}

function richTextDoc(text: string): unknown {
	return {
		type: "doc",
		content: [{ type: "paragraph", attrs: { dir: "auto" }, content: text ? [{ type: "text", text }] : [] }],
	};
}

function buildNoteRecord(text: string, x: number, y: number, opts: { color?: string; size?: string; author?: string }): Record<string, unknown> {
	return {
		typeName: "shape",
		id: shapeId(),
		type: "note",
		x, y,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: { author: opts.author ?? "agent" },
		parentId: "page:page",
		index: fractionalIndex(),
		props: {
			color: opts.color ?? "violet",
			richText: richTextDoc(text),
			size: opts.size ?? "s",
			font: "draw",
			align: "middle",
			verticalAlign: "middle",
			labelColor: "black",
			growY: 0,
			fontSizeAdjustment: 0,
			url: "",
			scale: 1,
		},
	};
}

function buildTextRecord(text: string, x: number, y: number, opts: { color?: string; size?: string; author?: string }): Record<string, unknown> {
	return {
		typeName: "shape",
		id: shapeId(),
		type: "text",
		x, y,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: { author: opts.author ?? "agent" },
		parentId: "page:page",
		index: fractionalIndex(),
		props: {
			color: opts.color ?? "black",
			size: opts.size ?? "s",
			w: 200,
			font: "draw",
			textAlign: "start",
			autoSize: true,
			scale: 1,
			richText: richTextDoc(text),
		},
	};
}

function buildGeoRecord(geo: string, text: string, x: number, y: number, w: number, h: number, opts: { color?: string; author?: string }): Record<string, unknown> {
	const validGeos = new Set(["rectangle", "ellipse", "diamond", "hexagon", "octagon", "pentagon", "rhombus", "star", "trapezoid", "triangle", "cloud", "check-box", "x-box", "arrow-right", "arrow-left", "arrow-up", "arrow-down", "heart"]);
	const safeGeo = validGeos.has(geo) ? geo : "rectangle";
	return {
		typeName: "shape",
		id: shapeId(),
		type: "geo",
		x, y,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: { author: opts.author ?? "agent" },
		parentId: "page:page",
		index: fractionalIndex(),
		props: {
			geo: safeGeo,
			w, h,
			color: opts.color ?? "violet",
			labelColor: "black",
			fill: "none",
			dash: "draw",
			size: "s",
			font: "draw",
			align: "middle",
			verticalAlign: "middle",
			growY: 0,
			url: "",
			scale: 1,
			richText: richTextDoc(text),
		},
	};
}

function buildArrowRecord(start: { x: number; y: number }, end: { x: number; y: number }, text: string, opts: { color?: string; author?: string }): Record<string, unknown> {
	return {
		typeName: "shape",
		id: shapeId(),
		type: "arrow",
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: { author: opts.author ?? "agent" },
		parentId: "page:page",
		index: fractionalIndex(),
		props: {
			dash: "draw",
			size: "s",
			fill: "none",
			color: opts.color ?? "violet",
			labelColor: "black",
			bend: 0,
			start: { x: start.x, y: start.y },
			end: { x: end.x, y: end.y },
			arrowheadStart: "none",
			arrowheadEnd: "arrow",
			font: "draw",
			labelPosition: 0.5,
			scale: 1,
			elbowMidPoint: 0.5,
			richText: richTextDoc(text),
		},
	};
}

app.post("/api/page/:slug/clear-annotations", async (c) => {
	const slug = c.req.param("slug");
	const snap = await readJsonOrEmpty<{ document?: { store?: Record<string, unknown> } } | null>(tldrawPath(slug), null);
	if (!snap) return c.json({ ok: true, slug, cleared: 0 });
	const store = snap.document?.store;
	if (!store) return c.json({ ok: true, slug, cleared: 0 });
	let removed = 0;
	for (const [id, rec] of Object.entries(store)) {
		if (typeof rec === "object" && rec !== null) {
			const r = rec as { typeName?: string; type?: string };
			// Keep the frontpage-embed shape (the page itself), drop every
			// other shape (notes, text, arrows, geo, drawings).
			if (r.typeName === "shape" && r.type !== "frontpage-embed") {
				delete store[id];
				removed++;
			}
		}
	}
	await writeJsonAtomic(tldrawPath(slug), snap);
	return c.json({ ok: true, slug, cleared: removed });
});

app.post("/api/page/:slug/annotate", async (c) => {
	const slug = c.req.param("slug");
	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object" || !Array.isArray((body as { shapes?: unknown }).shapes)) {
		return c.json({ error: "expected { shapes: [...], author?: string }" }, 400);
	}
	const shapes = (body as { shapes: AnnotateShapeInput[]; author?: string }).shapes;
	const author = typeof (body as { author?: unknown }).author === "string" ? (body as { author: string }).author : "agent";

	// Load layout for anchor resolution + current snapshot for store merge.
	const [layout, currentSnap] = await Promise.all([
		readJsonOrEmpty<{ sections: SectionBounds[] }>(layoutPath(slug), { sections: [] }),
		readJsonOrEmpty<{ document?: { store?: Record<string, unknown> }; store?: Record<string, unknown> } | null>(tldrawPath(slug), null),
	]);

	const snap = currentSnap ?? null;
	if (!snap) {
		return c.json({ error: "no canvas state yet — open the page in a browser first so the embed shape is created" }, 409);
	}
	const store = snap.document?.store ?? snap.store;
	if (!store) {
		return c.json({ error: "malformed canvas snapshot" }, 500);
	}

	// Embed offset: agent specifies page-space coords; we add the embed's
	// canvas position so shapes land relative to the page.
	const embed = Object.values(store).find(
		(r): r is Record<string, unknown> & { x?: number; y?: number } =>
			typeof r === "object" && r !== null && (r as { typeName?: string }).typeName === "shape" && (r as { type?: string }).type === "frontpage-embed",
	);
	const ox = (embed?.x as number | undefined) ?? 0;
	const oy = (embed?.y as number | undefined) ?? 0;

	const created: string[] = [];
	const skipped: Array<{ index: number; reason: string }> = [];

	shapes.forEach((s, i) => {
		try {
			if (!s || typeof s !== "object") {
				skipped.push({ index: i, reason: "not an object" });
				return;
			}
			if (s.kind === "note" || s.kind === "text") {
				let pageXY: { x: number; y: number } | null = null;
				if (s.xy) pageXY = s.xy;
				else if (s.anchor) pageXY = resolveAnchor(s.anchor, layout.sections);
				if (!pageXY) {
					skipped.push({ index: i, reason: "no anchor and no xy" });
					return;
				}
				const canvasX = pageXY.x + ox;
				const canvasY = pageXY.y + oy;
				const record = s.kind === "note"
					? buildNoteRecord(s.text, canvasX, canvasY, { color: s.color, size: s.size, author })
					: buildTextRecord(s.text, canvasX, canvasY, { color: s.color, size: s.size, author });
				store[(record as { id: string }).id] = record;
				created.push((record as { id: string }).id);
			} else if (s.kind === "geo") {
				const canvasX = s.xy.x + ox;
				const canvasY = s.xy.y + oy;
				const record = buildGeoRecord(s.geo ?? "rectangle", s.text ?? "", canvasX, canvasY, s.w, s.h, { color: s.color, author });
				store[(record as { id: string }).id] = record;
				created.push((record as { id: string }).id);
			} else if (s.kind === "arrow") {
				const startPage = "x" in s.from && "y" in s.from ? s.from : resolveAnchor(s.from, layout.sections, -10);
				const endPage = "x" in s.to && "y" in s.to ? s.to : resolveAnchor(s.to, layout.sections, -10);
				if (!startPage || !endPage) {
					skipped.push({ index: i, reason: "could not resolve arrow endpoints" });
					return;
				}
				const start = { x: startPage.x + ox, y: startPage.y + oy };
				const end = { x: endPage.x + ox, y: endPage.y + oy };
				const record = buildArrowRecord(start, end, s.text ?? "", { color: s.color, author });
				store[(record as { id: string }).id] = record;
				created.push((record as { id: string }).id);
			} else {
				skipped.push({ index: i, reason: `unknown shape kind: ${(s as { kind?: string }).kind ?? "(none)"}` });
			}
		} catch (err) {
			skipped.push({ index: i, reason: err instanceof Error ? err.message : String(err) });
		}
	});

	// Persist the merged snapshot AND record the agent write in history so
	// the hooman can roll back if our placement clobbered something.
	await writeJsonAtomic(tldrawPath(slug), snap);
	await appendHistoryEntry(slug, snap, `agent:${author}`);
	return c.json({ ok: true, slug, created: created.length, createdIds: created, skipped });
});

// ---- Live revision events (SSE) ----
// Per-slug set of subscriber callbacks. When the page is revised (agent
// frontpage_update), we broadcast so open browsers add the new version
// side-by-side WITHOUT a manual refresh.
const sseClients = new Map<string, Set<(line: string) => void>>();

function broadcastToSlug(slug: string, payload: Record<string, unknown>): number {
	const set = sseClients.get(slug);
	if (!set || set.size === 0) return 0;
	const line = `data: ${JSON.stringify(payload)}\n\n`;
	for (const send of set) {
		try { send(line); } catch { /* dead client; cleaned up on abort */ }
	}
	return set.size;
}

app.get("/api/page/:slug/events", (c) => {
	const slug = c.req.param("slug");
	return streamSSE(c, async (stream) => {
		let set = sseClients.get(slug);
		if (!set) { set = new Set(); sseClients.set(slug, set); }
		const send = (line: string) => { void stream.write(line); };
		set.add(send);
		await stream.write(`data: ${JSON.stringify({ type: "hello", slug })}\n\n`);
		const ka = setInterval(() => { void stream.write(": keepalive\n\n"); }, 20000);
		stream.onAbort(() => {
			clearInterval(ka);
			set?.delete(send);
			if (set && set.size === 0) sseClients.delete(slug);
		});
		// Hold the stream open indefinitely.
		// eslint-disable-next-line no-constant-condition
		while (true) { await stream.sleep(3600_000); }
	});
});

// Called by the extension after frontpage_update writes the new content.
// priorTs = the history ts of the PRE-update snapshot, so the browser can
// freeze the currently-live embed at that version and append a fresh live
// embed to the right.
app.post("/api/page/:slug/revised", async (c) => {
	const slug = c.req.param("slug");
	const body = await c.req.json().catch(() => ({}));
	let priorTs = typeof (body as { priorTs?: unknown }).priorTs === "number" && (body as { priorTs: number }).priorTs > 0
		? (body as { priorTs: number }).priorTs
		: undefined;
	// Fallback: if the caller didn't supply a usable priorTs, resolve it from
	// the most recent history entry (the pre-update snapshot). This makes the
	// freeze robust even if the extension's history POST response was missed.
	if (priorTs === undefined) {
		const entries = await readHistory(slug);
		if (entries.length > 0) priorTs = entries[entries.length - 1].ts;
	}
	const delivered = broadcastToSlug(slug, {
		type: "revised",
		slug,
		ts: Date.now(),
		priorTs,
		author: (body as { author?: string }).author,
		summary: (body as { summary?: string }).summary,
	});
	return c.json({ ok: true, slug, delivered });
});

// ---- History (time-machine) ----

app.get("/api/page/:slug/history", async (c) => {
	const slug = c.req.param("slug");
	const entries = await readHistory(slug);
	// Don't ship the full snapshots in the list view — too heavy. Caller
	// fetches a specific entry via GET /history/:ts.
	const summary = entries.map((e) => ({ ts: e.ts, author: e.author, shapeCount: e.shapeCount }));
	return c.json({ slug, entries: summary, count: summary.length });
});

app.get("/api/page/:slug/history/:ts", async (c) => {
	const slug = c.req.param("slug");
	const ts = Number(c.req.param("ts"));
	if (!Number.isFinite(ts)) return c.json({ error: "ts must be a number" }, 400);
	const entries = await readHistory(slug);
	const entry = entries.find((e) => e.ts === ts);
	if (!entry) return c.json({ error: "no history entry with that ts" }, 404);
	return c.json(entry);
});

app.post("/api/page/:slug/restore", async (c) => {
	const slug = c.req.param("slug");
	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object" || typeof (body as { ts?: unknown }).ts !== "number") {
		return c.json({ error: "expected { ts: number }" }, 400);
	}
	const ts = (body as { ts: number }).ts;
	const entries = await readHistory(slug);
	const entry = entries.find((e) => e.ts === ts);
	if (!entry) return c.json({ error: "no history entry with that ts" }, 404);
	// Atomic surface restore: html + meta + tldraw all revert together.
	// Skip files the entry doesn't carry (older entries without html/meta).
	const writes: Array<Promise<unknown>> = [writeJsonAtomic(tldrawPath(slug), entry.snapshot)];
	if (typeof entry.html === "string") {
		writes.push(fsp.writeFile(pagePath(slug), entry.html, "utf8"));
	}
	if (entry.meta !== undefined) {
		writes.push(writeJsonAtomic(metaPath(slug), entry.meta));
	}
	await Promise.all(writes);
	// Record the restore so the act-of-restoring is itself reversible.
	await appendHistoryEntry(slug, entry.snapshot, `restore-from:${ts}`);
	return c.json({ ok: true, slug, restoredTs: ts, shapeCount: entry.shapeCount, restoredFiles: writes.length });
});

// Trigger a history snapshot from outside the canvas write path — used by
// frontpage_create / frontpage_update in the extension so spec changes also
// land in history.
app.post("/api/page/:slug/history", async (c) => {
	const slug = c.req.param("slug");
	const body = await c.req.json().catch(() => ({}));
	const author = typeof (body as { author?: unknown }).author === "string"
		? (body as { author: string }).author
		: "agent";
	const snap = await readJsonOrEmpty<unknown>(tldrawPath(slug), { document: { store: {} } });
	const tsBefore = Date.now();
	const result = await appendHistoryEntry(slug, snap, author);
	// Return the ts of the entry we just created (the last one in the log).
	const entries = await readHistory(slug);
	const createdTs = entries.length > 0 ? entries[entries.length - 1].ts : tsBefore;
	return c.json({ ok: true, slug, ts: createdTs, ...result });
});

// Versioned embed: ?ts=<historyTs> returns the html from that history entry
// (used by the Time Machine to render the page as it was at that moment).
app.get("/api/page/:slug/embed-versioned", async (c) => {
	const slug = c.req.param("slug");
	const tsParam = c.req.query("ts");
	if (!tsParam) {
		// Default: current. Re-use the /embed handler logic.
		try {
			const html = await fsp.readFile(pagePath(slug), "utf8");
			return c.html(injectBeforeBodyClose(html, LAYOUT_BOUNDS_SHIM));
		} catch { return c.html("Not found", 404); }
	}
	const ts = Number(tsParam);
	const entries = await readHistory(slug);
	const entry = entries.find((e) => e.ts === ts);
	if (!entry || typeof entry.html !== "string") {
		return c.html(`<p>No HTML stored for ts ${ts}.</p>`, 404);
	}
	// No layout shim on versioned embeds — we don't want them mutating
	// the current layout.json with historical bounds.
	return c.html(entry.html);
});

app.get("/client/bundle.js", serveClientAsset("bundle.js", "application/javascript; charset=utf-8"));
app.get("/client/bundle.css", serveClientAsset("bundle.css", "text/css; charset=utf-8"));

function serveClientAsset(filename: string, contentType: string) {
	return async (c: { body: (data: BodyInit, status?: number, headers?: Record<string, string>) => Response }) => {
		const filePath = path.join(CLIENT_DIST, filename);
		try {
			const buf = await fsp.readFile(filePath);
			return c.body(buf, 200, { "content-type": contentType, "cache-control": "no-cache" });
		} catch {
			return c.body(
				`Client bundle missing at ${filePath}. Run \`bun run build-client\` in packages/frontpage.`,
				500,
				{ "content-type": "text/plain; charset=utf-8" },
			);
		}
	};
}

// ---- HTML templates ----

function shellHtml(slug: string): string {
	const safeSlug = JSON.stringify(slug);
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(slug)} — frontpage</title>
<link rel="stylesheet" href="/client/bundle.css" />
<style>
  html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
  body { background: #f7f6f3; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
</style>
</head>
<body>
<div id="root"></div>
<script>window.__FRONTPAGE_SLUG__ = ${safeSlug};</script>
<script type="module" src="/client/bundle.js"></script>
</body>
</html>`;
}

function indexHtml(rows: string, count: number): string {
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Frontpages (${count})</title>
<style>
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #222; background: #fafaf7; }
  h1 { font-size: 1.4rem; margin: 0 0 1rem; }
  ul { list-style: none; padding: 0; }
  li { padding: 0.4rem 0; border-bottom: 1px solid #eee; }
  a { color: #c33; text-decoration: none; font-weight: 500; }
  a:hover { text-decoration: underline; }
  .muted { color: #999; font-size: 0.85em; margin-left: 0.5rem; }
</style>
</head>
<body>
<h1>Frontpages (${count})</h1>
<ul>${rows}</ul>
</body>
</html>`;
}

const LAYOUT_BOUNDS_SHIM = `
<script>
(function () {
  // Selectors that identify meaningful "items" inside a section. Order matters
  // — first match wins per element. Generic semantic tags (li, tr, p, h2, h3,
  // blockquote, figure) are the catch-all; class selectors come first so a
  // frontpage-rendered \`.ve-card\` is captured as one unit rather than its
  // inner h-tag.
  var ITEM_SELECTORS = [
    '.kpi-item',
    '.ve-card',
    '.timeline-entry',
    '.card',
    '.callout',
    '.callout-body',
    'blockquote',
    'figure',
    'tr',
    'li',
    'h2', 'h3', 'h4',
    'p:not(:empty)'
  ];

  function rect(el) {
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  }

  function textOf(el, max) {
    var t = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1) + '\u2026' : t;
  }

  function collectItems(section) {
    // Walk all matching items, dedupe descendants (keep the outermost match).
    var nodes = section.querySelectorAll(ITEM_SELECTORS.join(','));
    var items = [];
    var taken = new Set();
    nodes.forEach(function (n) {
      // Skip if any ancestor (up to section) is already taken — keeps the
      // outer card and drops its inner h2 etc.
      var p = n.parentElement;
      while (p && p !== section) {
        if (taken.has(p)) return;
        p = p.parentElement;
      }
      taken.add(n);
      var b = rect(n);
      if (b.w === 0 || b.h === 0) return;
      items.push({
        idx: items.length,
        tag: n.tagName.toLowerCase(),
        cls: (n.className && typeof n.className === 'string') ? n.className.split(/\\s+/).filter(Boolean).slice(0, 3).join(' ') : '',
        text: textOf(n, 200),
        x: b.x, y: b.y, w: b.w, h: b.h,
      });
    });
    return items;
  }

  function reportBounds() {
    var sectionNodes = document.querySelectorAll('[data-id], [data-section-id], section[id]');
    var sections = [];
    sectionNodes.forEach(function (n) {
      var id = n.getAttribute('data-id') || n.getAttribute('data-section-id') || n.id;
      if (!id) return;
      var b = rect(n);
      sections.push({
        id: id,
        x: b.x, y: b.y, w: b.w, h: b.h,
        items: collectItems(n),
      });
    });
    // ── Embed height: a PURE FUNCTION of content height ──────────────────
    // The parent sizes the iframe to whatever height we report. So the height
    // we report MUST NOT depend on the iframe's current height, or the two
    // chase each other forever.
    //
    // document.body.scrollHeight and documentElement.scrollHeight are POISON
    // here: they never return less than the iframe viewport height, so they
    // grow every time the parent resizes us. We measure ONLY the intrinsic
    // height of the content — the bottom edge of the content container and the
    // bottom-most section. Both are normal-flow content metrics, independent of
    // the iframe size, so measure→resize converges in a single step.
    //
    // Invariant this relies on: no content element sizes itself to the iframe
    // (no vh / height:100% that resolves against the viewport). Diagrams honour
    // this via a fixed px cap when embedded (see zoom-pan.js setAdaptiveHeight).
    var container = document.querySelector('.container');
    var documentHeight = 0;
    if (container) {
      var cr = container.getBoundingClientRect();
      documentHeight = Math.ceil(cr.bottom + window.scrollY);
    }
    sections.forEach(function (s) { documentHeight = Math.max(documentHeight, Math.ceil(s.y + s.h)); });
    try { parent.postMessage({ type: 'frontpage:layout', sections: sections, documentHeight: documentHeight }, '*'); } catch (_) {}
  }
  var pending = 0;
  function schedule() {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () { pending = 0; reportBounds(); });
  }
  window.addEventListener('load', schedule);
  // Re-measure when the CONTENT changes — observe the container, NOT
  // documentElement/body (those resize WITH the iframe, so observing them would
  // re-fire on our own resize). The container resizes only when content does.
  if (window.ResizeObserver) {
    var c = document.querySelector('.container');
    if (c) new ResizeObserver(schedule).observe(c);
  }
  // Late-rendering sections (mermaid/d3/svg/chart) insert their SVG/canvas into
  // the DOM after load. childList (NOT attributes — diagram zoom/pan churns
  // style constantly) catches the insert so we re-measure once it lands.
  if (window.MutationObserver) {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(schedule); }
  // A couple of safety re-measures for diagrams that render slightly late.
  // These are harmless: the measurement is content-intrinsic and stable, so
  // re-measuring reports the same value — no growth, no loop.
  setTimeout(schedule, 400);
  setTimeout(schedule, 1500);
})();
</script>
`;

// ---- helpers ----

async function listFrontpages(): Promise<Array<{ slug: string; title: string }>> {
	try {
		const files = await fsp.readdir(STORE_DIR);
		const metas = files.filter((f) => f.endsWith(".meta.json"));
		const out: Array<{ slug: string; title: string }> = [];
		for (const f of metas) {
			try {
				const meta = JSON.parse(await fsp.readFile(path.join(STORE_DIR, f), "utf8"));
				out.push({ slug: meta.slug, title: meta.spec?.title ?? meta.slug });
			} catch {}
		}
		out.sort((a, b) => a.title.localeCompare(b.title));
		return out;
	} catch {
		return [];
	}
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

// ---- boot ----

const BunGlobal = (globalThis as { Bun?: { serve(opts: unknown): { stop(): Promise<void> | void } } }).Bun;

if (!BunGlobal || typeof BunGlobal.serve !== "function") {
	console.error("[frontpage-server] Bun.serve is required. Run via `bun run server.ts`.");
	process.exit(2);
}

try {
	const server = BunGlobal.serve({
		port: PORT,
		hostname: HOST,
		fetch: app.fetch,
		error(err: Error) {
			console.error("[frontpage-server] request error:", err.message);
			return new Response("internal error", { status: 500 });
		},
	});
	process.stdout.write(`[frontpage-server] listening on http://${HOST}:${PORT} pid=${process.pid}\n`);

	const cleanup = async () => {
		try {
			await server.stop();
		} catch {}
		process.exit(0);
	};
	process.on("SIGTERM", cleanup);
	process.on("SIGINT", cleanup);
	process.on("SIGHUP", cleanup);
} catch (err) {
	const msg = err instanceof Error ? err.message : String(err);
	if (/EADDRINUSE|address already in use/i.test(msg)) {
		// Peer already serving — that's fine. Exit silently with 0 so the
		// parent extension treats it as "successfully booted" (because
		// somebody on 39288 is serving, just not us).
		process.stdout.write(`[frontpage-server] peer already on ${HOST}:${PORT}, exiting cleanly\n`);
		process.exit(0);
	}
	console.error(`[frontpage-server] failed to start: ${msg}`);
	process.exit(1);
}
