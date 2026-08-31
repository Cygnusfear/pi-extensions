import { describe, expect, test } from "bun:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import registerTldrCode from "./tldr-code.ts";

type CapturedTool = {
	name: string;
	parameters: {
		type?: string;
		required?: string[];
		properties: Record<string, unknown>;
	};
};

function registerTools(): Map<string, CapturedTool> {
	const tools = new Map<string, CapturedTool>();
	registerTldrCode({
		on() {},
		registerTool(tool: CapturedTool) {
			tools.set(tool.name, tool);
		},
	} as unknown as ExtensionAPI);
	return tools;
}

function requireTool(tools: Map<string, CapturedTool>, name: string): CapturedTool {
	const tool = tools.get(name);
	if (!tool) throw new Error(`Expected ${name} to be registered`);
	return tool;
}

describe("tldr-code language schemas", () => {
	const tools = registerTools();

	test("tldr_structure keeps its optional provider-safe language enum", () => {
		const tool = requireTool(tools, "tldr_structure");
		expect(tool.parameters).toMatchObject({
			type: "object",
			required: ["path"],
			properties: {
				lang: {
					type: "string",
					enum: ["rust", "typescript", "javascript", "python", "go", "java", "c", "cpp", "ruby"],
				},
			},
		});
	});

	test("tldr_index keeps its optional provider-safe language enum", () => {
		const tool = requireTool(tools, "tldr_index");
		expect(tool.parameters).toMatchObject({
			type: "object",
			properties: {
				lang: {
					type: "string",
					enum: ["rust", "typescript", "javascript", "python", "go", "all"],
				},
			},
		});
		expect(tool.parameters.required).toBeUndefined();
	});
});
