/**
 * Git Safety Extension
 *
 * Protects against git commands that destroy work that exists nowhere else.
 * Modes via /git-lock:
 *   - decide: a decision model reads the command WITH the repository state and
 *             blocks only what is unrecoverable (default for interactive)
 *   - block:  hard-block anything the deterministic matcher flags (for workers)
 *   - off:    no protection
 *
 * The confirm dialog is gone: the operator approved it blindly 9.99 times out of
 * 10, so it protected nothing and interrupted everything. What replaces it is
 * the judgement the dialog never made — is this work recoverable? Measured:
 * \`git reset --hard\` scores 0.001 on a clean tree and 0.976 on a dirty one,
 * so the guard blocks the mistake and lets the deliberate command through.
 *
 * The model is an addition, never the only guard: enumerated disasters
 * (reflog expire, gc --prune=now, published tag deletion) and a provider failure
 * both fall back to the deterministic matcher.
 *
 * Always on, whatever the mode:
 * - blocks sed (broken on macOS)
 * - blocks process-kill broadcasts
 * - injects GIT_EDITOR=true for \`git rebase --continue\` to prevent hanging
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isGitUnsafeBash, isGitPath, isProcessKillBroadcast } from "@pi-extensions/shared/git-guards";
import { resolveDeciderHost } from "../../shared/src/decider.ts";
import {
	aggregateGitDecisions,
	collectRepoSnapshot,
	commandDirectory,
	decideGitCommand,
	needsDecision,
	readGitDecisions,
	renderGitDecisionReport,
	type GitVerdict,
} from "../../shared/src/git-decision.ts";

const REBASE_CONTINUE_RE = /\bgit\s+rebase\s+--continue\b/;
const HAS_GIT_EDITOR_RE = /\bGIT_EDITOR\s*=/;

const SED_RE = /\bsed\s+(-[a-zA-Z]\s+)*['"-]/;

/** Cheap gate before any model call: does this command even concern git? */
const GIT_CANDIDATE_RE = /(^|[\s;&|(])(git|GIT_[A-Z_]+=)|\.git\b/;

/** Verdicts are cached per exact command string; a rephrased command is judged fresh. */
const VERDICT_CACHE_LIMIT = 200;

type GitLockMode = "decide" | "block" | "off";

export default function (pi: ExtensionAPI) {
	let mode: GitLockMode = process.env.PI_TEAMS_WORKER === "1" ? "block" : "decide";
	// Published so code-mode's sandbox tools read the same mode.
	process.env.PI_GIT_LOCK_MODE = mode;

	const cache = new Map<string, GitVerdict>();

	pi.registerCommand("git-lock", {
		description: "Git safety: /git-lock decide | block | off | report [days]",
		handler: async (_args, ctx) => {
			const [verb, value] = _args.trim().toLowerCase().split(/\s+/);
			if (verb === "report") {
				const days = Math.min(30, Math.max(1, Number.parseInt(value ?? "1", 10) || 1));
				const stats = aggregateGitDecisions(await readGitDecisions(), Date.now() - days * 24 * 60 * 60 * 1000);
				ctx.ui.notify(renderGitDecisionReport(stats, days), "info");
				return;
			}
			const arg = _args.trim().toLowerCase();
			if (arg === "decide" || arg === "block" || arg === "off") {
				mode = arg;
				process.env.PI_GIT_LOCK_MODE = mode;
				ctx.ui.notify(`Git safety: ${mode}`, "info");
				return;
			}
			if (arg === "") {
				const next: Record<GitLockMode, GitLockMode> = { decide: "off", off: "block", block: "decide" };
				mode = next[mode];
				process.env.PI_GIT_LOCK_MODE = mode;
				ctx.ui.notify(`Git safety: ${mode}`, "info");
				return;
			}
			ctx.ui.notify("Usage: /git-lock [decide|block|off|report [days]]", "warning");
		},
	});

	pi.on("tool_call", async (event, ctx) => {
		const isBash = event.toolName === "bash" || event.toolName === "bash_bg_start";
		const cmd: string = isBash ? ((event.input as any)?.command ?? "") : "";

		// ── bash: inject GIT_EDITOR for rebase --continue (always, regardless of mode) ──
		if (isBash && REBASE_CONTINUE_RE.test(cmd) && !HAS_GIT_EDITOR_RE.test(cmd)) {
			(event.input as any).command = cmd.replace(
				REBASE_CONTINUE_RE,
				"GIT_EDITOR=true git rebase --continue",
			);
		}

		// ── block sed (always, regardless of mode) ──
		if (isBash && SED_RE.test(cmd)) {
			return {
				block: true,
				reason:
					"🚫 sed is blocked — it behaves differently on macOS and Linux. Use edit, apply_patch, ast-grep (TypeScript), or rs-hack (Rust) instead.",
			};
		}

		// ── block process-kill broadcast (always, regardless of mode) ──
		if (isBash) {
			const killHit = isProcessKillBroadcast(cmd);
			if (killHit) {
				return {
					block: true,
					reason: `🛡️ HARD-BLOCKED (process kill guard): ${killHit.reason}. This guard cannot be disabled.`,
				};
			}
		}

		if (mode === "off") return undefined;

		// ── .git path writes: deterministic, no model call ──
		if (event.toolName === "write" || event.toolName === "edit") {
			const p: string = (event.input as any)?.path ?? "";
			if (isGitPath(p)) {
				return {
					block: true,
					reason: `🚫 ${event.toolName} to a .git path (${p}) — repository corruption is not recoverable from the work tree.`,
				};
			}
		}
		if (event.toolName === "apply_patch") {
			const patch: string = (event.input as any)?.patchText ?? "";
			const fileHeaders = patch.match(/\*\*\*\s+(?:Add|Delete|Update)\s+File:\s*(.+)/g);
			for (const header of fileHeaders ?? []) {
				const p = header.replace(/\*\*\*\s+(?:Add|Delete|Update)\s+File:\s*/, "").trim();
				if (isGitPath(p)) {
					return {
						block: true,
						reason: `🚫 patch targets a .git path (${p}) — repository corruption is not recoverable from the work tree.`,
					};
				}
			}
		}

		// Cheap gate first: ordinary git traffic (status, log, add, commit, diff)
		// never reaches the model, so it costs nothing and waits for nothing.
		if (!isBash || !GIT_CANDIDATE_RE.test(cmd) || !needsDecision(cmd)) return undefined;

		const cached = cache.get(cmd);
		if (cached) return cached.block ? { block: true, reason: cached.reason } : undefined;

		// Fallback when no decision can be made: the deterministic matcher, which
		// is what this guard did before. A missing model degrades to old behaviour,
		// never to no protection.
		const fallback = (): GitVerdict | null => {
			const hit = isGitUnsafeBash(cmd);
			return hit
				? { block: true, reason: `🚫 ${hit.reason} (deterministic guard; no decision model available)`, source: "fallback" }
				: null;
		};

		if (mode === "block") {
			const verdict = fallback();
			return verdict ? { block: true, reason: verdict.reason } : undefined;
		}

		// The repository this command would touch, which is not always the one the
		// session sits in (\`cd /other/repo && git reset --hard\`).
		const dir = commandDirectory(
			cmd,
			ctx.cwd,
			(event.input as { cwd?: unknown })?.cwd as string | undefined,
		);
		const snapshot = await collectRepoSnapshot(dir);
		const verdict = await decideGitCommand({
			host: resolveDeciderHost(ctx.modelRegistry as unknown),
			command: cmd,
			snapshot,
			dir,
			fallback,
		});
		if (cache.size >= VERDICT_CACHE_LIMIT) cache.clear();
		cache.set(cmd, verdict);

		return verdict.block ? { block: true, reason: verdict.reason } : undefined;
	});
}
