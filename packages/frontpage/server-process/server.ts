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
 *   GET  /page/:slug                → document HTML with an annotation overlay
 *   GET  /page/:slug/embed          → raw frontpage HTML (with layout-shim injected)
 *   GET  /api/page/:slug            → meta + sections summary
 *   GET  /client/bundle.js          → bundled tldraw client
 *   GET  /client/bundle.css         → bundled tldraw CSS
 */

import { Hono } from "hono";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { streamSSE } from "hono/streaming";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { injectBeforeBodyClose } from "./html-inject.ts";
import { withAnnotationLayer } from "./document-page.ts";
import { readClientRelease } from "./client-release.ts";
import { RESTORE_BLOCKED, listFrontpages } from "./index-entries.ts";
import { annotationOffset, toDocumentCoordinates, contentAnchor, referenceAnchor, anchorPosition, type ContentAnchor } from "./annotation-coordinates.ts";
import { createAnnotationSchema, emptyAnnotationSnapshot, normalizeAnnotationSnapshot } from "./annotation-schema.ts";
import { getIndexAbove, type IndexKey } from "@tldraw/utils";
import type { TLStoreSnapshot } from "@tldraw/tlschema";
import {
	isWritable,
	assertPageSlug,
	isPageSlug,
	documentPath,
	documentExists,
	InvalidPageSlug,
	moveArtifactsAside,
	readLifecycle,
	renderBanner,
	restoreArtifacts,
	writeLifecycle,
} from "./lifecycle.ts";

// ---- paths ----
/** Where pages live. The environment can point this at a scratch directory so
 *  a test run never writes into the store the operator works in. */
function storeDir(): string {
	const override = process.env.FRONTPAGE_STORE_DIR;
	return override !== undefined && override !== "" ? path.resolve(override) : path.join(os.homedir(), ".agent", "frontpage");
}
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(SCRIPT_DIR, "..");
const CLIENT_DIST = path.join(PKG_ROOT, "dist-client");
const clientRelease = await readClientRelease(CLIENT_DIST);

const PORT = Number(process.env.FRONTPAGE_PORT ?? 39288);
const HOST = process.env.FRONTPAGE_HOST ?? "127.0.0.1";

function pagePath(slug: string): string {
	return documentPath(storeDir(), slug, ".html");
}
function metaPath(slug: string): string {
	return documentPath(storeDir(), slug, ".meta.json");
}

// ---- Hono app ----
const app = new Hono();
const annotationSchema = createAnnotationSchema();
for (const route of ["/page/:slug", "/page/:slug/*", "/api/page/:slug", "/api/page/:slug/*"]) {
	app.use(route, async (c, next) => {
		try { assertPageSlug(c.req.param("slug") ?? ""); }
		catch (error) { if (error instanceof InvalidPageSlug) return c.json({ error: error.message }, 400); throw error; }
		await next();
	});
}

// A write for a page that has no content would leave files behind for a
// document that does not exist - a mistyped or hostile slug could otherwise
// fill the store one request at a time. Reads are unaffected: an empty record
// set is an honest answer, a created file is not.
for (const route of ["/api/page/:slug", "/api/page/:slug/*"]) {
	app.use(route, async (c, next) => {
		if (c.req.method === "GET" || c.req.method === "HEAD") return next();
		const slug = c.req.param("slug") ?? "";
		if (!(await documentExists(storeDir(), slug))) return c.json({ error: "no page '" + slug + "'" }, 404);
		await next();
	});
}

// Every failure answers with its reason. A bare "Internal Server Error" is a
// dead end for whoever has to fix it, and this store has several ways for a
// record to become unreadable: an unparseable file, a missing schema stamp, an
// interrupted restore that cannot finish. Without this, each new failure mode
// has to remember to catch itself, and the ones that forget look identical to a
// crash.
app.onError((error, c) => {
	const reason = error instanceof Error ? error.message : String(error);
	const status: ContentfulStatusCode = error instanceof ReaderFailure ? error.status : 500;
	const code = error instanceof ReaderFailure ? error.code : "unexpected";
	// A person looking at a page gets a page; a caller of the API gets JSON.
	if (c.req.method === "GET" && c.req.path.startsWith("/page/")) {
		return c.html(renderProblemPage(c.req.param("slug") ?? "this page", reason), status);
	}
	console.error("[frontpage-server]", c.req.method, c.req.path, "-", reason);
	return c.json({ error: reason, code }, status);
});

app.get("/", async (c) => {
	const view = c.req.query("retired") === "1" ? "retired" : c.req.query("attention") === "1" ? "attention" : "current";
	const entries = await listFrontpages(storeDir());
	const live: string[] = [];
	const retired: string[] = [];
	const attention: string[] = [];
	for (const entry of entries) {
		const link = entry.servable
			? '<a href="/page/' + encodeURIComponent(entry.slug) + '">' + escapeHtml(entry.title) + "</a>"
			: "<span>" + escapeHtml(entry.title) + "</span>";
		const modifiedAgo = formatAgo(entry.modified);
		const createdAgo = formatAgo(entry.created);
		const stamps: string[] = [];
		if (modifiedAgo.length > 0) stamps.push("last modified " + modifiedAgo);
		if (createdAgo.length > 0) stamps.push("created " + createdAgo);
		if (entry.author !== undefined) stamps.push("by " + entry.author);
		const slug = '<span class="muted">' + escapeHtml(entry.slug) + (stamps.length > 0 ? " · " + stamps.join(" | ") : "") + "</span>";
		// An artifact that cannot be read as a normal page is a human decision
		// waiting to happen, which outranks whether it is current. Reporting it
		// here is the only way it can ever be reconciled.
		if (entry.problem !== undefined) {
			attention.push(
				'<li class="retired">' + link + " " + slug +
				' <span class="chip chip--retired">needs attention</span> ' +
				escapeHtml(entry.problem) + "</li>",
			);
			continue;
		}
		const state = await readLifecycle(storeDir(), entry.slug);
		if (state.status === "current") {
			live.push("<li>" + link + " " + slug + "</li>");
			continue;
		}
		const detail: string[] = [];
		if (state.reason !== undefined) detail.push(state.reason);
		if (state.supersededBy !== undefined) detail.push("replaced by " + state.supersededBy);
		if (state.by !== undefined) detail.push("by " + state.by);
		retired.push(
			'<li class="retired">' + link + " " + slug +
			' <span class="chip chip--' + escapeHtml(state.status) + '">' + escapeHtml(state.status) + "</span> " +
			escapeHtml(detail.join(" - ")) + "</li>",
		);
	}
	// The index is the working set, and only the working set. Listing retired
	// pages here puts the old pile back in front of the operator, which is the
	// problem the lifecycle rule was supposed to end. They are one deliberate
	// click away, and each keeps its own tombstone and banner.
	const links: string[] = ['<a href="/">current pages</a>'];
	if (retired.length > 0) links.push('<a href="/?retired=1">not current (' + retired.length + ")</a>");
	if (attention.length > 0) links.push('<a href="/?attention=1">needs attention (' + attention.length + ")</a>");
	const header = '<p class="muted">' + links.join(" - ") + " · sorted by last modified · generated " +
		escapeHtml(new Date().toLocaleString()) + "</p>";
	const rows = view === "retired" ? retired : view === "attention" ? attention : live;
	return c.html(indexHtml(header + rows.join("\n"), rows.length));
});

