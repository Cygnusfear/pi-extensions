/**
 * Stress tests for worktree creation logic.
 *
 * These tests create real git repos in temp directories and exercise
 * every scenario that has caused divergence bugs in production:
 * - Branching from repo root (default HEAD)
 * - Branching from an explicit baseRef (branch name, SHA, tag)
 * - Coordinating from inside a worktree (nested worktree prevention)
 * - Coordinating from repo root while targeting a worktree branch
 * - Invalid baseRef handling
 * - Multiple workers branching from the same ref
 * - Worktree cleanup after branch rename
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createWorktree,
  resolveGitToplevel,
  workerWorktreePath,
  worktreeBranchName,
  branchHasNewCommits,
  autoCommitWorktreeChanges,
  removeWorktree,
  renameBranch,
} from "./worktree.ts";

// ── Helpers ──────────────────────────────────────────────────────────────

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();
}

function makeCommit(repoDir: string, filename: string, content: string, message: string) {
  fs.writeFileSync(path.join(repoDir, filename), content);
  git(["add", filename], repoDir);
  git(["commit", "-m", message], repoDir);
}

function headSha(dir: string): string {
  return git(["rev-parse", "HEAD"], dir);
}

function currentBranch(dir: string): string {
  return git(["branch", "--show-current"], dir);
}

/**
 * Create a fresh git repo with an initial commit.
 * Returns the repo path (resolved through symlinks for macOS /tmp → /private/tmp).
 */
function createTestRepo(): string {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-test-")));
  git(["init", "--initial-branch=main"], tmpDir);
  git(["config", "user.email", "test@test.com"], tmpDir);
  git(["config", "user.name", "Test"], tmpDir);
  makeCommit(tmpDir, "README.md", "# Test repo", "initial commit");
  return tmpDir;
}

/**
 * Create a worktree manually (not via our function) to simulate
 * the user/agent having already created one.
 */
function createManualWorktree(repoDir: string, wtPath: string, branch: string): string {
  git(["worktree", "add", wtPath, "-b", branch], repoDir);
  return wtPath;
}

// ── Test state ───────────────────────────────────────────────────────────

let repoDir: string;
const cleanupPaths: string[] = [];

beforeEach(() => {
  repoDir = createTestRepo();
  cleanupPaths.push(repoDir);
});

