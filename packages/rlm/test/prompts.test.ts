import { describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import { CODE_MODE_COMPACT_REFERENCE_MAX_BYTES } from "@pi-extensions/code-mode/manual";
import { buildSystemPrompt } from "../src/prompts";

const base = {
	task: "map the requested evidence",
	maxIterations: 12,
	maxDepth: 2,
} as const;

describe("RLM progressive-disclosure system prompt", () => {
	test("injects only exact allowed declarations plus automatic man and rlm", () => {
		const prompt = buildSystemPrompt({
			...base,
			tools: ["Read", "rg", "Read"],
		});
		expect(prompt).toContain(
			"Allowed sandbox functions for this task: Read, rg, man, rlm",
		);
		expect(prompt).toContain("declare function Read");
		expect(prompt).toContain("declare function rg");
		expect(prompt).toContain("declare function man");
		expect(prompt).toContain("declare const rlm");
		expect(prompt).not.toContain("declare function Bash");
		expect(prompt).not.toContain("declare const teams");
		expect(prompt).not.toContain("@code-mode-manual");
		expect(prompt).not.toContain("{toolReference}");
		expect(Buffer.byteLength(prompt, "utf8")).toBeLessThanOrEqual(8 * 1024);
	});

	test("keeps broad namespace prompts bounded and points to man instead of truncating declarations", () => {
		const prompt = buildSystemPrompt({
			...base,
			tools: ["teams", "mesh", "mai"],
		});
		expect(prompt).toContain('await man("code-mode/teams")');
		expect(prompt).toContain('await man("code-mode/mesh")');
		expect(prompt).toContain('await man("code-mode/records")');
		expect(Buffer.byteLength(prompt, "utf8")).toBeLessThanOrEqual(
			CODE_MODE_COMPACT_REFERENCE_MAX_BYTES + 3 * 1024,
		);
	});

	test("preserves the structured-return and budget contracts without the full declaration document", () => {
		const prompt = buildSystemPrompt({
			...base,
			tools: [],
			requiredKeys: ["findings", "checkedFiles", "summary"],
		});
		expect(prompt).toContain("findings, checkedFiles, summary");
		expect(prompt).toContain("INCOMPLETE rlm.return beats no return");
		expect(prompt).toContain("`man` is always available");
		expect(Buffer.byteLength(prompt, "utf8")).toBeLessThanOrEqual(6 * 1024);
	});
});
