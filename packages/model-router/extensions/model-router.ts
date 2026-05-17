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
	type ResolverContext,
	type MarkUnhealthyOptions,
} from "../src/router.js";
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
		lines.push("In code-mode: `const result = await modelRouter.resolve({ role: 'review', count: 3 });`");
		lines.push("In teams delegate: use `template: 'review'` — the leader resolves the model via the router.");

		return { systemPrompt: event.systemPrompt + lines.join("\n") };
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