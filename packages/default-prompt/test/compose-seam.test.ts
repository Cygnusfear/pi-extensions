import { describe, expect, test } from "bun:test";
import {
	buildIdentityBlock,
	buildTimeBlock,
	composePromptLayers,
	stripPromptFrontmatter,
} from "../src/compose-default-prompt.ts";

describe("default prompt canonical composition seam", () => {
	test("re-exports pure canonical prompt composition without local behavior", () => {
		const clock = {
			iso: "2026-08-20T00:00:00.000Z",
			local: "Thu, Aug 20, 2026, 12:00 AM UTC",
		};
		expect(stripPromptFrontmatter("---\ntitle: layer\n---\nBody")).toBe("Body");
		const result = composePromptLayers([
			"base",
			null,
			buildTimeBlock(clock),
			buildIdentityBlock("Coordinator", clock),
		]);
		expect(result).toContain("base\n\n## Current time");
		expect(result).toContain(
			"You are **Coordinator** on the mesh. This is your stable name",
		);
		expect(result).toEndWith(
			"Current time: **Thu, Aug 20, 2026, 12:00 AM UTC** (2026-08-20T00:00:00.000Z).",
		);
	});
});
