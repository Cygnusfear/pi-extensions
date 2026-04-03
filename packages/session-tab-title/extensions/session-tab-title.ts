/**
 * Session Tab Title extension
 *
 * Updates the terminal tab title to show the session's display name
 * (explicit name or first user message) whenever a session is resumed
 * or a new session starts.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import path from "node:path";

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

function updateTitle(ctx: any): void {
	if (!ctx.hasUI) return;
	const cwdBasename = path.basename(ctx.cwd);
	const displayName = getSessionDisplayName(ctx);
	if (displayName) {
		ctx.ui.setTitle(`π - ${displayName} - ${cwdBasename}`);
	} else {
		ctx.ui.setTitle(`π - ${cwdBasename}`);
	}
}

export default function sessionTabTitle(pi: ExtensionAPI) {
	// Update title after resuming a session
	pi.on("session_start", async (event, ctx) => {
		if (event.reason !== "resume" && event.reason !== "fork") return;
		updateTitle(ctx);
	});

	// Update title after agent finishes (covers first message in new sessions)
	pi.on("agent_end", async (_event, ctx) => {
		updateTitle(ctx);
	});
}
