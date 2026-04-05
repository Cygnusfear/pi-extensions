/**
 * Git guardrails — shared detection functions.
 *
 * Two categories:
 * 1. DESTRUCTIVE git commands — destroy uncommitted work or remote history. Hard-blocked always.
 * 2. .git directory writes — modifying files inside .git/. Requires human confirmation.
 *
 * Everything else passes through. Regular git operations (add, commit, diff, log, push,
 * branch, checkout, merge, rebase, etc.) are never blocked.
 *
 * Also re-exports isProcessKillBroadcast from process-guards so extensions can import
 * both guards through a single subpath without requiring a pi restart when new
 * guards are added to the shared package.
 */

export { isProcessKillBroadcast } from "./process-guards.ts";

// Shell escape patterns that encode "." (0x2e / 056 octal)
const DOT_ESCAPES = /(\$'\\x2e'|\$'\\056'|\$"\\x2e"|\$"\\056"|\\x2e|\\056)/;

/**
 * Strip git global flags so "git -C /path reset --hard" becomes "git reset --hard".
 * Handles: -C <path>, --git-dir=<path>, --work-tree=<path>, --no-pager, --no-replace-objects,
 * --bare, --literal-pathspecs, --glob-pathspecs, --noglob-pathspecs, --no-optional-locks, etc.
 */
function stripGitGlobalFlags(segment: string): string {
	return segment.replace(
		/\bgit\s+((?:(?:-C\s+\S+|--git-dir[=\s]\S+|--work-tree[=\s]\S+|--namespace[=\s]\S+|--no-pager|--no-replace-objects|--bare|--literal-pathspecs|--glob-pathspecs|--noglob-pathspecs|--icase-pathspecs|--no-optional-locks|--list-cmds[=\s]\S+|--exec-path[=\s]\S+)\s+)+)/,
		"git ",
	);
}

/**
 * Destructive git commands that destroy uncommitted work or remote history.
 * Always hard-blocked (no confirmation — just an error).
 * Tested against segments AFTER stripping global flags.
 */
const DESTRUCTIVE_GIT_COMMANDS: Array<[RegExp, string]> = [
	// git reset --hard
	[/\bgit\s+reset\s+--hard\b/, "git reset --hard — destroys all uncommitted changes"],

	// git checkout -- <path> / git checkout .
	[/\bgit\s+checkout\s+--\s/, "git checkout -- <path> — discards uncommitted changes"],
	[/\bgit\s+checkout\s+\.\s*$/, "git checkout . — discards all uncommitted changes"],

	// git clean -f
	[/\bgit\s+clean\s+.*-[a-zA-Z]*f/, "git clean -f — permanently deletes untracked files"],

	// git push --force / -f (without --force-with-lease)
	[/\bgit\s+push\s+.*--force\b(?!-with-lease)/, "git push --force — rewrites remote history"],
	[/\bgit\s+push\s+.*\s-f\b/, "git push -f — rewrites remote history"],
	[/\bgit\s+push\s+-f\b/, "git push -f — rewrites remote history"],

	// git restore (discards working tree changes, like checkout --)
	// Catch: git restore ., git restore src/, git restore --worktree ., git restore -- .
	// Safe: git restore --staged (only unstages, doesn't discard)
	[/\bgit\s+restore\s+(?!--staged)(?:--(?:worktree|source\S*)\s+)*(?:--\s+)?\S/, "git restore — discards uncommitted changes"],

	// git filter-branch — rewrites history
	[/\bgit\s+filter-branch\b/, "git filter-branch — rewrites repository history"],

	// git reflog expire — destroys reflog history
	[/\bgit\s+reflog\s+expire\b/, "git reflog expire — destroys reflog history"],
];

/**
 * Commands that write/modify/delete files. Used to detect writes targeting .git paths.
 * Matches after whitespace, path separators, or shell syntax chars.
 * Includes GNU coreutils variants (grm, gcp, etc.).
 */
