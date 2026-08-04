import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { keyHint, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "@sinclair/typebox";
import { renderDiffResult, renderToolResult } from "@pi-extensions/shared/tool-ui-utils";
import { computeContentVersion, computeLineHash, type HashlineEdit } from "../src/hashline-core";
import { runHashEdit, runHashRead, type HashlineHands } from "../src/hashline-hands";
// Local-only side effect: warm Shiki for TUI rendering. Worker slices never import this file.
import "../../shared/src/tui-diff-renderer.ts";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const RST = "\x1b[0m";

const HASHLINE_TOOL_DESCRIPTION = `Hashline tools provide stable, verifiable anchors for file editing.

- hash_read returns file content with each line prefixed as: LINENUM:HASH|LINE
- hash_edit applies structured edits referencing anchors of the form: LINENUM:HASH

If the file changed since last read (hash mismatch), the edit is rejected.

Important: tool arguments are JSON. When edit text needs literal backslashes (for example source code containing \\x1b, \\n, regex escapes, or Windows paths), escape the backslashes for JSON. Raw \\x inside a JSON string is invalid and will fail before hash_edit runs.

If the lines being replaced contain escaped backticks (\\\`), a warning is emitted when the replacement text has unescaped backticks. This commonly happens when editing inside template literals.`;

const HashReadParams = Type.Object({
	path: Type.String({ description: "Path to read. Relative paths resolve from the current working directory; absolute paths retain local Pi compatibility." }),
	startLine: Type.Optional(Type.Integer({ minimum: 1, description: "1-indexed start line (inclusive). Defaults to 1." })),
	endLine: Type.Optional(Type.Integer({ minimum: 1, description: "1-indexed end line (inclusive). Defaults to end of file." })),
});
type HashReadParamsType = Static<typeof HashReadParams>;

const Anchor = Type.String({ description: "Anchor in the form <line>:<hash>, e.g. 12:af" });
const HashlineEditSchema = Type.Union([
	Type.Object({ set_line: Type.Object({ anchor: Anchor, new_text: Type.String({ description: "Replacement text for the line (may contain newlines)." }) }) }),
	Type.Object({ replace_lines: Type.Object({ start_anchor: Anchor, end_anchor: Anchor, new_text: Type.String({ description: "Replacement text for the range (may contain newlines)." }) }) }),
	Type.Object({ insert_after: Type.Object({ anchor: Anchor, text: Type.String({ description: "Text to insert after the referenced line (may contain newlines)." }) }) }),
]);
const HashEditParams = Type.Object({
	path: Type.String({ description: "Path to edit. Relative paths resolve from the current working directory; absolute paths retain local Pi compatibility." }),
	edits: Type.Array(HashlineEditSchema, { description: "List of hashline edits to apply, in order." }),
});
type HashEditParamsType = Static<typeof HashEditParams>;

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw new DOMException("Operation aborted", "AbortError");
}

/** Return stdout only for `diff`'s expected "files differ" exit status. */
export function expectedDiffOutput(error: unknown): string | null {
	if (typeof error !== "object" || error === null || !("status" in error) || error.status !== 1) return null;
	if (!("stdout" in error)) return null;
	const stdout = error.stdout;
	if (typeof stdout === "string") return stdout.length > 0 ? stdout : null;
	if (stdout instanceof Uint8Array && stdout.byteLength > 0) return Buffer.from(stdout).toString("utf-8");
	return null;
}

async function generateUnifiedDiff(displayPath: string, before: string, updated: string): Promise<string> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hash-edit-"));
	const tmpBefore = path.join(tmpDir, "before");
	const tmpAfter = path.join(tmpDir, "after");
	try {
		await fs.writeFile(tmpBefore, before, "utf-8");
		await fs.writeFile(tmpAfter, updated, "utf-8");
		return execFileSync(
			"diff",
			["-u", "--label", `a/${displayPath}`, "--label", `b/${displayPath}`, tmpBefore, tmpAfter],
			{ encoding: "utf-8", timeout: 5000 },
		);
	} catch (error: unknown) {
		const output = expectedDiffOutput(error);
		if (output !== null) return output;
		throw error;
	} finally {
		await fs.rm(tmpDir, { recursive: true, force: true });
	}
}

