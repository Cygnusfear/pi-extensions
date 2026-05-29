/**
 * Session Tab Title extension
 *
 * Sets the terminal workspace title to `<stage-icon> <session-name>` so
 * terminal multiplexers (cmux, tmux, iTerm tabs, etc.) show at a glance
 * BOTH which session a pane is AND what lifecycle stage the agent is in.
 *
 * The hooman sets the session topic via `/name TOPIC` (their mnemonic). The
 * agent's MESH IDENTITY ("Gerard Stargate Freedman" → "Gerard S.") is derived
 * automatically and shown alongside the topic, so the hooman no longer types
 * the agent name. The AGENT self-drives the stage icon by calling the code-mode
 * `status(stage)` function as their work moves through phases.
 *
 * Stage → icon (the canonical map; cmux colors the tab from the emoji):
 *   planning      🧶  actively planning WITH the hooman  (no color)
 *   implementing  🏭  implementing                       (amber)
 *   blocked       🚦  blocked, resolve soon              (red)
 *   blocked-long  ⛔  blocked, long                      (charcoal)
 *   review        🕵️  running review (6-pass etc)        (teal)
 *   landing       🛬  landing (a 20.01 process started)  (teal)
 *   bugfix        🪲  fixing an already-landed bug        (green)
 *   cleaning      🧼  assigned cleaner role              (green)
 *   coordinator   👩‍🚀  coordinator                        (purple)
 *   bhakti        📡  bhakti deploy manager              (purple)
 *   smoketest     🚬  hooman should smoke-test           (yellow)
 *   parked        🚏  doing nothing, awaiting direction  (grey)
 *   attention     🚨  needs hooman attention (urgent)    (red)
 *
 * 🧶 planning means ACTIVELY scoping/planning with the hooman — it is NOT an
 * idle state. When an agent finishes (e.g. after landing) it must go to 🚏
 * parked (doing nothing, awaiting direction), not snap back to 🧶.
 *
 * The stage persists across reloads/resume via a custom session entry, so
 * an agent who set "implementing" doesn't snap back to "planning" on /reload.
 *
 * Title format is `<icon> <agent-name> <ses-title> - <folder>` (NO "π -"
 * prefix), e.g. `"🏭 Gerard S. NPC - my-repo"`. agent-name is the mesh
 * identity ("Gerard Stargate Freedman" → "Gerard S."), derived automatically.
 * ses-title is the hooman's `/name` topic OR an agent-set codename
 * (`sessionTitle("WARPSTOP")`, max 12 chars) — the hooman's /name wins when
 * both exist. Both subject parts are optional; with neither, falls back to
 * `<icon> <folder>`.
 *
 * pi core owns WHEN the title refreshes (session rename, reload, switch) and
 * would otherwise clobber us with its default `π - <name> - <cwd>` format.
 * We register a title FORMATTER via ctx.ui.setTitleFormatter so core asks us
 * for the string on every refresh — race-free, no clobber. When the running
 * pi lacks that API (older build), we fall back to re-rendering on the /name
 * input event. status() pushes an immediate setTitle for instant icon flips.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { safeAction } from "@pi-extensions/shared/tool-availability";
import { getStableNickname, onStableIdChange } from "@pi-extensions/shared/session-nickname";
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
	smoketest: { icon: "🚬", label: "hooman should smoke-test", color: "yellow" },
	parked: { icon: "🚏", label: "parked — doing nothing, awaiting direction", color: "grey" },
	attention: { icon: "🚨", label: "needs hooman attention (urgent)", color: "red" },
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
	smoke: "smoketest",
	"smoke-test": "smoketest",
	test: "smoketest",
	idle: "parked",
	waiting: "parked",
	park: "parked",
	done: "parked",
	urgent: "attention",
	attn: "attention",
	alarm: "attention",
	help: "attention",
};

const DEFAULT_STAGE = "planning";
const STAGE_ENTRY_TYPE = "session-status-stage";
const TITLE_ENTRY_TYPE = "session-status-title";
/** Max length of an agent-set session title (codename) — keeps narrow cmux tabs readable. */
const MAX_TITLE_LEN = 12;

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

