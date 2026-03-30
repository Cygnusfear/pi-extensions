/**
 * Git Guards — Red Team Round 2 Adversarial Tests
 *
 * Tests written by: red-team-r2-sonnet
 * Ticket: pe-zotn
 *
 * These tests probe the CURRENT (post-Round-1) implementation for NEW bypasses.
 * Tests marked with "(BYPASS)" in the description CURRENTLY FAIL, confirming a live bypass.
 * Tests marked with "(SAFE)" confirm things that should never be blocked.
 *
 * Bypass categories found:
 *   [CRITICAL] git -C <dir> flag bypasses ALL destructive pattern matching
 *   [CRITICAL] git --no-pager / --work-tree global flags same bypass
 *   [HIGH]     Backtick / $() substitution bypasses GIT_DIR_RE (.git followed by ` or ))
 *   [MEDIUM]   ANSI-C quoting ($'\x2e'git/) bypasses literal .git match (DOT_ESCAPES unused)
 *   [MEDIUM]   >& redirect operator bypasses the redirect guard (>| no-space is caught)
 *   [MEDIUM]   git restore . / git restore --worktree . not in destructive patterns
 *   [MEDIUM]   git worktree remove --force not blocked
 *   [MEDIUM]   git submodule deinit --force not blocked
 *
 * How to read results:
 *   FAIL = bypass confirmed (guard lets through something dangerous)
 *   PASS = guard correctly catches the attack (or correctly allows safe usage)
 */

import { describe, test, expect } from "bun:test";
import { isGitUnsafeBash, isGitPath } from "./git-guards.ts";

function expectDestructive(cmd: string, reasonContains?: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result, `expected DESTRUCTIVE for: ${cmd}`).not.toBeNull();
	expect(result!.type).toBe("destructive");
	if (reasonContains) expect(result!.reason).toContain(reasonContains);
}

function expectGitWrite(cmd: string, reasonContains?: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result, `expected GIT_WRITE for: ${cmd}`).not.toBeNull();
	expect(result!.type).toBe("git_write");
	if (reasonContains) expect(result!.reason).toContain(reasonContains);
}

function expectSafe(cmd: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result, `expected SAFE but got ${result?.type}: ${result?.reason} for: ${cmd}`).toBeNull();
}

// ═══════════════════════════════════════════════════════════════
// BYPASS 1: git -C <dir> flag (CRITICAL)
//
// All destructive patterns use \bgit\s+<subcommand>\b which requires
// git immediately followed by whitespace then the subcommand. The -C
// flag inserts " -C /path " between git and the subcommand, so none
// of the patterns match.
//
// Root cause: DESTRUCTIVE_GIT_COMMANDS regexes don't account for
// git global flags like -C, --no-pager, --work-tree, --git-dir.
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 1 [CRITICAL]: git -C flag bypasses destructive detection", () => {
	// reset --hard
	test("(BYPASS) git -C . reset --hard", () => expectDestructive("git -C . reset --hard"));
	test("(BYPASS) git -C /repo reset --hard", () => expectDestructive("git -C /repo reset --hard"));
	test("(BYPASS) git -C /repo reset --hard HEAD", () => expectDestructive("git -C /repo reset --hard HEAD"));
	test("(BYPASS) git -C /repo reset --hard HEAD~3", () => expectDestructive("git -C /repo reset --hard HEAD~3"));
	test("(BYPASS) git -C /home/user/project reset --hard origin/main", () =>
		expectDestructive("git -C /home/user/project reset --hard origin/main"));

	// checkout -- (discard)
	test("(BYPASS) git -C . checkout -- .", () => expectDestructive("git -C . checkout -- ."));
	test("(BYPASS) git -C /repo checkout -- src/file.ts", () =>
		expectDestructive("git -C /repo checkout -- src/file.ts"));
	test("(BYPASS) git -C . checkout .", () => expectDestructive("git -C . checkout ."));

	// clean -f
	test("(BYPASS) git -C . clean -fd", () => expectDestructive("git -C . clean -fd"));
	test("(BYPASS) git -C /repo clean -xfd", () => expectDestructive("git -C /repo clean -xfd"));
	test("(BYPASS) git -C . clean -f", () => expectDestructive("git -C . clean -f"));

	// push --force
	test("(BYPASS) git -C /repo push --force", () => expectDestructive("git -C /repo push --force"));
	test("(BYPASS) git -C /repo push --force origin main", () =>
		expectDestructive("git -C /repo push --force origin main"));
	test("(BYPASS) git -C /repo push -f", () => expectDestructive("git -C /repo push -f"));
	test("(BYPASS) git -C /repo push origin main -f", () =>
		expectDestructive("git -C /repo push origin main -f"));

	// init (can corrupt worktrees)
	test("(BYPASS) git -C /path init", () => expectDestructive("git -C /path init"));
	test("(BYPASS) git -C . init --bare", () => expectDestructive("git -C . init --bare"));

	// chained with other commands
	test("(BYPASS) cd /repo && git -C . reset --hard", () =>
		expectDestructive("cd /repo && git -C . reset --hard"));
	test("(BYPASS) git -C /worktree clean -fd && echo done", () =>
		expectDestructive("git -C /worktree clean -fd && echo done"));

	// Safe variant: -C with read-only commands should still pass
	test("(SAFE) git -C /worktree status", () => expectSafe("git -C /worktree status"));
	test("(SAFE) git -C /worktree log --oneline", () => expectSafe("git -C /worktree log --oneline"));
	test("(SAFE) git -C /worktree diff", () => expectSafe("git -C /worktree diff"));
	test("(SAFE) git -C /worktree add .", () => expectSafe("git -C /worktree add ."));
	test("(SAFE) git -C /worktree commit -m 'fix'", () => expectSafe("git -C /worktree commit -m 'fix'"));
	test("(SAFE) git -C /worktree fetch origin", () => expectSafe("git -C /worktree fetch origin"));
});

