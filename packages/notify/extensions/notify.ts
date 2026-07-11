/**
 * Agent-driven desktop notifications (+ Telegram relay).
 *
 * Agents call `notify(...)` DELIBERATELY to get the hooman's attention — a
 * finished reply, a question, "blocked", "smoke-test ready". It does NOT fire
 * automatically on every turn: the old agent_end auto-fire buried real pings in
 * mid-work noise (a single message spawns several agent turns in code-mode), so
 * the hooman got notified on random intermediate completions. Now the agent owns
 * the channel.
 *
 * Transport:
 *   - Desktop: fireNotification() in @pi-extensions/shared/desktop-notify
 *     (cmux banner inside cmux, OSC 777 otherwise).
 *   - Telegram: relayNotifyToHooman() in ./tg-relay.ts — reuses THIS agent's
 *     live mesh connection (globalThis.__piMesh) to send a tell to the Hooman's
 *     durable mesh id; the mesh↔Telegram bridge forwards it into the Hooman's
 *     Ramdock topic for this agent. Fire-and-forget, never throws, silently
 *     no-ops when the mesh or the bridge config is unavailable.
 *
 * Code-mode:  await notify("auth landed — smoke-test when free")
 *             await notify({ title: "Gerard S.", subtitle: "blocked", body: "need a key" })
 * Command:    /notify <message>
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerSandboxFn } from "../../shared/src/sandbox-registry.ts";
import { fireNotification, type NotifyParts } from "../../shared/src/desktop-notify.ts";
import { relayNotifyToHooman } from "./tg-relay.ts";

export default function (pi: ExtensionAPI) {
	// Code-mode callable. Pass a string (body) or { title, subtitle, body }.
	registerSandboxFn("notify", (arg: unknown) => {
		let parts: NotifyParts;
		if (typeof arg === "string") parts = { body: arg };
		else if (arg && typeof arg === "object") parts = arg as NotifyParts;
		else parts = {};
		if (!parts.body && !parts.subtitle && !parts.title) {
			return "notify(message): ping the hooman's desktop + Telegram. Pass a string, or { title, subtitle, body }.";
		}
		const transport = fireNotification(parts);
		const relayed = relayNotifyToHooman(parts);
		const shown = parts.body || parts.subtitle || parts.title || "";
		const via = relayed ? `${transport} + telegram` : transport;
		return `🔔 notified the hooman via ${via}: ${shown}`;
	});

	// Manual: /notify <message>
	pi.registerCommand("notify", {
		description: "Send a desktop + Telegram notification to the hooman: /notify <message>",
		handler: (args, ctx) => {
			const msg = (args ?? "").trim();
			if (!msg) {
				if (ctx.hasUI) ctx.ui.notify("Usage: /notify <message>", "info");
				return;
			}
			const transport = fireNotification({ body: msg });
			const relayed = relayNotifyToHooman({ body: msg });
			const via = relayed ? `${transport} + telegram` : transport;
			if (ctx.hasUI) ctx.ui.notify(`🔔 notification sent (${via})`, "info");
		},
	});
}
