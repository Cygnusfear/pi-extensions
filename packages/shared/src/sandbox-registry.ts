/**
 * Shared registry for sandbox-callable functions.
 * Extensions register their tool implementations here.
 * Code-mode reads and injects them into the sandbox.
 *
 * Uses globalThis to guarantee shared state across module instances
 * (jiti/bun may create separate module instances per extension).
 *
 * Two registration shapes:
 *   - registerSandboxFn(name, fn)             — constant fn, identical for every call
 *   - registerContextualSandboxFn(name, fact) — factory(ctx) invoked per-call so the
 *     fn can close over the current execute_code's signal/cwd/model/registry/etc.
 *
 * Backward compat: registerSandboxFn(name, fn) is preserved as a public API. Internally
 * it stores fn behind a constant factory `_ => fn`. unregister, getSandboxFns and
 * getSandboxFnNames keep their original semantics.
 */

import type { ModelRegistry } from "@mariozechner/pi-coding-agent";

const REGISTRY_KEY = "__pi_sandbox_fn_registry_v2__";

type SandboxFn = (...args: any[]) => any;
type ContextualFactory = (ctx: SandboxCallContext) => SandboxFn;

interface RegistryEntry {
	factory: ContextualFactory;
	contextual: boolean;
}

export interface SandboxCallContext {
	signal: AbortSignal;
	cwd: string;
	model: { provider: string; id: string };
	modelRegistry: ModelRegistry;
	sendMessage?: (msg: unknown, opts?: unknown) => void;
	sendUserMessage?: (msg: string, opts?: { deliverAs?: "followUp" | "steer" }) => void;
}

function getRegistry(): Map<string, RegistryEntry> {
	if (!(globalThis as any)[REGISTRY_KEY]) {
		(globalThis as any)[REGISTRY_KEY] = new Map<string, RegistryEntry>();
	}
	return (globalThis as any)[REGISTRY_KEY];
}

/**
 * Register a fixed sandbox fn. Same callable for every call. The fn's signature is
 * unchanged from earlier versions: it receives only user-supplied call args.
 */
export function registerSandboxFn(name: string, fn: SandboxFn): void {
	getRegistry().set(name, { factory: () => fn, contextual: false });
}

/**
 * Register a contextual sandbox fn. The factory runs per-call inside executeInSession
 * with the current host call's SandboxCallContext (signal, cwd, model, modelRegistry,
 * etc.) and returns the actual closure that user code calls.
 */
export function registerContextualSandboxFn(name: string, factory: ContextualFactory): void {
	getRegistry().set(name, { factory, contextual: true });
}

export function unregisterSandboxFn(name: string): void {
	getRegistry().delete(name);
}

/**
 * Returns the non-contextual entries only — preserves the original semantics so
 * legacy callers that still expected a flat map of constant fns keep working.
 */
export function getSandboxFns(): Record<string, SandboxFn> {
	const out: Record<string, SandboxFn> = {};
	for (const [name, entry] of getRegistry()) {
		if (!entry.contextual) out[name] = entry.factory(undefined as unknown as SandboxCallContext);
	}
	return out;
}

/**
 * Returns the names of all entries (contextual + non-contextual). Used by code-mode
 * for prompt/tool listing where the list of available names matters but not the
 * concrete callables.
 */
export function getSandboxFnNames(): string[] {
	return [...getRegistry().keys()];
}

/**
 * Build the per-call sandbox-fn map for executeInSession. Contextual factories are
 * invoked once with `ctx` so each in-block invocation of the resulting fn shares the
 * same closure. Non-contextual entries return their constant fn unchanged.
 */
export function getSandboxFnsForCall(ctx: SandboxCallContext): Record<string, SandboxFn> {
	const out: Record<string, SandboxFn> = {};
	for (const [name, entry] of getRegistry()) {
		out[name] = entry.factory(ctx);
	}
	return out;
}
