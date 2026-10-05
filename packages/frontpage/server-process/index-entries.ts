import fsp from "node:fs/promises";
import path from "node:path";
import { archiveDir, documentPath, isPageSlug, isWritable, readLifecycle } from "./lifecycle.ts";

/** One vocabulary for why an interrupted restore cannot finish, shared by the
 *  reader that reports it and the index that lists the document as blocked. */
export const RESTORE_BLOCKED = {
	journalUnreadable: "the restore journal cannot be read",
	journalNamesNoVersion: "the restore journal names no version",
	documentNotWritable: (status: string) => "the document is " + status + ", so a pending restore cannot be applied",
	versionMissing: "the version it names is no longer in the history",
	historyMissing: "the history it needs is missing",
} as const;

/** Why an interrupted restore on this document cannot finish, if it cannot.
 *  Read-only: the repair itself happens the next time the page is opened. */
export async function restoreIntentProblem(dir: string, slug: string): Promise<string | undefined> {
	let raw: string;
	try {
		raw = await fsp.readFile(documentPath(dir, slug, ".restore-intent.json"), "utf8");
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "ENOENT" ? undefined : RESTORE_BLOCKED.journalUnreadable;
	}
	let ts: unknown;
	try {
		ts = (JSON.parse(raw) as { ts?: unknown }).ts;
	} catch {
		return RESTORE_BLOCKED.journalUnreadable;
	}
	if (typeof ts !== "number") return RESTORE_BLOCKED.journalNamesNoVersion;
	const lifecycle = await readLifecycle(dir, slug);
	if (!isWritable(lifecycle)) return RESTORE_BLOCKED.documentNotWritable(lifecycle.status);
	try {
		const history = await fsp.readFile(documentPath(dir, slug, ".history.jsonl"), "utf8");
		if (!history.includes('"ts":' + ts + ",")) return RESTORE_BLOCKED.versionMissing;
	} catch {
		return RESTORE_BLOCKED.historyMissing;
	}
	return undefined;
}

/** One artifact in the store, with the truth about what can be done with it. */
export interface IndexEntry {
	slug: string;
	title: string;
	/** True when /page/<slug> can actually serve this artifact. */
	servable: boolean;
	/** When the document last changed, newest first on the index. */
	modified: number;
	/** When it was created: its own record, else the page file's birth time. */
	created: number;
	/** Who the document says wrote it, when its metadata records one. */
	author?: string;
	/** Why this artifact cannot be treated as an ordinary current page. */
	problem?: string;
}

/** The page's own records. Derived files are deliberately absent: viewing a
 *  page rewrites .layout.json and .canvas.png, so counting them would make every
 *  page look freshly modified. */
const RECORD_SUFFIXES = [".html", ".meta.json", ".tldraw.json", ".decisions.json"] as const;

/** When the page file itself was created, for documents whose metadata does
 *  not record it. */
async function birthTime(dir: string, slug: string): Promise<number> {
	return fsp.stat(documentPath(dir, slug, ".html")).then((s) => s.birthtimeMs || s.ctimeMs, () => 0);
}

async function lastModified(dir: string, slug: string): Promise<number> {
	const times = await Promise.all(
		RECORD_SUFFIXES.map((suffix) => fsp.stat(documentPath(dir, slug, suffix)).then((s) => s.mtimeMs, () => 0)),
	);
	return Math.max(0, ...times);
}

export type IndexMeta =
	| { state: "absent" }
	| { state: "unreadable" }
	| { state: "ok"; title: string; declaredSlug?: string; createdAt?: number; byline?: string };

export function metaFile(dir: string, slug: string): string {
	return documentPath(dir, slug, ".meta.json");
}

export function htmlFile(dir: string, slug: string): string {
	return documentPath(dir, slug, ".html");
}

/** Read the metadata of one artifact, distinguishing "there is none" from
 *  "there is one and it cannot be read" - those need different answers. */
