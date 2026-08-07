import { describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";

async function loadPromptManualTool() {
	const { default: register } = await import("./default-prompt.ts?manual-test=" + Math.random());
	let tool: any;
	register({
		on() {},
		registerTool(definition: any) {
			tool = definition;
		},
	} as any);
	return tool;
}

describe("prompt_manual tool", () => {
	test("serves a local index and a bounded detailed page", async () => {
		const tool = await loadPromptManualTool();
		expect(tool.name).toBe("prompt_manual");

		const index = await tool.execute("manual-index", { topic: "index" });
		expect(index.isError).toBeUndefined();
		expect(index.content[0].text).toContain("workspace-status");

		const media = await tool.execute("manual-media", { topic: "notifications-media" });
		expect(media.isError).toBeUndefined();
		expect(media.content[0].text).toContain("Telegram photos to the Hooman via Mesh");
		expect(Buffer.byteLength(media.content[0].text, "utf8")).toBeLessThanOrEqual(14 * 1024);
	});
});
