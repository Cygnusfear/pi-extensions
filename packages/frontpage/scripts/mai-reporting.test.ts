import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	createFrontpageTestHarness,
	resultDetails,
	resultText,
} from "./frontpage-test-harness.ts";
import { findGitRoot, resolveMaiCwd } from "../extensions/frontpage.ts";

const createdSlugs: string[] = [];

const uniqueSlug = (tag: string) => {
	const slug = `mai-report-${tag}-${Math.random().toString(36).slice(2, 8)}`;
	createdSlugs.push(slug);
	return slug;
};

const spec = (slug: string) => ({
	slug,
	title: "Mai reporting probe",
	thesis: "Verify mai failures are reported with evidence, not mislabelled.",
	palette: "navy" as const,
	register: "nyt-editorial" as const,
	sections: [{ type: "lead" as const, text: "probe" }],
});

function ctxWith(cwd: string): ExtensionContext {
	return { cwd } as ExtensionContext;
}

function tmpDir(): string {
	return mkdtempSync(path.join(os.tmpdir(), "fp-mai-test-"));
}

function tmpGitRepoRoot(): { root: string; sub: string } {
	const root = tmpDir();
	mkdirSync(path.join(root, ".git"));
	const sub = path.join(root, "nested");
	mkdirSync(sub);
	return { root, sub };
}

afterAll(() => {
	for (const slug of createdSlugs) {
		for (const suffix of [".html", ".meta.json", ".history.jsonl"]) {
			rmSync(
				// Same resolution the tools use, so this stays correct when a test run
				// points the store at a scratch directory.
				path.join(process.env.FRONTPAGE_STORE_DIR ?? path.join(os.homedir(), ".agent", "frontpage"), slug + suffix),
				{ force: true },
			);
		}
	}
});

describe("resolveMaiCwd", () => {
	test("honours FRONTPAGE_MAI_CWD even when the session is outside a repo", () => {
		const dir = tmpDir();
		expect(
			resolveMaiCwd("/definitely/not/a/repo", {
				FRONTPAGE_MAI_CWD: dir,
			}),
		).toBe(dir);
	});

	test("finds the git root above the session cwd", () => {
		const { root, sub } = tmpGitRepoRoot();
		expect(findGitRoot(sub)).toBe(root);
		expect(resolveMaiCwd(sub, {})).toBe(root);
	});

	test("returns the session cwd when no repo exists, so mai's real stderr surfaces", () => {
		const dir = tmpDir();
		expect(resolveMaiCwd(dir, {})).toBe(dir);
	});
});

describe("frontpage_create mai artifact reporting", () => {
	test("non-repo cwd: reports exit code + stderr instead of 'mai unavailable'", async () => {
		const harness = createFrontpageTestHarness();
		harness.setResponder((call) =>
			call.command === "mai"
				? { code: 1, stderr: "mai: not a git repository (or any parent)\n" }
				: { code: 0 },
		);
		const nonRepo = tmpDir();
		const result = await harness.execute(
			"frontpage_create",
			"c1",
			{ spec: spec(uniqueSlug("nonrepo")) },
			ctxWith(nonRepo),
		);
		const text = resultText(result);
		expect(text).toContain("mai artifact NOT recorded");
		expect(text).toContain("exit 1");
		expect(text).toContain("not a git repository");
		expect(text).toContain("FRONTPAGE_MAI_CWD");
		expect(text).not.toContain("mai unavailable");
		const details = resultDetails<{
			artifactId?: string;
			artifactError?: string;
			maiCwd: string;
		}>(result);
		expect(details.artifactId).toBeUndefined();
		expect(details.artifactError).toContain("not a git repository");
		expect(details.maiCwd).toBe(nonRepo);
	});

	test("success: artifact id lands in text + details and mai runs at the repo root", async () => {
		const harness = createFrontpageTestHarness();
		harness.setResponder((call) =>
			call.command === "mai"
				? { code: 0, stdout: "Created pe-ab12cd34\n" }
				: { code: 0 },
		);
		const { root, sub } = tmpGitRepoRoot();
		const result = await harness.execute(
			"frontpage_create",
			"c2",
			{ spec: spec(uniqueSlug("ok")) },
			ctxWith(sub),
		);
		const text = resultText(result);
		expect(text).toContain("mai artifact: pe-ab12cd34");
		expect(text).not.toContain("NOT recorded");
		const details = resultDetails<{
			artifactId?: string;
			artifactError?: unknown;
			maiCwd: string;
		}>(result);
		expect(details.artifactId).toBe("pe-ab12cd34");
		expect(details.artifactError).toBeNull();
		expect(details.maiCwd).toBe(root);
		const maiCall = harness.spawnCalls.find((c) => c.command === "mai");
		expect(maiCall?.cwd).toBe(root);
		expect(maiCall?.args[0]).toBe("artifact");
	});

	test("exit 0 without an id is still reported as failure evidence", async () => {
		const harness = createFrontpageTestHarness();
		harness.setResponder(() => ({ code: 0, stdout: "" }));
		const result = await harness.execute(
			"frontpage_create",
			"c3",
			{ spec: spec(uniqueSlug("noid")) },
			ctxWith(tmpDir()),
		);
		const text = resultText(result);
		expect(text).toContain("mai artifact NOT recorded");
		expect(text).toContain("printed no id");
		expect(text).not.toContain("mai unavailable");
	});
});

describe("frontpage_update mai note reporting", () => {
	test("add-note failure is surfaced instead of claiming the note landed", async () => {
		const harness = createFrontpageTestHarness();
		const slug = uniqueSlug("upd");
		harness.setResponder((call) =>
			call.command === "mai"
				? { code: 0, stdout: "Created pe-1qqpfads\n" }
				: { code: 0 },
		);
		await harness.execute(
			"frontpage_create",
			"u1",
			{ spec: spec(slug) },
			ctxWith(tmpDir()),
		);
		harness.setResponder((call) =>
			call.command === "mai" && call.args[0] === "add-note"
				? { code: 1, stderr: "mai: note not found: pe-1qqpfads\n" }
				: { code: 0, stdout: "Created pe-1qqpfads\n" },
		);
		const result = await harness.execute(
			"frontpage_update",
			"u2",
			{
				slug,
				patch: [{ op: "update_meta", title: "Renamed" }],
				note: "renamed",
			},
			ctxWith(tmpDir()),
		);
		const text = resultText(result);
		expect(text).toContain("mai note NOT added");
		expect(text).toContain("note not found");
		expect(text).not.toContain("mai note added to pe-1qqpfads");
	});
});
