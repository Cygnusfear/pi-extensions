/**
 * Tests for the agent self-serve model pair (pe-dvdys6os):
 * model.current() + model.switch({ target }) — pure admission/resolution matrix
 * driven through createModelNamespace with a fake SandboxCallContext.
 *
 * Matrix per ticket contract:
 *   - not_found (unregistered target, malformed target, bare-id alias attempt)
 *   - unavailable (registered, no configured auth)
 *   - unhealthy (liveness-flagged, with reason + expiry)
 *   - noop same-model (setModel NOT called)
 *   - tokens <, =, > limit (reserve 16384)
 *   - null-token shrink denied / non-shrink allowed / unverifiable denied
 *   - invalid window (zero / missing)
 *   - auth_failed (host setModel resolves false)
 *   - missing setModel → throws (host too old)
 *   - serialization: two concurrent switches serialize deterministically,
 *     usage re-read immediately before each mutation
 *   - namespace shape via fake SandboxCallContext + registry registration path
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import extension, {
	createModelNamespace,
	MODEL_SWITCH_RESERVE_TOKENS,
	type ModelNamespace,
} from "../extensions/model-router.js";
import { markUnhealthy } from "../src/router.js";
import {
	getSandboxFnsForCall,
	unregisterSandboxFn,
	type SandboxCallContext,
	type SandboxContextUsage,
} from "@pi-extensions/shared/sandbox-registry";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ORIG_HOME = process.env.HOME;
let TMPHOME: string;

beforeEach(() => {
	TMPHOME = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "model-ns-test-")));
	fs.mkdirSync(path.join(TMPHOME, ".pi", "agent"), { recursive: true });
	process.env.HOME = TMPHOME;
});

afterEach(() => {
	process.env.HOME = ORIG_HOME;
	fs.rmSync(TMPHOME, { recursive: true, force: true });
	unregisterSandboxFn("model");
	unregisterSandboxFn("modelRouter");
});

interface FakeModel {
	provider: string;
	id: string;
	contextWindow?: number;
}

const MODELS: FakeModel[] = [
	{ provider: "test", id: "current", contextWindow: 100_000 },
	{ provider: "test", id: "big", contextWindow: 200_000 },
	{ provider: "test", id: "small", contextWindow: 50_000 },
	{ provider: "test", id: "noauth", contextWindow: 200_000 },
	{ provider: "test", id: "badwin", contextWindow: 0 },
	{ provider: "test", id: "nowin" },
	{ provider: "test", id: "casetarget", contextWindow: 200_000 },
	{ provider: "test", id: "casevar", contextWindow: 200_000 },
];

const DEFAULT_AVAILABLE = ["test/current", "test/big", "test/small", "test/badwin", "test/nowin", "test/casetarget"];

function makeRegistry(available: string[], getAvailableModels?: FakeModel[]) {
	return {
		find: (provider: string, id: string) =>
			MODELS.find((m) => m.provider === provider && m.id === id),
		hasConfiguredAuth: (model: FakeModel) =>
			available.includes(model.provider + "/" + model.id),
		getAvailable: () =>
			getAvailableModels ?? MODELS.filter((m) => available.includes(m.provider + "/" + m.id)),
	} as any;
}

type FakeUsage = SandboxContextUsage;

interface MakeCtxOptions {
	/** Live model the host reports via getModel. Defaults to test/current. */
	live?: { provider: string; id: string };
	/** Models with configured auth. */
	available?: string[];
	/** Usage returned by getContextUsage. Default: { tokens: 1000, ... }. */
	usage?: FakeUsage;
	/** Omit getContextUsage entirely (host exposes no usage). */
	noUsage?: boolean;
	/** setModel mock behaviour. Default: resolve true. */
	setModel?: (model: unknown) => Promise<boolean>;
	/** Omit setModel entirely (host too old). */
	noSetModel?: boolean;
	/** Omit getModel entirely (fall back to per-call snapshot ctx.model). */
	noGetModel?: boolean;
	/** Event sink: getContextUsage pushes "usage". */
	events?: string[];
	/** Override getAvailable() membership entirely (case-variant regression). */
	getAvailableModels?: FakeModel[];
}

