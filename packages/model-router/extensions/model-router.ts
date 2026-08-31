/**
 * model-router extension for pi.
 *
 * Exposes `modelRouter` as a namespaced sandbox callable in code-mode.
 * Also injects a "Roles → resolved models" block into the system prompt
 * on every agent start so agents see roles instead of hardcoded model IDs.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	PROVIDER_KEY_CHANGED_CHANNEL,
	type ProviderKeyChanged,
} from "@pi-extensions/shared/provider-limits";
import {
	registerContextualSandboxFn,
	type SandboxCallContext,
	type SandboxContextUsage,
} from "@pi-extensions/shared/sandbox-registry";
import { observeAssistantMessage } from "../src/observe.js";
import {
	checkModelHealth,
	clearLiveness,
	getLiveness,
	livenessExpiry,
	loadAllRoles,
	type MarkUnhealthyOptions,
	markHealthy,
	markProvidersHealthy,
	markUnhealthy,
	type ResolverContext,
	resolve,
} from "../src/router.js";
import type { LivenessEntry, ResolveResult } from "../src/types.js";

// ── Agent self-serve model pair (pe-dvdys6os; research pe-na057klm) ───────────
//
// model.current() / model.switch() let the agent inspect and switch its OWN
// model from code-mode. This is deliberately separate from:
//   - modelRouter (below) — role → concrete model resolution + fleet health policy
//   - mesh-model-control — remote, Hooman-authorized harness control
//
// Timing (pi-agent source, pe-na057klm): pi.setModel mutates Agent.state
// immediately, appends a model_change entry, saves the default, and awaits
// model_select. agent-loop prepareNextTurn refreshes config.model after
// turn_end, so the NEXT provider request in the same run uses the target; the
// current assistant turn and all sibling tool calls stay on the old model.

/**
 * Reserve tokens assumed for the target context window during admission.
 * 16384 is the documented pi-agent core default; the configured reserve is NOT
 * exposed through ExtensionContext, so this conservative extension-only policy
 * hard-codes the default (documented assumption, pe-dvdys6os).
 */
export const MODEL_SWITCH_RESERVE_TOKENS = 16384;

export interface ModelCurrentResult {
	provider: string;
	modelId: string;
	/** Window from the registry (usage fallback); null when unknown. */
	contextWindow: number | null;
	/** Live context tokens; null when unknown (e.g. right after compaction). */
	tokens: number | null;
	/** True exactly when tokens is null — callers must not treat null as 0. */
	contextUnknown: boolean;
}

export interface ModelSwitchSuccess {
	ok: true;
	from: string;
	to: string;
	/** Switch is never mid-turn: the next provider request uses the target. */
	effective: "next-turn";
	/** pi.setModel appended model_change and saved the default. */
	persisted: true;
	event: "model_select";
	/** "known" = real token count admitted; "unknown-nonshrinking" = tokens unknown, allowed only because the window does not shrink. */
	admission: "known" | "unknown-nonshrinking";
	usage: SandboxContextUsage | null;
	reserveTokens: number;
}

export interface ModelSwitchNoop {
	ok: true;
	/** Target already IS the live model; setModel was NOT called, nothing persisted. */
	noop: true;
	from: string;
	to: string;
}

export interface ModelSwitchFailure {
	ok: false;
	code:
		| "not_found"
		| "unavailable"
		| "unhealthy"
		| "invalid_window"
		| "needs_compaction"
		| "context_unknown"
		| "auth_failed";
	target: string;
	reason?: string;
	/** unhealthy: liveness expiry ISO string. */
	expires?: string;
	/** invalid_window: the offending window value. */
	contextWindow?: number | null;
	/** needs_compaction: live tokens and the admission limit that was exceeded. */
	tokens?: number;
	limit?: number;
}

export type ModelSwitchResult =
	| ModelSwitchSuccess
	| ModelSwitchNoop
	| ModelSwitchFailure;

export interface ModelNamespace {
	/** Calling the namespace directly is shorthand for model.current(). */
	(): Promise<ModelCurrentResult>;
	current: () => Promise<ModelCurrentResult>;
	switch: (params: { target: string }) => Promise<ModelSwitchResult>;
}

