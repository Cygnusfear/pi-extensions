export interface ContextUsageLike {
	percent?: number | null;
	tokens?: number | null;
	used?: number | null;
	contextWindow?: number | null;
	limit?: number | null;
}

export type GetContextUsage = () => ContextUsageLike | null | undefined;

export const CONTEXT_GUARD_THRESHOLD = 0.94;
export const CONTEXT_CHECKER_CALL = "session.tokens()";
export const CONTEXT_CHECK_INSTRUCTION =
	"Run `session.tokens()` now. Context usage can change after compaction or a model switch; never act on an earlier percentage.";

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

/**
 * Advise a live check without echoing a percentage that can immediately become
 * stale after a compaction or model switch. The guard still uses the live host
 * value; only the model-facing directive is deliberately non-numeric.
 */
export function buildContextFooter(
	ctx: { getContextUsage?: GetContextUsage },
	options?: { contextGuardEnabled?: boolean; suppressBecauseCompactionScheduled?: boolean },
): string | null {
	if (options?.suppressBecauseCompactionScheduled) return null;

	const percent = getKnownContextPercent(readContextUsage(ctx.getContextUsage));
	if (percent === undefined || percent < 70) return null;

	if (percent >= 90) {
		const guard = isContextGuardActive(options?.contextGuardEnabled ?? true, ctx.getContextUsage)
			? " CONTEXT GUARD ACTIVE — save bounded narrative state before acting."
			: "";
		return `💀 CONTEXT CHECK REQUIRED — ${CONTEXT_CHECK_INSTRUCTION}${guard}`;
	}
	if (percent >= 80) {
		return `🚨 CONTEXT CHECK REQUIRED — ${CONTEXT_CHECK_INSTRUCTION}`;
	}
	return `🙈 CONTEXT CHECK ADVISED — ${CONTEXT_CHECK_INSTRUCTION}`;
}
