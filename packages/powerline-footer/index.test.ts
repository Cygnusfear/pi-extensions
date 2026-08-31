import { describe, expect, test } from "bun:test";
import { computeUsageIncremental, createUsageCache, resolveThinkingLevel } from "./index";

function thinkingEntry(id: string, thinkingLevel: string) {
	return { id, type: "thinking_level_change", thinkingLevel };
}

function assistantEntry(id: string, input: number) {
	return {
		id,
		type: "message",
		message: {
			role: "assistant",
			stopReason: "stop",
			usage: {
				input,
				output: 2,
				cacheRead: 3,
				cacheWrite: 4,
				cost: { total: 5 },
			},
		},
	};
}

describe("powerline usage cache", () => {
	test("starts without inventing an off thinking level", () => {
		expect(createUsageCache().thinkingLevel).toBeUndefined();
	});

	test("prefers the live Pi level over a stale session fallback", () => {
		expect(resolveThinkingLevel("max", "off")).toBe("max");
		expect(resolveThinkingLevel(undefined, "high")).toBe("high");
		expect(resolveThinkingLevel(undefined, undefined)).toBe("off");
	});

	test("processes only appended entries on the same branch", () => {
		const cache = createUsageCache();
		computeUsageIncremental([thinkingEntry("a", "high")], cache);
		computeUsageIncremental([thinkingEntry("a", "high"), assistantEntry("b", 7)], cache);

		expect(cache.thinkingLevel).toBe("high");
		expect(cache.input).toBe(7);
		expect(cache.length).toBe(2);
		expect(cache.boundaryEntryId).toBe("b");
	});

	test("recomputes when navigating to an equal-length branch", () => {
		const cache = createUsageCache();
		computeUsageIncremental([thinkingEntry("a", "high"), assistantEntry("b", 7)], cache);
		computeUsageIncremental([thinkingEntry("c", "off"), assistantEntry("d", 11)], cache);

		expect(cache.thinkingLevel).toBe("off");
		expect(cache.input).toBe(11);
		expect(cache.boundaryEntryId).toBe("d");
	});

	test("recomputes before appending from a divergent longer branch", () => {
		const cache = createUsageCache();
		computeUsageIncremental([thinkingEntry("a", "high"), assistantEntry("b", 7)], cache);
		computeUsageIncremental(
			[thinkingEntry("a", "high"), assistantEntry("x", 11), thinkingEntry("y", "low")],
			cache,
		);

		expect(cache.thinkingLevel).toBe("low");
		expect(cache.input).toBe(11);
		expect(cache.length).toBe(3);
	});
});