export function createNodeHashlineHands(cwd: string): HashlineHands {
	return {
		authority: { kind: "host-filesystem" },
		consistency: { kind: "process-local-optimistic" },
		async readText(requestedPath, signal) {
			throwIfAborted(signal);
			const fullPath = path.resolve(cwd, requestedPath);
			const text = await fs.readFile(fullPath, "utf-8");
			throwIfAborted(signal);
			return { path: fullPath, text, version: computeContentVersion(text) };
		},
		async compareAndSwapText(input, signal) {
			return withFileMutationQueue(input.path, async () => {
				throwIfAborted(signal);
				const current = await fs.readFile(input.path, "utf-8");
				if (computeContentVersion(current) !== input.expectedVersion) {
					throw new Error(`File changed after it was read: ${input.displayPath}. Re-read the file and retry.`);
				}
				const diffText = await generateUnifiedDiff(input.displayPath, current, input.updated);
				throwIfAborted(signal);
				await fs.writeFile(input.path, input.updated, "utf-8");
				return {
					changed: true,
					version: computeContentVersion(input.updated),
					diffText,
				};
			});
		},
	};
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "hash_read",
		label: "Hash Read",
		description: HASHLINE_TOOL_DESCRIPTION,
		parameters: HashReadParams,
		renderResult(result, options, theme) {
			const details = result?.details as { path?: string; rawLines?: string[]; startLine?: number } | undefined;
			const filePath = details?.path;
			const rawLines = details?.rawLines;
			const startLine = details?.startLine ?? 1;
			if (filePath && rawLines?.length) {
				try {
					const { extractThemeColors, highlightCode } = require("../../shared/src/tui-diff-renderer.ts");
					const colors = extractThemeColors(theme);
					const highlightedLines = highlightCode(rawLines.join("\n"), filePath) as string[];
					const lastLineNum = startLine + rawLines.length - 1;
					const numW = String(lastLineNum).length;
					const displayPath = filePath.replace(/^.*\//, "");
					const header = `${colors.accent}\x1b[1m${displayPath}${RST} ${colors.dim}· ${rawLines.length} lines${RST}`;
					const body = rawLines.map((rawLine, index) => {
						const lineNum = String(startLine + index).padStart(numW);
						return `${colors.dim}${lineNum}:${computeLineHash(rawLine ?? "")} │${RST} ${highlightedLines[index] ?? rawLine}`;
					}).join("\n");
					const output = `${header}\n${body}`;
					const lines = output.split("\n");
					const hint = keyHint("app.tools.expand", "ctrl+o to expand");
					if (!options.expanded && lines.length > 42) {
						const footer = theme.fg("dim", `... (${lines.length - 42} more lines, ${hint})`);
						return new Text(`${lines.slice(0, 42).join("\n")}\n${footer}`, 0, 0);
					}
					return new Text(output, 0, 0);
				} catch {
					// The generic renderer remains the explicit local fallback.
				}
			}
			return renderToolResult(result, !!options.expanded, theme);
		},
		async execute(_toolCallId, params: HashReadParamsType, signal, _onUpdate, ctx) {
			const outcome = await runHashRead(createNodeHashlineHands(ctx.cwd), params, signal);
			const { formatted, version: _version, ...details } = outcome;
			return {
				content: [{ type: "text", text: formatted }],
				details,
			};
		},
	});

	pi.registerTool({
		name: "hash_edit",
		label: "Hash Edit",
		description: HASHLINE_TOOL_DESCRIPTION,
		parameters: HashEditParams,
		renderResult(result, options, theme) {
			return renderDiffResult(result, !!options.expanded, theme);
		},
		async execute(_toolCallId, params: HashEditParamsType, signal, _onUpdate, ctx) {
			const outcome = await runHashEdit(
				createNodeHashlineHands(ctx.cwd),
				{ path: params.path, edits: params.edits as unknown as HashlineEdit[] },
				signal,
			);
			return {
				content: [{
					type: "text",
					text: outcome.diffText ? `${outcome.summary}\n\n${outcome.diffText}` : outcome.summary,
				}],
				details: {
					path: outcome.path,
					appliedEdits: outcome.appliedEdits,
					changed: outcome.changed,
					diffText: outcome.diffText,
					warnings: outcome.warnings,
				},
			};
		},
	});
}
