import { describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import {
	buildCodeModeManual,
	CODE_MODE_MANUAL_MAX_BYTES,
	CODE_MODE_MANUAL_TOPIC_IDS,
	composeCodeModeSystemPrompt,
	formatCodeModeManualPage,
} from "./code-mode-manual.ts";
import { formatManPage, setCodeModeManual } from "./tool-reference.ts";

const declarations = fs.readFileSync(
	new URL("../extensions/code-mode-declarations.md", import.meta.url),
	"utf8",
);
const compactPrompt = fs.readFileSync(
	new URL("../extensions/code-mode-prompt.md", import.meta.url),
	"utf8",
);

describe("code-mode local manual", () => {
	test("covers every declaration topic in bounded pages", () => {
		const manual = buildCodeModeManual(declarations);
		expect(manual.pages.map((page) => page.id)).toEqual([...CODE_MODE_MANUAL_TOPIC_IDS]);
		for (const page of manual.pages) {
			const rendered = formatCodeModeManualPage(manual, `code-mode/${page.id}`);
			expect(rendered).toContain(page.title);
			expect(Buffer.byteLength(rendered ?? "", "utf8")).toBeLessThanOrEqual(CODE_MODE_MANUAL_MAX_BYTES);
		}
	});

	test("resolves the manual through the existing man namespace", () => {
		setCodeModeManual(declarations);
		expect(formatManPage("code-mode")).toContain("code-mode/core");
		expect(formatManPage("code-mode/mesh")).toContain("mesh — inter-session communication");
	});

	test("keeps declarations out of the every-turn prompt while preserving a compact lookup path", () => {
		expect(compactPrompt).not.toContain("{{CODE_MODE_DECLARATIONS}}");
		expect(compactPrompt).toContain('man("code-mode")');
		const composed = composeCodeModeSystemPrompt("BASE", compactPrompt, "TOOL REFERENCE");
		expect(composed).toContain("BASE\n\n");
		expect(composed).toContain("TOOL REFERENCE");
		expect(Buffer.byteLength(compactPrompt, "utf8")).toBeLessThanOrEqual(24 * 1024);
	});
});
