/**
 * Session Tab Title extension
 *
 * Sets the terminal workspace title to `<stage-icon> <session-name>` so
 * terminal multiplexers (cmux, tmux, iTerm tabs, etc.) show at a glance
 * BOTH which session a pane is AND what lifecycle stage the agent is in.
 *
 * The hooman sets the session name manually via `/name <agent> TOPIC`
 * (their mnemonic). The AGENT self-drives the stage icon by calling the
 * code-mode `status(stage)` function as their work moves through phases.
 *
 * Stage → icon (the canonical map; cmux colors the tab from the emoji):
 *   planning      🧶  planning / default               (no color)
 *   implementing  🏭  implementing                      (amber)
 *   blocked       🚦  blocked, resolve soon             (red)
 *   blocked-long  ⛔  blocked, long                     (charcoal)
 *   review        🕵️  running review (6-pass etc)       (teal)
 *   landing       🛬  landing (a 20.01 process started) (teal)
 *   bugfix        🪲  fixing an already-landed bug       (green)
 *   cleaning      🧼  assigned cleaner role             (green)
 *   coordinator   👩‍🚀  coordinator                       (purple)
 *   bhakti        📡  bhakti deploy manager             (purple)
 *
 * The stage persists across reloads/resume via a custom session entry, so
 * an agent who set "implementing" doesn't snap back to "planning" on /reload.
 *
 * Title format is `<icon> <session-name>` (NO "π -" prefix, NO cwd) per the
 * hooman's spec. Falls back to the cwd basename only when no name is set.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { safeAction } from "@pi-extensions/shared/tool-availability";
import { registerSandboxFn } from "../../shared/src/sandbox-registry.ts";

// ── Stage table ───────────────────────────────────────────────────────────

export interface StageDef {
	icon: string;
	/** Human label for the slash-command listing + errors. */
	label: string;
	/** Canonical color name — cmux colors the tab from the emoji; this is the
	 *  single source of truth for whatever consumes the mapping. */
	color: string;
}

export const STAGES: Record<string, StageDef> = {
	planning: { icon: "🧶", label: "planning (default)", color: "none" },
	implementing: { icon: "🏭", label: "implementing", color: "amber" },
	blocked: { icon: "🚦", label: "blocked (resolve soon)", color: "red" },
	"blocked-long": { icon: "⛔", label: "blocked (long)", color: "charcoal" },
	review: { icon: "🕵️", label: "running review", color: "teal" },
	landing: { icon: "🛬", label: "landing (20.01 process)", color: "teal" },
	bugfix: { icon: "🪲", label: "fixing a landed bug", color: "green" },
	cleaning: { icon: "🧼", label: "cleaner role", color: "green" },
	coordinator: { icon: "👩‍🚀", label: "coordinator", color: "purple" },
	bhakti: { icon: "📡", label: "bhakti deploy manager", color: "purple" },
};

/** Ergonomic aliases so the agent's call reads naturally. */
const STAGE_ALIASES: Record<string, string> = {
	plan: "planning",
	implement: "implementing",
	impl: "implementing",
	"blocked-soon": "blocked",
	"blocked-short": "blocked",
	blockedlong: "blocked-long",
	reviewing: "review",
	land: "landing",
	fix: "bugfix",
	bug: "bugfix",
	clean: "cleaning",
	cleanup: "cleaning",
	coord: "coordinator",
	deploy: "bhakti",
};

const DEFAULT_STAGE = "planning";
const STAGE_ENTRY_TYPE = "session-status-stage";

/** Resolve a user-supplied stage key (with alias support) to a canonical key, or null. */
export function resolveStageKey(input: string): string | null {
	const k = input.trim().toLowerCase();
	if (STAGES[k]) return k;
	if (STAGE_ALIASES[k]) return STAGE_ALIASES[k];
	return null;
}

/** All valid stage keys + aliases, for error messages. */
export function listStageKeys(): string[] {
	return Object.keys(STAGES);
}

// ── Title building ──────────────────────────────────────────────────────────

function getSessionDisplayName(ctx: {
	sessionManager: { getSessionName(): string | undefined; getEntries(): any[] };
}): string | undefined {
	const name = ctx.sessionManager.getSessionName();
	if (name) return name;

	// Fall back to first user message (truncated) when no explicit /name.
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (!msg || msg.role !== "user") continue;
		let text = "";
		if (typeof msg.content === "string") text = msg.content;
		else if (Array.isArray(msg.content)) {
			text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ");
		}
		text = text.trim();
		if (text) return text.length > 60 ? `${text.slice(0, 57)}...` : text;
	}
	return undefined;
}

