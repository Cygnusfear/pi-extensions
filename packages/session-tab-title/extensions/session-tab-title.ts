/**
 * Session Tab Title extension
 *
 * Updates the terminal tab title to show the session's display name
 * (explicit name or first user message) whenever a session is resumed
 * or a new session starts.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { safeAction } from "@pi-extensions/shared/tool-availability";

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
 * Update the terminal tab title.
 *
 * ctx.ui.setTitle is a runtime action method that throws "extension ctx is
 * stale" if the runtime has been invalidated since this handler was scheduled
 * (e.g. when an agent_end fires during the session-replacement teardown).
 * safeAction swallows exactly that error and re-throws anything else.
 */
function updateTitle(ctx: any): void {
	if (!ctx.hasUI) return;
	const cwdBasename = path.basename(ctx.cwd);
	const displayName = getSessionDisplayName(ctx);
	const title = displayName
		? `π - ${displayName} - ${cwdBasename}`
		: `π - ${cwdBasename}`;
	ctx.ui.setTitle(title);
}

export default function sessionTabTitle(pi: ExtensionAPI) {
	// Every ctx access below (hasUI, cwd, sessionManager, ui.setTitle) is an
	// assertActive-guarded getter or action in pi 0.74. Wrapping the whole
	// updateTitle call in safeAction silently no-ops if the runtime was
	// invalidated since this handler was scheduled.
	pi.on("session_start", (event, ctx) => {
		if (event.reason !== "resume" && event.reason !== "fork") return;
		safeAction(() => updateTitle(ctx));
	});

	pi.on("agent_end", (_event, ctx) => {
		safeAction(() => updateTitle(ctx));
	});
}