function makeCtx(opts?: MakeCtxOptions): SandboxCallContext {
	const usage = opts?.noUsage ? undefined : (opts?.usage ?? { tokens: 1_000, contextWindow: 100_000, percent: 1 });
	const ctx: SandboxCallContext = {
		signal: new AbortController().signal,
		cwd: "/tmp",
		model: { provider: "test", id: "current" },
		modelRegistry: makeRegistry(opts?.available ?? DEFAULT_AVAILABLE, opts?.getAvailableModels),
	};
	if (!opts?.noGetModel) {
		ctx.getModel = () => opts?.live ?? { provider: "test", id: "current" };
	}
	if (!opts?.noSetModel) {
		ctx.setModel = opts?.setModel ?? (async () => true);
	}
	if (usage !== undefined) {
		ctx.getContextUsage = () => {
			opts?.events?.push("usage");
			return usage;
		};
	}
	return ctx;
}

const LIMIT_BIG = 200_000 - MODEL_SWITCH_RESERVE_TOKENS;
const LIMIT_SMALL = 50_000 - MODEL_SWITCH_RESERVE_TOKENS;

// ── Namespace shape ──────────────────────────────────────────────────────────

describe("model namespace shape", () => {
	test("exposes current() and switch() via a fake SandboxCallContext", async () => {
		const ns = createModelNamespace(makeCtx());
		expect(typeof ns.current).toBe("function");
		expect(typeof ns.switch).toBe("function");
		// Callable shorthand: model() === model.current()
		const viaCall = await ns();
		const viaCurrent = await ns.current();
		expect(viaCall).toEqual(viaCurrent);
	});

	test("extension default export registers 'model' as a contextual sandbox fn", () => {
		extension({ on: () => {} } as any);
		const fns = getSandboxFnsForCall(makeCtx());
		// getSandboxFnsForCall invokes the factory once — the entry IS the namespace.
		const ns = fns.model as unknown as ModelNamespace;
		expect(typeof ns).toBe("function");
		expect(typeof ns.current).toBe("function");
		expect(typeof ns.switch).toBe("function");
	});
});

// ── model.current() ──────────────────────────────────────────────────────────

describe("model.current", () => {
	test("returns live getModel() over the per-call snapshot, window from registry", async () => {
		const ns = createModelNamespace(
			makeCtx({ live: { provider: "test", id: "big" }, usage: { tokens: 500, contextWindow: 100_000, percent: 0.5 } }),
		);
		const cur = await ns.current();
		expect(cur.provider).toBe("test");
		expect(cur.modelId).toBe("big");
		expect(cur.contextWindow).toBe(200_000); // registry, not usage
		expect(cur.tokens).toBe(500);
		expect(cur.contextUnknown).toBe(false);
	});

	test("falls back to the per-call snapshot when getModel is absent", async () => {
		const ns = createModelNamespace(makeCtx({ noGetModel: true }));
		const cur = await ns.current();
		expect(cur.provider).toBe("test");
		expect(cur.modelId).toBe("current");
		expect(cur.contextWindow).toBe(100_000);
	});

	test("tokens null → contextUnknown true (never fake a zero)", async () => {
		const ns = createModelNamespace(
			makeCtx({ usage: { tokens: null, contextWindow: 100_000, percent: null } }),
		);
		const cur = await ns.current();
		expect(cur.tokens).toBeNull();
		expect(cur.contextUnknown).toBe(true);
	});

	test("missing getContextUsage → tokens null, contextUnknown true", async () => {
		const ns = createModelNamespace(makeCtx({ noUsage: true }));
		const cur = await ns.current();
		expect(cur.tokens).toBeNull();
		expect(cur.contextUnknown).toBe(true);
		// Window still resolved from the registry.
		expect(cur.contextWindow).toBe(100_000);
	});
});

// ── model.switch — resolution + policy matrix ───────────────────────────────

