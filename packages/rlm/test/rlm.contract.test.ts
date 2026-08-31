import { afterEach, describe, expect, test } from "bun:test";
import { runRlm } from "../src/loop";
import { cancelAllRlmHandles, createRlmHandle } from "../src/handle";
import type { RlmHandle } from "../src/types";

type CompleteMock = (model: unknown, request: any, auth: any) => Promise<any> | any;
const bt = String.fromCharCode(96);
const js = (code: string) => bt.repeat(3) + "javascript\n" + code + "\n" + bt.repeat(3);
const model = { provider: "test", id: "test-model" };
const repoRoot = new URL("../../..", import.meta.url).pathname;
let completeMock: CompleteMock | undefined;
const envKeys = new Set<string>();

function deps(overrides: Record<string, unknown> = {}) {
	const ac = new AbortController();
	return {
		signal: ac.signal,
		cwd: repoRoot,
		resolveModelRole: () => model,
		modelRegistry: {
			find: (p: string, id: string) => (p === "missing" ? undefined : { provider: p, id }),
			getApiKeyAndHeaders: async (m: any) => m.provider === "noauth" ? { ok: false } : { ok: true, apiKey: "key", headers: { h: "v" } },
		},
		completeFn: completeMock,
		...overrides,
	} as any;
}
function setComplete(fn: CompleteMock) { completeMock = fn; }
function contentFromText(text: string) {
	const m = text.match(/^```(?:javascript|js|typescript|ts)\n([\s\S]*)\n```$/);
	if (m) return [{ type: "toolCall", id: "tool-" + Math.random().toString(36).slice(2), name: "execute_code", arguments: { code: m[1] } }];
	return [{ type: "text", text }];
}
function resp(text: string, usage = { input: 1, output: 1 }, stopReason = "stop") { return { role: "assistant", content: contentFromText(text), usage, stopReason, provider: "test", model: "test-model", api: "test", timestamp: Date.now() }; }
function queue(...texts: string[]) { let i = 0; setComplete(() => resp(texts[i++] ?? texts[texts.length - 1])); }
async function expectReject(p: PromiseLike<unknown> | RlmHandle, text: string) { await expect(Promise.resolve(p)).rejects.toThrow(text); }
function messageText(msg: any): string {
	const content = msg?.content;
	if (typeof content === "string") return content;
	if (Array.isArray(content)) return content.map((part) => typeof part?.text === "string" ? part.text : JSON.stringify(part)).join("\n");
	return String(content ?? "");
}
function requestText(req: any): string {
	return (req?.messages ?? []).map(messageText).join("\n---message---\n");
}
function envKey(name: string): string {
	const key = "RLM_TEST_" + name + "_" + Math.random().toString(36).slice(2);
	envKeys.add(key);
	delete process.env[key];
	return key;
}
afterEach(() => {
	completeMock = undefined;
	cancelAllRlmHandles(new Error("test cleanup"));
	for (const key of envKeys) delete process.env[key];
	envKeys.clear();
});

