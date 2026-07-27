/**
 * model-router extension for pi.
 *
 * Exposes `modelRouter` as a namespaced sandbox callable in code-mode.
 * Also injects a "Roles → resolved models" block into the system prompt
 * on every agent start so agents see roles instead of hardcoded model IDs.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerContextualSandboxFn } from "@pi-extensions/shared/sandbox-registry";
import {
	resolve,
	markUnhealthy,
	markHealthy,
	getLiveness,
	clearLiveness,
	loadAllRoles,
	checkModelHealth,
	livenessExpiry,
	type ResolverContext,
	type MarkUnhealthyOptions,
} from "../src/router.js";
import { observeAssistantMessage } from "../src/observe.js";
import type { ResolveResult, LivenessEntry } from "../src/types.js";

function makeResolverContext(ctx: any): ResolverContext {
	return {
		getAvailable: () => ctx.modelRegistry.getAvailable(),
	};
}

function formatResolveResult(result: ResolveResult): string {
	const lines: string[] = [];
	lines.push(`Role: ${result.role} (requested ${result.count}, resolved ${result.resolved.length})`);
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
			const ids = resolved.resolved.map(m => m.id).join(", ");
			lines.push(`- ${role} → ${ids}`);
		}

		lines.push("");

		// ── Blocking availability rules (rate-limit liveness) ────────────────
		const flagged = getLiveness();
		lines.push("## Model availability (BLOCKING)");
		if (flagged.length > 0) {
			lines.push("These models are FLAGGED UNAVAILABLE — they rate-limited and will fail again if used:");
			for (const entry of flagged) {
				const expiry = livenessExpiry(entry)?.toISOString() ?? "unknown";
				lines.push(`- ✗ ${entry.id} — ${entry.reason} (flagged ${entry.markedAt}, expires ${expiry})`);
			}
		} else {
			lines.push("No models are currently flagged unavailable.");
		}
		lines.push("");
		lines.push("HARD RULES — violating them burns money on guaranteed failures:");
		lines.push("- NEVER delegate, pin, or switch to a flagged model. It WILL fail again.");
		lines.push("- Before pinning ANY literal model, check it: `await modelRouter.isAvailable(\"provider/model\")`.");
		lines.push("- If ANY model call fails on you with a rate-limit/quota error, flag it immediately: `await modelRouter.markUnhealthy({ id: \"provider/model\", reason: \"rate_limited\" })`. You owe the swarm that signal.");
		lines.push("- Prefer template roles over literal model pins — the router skips flagged models automatically.");
		lines.push("");
		lines.push("In code-mode: `const result = await modelRouter.resolve({ role: 'review', count: 3 });`");
		lines.push("In teams delegate: use `template: 'review'` — the leader resolves the model via the router.");

		return { systemPrompt: event.systemPrompt + lines.join("\n") };
	});

	// ── Rate-limit liveness: flag on failure, heal on success ────────────────

	pi.on("message_end", async (event) => {
		observeAssistantMessage(event.message as Parameters<typeof observeAssistantMessage>[0]);
	});

	// ── Sandbox callable ─────────────────────────────────────────────────

	registerContextualSandboxFn("modelRouter", (ctx) => {
		const resolverCtx = makeResolverContext(ctx);

		const fn = async (params: { role: string; count?: number; dedupProviders?: boolean }) => {
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
			const bareId = normalized.includes("/") ? normalized.slice(normalized.indexOf("/") + 1) : normalized;
			const hasKey = availableModels.some(
				(m) => `${m.provider}/${m.id}`.toLowerCase() === normalized || m.id.toLowerCase() === bareId,
			);
			const health = checkModelHealth(normalized);
			const reasons: string[] = [];
			if (!hasKey) reasons.push("no_api_key");
			if (!health.healthy) {
				const expiry = health.entry ? (livenessExpiry(health.entry)?.toISOString() ?? "unknown") : "unknown";
				reasons.push(`unhealthy: ${health.entry?.reason ?? "unknown"} (expires ${expiry})`);
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
}