// Per-session serialization: every switch (across all execute_code calls in this
// host process) queues on one promise chain, so concurrent switches can never
// interleave their admission read with another switch's mutation. Usage is
// re-read inside the chain, immediately before the mutation.
let modelSwitchChain: Promise<unknown> = Promise.resolve();

function serializeModelSwitch<T>(fn: () => Promise<T>): Promise<T> {
	const run = modelSwitchChain.then(fn);
	modelSwitchChain = run.catch(() => undefined);
	return run;
}

/**
 * Exact model identity for the self-switch namespace (host semantics:
 * provider === and id ===, pi-agent models.ts). The router resolver's
 * lowercasing is a different public contract and must NOT leak into
 * exact-target switching — a case-variant is a DIFFERENT model.
 */
function sameModelIdentity(
	a: { provider: string; id: string },
	b: { provider: string; id: string },
): boolean {
	return a.provider === b.provider && a.id === b.id;
}

/**
 * Build the per-call `model` namespace from the host's SandboxCallContext.
 * Exported for tests; the extension registers it as a contextual sandbox fn.
 */
export function createModelNamespace(ctx: SandboxCallContext): ModelNamespace {
	/** Live model: fresh host read when available, else the per-call snapshot. */
	const readLiveModel = (): { provider: string; id: string } | undefined =>
		ctx.getModel?.() ?? ctx.model;

	const currentWindow = (): number | null => {
		const live = readLiveModel();
		if (!live) return null;
		const full = ctx.modelRegistry.find(live.provider, live.id);
		return (
			full?.contextWindow ?? ctx.getContextUsage?.()?.contextWindow ?? null
		);
	};

	const current = async (): Promise<ModelCurrentResult> => {
		const live = readLiveModel();
		const provider = live?.provider ?? "unknown";
		const modelId = live?.id ?? "unknown";
		const full = ctx.modelRegistry.find(provider, modelId);
		const usage = ctx.getContextUsage?.();
		const tokens = usage?.tokens ?? null;
		return {
			provider,
			modelId,
			contextWindow: full?.contextWindow ?? usage?.contextWindow ?? null,
			tokens,
			contextUnknown: tokens === null,
		};
	};

	const switchImpl = async (rawTarget: string): Promise<ModelSwitchResult> => {
		// 1. Host capability gate — a missing setModel means the host predates
		//    this seam; that is an infrastructure fact, so we throw.
		const setModel = ctx.setModel;
		if (!setModel) {
			throw new Error(
				"model.switch: host does not expose setModel (pi host too old for agent self-serve switching)",
			);
		}

		// Exact "provider/model" only — trim, split on the first "/", no fuzzy/alias.
		const target = rawTarget.trim();
		const slash = target.indexOf("/");
		const provider = slash > 0 ? target.slice(0, slash) : "";
		const modelId = slash > 0 ? target.slice(slash + 1) : "";

		// 2. Resolve against the registry (exact match, same semantics as ModelRegistry.find).
		const model =
			provider && modelId
				? ctx.modelRegistry.find(provider, modelId)
				: undefined;
		if (!model) {
			return {
				ok: false,
				code: "not_found",
				target,
				reason:
					'expected exact "provider/model" present in the model registry (no fuzzy/alias matching)',
			};
		}
		const to = model.provider + "/" + model.id;

		// 3. Idempotent same-model result — never calls setModel.
		const live = readLiveModel();
		const from = live ? live.provider + "/" + live.id : "unknown";
		if (live && sameModelIdentity(live, model)) {
			return { ok: true, noop: true, from, to };
		}

		// 4. Auth: configured auth or getAvailable() membership.
		const authed =
			ctx.modelRegistry.hasConfiguredAuth(model) ||
			ctx.modelRegistry.getAvailable().some((m) => sameModelIdentity(m, model));
		if (!authed) {
			return {
				ok: false,
				code: "unavailable",
				target: to,
				reason: "no configured auth for target model",
			};
		}

		// 5. Health: model-router liveness policy (separate from core auth).
		const health = checkModelHealth(to);
		if (!health.healthy) {
			return {
				ok: false,
				code: "unhealthy",
				target: to,
				reason: health.entry?.reason ?? "unknown",
				expires: health.entry
					? (livenessExpiry(health.entry)?.toISOString() ?? "unknown")
					: "unknown",
			};
		}

		// 6. Context-window admission (conservative, extension-only).
		const reserve = MODEL_SWITCH_RESERVE_TOKENS;
		const window = model.contextWindow;
		if (typeof window !== "number" || !Number.isFinite(window) || window <= 0) {
			return {
				ok: false,
				code: "invalid_window",
				target: to,
				contextWindow: typeof window === "number" ? window : null,
			};
		}
		const limit = window - reserve;
		// Re-read usage immediately before the mutation (inside the serialized chain).
		const usage = ctx.getContextUsage?.() ?? null;
		const tokens = usage?.tokens ?? null;
		let admission: "known" | "unknown-nonshrinking";
		if (tokens !== null) {
			if (tokens > limit) {
				return {
					ok: false,
					code: "needs_compaction",
					target: to,
					tokens,
					limit,
				};
			}
			admission = "known";
		} else {
			// Unknown tokens: allow only non-shrinking moves — never a leap into a
			// possibly-smaller window we cannot prove fits.
			const curWindow = currentWindow();
			if (curWindow === null || window < curWindow) {
				return {
					ok: false,
					code: "context_unknown",
					target: to,
					reason:
						"context tokens unknown (post-compaction) and target window is not provably non-shrinking",
				};
			}
			admission = "unknown-nonshrinking";
		}

		// 8. Mutate. pi.setModel persists model_change + default and awaits model_select.
		const ok = await setModel(model);
		if (!ok) {
			return {
				ok: false,
				code: "auth_failed",
				target: to,
				reason: "host setModel rejected the model (auth check failed)",
			};
		}
		return {
			ok: true,
			from,
			to,
			effective: "next-turn",
			persisted: true,
			event: "model_select",
			admission,
			usage,
			reserveTokens: reserve,
		};
	};

	const switchModel = (params: {
		target: string;
	}): Promise<ModelSwitchResult> => {
		if (
			!params ||
			typeof params.target !== "string" ||
			params.target.trim() === ""
		) {
			throw new TypeError(
				'model.switch requires { target: "provider/model" } — exact string, no aliases',
			);
		}
		return serializeModelSwitch(() => switchImpl(params.target));
	};

	// Callable namespace — matches the modelRouter/mesh convention and the
	// registry's SandboxFn type. model() is shorthand for model.current().
	const fn = (async () => current()) as ModelNamespace;
	fn.current = current;
	fn.switch = switchModel;
	return fn;
}

