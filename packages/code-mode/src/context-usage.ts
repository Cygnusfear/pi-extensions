export interface ContextUsageLike {
	percent?: number | null;
	tokens?: number | null;
	used?: number | null;
	contextWindow?: number | null;
	limit?: number | null;
}

export type GetContextUsage = () => ContextUsageLike | null | undefined;

export const CONTEXT_GUARD_THRESHOLD = 0.94;

export function readContextUsage(getUsage?: GetContextUsage): ContextUsageLike | undefined {
	if (!getUsage) return undefined;
	try {
		const usage = getUsage();
		if (!usage || typeof usage !== "object") return undefined;
		return usage;
	} catch {
		return undefined;
	}
}

export function getKnownContextPercent(usage: ContextUsageLike | undefined): number | undefined {
	const percent = usage?.percent;
	return typeof percent === "number" && Number.isFinite(percent) ? percent : undefined;
}

export function isContextGuardActive(enabled: boolean, getUsage?: GetContextUsage): boolean {
	if (!enabled) return false;
	const percent = getKnownContextPercent(readContextUsage(getUsage));
	return percent !== undefined && percent >= CONTEXT_GUARD_THRESHOLD * 100;
}

function formatContextTokens(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function buildContextFooter(
	ctx: { getContextUsage?: GetContextUsage },
	options?: { contextGuardEnabled?: boolean; suppressBecauseCompactionScheduled?: boolean },
): string | null {
	if (options?.suppressBecauseCompactionScheduled) return null;

	const usage = readContextUsage(ctx.getContextUsage);
	const percent = getKnownContextPercent(usage);
	if (percent === undefined || percent < 30) return null;

	const pct = percent.toFixed(1);
	const totalTokens = formatContextTokens(usage?.tokens ?? usage?.used);
	const maxTokens = formatContextTokens(usage?.contextWindow ?? usage?.limit);
	const usedK = totalTokens > 0 ? Math.round(totalTokens / 1024) : 0;
	const maxK = maxTokens > 0 ? Math.round(maxTokens / 1024) : 0;
	const context = maxK > 0 ? `${usedK}k/${maxK}k CONTEXT` : `${pct}% CONTEXT`;

	if (percent >= 90) {
		const guard = isContextGuardActive(options?.contextGuardEnabled ?? true, ctx.getContextUsage)
			? " 🚫 CONTEXT GUARD ACTIVE — save thick context to $.ctx FIRST, then session.squash()"
			: "";
		return `💀 ${pct}% (${context}) MAINTENANCE NOW — session.squash() or contextCheckout() to reclaim context${guard}`;
	}
	if (percent >= 70) {
		return `🚨 ${pct}% (${context}) URGENT — session.squash() to compact, or contextCheckout() to squash a segment`;
	}
	if (percent >= 40) {
		return `🙈 ${pct}% (${context}) idiot threshold — start distilling state into $ vars + session.save()`;
	}
	return `📊 ${pct}% (${context})`;
}