describe("rlm contract", () => {
	test("1 smoke returns structured object plus own usage", async () => {
		queue(js("rlm.return({a:1, b:'two', sessions:{x:{full:'long'}}});"));
		await expect(runRlm(deps(), { task: "smoke", tools: [] }, 0)).resolves.toEqual({ a: 1, b: "two", sessions: { x: { full: "long" } }, __rlm_usage: { input: 1, output: 1, model: "test/test-model" } });
	});
	test("1b requiredKeys rejects schema-missing returns", async () => {
		queue(js("rlm.return({checkedFiles:['a.ts'], summary:'no findings key'});"));
		await expectReject(
			runRlm(deps(), { task: "schema", tools: [], requiredKeys: ["findings", "checkedFiles", "summary"] }, 0),
			"rlm: returned object missing required keys: findings",
		);
	});
	test("2 rlm.return idempotency exposes the second-call error", async () => {
		const key = envKey("SECOND_ERROR");
		queue(js("try { rlm.return({a:1}); } catch (e) {}\ntry { rlm.return({a:2}); } catch (e) { process.env[" + JSON.stringify(key) + "] = e.message; throw e; }"));
		await expect(runRlm(deps(), { task: "idempotent", tools: [] }, 0)).resolves.toMatchObject({ a: 1 });
		expect(process.env[key]).toBe("rlm: already returned");
	});
	test("3 rlm.return after dispose is silent noop without unhandled process errors", async () => {
		const unhandled: unknown[] = [];
		const onUnhandled = (err: unknown) => unhandled.push(err);
		process.on("unhandledRejection", onUnhandled as any);
		process.on("uncaughtException", onUnhandled as any);
		try {
			queue(js("setTimeout(() => rlm.return({late:true}), 20);\nrlm.return({early:true});"));
			const result = await runRlm(deps(), { task: "late", tools: [] }, 0);
			expect(result.early).toBe(true);
			const usageBefore = (result as any).__rlm_usage;
			await new Promise((r) => setTimeout(r, 60));
			expect(result).not.toHaveProperty("late");
			expect((result as any).__rlm_usage).toEqual(usageBefore);
			expect(unhandled).toHaveLength(0);
		} finally {
			process.removeListener("unhandledRejection", onUnhandled as any);
			process.removeListener("uncaughtException", onUnhandled as any);
		}
	});
	test("4 JSON serialization edge cases drop non-JSON members", async () => {
		queue(js("const d = new Date('2020-01-02T03:04:05.000Z');\nconst s = Symbol('x');\nrlm.return({fn: () => 1, n:5, u: undefined, arr:[undefined], d, m:new Map([[1,2]]), set:new Set([1]), re:/x/, [s]:'hidden', sym:s});"));
		const result = await runRlm(deps(), { task: "ser", tools: [] }, 0);
		expect(result.n).toBe(5);
		expect(result.arr).toEqual([null]);
		expect(result.d).toBe("2020-01-02T03:04:05.000Z");
		expect(result.m).toEqual({});
		expect(result.set).toEqual({});
		expect(result.re).toEqual({});
		expect(result).not.toHaveProperty("fn");
		expect(result).not.toHaveProperty("u");
		expect(result).not.toHaveProperty("sym");
		expect(Object.getOwnPropertySymbols(result)).toHaveLength(0);
	});
	test("4b root undefined is rejected as non-serializable", async () => { queue(js("rlm.return(undefined);")); await expectReject(runRlm(deps(), { task: "undefined", tools: [] }, 0), "rlm.return: value must be JSON-serializable"); });
	test("5 cycles throw wrapped JSON error", async () => { queue(js("const o = {}; o.self = o; rlm.return(o);")); await expectReject(runRlm(deps(), { task: "cycle", tools: [] }, 0), "rlm.return: value must be JSON-serializable"); });
	test("6 BigInt throws wrapped JSON error", async () => { queue(js("rlm.return({n: 1n});")); await expectReject(runRlm(deps(), { task: "bigint", tools: [] }, 0), "rlm.return: value must be JSON-serializable"); });
	test("7 whitelist denial feeds ReferenceError back to the LLM", async () => {
		let calls = 0;
		let secondCallReceived = "";
		setComplete((_m, req) => {
			calls++;
			if (calls > 1) {
				secondCallReceived = requestText(req);
				return resp(js("rlm.return({ok:'second'});"));
			}
			return resp(js("await Bash({command:'true'});"));
		});
		await expect(runRlm(deps(), { task: "deny", tools: ["Read"], maxIterations: 3 }, 0)).resolves.toMatchObject({ ok: "second" });
		expect(secondCallReceived).toContain("ReferenceError");
		expect(secondCallReceived).toContain("Bash");
	});
	test("7b whitelist allow makes Bash available when requested", async () => {
		setComplete(() => resp(js("const r = await Bash({command:'echo hi'}); rlm.return({stdout: r.stdout});")));
		const result = await runRlm(deps(), { task: "allow", tools: ["Bash"] }, 0);
		expect(String(result.stdout)).toContain("hi");
	});
	test("7c man is always available as read-only documentation without widening capabilities", async () => {
		queue(js("const index = await man('code-mode'); rlm.return({hasCore:index.includes('code-mode/core'), readType:typeof Read});"));
		await expect(runRlm(deps(), { task: "docs", tools: [] }, 0)).resolves.toMatchObject({
			hasCore: true,
			readType: "undefined",
		});
	});
	test("7d runbookRun is rejected because RLM disables runbook injection", async () => { await expectReject(runRlm(deps(), { task: "runbook", tools: ["runbookRun"] }, 0), "unknown tool 'runbookRun'"); });
	test("8 whitelist namespace allows mai + rlm but rejects the mai.ticket sub-method", async () => {
		queue(js("rlm.return({kind: typeof mai.ticket});"));
		await expect(runRlm(deps(), { task: "mai", tools: ["mai"] }, 0)).resolves.toMatchObject({ kind: "function" });
		await expectReject(runRlm(deps(), { task: "bad", tools: ["mai.ticket"] }, 0), "unknown tool");
		queue(js("rlm.return({kind: typeof rlm});"));
		await expect(runRlm(deps(), { task: "rlm-listed", tools: ["rlm"] }, 0)).resolves.toMatchObject({ kind: "function" });
	});
	test("9 depth cap permits child and rejects grandchild", async () => {
		setComplete((_m, req) => messageText(req.messages[0]) === "child" ? resp(js("try { rlm({task:'grand', tools:[]}); } catch (e) { rlm.return({err:e.message}); }")) : resp(js("const child = await rlm({task:'child', tools:[], maxDepth:2}); rlm.return({child});")));
		await expect(runRlm(deps(), { task: "parent", tools: [], maxDepth: 2 }, 0)).resolves.toMatchObject({ child: { err: "rlm: max depth reached" } });
	});
	test("10 iteration cap rejects without return", async () => { queue(js("console.log('no return');")); await expectReject(runRlm(deps(), { task: "cap", tools: [], maxIterations: 2 }, 0), "maxIterations (2)"); });
	test("10b accepts the fivefold ceiling and rejects values above it", async () => {
		queue(js("rlm.return({ok:true});"));
		await expect(runRlm(deps(), { task: "ceiling", tools: [], maxIterations: 500 }, 0)).resolves.toMatchObject({ ok: true });
		await expectReject(runRlm(deps(), { task: "above-ceiling", tools: [], maxIterations: 501 }, 0), "maxIterations must be in [1, 500]");
	});
	test("12 plain text without tool call rejects", async () => { queue("plain prose"); await expectReject(runRlm(deps(), { task: "nocode", tools: [] }, 0), "agent finished without rlm.return"); });
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
		setComplete((_m, req) => resp(js("rlm.return({task:" + JSON.stringify(messageText(req.messages[0])) + "});")));
		const out = await Promise.all(["a","b","c"].map((task) => runRlm(deps(), { task, tools: [] }, 0)));
		expect(out.map((x:any) => x.task)).toEqual(["a","b","c"]);
	});
	test("17 promise survives unrelated awaits when stored", async () => {
		queue(js("await new Promise(r => setTimeout(r, 50)); rlm.return({survived:true});"));
		const stored = createRlmHandle(deps(), { task: "survive", tools: [] }, 0);
		await new Promise((r) => setTimeout(r, 100));
		await expect(Promise.resolve(stored)).resolves.toMatchObject({ survived: true });
	});
	test("17b unawaited async main rlm.return resolves without unhandled rejection", async () => {
		const unhandled: unknown[] = [];
		const onUnhandled = (err: unknown) => unhandled.push(err);
		process.on("unhandledRejection", onUnhandled as any);
		try {
			let calls = 0;
			setComplete((_m, _req, auth) => {
				calls++;
				if (calls === 1) return resp(js("async function main() { await new Promise(r => setTimeout(r, 20)); rlm.return({lateAsync:true}); }\nmain();"));
				return new Promise((_res, rej) => auth.signal.addEventListener("abort", () => rej(new Error("Aborted"))));
			});
			await expect(runRlm(deps(), { task: "unawaited-main", tools: [], maxIterations: 5 }, 0)).resolves.toMatchObject({ lateAsync: true });
			await new Promise((r) => setTimeout(r, 20));
			expect(unhandled).toHaveLength(0);
		} finally {
			process.removeListener("unhandledRejection", onUnhandled as any);
		}
	});
	test("18 session_shutdown subscriber cancels active handles", async () => {
		let shutdownHandler: (() => void) | undefined;
		const piStub: any = { on: (event: string, fn: () => void) => { if (event === "session_shutdown") shutdownHandler = fn; } };
		const mod = await import("../index");
		mod.default(piStub);
		expect(shutdownHandler).toBeDefined();
		setComplete((_m,_r,auth) => new Promise((_res, rej) => auth.signal.addEventListener("abort", () => rej(new Error("Aborted")))));
		const h = createRlmHandle(deps(), { task: "shutdown", tools: [] }, 0);
		setTimeout(() => shutdownHandler!(), 10);
		await expectReject(h, "rlm: session shutdown");
	});
	test("19 no session API is injected and the ReferenceError is fed back", async () => {
		let calls = 0;
		let secondCallReceived = "";
		setComplete((_m, req) => {
			calls++;
			if (calls === 1) return resp(js("session.messages();"));
			secondCallReceived = requestText(req);
			return resp(js("rlm.return({calls:2});"));
		});
		await expect(runRlm(deps(), { task: "nosession", tools: [], maxIterations: 3 }, 0)).resolves.toMatchObject({ calls: 2 });
		expect(secondCallReceived).toContain("ReferenceError");
		expect(secondCallReceived).toContain("session");
	});
	test("20 no console.wake is injected and the TypeError is fed back", async () => {
		let calls = 0;
		let secondCallReceived = "";
		setComplete((_m, req) => {
			calls++;
			if (calls === 1) return resp(js("console.wake('x');"));
			secondCallReceived = requestText(req);
			return resp(js("rlm.return({calls:2});"));
		});
		await expect(runRlm(deps(), { task: "nowake", tools: [], maxIterations: 3 }, 0)).resolves.toMatchObject({ calls: 2 });
		expect(secondCallReceived).toContain("TypeError");
		expect(secondCallReceived).toContain("console.wake");
	});
	test("21 non-aborted stopReason passes through", async () => { setComplete(() => resp(js("rlm.return({n:1});"), { input: 2, output: 3 }, "max_tokens")); await expect(runRlm(deps(), { task: "stop", tools: [] }, 0)).resolves.toMatchObject({ n: 1 }); });
	test("22 cwd is passed to sub tool bindings", async () => { queue(js("const pkg = await Read({path:'package.json'}); rlm.return({hasWorkspaces: pkg.includes('\\\"workspaces\\\"')});")); await expect(runRlm(deps(), { task: "cwd", tools: ["Read"] }, 0)).resolves.toMatchObject({ hasWorkspaces: true }); });
	test("23 model auth failure rejects", async () => { await expectReject(runRlm(deps({ resolveModelRole: () => ({ provider: "noauth", id: "x" }) }), { task: "auth", tools: [] }, 0), "no API key for model"); });

	test("23b omitted model resolves the central rlm role", async () => {
		const roles: string[] = [];
		queue(js("rlm.return({ok:true});"));
		const result = await runRlm(deps({
			resolveModelRole: (role: string) => {
				roles.push(role);
				return { provider: "cheap", id: "flash" };
			},
		}), { task: "routed", tools: [] }, 0);
		expect(roles).toEqual(["rlm"]);
		expect(result.__rlm_usage?.model).toBe("cheap/flash");
	});

	test("23c explicit model overrides the central rlm role", async () => {
		queue(js("rlm.return({ok:true});"));
		const result = await runRlm(deps({
			resolveModelRole: () => { throw new Error("role resolver must not run"); },
		}), { task: "explicit", tools: [], model: "premium/reasoner" }, 0);
		expect(result.__rlm_usage?.model).toBe("premium/reasoner");
	});

	test("23d missing rlm role candidate fails closed before model execution", async () => {
		setComplete(() => { throw new Error("model must not run"); });
		await expectReject(
			runRlm(deps({ resolveModelRole: () => undefined }), { task: "no candidate", tools: [] }, 0),
			"no healthy available model configured for role 'rlm'",
		);
	});

	test("23e nested RLM calls reuse the central rlm role", async () => {
		const roles: string[] = [];
		let calls = 0;
		setComplete(() => {
			calls++;
			if (calls === 1) return resp(js("const child = await rlm({task:'child', tools:[]}); rlm.return({child});"));
			return resp(js("rlm.return({ok:true});"));
		});
		const result = await runRlm(deps({
			resolveModelRole: (role: string) => {
				roles.push(role);
				return model;
			},
		}), { task: "parent", tools: ["rlm"] }, 0);
		expect(result).toMatchObject({ child: { ok: true } });
		expect(roles).toEqual(["rlm", "rlm"]);
	});

	test("24 handle inspect/on exposes identity, progress, and final usage", async () => {
		let release!: (text: string) => void;
		const requested = new Promise<void>((resolve) => {
			setComplete(() => {
				resolve();
				return new Promise((res) => { release = (text: string) => res(resp(text, { input: 7, output: 3 })); });
			});
		});
		const events: string[] = [];
		const h = createRlmHandle(deps(), { task: "inspect", tools: [], identity: "slice-2-rlm" }, 0)
			.on("start", (e) => events.push("start:" + e.snapshot.identity.name))
			.on("step", (e) => events.push("step:" + e.snapshot.status))
			.on("tool", (e) => events.push("tool:" + e.snapshot.lastToolCall?.name))
			.on("return", (e) => events.push("return:" + e.snapshot.status));

		await requested;
		const mid = h.inspect();
		expect(mid.status).toBe("running");
		expect(mid.identity.name).toBe("slice-2-rlm");
		expect(mid.model).toBe("test/test-model");
		expect(mid.maxIterations).toBe(300);

		release(js("rlm.return({ok:true});"));
		const result = await h;
		expect(result).toMatchObject({ ok: true, __rlm_usage: { input: 7, output: 3, model: "test/test-model", identity: "slice-2-rlm" } });
		expect(h.inspect().status).toBe("resolved");
		expect(events).toContain("start:slice-2-rlm");
		expect(events).toContain("step:running");
		expect(events).toContain("tool:execute_code");
		expect(h.inspect().lastToolCall?.name).toBe("execute_code");
		expect(events).toContain("return:resolved");
	});

	test("25 timeout updates inspect status", async () => {
		setComplete((_m, _req, auth) => new Promise((_res, rej) => auth.signal.addEventListener("abort", () => rej(new Error("Aborted")))));
		const h = createRlmHandle(deps(), { task: "timeout-inspect", tools: [], identity: "timeout-worker" }, 0).timeout(20);
		await expectReject(h, "rlm: timeout after 20ms");
		const snap = h.inspect();
		expect(snap.status).toBe("timeout");
		expect(snap.error).toBe("rlm: timeout after 20ms");
	});

	test("26 Bash receives rlm git-ai attribution env", async () => {
		queue(js("const r = await Bash({command:'printf \"%s|%s|%s\" \"$PI_AGENT_NAME\" \"$PI_AGENT_EMAIL\" \"$PI_AGENT_MODEL\"'}); rlm.return({env:r.stdout});"));
		await expect(Promise.resolve(createRlmHandle(deps(), { task: "git-env", tools: ["Bash"], identity: { name: "slice worker", email: "slice@example.test" } }, 0))).resolves.toMatchObject({
			env: "slice worker|slice@example.test|test/test-model",
			__rlm_usage: { identity: "slice worker" },
		});
	});
});