// ═══════════════════════════════════════════════════════════════
// BYPASS 2: git global flags before subcommand (CRITICAL, same root)
//
// Same root cause as -C: flags like --no-pager insert text between
// 'git' and the subcommand keyword.
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 2 [CRITICAL]: git global flags before subcommand", () => {
	test("(BYPASS) git --no-pager reset --hard", () => expectDestructive("git --no-pager reset --hard"));
	test("(BYPASS) git --no-pager reset --hard HEAD", () =>
		expectDestructive("git --no-pager reset --hard HEAD"));
	test("(BYPASS) git --work-tree=/ reset --hard", () => expectDestructive("git --work-tree=/ reset --hard"));
	test("(BYPASS) git --work-tree=/tmp clean -fd", () => expectDestructive("git --work-tree=/tmp clean -fd"));
	test("(BYPASS) git --no-pager clean -fd", () => expectDestructive("git --no-pager clean -fd"));
	test("(BYPASS) git --no-pager push --force", () => expectDestructive("git --no-pager push --force"));
	test("(BYPASS) git --no-pager checkout -- .", () => expectDestructive("git --no-pager checkout -- ."));
	test("(BYPASS) git --no-pager init", () => expectDestructive("git --no-pager init"));

	// Caught correctly (because .git in path triggers word boundary match on 'git reset --hard')
	test("(CORRECTLY CAUGHT) git --git-dir=/tmp/.git reset --hard", () =>
		expectDestructive("git --git-dir=/tmp/.git reset --hard"));

	// Safe: --no-pager with non-destructive commands
	test("(SAFE) git --no-pager log --oneline", () => expectSafe("git --no-pager log --oneline"));
	test("(SAFE) git --no-pager diff", () => expectSafe("git --no-pager diff"));
});

// ═══════════════════════════════════════════════════════════════
// BYPASS 3: Backtick and $() command substitution (HIGH)
//
// GIT_DIR_RE requires after ".git": /, whitespace, ', ", \, or end.
// Backtick (`) and closing paren ()) are not in that set, so:
//   rm -rf `echo .git`   → .git followed by ` → NOT matched
//   rm -rf $(echo .git)  → .git followed by ) → NOT matched
//
// These expand to "rm -rf .git" at shell execution time, but the
// guard never sees that — it sees the unexpanded form.
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 3 [HIGH]: Backtick command substitution bypasses GIT_DIR_RE", () => {
	test("(BYPASS) rm -rf `echo .git`", () => expectGitWrite("rm -rf `echo .git`"));
	test("(BYPASS) rm -rf `echo .git/`", () => expectGitWrite("rm -rf `echo .git/`"));
	test("(BYPASS) chmod 000 `echo .git`", () => expectGitWrite("chmod 000 `echo .git`"));
	test("(BYPASS) mv `echo .git` /tmp/backup", () => expectGitWrite("mv `echo .git` /tmp/backup"));
	test("(BYPASS) rm -rf `printf .git`", () => expectGitWrite("rm -rf `printf .git`"));
	test("(BYPASS) rm `echo .git`/config", () => expectGitWrite("rm `echo .git`/config"));
	test("(BYPASS) shred -u `echo .git`/index", () => expectGitWrite("shred -u `echo .git`/index"));

	// Note: rm -rf $(echo .git) - the ) IS an issue for GIT_DIR_RE
	// but note that $(echo .git/) with trailing slash DOES match (/ is valid after .git)
	test("(BYPASS) rm -rf $(echo .git)", () => expectGitWrite("rm -rf $(echo .git)"));
	test("(BYPASS) chmod 000 $(echo .git)", () => expectGitWrite("chmod 000 $(echo .git)"));
	test("(BYPASS) mv $(echo .git) /tmp/", () => expectGitWrite("mv $(echo .git) /tmp/"));
	test("(BYPASS) truncate -s 0 $(echo .git)/HEAD", () => expectGitWrite("truncate -s 0 $(echo .git)/HEAD"));

	// Correctly caught (trailing slash present in substitution result or extra context):
	test("(CORRECTLY CAUGHT) rm -rf $(echo .git/)", () => expectGitWrite("rm -rf $(echo .git/)"));
});

