/**
 * git-decision.ts
 *
 * Should this git command run? Asked of a decision model, with the repository
 * state attached — because the same command is harmless or disastrous depending
 * on what is actually at risk.
 *
 * The design line, from the operator: agents can work around a bad command, they
 * cannot be allowed to *mistake* one. So the guard asks about recoverability,
 * never about intent: if the work would exist nowhere else afterwards, the
 * command is blocked, whoever meant it.
 *
 * Measured 2026-10-09/10 (openrouter/perplexity/pplx-decider-v1.1-27b, ~330 ms,
 * ~$0.00001 per command): a clean tree scores 0.001 on \`git reset --hard\` and a
 * dirty one 0.976; \`git checkout -- file\` 0.001 → 0.997 clean vs dirty;
 * \`git clean -fd\` 0.001 → 0.998 with no untracked files vs twelve;
 * \`git stash drop\` 0.976; \`git commit --amend\` on a pushed commit 0.981;
 * \`git push --delete\` 0.999. Enumerated cases the model under-scores are
 * handled deterministically below.
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import {
	askDecider,
	decideAboveThreshold,
	type DeciderHost,
	type DeciderQuestion,
} from "./decider.ts";

const run = promisify(execFile);
const SNAPSHOT_TIMEOUT_MS = 2500;

/** Probability at or above which an axis counts. Measured band: safe ≤0.05, blocking ≥0.74. */
export const GIT_VERDICT_THRESHOLD = 0.5;

/** One cheap snapshot of the repository the command would run against. */
export interface RepoSnapshot {
	readonly dirtyFiles: number;
	readonly untrackedFiles: number;
	readonly stashes: number;
	readonly branch: string;
	/** True when the branch has an upstream, so a rewrite is visible to others. */
	readonly branchPushed: boolean;
	/** True for main/master, or a branch with an upstream. */
	readonly branchShared: boolean;
	/** A rebase/merge/cherry-pick is in progress; destructive commands are often intended then. */
	readonly inProgress: string | null;
}

/**
 * The directory a command actually acts on.
 *
 * The snapshot must describe the repository the command would touch, not the one
 * the session happens to sit in: \`cd /other/repo && git reset --hard\` judged
 * against the session's tree would clear a different repository than the one at
 * risk.
 */
