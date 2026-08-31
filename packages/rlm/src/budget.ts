/**
 * RLM iteration/token budget — the forced-return contract (#10).
 *
 * Workers that explore to the iteration cap and return nothing burn the entire
 * fan-out's tokens for zero value. The fix is a generation-time contract: every
 * tool result carries the remaining budget, and near the cap (or the optional
 * input-token ceiling) the result orders an immediate partial return. Kept as
 * a pure module so it is unit-testable without the pi-ai import chain.
 */
export interface BudgetState {
	turns?: number;
	usage: { input: number; output: number };
}

export function budgetSuffix(
	state: BudgetState,
	opts: { maxInputTokens?: number },
	maxIterations: number,
): string {
	const remaining = maxIterations - (state.turns ?? 0);
	const overTokens = opts.maxInputTokens !== undefined && state.usage.input >= opts.maxInputTokens;
	if (overTokens || remaining <= 2)
		return "\n\n🔚 RETURN NOW: call rlm.return({...}) with your best PARTIAL result — an incomplete return beats none. Do NOT start new exploration." + (overTokens ? " (input-token budget reached)" : "");
	if (remaining <= 5) return `\n\n[budget: ${remaining} iterations left — rlm.return by iteration ${maxIterations - 2} with your best partial result]`;
	return "";
}
