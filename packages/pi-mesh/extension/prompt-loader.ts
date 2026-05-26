import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Minimal prompt loader with mtime caching + token substitution.
 *
 * Used for agent-facing prose that lives in `packages/pi-mesh/prompts/*.md`
 * so non-coders can edit the copy without TypeScript context. Dev edits
 * pick up on the next call without a restart (mtime cache invalidation).
 *
 * Safety: load() NEVER throws. If the file is missing or unreadable, the
 * caller-provided fallback string is returned. Critical-path code
 * (session_start, command handlers) must not crash the extension on
 * disk hiccups, accidental deletes, or permission issues.
 *
 * Token substitution: `{{name}}` → tokens[name]. Tokens not provided are
 * left as literal `{{name}}` in the output so the agent sees an obvious
 * unresolved-token marker rather than silent data loss.
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

/** Reload the entire prompt cache (test/dev helper). */
export function reloadPromptCache(): void {
	cache.clear();
}

/**
 * Load a prompt template by name (no `.md` extension), substitute tokens,
 * return the result. Falls back to `fallback` if the file is unreadable.
 *
 * @param name      File name without extension, e.g. "rebirth-wake"
 * @param tokens    `{{name}}` → value map
 * @param fallback  Hard-coded backup if the file is missing/broken
 */
export function loadPrompt(
	name: string,
	tokens: Record<string, string>,
	fallback: string,
): string {
	const fullPath = path.join(PROMPTS_DIR, `${name}.md`);
	let template: string;
	try {
		const stat = fs.statSync(fullPath);
		const cached = cache.get(fullPath);
		if (cached && cached.mtime === stat.mtimeMs) {
			template = cached.content;
		} else {
			template = fs.readFileSync(fullPath, "utf-8");
			cache.set(fullPath, { mtime: stat.mtimeMs, content: template });
		}
	} catch {
		template = fallback;
	}
	return substituteTokens(template, tokens);
}

/**
 * Substitute `{{name}}` placeholders in `template` with values from
 * `tokens`. Unknown tokens are left as-is so missing data surfaces as
 * a visible `{{name}}` marker rather than blank space.
 */
export function substituteTokens(template: string, tokens: Record<string, string>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (raw, key: string) =>
		Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : raw,
	);
}
