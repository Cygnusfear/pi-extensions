import { describe, expect, test } from "bun:test";
import type { CheckableRule } from "./compliance-rules.ts";
import {
	buildClassifierState,
	buildQuestions,
	ComplianceCooldown,
	extractAgentMessage,
	findLastMessageText,
	formatWarning,
	resolveClassifierHost,
	resolveFixtureRules,
	selectViolations,
	MAX_AGENT_MESSAGE_CHARS,
	type ClassifierResult,
} from "./prompt-compliance.ts";

function rule(id: string, violation: string): CheckableRule {
	return {
		id,
		ordinal: Number.parseInt(id.slice(1), 10),
		text: `RULE ${id}`,
		label: `RULE ${id}`,
		violation,
	};
}

const rules = [rule("P01", "deferred a fix"), rule("P02", "claimed a context limit")];

describe("message extraction", () => {
	test("reads assistant text blocks", () => {
		const message = {
			role: "assistant",
			content: [
				{ type: "text", text: "first" },
				{ type: "toolCall", name: "bash" },
				{ type: "text", text: "second" },
			],
		};
		expect(extractAgentMessage(message)).toBe("first\n\nsecond");
	});

	test("reads text the agent published through explain or notify", () => {
		const message = {
			role: "assistant",
			content: [
				{ type: "toolCall", id: "1", name: "explain", arguments: { text: "I finished the trace." } },
				{ type: "toolCall", id: "2", name: "notify", arguments: { message: "Deploy is blocked." } },
			],
		};
		expect(extractAgentMessage(message)).toBe("I finished the trace.\n\nDeploy is blocked.");
	});

	test("ignores tool calls that are not the agent talking to the Hooman", () => {
		const message = {
			role: "assistant",
			content: [
				{ type: "toolCall", id: "1", name: "bash", arguments: { command: "npm install" } },
				{ type: "toolCall", id: "2", name: "read", arguments: { path: "/tmp/x" } },
			],
		};
		expect(extractAgentMessage(message)).toBe("");
	});

	test("refuses user and tool messages", () => {
		expect(extractAgentMessage({ role: "user", content: "hi" })).toBe("");
		expect(extractAgentMessage({ role: "toolResult", content: "out" })).toBe("");
	});

	test("returns empty for a message with no text", () => {
		expect(extractAgentMessage({ role: "assistant", content: [{ type: "toolCall" }] })).toBe("");
		expect(extractAgentMessage(undefined)).toBe("");
	});

	test("finds the most recent message with a role", () => {
		const messages = [
			{ role: "user", content: "older" },
			{ role: "assistant", content: "reply" },
			{ role: "user", content: "newest" },
		];
		expect(findLastMessageText(messages, "user")).toBe("newest");
		expect(findLastMessageText(messages, "system")).toBe("");
		expect(findLastMessageText(undefined, "user")).toBe("");
	});
});

describe("question pack", () => {
	test("asks one bool question per rule with the contract text and violation phrasing", () => {
		const questions = buildQuestions(rules);
		expect(Object.keys(questions)).toEqual(["P01", "P02"]);
		const question = questions.P01;
		expect(question.type).toBe("bool");
		if (question.type !== "bool") throw new Error("expected a bool question");
		expect(question.instructions).toContain("RULE P01");
		expect(question.criteria.true).toBe("deferred a fix");
		expect(question.criteria.false.length).toBeGreaterThan(10);
	});
});

describe("verdicts", () => {
	const result = (answers: ClassifierResult["answers"], extra: Partial<ClassifierResult> = {}): ClassifierResult => ({
		answers,
		stopReason: "stop",
		...extra,
	});

	test("keeps answers at or above the threshold, strongest first", () => {
		const violations = selectViolations(
			result({ P01: { probability: 0.42 }, P02: { probability: 0.91 } }),
			rules,
			0.5,
		);
		expect(violations.map((violation) => violation.id)).toEqual(["P02"]);
	});

	test("a provider error yields no violations", () => {
		expect(
			selectViolations(result({ P01: { probability: 0.99 } }, { stopReason: "error", errorMessage: "boom" }), rules),
		).toEqual([]);
		expect(selectViolations(null, rules)).toEqual([]);
	});

	test("rules that share violation phrasing are cited once", () => {
		const shared = [rule("P01", "same thing"), rule("P02", "same thing")];
		const violations = selectViolations(
			result({ P01: { probability: 0.9 }, P02: { probability: 0.8 } }),
			shared,
		);
		expect(violations.length).toBe(1);
	});

	test("ignores answers without a probability", () => {
		expect(selectViolations(result({ P01: { label: "yes" } }), rules)).toEqual([]);
	});
});

