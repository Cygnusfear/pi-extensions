import { describe, expect, test } from "bun:test";
import type { Model, ThinkingLevel } from "@earendil-works/pi-ai";
import { buildRlmStreamOptions, resolveRlmReasoningLevel, runRlm } from "../src/loop";
import type { RlmDeps } from "../src/types";

function makeModel(provider: string, id: string, options: { reasoning?: boolean; thinkingFormat?: string } = {}): Model<any> {
	return {
		id,
		name: id,
		api: "openai-completions",
		provider,
		baseUrl: "https://example.invalid/v1",
		reasoning: options.reasoning ?? true,
		compat: options.thinkingFormat ? { thinkingFormat: options.thinkingFormat } : undefined,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 32_000,
		maxTokens: 4_000,
	} as Model<any>;
}

function assistantReturn(model: Model<any>): any {
	return {
		role: "assistant",
		content: [{
			type: "toolCall",
			id: "rlm-reasoning-return",
			name: "execute_code",
			arguments: { code: "rlm.return({ok:true});" },
		}],
		usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
		stopReason: "toolUse",
		api: model.api,
		provider: model.provider,
		model: model.id,
		timestamp: Date.now(),
	};
}

function makeDeps(model: Model<any>, capture: (reasoning: unknown) => void): RlmDeps {
	return {
		signal: new AbortController().signal,
		cwd: process.cwd(),
		resolveModelRole: () => ({ provider: model.provider, id: model.id }),
		modelRegistry: {
			find: () => model,
			getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "test-key" }),
		} as any,
		completeFn: async (_selected, _context, options) => {
			capture(options?.reasoning);
			return assistantReturn(model);
		},
	} as RlmDeps;
}

describe("RLM reasoning budget", () => {
	test("mandatory Z.AI reasoning defaults to low, including compat-mapped aliases", () => {
		const zai = makeModel("zai", "glm-5.3", { thinkingFormat: "zai" });
		const aliased = makeModel("openrouter", "z-ai/glm-5.3", { thinkingFormat: "zai" });
		expect(resolveRlmReasoningLevel(zai)).toBe("low");
		expect(resolveRlmReasoningLevel(aliased)).toBe("low");
		expect(resolveRlmReasoningLevel(zai, undefined, "off")).toBe("low");
	});

	test("explicit RLM or agent-loop level wins over the Z.AI default", () => {
		const zai = makeModel("zai", "glm-5.3", { thinkingFormat: "zai" });
		expect(resolveRlmReasoningLevel(zai, "high", "medium")).toBe("high");
		expect(resolveRlmReasoningLevel(zai, undefined, "medium")).toBe("medium");
	});

	test("non-Z.AI models preserve the existing provider default unless configured", () => {
		const openai = makeModel("openai", "gpt-5.6", { thinkingFormat: "openai" });
		expect(resolveRlmReasoningLevel(openai)).toBeUndefined();
		expect(resolveRlmReasoningLevel(openai, undefined, "off")).toBeUndefined();
		expect(resolveRlmReasoningLevel(openai, "low")).toBe("low");
	});

	test("streamSimple receives the Z.AI default and caller override", () => {
		const zai = makeModel("zai", "glm-5.3", { thinkingFormat: "zai" });
		expect(buildRlmStreamOptions(zai, undefined).reasoning).toBe("low");
		expect(buildRlmStreamOptions(zai, { reasoning: "medium" }, "high").reasoning).toBe("high");
		const openai = makeModel("openai", "gpt-5.6", { thinkingFormat: "openai" });
		expect(buildRlmStreamOptions(openai, undefined).reasoning).toBeUndefined();
	});

	test("the chosen level reaches RLM completeFn calls", async () => {
		const seen: unknown[] = [];
		const model = makeModel("zai", "glm-5.3", { thinkingFormat: "zai" });
		await runRlm(makeDeps(model, (reasoning) => seen.push(reasoning)), {
			task: "return a marker",
			tools: [],
			model: "zai/glm-5.3",
		});
		expect(seen).toEqual(["low"]);
	});

	test("an explicit RLM level reaches the completion path", async () => {
		const seen: unknown[] = [];
		const model = makeModel("zai", "glm-5.3", { thinkingFormat: "zai" });
		await runRlm(makeDeps(model, (reasoning) => seen.push(reasoning)), {
			task: "return a marker",
			tools: [],
			model: "zai/glm-5.3",
			reasoning: "high",
		});
		expect(seen).toEqual(["high"]);
	});

	test("invalid reasoning levels fail before model execution", async () => {
		let called = false;
		const model = makeModel("zai", "glm-5.3", { thinkingFormat: "zai" });
		const deps = makeDeps(model, () => { called = true; });
		await expect(runRlm(deps, {
			task: "invalid budget",
			tools: [],
			model: "zai/glm-5.3",
			reasoning: "disabled" as ThinkingLevel,
		})).rejects.toThrow("rlm: reasoning must be one of");
		expect(called).toBe(false);
	});
});