/**
 * Build the title string: `<icon> <session-name>`. Falls back to the cwd
 * basename only when there is no name at all (so the title is never a bare
 * icon). Exported for testability.
 */
export function buildTitle(stageKey: string, displayName: string | undefined, cwdBasename: string): string {
	const stage = STAGES[stageKey] ?? STAGES[DEFAULT_STAGE];
	const label = displayName && displayName.length > 0 ? displayName : cwdBasename;
	return `${stage.icon} ${label}`;
}

// ── Stage persistence ─────────────────────────────────────────────────────────

function readPersistedStage(ctx: {
	sessionManager: { getEntries(): Array<{ type: string; customType?: string; data?: unknown }> };
}): string {
	let latest = DEFAULT_STAGE;
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === STAGE_ENTRY_TYPE && entry.data) {
			const data = entry.data as { stage?: unknown };
			if (typeof data.stage === "string" && STAGES[data.stage]) latest = data.stage;
		}
	}
	return latest;
}

// ── Extension ───────────────────────────────────────────────────────────────

export default function sessionTabTitle(pi: ExtensionAPI) {
	// Captured each session_start so the sandbox fn + slash command can render
	// the title against the live context.
	let currentCtx: any = null;
	let currentStage = DEFAULT_STAGE;

	const render = () => {
		if (!currentCtx?.hasUI) return;
		safeAction(() => {
			const cwdBasename = path.basename(currentCtx.cwd);
			const displayName = getSessionDisplayName(currentCtx);
			currentCtx.ui.setTitle(buildTitle(currentStage, displayName, cwdBasename));
		});
	};

	/**
	 * Set the lifecycle stage. Persists the choice (survives reload), renders
	 * the title. Returns a short confirmation or an error listing valid stages.
	 */
	const setStage = (rawStage: string): string => {
		const key = resolveStageKey(rawStage);
		if (!key) {
			return `Unknown stage "${rawStage}". Valid: ${listStageKeys().join(", ")}.`;
		}
		currentStage = key;
		// Persist so reload/resume restores the stage instead of snapping to planning.
		safeAction(() => currentCtx?.sessionManager?.appendCustomEntry?.(STAGE_ENTRY_TYPE, { stage: key }));
		render();
		const def = STAGES[key];
		return `${def.icon} ${key} — ${def.label}`;
	};

	// Code-mode callable: the agent self-drives status as work moves through phases.
	//   await status("implementing")
	//   await status("review")
	// Accepts a bare string or { stage }.
	registerSandboxFn("status", (arg: unknown) => {
		const raw = typeof arg === "string" ? arg : (arg as { stage?: string })?.stage ?? "";
		if (!raw) {
			return `status(stage): set your workspace stage icon. Valid: ${listStageKeys().join(", ")}.`;
		}
		return setStage(raw);
	});

	pi.on("session_start", (_event, ctx) => {
		currentCtx = ctx;
		currentStage = safeAction(() => readPersistedStage(ctx)) ?? DEFAULT_STAGE;
		render();
	});

	// Keep the title fresh on agent_end (covers the first message in a new
	// session, where the name/first-message becomes available after the turn).
	pi.on("agent_end", (_event, ctx) => {
		currentCtx = ctx;
		render();
	});

	// Re-render when the hooman renames the session via /name. The built-in
	// /name command routes through the input event but there is NO dedicated
	// name-change event, so we detect it here. The name is set by pi AFTER
	// this handler returns, so defer the re-render one tick to read the new
	// value via getSessionName(). Pass-through (no action) so /name still runs
	// normally.
	pi.on("input", (event: { text?: string; source?: string }, ctx) => {
		const text = (event?.text ?? "").trim();
		if (event?.source === "extension") return;
		if (/^\/name(\s|$)/.test(text)) {
			currentCtx = ctx;
			// Defer so pi has applied the new session name before we render.
			setTimeout(() => render(), 0);
		}
		// No return → default continue; /name processes as usual.
	});

	// Manual override for the hooman: /status implementing
	pi.registerCommand("status", {
		description: `Set the workspace stage icon: /status <${listStageKeys().join("|")}>`,
		handler: (args, ctx) => {
			currentCtx = ctx;
			const raw = (args ?? "").trim();
			if (!raw || raw === "help") {
				const lines = ["Stages (cmux colors the tab from the emoji):"];
				for (const [key, def] of Object.entries(STAGES)) {
					lines.push(`  ${def.icon}  /status ${key} — ${def.label} (${def.color})`);
				}
				if (ctx.hasUI) ctx.ui.notify(lines.join("\n"), "info");
				return;
			}
			const result = setStage(raw);
			if (ctx.hasUI) ctx.ui.notify(result, result.startsWith("Unknown") ? "warning" : "info");
		},
	});
}
