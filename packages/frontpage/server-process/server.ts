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
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

app.get("/page/:slug/embed", async (c) => {
	const slug = c.req.param("slug");
	try {
		const html = await fsp.readFile(pagePath(slug), "utf8");
		const injected = html.replace(/<\/body>/i, `${LAYOUT_BOUNDS_SHIM}\n</body>`);
		return c.html(injected);
	} catch {
		return c.html("Not found", 404);
	}
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
		return c.json({ error: "expected { snapshot: ... }" }, 400);
	}
	await writeJsonAtomic(tldrawPath(slug), (body as { snapshot: unknown }).snapshot);
	return c.json({ ok: true, slug, savedAt: Date.now() });
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
    try { parent.postMessage({ type: 'frontpage:layout', sections: sections }, '*'); } catch (_) {}
  }
  var pending = 0;
  function schedule() {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () { pending = 0; reportBounds(); });
  }
  window.addEventListener('load', schedule);
  if (window.ResizeObserver) {
    new ResizeObserver(schedule).observe(document.documentElement);
  }
  window.addEventListener('resize', schedule);
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
