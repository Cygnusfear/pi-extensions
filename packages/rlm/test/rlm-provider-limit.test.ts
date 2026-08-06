import { afterEach, describe, expect, test } from "bun:test";
import { runRlm } from "../src/loop";
import { cancelAllRlmHandles } from "../src/handle";

const bt = String.fromCharCode(96);
const js = (code: string) => bt.repeat(3) + "javascript\n" + code + "\n" + bt.repeat(3);
const model = { provider: "test", id: "test-model" };
const repoRoot = new URL("../../..", import.meta.url).pathname;

let completeMock: ((m: unknown, r: any, a: any) => any) | undefined;
function deps(overrides: Record<string, unknown> = {}) {
	const ac = new AbortController();
	return {
		signal: ac.signal,
		cwd: repoRoot,
		parentModel: model,
		modelRegistry: {
			find: (p: string, id: string) => ({ provider: p, id }),
			getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "key", headers: { h: "v" } }),
		},
		completeFn: completeMock,
		...overrides,
	} as any;
}
function setComplete(fn: typeof completeMock) { completeMock = fn; }
function resp(text: string, usage = { input: 1, output: 1 }, stopReason = "stop") {
	return { role: "assistant", content: [{ type: "text", text }], usage, stopReason, provider: "test", model: "test-model", api: "test", timestamp: Date.now() } as any;
}
function contentFromText(text: string) {
	const m = text.match(/^```(?:javascript|js|typescript|ts)\n([\s\S]*)\n```$/);
	if (m) return [{ type: "toolCall", id: "tool-1", name: "execute_code", arguments: { code: m[1] } }];
	return [{ type: "text", text }];
}
function respTool(text: string, usage = { input: 1, output: 1 }, stopReason = "stop") {
	return { role: "assistant", content: contentFromText(text), usage, stopReason, provider: "test", model: "test-model", api: "test", timestamp: Date.now() } as any;
}
afterEach(() => { completeMock = undefined; cancelAllRlmHandles(new Error("cleanup")); });

describe("rlm provider-limit notify", () => {
	test("rate-limit error fires exactly one parent-owned notice", async () => {
		const notices: any[] = [];
		let call = 0;
		setComplete(() => {
			call++;
			if (call === 1) return { role: "assistant", content: [{ type: "text", text: "" }], usage: { input: 1, output: 1 }, stopReason: "error", errorMessage: "HTTP 429 Too Many Requests", provider: "test", model: "test-model", api: "test", timestamp: Date.now() } as any;
			return respTool(js("rlm.return({ok:true});"));
		});
		const d = deps({ parentSession: { id: "p1", name: "investigate" }, notifyProviderLimit: (n) => notices.push(n) });
		await expect(runRlm(d, { task: "rate", tools: [], identity: "evidence-map" }, 0)).rejects.toThrow("HTTP 429");
		expect(notices).toHaveLength(1);
		expect(notices[0].kind).toBe("rate_limited");
		expect(notices[0].operation).toBe("rlm");
		expect(notices[0].model).toBe("test/test-model");
		expect(notices[0].failed.sessionName).toBe("investigate");
		expect(notices[0].rlmIdentity).toBe("evidence-map");
	});

	test("quota error is classified distinctly from a transient rate limit", async () => {
		const notices: any[] = [];
		setComplete(() => ({ role: "assistant", content: [{ type: "text", text: "" }], usage: { input: 1, output: 1 }, stopReason: "error", errorMessage: "5-hour usage limit reached", provider: "test", model: "test-model", api: "test", timestamp: Date.now() } as any));
		const d = deps({ parentSession: { id: "p1" }, notifyProviderLimit: (n) => notices.push(n) });
		await expect(runRlm(d, { task: "q", tools: [] }, 0)).rejects.toThrow("5-hour usage limit");
		expect(notices).toHaveLength(1);
		expect(notices[0].kind).toBe("quota");
	});

	test("non-limit error produces NO provider-limit notice", async () => {
		const notices: any[] = [];
		setComplete(() => respTool("plain prose"));
		await expect(runRlm(deps({ notifyProviderLimit: (n) => notices.push(n) }), { task: "x", tools: [] }, 0)).rejects.toThrow("agent finished without rlm.return");
		expect(notices).toHaveLength(0);
	});

	test("no notifier present still rejects cleanly (parent without callback)", async () => {
		setComplete(() => ({ role: "assistant", content: [{ type: "text", text: "" }], usage: { input: 1, output: 1 }, stopReason: "error", errorMessage: "HTTP 429 Too Many Requests", provider: "test", model: "test-model", api: "test", timestamp: Date.now() } as any));
		await expect(runRlm(deps(), { task: "rate", tools: [] }, 0)).rejects.toThrow("HTTP 429");
	});
});
