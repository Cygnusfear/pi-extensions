/**
 * team-templates — single source of truth for ~/.pi/agent/team-templates.json.
 *
 * Both the `teams` extension (worker presets) and the `model-router`
 * (role → ordered model preference lists) read this one file. Before this
 * module each had its OWN loader that silently `catch { return {} }` on any
 * error. So when the file went missing — or got a single trailing comma —
 * every `template:` delegation AND the entire DEI "Model roles" block
 * silently evaporated with no signal. You only found out when a review worker
 * failed to spawn with "(none configured)".
 *
 * This module is the structural fix:
 *   - owns the canonical path + the `TeamTemplate` type (no duplication)
 *   - ships a DEFAULT set, so a missing file degrades to WORKING defaults,
 *     never nothing
 *   - distinguishes "file missing" (default + seed) from "file corrupt"
 *     (LOUD warn + in-memory repair) — it NEVER silently returns {}
 *   - seeds the file on disk when absent (`ensureTeamTemplatesFile`), so an
 *     accidental deletion self-recovers to a user-editable file
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { safeJsonParse } from "./safe-json.js";

export interface TeamTemplate {
	worktree?: boolean;
	model?: string | string[];
	prompt?: string;
	/** When true, skip GUARD PROTOCOL — coordinator controls ticket lifecycle. */
	freeform?: boolean;
}

/**
 * Ordered model preferences for the standard Teams roles.
 *
 * Defaults copy these arrays rather than sharing them, while an on-disk
 * team-templates.json remains the intentional user override.
 */
export const STANDARD_TEAM_ROLE_MODELS = {
	review: ["openai-codex/gpt-5.6-terra", "kimi-coding/k3"],
	oracle: ["openai-codex/gpt-5.6-sol"],
	fix: ["openai-codex/gpt-5.6-luna"],
	implementer: ["kimi-coding/k3", "openai-codex/gpt-5.6-terra"],
	investigate: ["kimi-coding/k3", "openai-codex/gpt-5.6-terra"],
	rlm: ["deepseek/deepseek-v4-flash", "openrouter/z-ai/glm-5.3-flash", "anthropic/claude-haiku-4-5"],
	scribe: ["openai-codex/gpt-5.6-luna"],
	roleplay: ["anthropic/claude-sonnet-4-6"],
} as const;

export type StandardTeamRole = keyof typeof STANDARD_TEAM_ROLE_MODELS;

function getHome(): string {
	return process.env.HOME || os.homedir();
}

/** Canonical path to the templates file, resolved at call time from $HOME. */
export function teamTemplatesPath(): string {
	return path.join(getHome(), ".pi", "agent", "team-templates.json");
}

/**
 * Canonical default template set. Deliberately GENERIC — project-specific
 * playbook references (review gates, arrival rituals, ticket flows) belong in
 * the user's own file, not the shipped default. Model IDs reflect the current
 * cross-provider lineup; the router filters out any that lack an API key or
 * are unhealthy, so a stale entry self-heals rather than breaking resolution.
 */
export const DEFAULT_TEAM_TEMPLATES: Record<string, TeamTemplate> = {
	review: {
		worktree: false,
		model: [...STANDARD_TEAM_ROLE_MODELS.review],
		prompt:
			"You are a code reviewer. Review only the directed change surface: the BASE..HEAD diff, every changed file, and immediate affected callers, callees, contracts, tests, and configuration needed to judge those changes. A full six-pass applies every lens to that bounded surface; it never means a repository audit unless the Hooman explicitly requests one. Execute one bounded pass per assignment. A task receives at most two reviewer rounds; after the second, remaining findings are fixed and verified directly. Be ultra-critical. 10/10 only. Confirm the tree/branch and review target with the coordinator before working via team_comment.",
	},
	oracle: {
		worktree: false,
		model: [...STANDARD_TEAM_ROLE_MODELS.oracle],
		prompt:
			"You are a research oracle. Investigate deeply using codebase exploration and web search. Synthesize findings into actionable answers. Confirm the tree/branch with the coordinator before working via team_comment.",
	},
	fix: {
		worktree: false,
		model: [...STANDARD_TEAM_ROLE_MODELS.fix],
		prompt:
			"You are a fixer. Read the review and fix everything, including suggestions. 10/10 only. Do not skip anything. Work in the specified worktree. Confirm the tree/branch with the coordinator before working via team_comment.",
	},
	implementer: {
		worktree: true,
		model: [...STANDARD_TEAM_ROLE_MODELS.implementer],
		prompt:
			"You are an implementer. Follow the plan exactly. Do not skip steps. Do not ask for confirmation. Confirm the tree/branch with the coordinator before working via team_comment.",
	},
	investigate: {
		worktree: true,
		model: [...STANDARD_TEAM_ROLE_MODELS.investigate],
		prompt:
			"Investigate this issue and track your investigation in tickets. Confirm the tree/branch with the coordinator before working via team_comment.",
	},
	rlm: {
		worktree: false,
		model: [...STANDARD_TEAM_ROLE_MODELS.rlm],
		prompt:
			"You are a bounded reconnaissance and discovery worker. Scout the requested surface, collect structured evidence, and return it without implementing changes.",
	},
	scribe: {
		worktree: false,
		model: [...STANDARD_TEAM_ROLE_MODELS.scribe],
		prompt:
			"You are a long-lived scribe. Keep feature intent on disk while the main discussion continues. Maintain CONTEXT, ROADMAP, and ADR docs and update them as the spec evolves. Never let written intent drift from spoken intent.",
		freeform: true,
	},
	roleplay: {
		worktree: false,
		model: [...STANDARD_TEAM_ROLE_MODELS.roleplay],
		prompt: "You are a roleplaying agent, have fun!",
		freeform: true,
	},
};

