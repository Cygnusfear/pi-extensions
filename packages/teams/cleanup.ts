import { rm } from "node:fs/promises";
import { isProcessAlive, killWorker } from "./spawner.js";
import type { WorkerHandle } from "./types.js";
import { autoCommitWorktreeChanges, branchHasNewCommits, renameBranch, removeWorktree, worktreeBranchName } from "./worktree.js";

export interface CleanupResult {
  /** True by default */
  branchPreserved: boolean;
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
  preserveBranch = true,
): Promise<CleanupResult> {
  if (isProcessAlive(worker.pid)) {
    killWorker(worker.pid);
  }

  let branchPreserved = false;

  if (worker.worktreePath) {
    const branch = worktreeBranchName(worker.name, worker.ticketId);

    if (preserveBranch) {
      await autoCommitWorktreeChanges(worker.worktreePath);
      const hasWork = await branchHasNewCommits(repoDir, branch);
      branchPreserved = hasWork;
      await removeWorktree(repoDir, worker.worktreePath, branch, hasWork);
      if (hasWork) {
        await renameBranch(repoDir, branch, `${branch}.done`);
      }
    } else {
      await removeWorktree(repoDir, worker.worktreePath, branch);
    }
  }

  // Worker sessions are always kept for post-mortem debugging.
  // Previously these were deleted by default, making it impossible
  // to diagnose tool failures, lost tickets, or hallucinated IDs.

  return { branchPreserved };
}

export async function cleanupAllWorkers(
  repoDir: string,
  workers: WorkerHandle[],
  preserveBranches = true,
): Promise<CleanupResult[]> {
  return Promise.all(workers.map((w) => cleanupWorker(repoDir, w, preserveBranches)));
}
