/**
 * Page lifecycle: the rule for what happens to a page that is no longer current.
 * The complaint this answers is real and measured - agents leave old pages
 * behind and nothing distinguishes them from live work. So every page carries an
 * explicit state, and the state is enforced, not just displayed:
 *
 *   current     - the live page. Writable.
 *   superseded  - replaced by another page, which it NAMES. Writable: false.
 *   archived    - kept, reachable by link, out of the way. Writable: false.
 *   purged      - content moved aside, tombstone kept with the reason and the
 *                 author who decided it. Writable: false, and nothing is
 *                 silently deleted: the artifacts are moved, not unlinked.
 *
 * The state lives in its own file beside the page, never inside meta.json,
 * because meta.json is rewritten wholesale by the agent tooling on every edit
 * and would silently drop a rule stored inside it.
 */

import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type LifecycleStatus = "current" | "superseded" | "archived" | "purged";

export interface LifecycleState {
	readonly status: LifecycleStatus;
	readonly reason?: string;
	/** Required when superseded: which page replaced this one. */
	readonly supersededBy?: string;
	readonly by?: string;
	readonly since?: number;
}

const STATUSES: readonly LifecycleStatus[] = ["current", "superseded", "archived", "purged"];

/** Every artifact a page owns. Anything left over that is not listed here is not ours. */
const ARTIFACTS = [
	".html",
	".meta.json",
	".history.jsonl",
	".tldraw.json",
	".layout.json",
	".decisions.json",
	".diff.json",
	".canvas.png",
] as const;
type DocumentSuffix = typeof ARTIFACTS[number] | ".lifecycle.json" | ".restore-intent.json";

export class InvalidPageSlug extends Error {
	constructor() { super("Page name must be a single filename component"); }
}
export function isPageSlug(slug: string): boolean {
	return slug !== "" && slug !== "." && slug !== ".." && !slug.includes("/") && !slug.includes(String.fromCharCode(92)) && !slug.includes(String.fromCharCode(0));
}
export function assertPageSlug(slug: string): void {
	if (!isPageSlug(slug)) throw new InvalidPageSlug();
}
export function documentPath(dir: string, slug: string, suffix: DocumentSuffix): string {
	assertPageSlug(slug);
	return path.join(dir, slug + suffix);
}

export function lifecyclePath(dir: string, slug: string): string {
	return documentPath(dir, slug, ".lifecycle.json");
}

export async function readLifecycle(dir: string, slug: string): Promise<LifecycleState> {
	const raw = await readFile(lifecyclePath(dir, slug), "utf8").catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
	if (raw === null) return { status: "current" };
	try {
		const parsed = JSON.parse(raw) as Partial<LifecycleState>;
		if (typeof parsed.status !== "string" || !STATUSES.includes(parsed.status as LifecycleStatus)) {
			// A corrupt rule must not silently read as "current" - that would let a
			// retired page look live again.
			return { status: "archived", reason: "lifecycle rule unreadable; treated as archived until reviewed" };
		}
		return {
			status: parsed.status as LifecycleStatus,
			...(typeof parsed.reason === "string" ? { reason: parsed.reason } : {}),
			...(typeof parsed.supersededBy === "string" ? { supersededBy: parsed.supersededBy } : {}),
			...(typeof parsed.by === "string" ? { by: parsed.by } : {}),
			...(typeof parsed.since === "number" ? { since: parsed.since } : {}),
		};
	} catch {
		return { status: "archived", reason: "lifecycle rule unreadable; treated as archived until reviewed" };
	}
}

export async function writeLifecycle(dir: string, slug: string, state: LifecycleState): Promise<void> {
	const target = lifecyclePath(dir, slug);
	if (state.supersededBy !== undefined) assertPageSlug(state.supersededBy);
	const tmp = target + ".tmp";
	await mkdir(dir, { recursive: true });
	await writeFile(tmp, JSON.stringify(state, null, 2) + "\n", "utf8");
	await rename(tmp, target);
}

/** A retired page does not accept new writes. Silently accepting them is how
 *  the "old crap nobody knows about" pile grows. */
export function isWritable(state: LifecycleState): boolean {
	return state.status === "current";
}

/** Does this document exist? A purge moves a page's artifacts aside instead of
 *  deleting them and the move is reversible, so a purged page is still a page -
 *  otherwise the un-purge path could never be reached. */
export async function documentExists(dir: string, slug: string): Promise<boolean> {
	if (await exists(documentPath(dir, slug, ".html"))) return true;
	return exists(path.join(archiveDir(dir, slug), slug + ".html"));
}

export function archiveDir(dir: string, slug: string): string {
	assertPageSlug(slug);
	return path.join(dir, "purged", slug);
}

/**
 * Move a page's artifacts aside instead of deleting them. A purge you can
 * reverse beats a delete you cannot, and the tombstone explains itself.
 */
export async function moveArtifactsAside(dir: string, slug: string): Promise<string[]> {
	const target = archiveDir(dir, slug);
	await mkdir(target, { recursive: true });
	const moved: string[] = [];
	for (const suffix of ARTIFACTS) {
		const from = documentPath(dir, slug, suffix);
		if (!(await exists(from))) continue;
		await rename(from, documentPath(target, slug, suffix));
		moved.push(suffix);
	}
	return moved;
}

export async function restoreArtifacts(dir: string, slug: string): Promise<string[]> {
	const source = archiveDir(dir, slug);
	if (!(await exists(source))) return [];
	const restored: string[] = [];
	for (const suffix of ARTIFACTS) {
		const from = documentPath(source, slug, suffix);
		if (!(await exists(from))) continue;
		await rename(from, documentPath(dir, slug, suffix));
		restored.push(suffix);
	}
	if (restored.length > 0) await rm(source, { recursive: true, force: true });
	return restored;
}

async function exists(target: string): Promise<boolean> {
	const info = await stat(target).catch(() => null);
	return info !== null;
}

function escape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * The banner, rendered into the document so a retired page says so on arrival
 * rather than looking like live work.
 */
export function renderBanner(state: LifecycleState, slug: string): string {
	if (state.status === "current") return "";
	const parts: string[] = [];
	if (state.status === "superseded") {
		parts.push("This page was superseded.");
		if (state.supersededBy !== undefined) {
			parts.push(
				' The replacement is <a href="/page/' +
					escape(encodeURIComponent(state.supersededBy)) +
					'">' +
					escape(state.supersededBy) +
					"</a>.",
			);
		}
	}
	if (state.status === "archived") parts.push("This page is archived: kept for reference, out of the working set.");
	if (state.status === "purged") {
		parts.push("This page was purged. Its artifacts were moved aside, not deleted, and this tombstone is what remains.");
	}
	if (state.reason !== undefined) parts.push(" Reason: " + escape(state.reason) + ".");
	if (state.by !== undefined) {
		parts.push(" Marked by " + escape(state.by) + (state.since === undefined ? "" : " on " + new Date(state.since).toISOString().slice(0, 16) + "Z") + ".");
	}
	return (
		'<aside class="fp-lifecycle fp-lifecycle--' +
		escape(state.status) +
		'" role="note" data-lifecycle="' +
		escape(state.status) +
		'" data-slug="' +
		escape(slug) +
		'">' +
		parts.join(" ") +
		"</aside>"
	);
}
