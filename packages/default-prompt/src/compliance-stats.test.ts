import { describe, expect, test } from "bun:test";
import {
	aggregateObservations,
	neverHitRules,
	parseObservations,
	renderDailyReport,
	topRuleHits,
	type ComplianceObservation,
} from "./compliance-stats.ts";

const now = Date.UTC(2026, 9, 8, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function observation(overrides: Partial<ComplianceObservation> = {}): ComplianceObservation {
	return {
		ts: now,
		model: "anthropic/claude-sonnet-5-5",
		classifier: "openrouter/perplexity/pplx-decider-v1.1-27b",
		ok: true,
		fired: [],
		cited: [],
		cost: 0.0002,
		usageReported: true,
		...overrides,
	};
}

describe("aggregation", () => {
	test("counts checks, flagged checks, and rule hits per model", () => {
		const stats = aggregateObservations(
			[
				observation({ fired: [{ id: "P06", p: 0.99 }], cited: ["P06"] }),
				observation({ fired: [{ id: "P06", p: 0.91 }, { id: "P09", p: 0.95 }] }),
				observation(),
				observation({ model: "openai-codex/gpt-5.6-luna", fired: [{ id: "P29", p: 0.97 }] }),
			],
			now - DAY,
		);
		expect(stats.checks).toBe(4);
		expect(stats.ruleHits).toEqual({ P06: 2, P09: 1, P29: 1 });
		const claude = stats.models.find((model) => model.model === "anthropic/claude-sonnet-5-5");
		expect(claude?.checks).toBe(3);
		expect(claude?.flagged).toBe(2);
		expect(claude?.ruleHits).toEqual({ P06: 2, P09: 1 });
		expect(stats.ruleHitsByModel["openai-codex/gpt-5.6-luna"]).toEqual({ P29: 1 });
	});

	test("counts a failed check as a failure, not as evidence about a rule", () => {
		const stats = aggregateObservations(
			[observation({ ok: false, cost: 0.0001 }), observation()],
			now - DAY,
		);
		expect(stats.checks).toBe(1);
		expect(stats.failures).toBe(1);
		expect(stats.ruleHits).toEqual({});
	});

	test("ignores observations outside the window", () => {
		const stats = aggregateObservations(
			[observation({ ts: now - 3 * DAY, fired: [{ id: "P06", p: 1 }] }), observation()],
			now - DAY,
		);
		expect(stats.checks).toBe(1);
		expect(stats.ruleHits).toEqual({});
	});

	test("sums cost across models, failures included", () => {
		const stats = aggregateObservations([observation(), observation({ ok: false })], now - DAY);
		expect(stats.cost).toBeCloseTo(0.0004, 8);
	});
});

describe("never-hit signal", () => {
	const stats = aggregateObservations(
		[observation({ fired: [{ id: "P06", p: 0.99 }] }), observation()],
		now - DAY,
	);

	test("lists rules with no hit in the window", () => {
		expect(neverHitRules(stats, ["P06", "P07", "P09"])).toEqual(["P07", "P09"]);
	});

	test("a rule fired once is not reported as never hit", () => {
		expect(neverHitRules(stats, ["P06"])).toEqual([]);
	});

	test("orders the biggest counts first", () => {
		const ranked = aggregateObservations(
			[
				observation({ fired: [{ id: "P06", p: 1 }] }),
				observation({ fired: [{ id: "P06", p: 1 }] }),
				observation({ fired: [{ id: "P09", p: 1 }] }),
			],
			now - DAY,
		);
		expect(topRuleHits(ranked, 5)).toEqual([
			["P06", 2],
			["P09", 1],
		]);
	});
});

describe("report", () => {
	const stats = aggregateObservations(
		[
			observation({ fired: [{ id: "P06", p: 0.99 }], cited: ["P06"] }),
			observation(),
			observation({ model: "openai-codex/gpt-5.6-luna", fired: [{ id: "P29", p: 0.97 }] }),
		],
		now - DAY,
	);
	const report = renderDailyReport(
		stats,
		["P06", "P29", "P07"],
		{ P06: "context claims", P29: "deferral", P07: "compaction" },
		{ days: 1, generatedAt: now },
	);

	test("names the fired rule, its label, and the model behind it", () => {
		expect(report).toContain("P06");
		expect(report).toContain("context claims");
		expect(report).toContain("anthropic/claude-sonnet-5-5");
	});

	test("separates never-fired rules and refuses to call them redundant", () => {
		expect(report).toContain("Rules never fired anywhere");
		expect(report).toContain("P07");
		expect(report).toContain("candidate to re-read, not to delete");
	});

	test("reports the window and the spend", () => {
		expect(report).toContain("last 24 hours");
		expect(report).toContain("$0.0006 reported");
	});

	test("says spend is not reported rather than printing a zero it cannot see", () => {
		const blind = aggregateObservations(
			[observation({ usageReported: false, cost: 0 })],
			now - DAY,
		);
		const text = renderDailyReport(blind, ["P06"], { P06: "context claims" }, {
			days: 1,
			generatedAt: now,
		});
		expect(text).toContain("spend not reported by the classifier");
		expect(text).not.toContain("$0.0000");
	});
});

describe("log parsing", () => {
	test("skips a truncated line instead of failing the report", () => {
		const good = JSON.stringify(observation({ fired: [{ id: "P06", p: 0.9 }] }));
		const truncated = '{"ts":1,"model":"x"';
		const parsed = parseObservations(good + "\n" + truncated);
		expect(parsed.length).toBe(1);
		expect(parsed[0].fired).toEqual([{ id: "P06", p: 0.9 }]);
	});

	test("treats a missing ok field as a successful check", () => {
		const parsed = parseObservations('{"ts":1,"model":"m","fired":[],"cited":[],"cost":0}');
		expect(parsed[0].ok).toBe(true);
	});
});