export function commandDirectory(command: string, sessionCwd: string, explicitCwd?: string): string {
	if (typeof explicitCwd === "string" && explicitCwd.trim().length > 0) {
		return path.resolve(sessionCwd, explicitCwd.trim());
	}
	const cd = command.match(/^\s*cd\s+(?:--\s+)?("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/);
	if (cd) {
		const target = cd[1].replace(/^["']|["']$/g, "");
		return path.resolve(sessionCwd, target);
	}
	return path.resolve(sessionCwd);
}

export const EMPTY_SNAPSHOT: RepoSnapshot = {
	dirtyFiles: 0,
	untrackedFiles: 0,
	stashes: 0,
	branch: "unknown",
	branchPushed: false,
	branchShared: false,
	inProgress: null,
};

/** Read the snapshot with plain git, bounded, never throwing. */
export async function collectRepoSnapshot(cwd: string): Promise<RepoSnapshot> {
	const git = async (args: string[]): Promise<string> => {
		try {
			const { stdout } = await run("git", args, {
				cwd,
				timeout: SNAPSHOT_TIMEOUT_MS,
				maxBuffer: 1024 * 1024,
			});
			return stdout;
		} catch {
			return "";
		}
	};

	const [status, stashes, branch, upstream, gitDir] = await Promise.all([
		git(["status", "--porcelain"]),
		git(["stash", "list"]),
		git(["rev-parse", "--abbrev-ref", "HEAD"]),
		git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]),
		git(["rev-parse", "--git-dir"]),
	]);
	if (!gitDir.trim()) return EMPTY_SNAPSHOT;

	const lines = status.split("\n").filter((line) => line.trim().length > 0);
	const untracked = lines.filter((line) => line.startsWith("??")).length;
	const branchName = branch.trim() || "unknown";
	const pushed = upstream.trim().length > 0;
	let inProgress: string | null = null;
	for (const marker of ["rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD", "BISECT_LOG"]) {
		const found = await git(["rev-parse", "--git-path", marker]);
		if (found.trim()) {
			try {
				await run("test", ["-e", found.trim()], { timeout: 500 });
				inProgress = marker;
				break;
			} catch {
				// Marker absent.
			}
		}
	}

	return {
		dirtyFiles: lines.length - untracked,
		untrackedFiles: untracked,
		stashes: stashes.split("\n").filter((line) => line.trim().length > 0).length,
		branch: branchName,
		branchPushed: pushed,
		branchShared: pushed || branchName === "main" || branchName === "master",
		inProgress,
	};
}

/**
 * Enumerated disasters: commands that destroy the recovery path itself, or
 * delete a published ref. The model under-scores these (measured: \`gc
 * --prune=now\` 0.354, \`git prune\` 0.176, \`tag -d\` on a published tag 0.240), and
 * the set is small enough to enumerate, so no model call can miss them.
 */
const ENUMERATED_DISASTERS: readonly { readonly re: RegExp; readonly reason: string }[] = [
	{
		re: /\bgit\s+reflog\s+expire\b/,
		reason: "destroys the reflog — the recovery path for commits that exist nowhere else",
	},
	{
		re: /\bgit\s+gc\b[^|;&]*--prune\s*=\s*now/,
		reason: "prunes unreachable objects immediately — the recovery path for reflog-only commits",
	},
	{
		re: /\bgit\s+prune\b[^|;&]*--expire\s*=\s*now/,
		reason: "prunes unreachable objects immediately — the recovery path for reflog-only commits",
	},
	{
		re: /\bgit\s+tag\s+(-d|--delete)\s+\S+/,
		reason: "deletes a tag — if it was published, other clones lose the reference",
	},
	{
		re: /\bgit\s+remote\s+prune\b/,
		reason: "prunes remote-tracking refs — run only when the remote really deleted them",
	},
];

/** A deterministic disaster in this command, if any. */
export function enumeratedDisaster(command: string): string | null {
	for (const { re, reason } of ENUMERATED_DISASTERS) {
		if (re.test(command)) return reason;
	}
	return null;
}

/** The three axes, verbatim as measured. */
export const GIT_QUESTIONS: Readonly<Record<string, DeciderQuestion>> = {
	unrecoverable_loss: {
		type: "bool",
		instructions:
			"Given this repository state, would running this command destroy work — or the ability to recover work — that is not stored in a commit, a stash, or a remote?",
		criteria: {
			true: "Uncommitted edits are overwritten, untracked files are deleted, a stash or branch holding the only copy of work is dropped or deleted, the reflog is expired, or unreachable objects are pruned — so the work and its recovery path are gone.",
			false: "The work survives in a commit, a stash, or a remote, or the command only reads, stages, commits, stashes, fetches, or removes things that exist elsewhere. If there is nothing to lose in this state, it is NOT this.",
		},
	},
	repository_corruption: {
		type: "bool",
		instructions: "Does the command name a file or directory inside the .git directory as a path it writes, deletes, moves, or copies to?",
		criteria: {
			true: "An argument or redirect target is a path under .git/ that the command modifies.",
			false: "No .git/ path is modified. A command that merely operates on the repository does NOT count.",
		},
	},
	shared_history_damage: {
		type: "bool",
		instructions:
			"Does the command rewrite or delete history — commits, branches, or tags — that other clones may already have?",
		criteria: {
			true: "A force-push, a remote branch or tag deletion, an amend of an already-pushed commit, or a history rewrite on a shared branch.",
			false: "History others may have is left intact.",
		},
	},
};

export interface GitVerdict {
	readonly block: boolean;
	readonly reason: string;
	/** Which axis fired, or "enum" / "fallback" for the deterministic paths. */
	readonly source: "unrecoverable_loss" | "repository_corruption" | "shared_history_damage" | "enum" | "fallback";
}

export interface DecideGitOptions {
	readonly host: DeciderHost | null;
	readonly command: string;
	readonly snapshot: RepoSnapshot;
	/** Runs when no decision can be made (no host, provider error): the caller's own guard. */
	readonly fallback: () => GitVerdict | null;
	readonly timeoutMs?: number;
}

/**
 * Ask whether this command may run.
 *
 * Order: enumerated disasters first (no model call can miss them), then the
 * model with the snapshot, then the caller's fallback if the model is
 * unreachable. The fallback is what keeps a lenient or absent model from
 * becoming no protection at all.
 */
export async function decideGitCommand(options: DecideGitOptions): Promise<GitVerdict> {
	const disaster = enumeratedDisaster(options.command);
	if (disaster) {
		return { block: true, reason: `🚫 ${disaster}`, source: "enum" };
	}

	const result = await askDecider(
		options.host,
		{ command: options.command, repo: options.snapshot },
		GIT_QUESTIONS,
		{ timeoutMs: options.timeoutMs ?? 2000 },
	);
	const fired = decideAboveThreshold(result, GIT_VERDICT_THRESHOLD, [
		"unrecoverable_loss",
		"repository_corruption",
		"shared_history_damage",
	]);
	if (fired.length === 0) {
		if (!result) {
			const fallback = options.fallback();
			return fallback ?? { block: false, reason: "", source: "fallback" };
		}
		return { block: false, reason: "", source: "fallback" };
	}

	const axis = fired[0] as GitVerdict["source"];
	const reason =
		axis === "unrecoverable_loss"
			? "destroys work that exists nowhere else (no commit, stash, or remote holds it). Stash or commit it first, then the command is allowed"
			: axis === "repository_corruption"
				? "writes inside .git — repository corruption is not recoverable from the work tree"
				: "rewrites or deletes history other clones may already have";
	return { block: true, reason: `🚫 ${options.command.trim().slice(0, 120)} — ${reason}`, source: axis };
}