function makeResolverContext(ctx: any): ResolverContext {
	return {
		getAvailable: () => ctx.modelRegistry.getAvailable(),
	};
}

function formatResolveResult(result: ResolveResult): string {
	const lines: string[] = [];
	lines.push(
		`Role: ${result.role} (requested ${result.count}, resolved ${result.resolved.length})`,
	);
	for (const m of result.resolved) {
		lines.push(`  ✓ ${m.id}`);
	}
	if (result.skipped.length > 0) {
		lines.push("  Skipped:");
		for (const m of result.skipped) {
			lines.push(`  ✗ ${m.id} — ${m.skipReason}`);
		}
	}
	return lines.join("\n");
}

export default function (pi: ExtensionAPI) {
	const disposeProviderKeyChanged = pi.events?.on(
		PROVIDER_KEY_CHANGED_CHANNEL,
		(data) => {
			if (!data || typeof data !== "object") return;
			const providerIds = (data as Partial<ProviderKeyChanged>).providerIds;
			if (
				!Array.isArray(providerIds) ||
				providerIds.some((id) => typeof id !== "string")
			)
				return;
			markProvidersHealthy(providerIds);
		},
	);

	// ── System prompt injection ──────────────────────────────────────────

	pi.on("before_agent_start", async (event, ctx) => {
		const roles = loadAllRoles();
		if (Object.keys(roles).length === 0) return;

		const resolverCtx = makeResolverContext(ctx);
		const lines: string[] = [
			"",
			"## Model roles",
			"When delegating to workers, use role names instead of hardcoded model IDs. The router selects concrete models from team-templates.json, filtered by availability and health.",
			"",
		];

		for (const [role, models] of Object.entries(roles)) {
			const resolved = resolve(resolverCtx, { role, count: 3 });
			if (resolved.resolved.length === 0) continue;
			const ids = resolved.resolved.map((m) => m.id).join(", ");
			lines.push(`- ${role} → ${ids}`);
		}

		lines.push("");

		// ── Blocking availability rules (rate-limit liveness) ────────────────
		const flagged = getLiveness();
		lines.push("## Model availability (BLOCKING)");
		if (flagged.length > 0) {
			lines.push(
				"These models are FLAGGED UNAVAILABLE — they rate-limited and will fail again if used:",
			);
			for (const entry of flagged) {
				const expiry = livenessExpiry(entry)?.toISOString() ?? "unknown";
				lines.push(
					`- ✗ ${entry.id} — ${entry.reason} (flagged ${entry.markedAt}, expires ${expiry})`,
				);
			}
		} else {
			lines.push("No models are currently flagged unavailable.");
		}
		lines.push("");
		lines.push(
			"HARD RULES — violating them burns money on guaranteed failures:",
		);
		lines.push(
			"- NEVER delegate, pin, or switch to a flagged model. It WILL fail again.",
		);
		lines.push(
			'- Before pinning ANY literal model, check it: `await modelRouter.isAvailable("provider/model")`.',
		);
		lines.push(
			'- If ANY model call fails on you with a rate-limit/quota error, flag it immediately: `await modelRouter.markUnhealthy({ id: "provider/model", reason: "rate_limited" })`. You owe the swarm that signal.',
		);
		lines.push(
			"- Prefer template roles over literal model pins — the router skips flagged models automatically.",
		);
		lines.push("");
		lines.push(
			"In code-mode: `const result = await modelRouter.resolve({ role: 'review', count: 3 });`",
		);
		lines.push(
			"In teams delegate: use `template: 'review'` — the leader resolves the model via the router.",
		);

		return { systemPrompt: event.systemPrompt + lines.join("\n") };
	});

	// ── Rate-limit liveness: flag on failure, heal on success ────────────────

	pi.on("message_end", async (event) => {
		observeAssistantMessage(
			event.message as Parameters<typeof observeAssistantMessage>[0],
		);
	});

	// ── Sandbox callable ─────────────────────────────────────────────────

	// Agent self-serve pair: model.current() + model.switch({ target }).
	// Local self-switch only — remote/Hooman-authorized control stays in
	// mesh-model-control; role resolution/health stays in modelRouter below.
	registerContextualSandboxFn("model", (ctx) => createModelNamespace(ctx));

	registerContextualSandboxFn("modelRouter", (ctx) => {
		const resolverCtx = makeResolverContext(ctx);

		const fn = async (params: {
			role: string;
			count?: number;
			dedupProviders?: boolean;
		}) => {
			const result = resolve(resolverCtx, params);
			return result;
		};

		(fn as any).resolve = fn;

		(fn as any).markUnhealthy = async (opts: MarkUnhealthyOptions) => {
			return markUnhealthy(opts);
		};

		(fn as any).markHealthy = async (id: string) => {
			return markHealthy(id);
		};

		(fn as any).isAvailable = async (id: string) => {
			const normalized = id.toLowerCase();
			const availableModels = resolverCtx.getAvailable();
			const bareId = normalized.includes("/")
				? normalized.slice(normalized.indexOf("/") + 1)
				: normalized;
			const hasKey = availableModels.some(
				(m) =>
					`${m.provider}/${m.id}`.toLowerCase() === normalized ||
					m.id.toLowerCase() === bareId,
			);
			const health = checkModelHealth(normalized);
			const reasons: string[] = [];
			if (!hasKey) reasons.push("no_api_key");
			if (!health.healthy) {
				const expiry = health.entry
					? (livenessExpiry(health.entry)?.toISOString() ?? "unknown")
					: "unknown";
				reasons.push(
					`unhealthy: ${health.entry?.reason ?? "unknown"} (expires ${expiry})`,
				);
			}
			return { id, available: hasKey && health.healthy, reasons };
		};

		(fn as any).liveness = async () => {
			return getLiveness();
		};

		(fn as any).clear = async () => {
			clearLiveness();
			return { ok: true };
		};

		(fn as any).roles = async () => {
			return loadAllRoles();
		};

		return fn;
	});

	pi.on("session_shutdown", () => {
		disposeProviderKeyChanged?.();
	});
}
