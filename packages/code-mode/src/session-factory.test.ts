/**
 * Tests for packages/code-mode/src/session-factory.ts (pe-tk4s).
 *
 * Verification list maps to pe-tk4s "Verification" section:
 *
 *   1. isolation         — independent \$ stores
 *   2. log drain         — drainLogs() empties + joins
 *   3. escape toggle     — independent across sessions
 *   4. no-cwd-no-disk    — `cwd` omitted ⇒ zero fs writes
 *   5. slash-command roundtrip — covered in code-mode.escape.test.ts
 *   6. errorMode rethrow vs recover
 *   7. low-level whitelist enforcement (skipToolInjection + bindings)
 *   10. contextual model/registry delivery
 *   14. high-level whitelist (allowedTools + extraBindings)
 *   15. injectRunbookRun gate
 *
 * Other tests (8, 9 contextual factory, 11 package export, 12 existing-suite,
 * 13 build/typecheck) live in dedicated files / CI commands.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	createCodeModeSession,
	executeInSession,
	type ExecutionDeps,
} from "./session-factory";
import { SQUASH_HANDOFF_MAX_BYTES } from "./deferred-squash";

function makeDeps(overrides?: Partial<ExecutionDeps>): ExecutionDeps {
	const ac = new AbortController();
	return {
		signal: ac.signal,
		cwd: process.cwd(),
		model: { provider: "test", id: "test-model" },
		modelRegistry: {} as any,
		...overrides,
	};
}

describe("createCodeModeSession", () => {
	test("V1: independent \$ stores across sessions", async () => {
		const a = createCodeModeSession();
		const b = createCodeModeSession();
		(a.store.proxy as any).x = 1;
		expect((a.store.proxy as any).x).toBe(1);
		expect((b.store.proxy as any).x).toBeUndefined();
		(b.store.proxy as any).x = 99;
		expect((a.store.proxy as any).x).toBe(1);
	});

	test("V2: drainLogs joins with \\n and empties", async () => {
		const sess = createCodeModeSession();
		await executeInSession(
			sess,
			"console.log('a'); console.log('b');",
			makeDeps({ injectSessionApi: false, injectConsoleWake: false, hydrateBareGlobals: false, skipToolInjection: true, bindings: {} }),
		);
		// drainLogs reads logs that the run also collected; we run, then verify drain.
		// But logs are emptied at start of each call. So inspect before drain by re-running:
		const sess2 = createCodeModeSession();
		(sess2.context as any).console.log("a");
		(sess2.context as any).console.log("b");
		expect(sess2.drainLogs()).toBe("a\nb");
		expect(sess2.drainLogs()).toBe("");
	});

	test("V3: setEscaped/getEscaped is per-session", () => {
		const a = createCodeModeSession();
		const b = createCodeModeSession();
		expect(a.getEscaped()).toBe(false);
		a.setEscaped(true);
		expect(a.getEscaped()).toBe(true);
		expect(b.getEscaped()).toBe(false);
	});

	test("V3b: initialEscaped option", () => {
		const a = createCodeModeSession({ initialEscaped: true });
		expect(a.getEscaped()).toBe(true);
	});

	test("V4: no-cwd ⇒ no disk writes (in-memory only)", async () => {
		const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "session-factory-no-disk-"));
		const origWrite = fs.writeFileSync;
		const writes: string[] = [];
		(fs as any).writeFileSync = (p: string, ...rest: unknown[]) => {
			writes.push(String(p));
			return (origWrite as any).apply(fs, [p, ...rest]);
		};
		try {
			const sess = createCodeModeSession(); // no cwd
			await executeInSession(
				sess,
				"\$.x = 1; \$.y = 'two';",
				makeDeps({
					injectSessionApi: false,
					injectConsoleWake: false,
					hydrateBareGlobals: false,
					injectRunbookRun: false,
					skipToolInjection: true,
					bindings: {},
				}),
			);
			// Wait for any debounced flush
			await new Promise((r) => setTimeout(r, 700));
			expect(writes).toEqual([]);
		} finally {
			(fs as any).writeFileSync = origWrite;
			fs.rmSync(tmpHome, { recursive: true, force: true });
		}
	});
});

describe("executeInSession — error modes", () => {
	test("V6a: errorMode='rethrow' propagates exceptions", async () => {
		const sess = createCodeModeSession();
		const deps = makeDeps({
			errorMode: "rethrow",
			injectSessionApi: false,
			injectConsoleWake: false,
			hydrateBareGlobals: false,
			injectRunbookRun: false,
			skipToolInjection: true,
			bindings: {},
		});
		await expect(executeInSession(sess, "throw new Error('boom')", deps)).rejects.toThrow("boom");
	});

	test("V6b: errorMode='recover' (default) returns error in result", async () => {
		const sess = createCodeModeSession();
		const deps = makeDeps({
			injectSessionApi: false,
			injectConsoleWake: false,
			hydrateBareGlobals: false,
			injectRunbookRun: false,
			skipToolInjection: true,
			bindings: {},
		});
		const result = await executeInSession(sess, "throw new Error('boom')", deps);
		// vm.runInContext throws cross-realm Error; `err instanceof Error` is false in the
		// host realm, so the runner falls back to String(err) which yields "Error: boom".
		// This matches the pre-extraction behavior in code-mode.ts.
		expect(result.error).toContain("boom");
		expect(typeof result.duration).toBe("number");
	});

	test("syntax errors are concise and do not dump the $ store", async () => {
		const sess = createCodeModeSession();
		(sess.store.proxy as any).largeTokenSink = "x".repeat(1000);
		const result = await executeInSession(
			sess,
			"const bad = ;",
			makeDeps({
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
				skipToolInjection: true,
				bindings: {},
			}),
		);

		expect(result.error).toContain("Unexpected");
		expect(result.output).toContain("Syntax error");
		expect(result.output).toContain("Your $ store was NOT affected");
		expect(result.output).toContain("$.__status()");
		expect(result.output).not.toContain("largeTokenSink");
		expect(result.output).not.toContain("$ store:");
	});

	test("runtime SyntaxError (JSON.parse) is a runtime error, not a code syntax error", async () => {
		const sess = createCodeModeSession();
		(sess.store.proxy as any).survivor = "keep-me";
		const result = await executeInSession(
			sess,
			'JSON.parse("gso-gp7rp4vc plain text");',
			makeDeps({
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
				skipToolInjection: true,
				bindings: {},
			}),
		);

		// The real runtime error surfaces.
		expect(result.error).toContain("JSON Parse error");
		// It must be reported as a RUNTIME error (store survived), NOT mislabeled
		// as a code syntax error — Layer 1 already validated syntax.
		expect(result.output).toContain("Your $ store survived");
		expect(result.output).not.toContain("Syntax error");
		expect(result.output).not.toContain("Your $ store was NOT affected");
		expect(result.output).not.toContain("Fix the syntax and retry");
		// Located at the throwing line and tagged as a runtime SyntaxError.
		expect(result.output).toContain("at your code line 1");
		expect(result.output).toContain("thrown at runtime");
	});

	test("runtime failures summarize a large $ store instead of serializing it", async () => {
		const sess = createCodeModeSession();
		const storeKeys = sess.store.proxy.__keys;
		const storeKeyList = typeof storeKeys === "function" ? storeKeys() : [];
		const initialKeyCount = Array.isArray(storeKeyList) ? storeKeyList.length : 0;
		for (let index = 0; index < 600; index++) {
			(sess.store.proxy as Record<string, unknown>)[`large-recovery-key-${index}`] = "x".repeat(1024);
		}

		const result = await executeInSession(
			sess,
			'JSON.parse("not-json");',
			makeDeps({
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
				skipToolInjection: true,
				bindings: {},
			}),
		);

		expect(result.output).toContain(`Your $ store survived (${initialKeyCount + 600} keys)`);
		expect(result.output).toContain("Run $.__status() only when you intentionally need a store inventory");
		expect(result.output).not.toContain("large-recovery-key-0");
		expect(Buffer.byteLength(result.output, "utf8")).toBeLessThan(1_200);
	});

	test("execution timeout aborts Bash and preserves partial subprocess output", async () => {
		const sess = createCodeModeSession();
		const result = await executeInSession(
			sess,
			"const result = await Bash({ command: 'printf before; sleep 2; printf after', timeout: 5 }); console.log(JSON.stringify(result));",
			makeDeps({
				executionTimeoutMs: 100,
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
			}),
		);

		expect(result.error).toBeUndefined();
		const parsed = JSON.parse(result.output.trim());
		expect(parsed.stdout).toBe("before");
		expect(parsed.timedOut).toBe(true);
	});
});

describe("executeInSession — whitelist", () => {
	test("V7: skipToolInjection + bindings enforces low-level whitelist", async () => {
		const sess = createCodeModeSession();
		let readCalled = false;
		const Read = () => {
			readCalled = true;
			return "ok";
		};
		const deps = makeDeps({
			skipToolInjection: true,
			bindings: { Read },
			injectSessionApi: false,
			injectConsoleWake: false,
			hydrateBareGlobals: false,
			injectRunbookRun: false,
		});
		// Read should be available, Bash should not.
		const r1 = await executeInSession(sess, "console.log(typeof Read)", deps);
		expect(r1.output).toContain("function");
		// Calling an undefined binding throws ReferenceError.
		const r2 = await executeInSession(sess, "Bash({ command: 'true' })", deps);
		expect(r2.error).toMatch(/Bash is not defined/);
		// Read closure was reachable from sandbox.
		await executeInSession(sess, "Read()", deps);
		expect(readCalled).toBe(true);
	});

	test("V14: high-level allowedTools + extraBindings filter & merge", async () => {
		const sess = createCodeModeSession();
		let stubFnCalled = false;
		const stubFn = () => {
			stubFnCalled = true;
			return "stub-ok";
		};
		const deps = makeDeps({
			allowedTools: new Set(["Read"]),
			extraBindings: { rlm: stubFn },
			injectSessionApi: false,
			injectConsoleWake: false,
			hydrateBareGlobals: false,
			injectRunbookRun: false,
		});
		// Read should be present (real createToolBindings provides it), Bash filtered out.
		const r = await executeInSession(
			sess,
			"console.log(typeof Read, typeof Bash, typeof rlm);",
			deps,
		);
		expect(r.output).toContain("function undefined function");
		// rlm stub callable.
		await executeInSession(sess, "rlm()", deps);
		expect(stubFnCalled).toBe(true);
	});
});

describe("executeInSession — context guard", () => {
	test("does not block tools while post-compaction context usage is unknown", async () => {
		const sess = createCodeModeSession();
		const result = await executeInSession(
			sess,
			"const result = await Bash({ command: 'printf ok' }); console.log(result.stdout);",
			makeDeps({
				getContextUsage: () => ({ tokens: null, contextWindow: 200_000, percent: null }),
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
			}),
		);

		expect(result.error).toBeUndefined();
		expect(result.output).toContain("ok");
	});

	test("blocks tools when context usage is known above the guard threshold", async () => {
		const sess = createCodeModeSession();
		const result = await executeInSession(
			sess,
			"await Bash({ command: 'printf should-not-run' });",
			makeDeps({
				getContextUsage: () => ({ tokens: 190_000, contextWindow: 200_000, percent: 95 }),
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
			}),
		);

		expect(result.error).toContain("Context guard active");
		expect(result.output).toContain("95.0% used");
		expect(result.error).toContain("$.ctx");
		expect(result.error).toContain("model-visible after compaction");
		expect(result.error).toContain("Never put secrets in $.ctx");
	});
});

describe("executeInSession — runbookRun gate", () => {
	test("V15: injectRunbookRun=false hides runbookRun", async () => {
		const sess = createCodeModeSession();
		const deps = makeDeps({
			injectRunbookRun: false,
			injectSessionApi: false,
			injectConsoleWake: false,
			hydrateBareGlobals: false,
			skipToolInjection: true,
			bindings: {},
		});
		const r = await executeInSession(sess, "runbookRun({ name: 'foo' })", deps);
		expect(r.error).toMatch(/runbookRun is not defined/);
	});

	test("V15b: injectRunbookRun=true (default) exposes runbookRun", async () => {
		const sess = createCodeModeSession();
		const deps = makeDeps({
			injectSessionApi: false,
			injectConsoleWake: false,
			hydrateBareGlobals: false,
			skipToolInjection: true,
			bindings: {},
		});
		const r = await executeInSession(sess, "console.log(typeof runbookRun)", deps);
		expect(r.output).toContain("function");
	});
});

describe("executeInSession — contextual sandbox-fn delivery", () => {
	test("V10: model/registry/signal flow through to contextual factories", async () => {
		const {
			registerContextualSandboxFn,
			unregisterSandboxFn,
		} = await import("../../shared/src/sandbox-registry");

		registerContextualSandboxFn("__pe_tk4s_v10_modelping", (ctx) => () => {
			return ctx.model.provider + "/" + ctx.model.id;
		});
		try {
			const sess = createCodeModeSession();
			const deps = makeDeps({
				model: { provider: "openai-codex", id: "gpt-5.5" },
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
			});
			const r = await executeInSession(sess, "console.log(__pe_tk4s_v10_modelping())", deps);
			expect(r.output).toContain("openai-codex/gpt-5.5");
		} finally {
			unregisterSandboxFn("__pe_tk4s_v10_modelping");
		}
	});

	test("V10c: getModel/setModel/getContextUsage map through buildSandboxCallContext (pe-dvdys6os)", async () => {
		const {
			registerContextualSandboxFn,
			unregisterSandboxFn,
		} = await import("../../shared/src/sandbox-registry");

		registerContextualSandboxFn("__pe_dvdys6os_hostcaps", (ctx) => async () => {
			const setResult = ctx.setModel ? await ctx.setModel({ provider: "t", id: "m" }) : "missing";
			return JSON.stringify({
				live: ctx.getModel?.() ?? null,
				usage: ctx.getContextUsage?.() ?? null,
				setResult,
			});
		});
		try {
			const sess = createCodeModeSession();
			let setCalls = 0;
			const deps = makeDeps({
				getModel: () => ({ provider: "live-p", id: "live-m" }),
				setModel: async () => { setCalls++; return true; },
				getContextUsage: () => ({ tokens: 7, contextWindow: 128, percent: 5.5 }),
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
			});
			const r = await executeInSession(sess, "console.log(await __pe_dvdys6os_hostcaps())", deps);
			expect(r.error).toBeUndefined();
			expect(r.output).toContain('"live":{"provider":"live-p","id":"live-m"}');
			expect(r.output).toContain('"usage":{"tokens":7,"contextWindow":128,"percent":5.5}');
			expect(r.output).toContain('"setResult":true');
			expect(setCalls).toBe(1);
		} finally {
			unregisterSandboxFn("__pe_dvdys6os_hostcaps");
		}
	});

	test("V10d: absent getModel/setModel/getContextUsage stay undefined in SandboxCallContext (pe-dvdys6os)", async () => {
		const {
			registerContextualSandboxFn,
			unregisterSandboxFn,
		} = await import("../../shared/src/sandbox-registry");

		registerContextualSandboxFn("__pe_dvdys6os_hostabsent", (ctx) => () =>
			[typeof ctx.getModel, typeof ctx.setModel, typeof ctx.getContextUsage].join(","),
		);
		try {
			const sess = createCodeModeSession();
			const deps = makeDeps({
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
			});
			const r = await executeInSession(sess, "console.log(__pe_dvdys6os_hostabsent())", deps);
			expect(r.output).toContain("undefined,undefined,undefined");
		} finally {
			unregisterSandboxFn("__pe_dvdys6os_hostabsent");
		}
	});

	test("mesh.inbox is mirrored onto $.inbox as a non-destructive peek", async () => {
		const { registerSandboxFn, unregisterSandboxFn } = await import("../../shared/src/sandbox-registry");
		const pending = [{ from: "peer-1", preview: "hello" }];
		const meshFn = async () => "[]";
		(meshFn as any).inbox = () => pending;
		registerSandboxFn("mesh", meshFn);
		try {
			const sess = createCodeModeSession();
			const deps = makeDeps({
				injectSessionApi: false,
				injectConsoleWake: false,
				hydrateBareGlobals: false,
				injectRunbookRun: false,
			});
			const r = await executeInSession(sess, "console.log(JSON.stringify($.inbox)); console.log(JSON.stringify(await mesh.inbox()))", deps);
			expect(r.output).toContain(JSON.stringify(pending));
		} finally {
			unregisterSandboxFn("mesh");
		}
	});
});

function makeSquashFixture() {
	const sess = createCodeModeSession();
	const fakeSm = {
		getBranch: () => [],
		getEntries: () => [],
		getTree: () => [],
		getLeafId: () => "leaf-x",
		getSessionId: () => "sess-x",
		getSessionName: () => null,
		getLabel: () => undefined,
		getChildren: () => [],
		appendLabelChange: () => {},
		appendCustomEntry: () => {},
		branchWithSummary: (id: string) => id + "-branch",
	};
	const calls: unknown[] = [];
	const deps = makeDeps({
		sessionManager: fakeSm,
		compact: () => {},
		requestSquash: (opts) => calls.push(opts),
	});
	return { sess, calls, deps };
}

describe("executeInSession — session squash continuation hook", () => {
	test("V16-equivalent: session.squash() triggers requestSquash callback", async () => {
		const { sess, calls, deps } = makeSquashFixture();
		await executeInSession(sess, "session.squash({ continue: 'go' })", deps);
		expect(calls).toEqual([{ continue: "go" }]);
	});

	test("automatically snapshots $.ctx into a typed handoff", async () => {
		const { sess, calls, deps } = makeSquashFixture();
		await executeInSession(
			sess,
			"$.ctx = 'TASK — migrate'; session.squash({ continue: 'resume' })",
			deps,
		);
		expect(calls).toEqual([
			{
				continue: "resume",
				handoff: { text: "TASK — migrate", source: "ctx" },
			},
		]);
	});

	test("explicit handoff overrides $.ctx without exposing other saved state", async () => {
		const { sess, calls, deps } = makeSquashFixture();
		await executeInSession(
			sess,
			"$.ctx = 'stale'; $.pinned = [{ content: 'do not inject' }]; session.save('secret', 'do not inject'); session.squash({ handoff: { text: 'explicit' } })",
			deps,
		);
		expect(calls).toEqual([
			{ handoff: { text: "explicit", source: "explicit" } },
		]);
	});

	test("does not infer a handoff from pins or session.save records", async () => {
		const { sess, calls, deps } = makeSquashFixture();
		await executeInSession(
			sess,
			"$.pinned = [{ content: 'pin text' }]; session.save('ctx', 'saved text'); session.squash({ continue: 'resume' })",
			deps,
		);
		expect(calls).toEqual([{ continue: "resume" }]);
	});

	test("rejects oversized handoffs rather than silently truncating authority", async () => {
		const { sess, calls, deps } = makeSquashFixture();
		const result = await executeInSession(
			sess,
			`$.ctx = "x".repeat(${SQUASH_HANDOFF_MAX_BYTES + 1}); session.squash({ continue: "resume" })`,
			deps,
		);
		expect(calls).toEqual([]);
		expect(result.output).toContain("exceeding the " + SQUASH_HANDOFF_MAX_BYTES + "-byte limit");
	});

	test("enforces exact UTF-8 handoff bounds for ctx and explicit sources", async () => {
		const atLimitAscii = "x".repeat(SQUASH_HANDOFF_MAX_BYTES);
		const overLimitAscii = atLimitAscii + "x";
		const atLimitMultibyte = "é".repeat(SQUASH_HANDOFF_MAX_BYTES / 2);
		const overLimitMultibyte = atLimitMultibyte + "x";
		const cases = [
			{ source: "ctx" as const, text: atLimitAscii, accepted: true },
			{ source: "ctx" as const, text: overLimitAscii, accepted: false },
			{ source: "explicit" as const, text: atLimitMultibyte, accepted: true },
			{ source: "explicit" as const, text: overLimitMultibyte, accepted: false },
		];

		for (const testCase of cases) {
			const { sess, calls, deps } = makeSquashFixture();
			const code =
				testCase.source === "ctx"
					? `$.ctx = ${JSON.stringify(testCase.text)}; session.squash()`
					: `session.squash({ handoff: { text: ${JSON.stringify(testCase.text)} } })`;
			const result = await executeInSession(sess, code, deps);
			if (testCase.accepted) {
				expect(calls).toHaveLength(1);
				expect((calls[0] as { handoff: { text: string } }).handoff.text).toBe(
					testCase.text,
				);
			} else {
				expect(calls).toEqual([]);
				expect(result.output).toContain("exceeding the " + SQUASH_HANDOFF_MAX_BYTES + "-byte limit");
			}
		}
	});

	test("snapshots ctx and explicit handoff text when session.squash is requested", async () => {
		const ctxFixture = makeSquashFixture();
		await executeInSession(
			ctxFixture.sess,
			"$.ctx = 'ctx before'; session.squash(); $.ctx = 'ctx after'",
			ctxFixture.deps,
		);
		expect(ctxFixture.calls).toEqual([
			{ handoff: { text: "ctx before", source: "ctx" } },
		]);

		const explicitFixture = makeSquashFixture();
		await executeInSession(
			explicitFixture.sess,
			"const handoff = { text: 'explicit before' }; session.squash({ handoff }); handoff.text = 'explicit after'; $.ctx = 'ctx after'",
			explicitFixture.deps,
		);
		expect(explicitFixture.calls).toEqual([
			{ handoff: { text: "explicit before", source: "explicit" } },
		]);
	});

	test("V16b: session.squash() without compact dep logs unavailable + does NOT call requestSquash", async () => {
		const sess = createCodeModeSession();
		const fakeSm = {
			getBranch: () => [],
			getEntries: () => [],
			getTree: () => [],
			getLeafId: () => "leaf-x",
			getSessionId: () => "sess-x",
			getSessionName: () => null,
			getLabel: () => undefined,
			getChildren: () => [],
			appendLabelChange: () => {},
			appendCustomEntry: () => {},
			branchWithSummary: (id: string) => id,
		};
		let called = false;
		const deps = makeDeps({
			sessionManager: fakeSm,
			requestSquash: () => {
				called = true;
			},
			// note: no compact
		});
		const r = await executeInSession(sess, "session.squash({ continue: 'x' })", deps);
		expect(r.output).toContain("compaction not available");
		expect(called).toBe(false);
	});
});


describe("executeInSession — Read missing files", () => {
	test("hard-wait guard rejects await sleep over 5s with the correct idiom", async () => {
		const session = createCodeModeSession();
		const result = await executeInSession(session, "await sleep(30000);", { cwd: process.cwd(), signal: new AbortController().signal });
		expect(result.error).toContain("Hard-wait rejected");
		expect(result.error).toContain("console.wake");
	});

	test("hard-wait guard rejects shell sleep but allows short waits and condition polls", async () => {
		const session = createCodeModeSession();
		const bad = await executeInSession(session, "await Bash({ command: 'sleep 60' });", { cwd: process.cwd(), signal: new AbortController().signal });
		expect(bad.error).toContain("Hard-wait rejected");
		const ok = await executeInSession(session, "await sleep(50); console.log('short-ok');", { cwd: process.cwd(), signal: new AbortController().signal });
		expect(ok.output).toContain("short-ok");
	});

	test("Buffer is available inside the sandbox (phantom-global class removed)", async () => {
		const session = createCodeModeSession();
		const result = await executeInSession(session, "console.log(Buffer.from('ok').toString('base64'))", { cwd: process.cwd(), signal: new AbortController().signal });
		expect(result.output).toContain("b2s=");
	});

	test("Read missing file reports clear error and optional=true returns null", async () => {
		const sess = createCodeModeSession();
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "read-missing-"));
		try {
			const r1 = await executeInSession(sess, "await Read({ path: 'missing-AGENTS.md' })", makeDeps({ cwd }));
			expect(r1.error).toContain("Read: file not found: missing-AGENTS.md");
			expect(r1.output).toContain("optional: true");

			const r2 = await executeInSession(sess, "const value = await Read({ path: 'missing-AGENTS.md', optional: true }); console.log(value === null);", makeDeps({ cwd }));
			expect(r2.error).toBeUndefined();
			expect(r2.output).toContain("true");
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});

	test("Read directory reports clear error and suggests SKILL.md when present", async () => {
		const sess = createCodeModeSession();
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "read-dir-"));
		try {
			fs.mkdirSync(path.join(cwd, "20-02-example"));
			fs.writeFileSync(path.join(cwd, "20-02-example", "SKILL.md"), "# Skill\n");
			const result = await executeInSession(sess, "await Read({ path: '20-02-example' })", makeDeps({ cwd }));

			expect(result.error).toContain("Read: path is a directory: 20-02-example");
			expect(result.output).toContain("SKILL.md");
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});
});

describe("executeInSession — Read binary files", () => {
	test("Read PNG file returns image description, not raw bytes", async () => {
		const sess = createCodeModeSession();
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "read-binary-"));
		try {
			// Create a minimal 1x1 PNG
			const pngHeader = Buffer.from([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
				0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
				0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
				0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
				0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
				0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
				0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
				0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
				0x44, 0xae, 0x42, 0x60, 0x82,
			]);
			fs.writeFileSync(path.join(cwd, "test.png"), pngHeader);

			const result = await executeInSession(
				sess,
				"const content = await Read({ path: 'test.png' }); console.log(content);",
				makeDeps({ cwd }),
			);
			expect(result.error).toBeUndefined();
			expect(result.output).toContain("image/png");
			expect(result.output).toContain("test.png");
			// Must NOT contain raw binary garbage
			expect(result.output).not.toContain("IHDR");
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});

	test("Read non-image binary file returns binary description", async () => {
		const sess = createCodeModeSession();
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "read-binary-other-"));
		try {
			// Create a minimal gzip file (magic: 1f 8b)
			const gzipHeader = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
			fs.writeFileSync(path.join(cwd, "data.gz"), gzipHeader);

			const result = await executeInSession(
				sess,
				"const content = await Read({ path: 'data.gz' }); console.log(content);",
				makeDeps({ cwd }),
			);
			expect(result.error).toBeUndefined();
			expect(result.output).toContain("Binary file");
			expect(result.output).toContain("gzip");
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});

	test("Read text file still works normally", async () => {
		const sess = createCodeModeSession();
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "read-text-"));
		try {
			fs.writeFileSync(path.join(cwd, "hello.txt"), "Hello World\nLine 2\n", "utf-8");
			const result = await executeInSession(
				sess,
				"const content = await Read({ path: 'hello.txt' }); console.log(content);",
				makeDeps({ cwd }),
			);
			expect(result.error).toBeUndefined();
			expect(result.output).toContain("Hello World");
			expect(result.output).toContain("Line 2");
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});

	test("Read text file with offset and limit still works", async () => {
		const sess = createCodeModeSession();
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "read-text-offset-"));
		try {
			fs.writeFileSync(path.join(cwd, "lines.txt"), "line1\nline2\nline3\nline4\n", "utf-8");
			const result = await executeInSession(
				sess,
				"const content = await Read({ path: 'lines.txt', offset: 2, limit: 2 }); console.log(content);",
				makeDeps({ cwd }),
			);
			expect(result.error).toBeUndefined();
			expect(result.output.trim()).toBe("line2\nline3");
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});
});

describe("executeInSession — rg/fd symlink following", () => {
	test("rg/fd follow symlinks by default, opt out with follow=false", async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-mode-follow-"));
		try {
			fs.mkdirSync(path.join(tmp, "target"));
			fs.writeFileSync(path.join(tmp, "target", "needle.txt"), "needle\n", "utf-8");
			fs.symlinkSync(path.join(tmp, "target"), path.join(tmp, "link"), "dir");

			const sess = createCodeModeSession();
			const res = await executeInSession(
				sess,
				[
					"const rgDefault = await rg({ args: 'needle .' });",
					"const rgNoFollow = await rg({ args: 'needle .', follow: false });",
					"const fdDefault = await fd({ args: 'needle.txt .' });",
					"const fdNoFollow = await fd({ args: 'needle.txt .', follow: false });",
					"console.log(JSON.stringify({ rgDefault, rgNoFollow, fdDefault, fdNoFollow }));",
				].join("\n"),
				makeDeps({ cwd: tmp, allowedTools: new Set(["rg", "fd"]) }),
			);

			const parsed = JSON.parse(res.output.trim());
			expect(parsed.rgDefault).toContain("link/needle.txt");
			expect(parsed.fdDefault).toContain("link/needle.txt");
			expect(parsed.rgNoFollow).not.toContain("link/needle.txt");
			expect(parsed.fdNoFollow).not.toContain("link/needle.txt");
			expect(parsed.rgNoFollow).toContain("target/needle.txt");
			expect(parsed.fdNoFollow).toContain("target/needle.txt");
		} finally {
			fs.rmSync(tmp, { recursive: true, force: true });
		}
	});
});
