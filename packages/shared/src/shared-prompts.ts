import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Shared-prompts loader.
 *
 * Some agent-facing prose belongs in multiple places — the rebirth command
 * needs to repeat the same TPV checklist that the default system prompt
 * suggests for ongoing context tracking. Owning that content in a single
 * .md inside `@pi-extensions/shared/prompts/` avoids drift.
 *
 * Consumers (default-prompt, pi-mesh, future extensions) import this
 * loader and pull prompt content by name. Files are mtime-cached so
 * live edits during development pick up on the next call without an
 * extension restart.
 *
 * Safety: NEVER throws. Returns the caller-supplied fallback when the
 * file is missing or unreadable — keeps critical-path code resilient
 * to disk hiccups and accidental deletes.
 */

const PROMPTS_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"prompts",
);

interface CacheEntry {
	mtime: number;
	content: string;
}
const cache = new Map<string, CacheEntry>();

/**
 * Load a shared prompt by name (no `.md` extension). Falls back to
 * `fallback` on any read error. Result is mtime-cached.
 *
 * @param name      File name without extension, e.g. "tpv-checklist"
 * @param fallback  Returned if the file is missing or unreadable
 */
export function loadSharedPrompt(name: string, fallback = ""): string {
	const fullPath = path.join(PROMPTS_DIR, `${name}.md`);
	try {
		const stat = fs.statSync(fullPath);
		const cached = cache.get(fullPath);
		if (cached && cached.mtime === stat.mtimeMs) return cached.content;
		const content = fs.readFileSync(fullPath, "utf-8");
		cache.set(fullPath, { mtime: stat.mtimeMs, content });
		return content;
	} catch {
		return fallback;
	}
}

/** Test/dev helper — flush the shared cache. */
export function reloadSharedPromptCache(): void {
	cache.clear();
}

/** Absolute path to a shared prompt file (no read). */
export function getSharedPromptPath(name: string): string {
	return path.join(PROMPTS_DIR, `${name}.md`);
}
