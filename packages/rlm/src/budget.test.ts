import { describe, expect, test } from "bun:test";
import { budgetSuffix } from "./budget";

describe("rlm budget suffix", () => {
	test("no suffix with ample budget", () => {
		expect(budgetSuffix({ turns: 1, usage: { input: 0, output: 0 } }, {}, 20)).toBe("");
	});
	test("countdown within five iterations of the cap", () => {
		const s = budgetSuffix({ turns: 16, usage: { input: 0, output: 0 } }, {}, 20);
		expect(s).toContain("4 iterations left");
		expect(s).toContain("rlm.return by iteration 18");
	});
	test("forced return at two remaining, demanding partial results", () => {
		const s = budgetSuffix({ turns: 18, usage: { input: 0, output: 0 } }, {}, 20);
		expect(s).toContain("RETURN NOW");
		expect(s).toContain("PARTIAL");
	});
	test("input-token ceiling forces return regardless of iterations", () => {
		const s = budgetSuffix({ turns: 1, usage: { input: 250_000, output: 0 } }, { maxInputTokens: 200_000 }, 300);
		expect(s).toContain("RETURN NOW");
		expect(s).toContain("input-token budget reached");
	});
});
