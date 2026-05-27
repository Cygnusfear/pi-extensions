/**
 * /force-exit — hard-exit slash command. Hot-reloadable companion to the
 * built-in /exit shipping in @earendil-works/pi-coding-agent (#4707 follow-up).
 *
 * Named distinctly from the built-in /exit on purpose — autocomplete used to
 * surface a "command conflicts with built-in interactive command" warning when
 * this extension shadowed the built-in. /force-exit removes the collision and
 * also reads more clearly at the prompt ("force" signals fire-alarm intent).
 *
 * Why this exists as an extension when there's already a built-in /exit:
 *
 * The built-in /exit (added in packages/coding-agent/src/core/slash-commands.ts
 * + interactive-mode.ts:hardExit) is the canonical safety net. It is compiled
 * into core, never disabled, and lives at the lowest possible level so a stuck
 * extension runtime cannot strand it.
 *
 * BUT — built-in slash commands only land for users running a freshly built /
 * installed pi binary. `/reload` does NOT pick them up because /reload only
 * touches extensions/skills/prompts/themes/keybindings, not compiled core code.
 *
 * So users on an older pi binary cannot reach the built-in /exit until they
 * update + restart. That defeats the purpose of a "in case it hangs" safety
 * net: the moment they need it is exactly when they cannot restart.
 *
 * This extension bridges that gap: it registers a /force-exit command at
 * runtime (hot-reloadable) so users on any reasonably recent pi binary get
 * the escape hatch immediately after `/reload`.
 *
 * Hard-exit semantics (mirrors the built-in /exit):
 *   1. Synchronous terminal restore — disable raw mode, kitty protocol,
 *      bracketed paste, modifyOtherKeys, show cursor. All wrapped in try/catch
 *      so a single failed escape sequence doesn't strand the agent.
 *   2. Skip all async cleanup (drainInput, runtimeHost.dispose, agent.abort).
 *      Those are the paths that hang on a stuck stream — see #4707.
 *   3. Notice on stderr explaining the hard exit.
 *   4. process.exit(130) — 128 + SIGINT, semantically "user interrupted".
 *
 * NOT for normal shutdown — use /quit for that. /force-exit is the "fire
 * alarm" path.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Synchronously restore terminal state before exit. Wrapped so a single
 * failing write cannot block the exit path. Sequences match what
 * @earendil-works/pi-tui's Terminal.stop() writes; duplicating them here so
 * we don't depend on any TUI internals that might have moved.
 */
function restoreTerminal(): void {
	// Show cursor
	try {
		process.stdout.write("\x1b[?25h");
	} catch {
		// ignore
	}
	// Disable bracketed paste
	try {
		process.stdout.write("\x1b[?2004l");
	} catch {
		// ignore
	}
	// Disable Kitty keyboard protocol (no-op if not enabled)
	try {
		process.stdout.write("\x1b[<u");
	} catch {
		// ignore
	}
	// Disable xterm modifyOtherKeys (no-op if not enabled)
	try {
		process.stdout.write("\x1b[>4;0m");
	} catch {
		// ignore
	}
	// Restore stdin from raw mode to cooked mode — this is the one that
	// matters most. Without it the user's terminal stays unusable after exit.
	try {
		if (typeof process.stdin.setRawMode === "function") {
			process.stdin.setRawMode(false);
		}
	} catch {
		// ignore
	}
	try {
		process.stdin.pause();
	} catch {
		// ignore
	}
}

export default function exitCommandExtension(pi: ExtensionAPI) {
	pi.registerCommand("force-exit", {
		description: "Force-exit immediately, skipping cleanup. Use when the agent is stuck and /quit hangs.",
		handler: async () => {
			restoreTerminal();
			try {
				process.stderr.write("\nHard exit via /force-exit — skipping graceful cleanup.\n");
			} catch {
				// ignore EPIPE — we're exiting either way
			}
			process.exit(130);
		},
	});
}