// ═══════════════════════════════════════════════════════════════
// BYPASS 4: ANSI-C quoting for the dot in .git (MEDIUM)
//
// DOT_ESCAPES constant is defined in git-guards.ts but NEVER USED.
// bash ANSI-C quoting: $'\x2e' and $'\056' both expand to "."
// So rm -rf $'\x2e'git/ is identical to rm -rf .git/ at runtime.
// The guard only searches for literal ".git", missing encoded forms.
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 4 [MEDIUM]: ANSI-C quoting bypasses literal .git match (DOT_ESCAPES unused)", () => {
	test("(BYPASS) rm -rf $'\\x2e'git/", () => expectGitWrite("rm -rf $'\\x2e'git/"));
	test("(BYPASS) rm -rf $'\\056'git/", () => expectGitWrite("rm -rf $'\\056'git/"));
	test("(BYPASS) chmod 000 $'\\x2e'git", () => expectGitWrite("chmod 000 $'\\x2e'git"));
	test("(BYPASS) mv $'\\x2e'git /tmp/", () => expectGitWrite("mv $'\\x2e'git /tmp/"));
	test("(BYPASS) shred -u $'\\x2e'git/config", () => expectGitWrite("shred -u $'\\x2e'git/config"));
	test("(BYPASS) truncate -s 0 $'\\056'git/HEAD", () => expectGitWrite("truncate -s 0 $'\\056'git/HEAD"));
});

// ═══════════════════════════════════════════════════════════════
// BYPASS 5: >& redirect operator (MEDIUM)
//
// The guard checks: />\s*\S*\.git\//i
// For ">& .git/config": > then \s*=0, \S*=& then needs .git/ but
// next char is space. The \S* stops at whitespace so .git/ never
// matches.
//
// Note: ">&.git/config" (no space) IS caught by the regex because
// \S* matches "&" and then \.git\/ matches ".git/".
// Only the space-separated form "& .git/config" is a bypass.
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 5 [MEDIUM]: >& redirect operator bypasses redirect guard", () => {
	test("(BYPASS) echo corrupt >& .git/config", () => expectGitWrite("echo corrupt >& .git/config"));
	test("(BYPASS) cat /dev/urandom >& .git/HEAD", () => expectGitWrite("cat /dev/urandom >& .git/HEAD"));
	test("(BYPASS) printf 'x' >& .git/config", () => expectGitWrite("printf 'x' >& .git/config"));
	test("(BYPASS) echo x 2>& .git/log", () => expectGitWrite("echo x 2>& .git/log"));

	// Force clobber >| with space after — same gap
	test("(BYPASS) echo corrupt >| .git/config", () => expectGitWrite("echo corrupt >| .git/config"));
	test("(BYPASS) cat /dev/urandom >| .git/HEAD", () => expectGitWrite("cat /dev/urandom >| .git/HEAD"));
	test("(BYPASS) python3 script.py >| .git/config", () => expectGitWrite("python3 script.py >| .git/config"));

	// Correctly caught: no space between operator and path
	test("(CORRECTLY CAUGHT) echo x >&.git/config", () => expectGitWrite("echo x >&.git/config"));
	test("(CORRECTLY CAUGHT) echo x >|.git/config", () => expectGitWrite("echo x >|.git/config"));
	// Standard redirect still caught
	test("(CORRECTLY CAUGHT) echo x > .git/config", () => expectGitWrite("echo x > .git/config"));
});