app.get("/healthz", (c) => c.json({ ok: true, version: 2, port: PORT, pid: process.pid }));

app.get("/page/:slug", async (c) => {
	const slug = c.req.param("slug");
	const exists = fs.existsSync(pagePath(slug));
	if (!exists) {
		return c.html(`<h1>No frontpage '${escapeHtml(slug)}'</h1><p><a href="/">← index</a></p>`, 404);
	}
	return serveDocument(c, slug, true);
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



// ---- Page lifecycle ----
//
// The rule for retired pages, enforced rather than decorative: a page that is
// not current stops accepting writes, and a purge moves the artifacts aside and
// leaves a tombstone that says who decided it and why.
app.post("/api/page/:slug/lifecycle", async (c) => {
	const slug = c.req.param("slug");
	return withAnnotationWrite(slug, async () => {
	try {
		const body = (await c.req.json()) as {
			status?: unknown;
			reason?: unknown;
			supersededBy?: unknown;
			author?: unknown;
		};
		const status = typeof body.status === "string" ? body.status : "";
		if (status !== "current" && status !== "superseded" && status !== "archived" && status !== "purged") {
			return c.json({ ok: false, code: "invalid", error: "status must be current, superseded, archived or purged" }, 400);
		}
		const reason = typeof body.reason === "string" ? body.reason.trim() : "";
		if (status !== "current" && reason.length === 0) {
			return c.json({ ok: false, code: "invalid", error: "a reason is required, so the state is never ambiguous" }, 400);
		}
		const supersededBy = typeof body.supersededBy === "string" ? body.supersededBy.trim() : "";
		if (status === "superseded") {
			if (supersededBy.length === 0) {
				return c.json({ ok: false, code: "invalid", error: "a superseded page must name its replacement" }, 400);
			}
			if (!(await fsp.stat(pagePath(supersededBy)).catch(() => null))) {
				// A pointer to a page that does not exist is precisely the ambiguous
				// leftover this rule exists to prevent.
				return c.json({ ok: false, code: "invalid", error: "no such replacement page: " + supersededBy }, 400);
			}
			if (supersededBy === slug) {
				return c.json({ ok: false, code: "invalid", error: "a page cannot replace itself" }, 400);
			}
		}
		const author = typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim() : "operator";
		const previous = await readLifecycle(storeDir(), slug);
		let moved: string[] = [];
		if (status === "purged" && previous.status !== "purged") {
			moved = await moveArtifactsAside(storeDir(), slug);
		}
		if (previous.status === "purged" && status !== "purged") {
			moved = await restoreArtifacts(storeDir(), slug);
		}
		await writeLifecycle(storeDir(), slug, {
			status,
			...(reason.length > 0 ? { reason } : {}),
			...(supersededBy.length > 0 ? { supersededBy } : {}),
			by: author,
			since: Date.now(),
		});
		return c.json({ ok: true, slug, status, previousStatus: previous.status, artifactsMoved: moved });
	} catch (e) {
		return c.json({ ok: false, error: String(e) }, e instanceof InvalidPageSlug ? 400 : 500);
	}
	});
});

// A retired page does not accept new writes. Silently accepting them is how the
// pile of pages nobody knows about grows in the first place.
async function refuseWriteToRetiredPage(c: Context, slug: string): Promise<Response | null> {
	const state = await readLifecycle(storeDir(), slug);
	if (isWritable(state)) return null;
	return c.json(
		{
			ok: false,
			code: "retired",
			error:
				"this page is " +
				state.status +
				(state.reason === undefined ? "" : " (" + state.reason + ")") +
				"; it no longer accepts writes",
		},
		409,
	);
}

// ---- Change log ----
//
// One row per edit, newest first: when, who, the note the editor wrote, and
// which sections that edit touched. The section effect is derived from the specs
// stored with each history entry, so it records what actually changed rather
// than a claim about it. This is the operator's "what is updated" surface,
// rendered into the document instead of living in an agent transcript.
interface ChangelogRow {
	ts: number;
	author: string;
	note: string;
	added: string[];
	changed: string[];
	removed: string[];
}

function sectionMap(meta: unknown): Map<string, string> {
	const spec = (meta as { spec?: { sections?: Array<Record<string, unknown>> } } | undefined)?.spec;
	const map = new Map<string, string>();
	for (const section of spec?.sections ?? []) {
		const id = typeof section.id === "string" ? section.id : "";
		if (!id) continue;
		map.set(id, JSON.stringify(section));
	}
	return map;
}

async function readChangelog(slug: string): Promise<ChangelogRow[]> {
	const entries = await readHistory(slug);
	const rows: ChangelogRow[] = [];
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (!entry) continue;
		const previous = entries[index - 1];
		const before = sectionMap(previous ? previous.meta : undefined);
		const after = sectionMap(entry.meta);
		const added: string[] = [];
		const changed: string[] = [];
		const removed: string[] = [];
		for (const [id, body] of after) {
			const prior = before.get(id);
			if (prior === undefined) added.push(id);
			else if (prior !== body) changed.push(id);
		}
		for (const id of before.keys()) {
			if (!after.has(id)) removed.push(id);
		}
		rows.push({ ts: entry.ts, author: entry.author, note: entry.note ?? "", added, changed, removed });
	}
	return rows;
}

function renderChangelog(rows: readonly ChangelogRow[]): string {
	if (rows.length === 0) return "";
	const newest = rows[rows.length - 1];
	const when = newest ? new Date(newest.ts).toISOString().replace("T", " ").slice(0, 16) + "Z" : "";
	const items = rows
		.slice()
		.reverse()
		.map((row) => {
			const stamp = new Date(row.ts).toISOString().replace("T", " ").slice(0, 16) + "Z";
			const effect = [
				row.added.length > 0 ? row.added.length + " added" : "",
				row.changed.length > 0 ? row.changed.length + " updated" : "",
				row.removed.length > 0 ? row.removed.length + " removed" : "",
			]
				.filter((part) => part.length > 0)
				.join(", ");
			return (
				'<li class="fp-cl__row">' +
				'<span class="fp-cl__when">' + escapeHtml(stamp) + "</span>" +
				'<span class="fp-cl__who">' + escapeHtml(row.author) + "</span>" +
				'<span class="fp-cl__note">' + escapeHtml(row.note.length > 0 ? row.note : "(no note given)") + "</span>" +
				(effect.length > 0 ? '<span class="fp-cl__effect">' + escapeHtml(effect) + "</span>" : "") +
				"</li>"
			);
		})
		.join("");
	return (
		'<details class="fp-cl">' +
		'<summary class="fp-cl__summary">' +
		'<span class="fp-cl__tag">CHANGED</span>' +
		'<span class="fp-cl__latest">' + escapeHtml(newest && newest.note.length > 0 ? newest.note : "Last edit") + "</span>" +
		'<span class="fp-cl__meta">' + escapeHtml(newest ? newest.author : "") + " · " + escapeHtml(when) + "</span>" +
		'<span class="fp-cl__count">' + rows.length + (rows.length === 1 ? " edit" : " edits") + "</span>" +
		"</summary>" +
		'<ol class="fp-cl__list">' + items + "</ol>" +
		"</details>"
	);
}

/** A document that cannot be served right now is still a document, so it is
 *  answered with a page that says what is wrong with it. */
function renderProblemPage(slug: string, reason: string): string {
	return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
		'<meta name="viewport" content="width=device-width,initial-scale=1">' +
		'<title>' + escapeHtml(slug) + ' needs attention</title>' +
		'<style>body{margin:0;padding:48px 24px;font:16px/1.6 system-ui,sans-serif;color:#16181d;background:#fafaf7}' +
		'main{max-width:60ch;margin:0 auto}h1{font-size:22px;line-height:1.3;margin:0 0 12px}' +
		'code{background:#f0efe9;padding:2px 6px;border-radius:4px}</style></head><body><main>' +
		'<h1>' + escapeHtml(slug) + ' cannot be served as it is</h1>' +
		'<p>' + escapeHtml(reason) + '</p>' +
		'<p>The document itself is intact and nothing was discarded. Its files are kept beside it under the store; ' +
		'finish or remove the file named above deliberately, then reload.</p>' +
		'<p><a href="/">All current pages</a></p>' +
		'</main></body></html>';
}

async function serveDocument(c: Context, slug: string, annotations: boolean): Promise<Response> {
	// This read is also the repair path for an interrupted restore, and a repair
	// that cannot complete must say why instead of failing the whole page.
	try {
		await withAnnotationWrite(slug, async () => {});
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		return c.html(renderProblemPage(slug, reason), 503);
	}
	try {
		const html = await fsp.readFile(pagePath(slug), "utf8");
		const diff = await readJsonOrEmpty<SectionDiffOnDisk | null>(diffPath(slug), null);
		// Inject slug into the dismiss script (we templated an empty string above).
		const withDiff = injectDiffMarkers(html, diff)
			.replace("/api/page/${slug}/dismiss-diff", `/api/page/${encodeURIComponent(slug)}/dismiss-diff`);
		const injected = injectBeforeBodyClose(withDiff, LAYOUT_BOUNDS_SHIM);
		// The change log travels with the document, so a shared or exported copy
		// still says what was edited, by whom, and when.
		const withChangelog = renderChangelog(await readChangelog(slug));
		const banner = renderBanner(await readLifecycle(storeDir(), slug), slug);
		const withBanner = banner.length > 0 ? injectBeforeBodyClose(injected, banner) : injected;
		const document = withChangelog.length > 0 ? injectBeforeBodyClose(withBanner, withChangelog) : withBanner;
		c.header("Cache-Control", "no-store");
		return c.html(annotations ? withAnnotationLayer(document, slug, clientRelease.id) : document);
	} catch {
		return c.html("Not found", 404);
	}
}
app.get("/page/:slug/embed", (c) => serveDocument(c, c.req.param("slug"), false));

// The image is evidence for the saved annotations, never a previous/deleted drawing.
app.post("/api/page/:slug/canvas-image", async (c) => {
	const slug = c.req.param("slug");
	return withAnnotationWrite(slug, async () => {
		const retired = await refuseWriteToRetiredPage(c, slug);
		if (retired) return retired;
		const current = await readAnnotationSnapshot(slug);
		if (c.req.header("x-frontpage-snapshot-version") !== snapshotVersion(current)) return c.json({ error: "image belongs to an older annotation snapshot" }, 409);
		const buf = Buffer.from(await c.req.arrayBuffer());
		if (!buf.length) return c.json({ error: "empty image" }, 400);
		await fsp.writeFile(canvasImagePath(slug), buf);
		return c.json({ ok: true, bytes: buf.length });
	});
});
app.get("/api/page/:slug/canvas-image", (c) => withAnnotationWrite(c.req.param("slug"), async () => {
	try {
		const buf = await fsp.readFile(canvasImagePath(c.req.param("slug")));
		return c.body(buf, 200, { "content-type": "image/png", "cache-control": "no-store" });
	} catch { return c.text("No current annotation image", 404); }
}));

// Decision Points: the page POSTs the operator's answer to a 'decision' block.
//
// An answer is stored with a fingerprint of the exact question it answered and
// the revision it was written against. That buys three things the previous
// version did not have:
//   - a write prepared against an older revision is refused instead of racing a
//     newer one, so the UI cannot be honest about a save the store disagrees with
//   - an answer to a question that has since changed reads back as stale, so it
//     is never presented as the answer to the question on screen now
//   - an option the question does not offer is refused rather than stored
type DecisionSection = {
	id?: string;
	type?: string;
	prompt?: string;
	options?: Array<{ key?: string; label?: string; detail?: string; recommended?: boolean }>;
	allowText?: boolean;
};

type StoredDecision = {
	chosenKey?: string;
	text?: string;
	at: number;
	/** Fingerprint of the question this answer was given to. */
	questionFingerprint?: string;
	/** Project revision the answer was written against. */
	revision?: number;
};

function decisionFingerprint(section: DecisionSection): string {
	return createHash("sha256")
			.update(
				JSON.stringify({
					prompt: section.prompt ?? "",
					options: (section.options ?? []).map((option) => ({
						key: option.key,
						label: option.label,
						detail: option.detail,
						recommended: option.recommended,
					})),
					allowText: section.allowText !== false,
				}),
				"utf8",
			)
			.digest("hex");
}

async function decisionSection(slug: string, id: string): Promise<DecisionSection | undefined> {
	const meta = await readJsonOrEmpty<{ spec?: { sections?: DecisionSection[] } }>(metaPath(slug), {});
	const sections = meta.spec?.sections ?? [];
	return sections.find((section) => section.type === "decision" && section.id === id);
}

async function projectRevision(slug: string): Promise<number | undefined> {
	const meta = await readJsonOrEmpty<{ currentRevision?: number }>(metaPath(slug), {});
	return typeof meta.currentRevision === "number" ? meta.currentRevision : undefined;
}

app.post("/api/page/:slug/decision", async (c) => {
	const slug = c.req.param("slug");
	// Read-modify-write of the answer store: two answers posted together must
	// not lose one another.
	return withAnnotationWrite(slug, async () => {
		try {
			const retiredAnswer = await refuseWriteToRetiredPage(c, slug);
			if (retiredAnswer) return retiredAnswer;
			const body = (await c.req.json()) as {
				id?: unknown;
				chosenKey?: unknown;
				text?: unknown;
				clear?: unknown;
				expectedRevision?: unknown;
			};
			const id = typeof body.id === "string" ? body.id : "";
			if (!id) return c.json({ ok: false, error: "missing id", code: "invalid" }, 400);

			const revision = await projectRevision(slug);
			if (body.expectedRevision !== undefined && body.expectedRevision !== null) {
				if (typeof body.expectedRevision !== "number") {
					return c.json({ ok: false, error: "expectedRevision must be a number", code: "invalid" }, 400);
				}
				if (revision !== undefined && body.expectedRevision !== revision) {
					return c.json(
						{
							ok: false,
							code: "stale-write",
							error:
								"this page was loaded at revision " +
								body.expectedRevision +
								" and the document is now at revision " +
								revision +
								"; reload before answering",
						},
						409,
					);
				}
			}

			const section = await decisionSection(slug, id);
			if (!section) {
				return c.json({ ok: false, code: "not-found", error: "no decision block " + id }, 404);
			}

			let store: Record<string, StoredDecision> = {};
			try {
				store = JSON.parse(await fsp.readFile(decisionsPath(slug), "utf8"));
			} catch {
				/* none yet */
			}

			if (body.clear === true) {
				delete store[id];
				await writeJsonAtomic(decisionsPath(slug), store);
				return c.json({ ok: true, cleared: true, revision });
			}

			const entry: StoredDecision = {
				at: Date.now(),
				questionFingerprint: decisionFingerprint(section),
				...(revision === undefined ? {} : { revision }),
			};
			if (typeof body.chosenKey === "string" && body.chosenKey.length > 0) {
				const offered = (section.options ?? []).some((option) => option.key === body.chosenKey);
				if (!offered) {
					return c.json(
						{ ok: false, code: "invalid", error: "option " + body.chosenKey + " is not offered by " + id },
						400,
					);
				}
				entry.chosenKey = body.chosenKey;
			}
			if (typeof body.text === "string" && body.text.trim()) {
				if (section.allowText === false) {
					return c.json({ ok: false, code: "invalid", error: id + " does not take a written answer" }, 400);
				}
				entry.text = body.text.trim();
			}
			if (entry.chosenKey === undefined && entry.text === undefined) {
				return c.json({ ok: false, code: "invalid", error: "empty answer" }, 400);
			}
			store[id] = entry;
			await writeJsonAtomic(decisionsPath(slug), store);
			return c.json({ ok: true, answer: entry, revision });
		} catch (e) {
			return c.json({ ok: false, error: String(e) }, 500);
		}
	});
});

// Reads back every stored answer, flagged against the question currently on the
// page. A flag the operator can see beats an answer that quietly stopped
// meaning what it said.
app.get("/api/page/:slug/decision", async (c) => {
	const slug = c.req.param("slug");
	const revision = await projectRevision(slug);
	let store: Record<string, StoredDecision> = {};
	try {
		store = JSON.parse(await fsp.readFile(decisionsPath(slug), "utf8"));
	} catch {
		return c.json({ revision, answers: {} });
	}
	type AnswerView = StoredDecision & {
		stale?: boolean;
		unverified?: boolean;
		reason?: string;
		currentFingerprint?: string;
	};
	const out: Record<string, AnswerView> = {};
	for (const [id, entry] of Object.entries(store)) {
		const section = await decisionSection(slug, id);
		if (!section) {
			out[id] = { ...entry, stale: true, reason: "this question is no longer part of the document" };
			continue;
		}
		const current = decisionFingerprint(section);
		if (entry.questionFingerprint === undefined) {
			out[id] = {
				...entry,
				unverified: true,
				reason: "stored before answers were fingerprinted; confirm it still answers this question",
				currentFingerprint: current,
			};
			continue;
		}
		if (entry.questionFingerprint !== current) {
			out[id] = {
				...entry,
				stale: true,
				reason: "the question changed since this was answered",
				currentFingerprint: current,
			};
			continue;
		}
		out[id] = { ...entry, currentFingerprint: current };
	}
	return c.json({ revision, answers: out });
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
	return documentPath(storeDir(), slug, ".tldraw.json");
}
function layoutPath(slug: string): string {
	return documentPath(storeDir(), slug, ".layout.json");
}
function historyPath(slug: string): string {
	return documentPath(storeDir(), slug, ".history.jsonl");
}
function canvasImagePath(slug: string): string {
	return documentPath(storeDir(), slug, ".canvas.png");
}
function decisionsPath(slug: string): string {
	return documentPath(storeDir(), slug, ".decisions.json");
}
function diffPath(slug: string): string {
	return documentPath(storeDir(), slug, ".diff.json");
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
	/** The changelog entry for this edit, written by whoever made it. */
	note?: string;
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
	await writeFileAtomic(historyPath(slug), text);
}

async function readSurfaceState(slug: string): Promise<{ html?: string; meta?: unknown }> {
	const [html, meta] = await Promise.all([
		fsp.readFile(pagePath(slug), "utf8").catch(() => undefined),
		fsp.readFile(metaPath(slug), "utf8").then((t) => JSON.parse(t) as unknown).catch(() => undefined),
	]);
	return { ...(html === undefined ? {} : { html }), meta };
}

async function appendHistoryEntry(slug: string, snapshot: unknown, author: string, note?: string): Promise<{ appended: boolean; reason?: string }> {
	const entries = await readHistory(slug);
	const last = entries[entries.length - 1];
	const now = Date.now();
	const surface = await readSurfaceState(slug);
	const shapeCount = countShapes(snapshot);
	const entry: HistoryEntry = { ts: now, author, shapeCount, snapshot, ...surface };
	if (note && note.trim()) entry.note = note.trim();
	const sameEdit = !!last && last.author === author && (last.note ?? '') === (note ?? '');
	if (sameEdit && last && now - last.ts < HISTORY_COALESCE_MS) {
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

/** Unique temp name so concurrent writers in this process never share a
 *  path; the exclusive flag turns a name collision into an error rather than
 *  a silent clobber, and a failed write removes only its own temp file. */
async function writeFileAtomic(filePath: string, text: string): Promise<void> {
	await fsp.mkdir(path.dirname(filePath), { recursive: true });
	const tmp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
	try {
		await fsp.writeFile(tmp, text, { encoding: "utf8", flag: "wx" });
		await fsp.rename(tmp, filePath);
	} catch (error) {
		await fsp.rm(tmp, { force: true }).catch(() => {});
		throw error;
	}
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
	await writeFileAtomic(filePath, JSON.stringify(data));
}

async function readJsonOrEmpty<T>(filePath: string, fallback: T): Promise<T> {
	try {
		return JSON.parse(await fsp.readFile(filePath, "utf8")) as T;
	} catch {
		return fallback;
	}
}

function snapshotVersion(snapshot: unknown): string | null {
	return snapshot === null ? null : createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
const pageWrites = new Map<string, Promise<unknown>>();
/** Serialize writes per page so concurrent requests for one slug never
 *  interleave their read-modify-write cycles. */
function withPageWrite<T>(slug: string, action: () => Promise<T>): Promise<T> {
	const previous = pageWrites.get(slug) ?? Promise.resolve();
	const next = previous.catch(() => {}).then(() => action());
	pageWrites.set(slug, next);
	void next.finally(() => { if (pageWrites.get(slug) === next) pageWrites.delete(slug); }).catch(() => {});
	return next;
}
/** A page write that must first finish an interrupted restore. */
function withAnnotationWrite<T>(slug: string, action: () => Promise<T>): Promise<T> {
	return withPageWrite(slug, async () => {
		await recoverPendingRestore(slug);
		return action();
	});
}
/** A failure that can be explained to whoever asked. */
class ReaderFailure extends Error {
	readonly code: string;
	readonly status: ContentfulStatusCode;
	constructor(message: string, code: string, status: ContentfulStatusCode = 500) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

async function readAnnotationSnapshot<T = unknown>(slug: string): Promise<T | null> {
	const raw = await fsp.readFile(tldrawPath(slug), "utf8").catch((error: NodeJS.ErrnoException) => {
		if (error.code === "ENOENT") return null;
		throw new ReaderFailure("The annotations on this page could not be read: " + error.message, "annotations-unreadable");
	});
	if (raw === null) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		throw new ReaderFailure("The annotations on this page are not readable JSON. Existing data was not replaced.", "annotations-unreadable");
	}
}
app.get("/api/page/:slug/tldraw", async (c) => {
	const slug = c.req.param("slug");
	// A failed or corrupt load must not be mistaken for an empty canvas; the
	// reader raises a reason-carrying failure and one handler reports it.
	return withAnnotationWrite(slug, async () => {
		const snapshot = await readAnnotationSnapshot(slug);
		const lifecycle = await readLifecycle(storeDir(), slug);
		return c.json({ slug, snapshot, version: snapshotVersion(snapshot), editable: isWritable(lifecycle) });
	});
});
app.put("/api/page/:slug/tldraw", async (c) => {
	const slug = c.req.param("slug");
	const retired = await refuseWriteToRetiredPage(c, slug);
	if (retired) return retired;
	const body = await c.req.json().catch(() => null) as { snapshot?: unknown; expectedVersion?: string | null; author?: string } | null;
	if (!body || !body.snapshot || !("expectedVersion" in body)) return c.json({ error: "expected { snapshot, expectedVersion }" }, 400);
	return withAnnotationWrite(slug, async () => {
		const retired = await refuseWriteToRetiredPage(c, slug);
		if (retired) return retired;
		const current = await readAnnotationSnapshot(slug);
		if (body.expectedVersion !== snapshotVersion(current)) return c.json({ error: "Annotations changed elsewhere. Your draft is kept; reload to review it before saving." }, 409);
		// Never store a snapshot that cannot be read back: the page would then
		// fail on every later read with no way to tell why.
		try {
			normalizeAnnotationSnapshot(body.snapshot, annotationSchema);
		} catch (error) {
			return c.json({ error: error instanceof Error ? error.message : String(error), code: "snapshot-unreadable" }, 400);
		}
		const version = snapshotVersion(body.snapshot);
		await writeJsonAtomic(tldrawPath(slug), body.snapshot);
		// Never return an image of deleted or previous drawings as current evidence.
		await fsp.rm(canvasImagePath(slug), { force: true });
		const histResult = await appendHistoryEntry(slug, body.snapshot, body.author ?? "hooman");
		return c.json({ ok: true, slug, version, savedAt: Date.now(), historyAppended: histResult.appended });
	});
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
	return withAnnotationWrite(slug, async () => {
		await writeJsonAtomic(layoutPath(slug), { sections, updatedAt: Date.now() });
		return c.json({ ok: true, slug, count: sections.length, itemCount: sections.reduce((n, s) => n + s.items.length, 0) });
	});
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
function unassigned(reason: string) {
	return { section: null, sectionReason: reason, item: null, itemReason: null };
}
function attributeAnchor(value: unknown, sections: SectionBounds[]) {
	if (!value || typeof value !== "object") return unassigned("no verified content target");
	const anchor = value as ContentAnchor;
	if (!anchorPosition(anchor, sections)) return unassigned("target changed, missing or ambiguous");
	const section = sections.find(s => s.id === anchor.section)!;
	const item = anchor.item ? section.items?.find(i => i.tag === anchor.item!.tag && i.text === anchor.item!.text) : undefined;
	return { section: section.id, sectionReason: "stored-content-anchor", item: item ? { idx: item.idx, tag: item.tag, cls: item.cls, text: item.text } : null, itemReason: item ? "unique-unchanged-item" : null };
}
function attributePoint(x: number, y: number, sections: SectionBounds[]) {
	const anchor = contentAnchor({ x, y }, { x, y }, sections);
	if (!anchor) return unassigned("no unambiguous geometry");
	const section = sections.find(s => s.id === anchor.section)!;
	const overlap = x >= section.x && x <= section.x + section.w && y >= section.y && y <= section.y + section.h;
	return { ...attributeAnchor(anchor, sections), sectionReason: overlap ? "geometric-overlap" : "inferred-nearest-section", itemReason: anchor.item ? "inside-item" : null };
}
function legacyAncestor(shape: Record<string, unknown>, store: Record<string, unknown>): boolean {
	let current = shape;
	const seen = new Set<unknown>();
	while (current) {
		if ((current.meta as Record<string, unknown> | undefined)?.frontpageLegacy || seen.has(current.id)) return true;
		seen.add(current.id);
		const parent = current.parentId;
		if (typeof parent !== "string" || parent.startsWith("page:")) return false;
		const next = store[parent];
		if (!next || typeof next !== "object") return true;
		current = next as Record<string, unknown>;
	}
	return false;
}

function extractAnnotations(snapshot: unknown, sections: SectionBounds[], slug: string): Array<Record<string, unknown>> {
	// Tldraw v3 `getSnapshot()` returns { document: { store, schema }, session }.
	const snap = toDocumentCoordinates(snapshot, slug) as { document?: { store?: Record<string, unknown> }; store?: Record<string, unknown> } | null;
	const store = snap?.document?.store ?? snap?.store;
	if (!store) return [];
	const shapes = Object.values(store).filter(
		(r): r is Record<string, unknown> =>
			typeof r === "object" && r !== null && (r as { typeName?: string }).typeName === "shape",
	);

	const { x: offsetX, y: offsetY } = annotationOffset(snap);

	const out: Array<Record<string, unknown>> = [];
	for (const s of shapes) {
		const type = s.type as string;
		if (type === "frontpage-embed") continue;
		const sx = typeof s.x === "number" ? (s.x as number) : 0;
		const sy = typeof s.y === "number" ? (s.y as number) : 0;
		const props = (s.props as Record<string, unknown>) ?? {};
		const meta = (s.meta as Record<string, unknown>) ?? {};
		const legacy = legacyAncestor(s, store);
		const flat = typeof s.parentId === "string" && s.parentId.startsWith("page:") && !(s.rotation as number);

		// Arrow gets special treatment: it has TWO endpoints, possibly bound
		// to other shapes. Each endpoint maps to its own section + item.
		if (type === "arrow") {
			const endpoint = (terminal: "start" | "end") => {
				if (legacy) return { ref: unassigned("historical or ambiguous"), point: null };
				const prop = props[terminal] as { x?: number; y?: number; boundShapeId?: string } | undefined;
				const bindings = Object.values(store).filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && (r as Record<string, unknown>).typeName === "binding" && (r as Record<string, unknown>).fromId === s.id && ((r as Record<string, unknown>).props as { terminal?: string } | undefined)?.terminal === terminal);
				if (bindings.length > 1) return { ref: unassigned("ambiguous arrow binding"), point: null };
				const targetId = bindings[0]?.toId ?? prop?.boundShapeId;
				if (typeof targetId === "string") {
					const target = store[targetId] as Record<string, unknown> | undefined;
					return { ref: target && !legacyAncestor(target, store) ? { ...attributeAnchor((target.meta as Record<string, unknown> | undefined)?.frontpageAnchor, sections), boundShapeId: targetId } : unassigned("unverified bound target"), point: null };
				}
				const point = flat && typeof prop?.x === "number" && typeof prop.y === "number" ? { x: sx + prop.x - offsetX, y: sy + prop.y - offsetY } : null;
				const key = terminal === "start" ? "frontpageFromAnchor" : "frontpageToAnchor";
				return { ref: Object.hasOwn(meta, key) ? attributeAnchor(meta[key], sections) : point ? attributePoint(point.x, point.y, sections) : unassigned("unverified parent geometry"), point };
			};
			const from = endpoint("start");
			const to = endpoint("end");
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
				from: from.ref,
				to: to.ref,
				canvasFrom: from.point,
				canvasTo: to.point,
				meta: (s.meta as Record<string, unknown>) ?? {},
			});
			continue;
		}

		// Notes / text / geo / draw / etc — single centroid attribution.
		const { w, h } = shapeFootprint(type, props);
		const pageCx = sx + w / 2 - offsetX;
		const pageCy = sy + h / 2 - offsetY;
		const attr = legacy ? unassigned("historical or ambiguous") : Object.hasOwn(meta, "frontpageAnchor") ? attributeAnchor(meta.frontpageAnchor, sections) : flat ? attributePoint(pageCx, pageCy, sections) : unassigned("unverified parent geometry");
		let text: string | null = null;
		if (typeof props.text === "string" && (props.text as string).length > 0) {
			text = props.text as string;
		} else if (props.richText && typeof props.richText === "object") {
			const plain = extractRichText(props.richText).trim();
			if (plain) text = plain;
		} else if (Array.isArray(props.lines) || Array.isArray(props.segments)) {
			text = "[drawing]";
		}

		out.push({
			id: s.id,
			type,
			text,
			canvasPosition: { x: sx, y: sy, w, h },
			pageCentroid: flat && !legacy ? { x: Math.round(pageCx), y: Math.round(pageCy) } : null,
			coordinateSpace: flat ? "page (estimated footprint)" : "parent-local",
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
		readAnnotationSnapshot<Record<string, unknown>>(slug),
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
	const annotations = extractAnnotations(snapshot, layout.sections, slug);
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
	const matches = sections.filter(s => s.id === anchor.section);
	if (matches.length !== 1) return null;
	const section = matches[0]!;
	const targets = anchor.item === undefined ? [section] : section.items?.filter(i => i.idx === anchor.item) ?? [];
	if (targets.length !== 1) return null;
	const target = targets[0]!;
	return { x: target.x + target.w + offset, y: target.y };
}

function richTextDoc(text: string): unknown {
	return {
		type: "doc",
		content: [{ type: "paragraph", attrs: { dir: "auto" }, content: text ? [{ type: "text", text }] : [] }],
	};
}

function buildNoteRecord(text: string, x: number, y: number, opts: { color?: string; size?: string; author?: string; index: IndexKey }): Record<string, unknown> {
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
		index: opts.index,
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

function buildTextRecord(text: string, x: number, y: number, opts: { color?: string; size?: string; author?: string; index: IndexKey }): Record<string, unknown> {
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
		index: opts.index,
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

function buildGeoRecord(geo: string, text: string, x: number, y: number, w: number, h: number, opts: { color?: string; author?: string; index: IndexKey }): Record<string, unknown> {
	
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
		index: opts.index,
		props: {
			geo,
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

function buildArrowRecord(start: { x: number; y: number }, end: { x: number; y: number }, text: string, opts: { color?: string; author?: string; index: IndexKey }): Record<string, unknown> {
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
		index: opts.index,
		props: {
			dash: "draw",
			size: "s",
			fill: "none",
			color: opts.color ?? "violet",
			labelColor: "black",
			kind: "arc",
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
	return withAnnotationWrite(slug, async () => {
		const retired = await refuseWriteToRetiredPage(c, slug);
		if (retired) return retired;
		const snap = await readAnnotationSnapshot<{ document?: { store?: Record<string, unknown> }; store?: Record<string, unknown> }>(slug);
		const store = snap?.document?.store ?? snap?.store;
		if (!store) return c.json({ ok: true, slug, cleared: 0 });
		let removed = 0;
		for (const [id, record] of Object.entries(store)) {
			const r = record as { typeName?: string; type?: string };
			if (r.typeName === "binding" || r.typeName === "shape" && r.type !== "frontpage-embed") {
				delete store[id];
				if (r.typeName === "shape") removed++;
			}
		}
		if (removed) {
			await writeJsonAtomic(tldrawPath(slug), snap);
			await fsp.rm(canvasImagePath(slug), { force: true });
			await appendHistoryEntry(slug, snap, "agent", "Cleared annotations");
			broadcastToSlug(slug, { type: "annotations", slug });
		}
		return c.json({ ok: true, slug, cleared: removed });
	});
});

app.post("/api/page/:slug/annotate", async (c) => {
	const slug = c.req.param("slug");
	const retired = await refuseWriteToRetiredPage(c, slug);
	if (retired) return retired;
	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object" || !Array.isArray((body as { shapes?: unknown }).shapes)) {
		return c.json({ error: "expected { shapes: [...], author?: string }" }, 400);
	}
	const shapes = (body as { shapes: AnnotateShapeInput[]; author?: string }).shapes;
	const author = typeof (body as { author?: unknown }).author === "string" ? (body as { author: string }).author : "agent";

	return withAnnotationWrite(slug, async () => {
	const retired = await refuseWriteToRetiredPage(c, slug);
	if (retired) return retired;
// Load layout for anchor resolution + current snapshot for store merge.
	const [layout, currentSnap] = await Promise.all([
		readJsonOrEmpty<{ sections: SectionBounds[] }>(layoutPath(slug), { sections: [] }),
		readAnnotationSnapshot<{ document?: { store?: Record<string, unknown> }; store?: Record<string, unknown> }>(slug),
	]);

	if (!layout.sections.length) return c.json({ error: "Open the document once so its content layout is available" }, 409);
	let snap: { document: TLStoreSnapshot };
	try {
		snap = currentSnap ? normalizeAnnotationSnapshot(toDocumentCoordinates(currentSnap, slug), annotationSchema) : emptyAnnotationSnapshot(annotationSchema);
	} catch (error) {
		// Annotations that cannot be read back must say so; nothing was replaced.
		return c.json({ error: error instanceof Error ? error.message : String(error), code: "annotations-unreadable" }, 500);
	}
	const store = snap.document.store;
	let lastIndex = Object.values(store).filter(record => record.typeName === "shape").map(record => record.index).sort().at(-1);
	const nextIndex = () => lastIndex = getIndexAbove(lastIndex);
	const addRecord = (record: Record<string, unknown>, meta: Record<string, unknown>) => {
		record.meta = { ...record.meta as object, ...meta };
		const validated = annotationSchema.types.shape.validate(record);
		store[validated.id] = validated;
		created.push(validated.id);
	};

	const { x: ox, y: oy } = annotationOffset(snap);

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
					? buildNoteRecord(s.text, canvasX, canvasY, { ...(s.color === undefined ? {} : { color: s.color }), ...(s.size === undefined ? {} : { size: s.size }), author, index: nextIndex() })
					: buildTextRecord(s.text, canvasX, canvasY, { ...(s.color === undefined ? {} : { color: s.color }), ...(s.size === undefined ? {} : { size: s.size }), author, index: nextIndex() });
				const anchor = s.anchor && !s.xy ? referenceAnchor(s.anchor, pageXY, layout.sections) : contentAnchor(pageXY, pageXY, layout.sections);
				addRecord(record, { frontpageAnchor: anchor });
			} else if (s.kind === "geo") {
				const canvasX = s.xy.x + ox;
				const canvasY = s.xy.y + oy;
				const record = buildGeoRecord(s.geo ?? "rectangle", s.text ?? "", canvasX, canvasY, s.w, s.h, { ...(s.color === undefined ? {} : { color: s.color }), author, index: nextIndex() });
				addRecord(record, { frontpageAnchor: contentAnchor(s.xy, s.xy, layout.sections) });
			} else if (s.kind === "arrow") {
				const startPage = "x" in s.from && "y" in s.from ? s.from : resolveAnchor(s.from, layout.sections, -10);
				const endPage = "x" in s.to && "y" in s.to ? s.to : resolveAnchor(s.to, layout.sections, -10);
				if (!startPage || !endPage) {
					skipped.push({ index: i, reason: "could not resolve arrow endpoints" });
					return;
				}
				const start = { x: startPage.x + ox, y: startPage.y + oy };
				const end = { x: endPage.x + ox, y: endPage.y + oy };
				const record = buildArrowRecord(start, end, s.text ?? "", { ...(s.color === undefined ? {} : { color: s.color }), author, index: nextIndex() });
				const from = "section" in s.from ? referenceAnchor(s.from, startPage, layout.sections) : contentAnchor(startPage, startPage, layout.sections);
				const to = "section" in s.to ? referenceAnchor(s.to, endPage, layout.sections) : contentAnchor(endPage, endPage, layout.sections);
				addRecord(record, { frontpageFromAnchor: from, frontpageToAnchor: to });
			} else {
				skipped.push({ index: i, reason: `unknown shape kind: ${(s as { kind?: string }).kind ?? "(none)"}` });
			}
		} catch (err) {
			skipped.push({ index: i, reason: err instanceof Error ? err.message : String(err) });
		}
	});

	if (!created.length) return c.json({ ok: !skipped.length, slug, created: 0, createdIds: [], skipped }, skipped.length ? 400 : 200);
	// Persist the merged snapshot AND record the agent write in history so
	// the hooman can roll back if our placement clobbered something.
	await writeJsonAtomic(tldrawPath(slug), snap);
	await appendHistoryEntry(slug, snap, `agent:${author}`);
	await fsp.rm(canvasImagePath(slug), { force: true });
	broadcastToSlug(slug, { type: "annotations" });
	return c.json({ ok: true, slug, created: created.length, createdIds: created, skipped });
});
});

// ---- Live revision events (SSE) ----
// Per-slug set of subscriber callbacks. When the page is revised (agent
// frontpage_update), we broadcast so open browsers add the new version
// in place, keeping older versions in History.
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
		// Must stay under Bun.serve's 10s idle timeout or the stream is dropped.
		const ka = setInterval(() => { void stream.write(": keepalive\n\n"); }, 5000);
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
		priorTs = entries.at(-1)?.ts;
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

// Restore is not one atomic rename, because the state lives in several files.
// Pretending otherwise is how a page comes back half-restored. So it is made
// RECOVERABLE instead: an intent file is written first, the writes follow, and
// any later read of the page finishes an interrupted restore from the history
// entry, which is itself untouched. Idempotent, so re-running is safe.
interface RestoreIntent {
	ts: number;
	by: string;
	startedAt: number;
}

function restoreIntentPath(slug: string): string {
	return documentPath(storeDir(), slug, ".restore-intent.json");
}

async function applyRestore(slug: string, entry: HistoryEntry, ts: number): Promise<number> {
	// The same rule the annotation write path enforces, on the other writer: a
	// snapshot that cannot be read back must not be stored. History written
	// before that rule can carry such a version.
	try {
		normalizeAnnotationSnapshot(entry.snapshot, annotationSchema);
	} catch (error) {
		throw new ReaderFailure(
			"The version saved at " + new Date(ts).toISOString() + " cannot be read back (" +
			(error instanceof Error ? error.message : String(error)) + "), so it was not restored and nothing was changed.",
			"snapshot-unreadable",
			409,
		);
	}
	let written = 0;
	await writeJsonAtomic(tldrawPath(slug), entry.snapshot);
	await fsp.rm(canvasImagePath(slug), { force: true });
	written += 1;
	if (typeof entry.html === "string") {
		await writeFileAtomic(pagePath(slug), entry.html);
		written += 1;
	}
	if (entry.meta !== undefined) {
		await writeJsonAtomic(metaPath(slug), entry.meta);
		written += 1;
	}
	void ts;
	return written;
}

/** Finish a restore that was interrupted, if there was one. Cheap: one stat. */
async function recoverPendingRestore(slug: string): Promise<{ ts: number; written: number } | null> {
	const raw = await fsp.readFile(restoreIntentPath(slug), "utf8").catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
	if (raw === null) return null;
	let intent: RestoreIntent | null = null;
	try {
		intent = JSON.parse(raw) as RestoreIntent;
	} catch {
		intent = null;
	}
	if (!intent || typeof intent.ts !== "number") throw new Error(RESTORE_BLOCKED.journalUnreadable + "; it was preserved for recovery");
	const lifecycle = await readLifecycle(storeDir(), slug);
	if (!isWritable(lifecycle)) throw new Error(RESTORE_BLOCKED.documentNotWritable(lifecycle.status) + "; the journal was preserved");
	const entries = await readHistory(slug);
	const entry = entries.find(e => e.ts === intent.ts);
	if (!entry) throw new Error(RESTORE_BLOCKED.versionMissing + "; the journal was preserved");
	const written = await applyRestore(slug, entry, intent.ts);
	await appendHistoryEntry(slug, entry.snapshot, `restore-from:${intent.ts}`, `Restored the version saved at ${new Date(intent.ts).toISOString()}`);
	await fsp.rm(restoreIntentPath(slug), { force: true });
	return { ts: intent.ts, written };
}

app.post("/api/page/:slug/restore", async (c) => {
	const slug = c.req.param("slug");
	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object" || typeof (body as { ts?: unknown }).ts !== "number") {
		return c.json({ error: "expected { ts: number }" }, 400);
	}
	const ts = (body as { ts: number }).ts;
	return withAnnotationWrite(slug, async () => {
	const retired = await readLifecycle(storeDir(), slug);
	if (!isWritable(retired)) {
		return c.json({ ok: false, code: "retired", error: "this page is " + retired.status + "; it cannot be restored" }, 409);
	}
	const entries = await readHistory(slug);
	const entry = entries.find((e) => e.ts === ts);
	if (!entry) return c.json({ error: "no history entry with that ts" }, 404);
	// Refuse before anything is written. A version that cannot be read back must
	// not be restored, and answering "restore-incomplete" would claim a journal
	// is waiting when nothing was journalled at all.
	try {
		normalizeAnnotationSnapshot(entry.snapshot, annotationSchema);
	} catch (error) {
		return c.json(
			{
				error: "The version saved at " + new Date(ts).toISOString() + " cannot be read back (" +
					(error instanceof Error ? error.message : String(error)) + "), so it was not restored. Nothing was changed.",
				code: "snapshot-unreadable",
			},
			409,
		);
	}

	// Intent first, writes second. Anything that dies between the two is
	// finished by recoverPendingRestore on the next read of this page.
	await writeJsonAtomic(restoreIntentPath(slug), { ts, by: "operator", startedAt: Date.now() } satisfies RestoreIntent);
	let written: number;
	try {
		written = await applyRestore(slug, entry, ts);
	} catch (error) {
		return c.json(
			{
				ok: false,
				code: "restore-incomplete",
				error: String(error),
				note: "the restore is journalled and will finish on the next read of this page",
			},
			500,
		);
	}
	await fsp.rm(restoreIntentPath(slug), { force: true });
	// Record the restore so the act of restoring is itself reversible.
	await appendHistoryEntry(
		slug,
		entry.snapshot,
		`restore-from:${ts}`,
		`Restored the version saved at ${new Date(ts).toISOString()}`,
	);
	broadcastToSlug(slug, { type: "revised", slug });
	return c.json({ ok: true, slug, restoredTs: ts, shapeCount: entry.shapeCount, restoredFiles: written });
	});
});

// Trigger a history snapshot from outside the canvas write path — used by
// frontpage_create / frontpage_update in the extension so spec changes also
// land in history.
app.post("/api/page/:slug/history", async (c) => {
	const slug = c.req.param("slug");
	// Read-modify-write of the history log.
	return withAnnotationWrite(slug, async () => {
		const body = await c.req.json().catch(() => ({}));
		const author = typeof (body as { author?: unknown }).author === "string"
			? (body as { author: string }).author
			: "agent";
		const snap = await readJsonOrEmpty<unknown>(tldrawPath(slug), { document: { store: {} } });
		const tsBefore = Date.now();
		const note = typeof (body as { note?: unknown }).note === "string" ? (body as { note: string }).note : undefined;
		const result = await appendHistoryEntry(slug, snap, author, note);
		// Return the ts of the entry we just created (the last one in the log).
		const entries = await readHistory(slug);
		const createdTs = entries.at(-1)?.ts ?? tsBefore;
		return c.json({ ok: true, slug, ts: createdTs, ...result });
	});
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

function serveClientAsset(filename: "bundle.js" | "bundle.css", contentType: string) {
	return (c: Context) => {
		const requested = c.req.query("v");
		if (requested !== clientRelease.id) return c.text("This client release is no longer served. Reload the document.", 404);
		return c.body(filename === "bundle.js" ? clientRelease.script : clientRelease.style, 200, {
			"content-type": contentType,
			"cache-control": "public, max-age=31536000, immutable",
		});
	};
}

// ---- HTML templates ----

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
  window.addEventListener('resize', schedule);
  window.addEventListener('frontpage:request-layout', schedule);
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
    var content = document.querySelector('.container');
    if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
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

/** How long ago a page was last changed, in the roughest useful unit. */
function formatAgo(ms: number): string {
	if (ms <= 0) return "";
	const diff = Date.now() - ms;
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return Math.round(diff / 60_000) + "m ago";
	if (diff < 86_400_000) return Math.round(diff / 3_600_000) + "h ago";
	return Math.round(diff / 86_400_000) + "d ago";
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
