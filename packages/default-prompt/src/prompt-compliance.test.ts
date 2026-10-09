import { describe, expect, test } from "bun:test";
import type { CheckableRule } from "./compliance-rules.ts";
import {
	agentTurnText,
	textFingerprint,
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

	test("reads mesh tells, including the bridge's structured message form", () => {
		const message = {
			role: "assistant",
			content: [
				{ type: "toolCall", id: "1", name: "mesh_tell", arguments: { sessionId: "peer-1", message: "Landed on main." } },
				{
					type: "toolCall",
					id: "2",
					name: "mesh_tell",
					arguments: { sessionId: "hopper", message: { subject: "Blocked", body: "Staging key is missing." } },
				},
				{ type: "toolCall", id: "3", name: "mesh_chat", arguments: { channelId: "peers", message: "Handing the parse work over." } },
			],
		};
		expect(extractAgentMessage(message)).toBe(
			"Landed on main.\n\nBlocked — Staging key is missing.\n\nHanding the parse work over.",
		);
	});

	test("mesh reads are not the agent speaking", () => {
		const message = {
			role: "assistant",
			content: [
				{ type: "toolCall", id: "1", name: "mesh_view", arguments: { sessionId: "peer-1" } },
				{ type: "toolCall", id: "2", name: "mesh_inbox", arguments: {} },
			],
		};
		expect(extractAgentMessage(message)).toBe("");
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

	test("judges the agent's last words in a turn that ends on a tool call", () => {
		const transcript = [
			{ role: "user", content: "ship it" },
			{ role: "assistant", content: [{ type: "text", text: "Landed: parser fix." }] },
			{ role: "toolResult", content: "ok" },
			{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "done", arguments: {} }] },
		];
		expect(
			agentTurnText(
				{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "done", arguments: {} }] },
				transcript,
			),
		).toBe("Landed: parser fix.");
	});

	test("an inbound message ends the search, so an earlier turn's words are not re-judged", () => {
		const transcript = [
			{ role: "assistant", content: [{ type: "text", text: "previous turn words" }] },
			{ role: "custom", customType: "prompt-compliance", content: "a steer" },
			{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "done", arguments: {} }] },
		];
		expect(
			agentTurnText(
				{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "done", arguments: {} }] },
				transcript,
			),
		).toBe("");
	});

	test("the same words get one fingerprint, different words get another", () => {
		expect(textFingerprint("Landed: parser fix.")).toBe(textFingerprint("Landed: parser fix."));
		expect(textFingerprint("Landed: parser fix.")).not.toBe(textFingerprint("Landed: parser test."));
	});

	test("does not reach back past the Hooman's message into an earlier turn", () => {
		const transcript = [
			{ role: "assistant", content: [{ type: "text", text: "older turn words" }] },
			{ role: "user", content: "new request" },
			{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "done", arguments: {} }] },
		];
		expect(
			agentTurnText(
				{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "done", arguments: {} }] },
				transcript,
			),
		).toBe("");
	});

	test("prefers the final message when it carries words", () => {
		expect(
			agentTurnText(
				{ role: "assistant", content: [{ type: "text", text: "final words" }] },
				[{ role: "assistant", content: [{ type: "text", text: "earlier words" }] }],
			),
		).toBe("final words");
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

	test("resolves the classifier through the lookup the host actually has", async () => {
		const entry = {
			type: "classifier",
			provider: "openrouter",
			id: "perplexity/x",
			api: "typesafe-system-one",
		};
		const withFind = resolveClassifierHost({
			findOfType: () => entry,
			classify: () => Promise.resolve({ answers: {}, stopReason: "stop" }),
		});
		expect(await withFind?.resolveClassifier?.({ provider: "openrouter", id: "perplexity/x" })).toEqual({
			model: entry,
			source: "findOfType",
		});

		const withCatalog = resolveClassifierHost({
			getAvailableOfType: async () => [entry],
			classify: () => Promise.resolve({ answers: {}, stopReason: "stop" }),
		});
		expect(await withCatalog?.resolveClassifier?.({ provider: "openrouter", id: "perplexity/x" })).toEqual({
			model: entry,
			source: "getAvailableOfType",
		});
	});

	test("falls back to a complete descriptor when no lookup finds the entry", async () => {
		const host = resolveClassifierHost({
			findOfType: () => undefined,
			getAvailableOfType: async () => [],
			classify: () => Promise.resolve({ answers: {}, stopReason: "stop" }),
		});
		const resolved = await host?.resolveClassifier?.({ provider: "openrouter", id: "perplexity/x" });
		expect(resolved?.source).toBe("descriptor");
		// The host asserts the model type before dispatch, so the fallback must
		// carry one - a bare { provider, id } is rejected as a chat model.
		expect((resolved?.model as { type?: string }).type).toBe("classifier");
		expect((resolved?.model as { provider?: string }).provider).toBe("openrouter");
	});

	test("a host without lookup methods still gets something the classifier will accept", async () => {
		const host = resolveClassifierHost({ classify: () => Promise.resolve({ answers: {} }) });
		const resolved = await host?.resolveClassifier?.({ provider: "openrouter", id: "perplexity/x" });
		expect(resolved?.source).toBe("descriptor");
		expect((resolved?.model as { type?: string }).type).toBe("classifier");
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
	test("carries the agent message, the request, the turn index, and the conversation boundary", () => {
		const state = buildClassifierState("agent text", "hooman text", 7);
		expect(state.turn_index).toBe(7);
		expect(state.agent_message_to_hooman).toBe("agent text");
		expect(state.hooman_request_being_answered).toBe("hooman text");
		// Opening-message rules need this fact; a classifier cannot infer it.
		expect(state.first_message_in_conversation).toBe(false);
		expect(buildClassifierState("a", "b", 1, true).first_message_in_conversation).toBe(true);
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
