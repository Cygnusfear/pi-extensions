import fsp from "node:fs/promises";
import path from "node:path";
import { documentPath, isPageSlug, isWritable, readLifecycle } from "./lifecycle.ts";

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
	/** Why this artifact cannot be treated as an ordinary current page. */
	problem?: string;
}

export type IndexMeta =
	| { state: "absent" }
	| { state: "unreadable" }
	| { state: "ok"; title: string; declaredSlug?: string };

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
		const meta = JSON.parse(raw) as { slug?: unknown; spec?: { title?: unknown } };
		const title = typeof meta.spec?.title === "string" && meta.spec.title !== "" ? meta.spec.title : slug;
		const declaredSlug = typeof meta.slug === "string" && meta.slug !== "" ? meta.slug : undefined;
		return declaredSlug === undefined ? { state: "ok", title } : { state: "ok", title, declaredSlug };
	} catch {
		return { state: "unreadable" };
	}
}

/** Every artifact in the store is listed, because an artifact nobody can see is
 *  an artifact nobody can reconcile. Titles come from readable metadata; the
 *  filename is the name, and anything that cannot be served says why. */
export async function listFrontpages(dir: string): Promise<IndexEntry[]> {
	const files = await fsp.readdir(dir).catch(() => [] as string[]);
	const slugs = new Set<string>();
	for (const file of files) {
		if (file.endsWith(".html")) slugs.add(file.slice(0, -".html".length));
		else if (file.endsWith(".meta.json")) slugs.add(file.slice(0, -".meta.json".length));
	}
	const out: IndexEntry[] = [];
	for (const slug of slugs) {
		if (!isPageSlug(slug)) {
			out.push({ slug, title: slug, servable: false, problem: "name cannot be used as a page address" });
			continue;
		}
		const meta = await readIndexMeta(dir, slug);
		// An orphan still names the project it belongs to, which is what an
		// operator needs in order to decide what to do with it.
		const named = meta.state === "ok" ? meta.title : slug;
		if (!files.includes(slug + ".html")) {
			out.push({ slug, title: named, servable: false, problem: "metadata with no page content" });
			continue;
		}
		if (meta.state === "unreadable") {
			out.push({ slug, title: slug, servable: true, problem: "metadata is not readable" });
			continue;
		}
		// A document that cannot be served at all outranks one whose metadata is
		// merely unreadable, so this is checked first.
		const blocked = await restoreIntentProblem(dir, slug);
		if (blocked !== undefined) {
			out.push({ slug, title: named, servable: true, problem: "an interrupted restore is preserved here and " + blocked });
			continue;
		}
		if (meta.state === "ok" && meta.declaredSlug !== undefined && meta.declaredSlug !== slug) {
			out.push({ slug, title: meta.title, servable: true, problem: "metadata names it " + meta.declaredSlug });
			continue;
		}
		out.push({ slug, title: named, servable: true });
	}
	out.sort((a, b) => a.title.localeCompare(b.title));
	return out;
}
