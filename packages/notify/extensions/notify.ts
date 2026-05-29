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
 * Transport:
 *   - Inside cmux: the bundled `cmux` CLI over cmux's control socket
 *     (`cmux notify --title … --body …`). Targets THIS workspace (via
 *     CMUX_WORKSPACE_ID) and shows a native banner. Supports title/subtitle/body.
 *   - Outside cmux (iTerm2 / WezTerm / rxvt / Ghostty): falls back to the OSC 777
 *     escape sequence. No native dependencies either way.
 *
 * Code-mode:  await notify("auth landed — smoke-test when free")
 *             await notify({ title: "Gerard S.", subtitle: "blocked", body: "need a key" })
 * Command:    /notify <message>
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { registerSandboxFn } from "../../shared/src/sandbox-registry.ts";
import { getStableNickname } from "../../shared/src/session-nickname.ts";

/** Locate the bundled cmux CLI when running inside cmux; null otherwise. */
function resolveCmuxCli(): string | null {
	if (!process.env.CMUX_SOCKET_PATH) return null; // not inside cmux
	const candidates: string[] = [];
	const sid = process.env.CMUX_SHELL_INTEGRATION_DIR;
	// <bundle>/Contents/Resources/shell-integration → <...>/Resources/bin/cmux
	if (sid) candidates.push(path.join(path.dirname(sid), "bin", "cmux"));
	candidates.push("/Applications/cmux.app/Contents/Resources/bin/cmux");
	for (const c of candidates) {
		try {
			if (fs.existsSync(c)) return c;
		} catch {}
	}
	return null;
}

/** "Gerard Stargate Freedman" → "Gerard S."; single word → as-is; empty → undefined. */
function shortName(full: string | null | undefined): string | undefined {
	if (!full) return undefined;
	const parts = full.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return undefined;
	if (parts.length === 1) return parts[0];
	const initial = [...parts[1]][0] ?? "";
	return initial ? `${parts[0]} ${initial}.` : parts[0];
}

interface NotifyParts {
	title?: string;
	subtitle?: string;
	body?: string;
}

/** Strip control chars + the OSC field separator so the escape can't be broken. */
function sanitize(s: string): string {
	// eslint-disable-next-line no-control-regex
	return s.replace(/[\u0000-\u001f;]/g, " ").trim();
}

/** Fire a desktop notification. Returns the transport used. */
function fireNotification({ title, subtitle, body }: NotifyParts): "cmux" | "osc777" {
	const resolvedTitle = (title && title.trim()) || shortName(getStableNickname()) || "pi";
	const cli = resolveCmuxCli();
	if (cli) {
		const args = ["notify", "--title", resolvedTitle];
		if (subtitle) args.push("--subtitle", subtitle);
		if (body) args.push("--body", body);
		// Fire-and-forget. A failed notification must never break a turn or
		// surface a raw error to the host console — swallow it.
		execFile(cli, args, () => {});
		return "cmux";
	}
	// Fallback transport: OSC 777 (ESC ] 777 ; notify ; title ; body BEL).
	process.stdout.write(`\u001b]777;notify;${sanitize(resolvedTitle)};${sanitize(body || subtitle || "")}\u0007`);
	return "osc777";
}

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