describe("warning", () => {
	test("cites rule IDs and labels and asks for self-correction", () => {
		const warning = formatWarning([
			{ id: "P05", label: "NEVER TALK ABOUT AN UNVERIFIED…", probability: 0.99, violation: "x" },
		]);
		expect(warning).toContain("P05");
		expect(warning).toContain("NEVER TALK ABOUT AN UNVERIFIED");
		expect(warning).toContain("self-correct");
	});
});

describe("cooldown", () => {
	test("warns once per turn and stays quiet for the cooldown window", () => {
		const cooldown = new ComplianceCooldown(12, 40);
		const violations = [{ id: "P01", label: "l", probability: 0.9, violation: "v" }];
		expect(cooldown.select(1, violations).length).toBe(1);
		expect(cooldown.select(2, violations).length).toBe(0);
		expect(cooldown.select(12, violations).length).toBe(0);
		expect(cooldown.select(13, violations).length).toBe(1);
		expect(cooldown.warningCount).toBe(2);
	});

	test("stops warning once the session budget is spent", () => {
		const cooldown = new ComplianceCooldown(0, 2);
		const violations = [{ id: "P01", label: "l", probability: 0.9, violation: "v" }];
		expect(cooldown.select(1, violations).length).toBe(1);
		expect(cooldown.select(2, violations).length).toBe(1);
		expect(cooldown.select(3, violations).length).toBe(0);
	});
});

describe("classifier host", () => {
	test("is absent when the host has no classifier capability", () => {
		expect(resolveClassifierHost(undefined)).toBeNull();
		expect(resolveClassifierHost({})).toBeNull();
		expect(resolveClassifierHost({ classify: "not a function" })).toBeNull();
	});

	test("prefers the catalog entry the host resolves, when it can resolve one", () => {
		const registry = {
			getModelOfType(type: string, provider: string, id: string) {
				return { type, provider, id, api: "typesafe-system-one", resolved: true };
			},
			classify() {
				return Promise.resolve({ answers: {}, stopReason: "stop" });
			},
		};
		const host = resolveClassifierHost(registry);
		expect(host?.resolve?.("classifier", "openrouter", "perplexity/x")).toEqual({
			type: "classifier",
			provider: "openrouter",
			id: "perplexity/x",
			api: "typesafe-system-one",
			resolved: true,
		});
	});

	test("has no resolve step when the host cannot look models up", () => {
		const host = resolveClassifierHost({ classify: () => Promise.resolve({}) });
		expect(host?.resolve).toBeUndefined();
	});

	test("calls the host with its own receiver", async () => {
		const seen: unknown[] = [];
		const registry = {
			handle: "registry",
			classify(this: { handle: string }, model: unknown, context: unknown) {
				seen.push(model, context, this.handle);
				return Promise.resolve({ answers: {}, stopReason: "stop" });
			},
		};
		const host = resolveClassifierHost(registry);
		expect(host).not.toBeNull();
		await host?.classify({ provider: "openrouter", id: "m" }, { state: {}, questions: {} });
		expect(seen[2]).toBe("registry");
	});
});

describe("classifier state", () => {
	test("carries the agent message, the request, and the turn index", () => {
		const state = buildClassifierState("agent text", "hooman text", 7);
		expect(state.turn_index).toBe(7);
		expect(state.agent_message_to_hooman).toBe("agent text");
		expect(state.hooman_request_being_answered).toBe("hooman text");
	});

	test("bounds the message so one turn cannot send an unbounded prompt", () => {
		const state = buildClassifierState("x".repeat(MAX_AGENT_MESSAGE_CHARS * 2), "", 1);
		expect(String(state.agent_message_to_hooman).length).toBeLessThan(MAX_AGENT_MESSAGE_CHARS + 32);
	});
});

describe("calibration fixtures", () => {
	test("every fixture names exactly one live rule per expectation", async () => {
		const { COMPLIANCE_FIXTURES } = await import("./compliance-fixtures.ts");
		const { readFileSync } = await import("node:fs");
		const { buildRulePack } = await import("./compliance-rules.ts");
		const { COMPLIANCE_REGISTRY } = await import("./compliance-registry.ts");
		const path = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const contract = readFileSync(
			path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "prompts", "default.md"),
			"utf8",
		);
		const pack = buildRulePack(contract, COMPLIANCE_REGISTRY);
		expect(COMPLIANCE_FIXTURES.length).toBeGreaterThan(0);
		for (const fixture of COMPLIANCE_FIXTURES) {
			const resolution = resolveFixtureRules(pack.rules, fixture.expectRules);
			expect(resolution.unmatched).toEqual([]);
			expect(resolution.ids.length).toBe(fixture.expectRules.length);
			expect(fixture.agentMessage.length).toBeGreaterThan(0);
		}
	});
});
