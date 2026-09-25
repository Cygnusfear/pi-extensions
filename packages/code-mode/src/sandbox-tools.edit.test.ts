import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createToolBindings } from "./sandbox-tools.ts";

type EditFailure = { index: number; matches: number; reason: string; anchorPreview: string };
type EditResult = {
	matched: boolean;
	changed?: boolean;
	applied?: number;
	path?: string;
	error?: string;
	failures?: EditFailure[];
};

type EditCall = (params: {
	path: string;
	edits: Array<{ oldText: string; newText: string }>;
}) => Promise<EditResult>;

const roots: string[] = [];

function fixture(content: string): { root: string; file: string; edit: EditCall } {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "code-mode-edit-"));
	roots.push(root);
	const file = path.join(root, "README.md");
	fs.writeFileSync(file, content, "utf8");
	const bindings = createToolBindings({ cwd: root, images: [] });
	return { root, file, edit: bindings.Edit as EditCall };
}

afterEach(() => {
	while (roots.length > 0) {
		const root = roots.pop();
		if (root) fs.rmSync(root, { recursive: true, force: true });
	}
});

describe("sandbox Edit batch contract", () => {
	test("applies multiple exact anchors against the original file in one write", async () => {
		const original = "      dataloader-helpdesk/     one deployable worker per consumer\nkeep this\nversion pin\n";
		const { file, edit } = fixture(original);
		const result = await edit({
			path: file,
			edits: [
				{
					oldText: "      dataloader-helpdesk/     one deployable worker per consumer",
					newText: "      dataloader-helpdesk/     one deployable worker per consumer\n      triage/                  shared library",
				},
				{ oldText: "version pin", newText: "shared version pin" },
			],
		});
		expect(result).toMatchObject({ matched: true, changed: true, applied: 2 });
		expect(fs.readFileSync(file, "utf8")).toBe(
			"      dataloader-helpdesk/     one deployable worker per consumer\n      triage/                  shared library\nkeep this\nshared version pin\n",
		);
	});

	test("reports zero and duplicate matches by edit index without partial writes", async () => {
		const original = "unique anchor\nduplicate\nduplicate\n";
		const { file, edit } = fixture(original);
		const result = await edit({
			path: file,
			edits: [
				{ oldText: "unique anchor", newText: "changed" },
				{ oldText: "missing anchor", newText: "new" },
				{ oldText: "duplicate", newText: "replaced" },
			],
		});
		expect(result.matched).toBe(false);
		expect(result.failures).toEqual([
			{ index: 1, matches: 0, reason: "anchor not found", anchorPreview: "missing anchor" },
			{ index: 2, matches: 2, reason: "anchor must occur exactly once in the original file", anchorPreview: "duplicate" },
		]);
		expect(fs.readFileSync(file, "utf8")).toBe(original);
	});

	test("rejects malformed entries without partially applying valid siblings", async () => {
		const original = "keep\nother\n";
		const cases = [
			{ edit: { oldText: "", newText: "replacement" }, anchorPreview: "" },
			{ edit: { oldText: "keep", newText: 42 }, anchorPreview: "keep" },
		];
		for (const scenario of cases) {
			const { file, edit } = fixture(original);
			const result = await (edit as any)({
				path: file,
				edits: [{ oldText: "other", newText: "changed" }, scenario.edit],
			});
			expect(result.matched).toBe(false);
			expect(result.failures).toEqual([{
				index: 1,
				matches: 0,
				reason: "oldText must be a non-empty string and newText must be a string",
				anchorPreview: scenario.anchorPreview,
			}]);
			expect(fs.readFileSync(file, "utf8")).toBe(original);
		}
	});

	test("rejects overlapping edits before writing", async () => {
		const original = "abcdef\n";
		const { file, edit } = fixture(original);
		const result = await edit({
			path: file,
			edits: [
				{ oldText: "abcde", newText: "ABCDE" },
				{ oldText: "cdef", newText: "CDEF" },
			],
		});
		expect(result.matched).toBe(false);
		expect(result.failures).toEqual([
			{ index: 1, matches: 1, reason: "edit overlaps edit[0]", anchorPreview: "cdef" },
		]);
		expect(fs.readFileSync(file, "utf8")).toBe(original);
	});

	test("allows a no-op anchor alongside a real edit", async () => {
		const original = "title\nbody\n";
		const { file, edit } = fixture(original);
		const result = await edit({
			path: file,
			edits: [
				{ oldText: "title", newText: "title" },
				{ oldText: "body", newText: "updated body" },
			],
		});
		expect(result).toMatchObject({ matched: true, changed: true, applied: 1 });
		expect(fs.readFileSync(file, "utf8")).toBe("title\nupdated body\n");
	});

	test("a batch of matching no-ops reports success without writing", async () => {
		const original = "unchanged\n";
		const { file, edit } = fixture(original);
		const result = await edit({ path: file, edits: [{ oldText: "unchanged", newText: "unchanged" }] });
		expect(result).toMatchObject({ matched: true, changed: false, applied: 0 });
		expect(fs.readFileSync(file, "utf8")).toBe(original);
	});

	test("a singular oldText/newText payload fails with the expected shape", async () => {
		const { file, edit } = fixture("anchor\n");
		const result = await (edit as any)({ path: file, oldText: "anchor", newText: "changed" });
		expect(result).toMatchObject({ matched: false, error: "Edit expects a non-empty edits[] array of { oldText, newText } entries." });
		expect(fs.readFileSync(file, "utf8")).toBe("anchor\n");
	});
});
