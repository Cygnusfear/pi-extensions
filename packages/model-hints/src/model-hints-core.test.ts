import { describe, expect, test } from "bun:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import modelHintsExtension from "../extensions/model-hints";
import { applyModelHints } from "./model-hints-core";

describe("applyModelHints", () => {
	test("is a byte-exact no-op for an empty or unrecognized registry", () => {
		expect(applyModelHints("base\n", [])).toBe("base\n");
		expect(
			applyModelHints("base\n", [
				{ provider: "custom", id: "unversioned", name: "Unversioned" },
			]),
		).toBe("base\n");
	});

	test("selects the newest model per provider and family and sorts stably", () => {
		const result = applyModelHints("BASE", [
			{ provider: "openai", id: "gpt-5.1-codex", name: "GPT 5.1 Codex" },
			{ provider: "anthropic", id: "claude-sonnet-4-5", name: "Sonnet 4.5" },
			{ provider: "openai", id: "gpt-5.3-codex", name: "GPT 5.3 Codex" },
			{ provider: "anthropic", id: "claude-sonnet-4-6", name: "Sonnet 4.6" },
			{ provider: "anthropic", id: "claude-sonnet-4-20250514", name: "Pinned" },
		]);

		expect(result).toBe(
			"BASE\n" +
				"## Latest available models\n" +
				"When delegating to workers or switching models, prefer these (newest per family):\n" +
				"- anthropic/claude-sonnet-4-6 (Sonnet 4.6)\n" +
				"- openai/gpt-5.3-codex (GPT 5.3 Codex)",
		);
	});
});


test("local Pi entrypoint delegates byte-exactly to the runtime-neutral core", async () => {
	const models = [
		{ provider: "anthropic", id: "claude-sonnet-4-5", name: "Sonnet 4.5" },
		{ provider: "anthropic", id: "claude-sonnet-4-6", name: "Sonnet 4.6" },
		{ provider: "openai", id: "gpt-5.3-codex", name: "GPT 5.3 Codex" },
	];
	type BeforeAgentStart = (
		event: { systemPrompt: string },
		context: { modelRegistry: { getAvailable(): typeof models } },
	) => Promise<{ systemPrompt: string }>;
	let registered: BeforeAgentStart | undefined;
	const pi = {
		on(event: string, handler: BeforeAgentStart) {
			expect(event).toBe("before_agent_start");
			registered = handler;
		},
	} as unknown as ExtensionAPI;

	modelHintsExtension(pi);
	expect(registered).toBeDefined();
	const systemPrompt = "LOCAL BASE";
	const result = await registered?.(
		{ systemPrompt },
		{ modelRegistry: { getAvailable: () => models } },
	);
	expect(result?.systemPrompt).toBe(applyModelHints(systemPrompt, models));
});