describe("model.switch — resolution", () => {
	test("unregistered target → not_found", async () => {
		const ns = createModelNamespace(makeCtx());
		const r = await ns.switch({ target: "test/ghost" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe("not_found");
	});

	test("malformed target (no slash) → not_found; bare id is NOT alias-matched", async () => {
		const ns = createModelNamespace(makeCtx());
		const r = await ns.switch({ target: "big" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe("not_found");
	});

	test("missing setModel → throws (host too old), never fake success", async () => {
		const ns = createModelNamespace(makeCtx({ noSetModel: true }));
		await expect(ns.switch({ target: "test/big" })).rejects.toThrow(/setModel/);
	});

	test("registered but unauthenticated target → unavailable", async () => {
		const ns = createModelNamespace(makeCtx());
		const r = await ns.switch({ target: "test/noauth" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe("unavailable");
	});

	test("liveness-flagged target → unhealthy with reason + expiry", async () => {
		markUnhealthy({ id: "test/big", reason: "rate_limited", ttlSeconds: 600 });
		const ns = createModelNamespace(makeCtx());
		const r = await ns.switch({ target: "test/big" });
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.code).toBe("unhealthy");
			expect(r.reason).toBe("rate_limited");
			expect(typeof r.expires).toBe("string");
		}
	});

	test("same as current → noop, setModel NOT called", async () => {
		let setCalls = 0;
		const ns = createModelNamespace(makeCtx({ setModel: async () => { setCalls++; return true; } }));
		const r = await ns.switch({ target: "test/current" });
		expect(r.ok).toBe(true);
		if (r.ok && "noop" in r) expect(r.noop).toBe(true);
		expect(setCalls).toBe(0);
	});

	test("missing/blank target → TypeError", () => {
		const ns = createModelNamespace(makeCtx());
		expect(() => (ns.switch as any)({})).toThrow(TypeError);
		expect(() => (ns.switch as any)({ target: "   " })).toThrow(TypeError);
	});

	test("H1 regression: case-variant live model is NOT a noop — exact target invokes setModel", async () => {
		// Live "test/CaseTarget", requested registered exact "test/casetarget":
		// case-folded identity would fake a noop; exact identity must switch.
		let setCalls = 0;
		const ns = createModelNamespace(makeCtx({
			live: { provider: "test", id: "CaseTarget" },
			setModel: async () => { setCalls++; return true; },
		}));
		const r = await ns.switch({ target: "test/casetarget" });
		expect(r.ok).toBe(true);
		expect("noop" in r).toBe(false);
		expect(setCalls).toBe(1);
		if (r.ok && !("noop" in r)) {
			expect(r.from).toBe("test/CaseTarget");
			expect(r.to).toBe("test/casetarget");
		}
	});

	test("H1 regression: case-variant available entry does NOT authorize a different exact target", async () => {
		// getAvailable() reports "test/CASEVAR"; requested exact "test/casevar"
		// has no configured auth — case-folded membership would wrongly authorize.
		const ns = createModelNamespace(makeCtx({
			getAvailableModels: [{ provider: "test", id: "CASEVAR", contextWindow: 200_000 }],
		}));
		const r = await ns.switch({ target: "test/casevar" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe("unavailable");
	});

});

describe("model.switch — admission", () => {
	test("tokens < limit → ok, admission 'known'", async () => {
		const ns = createModelNamespace(
			makeCtx({ usage: { tokens: LIMIT_BIG - 1, contextWindow: 100_000, percent: 50 } }),
		);
		const r = await ns.switch({ target: "test/big" });
		expect(r.ok).toBe(true);
		if (r.ok && !("noop" in r)) expect(r.admission).toBe("known");
	});

	test("tokens = limit → ok (only > limit is refused)", async () => {
		const ns = createModelNamespace(
			makeCtx({ usage: { tokens: LIMIT_BIG, contextWindow: 100_000, percent: 90 } }),
		);
		const r = await ns.switch({ target: "test/big" });
		expect(r.ok).toBe(true);
	});

	test("tokens > limit → needs_compaction with tokens + limit", async () => {
		const ns = createModelNamespace(
			makeCtx({ usage: { tokens: LIMIT_SMALL + 1, contextWindow: 100_000, percent: 34 } }),
		);
		const r = await ns.switch({ target: "test/small" });
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.code).toBe("needs_compaction");
			expect(r.tokens).toBe(LIMIT_SMALL + 1);
			expect(r.limit).toBe(LIMIT_SMALL);
		}
	});

	test("null tokens + shrinking window → context_unknown", async () => {
		const ns = createModelNamespace(
			makeCtx({ usage: { tokens: null, contextWindow: 100_000, percent: null } }),
		);
		const r = await ns.switch({ target: "test/small" }); // 50k < 100k current
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe("context_unknown");
	});

	test("null tokens + non-shrinking window → ok, admission 'unknown-nonshrinking'", async () => {
		const ns = createModelNamespace(
			makeCtx({ usage: { tokens: null, contextWindow: 100_000, percent: null } }),
		);
		const r = await ns.switch({ target: "test/big" }); // 200k >= 100k current
		expect(r.ok).toBe(true);
		if (r.ok && !("noop" in r)) expect(r.admission).toBe("unknown-nonshrinking");
	});

	test("null tokens + unverifiable current window → context_unknown", async () => {
		// Live model is not in the registry and host exposes no usage → no window.
		const ns = createModelNamespace(
			makeCtx({ live: { provider: "ghost", id: "unregistered" }, noUsage: true }),
		);
		const r = await ns.switch({ target: "test/big" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe("context_unknown");
	});

	test("zero context window → invalid_window", async () => {
		const ns = createModelNamespace(makeCtx());
		const r = await ns.switch({ target: "test/badwin" });
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.code).toBe("invalid_window");
			expect(r.contextWindow).toBe(0);
		}
	});

	test("missing context window → invalid_window with null", async () => {
		const ns = createModelNamespace(makeCtx());
		const r = await ns.switch({ target: "test/nowin" });
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.code).toBe("invalid_window");
			expect(r.contextWindow).toBeNull();
		}
	});

	test("host setModel resolves false → auth_failed", async () => {
		const ns = createModelNamespace(makeCtx({ setModel: async () => false }));
		const r = await ns.switch({ target: "test/big" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe("auth_failed");
	});
});

describe("model.switch — success result + timing contract", () => {
	test("success carries from/to, next-turn timing, persistence, admission, usage, reserve", async () => {
		const usage = { tokens: 1234, contextWindow: 100_000, percent: 1.2 };
		const ns = createModelNamespace(makeCtx({ usage }));
		const r = await ns.switch({ target: "test/big" });
		expect(r).toEqual({
			ok: true,
			from: "test/current",
			to: "test/big",
			effective: "next-turn",
			persisted: true,
			event: "model_select",
			admission: "known",
			usage,
			reserveTokens: MODEL_SWITCH_RESERVE_TOKENS,
		});
	});

	test("target is trimmed before resolution", async () => {
		const ns = createModelNamespace(makeCtx());
		const r = await ns.switch({ target: "  test/big  " });
		expect(r.ok).toBe(true);
	});
});

describe("model.switch — per-session serialization", () => {
	test("two concurrent switches serialize; usage re-read before each mutation", async () => {
		const events: string[] = [];
		let releaseFirst!: () => void;
		const firstGate = new Promise<void>((resolveGate) => { releaseFirst = resolveGate; });
		let setCalls = 0;
		const setModel = async (model: unknown) => {
			setCalls++;
			const id = (model as FakeModel).id;
			events.push("set:start:" + id);
			if (setCalls === 1) await firstGate;
			events.push("set:end:" + id);
			return true;
		};
		const ctx = makeCtx({
			setModel,
			events, // getContextUsage pushes "usage"
			usage: { tokens: 1_000, contextWindow: 100_000, percent: 1 },
		});
		const ns = createModelNamespace(ctx);

		const sw1 = ns.switch({ target: "test/big" });
		// Let sw1 reach its (gated) setModel before firing sw2.
		await new Promise((r) => setTimeout(r, 10));
		const sw2 = ns.switch({ target: "test/small" });
		await new Promise((r) => setTimeout(r, 10));
		releaseFirst();
		const [r1, r2] = await Promise.all([sw1, sw2]);

		expect(r1.ok).toBe(true);
		expect(r2.ok).toBe(true);
		// Deterministic: sw2's usage read + mutation happen strictly after sw1's
		// mutation completed — the chain never interleaves admission with mutation.
		expect(events).toEqual([
			"usage",
			"set:start:big",
			"set:end:big",
			"usage",
			"set:start:small",
			"set:end:small",
		]);
	});
});
