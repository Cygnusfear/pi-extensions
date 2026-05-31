/**
 * Desktop notification primitive.
 *
 * Factored out of @pi-extensions/notify so any extension that needs to
 * pull the hooman's eyes to this pane (e.g. a blocking confirm dialog
 * opening in git-safety) can fire a desktop notification without going
 * through the agent.
 *
 * Transport:
 *   - Inside cmux: the bundled `cmux` CLI over cmux's control socket
 *     (`cmux notify --title ... --body ...`). Native banner. Targets
 *     THIS workspace via CMUX_WORKSPACE_ID.
 *   - Outside cmux (iTerm2 / WezTerm / Ghostty / rxvt): OSC 777 escape.
 *
 * Fire-and-forget. Failures NEVER throw. A failed notification must not
 * break a turn or surface a raw error.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getStableNickname } from "./session-nickname.ts";

/** Locate the bundled cmux CLI when running inside cmux; null otherwise. */
export function resolveCmuxCli(): string | null {
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
export function shortName(full: string | null | undefined): string | undefined {
	if (!full) return undefined;
	const parts = full.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return undefined;
	if (parts.length === 1) return parts[0];
	const initial = [...parts[1]][0] ?? "";
	return initial ? `${parts[0]} ${initial}.` : parts[0];
}

export interface NotifyParts {
	title?: string;
	subtitle?: string;
	body?: string;
}

/** Strip control chars + the OSC field separator so the escape can't be broken. */
function sanitize(s: string): string {
	// eslint-disable-next-line no-control-regex
	return s.replace(/[\u0000-\u001f;]/g, " ").trim();
}

/**
 * Fire a desktop notification. Returns the transport used.
 *
 * Title defaults to the short form of the stable session nickname
 * ("Néstor Z."), falling back to "pi". Body or subtitle is required for
 * the notification to be meaningful but the call never throws — it just
 * sends an empty body.
 */
export function fireNotification({ title, subtitle, body }: NotifyParts): "cmux" | "osc777" {
	const resolvedTitle = (title && title.trim()) || shortName(getStableNickname()) || "pi";
	const cli = resolveCmuxCli();
	if (cli) {
		const args = ["notify", "--title", resolvedTitle];
		if (subtitle) args.push("--subtitle", subtitle);
		if (body) args.push("--body", body);
		// Fire-and-forget. Swallow errors — a failed notification must
		// never break a turn or surface a raw error to the host console.
		execFile(cli, args, () => {});
		return "cmux";
	}
	// Fallback: OSC 777 (ESC ] 777 ; notify ; title ; body BEL).
	process.stdout.write(`\u001b]777;notify;${sanitize(resolvedTitle)};${sanitize(body || subtitle || "")}\u0007`);
	return "osc777";
}
