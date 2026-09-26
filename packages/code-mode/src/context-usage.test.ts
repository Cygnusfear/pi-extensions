import { describe, expect, test } from "bun:test";
import {
	buildContextFooter,
	CONTEXT_CHECKER_CALL,
	isContextGuardActive,
} from "./context-usage";

describe("context usage helpers", () => {
	test("treats null post-compaction usage as unknown instead of a compact warning", () => {
		const footer = buildContextFooter({
			getContextUsage: () => ({ tokens: null, contextWindow: 200_000, percent: null }),
		});

		expect(footer).toBeNull();
		expect(isContextGuardActive(true, () => ({ tokens: null, contextWindow: 200_000, percent: null }))).toBe(false);
	});

	test("uses a live checker instead of echoing a high percentage", () => {
		const footer = buildContextFooter({
			getContextUsage: () => ({ tokens: 190_000, contextWindow: 200_000, percent: 95 }),
		});

		expect(footer).toContain(CONTEXT_CHECKER_CALL);
		expect(footer).toContain("CONTEXT CHECK REQUIRED");
		expect(footer).not.toContain("95.0%");
		expect(footer).not.toContain("session.squash()");
		expect(isContextGuardActive(true, () => ({ tokens: 190_000, contextWindow: 200_000, percent: 95 }))).toBe(true);
	});

	test("suppresses a context warning when compaction is already scheduled", () => {
		const footer = buildContextFooter(
			{ getContextUsage: () => ({ tokens: 190_000, contextWindow: 200_000, percent: 95 }) },
			{ suppressBecauseCompactionScheduled: true },
		);

		expect(footer).toBeNull();
	});

	test("never turns a threshold into an automatic compaction instruction", () => {
		const at = (percent: number) =>
			buildContextFooter({ getContextUsage: () => ({ tokens: percent * 2000, contextWindow: 200_000, percent }) });

		expect(at(45)).toBeNull();
		expect(at(59)).toBeNull();
		expect(at(62)).toContain("CONTEXT CHECK ADVISED");
		expect(at(72)).toContain("CONTEXT CHECK REQUIRED");
		expect(at(85)).toContain("CONTEXT CHECK REQUIRED");
		for (const footer of [at(62), at(72), at(85)]) {
			expect(footer).toContain(CONTEXT_CHECKER_CALL);
			expect(footer).not.toContain("session.squash()");
			expect(footer).not.toMatch(/\d+\.\d+%/);
		}
	});
});
