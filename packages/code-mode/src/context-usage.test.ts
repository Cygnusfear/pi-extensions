import { describe, expect, test } from "bun:test";
import { buildContextFooter, isContextGuardActive } from "./context-usage";

describe("context usage helpers", () => {
	test("treats null post-compaction usage as unknown instead of a compact warning", () => {
		const footer = buildContextFooter({
			getContextUsage: () => ({ tokens: null, contextWindow: 200_000, percent: null }),
		});

		expect(footer).toBeNull();
		expect(isContextGuardActive(true, () => ({ tokens: null, contextWindow: 200_000, percent: null }))).toBe(false);
	});

	test("emits the maintenance warning only for known finite high usage", () => {
		const footer = buildContextFooter({
			getContextUsage: () => ({ tokens: 190_000, contextWindow: 200_000, percent: 95 }),
		});

		expect(footer).toContain("95.0%");
		expect(footer).toContain("MAINTENANCE NOW");
		expect(isContextGuardActive(true, () => ({ tokens: 190_000, contextWindow: 200_000, percent: 95 }))).toBe(true);
	});

	test("suppresses stale footer when compaction is already scheduled", () => {
		const footer = buildContextFooter(
			{ getContextUsage: () => ({ tokens: 190_000, contextWindow: 200_000, percent: 95 }) },
			{ suppressBecauseCompactionScheduled: true },
		);

		expect(footer).toBeNull();
	});

	test("new ladder: 60% gets a quiet info footer — NO distill/squash pressure (the opus-eager fix)", () => {
		const at = (percent: number) =>
			buildContextFooter({ getContextUsage: () => ({ tokens: percent * 2000, contextWindow: 200_000, percent }) });
		// < 50 → no footer at all
		expect(at(45)).toBeNull();
		// 50–70 → info only, NO action words
		const f60 = at(60);
		expect(f60).toContain("60.0%");
		expect(f60).toContain("📊");
		expect(f60).not.toContain("idiot threshold");
		expect(f60).not.toContain("squash");
		// 70–80 → distill nudge (🙈)
		expect(at(72)).toContain("idiot threshold");
		// 80–90 → urgent squash (🚨)
		expect(at(82)).toContain("URGENT");
		expect(at(82)).toContain("session.squash()");
		// ≥ 90 → maintenance (💀)
		expect(at(91)).toContain("MAINTENANCE NOW");
	});
});
