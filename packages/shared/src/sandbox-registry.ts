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

import type { ModelRegistry } from "@earendil-works/pi-coding-agent";

const REGISTRY_KEY = "__pi_sandbox_fn_registry_v2__";

type SandboxFn = (...args: any[]) => any;
type ContextualFactory = (ctx: SandboxCallContext) => SandboxFn;

interface RegistryEntry {
	factory: ContextualFactory;
	contextual: boolean;
}

/** A lightweight immutable parent-session identity for contextual sandbox fns. */
export interface ParentSessionIdentity {
	id?: string;
	name?: string;
	file?: string;
}

/**
 * Live context-usage snapshot for the active model (pe-dvdys6os). Structurally
 * mirrors the host's ContextUsage; `tokens`/`percent` are null when unknown
 * (e.g. right after compaction, before the next assistant response).
 */
export interface SandboxContextUsage {
	tokens: number | null;
	contextWindow: number;
	percent: number | null;
}

export interface SandboxImageAttachment {
	readonly fileName: string;
	readonly mimeType: string;
	readonly base64: string;
}

export interface SandboxCallContext {
	signal: AbortSignal;
	cwd: string;
	model: { provider: string; id: string };
	modelRegistry: ModelRegistry;
	/**
	 * Live host model, read fresh per invocation (pe-dvdys6os). Unlike the
	 * per-call `model` snapshot above — captured when execute_code began — this
	 * reflects a same-block model.switch() on the next read.
	 */
	getModel?: () => { provider: string; id: string } | undefined;
	/**
	 * Request a host model switch; delegates to host pi.setModel. Resolves false
	 * when the target has no configured auth. Effective next-turn, never mid-turn.
	 */
	setModel?: (model: unknown) => Promise<boolean>;
	/**
	 * Live context usage for the active model. `tokens` is null when unknown
	 * (e.g. right after compaction, before the next assistant response).
	 */
	getContextUsage?: () => SandboxContextUsage | undefined;
	sendMessage?: (msg: unknown, opts?: unknown) => void;
	sendUserMessage?: (msg: string, opts?: { deliverAs?: "followUp" | "steer" }) => void;
	/** Parent session identity (resolved once by code-mode from its SessionManager). */
	parentSession?: ParentSessionIdentity;
	/** Attach a host image to this execute_code session after model-budget preparation. */
	attachImage?: (image: SandboxImageAttachment) => Promise<string>;
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
/**
 * Dual-name aliases: direct LLM tools (mesh_tell, execute_code_async_list, …)
 * and their execute_code counterparts (mesh.tell, executeCodeAsyncList, …)
 * historically had DIFFERENT names, so agents constantly guessed the wrong
 * one and burned recovery turns on ReferenceErrors. An alias binds the exact
 * direct-tool name to the same implementation — one capability, one name,
 * conflation impossible. Aliases resolve lazily per call so a namespace
 * registered later still binds; a missing target simply yields no alias.
 */
const SANDBOX_ALIASES: Record<string, string> = {
	mesh_tell: "mesh.tell",
	mesh_broadcast: "mesh.broadcast",
	mesh_peers: "mesh",
	mesh_view: "mesh.view",
	mesh_interrupt: "mesh.interrupt",
	mesh_inbox: "mesh.inbox",
	mesh_join_channel: "mesh.joinChannel",
	mesh_leave_channel: "mesh.leaveChannel",
	mesh_chat: "mesh.chat",
	webfetch: "WebFetch",
	execute_code_async_list: "executeCodeAsyncList",
	execute_code_async_kill: "executeCodeAsyncKill",
};

function applyAliases(out: Record<string, SandboxFn>): void {
	for (const [alias, target] of Object.entries(SANDBOX_ALIASES)) {
		if (alias in out) continue;
		const dot = target.indexOf(".");
		if (dot < 0) {
			// Dotless target: bind the registered fn itself (e.g. mesh_peers → mesh).
			if (typeof out[target] === "function") out[alias] = out[target];
			continue;
		}
		const namespace = out[target.slice(0, dot)] as unknown as Record<string, unknown> | undefined;
		const fn = namespace?.[target.slice(dot + 1)];
		if (typeof fn === "function") out[alias] = fn as SandboxFn;
	}
}

export function getSandboxFnsForCall(ctx: SandboxCallContext): Record<string, SandboxFn> {
	const out: Record<string, SandboxFn> = {};
	for (const [name, entry] of getRegistry()) {
		out[name] = entry.factory(ctx);
	}
	applyAliases(out);
	return out;
}
