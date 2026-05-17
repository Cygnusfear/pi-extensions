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
});