afterEach(() => {
  // Clean up worktrees before removing dirs (git complains otherwise)
  for (const dir of cleanupPaths) {
    try {
      const list = git(["worktree", "list", "--porcelain"], dir);
      const wtPaths = list
        .split("\n")
        .filter((l) => l.startsWith("worktree "))
        .map((l) => l.replace("worktree ", ""))
        .filter((p) => p !== dir); // skip main worktree
      for (const wt of wtPaths) {
        try { git(["worktree", "remove", wt, "--force"], dir); } catch {}
      }
    } catch {}
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  cleanupPaths.length = 0;
});

// ═════════════════════════════════════════════════════════════════════════
// resolveGitToplevel
// ═════════════════════════════════════════════════════════════════════════

describe("resolveGitToplevel", () => {
  test("returns repo root when called from repo root", async () => {
    const toplevel = await resolveGitToplevel(repoDir);
    expect(toplevel).toBe(repoDir);
  });

  test("returns repo root when called from a subdirectory", async () => {
    const subdir = path.join(repoDir, "src", "deep");
    fs.mkdirSync(subdir, { recursive: true });
    const toplevel = await resolveGitToplevel(subdir);
    expect(toplevel).toBe(repoDir);
  });

  test("returns repo root when called from inside a worktree", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "feature-a");
    createManualWorktree(repoDir, wtPath, "feature-a");
    const toplevel = await resolveGitToplevel(wtPath);
    expect(toplevel).toBe(repoDir);
  });

  test("returns repo root from a subdirectory inside a worktree", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "feature-b");
    createManualWorktree(repoDir, wtPath, "feature-b");
    const subdir = path.join(wtPath, "src");
    fs.mkdirSync(subdir, { recursive: true });
    const toplevel = await resolveGitToplevel(subdir);
    expect(toplevel).toBe(repoDir);
  });

  test("returns repo root from a worktree outside the repo tree", async () => {
    const externalWtPath = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-external-")));
    cleanupPaths.push(externalWtPath);
    fs.rmSync(externalWtPath, { recursive: true }); // git worktree add needs a non-existing path
    git(["worktree", "add", externalWtPath, "-b", "external-wt"], repoDir);
    const toplevel = await resolveGitToplevel(externalWtPath);
    expect(toplevel).toBe(repoDir);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// workerWorktreePath
// ═════════════════════════════════════════════════════════════════════════

describe("workerWorktreePath", () => {
  test("places worktree under .worktrees/teams/<timestamp>-<name>", () => {
    const p = workerWorktreePath("/Projects/repo", "impl-auth", 1776720000000);
    expect(p).toBe("/Projects/repo/.worktrees/teams/1776720000000-impl-auth");
  });

  test("uses toplevel, not worktree path", () => {
    // If someone accidentally passed a worktree path, the result would be nested.
    // The caller should pass the resolved toplevel.
    const toplevel = "/Projects/repo";
    const p = workerWorktreePath(toplevel, "worker-1", 1776720000123);
    expect(p).toBe("/Projects/repo/.worktrees/teams/1776720000123-worker-1");
    expect(p).not.toContain(".worktrees/.worktrees"); // no nesting
  });

  test("same worker name gets different paths when timestamps differ", () => {
    const a = workerWorktreePath("/Projects/repo", "impl-gpt54", 1776720000000);
    const b = workerWorktreePath("/Projects/repo", "impl-gpt54", 1776720001000);
    expect(a).toBe("/Projects/repo/.worktrees/teams/1776720000000-impl-gpt54");
    expect(b).toBe("/Projects/repo/.worktrees/teams/1776720001000-impl-gpt54");
    expect(a).not.toBe(b);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// createWorktree — default HEAD behavior
// ═════════════════════════════════════════════════════════════════════════

describe("createWorktree — default HEAD", () => {
  test("branches from HEAD of the repo when no baseRef given", async () => {
    const mainSha = headSha(repoDir);
    const wtPath = path.join(repoDir, ".worktrees", "teams", "worker-1");

    const result = await createWorktree(repoDir, "worker-1", "ticket-abc", wtPath);
    expect(result.success).toBe(true);
    expect(fs.existsSync(wtPath)).toBe(true);

    // Worker's HEAD should match main's HEAD
    const workerSha = headSha(wtPath);
    expect(workerSha).toBe(mainSha);
  });

  test("uses correct branch naming convention", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "impl-auth");
    const result = await createWorktree(repoDir, "impl-auth", "mai-xyz1", wtPath);

    expect(result.branch).toBe("teams/impl-auth/mai-xyz1");
    expect(currentBranch(wtPath)).toBe("teams/impl-auth/mai-xyz1");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// createWorktree — explicit baseRef (THE MAIN FIX)
// ═════════════════════════════════════════════════════════════════════════

describe("createWorktree — explicit baseRef", () => {
  test("branches from a named branch, not HEAD", async () => {
    // Create a feature branch with extra commits
    git(["checkout", "-b", "feature-x"], repoDir);
    makeCommit(repoDir, "feature.ts", "export const x = 1;", "feature commit");
    const featureSha = headSha(repoDir);
    git(["checkout", "main"], repoDir);

    // main is behind feature-x
    const mainSha = headSha(repoDir);
    expect(mainSha).not.toBe(featureSha);

    // Create worktree from feature-x, while cwd is on main
    const wtPath = path.join(repoDir, ".worktrees", "teams", "worker-1");
    const result = await createWorktree(repoDir, "worker-1", "ticket-1", wtPath, "feature-x");

    expect(result.success).toBe(true);
    const workerSha = headSha(wtPath);
    expect(workerSha).toBe(featureSha); // branched from feature-x, not main
    expect(workerSha).not.toBe(mainSha);

    // Worker should have the feature file
    expect(fs.existsSync(path.join(wtPath, "feature.ts"))).toBe(true);
  });

  test("branches from a SHA", async () => {
    makeCommit(repoDir, "second.txt", "second", "second commit");
    const secondSha = headSha(repoDir);
    makeCommit(repoDir, "third.txt", "third", "third commit");
    const thirdSha = headSha(repoDir);
    expect(secondSha).not.toBe(thirdSha);

    const wtPath = path.join(repoDir, ".worktrees", "teams", "worker-sha");
    const result = await createWorktree(repoDir, "worker-sha", "ticket-2", wtPath, secondSha);

    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(secondSha);
    // Should NOT have third.txt
    expect(fs.existsSync(path.join(wtPath, "third.txt"))).toBe(false);
    // Should have second.txt
    expect(fs.existsSync(path.join(wtPath, "second.txt"))).toBe(true);
  });

  test("branches from a tag", async () => {
    makeCommit(repoDir, "tagged.txt", "tagged", "tagged commit");
    const taggedSha = headSha(repoDir);
    git(["tag", "v1.0.0"], repoDir);
    makeCommit(repoDir, "after-tag.txt", "after", "after tag");

    const wtPath = path.join(repoDir, ".worktrees", "teams", "worker-tag");
    const result = await createWorktree(repoDir, "worker-tag", "ticket-3", wtPath, "v1.0.0");

    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(taggedSha);
    expect(fs.existsSync(path.join(wtPath, "after-tag.txt"))).toBe(false);
  });

  test("fails gracefully with invalid baseRef", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "worker-bad");
    const result = await createWorktree(repoDir, "worker-bad", "ticket-4", wtPath, "nonexistent-branch");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fs.existsSync(wtPath)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// THE CRITICAL SCENARIO: repo root on main, worker should branch from
// a worktree branch — simulating the actual production bug
// ═════════════════════════════════════════════════════════════════════════

describe("production scenario: coordinator in worktree, workers branch correctly", () => {
  test("without baseRef, worker gets main (THE BUG)", async () => {
    // Setup: create a worktree with divergent content
    const cleanroomPath = path.join(repoDir, ".worktrees", "cleanroom");
    createManualWorktree(repoDir, cleanroomPath, "cleanroom");
    makeCommit(cleanroomPath, "cleanroom-only.ts", "// only in cleanroom", "cleanroom work");
    const cleanroomSha = headSha(cleanroomPath);
    const mainSha = headSha(repoDir);
    expect(cleanroomSha).not.toBe(mainSha);

    // BUG: coordinator is in cleanroom but passes repoDir (repo root) without baseRef
    // Worker branches from HEAD of repoDir = main
    const wtPath = path.join(repoDir, ".worktrees", "teams", "worker-bug");
    const result = await createWorktree(repoDir, "worker-bug", "ticket-bug", wtPath);

    expect(result.success).toBe(true);
    const workerSha = headSha(wtPath);
    expect(workerSha).toBe(mainSha); // worker got main, not cleanroom!
    expect(fs.existsSync(path.join(wtPath, "cleanroom-only.ts"))).toBe(false); // missing!
  });

  test("with baseRef, worker gets the right branch (THE FIX)", async () => {
    // Same setup
    const cleanroomPath = path.join(repoDir, ".worktrees", "cleanroom-fix");
    createManualWorktree(repoDir, cleanroomPath, "cleanroom-fix");
    makeCommit(cleanroomPath, "cleanroom-only.ts", "// only in cleanroom", "cleanroom work");
    const cleanroomSha = headSha(cleanroomPath);

    // FIX: pass baseRef = "cleanroom-fix"
    const toplevel = await resolveGitToplevel(repoDir);
    const wtPath = workerWorktreePath(toplevel, "worker-fixed", 1776720000003);
    const result = await createWorktree(toplevel, "worker-fixed", "ticket-fix", wtPath, "cleanroom-fix");

    expect(result.success).toBe(true);
    const workerSha = headSha(wtPath);
    expect(workerSha).toBe(cleanroomSha); // correct!
    expect(fs.existsSync(path.join(wtPath, "cleanroom-only.ts"))).toBe(true); // has the file!
  });

  test("full flow: resolve toplevel from worktree, then create worker worktree", async () => {
    // This simulates: pi launched from inside a worktree
    const cleanroomPath = path.join(repoDir, ".worktrees", "cleanroom-full");
    createManualWorktree(repoDir, cleanroomPath, "cleanroom-full");
    makeCommit(cleanroomPath, "crate1.rs", "fn main() {}", "add crate1");
    makeCommit(cleanroomPath, "crate2.rs", "fn main() {}", "add crate2");
    const cleanroomSha = headSha(cleanroomPath);

    // Pi was launched from cleanroomPath — ctx.cwd = cleanroomPath
    const ctxCwd = cleanroomPath;

    // Step 1: resolve toplevel (should be repoDir, not cleanroomPath)
    const toplevel = await resolveGitToplevel(ctxCwd);
    expect(toplevel).toBe(repoDir);

    // Step 2: create worker worktree at the toplevel (not nested)
    const wtPath = workerWorktreePath(toplevel, "worker-nested", 1776720000004);
    expect(wtPath).toBe(path.join(repoDir, ".worktrees", "teams", "1776720000004-worker-nested"));
    expect(wtPath).not.toContain("cleanroom-full"); // NOT nested inside the coordinator's worktree

    // Step 3: branch from cleanroom-full
    const result = await createWorktree(toplevel, "worker-nested", "ticket-nest", wtPath, "cleanroom-full");
    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(cleanroomSha);
    expect(fs.existsSync(path.join(wtPath, "crate1.rs"))).toBe(true);
    expect(fs.existsSync(path.join(wtPath, "crate2.rs"))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Multiple workers from the same base
// ═════════════════════════════════════════════════════════════════════════

describe("multiple workers", () => {
  test("multiple workers can branch from the same baseRef", async () => {
    git(["checkout", "-b", "shared-base"], repoDir);
    makeCommit(repoDir, "shared.ts", "shared", "shared commit");
    const sharedSha = headSha(repoDir);
    git(["checkout", "main"], repoDir);

    const workers = ["worker-a", "worker-b", "worker-c"];
    for (const name of workers) {
      const wtPath = path.join(repoDir, ".worktrees", "teams", name);
      const result = await createWorktree(repoDir, name, `ticket-${name}`, wtPath, "shared-base");
      expect(result.success).toBe(true);
      expect(headSha(wtPath)).toBe(sharedSha);
      expect(fs.existsSync(path.join(wtPath, "shared.ts"))).toBe(true);
    }

    // Each worker has its own branch
    // git branch --list prefixes with "  " or "+ " (for worktree-checked-out branches)
    const branches = git(["branch", "--list", "teams/*"], repoDir)
      .split("\n")
      .map(b => b.replace(/^[*+\s]+/, "").trim());
    expect(branches).toContain("teams/worker-a/ticket-worker-a");
    expect(branches).toContain("teams/worker-b/ticket-worker-b");
    expect(branches).toContain("teams/worker-c/ticket-worker-c");
  });

  test("workers can diverge independently after branching", async () => {
    git(["checkout", "-b", "base-branch"], repoDir);
    makeCommit(repoDir, "base.ts", "base", "base commit");
    git(["checkout", "main"], repoDir);

    const wtA = path.join(repoDir, ".worktrees", "teams", "diverge-a");
    const wtB = path.join(repoDir, ".worktrees", "teams", "diverge-b");
    await createWorktree(repoDir, "diverge-a", "t-a", wtA, "base-branch");
    await createWorktree(repoDir, "diverge-b", "t-b", wtB, "base-branch");

    // Each worker makes different changes
    makeCommit(wtA, "a-only.ts", "a", "worker a commit");
    makeCommit(wtB, "b-only.ts", "b", "worker b commit");

    expect(fs.existsSync(path.join(wtA, "a-only.ts"))).toBe(true);
    expect(fs.existsSync(path.join(wtA, "b-only.ts"))).toBe(false);
    expect(fs.existsSync(path.join(wtB, "b-only.ts"))).toBe(true);
    expect(fs.existsSync(path.join(wtB, "a-only.ts"))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// branchHasNewCommits
// ═════════════════════════════════════════════════════════════════════════

describe("branchHasNewCommits", () => {
  test("returns false when branch is at same commit as HEAD", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "same-head");
    await createWorktree(repoDir, "same-head", "t-1", wtPath);
    const branch = worktreeBranchName("same-head", "t-1");

    const has = await branchHasNewCommits(repoDir, branch);
    expect(has).toBe(false);
  });

  test("returns true when branch has new commits", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "has-work");
    await createWorktree(repoDir, "has-work", "t-2", wtPath);
    makeCommit(wtPath, "work.ts", "work", "worker did something");
    const branch = worktreeBranchName("has-work", "t-2");

    const has = await branchHasNewCommits(repoDir, branch);
    expect(has).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// autoCommitWorktreeChanges
// ═════════════════════════════════════════════════════════════════════════

describe("autoCommitWorktreeChanges", () => {
  test("commits dirty files in the worktree", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "dirty");
    await createWorktree(repoDir, "dirty", "t-3", wtPath);

    // Leave uncommitted changes
    fs.writeFileSync(path.join(wtPath, "uncommitted.ts"), "dirty");
    const before = git(["status", "--porcelain"], wtPath);
    expect(before).not.toBe("");

    const committed = await autoCommitWorktreeChanges(wtPath);
    expect(committed).toBe(true);

    const after = git(["status", "--porcelain"], wtPath);
    expect(after).toBe("");
  });

  test("returns false when worktree is clean", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "clean");
    await createWorktree(repoDir, "clean", "t-4", wtPath);

    const committed = await autoCommitWorktreeChanges(wtPath);
    expect(committed).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// removeWorktree + renameBranch
// ═════════════════════════════════════════════════════════════════════════

describe("removeWorktree", () => {
  test("removes worktree and deletes branch", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "to-remove");
    await createWorktree(repoDir, "to-remove", "t-5", wtPath);
    const branch = worktreeBranchName("to-remove", "t-5");

    await removeWorktree(repoDir, wtPath, branch, false);

    expect(fs.existsSync(wtPath)).toBe(false);
    const branches = git(["branch", "--list"], repoDir);
    expect(branches).not.toContain(branch);
  });

  test("removes worktree but keeps branch when requested", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "keep-branch");
    await createWorktree(repoDir, "keep-branch", "t-6", wtPath);
    makeCommit(wtPath, "keep.ts", "keep", "keep commit");
    const branch = worktreeBranchName("keep-branch", "t-6");

    await removeWorktree(repoDir, wtPath, branch, true);

    expect(fs.existsSync(wtPath)).toBe(false);
    const branches = git(["branch", "--list"], repoDir);
    expect(branches).toContain("teams/keep-branch/t-6");
  });
});

describe("renameBranch", () => {
  test("renames a branch to .done suffix", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "rename-me");
    await createWorktree(repoDir, "rename-me", "t-7", wtPath);
    makeCommit(wtPath, "done.ts", "done", "done commit");
    const branch = worktreeBranchName("rename-me", "t-7");

    await removeWorktree(repoDir, wtPath, branch, true);
    const renamed = await renameBranch(repoDir, branch, `${branch}.done`);
    expect(renamed).toBe(true);

    const branches = git(["branch", "--list"], repoDir)
      .split("\n")
      .map(b => b.replace(/^[*+\s]+/, "").trim());
    expect(branches).toContain("teams/rename-me/t-7.done");
    expect(branches).not.toContain("teams/rename-me/t-7");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Edge cases
// ═════════════════════════════════════════════════════════════════════════

describe("edge cases", () => {
  test("worktree path containing special characters in ticket id", async () => {
    // Worker names and ticket IDs should be slug-safe, but the path may
    // end up in a directory tree with spaces (e.g. user's home dir).
    // Git handles this fine — the branch name is what matters.
    const wtPath = path.join(repoDir, ".worktrees", "teams", "worker-special");
    const result = await createWorktree(repoDir, "worker-special", "mai-z8x9", wtPath);
    expect(result.success).toBe(true);
    expect(fs.existsSync(wtPath)).toBe(true);
    expect(currentBranch(wtPath)).toBe("teams/worker-special/mai-z8x9");
  });

  test("creating worktree when .worktrees/teams/ does not exist yet", async () => {
    // Fresh repo — no .worktrees dir at all
    const wtPath = path.join(repoDir, ".worktrees", "teams", "first-ever");
    const result = await createWorktree(repoDir, "first-ever", "t-9", wtPath);
    expect(result.success).toBe(true);
    expect(fs.existsSync(wtPath)).toBe(true);
  });

  test("cannot create two worktrees with the same branch name", async () => {
    const wt1 = path.join(repoDir, ".worktrees", "teams", "dup-1");
    const wt2 = path.join(repoDir, ".worktrees", "teams", "dup-2");

    const r1 = await createWorktree(repoDir, "same-name", "same-ticket", wt1);
    expect(r1.success).toBe(true);

    // Same worker name + ticket = same branch name → should fail
    const r2 = await createWorktree(repoDir, "same-name", "same-ticket", wt2);
    expect(r2.success).toBe(false);
  });

  test("baseRef to a branch that is already checked out elsewhere still works", async () => {
    // main is checked out at repoDir. Can we branch FROM main explicitly?
    // git worktree add with a new branch name from an existing ref should work
    const wtPath = path.join(repoDir, ".worktrees", "teams", "from-main");
    const result = await createWorktree(repoDir, "from-main", "t-10", wtPath, "main");
    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(headSha(repoDir));
  });

  test("resolveGitToplevel handles macOS /private/tmp symlink", async () => {
    // On macOS, /tmp is a symlink to /private/tmp. Git may return either form.
    // Our function should return a consistent, real path.
    const toplevel = await resolveGitToplevel(repoDir);
    // The resolved path should be a real directory
    expect(fs.existsSync(toplevel)).toBe(true);
    expect(fs.statSync(toplevel).isDirectory()).toBe(true);
    // And it should contain .git
    expect(fs.existsSync(path.join(toplevel, ".git"))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Integration: full leader-like flow
// ═════════════════════════════════════════════════════════════════════════

describe("integration: simulated leader.delegate() flow", () => {
  test("leader at repo root, agent working in worktree, worker branches correctly", async () => {
    // 1. User creates a worktree for their feature
    const featureWt = path.join(repoDir, ".worktrees", "my-feature");
    createManualWorktree(repoDir, featureWt, "my-feature");
    makeCommit(featureWt, "feature.ts", "export const feature = true;", "feature work");
    makeCommit(featureWt, "types.ts", "export type F = string;", "add types");
    const featureSha = headSha(featureWt);

    // 2. ctx.cwd is the repo root (pi was launched there)
    const ctxCwd = repoDir;

    // 3. Leader resolves toplevel
    const toplevel = await resolveGitToplevel(ctxCwd);

    // 4. Leader creates worker worktree with baseRef
    const wtPath = workerWorktreePath(toplevel, "impl-1", 1776720000001);
    const result = await createWorktree(toplevel, "impl-1", "mai-abc1", wtPath, "my-feature");

    // 5. Verify worker has the right state
    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(featureSha);
    expect(fs.existsSync(path.join(wtPath, "feature.ts"))).toBe(true);
    expect(fs.existsSync(path.join(wtPath, "types.ts"))).toBe(true);

    // 6. Worker does some work
    makeCommit(wtPath, "impl.ts", "// implementation", "implement the thing");

    // 7. Verify the worker's branch has new commits relative to the feature branch
    const branch = worktreeBranchName("impl-1", "mai-abc1");
    // Check from the feature worktree perspective
    const hasWork = await branchHasNewCommits(featureWt, branch);
    expect(hasWork).toBe(true);

    // 8. Cleanup: auto-commit, remove worktree, rename branch
    await removeWorktree(toplevel, wtPath, branch, true);
    await renameBranch(toplevel, branch, `${branch}.done`);

    // 9. Merge worker's branch into the feature branch
    git(["merge", `${branch}.done`, "--no-edit"], featureWt);
    expect(fs.existsSync(path.join(featureWt, "impl.ts"))).toBe(true);
  });

  test("leader inside worktree, worker branches correctly (no nesting)", async () => {
    // 1. User creates a worktree
    const featureWt = path.join(repoDir, ".worktrees", "deep-feature");
    createManualWorktree(repoDir, featureWt, "deep-feature");
    makeCommit(featureWt, "deep.ts", "deep", "deep work");
    const deepSha = headSha(featureWt);

    // 2. ctx.cwd IS the worktree (pi launched from there)
    const ctxCwd = featureWt;

    // 3. Leader resolves toplevel — should be repoDir, not featureWt
    const toplevel = await resolveGitToplevel(ctxCwd);
    expect(toplevel).toBe(repoDir);

    // 4. Worker worktree path is under repoDir, not nested in featureWt
    const wtPath = workerWorktreePath(toplevel, "impl-deep", 1776720000002);
    expect(wtPath.startsWith(repoDir)).toBe(true);
    expect(wtPath).not.toContain("deep-feature");

    // 5. Create with baseRef
    const result = await createWorktree(toplevel, "impl-deep", "mai-deep", wtPath, "deep-feature");
    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(deepSha);
    expect(fs.existsSync(path.join(wtPath, "deep.ts"))).toBe(true);
  });
});