const WRITE_COMMANDS_RE =
	/(?:^|[\s\/({'"<`])(rm|rmdir|mv|cp|chmod|chown|touch|mkdir|mkfifo|tee|dd|truncate|shred|install|ln|sed|patch|rsync|curl|wget|unzip|tar|grm|gcp|gmv)\b/;

/**
 * Match .git as a directory target — with OR without trailing slash.
 * Case-insensitive for macOS (HFS+/APFS).
 * Also matches inside backticks, $(), and ANSI-C quoting.
 */
const GIT_DIR_RE = /(?:^|[\s\/'"=`$(])\.git(?:\/|[\s'"\\`)]|$)/i;

/**
 * Match ANSI-C quoted dot followed by "git" — catches $'\x2e'git and $'\056'git
 */
const ANSI_DOT_GIT_RE = /\$['"]\\(?:x2e|056)['"]\s*git/i;

/**
 * Check if a bash command is destructive to git state.
 *
 * Returns:
 * - { type: "destructive", reason } — always hard-blocked, no confirmation
 * - { type: "git_write", reason }   — writes to .git dir, needs human confirmation
 * - null                             — safe, let it through
 */
export function isGitUnsafeBash(cmd: string): { type: "destructive" | "git_write"; reason: string } | null {
	const normalized = cmd.replace(/\s+/g, " ").trim();
	const segments = normalized.split(/\s*(?:&&|\|\||[;|])\s*/);

	// ── git init — can corrupt worktrees ──
	for (const seg of segments) {
		const stripped = stripGitGlobalFlags(seg.trim());
		if (/^\s*(?:cd\s+\S+\s*(?:&&|;)\s*)?git\s+init\b/.test(stripped)) {
			return { type: "destructive", reason: "git init — can corrupt worktrees by overwriting the .git pointer file" };
		}
	}

	// ── Destructive git commands (after stripping global flags like -C, --no-pager) ──
	for (const seg of segments) {
		const stripped = stripGitGlobalFlags(seg.trim());
		for (const [pattern, reason] of DESTRUCTIVE_GIT_COMMANDS) {
			if (pattern.test(stripped)) {
				return { type: "destructive", reason };
			}
		}
	}

	// ── Detect writes targeting .git directory ──

	// Shell redirect overwriting .git path — all redirect operators: >, >>, >|, >&
	if (/(?:>|>>|>\||>&)\s*\S*\.git[\/\s]/i.test(normalized) || /(?:>|>>|>\||>&)\s*\S*\.git\s*$/i.test(normalized)) {
		return { type: "git_write", reason: "shell redirect targeting .git directory" };
	}

	// Redirect truncating bare .git file (worktree pointer): > .git
	if (/>\s*\.git\s*$/.test(normalized) || />\s*\.git\s*(?:2|&)/.test(normalized)) {
		return { type: "git_write", reason: "shell redirect targeting .git" };
	}

	// Variable construction: any var assignment containing "git" + write command + $
	if (/=\S*git\b/.test(normalized) && WRITE_COMMANDS_RE.test(normalized) && /\$/.test(normalized)) {
		return { type: "git_write", reason: "variable-constructed command targeting git" };
	}

	// ── xargs / find -exec / find -delete patterns ──
	if (/\bxargs\b/.test(normalized) && WRITE_COMMANDS_RE.test(normalized) &&
		(GIT_DIR_RE.test(normalized) || ANSI_DOT_GIT_RE.test(normalized))) {
		return { type: "git_write", reason: "xargs with write command targeting .git" };
	}
	if (/\bfind\b.*\.git.*-(?:exec|execdir)\s/i.test(normalized) && WRITE_COMMANDS_RE.test(normalized)) {
		return { type: "git_write", reason: "find -exec with write command targeting .git" };
	}
	if (/\bfind\b.*\.git.*-delete\b/i.test(normalized)) {
		return { type: "git_write", reason: "find -delete targeting .git" };
	}

	// ── Per-segment: write command + .git target ──
	for (const seg of segments) {
		const trimmed = seg.trim();

		// Standard .git reference + write command
		if ((GIT_DIR_RE.test(trimmed) || ANSI_DOT_GIT_RE.test(trimmed)) && WRITE_COMMANDS_RE.test(trimmed)) {
			return { type: "git_write", reason: "write operation targeting .git directory" };
		}

		// dd ... of=.git/...
		if (/\bdd\b/.test(trimmed) && /of=\S*\.git/i.test(trimmed)) {
			return { type: "git_write", reason: "dd write targeting .git directory" };
		}
	}

	// Everything else is safe
	return null;
}

/**
 * Check if a file path is inside or IS a .git directory.
 * Case-insensitive to handle macOS (HFS+/APFS case-insensitive by default).
 */
export function isGitPath(filePath: string): boolean {
	const segments = filePath.replace(/\\/g, "/").split("/");
	return segments.some((s) => s.toLowerCase() === ".git");
}
