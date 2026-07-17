import fs from "node:fs";
import type { WorkerHandle } from "./types.js";
import { autoCommitWorktreeChanges, branchHasNewCommits, renameBranch, removeWorktree, worktreeBranchName } from "./worktree.js";

export interface CleanupResult {
  /** True when the preserved deliverable branch has commits ahead of HEAD worth merging.
   *  The deliverable branch ALWAYS persists on the preserve path (renamed to
   *  `{branch}.done`); this flag only drives whether to surface a merge hint. */
  branchHasMergeableWork: boolean;
  /** False by default; true when the worktree is intentionally left in place for inspection. */
  worktreePreserved: boolean;
}

export interface CleanupOptions {
  /** Auto-commit dirty files and keep the branch instead of deleting it. */
  preserveBranch?: boolean;
  /** Keep the worktree on disk for post-mortem inspection instead of removing it. */
  preserveWorktree?: boolean;
  /** Deterministic lifecycle effect identifier used to reconcile auto-commits. */
  effectId?: string;
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

  const { preserveBranch = true, preserveWorktree = false, effectId } = options;

  let branchHasMergeableWork = false;
  let worktreePreserved = false;

  if (worker.worktreePath) {
    const branch = worktreeBranchName(worker.name, worker.ticketId);
    const worktreeExists = fs.existsSync(worker.worktreePath);

    if (preserveBranch) {
      if (worktreeExists && !preserveWorktree) await autoCommitWorktreeChanges(worker.worktreePath, effectId);
      // The deliverable branch ALWAYS persists through teardown — a finished worker's
      // branch must survive worktree removal. The effect is idempotent after a crash:
      // an absent worktree plus an already-renamed .done branch is completion.
      branchHasMergeableWork = await branchHasNewCommits(repoDir, branch);
      if (preserveWorktree && worktreeExists) {
        worktreePreserved = true;
      } else {
        const removed = await removeWorktree(repoDir, worker.worktreePath, branch, /* keepBranch */ true);
        if (!removed.success) throw new Error(removed.error ?? `Failed to remove worktree ${worker.worktreePath}`);
        const renamed = await renameBranch(repoDir, branch, `${branch}.done`);
        if (!renamed) throw new Error(`Failed to preserve worker branch ${branch} as ${branch}.done`);
      }
    } else if (preserveWorktree && worktreeExists) {
      worktreePreserved = true;
    } else {
      const removed = await removeWorktree(repoDir, worker.worktreePath, branch, /* keepBranch */ false);
      if (!removed.success) throw new Error(removed.error ?? `Failed to remove worktree ${worker.worktreePath}`);
    }
  }

  // Worker sessions are always kept for post-mortem debugging.
  // Previously these were deleted by default, making it impossible
  // to diagnose tool failures, lost tickets, or hallucinated IDs.

  return { branchHasMergeableWork, worktreePreserved };
}

export async function cleanupAllWorkers(
  repoDir: string,
  workers: WorkerHandle[],
  preserveBranches = true,
): Promise<CleanupResult[]> {
  return Promise.all(workers.map((w) => cleanupWorker(repoDir, w, { preserveBranch: preserveBranches })));
}
