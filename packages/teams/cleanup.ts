import type { WorkerHandle } from "./types.js";
import { autoCommitWorktreeChanges, branchHasNewCommits, renameBranch, removeWorktree, worktreeBranchName } from "./worktree.js";

export interface CleanupResult {
  /** True by default */
  branchPreserved: boolean;
  /** False by default; true when the worktree is intentionally left in place for inspection. */
  worktreePreserved: boolean;
}

export interface CleanupOptions {
  /** Auto-commit dirty files and keep the branch instead of deleting it. */
  preserveBranch?: boolean;
  /** Keep the worktree on disk for post-mortem inspection instead of removing it. */
  preserveWorktree?: boolean;
}

/**
 * Clean up a worker: kill process, auto-commit uncommitted work, remove worktree,
 * and rename the branch to `*.done` so it's clearly finished.
 *
 * @param preserveBranch - If true, auto-commit any dirty files, keep the branch,
 *                         and rename it to `{branch}.done`. The coordinator is
 *                         responsible for merging.
 */
export async function cleanupWorker(
  repoDir: string,
  worker: WorkerHandle,
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  // Only kill if the caller explicitly requested it (e.g. user /team kill).
  // Do NOT auto-kill here on normal exit assessment — Bun has a bug where
  // child.on("exit") fires prematurely for workers 2+ in rapid spawns.
  // The process is actually STILL ALIVE and running pi. Killing it here
  // destroys workers that would otherwise succeed.
  // The explicit kill path in leader.kill() handles user-initiated kills.
  // if (isProcessAlive(worker.pid)) {
  //   killWorker(worker.pid);
  // }

  const { preserveBranch = true, preserveWorktree = false } = options;

  let branchPreserved = false;
  let worktreePreserved = false;

  if (worker.worktreePath) {
    const branch = worktreeBranchName(worker.name, worker.ticketId);

    if (preserveBranch) {
      await autoCommitWorktreeChanges(worker.worktreePath);
      const hasWork = await branchHasNewCommits(repoDir, branch);
      branchPreserved = hasWork;
      if (preserveWorktree) {
        worktreePreserved = true;
      } else {
        await removeWorktree(repoDir, worker.worktreePath, branch, hasWork);
      }
      if (hasWork && !preserveWorktree) {
        await renameBranch(repoDir, branch, `${branch}.done`);
      }
    } else if (preserveWorktree) {
      worktreePreserved = true;
    } else {
      await removeWorktree(repoDir, worker.worktreePath, branch);
    }
  }

  // Worker sessions are always kept for post-mortem debugging.
  // Previously these were deleted by default, making it impossible
  // to diagnose tool failures, lost tickets, or hallucinated IDs.

  return { branchPreserved, worktreePreserved };
}

export async function cleanupAllWorkers(
  repoDir: string,
  workers: WorkerHandle[],
  preserveBranches = true,
): Promise<CleanupResult[]> {
  return Promise.all(workers.map((w) => cleanupWorker(repoDir, w, { preserveBranch: preserveBranches })));
}
