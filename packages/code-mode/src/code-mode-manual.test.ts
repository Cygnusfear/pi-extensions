import { describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import {
	buildCodeModeManual,
	buildCompactCodeModeReference,
	CODE_MODE_COMPACT_REFERENCE_MAX_BYTES,
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
	test("covers every declaration topic in bounded pages and indexes top-level tools", () => {
		const manual = buildCodeModeManual(declarations);
		expect(manual.pages.map((page) => page.id)).toEqual([
			...CODE_MODE_MANUAL_TOPIC_IDS,
		]);
		for (const page of manual.pages) {
			const rendered = formatCodeModeManualPage(manual, `code-mode/${page.id}`);
			expect(rendered).toContain(page.title);
			expect(Buffer.byteLength(rendered ?? "", "utf8")).toBeLessThanOrEqual(
				CODE_MODE_MANUAL_MAX_BYTES,
			);
		}
		expect(manual.declarations.size).toBeGreaterThan(80);
		expect(manual.declarations.get("Read")).toMatchObject({
			kind: "function",
			topic: "async",
		});
		expect(manual.declarations.get("teams")).toMatchObject({
			kind: "const",
			topic: "teams",
		});
		expect(manual.declarations.get("man")).toMatchObject({
			kind: "function",
			topic: "analysis",
		});
	});

	test("rejects conflicting duplicate declarations instead of silently choosing one", () => {
		const duplicate = declarations.replace(
			"// @code-mode-manual async",
			"declare const Read: unknown;\n\n// @code-mode-manual async",
		);
		expect(() => buildCodeModeManual(duplicate)).toThrow(
			"Duplicate code-mode declaration: Read",
		);
	});

	test("parses inline JSDoc, comment semicolons, strings, and nested function/object types", () => {
		const variant = declarations.replace(
			"declare function man(name: string): Promise<string>;",
			`declare function man(
  /** inline docs; preserve nested syntax **/ name: string,
  transform?: (input: { value: ";"; nested: { ok: boolean } }) => Promise<{ result: string }>,
): Promise<string>;`,
		);
		const manual = buildCodeModeManual(variant);
		expect(manual.declarations.get("man")?.source).toContain(
			"inline docs; preserve nested syntax",
		);
		expect(manual.declarations.get("man")?.source).toContain(
			"Promise<{ result: string }>",
		);
	});

	test("builds an exact, allowed-only compact declaration reference", () => {
		const manual = buildCodeModeManual(declarations);
		const reference = buildCompactCodeModeReference(manual, [
			"Read",
			"rg",
			"Read",
		]);
		expect(reference).toContain("declare function Read");
		expect(reference).toContain("declare function rg");
		expect(reference).toContain("declare function man");
		expect(reference).not.toContain("declare function Bash");
		expect(reference).not.toContain("declare const teams");
		expect(reference.match(/declare function Read/g)).toHaveLength(1);
		expect(Buffer.byteLength(reference, "utf8")).toBeLessThanOrEqual(
			CODE_MODE_COMPACT_REFERENCE_MAX_BYTES,
		);
	});

	test("falls back by whole declaration and never text-truncates large namespaces", () => {
		const manual = buildCodeModeManual(declarations);
		const reference = buildCompactCodeModeReference(
			manual,
			["teams", "mesh", "mai"],
			900,
		);
		expect(Buffer.byteLength(reference, "utf8")).toBeLessThanOrEqual(900);
		expect(reference).toContain('exact declaration: await man("code-mode/');
		expect(reference).not.toContain("declare const teams");
		expect(reference.endsWith("```")).toBe(true);
	});

	test("routes valid runtime-registered names to their live man schema", () => {
		const manual = buildCodeModeManual(declarations);
		const reference = buildCompactCodeModeReference(manual, [
			"futureDynamicTool",
		]);
		expect(reference).toContain("futureDynamicTool — runtime-registered tool");
		expect(reference).toContain('await man("futureDynamicTool")');
	});

	test("fails explicitly when even on-demand pointers cannot meet the requested budget", () => {
		const manual = buildCodeModeManual(declarations);
		expect(() => buildCompactCodeModeReference(manual, ["Read"], 10)).toThrow(
			"cannot fit within 10 bytes",
		);
	});

	test("resolves the manual through the existing man namespace", () => {
		setCodeModeManual(declarations);
		expect(formatManPage("code-mode")).toContain("code-mode/core");
		expect(formatManPage("code-mode/mesh")).toContain(
			"mesh — inter-session communication",
		);
	});

	test("keeps declarations out of an <=8KiB every-turn kernel with exact lookup paths", () => {
		expect(compactPrompt).not.toContain("{{CODE_MODE_DECLARATIONS}}");
		expect(compactPrompt).not.toContain("declare function Read");
		expect(compactPrompt).toContain('man("code-mode")');
		expect(compactPrompt).toContain('man("code-mode/runtime")');
		expect(compactPrompt).toContain(
			"Every `execute_code` call requires `thinking`",
		);
		expect(compactPrompt).toContain("Never foreground-poll");
		const composed = composeCodeModeSystemPrompt(
			"BASE",
			compactPrompt,
			"TOOL REFERENCE",
		);
		expect(composed).toContain("BASE\n\n");
		expect(composed).toContain("TOOL REFERENCE");
		expect(Buffer.byteLength(compactPrompt, "utf8")).toBeLessThanOrEqual(
			8 * 1024,
		);
	});
});
