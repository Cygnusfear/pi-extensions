import { afterEach, describe, expect, test } from "bun:test";
import { runRlm } from "../src/loop";
import { cancelAllRlmHandles, createRlmHandle } from "../src/handle";
import type { RlmHandle } from "../src/types";

type CompleteMock = (model: unknown, request: any, auth: any) => Promise<any> | any;
const bt = String.fromCharCode(96);
const js = (code: string) => bt.repeat(3) + "javascript\n" + code + "\n" + bt.repeat(3);
const model = { provider: "test", id: "test-model" };
const repoRoot = new URL("../../..", import.meta.url).pathname;

function deps(overrides: Record<string, unknown> = {}) {
	const ac = new AbortController();
	return {
		signal: ac.signal,
		cwd: repoRoot,
		parentModel: model,
		modelRegistry: {
			find: (p: string, id: string) => (p === "missing" ? undefined : { provider: p, id }),
			getApiKeyAndHeaders: async (m: any) => m.provider === "noauth" ? { ok: false } : { ok: true, apiKey: "key", headers: { h: "v" } },
		},
		...overrides,
	} as any;
}
function setComplete(fn: CompleteMock) { (globalThis as any).__rlmCompleteMock = fn; }
function resp(text: string, usage = { input: 1, output: 1 }, stopReason = "stop") { return { content: [{ type: "text", text }], usage, stopReason }; }
function queue(...texts: string[]) { let i = 0; setComplete(() => resp(texts[i++] ?? texts[texts.length - 1])); }
async function expectReject(p: PromiseLike<unknown> | RlmHandle, text: string) { await expect(Promise.resolve(p)).rejects.toThrow(text); }
afterEach(() => { delete (globalThis as any).__rlmCompleteMock; cancelAllRlmHandles(new Error("test cleanup")); });

