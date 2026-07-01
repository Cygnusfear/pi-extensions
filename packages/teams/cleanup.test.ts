/**
 * cleanupWorker branch-retention tests (v1d — branch-orphan-on-teardown fold).
 *
 * A finished worker's deliverable branch MUST survive worktree teardown. v1a lost
 * de44852+18def80 when cleanup `git branch -D`'d the branch on a hasWork miscount
 * (recovered only via `git cat-file`). These tests create real git repos + worktrees
 * and prove the deliverable branch persists (renamed `.done`) on the preserve path,
 * regardless of whether it has commits ahead of HEAD.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cleanupWorker } from "./cleanup.ts";
import { createWorktree, worktreeBranchName } from "./worktree.ts";
import type { WorkerHandle } from "./types.js";

function git(args: string[], cwd: string): string {
	return execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();
}

function branchExists(repoDir: string, branch: string): boolean {
	try {
		git(["rev-parse", "--verify", `refs/heads/${branch}`], repoDir);
		return true;
	} catch {
		return false;
	}
}

function createTestRepo(): string {
	const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "teams-cleanup-test-")));
	git(["init", "--initial-branch=main"], tmpDir);
	git(["config", "user.email", "test@test.com"], tmpDir);
	git(["config", "user.name", "Test"], tmpDir);
	fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test repo");
	git(["add", "README.md"], tmpDir);
	git(["commit", "-m", "initial commit"], tmpDir);
	return tmpDir;
}

function makeWorkerHandle(name: string, ticketId: string, worktreePath: string): WorkerHandle {
	return { name, ticketId, worktreePath } as unknown as WorkerHandle;
}

let repoDir: string;
const cleanupPaths: string[] = [];

beforeEach(() => {
	repoDir = createTestRepo();
	cleanupPaths.push(repoDir);
});

afterEach(() => {
	for (const dir of cleanupPaths) {
		try {
			const list = git(["worktree", "list", "--porcelain"], dir);
			const wtPaths = list.split("\n").filter((l) => l.startsWith("worktree ")).map((l) => l.replace("worktree ", "")).filter((p) => p !== dir);
			for (const wt of wtPaths) { try { git(["worktree", "remove", wt, "--force"], dir); } catch {} }
		} catch {}
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	}
	cleanupPaths.length = 0;
});

describe("cleanupWorker — deliverable branch retention (v1d branch-orphan fold)", () => {
	test("a branch WITH commits persists as .done and reports mergeable work", async () => {
		const name = "impl";
		const ticketId = "pe-branchwork";
		const branch = worktreeBranchName(name, ticketId);
		const wtPath = path.join(repoDir, ".worktrees", "teams", "impl-wt");
		const created = await createWorktree(repoDir, name, ticketId, wtPath, "HEAD");
		expect(created.success).toBe(true);
		// worker does real work on its branch
		fs.writeFileSync(path.join(wtPath, "deliverable.txt"), "the work");
		git(["add", "deliverable.txt"], wtPath);
		git(["commit", "-m", "deliverable commit"], wtPath);

		const result = await cleanupWorker(repoDir, makeWorkerHandle(name, ticketId, wtPath), { preserveBranch: true });

		expect(result.branchHasMergeableWork).toBe(true);
		expect(branchExists(repoDir, `${branch}.done`)).toBe(true);
		// the deliverable commit survives on the .done branch
		const log = git(["log", "--oneline", `${branch}.done`], repoDir);
		expect(log).toContain("deliverable commit");
	});

	test("a branch with NO ahead commits STILL persists as .done — never -D on preserve (the v1a orphan bug)", async () => {
		const name = "noop";
		const ticketId = "pe-noahead";
		const branch = worktreeBranchName(name, ticketId);
		const wtPath = path.join(repoDir, ".worktrees", "teams", "noop-wt");
		// worktree branched from HEAD, worker committed nothing → branchHasNewCommits === false
		const created = await createWorktree(repoDir, name, ticketId, wtPath, "HEAD");
		expect(created.success).toBe(true);

		const result = await cleanupWorker(repoDir, makeWorkerHandle(name, ticketId, wtPath), { preserveBranch: true });

		// no ahead work to merge...
		expect(result.branchHasMergeableWork).toBe(false);
		// ...but the branch was NOT deleted — it persists as .done (retired code -D'd it here)
		expect(branchExists(repoDir, `${branch}.done`)).toBe(true);
		expect(branchExists(repoDir, branch)).toBe(false); // renamed, not left dangling
	});

	test("preserveWorktree keeps the worktree and does not rename the branch", async () => {
		const name = "keep";
		const ticketId = "pe-keepwt";
		const branch = worktreeBranchName(name, ticketId);
		const wtPath = path.join(repoDir, ".worktrees", "teams", "keep-wt");
		await createWorktree(repoDir, name, ticketId, wtPath, "HEAD");
		fs.writeFileSync(path.join(wtPath, "x.txt"), "x");
		git(["add", "x.txt"], wtPath);
		git(["commit", "-m", "keep commit"], wtPath);

		const result = await cleanupWorker(repoDir, makeWorkerHandle(name, ticketId, wtPath), { preserveBranch: true, preserveWorktree: true });

		expect(result.worktreePreserved).toBe(true);
		expect(result.branchHasMergeableWork).toBe(true);
		// worktree left in place → branch keeps its live name
		expect(branchExists(repoDir, branch)).toBe(true);
		expect(fs.existsSync(wtPath)).toBe(true);
	});
});
