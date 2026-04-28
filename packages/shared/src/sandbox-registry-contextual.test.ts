/**
 * Tests for packages/shared/src/sandbox-registry.ts contextual API (pe-tk4s).
 *
 * Verification:
 *   8. Contextual factory invoked per-call with the call's ctx; same call shares
 *      the same closure across in-block invocations.
 *   9. Legacy registerSandboxFn(name, fn) still appears in getSandboxFns() AND
 *      getSandboxFnsForCall(ctx).name() returns the same value.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
	getSandboxFns,
	getSandboxFnNames,
	getSandboxFnsForCall,
	registerContextualSandboxFn,
	registerSandboxFn,
	unregisterSandboxFn,
	type SandboxCallContext,
} from "./sandbox-registry";

const NAMESPACE = "__pe_tk4s_test_";

afterEach(() => {
	for (const name of getSandboxFnNames()) {
		if (name.startsWith(NAMESPACE)) unregisterSandboxFn(name);
	}
});

function makeCtx(signal?: AbortSignal): SandboxCallContext {
	return {
		signal: signal ?? new AbortController().signal,
		cwd: "/tmp",
		model: { provider: "test", id: "test-m" },
		modelRegistry: {} as any,
	};
}

describe("contextual sandbox-fn registry", () => {
	test("V8: factory invoked per call with the current call's ctx", () => {
		registerContextualSandboxFn(NAMESPACE + "abort", (ctx) => () =>
			ctx.signal.aborted ? "aborted" : "live",
		);

		const acA = new AbortController();
		const acB = new AbortController();
		const fnsA = getSandboxFnsForCall(makeCtx(acA.signal));
		const fnsB = getSandboxFnsForCall(makeCtx(acB.signal));
		expect((fnsA[NAMESPACE + "abort"] as () => string)()).toBe("live");

		acA.abort();
		expect((fnsA[NAMESPACE + "abort"] as () => string)()).toBe("aborted");
		// Closure B closes over a different signal — independent.
		expect((fnsB[NAMESPACE + "abort"] as () => string)()).toBe("live");
	});

	test("V8b: same call shares one closure across in-block invocations", () => {
		let factoryInvocations = 0;
		registerContextualSandboxFn(NAMESPACE + "counter", (_ctx) => {
			factoryInvocations++;
			let count = 0;
			return () => ++count;
		});

		const fns = getSandboxFnsForCall(makeCtx());
		const fn = fns[NAMESPACE + "counter"] as () => number;
		expect(fn()).toBe(1);
		expect(fn()).toBe(2);
		expect(fn()).toBe(3);
		// Factory was invoked exactly once for this call.
		expect(factoryInvocations).toBe(1);
	});

	test("V9: registerSandboxFn (legacy) appears in getSandboxFns AND getSandboxFnsForCall", () => {
		registerSandboxFn(NAMESPACE + "legacy", () => 42);
		const flat = getSandboxFns();
		expect((flat[NAMESPACE + "legacy"] as () => number)()).toBe(42);

		const perCall = getSandboxFnsForCall(makeCtx());
		expect((perCall[NAMESPACE + "legacy"] as () => number)()).toBe(42);
	});

	test("V9b: getSandboxFns OMITS contextual entries (legacy semantics preserved)", () => {
		registerContextualSandboxFn(NAMESPACE + "ctxonly", () => () => "ctx");
		registerSandboxFn(NAMESPACE + "fixedonly", () => "fixed");

		const flat = getSandboxFns();
		expect(flat[NAMESPACE + "ctxonly"]).toBeUndefined();
		expect((flat[NAMESPACE + "fixedonly"] as () => string)()).toBe("fixed");

		const names = getSandboxFnNames();
		expect(names).toContain(NAMESPACE + "ctxonly");
		expect(names).toContain(NAMESPACE + "fixedonly");
	});

	test("V9c: unregisterSandboxFn removes both contextual and constant entries", () => {
		registerContextualSandboxFn(NAMESPACE + "tmp1", () => () => "x");
		registerSandboxFn(NAMESPACE + "tmp2", () => "y");
		unregisterSandboxFn(NAMESPACE + "tmp1");
		unregisterSandboxFn(NAMESPACE + "tmp2");

		const names = getSandboxFnNames();
		expect(names).not.toContain(NAMESPACE + "tmp1");
		expect(names).not.toContain(NAMESPACE + "tmp2");
	});
});
