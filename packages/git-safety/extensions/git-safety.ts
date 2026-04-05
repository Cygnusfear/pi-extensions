/**
 * Git Safety Extension
 *
 * Protects against destructive git commands and .git directory writes.
 * Three modes controlled via /git-lock:
 *   - block:   hard-block everything (default for workers)
 *   - confirm: show confirm dialog (default for interactive)
 *   - off:     no protection
 *
 * Regular git operations (add, commit, diff, push, branch, etc.) are NEVER blocked.
 *
 * Also:
 * - Blocks sed (broken on macOS)
 * - Injects GIT_EDITOR=true for `git rebase --continue` to prevent hanging
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isGitUnsafeBash, isGitPath, isProcessKillBroadcast } from "@pi-extensions/shared/git-guards";

const REBASE_CONTINUE_RE = /\bgit\s+rebase\s+--continue\b/;
const HAS_GIT_EDITOR_RE = /\bGIT_EDITOR\s*=/;

const SED_RE = /\bsed\s+(-[a-zA-Z]\s+)*['"-]/;

type GitLockMode = "block" | "confirm" | "off";

export default function (pi: ExtensionAPI) {
	let mode: GitLockMode = process.env.PI_TEAMS_WORKER === "1" ? "block" : "confirm";
	// Publish mode via env so code-mode (separate extension) can read it
	process.env.PI_GIT_LOCK_MODE = mode;

	// ── /git-lock command ──
	pi.registerCommand("git-lock", {
		description: "Toggle git safety: /git-lock block | confirm | off",
		handler: async (_args, ctx) => {
			const arg = _args.trim().toLowerCase();

			if (arg === "block" || arg === "confirm" || arg === "off") {
				mode = arg;
				process.env.PI_GIT_LOCK_MODE = mode;
				ctx.ui.notify(`Git safety: ${mode}`, "info");
			} else if (arg === "") {
				// Toggle: confirm → off → block → confirm
				const next: Record<GitLockMode, GitLockMode> = { confirm: "off", off: "block", block: "confirm" };
				mode = next[mode];
				process.env.PI_GIT_LOCK_MODE = mode;
				ctx.ui.notify(`Git safety: ${mode}`, "info");
			} else {
				ctx.ui.notify("Usage: /git-lock [block|confirm|off]", "warning");
			}
		},
	});

	pi.on("tool_call", async (event, ctx) => {
		// ── bash: inject GIT_EDITOR for rebase --continue (always, regardless of mode) ──
		if (event.toolName === "bash" || event.toolName === "bash_bg_start") {
			const cmd: string = (event.input as any)?.command ?? "";
			if (REBASE_CONTINUE_RE.test(cmd) && !HAS_GIT_EDITOR_RE.test(cmd)) {
				(event.input as any).command = cmd.replace(
					REBASE_CONTINUE_RE,
					"GIT_EDITOR=true git rebase --continue",
				);
			}
		}

		// ── block sed (always, regardless of mode) ──
		if (event.toolName === "bash" || event.toolName === "bash_bg_start") {
			const cmd: string = (event.input as any)?.command ?? "";
			if (SED_RE.test(cmd)) {
				return {
					block: true,
					reason: "🚫 sed is blocked — it behaves differently on macOS and Linux. Use edit, apply_patch, ast-grep (TypeScript), or rs-hack (Rust) instead.",
				};
			}
		}

		// ── block process-kill broadcast (always, regardless of mode) ──
		// No setting can disable this. Broadcasting SIGKILL to the user's session
		// has no legitimate agent workflow — only bugs produce these commands.
		if (event.toolName === "bash" || event.toolName === "bash_bg_start") {
			const cmd: string = (event.input as any)?.command ?? "";
			const killHit = isProcessKillBroadcast(cmd);
			if (killHit) {
				return {
					block: true,
					reason: `🛡️ HARD-BLOCKED (process kill guard): ${killHit.reason}. This guard cannot be disabled.`,
				};
			}
		}

		// ── mode=off: skip all git guards ──
		if (mode === "off") return undefined;

		// ── detect dangerous operations ──
		let result: { type: "destructive" | "git_write"; reason: string } | null = null;

		if (event.toolName === "bash" || event.toolName === "bash_bg_start") {
			result = isGitUnsafeBash((event.input as any)?.command ?? "");
		}

		if (event.toolName === "write" || event.toolName === "edit") {
			const p: string = (event.input as any)?.path ?? "";
			if (isGitPath(p)) {
				result = { type: "git_write", reason: `${event.toolName} to .git path: ${p}` };
			}
		}

		if (event.toolName === "apply_patch") {
			const patch: string = (event.input as any)?.patchText ?? "";
			const fileHeaders = patch.match(/\*\*\*\s+(?:Add|Delete|Update)\s+File:\s*(.+)/g);
			if (fileHeaders) {
				for (const h of fileHeaders) {
					const p = h.replace(/\*\*\*\s+(?:Add|Delete|Update)\s+File:\s*/, "").trim();
					if (isGitPath(p)) {
						result = { type: "git_write", reason: `patch targets .git path: ${p}` };
						break;
					}
				}
			}
		}

		if (!result) return undefined;

		// ── mode=confirm: show dialog (interactive only) ──
		if (mode === "confirm" && ctx.hasUI) {
			const title = result.type === "destructive"
				? "⚠️ Destructive git operation"
				: "⚠️ .git write detected";
			const body = result.type === "destructive"
				? `${result.reason}\n\nAllow?`
				: `${result.reason}\n\nThis can corrupt your repository. Allow?`;

			const ok = await ctx.ui.confirm(title, body);
			if (ok) return undefined;
		}

		// ── mode=block, or confirm denied, or no UI → hard block ──
		return {
			block: true,
			reason: `🛡️ BLOCKED: ${result.reason}.`,
		};
	});
}
