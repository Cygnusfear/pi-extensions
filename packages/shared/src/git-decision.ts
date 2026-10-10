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
import { appendFile, mkdir, readFile, rename, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const statFile = async (file: string): Promise<number> => (await stat(file)).size;
const renameFile = async (from: string, to: string): Promise<void> => {
	await rename(from, to);
};
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

/**
 * The cheap gate before any model call.
 *
 * Only commands that can plausibly damage work are worth asking about: status,
 * log, add, commit, diff and friends are pure string matches away from the
 * provider, so a session's ordinary git traffic costs nothing and waits for
 * nothing. The gate is deliberately wider than the old destructive-command
 * matcher — a stash drop or a branch -D destroys work the matcher never flagged,
 * and those are exactly the mistakes this guard exists to stop.
 */
const RISKY_VERB_RE = new RegExp(
	[
		"stash\\s+(drop|clear|pop)",
		"branch\\s+(-D|--delete|-d\\s)",
		"reset\\s+--hard",
		"checkout\\s+(--|\\.)",
		"restore\\b",
		"clean\\s+-[a-zA-Z]*[fd]",
		"push\\s+(--force|-f\\b|--delete)",
		"commit\\s+--amend",
		"tag\\s+(-d|--delete)",
		"reflog",
		"filter-branch",
		"update-ref",
		"gc\\b",
		"prune",
		"remote\\s+prune",
		"worktree\\s+remove",
		"submodule\\s+deinit",
	].join("|"),
);

/** True when this command is worth a decision-model call. */
export function needsDecision(command: string): boolean {
	return RISKY_VERB_RE.test(command);
}

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

/** Where decisions are recorded; override for tests. */
export function gitDecisionDir(): string {
	return process.env.PI_GIT_LOCK_STATE_DIR ?? path.join(homedir(), ".pi", "agent", "git-lock");
}

/** One recorded decision: what was asked, what was decided, what it cost. */
export interface GitDecisionRecord {
	readonly ts: number;
	readonly pid: number;
	readonly command: string;
	readonly dir: string;
	readonly block: boolean;
	readonly source: GitVerdict["source"];
	readonly reason: string;
	readonly axes?: Readonly<Record<string, number>>;
	readonly cost?: number;
	readonly ms: number;
	readonly model?: string;
	/** Set when the decision model did not answer, so the fallback decided. */
	readonly error?: string;
}

const LOG_MAX_BYTES = 4 * 1024 * 1024;

/** Append one decision. Never throws: an audit trail must not break a guard. */
export function recordGitDecision(record: GitDecisionRecord): void {
	void (async () => {
		try {
			const dir = gitDecisionDir();
			await mkdir(dir, { recursive: true });
			const file = path.join(dir, "decisions.jsonl");
			try {
				const stat = await statFile(file);
				if (stat > LOG_MAX_BYTES) await renameFile(file, `${file}.1`);
			} catch {
				// No log yet.
			}
			await appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
		} catch {
			// Ignored on purpose.
		}
	})();
}

/** Read the log, including the rotated file, skipping lines that do not parse. */
export async function readGitDecisions(): Promise<readonly GitDecisionRecord[]> {
	const dir = gitDecisionDir();
	const records: GitDecisionRecord[] = [];
	for (const name of ["decisions.jsonl.1", "decisions.jsonl"]) {
		try {
			const text = await readFile(path.join(dir, name), "utf8");
			for (const line of text.split("\n")) {
				if (line.trim().length === 0) continue;
				try {
					const parsed = JSON.parse(line) as GitDecisionRecord;
					if (typeof parsed?.ts === "number") records.push(parsed);
				} catch {
					// A truncated tail is not worth failing a report over.
				}
			}
		} catch {
			// Missing file: nothing recorded yet.
		}
	}
	return records;
}

export interface GitDecisionStats {
	readonly candidates: number;
	readonly blocked: number;
	readonly allowed: number;
	readonly bySource: Readonly<Record<string, number>>;
	/** Why the decision model did not answer, when it did not. */
	readonly byFailure: Readonly<Record<string, number>>;
	readonly cost: number;
	readonly blockedCommands: readonly { readonly command: string; readonly count: number }[];
}

/** Aggregate the log over a window. */
export function aggregateGitDecisions(records: readonly GitDecisionRecord[], sinceMs: number): GitDecisionStats {
	const window = records.filter((record) => record.ts >= sinceMs);
	const bySource: Record<string, number> = {};
	const byFailure: Record<string, number> = {};
	const blockedCounts = new Map<string, number>();
	let cost = 0;
	for (const record of window) {
		bySource[record.source] = (bySource[record.source] ?? 0) + 1;
		if (record.error) byFailure[record.error] = (byFailure[record.error] ?? 0) + 1;
		cost += record.cost ?? 0;
		if (record.block) {
			blockedCounts.set(record.command, (blockedCounts.get(record.command) ?? 0) + 1);
		}
	}
	return {
		candidates: window.length,
		blocked: window.filter((record) => record.block).length,
		allowed: window.filter((record) => !record.block).length,
		bySource,
		byFailure,
		cost,
		blockedCommands: [...blockedCounts.entries()]
			.map(([command, count]) => ({ command, count }))
			.sort((left, right) => right.count - left.count)
			.slice(0, 10),
	};
}

/** Human-readable report for /git-lock report. */
export function renderGitDecisionReport(stats: GitDecisionStats, days: number): string {
	const lines = [
		`Git guard — last ${days === 1 ? "24 hours" : `${days} days`}: ${stats.candidates} candidate command(s), ${stats.blocked} blocked, ${stats.allowed} allowed`,
		`Cost: ${stats.cost.toFixed(5)} · by source: ${Object.entries(stats.bySource).map(([source, count]) => `${source} ${count}`).join(", ") || "none"}`,
	];
	const failures = Object.entries(stats.byFailure ?? {}).sort((left, right) => right[1] - left[1]);
	if (failures.length > 0) {
		lines.push(
			`Decision model did not answer: ${stats.bySource.fallback ?? 0} · ${failures
				.map(([reason, count]) => `${count}× ${reason.slice(0, 80)}`)
				.join(", ")}`,
		);
	}
	if (stats.blockedCommands.length > 0) {
		lines.push("Most blocked:");
		for (const { command, count } of stats.blockedCommands) {
			lines.push(`  ${count}× ${command.slice(0, 100)}`);
		}
	}
	return lines.join("\n");
}

export interface GitVerdict {
	readonly block: boolean;
	readonly reason: string;
	/** Which axis fired, or "enum" / "fallback" for the deterministic paths. */
	readonly source:
		| "unrecoverable_loss"
		| "repository_corruption"
		| "shared_history_damage"
		| "enum"
		| "model"
		| "fallback";
	/** Why the decision model did not answer, when it did not. */
	readonly failure?: string;
}

export interface DecideGitOptions {
	readonly host: DeciderHost | null;
	readonly command: string;
	readonly snapshot: RepoSnapshot;
	/** Runs when no decision can be made (no host, provider error): the caller's own guard. */
	readonly fallback: () => GitVerdict | null;
	readonly timeoutMs?: number;
	/** The directory the command acts on, recorded for the trail. */
	readonly dir?: string;
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
	const startedAt = Date.now();
	const record = (verdict: GitVerdict, axes?: Record<string, number>, cost?: number, model?: string): GitVerdict => {
		recordGitDecision({
			ts: Date.now(),
			pid: process.pid,
			command: options.command,
			dir: options.dir ?? "",
			block: verdict.block,
			source: verdict.source,
			reason: verdict.reason,
			...(axes ? { axes } : {}),
			...(cost !== undefined ? { cost } : {}),
			ms: Date.now() - startedAt,
			...(model ? { model } : {}),
			...(verdict.failure ? { error: verdict.failure } : {}),
		});
		return verdict;
	};

	const disaster = enumeratedDisaster(options.command);
	if (disaster) {
		return record({ block: true, reason: `🚫 ${disaster}`, source: "enum" });
	}

	const outcome = await askDecider(
		options.host,
		{ command: options.command, repo: options.snapshot },
		GIT_QUESTIONS,
		{ timeoutMs: options.timeoutMs ?? 2000 },
	);
	const result = outcome.ok ? outcome.result : undefined;
	const axes: Record<string, number> = {};
	for (const key of ["unrecoverable_loss", "repository_corruption", "shared_history_damage"]) {
		const probability = result?.answers?.[key]?.probability;
		if (typeof probability === "number") axes[key] = probability;
	}
	const cost = result?.usage?.cost?.total;
	const fired = decideAboveThreshold(result, GIT_VERDICT_THRESHOLD, [
		"unrecoverable_loss",
		"repository_corruption",
		"shared_history_damage",
	]);
	if (fired.length === 0) {
		if (!outcome.ok) {
			const fallback = options.fallback() ?? { block: false, reason: "", source: "fallback" as const };
			return record({
				...fallback,
				failure: outcome.reason,
				reason: fallback.block
					? `${fallback.reason} (decision model unavailable: ${outcome.reason})`
					: "",
			});
		}
		return record({ block: false, reason: "", source: "model" }, axes, cost);
	}

	const axis = fired[0] as GitVerdict["source"];
	const reason =
		axis === "unrecoverable_loss"
			? "destroys work that exists nowhere else (no commit, stash, or remote holds it). Stash or commit it first, then the command is allowed"
			: axis === "repository_corruption"
				? "writes inside .git — repository corruption is not recoverable from the work tree"
				: "rewrites or deletes history other clones may already have";
	return record(
		{ block: true, reason: `🚫 ${options.command.trim().slice(0, 120)} — ${reason}`, source: axis },
		axes,
		cost,
	);
}
