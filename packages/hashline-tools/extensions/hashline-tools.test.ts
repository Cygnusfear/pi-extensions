import { describe, expect, test } from "bun:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import hashlineExtension, {
	createNodeHashlineHands,
	expectedDiffOutput,
} from "./hashline-tools";
import { computeLineHash } from "../src/hashline-core";

interface LocalToolResult {
	content: Array<{ type: "text"; text: string }>;
	details: Record<string, unknown>;
}

interface LocalTool {
	name: string;
	execute(
		toolCallId: string,
		params: unknown,
		signal: AbortSignal | undefined,
		onUpdate: undefined,
		context: { cwd: string },
	): Promise<LocalToolResult>;
}

function registerLocalTools(): Map<string, LocalTool> {
	const tools = new Map<string, LocalTool>();
	const pi = {
		registerTool(tool: LocalTool) {
			tools.set(tool.name, tool);
		},
	} as unknown as ExtensionAPI;
	hashlineExtension(pi);
	return tools;
}

describe("local Pi hashline adapter parity", () => {
	test("the real entrypoint reads and edits through the Node adapter without narrowing historic path authority", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "hashline-local-adapter-"));
		try {
			const absolutePath = path.join(cwd, "sample.txt");
			await writeFile(absolutePath, "one\ntwo\n", "utf-8");
			const tools = registerLocalTools();
			const hashRead = tools.get("hash_read");
			const hashEdit = tools.get("hash_edit");
			expect(hashRead).toBeDefined();
			expect(hashEdit).toBeDefined();

			const signal = new AbortController().signal;
			const read = await hashRead?.execute("read-1", { path: "sample.txt" }, signal, undefined, { cwd });
			const expectedRead = [
				`1:${computeLineHash("one")}|one`,
				`2:${computeLineHash("two")}|two`,
				`3:${computeLineHash("")}|`,
			].join("\n");
			expect(Object.keys(read?.details ?? {})).toEqual(["path", "startLine", "endLine", "rawLines"]);
			expect(read).toEqual({
				content: [{ type: "text", text: expectedRead }],
				details: { path: absolutePath, startLine: 1, endLine: null, rawLines: ["one", "two", ""] },
			});

			const edit = await hashEdit?.execute(
				"edit-1",
				{
					path: absolutePath,
					edits: [{ set_line: { anchor: `2:${computeLineHash("two")}`, new_text: "TWO" } }],
				},
				signal,
				undefined,
				{ cwd },
			);
			const expectedDiff = [
				`--- a/${absolutePath}`,
				`+++ b/${absolutePath}`,
				"@@ -1,2 +1,2 @@",
				" one",
				"-two",
				"+TWO",
				"",
			].join("\n");
			const summary = `Applied 1 edit(s) to ${absolutePath}.`;
			expect(Object.keys(edit?.details ?? {})).toEqual(["path", "appliedEdits", "changed", "diffText", "warnings"]);
			expect(edit).toEqual({
				content: [{ type: "text", text: `${summary}\n\n${expectedDiff}` }],
				details: {
					path: absolutePath,
					appliedEdits: 1,
					warnings: [],
					changed: true,
					diffText: expectedDiff,
				},
			});
			expect(await readFile(absolutePath, "utf-8")).toBe("one\nTWO\n");
			await expect(
				hashEdit?.execute(
					"edit-stale",
					{ path: absolutePath, edits: [{ set_line: { anchor: "2:00", new_text: "stale" } }] },
					signal,
					undefined,
					{ cwd },
				),
			).rejects.toThrow(
				`set_line anchor mismatch at line 2: expected 00, got ${computeLineHash("TWO")}. Re-read the file and retry.`,
			);

			const hands = createNodeHashlineHands(cwd);
			expect(hands.authority).toEqual({ kind: "host-filesystem" });
			expect(hands.consistency).toEqual({ kind: "process-local-optimistic" });
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	test("honors cancellation through the real local entrypoint", async () => {
		const tools = registerLocalTools();
		const controller = new AbortController();
		controller.abort();
		await expect(
			tools.get("hash_read")?.execute("read-aborted", { path: "never-read" }, controller.signal, undefined, { cwd: process.cwd() }),
		).rejects.toMatchObject({ name: "AbortError" });
	});

	test("accepts only diff exit status 1 and rejects execution failures", () => {
		expect(expectedDiffOutput({ status: 1, stdout: "unified diff" })).toBe("unified diff");
		expect(expectedDiffOutput({ status: 1, stdout: Buffer.from("buffer diff") })).toBe("buffer diff");
		expect(expectedDiffOutput({ status: 1, stdout: "" })).toBeNull();
		expect(expectedDiffOutput({ status: 1 })).toBeNull();
		expect(expectedDiffOutput({ status: 2, stdout: "bad invocation" })).toBeNull();
		expect(expectedDiffOutput(Object.assign(new Error("missing diff"), { code: "ENOENT" }))).toBeNull();
		expect(expectedDiffOutput(Object.assign(new Error("timed out"), { signal: "SIGTERM" }))).toBeNull();
	});
});
