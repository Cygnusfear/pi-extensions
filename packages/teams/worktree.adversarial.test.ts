import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createWorktree,
  resolveGitToplevel,
  removeWorktree,
  workerWorktreePath,
  worktreeBranchName,
} from "./worktree.ts";

function git(args: string[], cwd: string, env?: NodeJS.ProcessEnv): string {
  return execFileSync("git", args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: "utf-8",
  }).trim();
}

function makeCommit(repoDir: string, filename: string, content: string, message: string) {
  fs.mkdirSync(path.dirname(path.join(repoDir, filename)), { recursive: true });
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

function createTestRepo(): string {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-adv-")));
  git(["init", "--initial-branch=main"], tmpDir);
  git(["config", "user.email", "test@test.com"], tmpDir);
  git(["config", "user.name", "Test"], tmpDir);
  makeCommit(tmpDir, "README.md", "# Test repo\n", "initial commit");
  return tmpDir;
}

function createBareRemote(): { sourceDir: string; remoteDir: string } {
  const sourceDir = createTestRepo();
  const remoteDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-remote-")));
  fs.rmSync(remoteDir, { recursive: true, force: true });
  git(["clone", "--bare", sourceDir, remoteDir], path.dirname(sourceDir));
  return { sourceDir, remoteDir };
}

function cloneRepo(remoteDir: string, shallow = false): string {
  const cloneDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-clone-")));
  fs.rmSync(cloneDir, { recursive: true, force: true });
  const remoteUrl = `file://${remoteDir}`;
  const args = shallow ? ["clone", "--depth=1", remoteUrl, cloneDir] : ["clone", remoteUrl, cloneDir];
  git(args, os.tmpdir());
  git(["config", "user.email", "test@test.com"], cloneDir);
  git(["config", "user.name", "Test"], cloneDir);
  return cloneDir;
}

let repoDir: string;
const cleanupRepos: string[] = [];
const cleanupPaths = new Set<string>();

function trackPath(p: string) {
  cleanupPaths.add(p);
}

function trackRepo(p: string) {
  cleanupRepos.push(p);
  cleanupPaths.add(p);
}

beforeEach(() => {
  repoDir = createTestRepo();
  trackRepo(repoDir);
});

afterEach(() => {
  for (const dir of cleanupRepos) {
    try {
      const list = git(["worktree", "list", "--porcelain"], dir);
      const wtPaths = list
        .split("\n")
        .filter((line) => line.startsWith("worktree "))
        .map((line) => line.replace("worktree ", ""))
        .filter((wtPath) => wtPath !== dir);
      for (const wtPath of wtPaths) {
        try {
          git(["worktree", "remove", wtPath, "--force"], dir);
        } catch {}
      }
    } catch {}
  }

  for (const p of cleanupPaths) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch {}
  }

  cleanupRepos.length = 0;
  cleanupPaths.clear();
});