export async function readIndexMeta(dir: string, slug: string): Promise<IndexMeta> {
	let raw: string;
	try {
		raw = await fsp.readFile(metaFile(dir, slug), "utf8");
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "ENOENT" ? { state: "absent" } : { state: "unreadable" };
	}
	try {
		const meta = JSON.parse(raw) as { slug?: unknown; createdAt?: unknown; spec?: { title?: unknown } };
		const spec = (meta.spec ?? {}) as { title?: unknown; byline?: unknown };
		const title = typeof spec.title === "string" && spec.title !== "" ? spec.title : slug;
		const declaredSlug = typeof meta.slug === "string" && meta.slug !== "" ? meta.slug : undefined;
		const createdAt = typeof meta.createdAt === "number" && Number.isFinite(meta.createdAt) && meta.createdAt > 0 ? meta.createdAt : undefined;
		return {
			state: "ok",
			title,
			...(declaredSlug === undefined ? {} : { declaredSlug }),
			...(createdAt === undefined ? {} : { createdAt }),
			...(typeof spec.byline === "string" && spec.byline !== "" ? { byline: spec.byline } : {}),
		};
	} catch {
		return { state: "unreadable" };
	}
}

/** Every artifact in the store is listed, because an artifact nobody can see is
 *  an artifact nobody can reconcile. Titles come from readable metadata; the
 *  filename is the name, and anything that cannot be served says why. */
export async function listFrontpages(dir: string): Promise<IndexEntry[]> {
	const files = await fsp.readdir(dir).catch(() => [] as string[]);
	// A purge moves a page's content into purged/<slug>/ and leaves its rule at
	// the root. Both halves are listed: a page that is not current is one
	// deliberate click away, never invisible.
	const archived = await fsp.readdir(path.join(dir, "purged"), { withFileTypes: true })
		.then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
		.catch(() => [] as string[]);
	const slugs = new Set<string>(archived);
	for (const file of files) {
		if (file.endsWith(".html")) slugs.add(file.slice(0, -".html".length));
		else if (file.endsWith(".meta.json")) slugs.add(file.slice(0, -".meta.json".length));
		else if (file.endsWith(".lifecycle.json")) slugs.add(file.slice(0, -".lifecycle.json".length));
	}
	// Every artifact is described once, from what is actually on disk: its
	// timestamps, who it says wrote it, and the one reason it cannot be treated
	// as an ordinary current page.
	const out: IndexEntry[] = [];
	for (const slug of slugs) {
		if (!isPageSlug(slug)) {
			out.push({ slug, title: slug, servable: false, modified: 0, created: 0, problem: "name cannot be used as a page address" });
			continue;
		}
		// An archived page keeps its records beside its content.
		const home = archived.includes(slug) ? archiveDir(dir, slug) : dir;
		const present = home === dir ? files : await fsp.readdir(home).catch(() => [] as string[]);
		const [modified, born] = await Promise.all([lastModified(home, slug), birthTime(home, slug)]);
		const meta = await readIndexMeta(home, slug);
		const created = meta.state === "ok" && meta.createdAt !== undefined ? meta.createdAt : born;
		let title = meta.state === "ok" ? meta.title : slug;
		let servable = true;
		let problem: string | undefined;
		if (!present.includes(slug + ".html")) {
			// An orphan still names the project it belongs to, which is what an
			// operator needs in order to decide what to do with it.
			servable = false;
			problem = "metadata with no page content";
		} else if (meta.state === "unreadable") {
			title = slug;
			problem = "metadata is not readable";
		} else {
			// A document that cannot be served at all outranks one whose metadata
			// is merely unreadable, so this is asked first.
			const blocked = await restoreIntentProblem(dir, slug);
			if (blocked !== undefined) problem = "an interrupted restore is preserved here and " + blocked;
			else if (meta.state === "ok" && meta.declaredSlug !== undefined && meta.declaredSlug !== slug) {
				title = meta.title;
				problem = "metadata names it " + meta.declaredSlug;
			}
		}
		const author = meta.state === "ok" ? meta.byline : undefined;
		out.push({
			slug,
			title,
			servable,
			modified,
			created,
			...(author === undefined ? {} : { author }),
			...(problem === undefined ? {} : { problem }),
		});
	}
	// What the operator touched last is what the operator wants to see first.
	out.sort((a, b) => b.modified - a.modified || a.title.localeCompare(b.title));
	return out;
}