let cached: Record<string, TeamTemplate> | null = null;
let cachedKey = "";

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Load the template map. Resolution order:
 *   - file missing     → built-in defaults (working, not empty)
 *   - file valid JSON  → parsed file (authoritative; no merge with defaults)
 *   - file unparseable → LOUD warn + in-memory repair; defaults if unrepairable
 * Never returns a silent empty object. Result is cached per (path, mtime).
 */
export function loadTeamTemplates(): Record<string, TeamTemplate> {
	const filePath = teamTemplatesPath();

	let stat: fs.Stats;
	try {
		stat = fs.statSync(filePath);
	} catch {
		// Missing file — degrade to working defaults. ensureTeamTemplatesFile()
		// seeds the real, editable file on session start.
		return DEFAULT_TEAM_TEMPLATES;
	}

	const key = `${filePath}|${stat.mtimeMs}`;
	if (cached && key === cachedKey) return cached;

	const raw = fs.readFileSync(filePath, "utf-8");
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		// Present but unparseable — a trailing comma must NOT silently wipe
		// every template. Warn loudly, then try to recover in memory.
		console.warn(
			`[team-templates] ${filePath} is not valid JSON ` +
				`(${err instanceof Error ? err.message : String(err)}) — FIX THE FILE.`,
		);
		try {
			parsed = safeJsonParse(raw);
			console.warn(
				"[team-templates] recovered the templates in memory; your on-disk file is still broken.",
			);
		} catch {
			console.warn(
				"[team-templates] unrepairable — using built-in defaults until you fix the file.",
			);
			return DEFAULT_TEAM_TEMPLATES;
		}
	}

	if (!isPlainObject(parsed)) {
		console.warn(
			`[team-templates] ${filePath} is not a JSON object — using built-in defaults.`,
		);
		return DEFAULT_TEAM_TEMPLATES;
	}

	cached = parsed as Record<string, TeamTemplate>;
	cachedKey = key;
	return cached;
}

/** Resolve a single named template, or undefined when it does not exist. */
export function resolveTemplate(name: string): TeamTemplate | undefined {
	return loadTeamTemplates()[name];
}

/** List all templates with their names attached. */
export function listTemplates(): Array<{ name: string } & TeamTemplate> {
	return Object.entries(loadTeamTemplates()).map(([name, template]) => ({ name, ...template }));
}

/** Models for a role as an array, or null when the role/model is absent. */
export function loadRoleModels(role: string): string[] | null {
	const template = loadTeamTemplates()[role];
	if (!template || !template.model) return null;
	return Array.isArray(template.model) ? template.model : [template.model];
}

/** Every role → its ordered model list (roles without a model are skipped). */
export function loadAllRoles(): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	for (const [name, template] of Object.entries(loadTeamTemplates())) {
		if (template.model) {
			out[name] = Array.isArray(template.model) ? template.model : [template.model];
		}
	}
	return out;
}

/**
 * Seed the default template set to disk when the file is absent. Idempotent.
 * Call once on session start: a fresh machine — or an accidental deletion —
 * recovers to a working, user-editable file instead of silently nothing.
 */
export function ensureTeamTemplatesFile(): void {
	const filePath = teamTemplatesPath();
	if (fs.existsSync(filePath)) return;
	try {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, `${JSON.stringify(DEFAULT_TEAM_TEMPLATES, null, 2)}\n`);
		console.warn(
			`[team-templates] seeded default templates at ${filePath} (file was missing).`,
		);
	} catch (err) {
		console.warn(
			`[team-templates] could not seed ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

/** Reset the in-memory cache. Test-only. */
export function __resetTeamTemplatesCache(): void {
	cached = null;
	cachedKey = "";
}