describe("worktree adversarial cases", () => {
  test("concurrent creation from the same baseRef gives each worker the same starting commit", async () => {
    git(["checkout", "-b", "shared-base"], repoDir);
    makeCommit(repoDir, "shared.ts", "export const shared = true;\n", "shared commit");
    const sharedSha = headSha(repoDir);
    git(["checkout", "main"], repoDir);

    const wtA = workerWorktreePath(repoDir, "parallel-a");
    const wtB = workerWorktreePath(repoDir, "parallel-b");

    const [a, b] = await Promise.all([
      createWorktree(repoDir, "parallel-a", "ticket-a", wtA, "shared-base"),
      createWorktree(repoDir, "parallel-b", "ticket-b", wtB, "shared-base"),
    ]);

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(headSha(wtA)).toBe(sharedSha);
    expect(headSha(wtB)).toBe(sharedSha);
    expect(currentBranch(wtA)).toBe("teams/parallel-a/ticket-a");
    expect(currentBranch(wtB)).toBe("teams/parallel-b/ticket-b");
  });

  test("concurrent creation of the same branch name lets only one winner through", async () => {
    const wtA = path.join(repoDir, ".worktrees", "teams", "race-a");
    const wtB = path.join(repoDir, ".worktrees", "teams", "race-b");

    const [a, b] = await Promise.all([
      createWorktree(repoDir, "same-worker", "same-ticket", wtA),
      createWorktree(repoDir, "same-worker", "same-ticket", wtB),
    ]);

    const successes = [a, b].filter((result) => result.success);
    const failures = [a, b].filter((result) => !result.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.error).toBeDefined();

    const winnerPath = successes[0]!.path;
    expect(fs.existsSync(winnerPath)).toBe(true);
    expect(currentBranch(winnerPath)).toBe("teams/same-worker/same-ticket");
  });

  test("default HEAD in detached-head mode branches from the detached commit", async () => {
    makeCommit(repoDir, "second.txt", "second\n", "second commit");
    const detachedSha = git(["rev-parse", "HEAD~1"], repoDir);
    git(["checkout", detachedSha], repoDir);
    expect(currentBranch(repoDir)).toBe("");

    const wtPath = path.join(repoDir, ".worktrees", "teams", "detached-worker");
    const result = await createWorktree(repoDir, "detached-worker", "ticket-detached", wtPath);

    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(detachedSha);
    expect(currentBranch(wtPath)).toBe("teams/detached-worker/ticket-detached");
    expect(fs.existsSync(path.join(wtPath, "second.txt"))).toBe(false);
  });

  test("baseRef can be a remote-tracking branch", async () => {
    const { sourceDir, remoteDir } = createBareRemote();
    trackRepo(sourceDir);
    trackRepo(remoteDir);

    git(["checkout", "-b", "feature-remote"], sourceDir);
    makeCommit(sourceDir, "remote.txt", "remote branch\n", "remote feature commit");
    const remoteFeatureSha = headSha(sourceDir);
    git(["checkout", "main"], sourceDir);
    git(["push", remoteDir, "main", "feature-remote"], sourceDir);

    const cloneDir = cloneRepo(remoteDir);
    trackRepo(cloneDir);

    const remoteBranches = git(["branch", "-r"], cloneDir);
    expect(remoteBranches).toContain("origin/feature-remote");
    expect(git(["branch", "--list", "feature-remote"], cloneDir)).toBe("");

    const wtPath = path.join(cloneDir, ".worktrees", "teams", "remote-worker");
    const result = await createWorktree(
      cloneDir,
      "remote-worker",
      "ticket-remote",
      wtPath,
      "origin/feature-remote",
    );

    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(remoteFeatureSha);
    expect(fs.existsSync(path.join(wtPath, "remote.txt"))).toBe(true);
  });

  test("leftover non-empty worktree path fails without overwriting existing files", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "leftover-worker");
    fs.mkdirSync(wtPath, { recursive: true });
    const sentinelPath = path.join(wtPath, "sentinel.txt");
    fs.writeFileSync(sentinelPath, "do not touch\n");

    const result = await createWorktree(repoDir, "leftover-worker", "ticket-leftover", wtPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fs.readFileSync(sentinelPath, "utf-8")).toBe("do not touch\n");
  });

  test("manual pre-existing branch blocks worktree creation cleanly", async () => {
    const branch = worktreeBranchName("manual-branch", "ticket-manual");
    git(["branch", branch, "main"], repoDir);

    const wtPath = path.join(repoDir, ".worktrees", "teams", "manual-branch");
    const result = await createWorktree(repoDir, "manual-branch", "ticket-manual", wtPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fs.existsSync(wtPath)).toBe(false);
  });

  test("baseRef with shell metacharacters is treated as data, not executed", async () => {
    const markerPath = path.join(os.tmpdir(), `teams-worktree-marker-${process.pid}-${Date.now()}`);
    trackPath(markerPath);
    const evilRef = `main; touch ${markerPath}`;
    const wtPath = path.join(repoDir, ".worktrees", "teams", "evil-ref");

    const result = await createWorktree(repoDir, "evil-ref", "ticket-evil", wtPath, evilRef);

    expect(result.success).toBe(false);
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(fs.existsSync(wtPath)).toBe(false);
  });

  test("very long branch names fail cleanly instead of half-creating a worktree", async () => {
    const workerName = "w".repeat(300);
    const ticketId = "t".repeat(300);
    const wtPath = path.join(repoDir, ".worktrees", "teams", "long-branch-path");

    const result = await createWorktree(repoDir, workerName, ticketId, wtPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fs.existsSync(wtPath)).toBe(false);
  });

  test("merge-base stays anchored to the requested baseRef", async () => {
    git(["checkout", "-b", "feature-merge-base"], repoDir);
    makeCommit(repoDir, "feature.txt", "feature\n", "feature commit 1");
    makeCommit(repoDir, "feature-2.txt", "feature 2\n", "feature commit 2");
    const baseSha = headSha(repoDir);
    git(["checkout", "main"], repoDir);

    const wtPath = path.join(repoDir, ".worktrees", "teams", "merge-base-worker");
    const result = await createWorktree(
      repoDir,
      "merge-base-worker",
      "ticket-merge-base",
      wtPath,
      "feature-merge-base",
    );

    expect(result.success).toBe(true);
    makeCommit(wtPath, "worker.txt", "worker change\n", "worker commit");

    const branch = worktreeBranchName("merge-base-worker", "ticket-merge-base");
    const mergeBase = git(["merge-base", branch, "feature-merge-base"], repoDir);
    expect(mergeBase).toBe(baseSha);
  });

  test("resolveGitToplevel still finds the real repo from a worktree of a worktree", async () => {
    const firstWorktree = path.join(repoDir, ".worktrees", "outer-worker");
    git(["worktree", "add", firstWorktree, "-b", "outer-worker"], repoDir);

    const secondWorktree = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-chain-")));
    trackPath(secondWorktree);
    fs.rmSync(secondWorktree, { recursive: true, force: true });
    git(["worktree", "add", secondWorktree, "-b", "inner-worker"], firstWorktree);

    const nestedDir = path.join(secondWorktree, "src", "deep");
    fs.mkdirSync(nestedDir, { recursive: true });

    const toplevel = await resolveGitToplevel(nestedDir);
    expect(toplevel).toBe(repoDir);
  });

  test("resolveGitToplevel works when the repo is entered through a symlink", async () => {
    const symlinkParent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-symlink-")));
    trackPath(symlinkParent);
    const symlinkPath = path.join(symlinkParent, "repo-link");
    fs.symlinkSync(repoDir, symlinkPath, "dir");

    const toplevel = await resolveGitToplevel(symlinkPath);
    expect(fs.realpathSync(toplevel)).toBe(repoDir);
  });

  test("symlinked .worktrees/teams directory still creates a usable worker worktree", async () => {
    const externalTeamsDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-wt-symlink-target-")));
    trackPath(externalTeamsDir);
    fs.mkdirSync(path.join(repoDir, ".worktrees"), { recursive: true });
    fs.symlinkSync(externalTeamsDir, path.join(repoDir, ".worktrees", "teams"), "dir");

    const wtPath = path.join(repoDir, ".worktrees", "teams", "symlink-worker");
    const result = await createWorktree(repoDir, "symlink-worker", "ticket-symlink", wtPath);

    expect(result.success).toBe(true);
    expect(fs.realpathSync(wtPath).startsWith(externalTeamsDir)).toBe(true);
    expect(headSha(wtPath)).toBe(headSha(repoDir));
  });

  test("baseRef path traversal text is treated literally and fails cleanly", async () => {
    const wtPath = path.join(repoDir, ".worktrees", "teams", "path-traversal-ref");
    const result = await createWorktree(
      repoDir,
      "path-traversal-ref",
      "ticket-path-traversal",
      wtPath,
      "../../../../etc/passwd",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fs.existsSync(wtPath)).toBe(false);
  });

  test("deleted repo directory fails without leaving junk behind", async () => {
    const doomedRepo = createTestRepo();
    trackRepo(doomedRepo);
    fs.rmSync(doomedRepo, { recursive: true, force: true });

    const wtPath = path.join(doomedRepo, ".worktrees", "teams", "gone-worker");
    const result = await createWorktree(doomedRepo, "gone-worker", "ticket-gone", wtPath);

    expect(result.success).toBe(false);
    expect(fs.existsSync(wtPath)).toBe(false);
    await expect(resolveGitToplevel(doomedRepo)).rejects.toThrow();
  });

  test("shallow clones can still create worker worktrees from HEAD", async () => {
    const { sourceDir, remoteDir } = createBareRemote();
    trackRepo(sourceDir);
    trackRepo(remoteDir);

    makeCommit(sourceDir, "shallow.txt", "shallow\n", "shallow source commit");
    git(["push", remoteDir, "main"], sourceDir);

    const shallowClone = cloneRepo(remoteDir, true);
    trackRepo(shallowClone);

    expect(git(["rev-parse", "--is-shallow-repository"], shallowClone)).toBe("true");

    const wtPath = path.join(shallowClone, ".worktrees", "teams", "shallow-worker");
    const result = await createWorktree(shallowClone, "shallow-worker", "ticket-shallow", wtPath);

    expect(result.success).toBe(true);
    expect(headSha(wtPath)).toBe(headSha(shallowClone));
    expect(fs.existsSync(path.join(wtPath, "shallow.txt"))).toBe(true);
  });

  test("removeWorktree can race with a second create without corrupting the repo", async () => {
    const firstPath = path.join(repoDir, ".worktrees", "teams", "cleanup-race");
    const first = await createWorktree(repoDir, "cleanup-race", "ticket-1", firstPath);
    expect(first.success).toBe(true);

    const branch = worktreeBranchName("cleanup-race", "ticket-1");
    const secondPath = path.join(repoDir, ".worktrees", "teams", "cleanup-race-2");

    const [cleanupResult, createResult] = await Promise.all([
      removeWorktree(repoDir, firstPath, branch, false),
      createWorktree(repoDir, "cleanup-race-2", "ticket-2", secondPath),
    ]);

    expect(cleanupResult.success).toBe(true);
    expect(createResult.success).toBe(true);
    expect(fs.existsSync(firstPath)).toBe(false);
    expect(fs.existsSync(secondPath)).toBe(true);
    expect(currentBranch(secondPath)).toBe("teams/cleanup-race-2/ticket-2");
  });
});