describe("rlm contract", () => {
	test("1 smoke returns structured object plus own usage", async () => {
		queue(js("rlm.return({a:1, b:'two', sessions:{x:{full:'long'}}});"));
		await expect(runRlm(deps(), { task: "smoke", tools: [] }, 0)).resolves.toEqual({ a: 1, b: "two", sessions: { x: { full: "long" } }, __rlm_usage: { input: 1, output: 1, model: "test/test-model" } });
	});
	test("2 rlm.return idempotency is reachable with try/catch", async () => {
		queue(js("try { rlm.return({a:1}); } catch (e) {}\ntry { rlm.return({a:2}); } catch (e) { if (e.message !== 'rlm: already returned') throw e; }"));
		await expect(runRlm(deps(), { task: "idempotent", tools: [] }, 0)).resolves.toMatchObject({ a: 1 });
	});
	test("3 rlm.return after dispose is silent noop", async () => {
		queue(js("setTimeout(() => rlm.return({late:true}), 20);\nrlm.return({early:true});"));
		const result = await runRlm(deps(), { task: "late", tools: [] }, 0);
		expect(result.early).toBe(true);
		await new Promise((r) => setTimeout(r, 40));
		expect(result).not.toHaveProperty("late");
	});
	test("4 JSON serialization edge cases match JSON clone boundary", async () => {
		queue(js("const d = new Date('2020-01-02T03:04:05.000Z');\nconst s = Symbol('x');\nrlm.return({fn: () => 1, n:5, u: undefined, arr:[undefined], d, m:new Map([[1,2]]), set:new Set([1]), re:/x/, [s]:'hidden', sym:s});"));
		await expect(runRlm(deps(), { task: "ser", tools: [] }, 0)).resolves.toMatchObject({ n:5, arr:[null], d:"2020-01-02T03:04:05.000Z", m:{}, set:{}, re:{} });
	});
	test("5 cycles throw wrapped JSON error", async () => { queue(js("const o = {}; o.self = o; rlm.return(o);")); await expectReject(runRlm(deps(), { task: "cycle", tools: [] }, 0), "rlm.return: value must be JSON-serializable"); });
	test("6 BigInt throws wrapped JSON error", async () => { queue(js("rlm.return({n: 1n});")); await expectReject(runRlm(deps(), { task: "bigint", tools: [] }, 0), "rlm.return: value must be JSON-serializable"); });
	test("7 whitelist denial keeps Bash undefined", async () => { queue(js("await Bash({command:'true'});")); await expectReject(runRlm(deps(), { task: "deny", tools: ["Read"], maxIterations: 2 }, 0), "maxIterations (2)"); });
	test("8 whitelist namespace allows memory but rejects memory.context and rlm", async () => {
		queue(js("rlm.return({kind: typeof memory.context});"));
		await expect(runRlm(deps(), { task: "mem", tools: ["memory"] }, 0)).resolves.toMatchObject({ kind: "function" });
		await expectReject(runRlm(deps(), { task: "bad", tools: ["memory.context"] }, 0), "unknown tool");
		await expectReject(runRlm(deps(), { task: "bad", tools: ["rlm"] }, 0), "always injected");
	});
	test("9 depth cap permits child and rejects grandchild", async () => {
		setComplete((_m, req) => req.messages[0].content === "child" ? resp(js("try { rlm({task:'grand', tools:[]}); } catch (e) { rlm.return({err:e.message}); }")) : resp(js("const child = await rlm({task:'child', tools:[], maxDepth:2}); rlm.return({child});")));
		await expect(runRlm(deps(), { task: "parent", tools: [], maxDepth: 2 }, 0)).resolves.toMatchObject({ child: { err: "rlm: max depth reached" } });
	});
	test("10 iteration cap rejects without return", async () => { queue(js("console.log('no return');")); await expectReject(runRlm(deps(), { task: "cap", tools: [], maxIterations: 2 }, 0), "maxIterations (2)"); });
	test("11 token cap fires after usage before executing code", async () => { setComplete(() => resp(js("rlm.return({shouldNot:true});"), {input:60, output:60})); await expectReject(runRlm(deps(), { task: "tok", tools: [], maxTokens: 100 }, 0), "maxTokens reached"); });
	test("12 no-code strike limit rejects", async () => { queue("plain prose"); await expectReject(runRlm(deps(), { task: "nocode", tools: [] }, 0), "sub-LLM not emitting code blocks"); });
	test("13 parent abort propagates into complete signal", async () => {
		const ac = new AbortController(); let seen = false;
		setComplete((_m, _req, auth) => new Promise((_res, rej) => { auth.signal.addEventListener("abort", () => { seen = auth.signal.aborted; rej(new Error("Aborted")); }); }));
		const p = runRlm(deps({ signal: ac.signal }), { task: "abort", tools: [] }, 0); setTimeout(() => ac.abort(), 10);
		await expectReject(p, "Aborted"); expect(seen).toBe(true);
	});
	test("14 unsubscribe cancels handle", async () => {
		let seen = false; setComplete((_m,_r,auth) => new Promise((_res, rej) => auth.signal.addEventListener("abort", () => { seen = true; rej(new Error("Aborted")); })));
		const h = createRlmHandle(deps(), { task: "unsub", tools: [] }, 0); setTimeout(() => h.unsubscribe(), 10);
		await expectReject(h, "rlm: cancelled"); expect(seen).toBe(true);
	});
	test("15 timeout rejects with exact timeout error", async () => { setComplete((_m,_r,auth) => new Promise((_res, rej) => auth.signal.addEventListener("abort", () => rej(new Error("Aborted"))))); const h = createRlmHandle(deps(), { task: "timeout", tools: [] }, 0).timeout(20); await expectReject(h, "rlm: timeout after 20ms"); });
	test("16 parallel isolation", async () => {
		setComplete((_m, req) => resp(js("rlm.return({task:" + JSON.stringify(req.messages[0].content) + "});")));
		const out = await Promise.all(["a","b","c"].map((task) => runRlm(deps(), { task, tools: [] }, 0)));
		expect(out.map((x:any) => x.task)).toEqual(["a","b","c"]);
	});
	test("17 promise survives across turns when stored on an object", async () => { queue(js("rlm.return({survived:true});")); const store:any = {}; store.x = createRlmHandle(deps(), { task: "survive", tools: [] }, 0); await expect(Promise.resolve(store.x)).resolves.toMatchObject({ survived: true }); });
	test("18 session shutdown rejects active handles", async () => { setComplete((_m,_r,auth) => new Promise((_res, rej) => auth.signal.addEventListener("abort", () => rej(new Error("Aborted"))))); const h = createRlmHandle(deps(), { task: "shutdown", tools: [] }, 0); setTimeout(() => cancelAllRlmHandles(new Error("rlm: session shutdown")), 10); await expectReject(h, "rlm: session shutdown"); });
	test("19 no session API is injected", async () => { let calls = 0; setComplete(() => resp(++calls === 1 ? js("session.messages();") : js("rlm.return({calls:2});"))); await expect(runRlm(deps(), { task: "nosession", tools: [], maxIterations: 3 }, 0)).resolves.toMatchObject({ calls: 2 }); });
	test("20 no console.wake is injected", async () => { let calls = 0; setComplete(() => resp(++calls === 1 ? js("console.wake('x');") : js("rlm.return({calls:2});"))); await expect(runRlm(deps(), { task: "nowake", tools: [], maxIterations: 3 }, 0)).resolves.toMatchObject({ calls: 2 }); });
	test("21 non-aborted stopReason passes through", async () => { setComplete(() => resp(js("rlm.return({n:1});"), {input:2, output:3}, "max_tokens")); await expect(runRlm(deps(), { task: "stop", tools: [] }, 0)).resolves.toMatchObject({ n: 1 }); });
	test("22 cwd is passed to sub tool bindings", async () => { queue(js("const pkg = await Read({path:'package.json'}); rlm.return({hasName: pkg.includes('pi-extensions-workspace')});")); await expect(runRlm(deps(), { task: "cwd", tools: ["Read"] }, 0)).resolves.toMatchObject({ hasName: true }); });
	test("23 model auth failure rejects", async () => { await expectReject(runRlm(deps({ parentModel: { provider: "noauth", id: "x" } }), { task: "auth", tools: [] }, 0), "no API key for model"); });
});
