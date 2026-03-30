/**
 * Tests for git-guards.ts
 *
 * Two categories:
 * - "destructive" — always hard-blocked (git reset --hard, git clean -f, etc.)
 * - "git_write"   — writes to .git dir, needs confirmation
 * - null          — safe, passes through
 */

import { describe, test, expect } from "bun:test";
import { isGitUnsafeBash, isGitPath } from "./git-guards.ts";

function expectDestructive(cmd: string, reasonContains?: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result).not.toBeNull();
	expect(result!.type).toBe("destructive");
	if (reasonContains) {
		expect(result!.reason).toContain(reasonContains);
	}
}

function expectGitWrite(cmd: string, reasonContains?: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result).not.toBeNull();
	expect(result!.type).toBe("git_write");
	if (reasonContains) {
		expect(result!.reason).toContain(reasonContains);
	}
}

function expectSafe(cmd: string) {
	expect(isGitUnsafeBash(cmd)).toBeNull();
}

// ═══════════════════════════════════════════════════════════════
// Destructive commands — always hard-blocked
// ═══════════════════════════════════════════════════════════════

describe("git reset --hard", () => {
	test("blocks git reset --hard", () => expectDestructive("git reset --hard", "reset --hard"));
	test("blocks git reset --hard HEAD~1", () => expectDestructive("git reset --hard HEAD~1", "reset --hard"));
	test("blocks cd foo && git reset --hard", () => expectDestructive("cd /some/repo && git reset --hard", "reset --hard"));
	test("allows git reset --soft", () => expectSafe("git reset --soft HEAD~1"));
	test("allows git reset (no --hard)", () => expectSafe("git reset HEAD file.ts"));
});

describe("git checkout -- (discard changes)", () => {
	test("blocks git checkout -- .", () => expectDestructive("git checkout -- .", "checkout --"));
	test("blocks git checkout -- *", () => expectDestructive("git checkout -- *", "checkout --"));
	test("blocks git checkout -- src/file.ts", () => expectDestructive("git checkout -- src/file.ts", "checkout --"));
	test("blocks git checkout .", () => expectDestructive("git checkout .", "checkout ."));
	test("allows git checkout branch-name", () => expectSafe("git checkout feature-branch"));
	test("allows git checkout -b new-branch", () => expectSafe("git checkout -b new-branch"));
	test("allows git checkout main", () => expectSafe("git checkout main"));
});

describe("git clean", () => {
	test("blocks git clean -fd", () => expectDestructive("git clean -fd", "clean"));
	test("blocks git clean -f", () => expectDestructive("git clean -f", "clean"));
	test("blocks git clean -xfd", () => expectDestructive("git clean -xfd", "clean"));
	test("allows git clean -n (dry run)", () => expectSafe("git clean -n"));
	test("allows git clean --dry-run", () => expectSafe("git clean --dry-run"));
});

describe("git push --force", () => {
	test("blocks git push --force", () => expectDestructive("git push --force", "push --force"));
	test("blocks git push origin main --force", () => expectDestructive("git push origin main --force", "push --force"));
	test("allows git push --force-with-lease", () => expectSafe("git push --force-with-lease"));
	test("allows normal git push", () => expectSafe("git push origin main"));
});

describe("git init", () => {
	test("blocks git init", () => expectDestructive("git init", "git init"));
	test("blocks cd foo && git init", () => expectDestructive("cd /repo && git init", "git init"));
});

// ═══════════════════════════════════════════════════════════════
// .git directory writes — need confirmation
// ═══════════════════════════════════════════════════════════════

describe(".git directory writes", () => {
	test("blocks rm -rf .git/", () => expectGitWrite("rm -rf .git/hooks", "write operation"));
	test("blocks rm .git/config", () => expectGitWrite("rm .git/config", "write operation"));
	test("blocks cp file .git/hooks/pre-commit", () => expectGitWrite("cp file .git/hooks/pre-commit", "write operation"));
	test("blocks mv .git/config .git/config.bak", () => expectGitWrite("mv .git/config .git/config.bak", "write operation"));
	test("blocks chmod +x .git/hooks/pre-commit", () => expectGitWrite("chmod +x .git/hooks/pre-commit", "write operation"));
	test("blocks touch .git/info/exclude", () => expectGitWrite("touch .git/info/exclude", "write operation"));
	test("blocks redirect to .git", () => expectGitWrite("echo stuff > .git/config", "redirect"));
	test("blocks redirect to nested .git", () => expectGitWrite("echo x > /repo/.git/config", "redirect"));
});

// ═══════════════════════════════════════════════════════════════
// Safe commands — NEVER blocked
// ═══════════════════════════════════════════════════════════════

