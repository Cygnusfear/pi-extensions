import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveDeciderHost } from "./decider.ts";
import {
	collectRepoSnapshot,
	decideGitCommand,
	enumeratedDisaster,
	EMPTY_SNAPSHOT,
} from "./git-decision.ts";

const hostAnswering = (answers: Record<string, number>, onCall?: (state: unknown) => void) =>
	resolveDeciderHost({
		classify: (_model: unknown, context: unknown) => {
			onCall?.(context);
			return Promise.resolve({
				answers: Object.fromEntries(Object.entries(answers).map(([key, probability]) => [key, { probability }])),
				stopReason: "stop",
			});
		},
	});

describe("enumerated disasters", () => {
	test("the recovery-path destroyers and published-ref deletions are caught without a model", () => {
		expect(enumeratedDisaster("git reflog expire --expire=now --all")).toContain("reflog");
		expect(enumeratedDisaster("git gc --prune=now")).toContain("prunes unreachable");
		expect(enumeratedDisaster("git prune --expire=now")).toContain("prunes unreachable");
		expect(enumeratedDisaster("git tag -d v1.0")).toContain("tag");
	});

	test("ordinary git commands are not enumerated", () => {
		for (const command of ["git status", "git gc", "git prune", "git commit -m x", "git stash"]) {
			expect(enumeratedDisaster(command)).toBeNull();
		}
	});

	test("a disaster blocks without calling the model at all", async () => {
		let called = false;
		const verdict = await decideGitCommand({
			host: hostAnswering({ unrecoverable_loss: 0.99 }, () => {
				called = true;
			}),
			command: "git reflog expire --expire=now --all",
			snapshot: EMPTY_SNAPSHOT,
			fallback: () => null,
		});
		expect(verdict.block).toBe(true);
		expect(verdict.source).toBe("enum");
		expect(called).toBe(false);
	});
});

describe("verdicts", () => {
	test("blocks when work would exist nowhere else", async () => {
		const verdict = await decideGitCommand({
			host: hostAnswering({ unrecoverable_loss: 0.976 }),
			command: "git reset --hard HEAD~1",
			snapshot: { ...EMPTY_SNAPSHOT, dirtyFiles: 4 },
			fallback: () => null,
		});
		expect(verdict.block).toBe(true);
		expect(verdict.source).toBe("unrecoverable_loss");
		expect(verdict.reason).toContain("stash");
	});

	test("allows the same command on a clean tree", async () => {
		const verdict = await decideGitCommand({
			host: hostAnswering({ unrecoverable_loss: 0.001, repository_corruption: 0.005, shared_history_damage: 0.002 }),
			command: "git reset --hard HEAD~1",
			snapshot: EMPTY_SNAPSHOT,
			fallback: () => null,
		});
		expect(verdict.block).toBe(false);
	});

	test("blocks a .git path write on the corruption axis", async () => {
		const verdict = await decideGitCommand({
			host: hostAnswering({ repository_corruption: 1 }),
			command: "rm -f .git/config",
			snapshot: EMPTY_SNAPSHOT,
			fallback: () => null,
		});
		expect(verdict.block).toBe(true);
		expect(verdict.source).toBe("repository_corruption");
	});

	test("hands the repository state to the model", async () => {
		let seen = "";
		await decideGitCommand({
			host: hostAnswering({ unrecoverable_loss: 0 }, (context) => {
				seen = JSON.stringify(context);
			}),
			command: "git clean -fd",
			snapshot: { ...EMPTY_SNAPSHOT, untrackedFiles: 12 },
			fallback: () => null,
		});
		expect(seen).toContain("\"untrackedFiles\":12");
	});
});

describe("when no decision can be made", () => {
	test("the caller's own guard decides", async () => {
		const verdict = await decideGitCommand({
			host: null,
			command: "git reset --hard",
			snapshot: EMPTY_SNAPSHOT,
			fallback: () => ({ block: true, reason: "deterministic guard", source: "fallback" }),
		});
		expect(verdict.block).toBe(true);
		expect(verdict.reason).toBe("deterministic guard");
	});

	test("with no fallback either, the command is allowed — never blocked on a guess", async () => {
		const verdict = await decideGitCommand({
			host: null,
			command: "git status",
			snapshot: EMPTY_SNAPSHOT,
			fallback: () => null,
		});
		expect(verdict.block).toBe(false);
	});
});

describe("repository snapshot", () => {
	test("reads an empty snapshot outside a repository", async () => {
		const dir = mkdtempSync(path.join(tmpdir(), "git-decision-norepo-"));
		expect(await collectRepoSnapshot(dir)).toEqual(EMPTY_SNAPSHOT);
	});

	test("counts untracked files and names the branch in a real repo", async () => {
		const dir = mkdtempSync(path.join(tmpdir(), "git-decision-repo-"));
		const { execFileSync } = await import("node:child_process");
		execFileSync("git", ["init", "-q"], { cwd: dir });
		writeFileSync(path.join(dir, "scratch.txt"), "work in progress\n");
		const snapshot = await collectRepoSnapshot(dir);
		expect(snapshot.untrackedFiles).toBe(1);
		expect(snapshot.dirtyFiles).toBe(0);
		expect(snapshot.branch.length).toBeGreaterThan(0);
		expect(snapshot.branchPushed).toBe(false);
		expect(snapshot.stashes).toBe(0);
	});
});
