/**
 * Agent-driven desktop notifications.
 *
 * Agents call `notify(...)` DELIBERATELY to get the hooman's attention — a
 * finished reply, a question, "blocked", "smoke-test ready". It does NOT fire
 * automatically on every turn: the old agent_end auto-fire buried real pings in
 * mid-work noise (a single message spawns several agent turns in code-mode), so
 * the hooman got notified on random intermediate completions. Now the agent owns
 * the channel.
 *
 * Transport lives in @pi-extensions/shared/desktop-notify so other extensions
 * (notably git-safety, when a blocking confirm popup opens) can pull the
 * hooman in without going through the agent.
 *
 * Code-mode:  await notify("auth landed — smoke-test when free")
 *             await notify({ title: "Gerard S.", subtitle: "blocked", body: "need a key" })
 * Command:    /notify <message>
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerSandboxFn } from "../../shared/src/sandbox-registry.ts";
import { fireNotification, type NotifyParts } from "../../shared/src/desktop-notify.ts";

export default function (pi: ExtensionAPI) {
	// Code-mode callable. Pass a string (body) or { title, subtitle, body }.
	registerSandboxFn("notify", (arg: unknown) => {
		let parts: NotifyParts;
		if (typeof arg === "string") parts = { body: arg };
		else if (arg && typeof arg === "object") parts = arg as NotifyParts;
		else parts = {};
		if (!parts.body && !parts.subtitle && !parts.title) {
			return "notify(message): ping the hooman's desktop. Pass a string, or { title, subtitle, body }.";
		}
		const transport = fireNotification(parts);
		const shown = parts.body || parts.subtitle || parts.title || "";
		return `🔔 notified the hooman via ${transport}: ${shown}`;
	});

	// Manual: /notify <message>
	pi.registerCommand("notify", {
		description: "Send a desktop notification to the hooman: /notify <message>",
		handler: (args, ctx) => {
			const msg = (args ?? "").trim();
			if (!msg) {
				if (ctx.hasUI) ctx.ui.notify("Usage: /notify <message>", "info");
				return;
			}
			const transport = fireNotification({ body: msg });
			if (ctx.hasUI) ctx.ui.notify(`🔔 notification sent (${transport})`, "info");
		},
	});
}
