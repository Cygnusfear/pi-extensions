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

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getStableNickname } from "@pi-extensions/shared/session-nickname";
import { Type } from "@sinclair/typebox";
import { loadSharedPrompt } from "../../shared/src/shared-prompts.ts";
import {
	buildIdentityBlock,
	buildTimeBlock,
	formatPromptClock,
	stripPromptFrontmatter,
} from "../src/compose-default-prompt";
import {
	lookupPromptManual,
	PROMPT_MANUAL_TOPIC_IDS,
} from "../src/prompt-manual";

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

	const loadPromptContent = async (
		promptPath: string,
	): Promise<string | null> => {
		if (!existsSync(promptPath)) return null;

		try {
			const stat = await fs.stat(promptPath);
			const cached = cache.get(promptPath);

			if (!cached || cached.mtime !== stat.mtimeMs) {
				const raw = await fs.readFile(promptPath, "utf8");
				const content = stripPromptFrontmatter(raw);
				cache.set(promptPath, { mtime: stat.mtimeMs, content });
			}

			const loaded = cache.get(promptPath)?.content?.trim() ?? "";
			return loaded.length > 0 ? loaded : null;
		} catch {
			return null;
		}
	};

	const bundledManualPath = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		"..",
		"prompts",
		"default-manual.md",
	);

	pi.registerTool({
		name: "prompt_manual",
		label: "Prompt Manual",
		description:
			"Read one bounded local page of the default operating manual. Use the index first, then one relevant topic; it never calls a provider or remote service.",
		parameters: Type.Object({
			topic: Type.Union([
				Type.Literal("index"),
				...PROMPT_MANUAL_TOPIC_IDS.map((id) => Type.Literal(id)),
			]),
		}),
		async execute(_toolCallId, params) {
			const manualSource = await loadPromptContent(bundledManualPath);
			if (!manualSource) {
				return {
					content: [
						{
							type: "text" as const,
							text: "The local prompt manual is unavailable.",
						},
					],
					details: {},
					isError: true,
				};
			}

			const result = lookupPromptManual(manualSource, params.topic);
			return result.ok
				? {
						content: [{ type: "text" as const, text: result.text }],
						details: {},
					}
				: {
						content: [{ type: "text" as const, text: result.error }],
						details: {},
						isError: true,
					};
		},
	});

	pi.on("before_agent_start", async (event: any, ctx: any) => {
		const globalPrompt = await loadPromptContent(bundledPromptPath);
		const repoPromptPath = getRepoPromptPath(ctx.cwd);
		const repoPrompt =
			repoPromptPath === bundledPromptPath
				? null
				: await loadPromptContent(repoPromptPath);

		// Identity/time anchor block is added LAST so it sits closest to the
		// agent's turn — the closer to the response, the harder to ignore.
		// With pi-mesh: full identity + time. Without: time only.
		const nickname = getStableNickname();
		const clock = formatPromptClock();
		const anchorBlock = nickname
			? buildIdentityBlock(nickname, clock)
			: buildTimeBlock(clock);

		// TPV (Total Perspective Vortex) checklist — agent-facing context-
		// management instructions. Single source of truth in
		// `@pi-extensions/shared/prompts/tpv-checklist.md` so the same
		// checklist that the /rebirth command shows is the one agents see
		// in their ongoing system prompt. Loaded fresh on every turn (mtime
		// caching makes that cheap). Empty string fallback if shared is
		// missing — extension stays functional without it.
		const tpvChecklist = loadSharedPrompt("tpv-checklist", "");

		const additions = [
			globalPrompt,
			repoPrompt,
			tpvChecklist,
			anchorBlock,
		].filter((content): content is string =>
			Boolean(content && content.trim().length > 0),
		);

		if (additions.length === 0) return;

		const baseSystemPrompt =
			typeof event.systemPrompt === "string" ? event.systemPrompt : "";

		return {
			systemPrompt: [baseSystemPrompt, ...additions]
				.filter(Boolean)
				.join("\n\n"),
		};
	});
}