function getSessionDisplayName(
	ctx: {
		sessionManager: { getSessionName(): string | undefined; getEntries(): any[] };
	},
	agentTitle?: string,
): string | undefined {
	// Precedence: hooman /name (authoritative) > agent-set codename > first message.
	const name = ctx.sessionManager.getSessionName();
	if (name) return name;
	if (agentTitle && agentTitle.length > 0) return agentTitle;

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
 * Shorten a stable mesh nickname to "<first> <Initial>." for the tab.
 *   "Gerard Stargate Freedman" → "Gerard S."
 *   "Gerard"                   → "Gerard"   (single word, no initial)
 *   "" / null / undefined      → undefined  (omitted from the title)
 * Exported for testability.
 */
export function shortStableName(full: string | null | undefined): string | undefined {
	if (!full) return undefined;
	const parts = full.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return undefined;
	if (parts.length === 1) return parts[0];
	// Spread to take the first *grapheme* of the second word (unicode-safe).
	const initial = [...parts[1]][0] ?? "";
	return initial ? `${parts[0]} ${initial}.` : parts[0];
}

/**
 * Build the title string: `<icon> <agent-name> <ses-title> - <folder>`,
 * e.g. `"🏭 Gerard S. NPC - my-repo"`. The agent-name is the mesh identity
 * ("Gerard S."); the ses-title is the hooman's `/name` topic OR an agent-set
 * codename ("WARPSTOP"). Either subject part may be absent: with neither, falls
 * back to `<icon> <folder>` so the title is never a bare icon nor a redundant
 * `<icon> <folder> - <folder>`. Exported for testability.
 */
export function buildTitle(
	stageKey: string,
	displayName: string | undefined,
	stableShort: string | undefined,
	cwdBasename: string,
): string {
	const stage = STAGES[stageKey] ?? STAGES[DEFAULT_STAGE];
	// Order: agent identity first, then the session title/topic.
	const subject = [stableShort, displayName]
		.map((s) => s?.trim())
		.filter((s): s is string => !!s && s.length > 0)
		.join(" ");
	if (subject) return `${stage.icon} ${subject} - ${cwdBasename}`;
	return `${stage.icon} ${cwdBasename}`;
}

/**
 * Normalize an agent-supplied session title (codename): trim, collapse inner
 * whitespace, and clip to MAX_TITLE_LEN. Returns the normalized title plus
 * whether it was clipped (so the caller can note it). Empty input → undefined.
 * Exported for testability.
 */
export function normalizeSessionTitle(raw: string | null | undefined): { title?: string; clipped: boolean } {
	const collapsed = (raw ?? "").trim().replace(/\s+/g, " ");
	if (!collapsed) return { title: undefined, clipped: false };
	if (collapsed.length <= MAX_TITLE_LEN) return { title: collapsed, clipped: false };
	return { title: collapsed.slice(0, MAX_TITLE_LEN).trimEnd(), clipped: true };
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

/** Restore the latest agent-set session title from custom session entries. */
function readPersistedTitle(ctx: {
	sessionManager: { getEntries(): Array<{ type: string; customType?: string; data?: unknown }> };
}): string | undefined {
	let latest: string | undefined;
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === TITLE_ENTRY_TYPE && entry.data) {
			const data = entry.data as { title?: unknown };
			if (typeof data.title === "string") latest = data.title || undefined;
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
	// Agent-set session codename (e.g. "WARPSTOP"). Fills the ses-title slot only
	// when the hooman has not /name'd the session (hooman /name wins).
	let currentTitle: string | undefined;
	// True once core accepted our title formatter (new pi). When true, the
	// /name input-event fallback below stays inert to avoid a double render.
	let formatterRegistered = false;
	// True once we've subscribed to mesh stable-id changes (subscribe once even
	// across reloads — the listener re-renders against the live currentCtx).
	let stableIdSubscribed = false;

	// Register a formatter so pi core owns the timing of title refreshes but we
	// own the format. Core passes the live session name + cwd basename; we add
	// the stage icon and lay it out. Captured `currentCtx`/`currentStage` are
	// read at call time, so status() changes and renames both reflect correctly.
	const registerFormatter = () => {
		if (!currentCtx?.hasUI) return;
		const ui = currentCtx.ui;
		if (typeof ui.setTitleFormatter !== "function") return;
		safeAction(() =>
			ui.setTitleFormatter((info: { sessionName?: string; cwdBasename: string }) => {
				const displayName =
					info.sessionName && info.sessionName.length > 0
						? info.sessionName
						: getSessionDisplayName(currentCtx, currentTitle);
				const stableShort = shortStableName(getStableNickname());
				return buildTitle(currentStage, displayName, stableShort, info.cwdBasename);
			}),
		);
		formatterRegistered = true;
	};

	const render = () => {
		if (!currentCtx?.hasUI) return;
		safeAction(() => {
			const cwdBasename = path.basename(currentCtx.cwd);
			const displayName = getSessionDisplayName(currentCtx, currentTitle);
			const stableShort = shortStableName(getStableNickname());
			currentCtx.ui.setTitle(buildTitle(currentStage, displayName, stableShort, cwdBasename));
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

	/**
	 * Set (or clear) the agent's session codename — the ses-title slot. Clips to
	 * MAX_TITLE_LEN, persists (survives reload), re-renders. The hooman's /name
	 * still wins over this when set. Pass an empty string to clear it.
	 */
	const setSessionTitle = (rawTitle: string): string => {
		const { title, clipped } = normalizeSessionTitle(rawTitle);
		currentTitle = title;
		safeAction(() => currentCtx?.sessionManager?.appendCustomEntry?.(TITLE_ENTRY_TYPE, { title: title ?? "" }));
		render();
		if (!title) return "Session title cleared.";
		const note = clipped ? ` (clipped to ${MAX_TITLE_LEN} chars)` : "";
		const overridden =
			currentCtx?.sessionManager?.getSessionName?.() ? " — note: the hooman's /name is set, so it shows instead until cleared" : "";
		return `Session title → "${title}"${note}${overridden}`;
	};

	// Code-mode callable: during planning, give your session a short codename so
	// the pane is identifiable before the hooman /names it.
	//   await sessionTitle("WARPSTOP")
	// Accepts a bare string or { title }. Max 12 chars (clipped).
	registerSandboxFn("sessionTitle", (arg: unknown) => {
		const raw = typeof arg === "string" ? arg : (arg as { title?: string })?.title ?? "";
		return setSessionTitle(raw);
	});

	pi.on("session_start", (_event, ctx) => {
		currentCtx = ctx;
		currentStage = safeAction(() => readPersistedStage(ctx)) ?? DEFAULT_STAGE;
		currentTitle = safeAction(() => readPersistedTitle(ctx)) ?? undefined;
		// Core owns refresh timing via the formatter; registering it also applies
		// the title immediately, so render() is only the fallback for pi builds
		// without the setTitleFormatter API.
		registerFormatter();
		if (!formatterRegistered) render();
		// The mesh stable nickname ("Gerard S.") may not be set yet at
		// session_start — the mesh sidecar resolves it asynchronously. Subscribe
		// so the title refreshes the moment it lands. Subscribe once; the closure
		// re-renders against whatever currentCtx is live at fire time.
		if (!stableIdSubscribed) {
			stableIdSubscribed = true;
			safeAction(() => onStableIdChange(() => render()));
		}
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
		// When the formatter is registered, pi core re-renders the title on the
		// rename itself — this fallback would only cause a redundant render.
		if (formatterRegistered) return;
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

	// Manual override for the hooman/agent: /title WARPSTOP  (or /title to clear)
	pi.registerCommand("title", {
		description: `Set your session codename (ses-title slot, max ${MAX_TITLE_LEN} chars): /title <CODENAME>`,
		handler: (args, ctx) => {
			currentCtx = ctx;
			const result = setSessionTitle((args ?? "").trim());
			if (ctx.hasUI) ctx.ui.notify(result, "info");
		},
	});
}