// ═══════════════════════════════════════════════════════════════
// BYPASS 6: git restore (MEDIUM)
//
// git restore is the modern equivalent of "git checkout -- <path>"
// (added in git 2.23). It's not in DESTRUCTIVE_GIT_COMMANDS.
//   git restore .                          ← discards ALL working tree changes
//   git restore --worktree .               ← explicitly restores working tree
//   git restore --source=HEAD .            ← restores all files to HEAD
//
// Note: git restore --staged file.ts is safe (unstages, no data loss)
// and is already in the existing safe tests.
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 6 [MEDIUM]: git restore destructive forms not blocked", () => {
	test("(BYPASS) git restore .", () => expectDestructive("git restore ."));
	test("(BYPASS) git restore --worktree .", () => expectDestructive("git restore --worktree ."));
	test("(BYPASS) git restore --source=HEAD .", () => expectDestructive("git restore --source=HEAD ."));
	test("(BYPASS) git restore --source=HEAD --worktree .", () =>
		expectDestructive("git restore --source=HEAD --worktree ."));
	test("(BYPASS) git restore src/", () => expectDestructive("git restore src/"));
	test("(BYPASS) git restore -- .", () => expectDestructive("git restore -- ."));
	test("(BYPASS) git restore --worktree src/important.ts", () =>
		expectDestructive("git restore --worktree src/important.ts"));

	// Safe: --staged only unstages, does NOT discard working tree changes
	test("(SAFE) git restore --staged file.ts", () => expectSafe("git restore --staged file.ts"));
	test("(SAFE) git restore --staged .", () => expectSafe("git restore --staged ."));
});

// ═══════════════════════════════════════════════════════════════
// BYPASS 7: git worktree remove --force (MEDIUM)
//
// "git worktree remove --force" forcibly removes a worktree
// directory even if it has uncommitted changes, destroying that work.
// Without --force, git refuses if there are untracked changes.
// Currently treated as SAFE (same as "git worktree remove").
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 7 [MEDIUM]: git worktree remove --force not blocked", () => {
	test("(BYPASS) git worktree remove --force .worktrees/test", () =>
		expectDestructive("git worktree remove --force .worktrees/test"));
	test("(BYPASS) git worktree remove --force worktree-path", () =>
		expectDestructive("git worktree remove --force worktree-path"));
	test("(BYPASS) git worktree remove -f .worktrees/test", () =>
		expectDestructive("git worktree remove -f .worktrees/test"));

	// Safe: without --force it's a normal operation
	test("(SAFE) git worktree remove .worktrees/test", () =>
		expectSafe("git worktree remove .worktrees/test"));
	test("(SAFE) git worktree add .worktrees/feat -b feat", () =>
		expectSafe("git worktree add .worktrees/feat -b feat"));
	test("(SAFE) git worktree list", () => expectSafe("git worktree list"));
	test("(SAFE) git worktree prune", () => expectSafe("git worktree prune"));
});

// ═══════════════════════════════════════════════════════════════
// BYPASS 8: git submodule deinit --force (MEDIUM)
//
// "git submodule deinit --force" removes all submodule content
// from the working tree (like rm -rf of the submodule directory).
// Without --force it fails if there are local modifications.
// Currently treated as SAFE.
// ═══════════════════════════════════════════════════════════════

describe("BYPASS 8 [MEDIUM]: git submodule deinit --force not blocked", () => {
	test("(BYPASS) git submodule deinit --force .", () =>
		expectDestructive("git submodule deinit --force ."));
	test("(BYPASS) git submodule deinit --force lib/dep", () =>
		expectDestructive("git submodule deinit --force lib/dep"));
	test("(BYPASS) git submodule deinit -f lib/dep", () =>
		expectDestructive("git submodule deinit -f lib/dep"));
	test("(BYPASS) git submodule deinit --force --all", () =>
		expectDestructive("git submodule deinit --force --all"));

	// Safe: without --force or just querying
	test("(SAFE) git submodule status", () => expectSafe("git submodule status"));
	test("(SAFE) git submodule init", () => expectSafe("git submodule init"));
	test("(SAFE) git submodule update --init --recursive", () =>
		expectSafe("git submodule update --init --recursive"));
	test("(SAFE) git submodule deinit lib/dep", () => expectSafe("git submodule deinit lib/dep"));
});

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL VECTORS: Verified SAFE (confirm no false positives)
//
// These ensure the new bypass fixes don't over-block common safe usage.
// ═══════════════════════════════════════════════════════════════