describe("regular git operations (never blocked)", () => {
	test("git status", () => expectSafe("git status"));
	test("git log", () => expectSafe("git log --oneline -5"));
	test("git diff", () => expectSafe("git diff HEAD"));
	test("git diff --cached --stat", () => expectSafe("git diff --cached --stat"));
	test("git branch", () => expectSafe("git branch -a"));
	test("git merge", () => expectSafe("git merge feature-branch"));
	test("git pull --rebase", () => expectSafe("git pull --rebase"));
	test("git fetch", () => expectSafe("git fetch origin"));
	test("git add specific files", () => expectSafe("git add src/file.ts"));
	test("git add -A", () => expectSafe("git add -A"));
	test("git add .", () => expectSafe("git add ."));
	test("git commit", () => expectSafe('git commit -m "fix: something"'));
	test("git commit --no-verify", () => expectSafe('git commit --no-verify -m "msg"'));
	test("git stash", () => expectSafe("git stash"));
	test("git stash push", () => expectSafe("git stash push"));
	test("git stash pop", () => expectSafe("git stash pop"));
	test("git stash list", () => expectSafe("git stash list"));
	test("git worktree add", () => expectSafe("git worktree add .worktrees/test -b test"));
	test("git worktree list", () => expectSafe("git worktree list"));
	test("git rev-parse HEAD", () => expectSafe("git rev-parse HEAD"));
	test("git show HEAD", () => expectSafe("git show HEAD"));
	test("git cherry-pick abc123", () => expectSafe("git cherry-pick abc123"));
	test("git rebase --continue", () => expectSafe("git rebase --continue"));
	test("git switch main", () => expectSafe("git switch main"));
	test("git switch -c new-branch", () => expectSafe("git switch -c new-branch"));
	test("git clone url.git", () => expectSafe("git clone https://github.com/user/repo.git"));
	test("git config --list", () => expectSafe("git config --list --show-origin"));
	test("git push", () => expectSafe("git push"));
	test("git push origin main", () => expectSafe("git push origin main"));
});

describe("read-only .git access (never blocked)", () => {
	test("cat .git/config", () => expectSafe("cat .git/config"));
	test("ls .git/hooks/", () => expectSafe("ls -la .git/hooks/"));
	test("head .git/HEAD", () => expectSafe("head -1 .git/HEAD"));
	test("grep in .git", () => expectSafe("grep -r pattern .git/config"));
	test("rg in project with .git", () => expectSafe("rg -rn 'pattern' /repo/.git/config"));
	test("find .git", () => expectSafe("find .git -name 'config'"));
	test("wc .git/config", () => expectSafe("wc -l .git/config"));
	test("file .git/HEAD", () => expectSafe("file .git/HEAD"));
});

describe("commands mentioning .git incidentally (never blocked)", () => {
	test("grep for .gitignore", () => expectSafe("grep -r pattern .gitignore"));
	test("rg with .git in glob", () => expectSafe("rg -rn 'GIT SAFETY' --glob '*.ts'"));
	test("ls .github", () => expectSafe("ls .github/workflows/"));
	test("echo mentioning .git", () => expectSafe("echo 'the .git folder is important'"));
	test("git add && git commit pipeline", () => expectSafe("git add src/file.ts && git commit -m 'fix'"));
});

// ═══════════════════════════════════════════════════════════════
// Compound commands
// ═══════════════════════════════════════════════════════════════

describe("compound commands", () => {
	test("blocks if any segment is destructive", () => {
		expectDestructive("git status && git reset --hard", "reset --hard");
	});
	test("blocks if any segment writes .git", () => {
		expectGitWrite("cat .git/config && rm .git/config", "write operation");
	});
	test("safe compound stays safe", () => {
		expectSafe("git add src/file.ts && git commit -m 'fix'");
	});
	test("cargo fmt && git add -A && git diff is safe", () => {
		expectSafe("cargo fmt --all && git add -A && git diff --cached --stat");
	});
});

// ═══════════════════════════════════════════════════════════════
// isGitPath
// ═══════════════════════════════════════════════════════════════

describe("isGitPath", () => {
	test("detects .git/config", () => expect(isGitPath(".git/config")).toBe(true));
	test("detects nested .git", () => expect(isGitPath("foo/.git/hooks/pre-commit")).toBe(true));
	test("allows .gitignore", () => expect(isGitPath(".gitignore")).toBe(false));
	test("allows .github", () => expect(isGitPath(".github/workflows/ci.yml")).toBe(false));
	test("allows normal paths", () => expect(isGitPath("src/git-utils.ts")).toBe(false));
});
