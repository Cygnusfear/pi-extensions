import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path, { join } from "node:path";
import { resolveDeciderHost } from "./decider.ts";
import {
	aggregateGitDecisions,
	collectRepoSnapshot,
	commandDirectory,
	decideGitCommand,
	enumeratedDisaster,
	EMPTY_SNAPSHOT,
	readGitDecisions,
	renderGitDecisionReport,
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
	test("the caller's own guard decides, and the block says why no model answered", async () => {
		const verdict = await decideGitCommand({
			host: null,
			command: "git reset --hard",
			snapshot: EMPTY_SNAPSHOT,
			fallback: () => ({ block: true, reason: "deterministic guard", source: "fallback" }),
		});
		expect(verdict.block).toBe(true);
		expect(verdict.reason).toBe("deterministic guard (decision model unavailable: no classifier host)");
		expect(verdict.failure).toBe("no classifier host");
	});

	test("a degraded decision is recorded with its cause, so it is diagnosable", async () => {
		const dir = join(tmpdir(), `git-decision-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		process.env.PI_GIT_LOCK_STATE_DIR = dir;
		try {
			await decideGitCommand({
				host: resolveDeciderHost({
					classify: () => Promise.resolve({ stopReason: "error", errorMessage: "429 rate limited" }),
				}),
				command: "git reset --hard",
				snapshot: EMPTY_SNAPSHOT,
				fallback: () => null,
			});
			// Recording is fire-and-forget by design: wait for the write instead
			// of assuming it landed in the same tick.
			let records: Awaited<ReturnType<typeof readGitDecisions>> = [];
			for (let attempt = 0; attempt < 40 && records.length === 0; attempt++) {
				await new Promise((resolve) => setTimeout(resolve, 25));
				records = await readGitDecisions();
			}
			expect(records.at(-1)?.source).toBe("fallback");
			expect(records.at(-1)?.error).toBe("429 rate limited");
			const stats = aggregateGitDecisions(records, Date.now() - 60_000);
			expect(stats.byFailure["429 rate limited"]).toBe(1);
			expect(renderGitDecisionReport(stats, 1)).toContain("429 rate limited");
		} finally {
			delete process.env.PI_GIT_LOCK_STATE_DIR;
			await mkdir(dir, { recursive: true }).catch(() => {});
			await rm(dir, { recursive: true, force: true }).catch(() => {});
		}
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

describe("the directory a command acts on", () => {
	test("follows a leading cd, because that is the repository at risk", () => {
		expect(commandDirectory("cd /tmp/other && git reset --hard", "/Users/a/repo")).toBe("/tmp/other");
		expect(commandDirectory("cd '../sibling' && git clean -fd", "/Users/a/repo")).toBe("/Users/a/sibling");
		expect(commandDirectory("cd /tmp/other; git status", "/Users/a/repo")).toBe("/tmp/other");
	});

	test("an explicit cwd on the tool call wins", () => {
		expect(commandDirectory("git status", "/Users/a/repo", "/tmp/explicit")).toBe("/tmp/explicit");
	});

	test("falls back to the session directory", () => {
		expect(commandDirectory("git status", "/Users/a/repo")).toBe("/Users/a/repo");
		expect(commandDirectory("cd /tmp && ls", "/Users/a/repo")).toBe("/tmp");
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
