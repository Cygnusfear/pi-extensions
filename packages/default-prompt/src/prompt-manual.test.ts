import { describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import {
	lookupPromptManual,
	parsePromptManual,
	PROMPT_MANUAL_MAX_BYTES,
	PROMPT_MANUAL_TOPIC_IDS,
} from "./prompt-manual.ts";

const manualSource = fs.readFileSync(
	new URL("../prompts/default-manual.md", import.meta.url),
	"utf8",
);
const compactDefaultPrompt = fs.readFileSync(
	new URL("../prompts/default.md", import.meta.url),
	"utf8",
);
const compactCodeModePrompt = fs.readFileSync(
	new URL("../../code-mode/extensions/code-mode-prompt.md", import.meta.url),
	"utf8",
);

describe("default prompt manual", () => {
	test("keeps the owned every-turn static prompt assets within the budget", () => {
		const staticBytes =
			Buffer.byteLength(compactDefaultPrompt, "utf8") +
			Buffer.byteLength(compactCodeModePrompt, "utf8");
		expect(staticBytes).toBeLessThanOrEqual(48 * 1024);
		expect(compactDefaultPrompt).toContain("prompt_manual");
		expect(compactCodeModePrompt).toContain('man("code-mode")');
	});

	test("has exactly the authoritative bounded topic pages", () => {
		const pages = parsePromptManual(manualSource);
		expect(pages.map((page) => page.id)).toEqual([...PROMPT_MANUAL_TOPIC_IDS]);
		for (const page of pages) {
			const result = lookupPromptManual(manualSource, page.id);
			expect(result.ok).toBe(true);
			if (!result.ok) continue;
			expect(Buffer.byteLength(result.text, "utf8")).toBeLessThanOrEqual(PROMPT_MANUAL_MAX_BYTES);
		}
	});

	test("keeps detailed Telegram delivery semantics in the on-demand page", () => {
		const result = lookupPromptManual(manualSource, "notifications-media");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.text).toContain("Telegram photos to the Hooman via Mesh");
		expect(result.text).toContain("not a URL, blob, base64 payload");
		expect(result.text).toContain("does **not** confirm Telegram uploaded the file or that the Hooman saw it");
	});

	test("offers a bounded index and rejects an unknown topic without guessing", () => {
		const index = lookupPromptManual(manualSource, "index");
		expect(index.ok).toBe(true);
		if (index.ok) expect(index.text).toContain("workspace-status");
		const unknown = lookupPromptManual(manualSource, "invented-topic");
		expect(unknown).toEqual({
			ok: false,
			error: 'Unknown prompt-manual topic "invented-topic". Call prompt_manual({ topic: "index" }) first.',
		});
	});
});