describe("Regression: safe -C usage and git config operations", () => {
	// Non-destructive git -C usage (agent workflows like worktree ops)
	test("(SAFE) git -C .worktrees/feat status", () => expectSafe("git -C .worktrees/feat status"));
	test("(SAFE) git -C /tmp/test-repo log --oneline -5", () =>
		expectSafe("git -C /tmp/test-repo log --oneline -5"));
	test("(SAFE) git -C /path commit -m 'fix'", () => expectSafe("git -C /path commit -m 'fix'"));
	test("(SAFE) git -C /path add -A", () => expectSafe("git -C /path add -A"));
	test("(SAFE) git -C /path push origin main", () => expectSafe("git -C /path push origin main"));
	test("(SAFE) git -C /path push --force-with-lease", () =>
		expectSafe("git -C /path push --force-with-lease"));
	test("(SAFE) git -C /path stash", () => expectSafe("git -C /path stash"));
	test("(SAFE) git -C /path rebase main", () => expectSafe("git -C /path rebase main"));
	test("(SAFE) git -C /path merge feature-branch", () =>
		expectSafe("git -C /path merge feature-branch"));
	test("(SAFE) git -C /path checkout feature-branch", () =>
		expectSafe("git -C /path checkout feature-branch"));
	test("(SAFE) git -C /path branch -D old-branch", () =>
		expectSafe("git -C /path branch -D old-branch"));
	test("(SAFE) git -C /path rev-parse --show-toplevel", () =>
		expectSafe("git -C /path rev-parse --show-toplevel"));

	// git --no-pager with safe commands
	test("(SAFE) git --no-pager log --oneline", () => expectSafe("git --no-pager log --oneline"));
	test("(SAFE) git --no-pager diff HEAD", () => expectSafe("git --no-pager diff HEAD"));
});

describe("Regression: async launchers that wrap .git writes (already caught)", () => {
	// These all contain literal rm + .git in the same string, so guards catch them
	test("(CORRECTLY CAUGHT) nohup rm -rf .git/ &", () => expectGitWrite("nohup rm -rf .git/ &"));
	test("(CORRECTLY CAUGHT) screen -dm rm -rf .git/", () => expectGitWrite("screen -dm rm -rf .git/"));
	test("(CORRECTLY CAUGHT) tmux new -d 'rm -rf .git/'", () =>
		expectGitWrite("tmux new -d 'rm -rf .git/'"));
	test("(CORRECTLY CAUGHT) at now <<< 'rm -rf .git/'", () =>
		expectGitWrite("at now <<< 'rm -rf .git/'"));
});

describe("Regression: process substitution (edge case — not actually dangerous in practice)", () => {
	// rm -rf <(echo .git) expands to rm -rf /dev/fd/63, NOT .git
	// So the guard correctly NOT catching this is arguable, but it IS a regex gap
	test("(BYPASS, LOW-RISK) rm -rf <(echo .git)", () => expectGitWrite("rm -rf <(echo .git)"));
	// However, if the content is a full path it would actually work:
	test("(BYPASS) rm -rf $(cat /tmp/target)", () => {
		// $(cat /tmp/target) could expand to .git but is opaque to the guard
		// Testing for awareness — this is a fundamental limitation
		expectGitWrite("rm -rf $(cat /tmp/target)");
	});
});

describe("Regression: git env var prefix still caught", () => {
	// GIT_DIR prefix doesn't bypass — the destructive subcommand still appears
	test("(CORRECTLY CAUGHT) GIT_DIR=/tmp git reset --hard", () =>
		expectDestructive("GIT_DIR=/tmp git reset --hard"));
	test("(CORRECTLY CAUGHT) GIT_DIR=/tmp git clean -fd", () =>
		expectDestructive("GIT_DIR=/tmp git clean -fd"));
	test("(CORRECTLY CAUGHT) GIT_WORK_TREE=/tmp git checkout -- .", () =>
		expectDestructive("GIT_WORK_TREE=/tmp git checkout -- ."));
});

describe("isGitPath: additional edge cases", () => {
	// Worktree .git pointer file (file, not dir) — should still be TRUE
	test(".git as a file (worktree pointer) is still a git path", () =>
		expect(isGitPath(".git")).toBe(true));
	// Various depth paths
	test("deep worktree path", () => expect(isGitPath(".worktrees/feat/.git/config")).toBe(true));
	test("URL-like path with .git", () => expect(isGitPath("user/repo/.git/hooks/pre-push")).toBe(true));
	// Should NOT match
	test(".git-backup is not .git", () => expect(isGitPath(".git-backup/config")).toBe(false));
	test(".git_store is not .git", () => expect(isGitPath(".git_store/HEAD")).toBe(false));
});
