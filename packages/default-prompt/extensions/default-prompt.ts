/**
 * default-prompt.ts
 *
 * Additive prompt layering:
 * 1) Always load bundled global prompt from this package: prompts/default.md
 * 2) If present, also load repo-local overlay: .prompts/default.md
 *
 * Both are appended to the system prompt on every agent turn via
 * before_agent_start.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getStableNickname } from "@pi-extensions/shared/session-nickname";
import { loadSharedPrompt } from "@pi-extensions/shared/shared-prompts";

/**
 * Build a per-turn identity block that injects the agent's stable mesh
 * nickname and the current ISO timestamp into every system prompt.
 *
 * Why this exists: agents constantly hallucinate fake names ("- shithead",
 * "- some-other-agent") when signing mesh tells. Receiving agents then
 * trust the bottom-of-message signature, search the mesh for that fake
 * name, find a different real peer, and tell-spam the wrong session.
 * The wrong session happily plays along. This is how the mesh corrupts.
 *
 * Fix: re-anchor the agent's actual identity on every turn. The nickname
 * is the stable per-process identifier (e.g. "Gerard Stargate Freedman")
 * derived from the pi-mesh sidecar's Zenoh peer id — the SAME identity
 * the mesh broadcasts. Pairing it with current time also kills "what time
 * is it?" / "how long ago did X happen?" hallucinations on long sessions.
 *
 * Returns null when pi-mesh isn't loaded (no stable id available) — no
 * identity block in that case, prompt stays unchanged.
 */
function buildIdentityBlock(): string | null {
	const nickname = getStableNickname();
	if (!nickname) return null;
	const now = new Date();
	const iso = now.toISOString();
	const local = now.toLocaleString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZoneName: "short",
	});
	return [
		"## Your identity (re-anchored every turn)",
		"",
		`You are **${nickname}** on the mesh. This is your stable name — it does NOT change between turns.`,
		"",
		`When you sign mesh tells, mai notes, commit messages, or any other communication that other agents will read, use this exact name: **${nickname}**.`,
		"",
		"Do NOT invent a name. Do NOT use a previous turn's name from memory. Do NOT use a name you read in someone else's message. Your name is on this line, refreshed every turn.",
		"",
		`Current time: **${local}** (${iso}).`,
	].join("\n");
}

export default function defaultPromptExtension(pi: ExtensionAPI) {
	const cache = new Map<string, { mtime: number; content: string }>();

	const bundledPromptPath = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		"..",
		"prompts",
		"default.md",
	);

	const findRepoRoot = (cwd: string): string => {
		let dir = path.resolve(cwd);
		while (true) {
			if (existsSync(path.join(dir, ".git"))) {
				return dir;
			}
			const parent = path.dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}

		return path.resolve(cwd);
	};

	const getRepoPromptPath = (cwd: string): string => {
		const repoRoot = findRepoRoot(cwd);
		return path.join(repoRoot, ".prompts", "default.md");
	};

	const stripFrontmatter = (content: string): string => {
		const trimmed = content.trim();
		const match = trimmed.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
		if (!match) return trimmed;
		return trimmed.slice(match[0].length).trim();
	};

	const loadPromptContent = async (promptPath: string): Promise<string | null> => {
		if (!existsSync(promptPath)) return null;

		try {
			const stat = await fs.stat(promptPath);
			const cached = cache.get(promptPath);

			if (!cached || cached.mtime !== stat.mtimeMs) {
				const raw = await fs.readFile(promptPath, "utf8");
				const content = stripFrontmatter(raw);
				cache.set(promptPath, { mtime: stat.mtimeMs, content });
			}

			const loaded = cache.get(promptPath)?.content?.trim() ?? "";
			return loaded.length > 0 ? loaded : null;
		} catch {
			return null;
		}
	};

	pi.on("before_agent_start", async (event: any, ctx: any) => {
		const globalPrompt = await loadPromptContent(bundledPromptPath);
		const repoPromptPath = getRepoPromptPath(ctx.cwd);
		const repoPrompt =
			repoPromptPath === bundledPromptPath
				? null
				: await loadPromptContent(repoPromptPath);

		// Identity block is added LAST so it sits closest to the agent's turn
		// — the closer to the response, the harder to ignore.
		const identityBlock = buildIdentityBlock();

		// TPV (Total Perspective Vortex) checklist — agent-facing context-
		// management instructions. Single source of truth in
		// `@pi-extensions/shared/prompts/tpv-checklist.md` so the same
		// checklist that the /rebirth command shows is the one agents see
		// in their ongoing system prompt. Loaded fresh on every turn (mtime
		// caching makes that cheap). Empty string fallback if shared is
		// missing — extension stays functional without it.
		const tpvChecklist = loadSharedPrompt("tpv-checklist", "");

		const additions = [globalPrompt, repoPrompt, tpvChecklist, identityBlock].filter(
			(content): content is string => Boolean(content && content.trim().length > 0),
		);

		if (additions.length === 0) return;

		const baseSystemPrompt = typeof event.systemPrompt === "string" ? event.systemPrompt : "";

		return {
			systemPrompt: [baseSystemPrompt, ...additions].filter(Boolean).join("\n\n"),
		};
	});
}
