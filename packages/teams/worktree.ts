import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export function worktreeBranchName(workerName: string, ticketId: string): string {
  return `teams/${workerName}/${ticketId}`;
}

/**
 * Resolve the real git toplevel for a directory.
 * If `dir` is inside a worktree, this returns the main repo root — not the worktree path.
 * Worker worktrees are always placed under the toplevel to avoid nesting.
 */
export async function resolveGitToplevel(dir: string): Promise<string> {
  // --show-superproject-working-tree is empty for non-submodules,
  // so we use the commondir approach: .git/commondir points to the shared object store,
  // and its parent is the real repo root.
  try {
    const { stdout } = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: dir });
    const commonDir = stdout.trim(); // e.g. /Projects/trek/.git
    // The toplevel is the parent of the .git common dir
    return path.dirname(commonDir);
  } catch {
    // Fallback: --show-toplevel returns the worktree root when inside a worktree,
    // but it's better than nothing if --git-common-dir fails.
    const { stdout } = await exec("git", ["rev-parse", "--show-toplevel"], { cwd: dir });
    return stdout.trim();
  }
}

export function workerWorktreePath(repoToplevel: string, workerName: string, timestamp: number | string): string {
  return path.join(repoToplevel, ".worktrees", "teams", `${timestamp}-${workerName}`);
}

/**
 * Create a git worktree for a worker, branching from `baseRef`.
 *
 * @param repoDir - Any directory inside the repo (used for git commands).
 * @param workerName - Worker name (used in branch name and worktree path).
 * @param ticketId - Ticket ID (used in branch name).
 * @param worktreePath - Absolute path where the worktree will be created.
 * @param baseRef - Git ref to branch from (branch name, SHA, tag). Defaults to "HEAD".
 *                  When the coordinator is working in a worktree, pass the worktree's
 *                  branch name so the worker branches from the right commit.
 */
export async function createWorktree(
  repoDir: string,
  workerName: string,
  ticketId: string,
  worktreePath: string,
  baseRef = "HEAD",
): Promise<{ success: boolean; path: string; branch: string; error?: string }> {
  const branch = worktreeBranchName(workerName, ticketId);
  try {
    await exec("git", ["worktree", "add", worktreePath, "-b", branch, baseRef], { cwd: repoDir });
    return { success: true, path: worktreePath, branch };
  } catch (err) {
    return { success: false, path: worktreePath, branch, error: String(err) };
  }
}

/**
 * Check if a branch has commits ahead of the current HEAD.
 * Returns true if the branch has work that needs merging.
 */
export async function branchHasNewCommits(repoDir: string, branch: string): Promise<boolean> {
  try {
    const { stdout } = await exec("git", ["rev-list", "--count", `HEAD..${branch}`], {
      cwd: repoDir,
    });
    return parseInt(stdout.trim(), 10) > 0;
  } catch {
    // SAFETY: if we can't verify, assume work exists — never delete what we can't check.
    // A stale branch costs nothing; a lost commit costs everything.
    return true;
  }
}

/**
 * Commit any uncommitted changes in a worktree so nothing is lost on cleanup.
 * Returns true if a commit was made.
 */
export async function autoCommitWorktreeChanges(worktreePath: string): Promise<boolean> {
  try {
    const { stdout } = await exec("git", ["status", "--porcelain"], { cwd: worktreePath });
    if (!stdout.trim()) return false;

    await exec("git", ["add", "-A"], { cwd: worktreePath });
    await exec("git", ["commit", "-m", "auto-commit: uncommitted work preserved on worker close"], {
      cwd: worktreePath,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Rename a git branch. Used to mark finished worker branches as `.done`.
 */
export async function renameBranch(
  repoDir: string,
  oldName: string,
  newName: string,
): Promise<boolean> {
  try {
    await exec("git", ["branch", "-m", oldName, newName], { cwd: repoDir });
    return true;
  } catch {
    return false;
  }
}

export async function removeWorktree(
  repoDir: string,
  worktreePath: string,
  branch: string,
  keepBranch = true,
): Promise<{ success: boolean; error?: string }> {
  try {
    await exec("git", ["worktree", "remove", worktreePath, "--force"], { cwd: repoDir });
  } catch {
    // worktree may already be gone
  }
  if (!keepBranch) {
    try {
      await exec("git", ["branch", "-D", branch], { cwd: repoDir });
    } catch {
      // branch may already be gone
    }
  }
  return { success: true };
}
