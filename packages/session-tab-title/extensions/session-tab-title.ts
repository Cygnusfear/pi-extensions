/**
 * Session Tab Title extension
 *
 * Updates the terminal tab title to show the session's display name
 * (explicit name or first user message) plus a busy/idle icon so
 * terminal multiplexers (cmux, tmux, iTerm, etc.) can show at a
 * glance which pi panes are working vs ready for input.
 *
 * Icon contract:
 *   🏭 — agent is busy (between agent_start and agent_end)
 *   🛬 — agent is idle / just landed / ready for input
 *
 * The icon is the FIRST character of the title so it's the first
 * thing visible in narrow tab lists where the title gets truncated.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { safeAction } from "@pi-extensions/shared/tool-availability";

const ICON_BUSY = "🏭";
const ICON_IDLE = "🛬";

function getSessionDisplayName(ctx: { sessionManager: { getSessionName(): string | undefined; getEntries(): any[] } }): string | undefined {
	// Prefer explicit name set via /name
	const name = ctx.sessionManager.getSessionName();
	if (name) return name;

	// Fall back to first user message
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (!msg || msg.role !== "user") continue;

		let text = "";
		if (typeof msg.content === "string") {
			text = msg.content;
		} else if (Array.isArray(msg.content)) {
			text = msg.content
				.filter((b: any) => b.type === "text")
				.map((b: any) => b.text)
				.join(" ");
		}

		text = text.trim();
		if (text) return text.length > 60 ? `${text.slice(0, 57)}...` : text;
	}

	return undefined;
}

/**
 * Build the title string with a state icon prefix.
 * Exported for testability.
 */
export function buildTitle(state: "busy" | "idle", displayName: string | undefined, cwdBasename: string): string {
	const icon = state === "busy" ? ICON_BUSY : ICON_IDLE;
	const namePart = displayName ? ` - ${displayName}` : "";
	return `${icon} π${namePart} - ${cwdBasename}`;
}

/**
 * Update the terminal tab title.
 *
 * ctx.ui.setTitle is a runtime action method that throws "extension ctx is
 * stale" if the runtime has been invalidated since this handler was scheduled
 * (e.g. when an agent_end fires during the session-replacement teardown).
 * safeAction swallows exactly that error and re-throws anything else.
 */
function updateTitle(ctx: any, state: "busy" | "idle"): void {
	if (!ctx.hasUI) return;
	const cwdBasename = path.basename(ctx.cwd);
	const displayName = getSessionDisplayName(ctx);
	ctx.ui.setTitle(buildTitle(state, displayName, cwdBasename));
}

export default function sessionTabTitle(pi: ExtensionAPI) {
	// Every ctx access below (hasUI, cwd, sessionManager, ui.setTitle) is an
	// assertActive-guarded getter or action in pi 0.74. Wrapping the whole
	// updateTitle call in safeAction silently no-ops if the runtime was
	// invalidated since this handler was scheduled.

	pi.on("session_start", (event, ctx) => {
		if (event.reason !== "resume" && event.reason !== "fork") return;
		safeAction(() => updateTitle(ctx, "idle"));
	});

	// Agent starts a turn → 🏭 (factory, working)
	pi.on("agent_start", (_event, ctx) => {
		safeAction(() => updateTitle(ctx, "busy"));
	});

	// Agent ends a turn → 🛬 (just landed, ready for input)
	pi.on("agent_end", (_event, ctx) => {
		safeAction(() => updateTitle(ctx, "idle"));
	});
}
