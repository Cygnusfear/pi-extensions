import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildRulePack } from "../src/compliance-rules.ts";

// Rule identity is a hash of the paragraph text, so tests look the rule up
// rather than naming a position that shifts whenever the contract is edited.
const CONTRACT = readFileSync(new URL("../prompts/default.md", import.meta.url), "utf8");
const PACK = buildRulePack(CONTRACT);
const TOLSTOY_ID = PACK.rules.find((rule) => rule.text.includes("NEVER WRITE LIKE TOLSTOY"))?.id;
if (!TOLSTOY_ID) throw new Error("the Tolstoy rule is not checkable in the shipped contract");

// Keep every observation out of the live state directory.
const STATE_DIR = mkdtempSync(path.join(tmpdir(), "pi-compliance-test-"));
process.env.PI_COMPLIANCE_STATE_DIR = STATE_DIR;

interface Harness {
	readonly classifyCalls: unknown[];
	readonly sent: Array<{ message: any; options: any }>;
	readonly notifications: Array<{ text: string; level: string }>;
	/** Isolated state directory, so report/observation behaviour is per test. */
	readonly stateDir: string;
	/** Contract file this instance reads, when the test supplied one. */
	readonly contractPath: string;
	fire(event: unknown): Promise<void>;
	command(args: string): Promise<void>;
	setClassifier(result: unknown): void;
}

async function harness(
	options: {
		classify?: (model: unknown, context: unknown) => Promise<unknown>;
		contract?: string;
	} = {},
): Promise<Harness> {
	const stateDir = mkdtempSync(path.join(tmpdir(), "pi-compliance-harness-"));
	process.env.PI_COMPLIANCE_STATE_DIR = stateDir;
	const contractPath = path.join(stateDir, "contract.md");
	if (options.contract === undefined) {
		delete process.env.PI_COMPLIANCE_CONTRACT;
	} else {
		writeFileSync(contractPath, options.contract);
		process.env.PI_COMPLIANCE_CONTRACT = contractPath;
	}
	const { default: register } = await import(
		"../extensions/prompt-compliance.ts?test-bust=" + Math.random()
	);
	const classifyCalls: unknown[] = [];
	const sent: Array<{ message: any; options: any }> = [];
	const notifications: Array<{ text: string; level: string }> = [];
	let turnEnd: any = null;
	let commandHandler: any = null;
	let classifier: (model: unknown, context: unknown) => Promise<unknown> =
		options.classify ?? (() => Promise.resolve({ answers: {}, stopReason: "stop" }));

	const fakePi = {
		on(event: string, handler: any) {
			if (event === "turn_end") turnEnd = handler;
		},
		registerCommand(name: string, definition: any) {
			if (name === "compliance") commandHandler = definition.handler;
		},
		sendMessage(message: any, sendOptions: any) {
			sent.push({ message, options: sendOptions });
		},
	};

	register(fakePi as any);

	const ctx = {
		ui: {
			notify(text: string, level: string) {
				notifications.push({ text, level });
			},
		},
		modelRegistry: {
			classify(model: unknown, context: unknown) {
				classifyCalls.push(context);
				return classifier(model, context);
			},
		},
		signal: undefined,
	};

	return {
		classifyCalls,
		sent,
		notifications,
		stateDir,
		contractPath,
		setClassifier(result) {
			classifier = () => Promise.resolve(result);
		},
		async fire(event) {
			if (!turnEnd) throw new Error("turn_end handler not registered");
			await turnEnd(event, ctx);
		},
		async command(args) {
			if (!commandHandler) throw new Error("compliance command not registered");
			await commandHandler(args, ctx);
		},
	};
}

function turn(overrides: Record<string, unknown> = {}) {
	return {
		type: "turn_end",
		turnIndex: 1,
		message: { role: "assistant", content: [{ type: "text", text: "All done, chef." }] },
		toolResults: [],
		context: {
			llmMessages: [
				{ role: "user", content: "please fix the typo" },
				{ role: "assistant", content: [{ type: "text", text: "All done, chef." }] },
			],
		},
		...overrides,
	};
}

const violationResult = {
	answers: {
		[TOLSTOY_ID]: { type: "bool", probability: 0.999 },
		"not-a-rule": { type: "bool", probability: 0.02 },
	},
	stopReason: "stop",
};

describe("prompt-compliance wiring", () => {
	test("classifies the agent message and steers a warning on a violation", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn());
		expect(h.classifyCalls.length).toBe(1);
		expect(h.sent.length).toBe(1);
		expect(h.sent[0].options.deliverAs).toBe("nextTurn");
		expect(h.sent[0].message.customType).toBe("prompt-compliance");
		expect(h.sent[0].message.content).toContain(TOLSTOY_ID);
		expect(h.sent[0].message.details.threshold).toBeGreaterThan(0);
	});

	test("stays silent on a clean message", async () => {
		const h = await harness({ classify: () => Promise.resolve({ answers: { [TOLSTOY_ID]: { probability: 0.01 } }, stopReason: "stop" }) });
		await h.fire(turn());
		expect(h.classifyCalls.length).toBe(1);
		expect(h.sent.length).toBe(0);
	});

	test("stays silent and does not throw when the classifier errors", async () => {
		const h = await harness({ classify: () => Promise.resolve({ answers: {}, stopReason: "error", errorMessage: "no endpoints" }) });
		await h.fire(turn());
		expect(h.sent.length).toBe(0);
	});

	test("stays silent and does not throw when the classifier rejects", async () => {
		const h = await harness({ classify: () => Promise.reject(new Error("network down")) });
		await h.fire(turn());
		expect(h.sent.length).toBe(0);
	});

	test("skips a turn where the agent never spoke to the Hooman", async () => {
		const h = await harness();
		await h.fire(
			turn({
				message: { role: "user", content: "hello" },
				context: { llmMessages: [{ role: "user", content: "hello" }] },
			}),
		);
		await h.fire(
			turn({
				message: { role: "assistant", content: [{ type: "toolCall", id: "1", name: "bash", arguments: {} }] },
				context: { llmMessages: [{ role: "user", content: "hello" }] },
			}),
		);
		expect(h.classifyCalls.length).toBe(0);
	});

	test("judges the agent's words from earlier in a turn that ends on a tool call", async () => {
		const h = await harness({ classify: () => Promise.resolve({ answers: {}, stopReason: "stop" }) });
		await h.fire(
			turn({
				message: { role: "assistant", content: [{ type: "toolCall", id: "1", name: "done", arguments: {} }] },
			}),
		);
		expect(h.classifyCalls.length).toBe(1);
		expect(JSON.stringify(h.classifyCalls[0])).toContain("All done, chef.");
	});

	test("does not warn twice for the same rule inside the cooldown window", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn({ turnIndex: 1 }));
		await h.fire(
			turn({
				turnIndex: 2,
				message: { role: "assistant", content: [{ type: "text", text: "Still the same violation, worded differently." }] },
			}),
		);
		expect(h.classifyCalls.length).toBe(2);
		expect(h.sent.length).toBe(1);
	});

	test("the same words re-found at a later boundary are not charged twice", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn({ turnIndex: 1 }));
		await h.fire(turn({ turnIndex: 2 }));
		expect(h.classifyCalls.length).toBe(1);
	});

	test("/compliance off makes no classifier calls at all", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.command("off");
		await h.fire(turn());
		expect(h.classifyCalls.length).toBe(0);
		expect(h.sent.length).toBe(0);
	});

	test("/compliance threshold raises the bar for a warning", async () => {
		const h = await harness({ classify: () => Promise.resolve({ answers: { [TOLSTOY_ID]: { probability: 0.995 } }, stopReason: "stop" }) });
		await h.command("threshold 0.999");
		await h.fire(turn());
		expect(h.sent.length).toBe(0);
	});

	test("/compliance audit reports what happened", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn());
		await h.command("audit");
		const audit = h.notifications.find((note) => note.text.includes("audit"));
		expect(audit?.text).toContain("turn 1");
		expect(audit?.text).toContain(TOLSTOY_ID);
	});

	test("reports and disables itself when the host exposes no classifier", async () => {
		const { default: register } = await import("../extensions/prompt-compliance.ts?test-bust=no-host-" + Math.random());
		let turnEnd: any = null;
		register({ on(_e: string, h: any) { turnEnd = h; }, registerCommand() {}, sendMessage() {} } as any);
		const notifications: string[] = [];
		await turnEnd(turn(), { ui: { notify: (t: string) => notifications.push(t) }, modelRegistry: {}, signal: undefined });
		expect(notifications.some((text) => text.includes("no classifier API"))).toBe(true);
	});
});

describe("hit tracking", () => {
	test("records an observation for a check, and none for a turn with no agent speech", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		const logPath = path.join(h.stateDir, "observations.jsonl");
		const before = existsSync(logPath)
			? readFileSync(logPath, "utf8").trim().split("\n").length
			: 0;
		await h.fire(turn({ turnIndex: 90 }));
		await h.fire(
			turn({
				turnIndex: 91,
				message: { role: "assistant", content: [{ type: "toolCall", id: "1", name: "bash", arguments: {} }] },
				context: { llmMessages: [{ role: "user", content: "hello" }] },
			}),
		);
		const lines = readFileSync(logPath, "utf8").trim().split("\n");
		expect(lines.length).toBe(before + 1);
		const entry = JSON.parse(lines[lines.length - 1]);
		expect(entry.ok).toBe(true);
		expect(entry.fired.map((hit: { id: string }) => hit.id)).toContain(TOLSTOY_ID);
	});

	test("writes the daily report once and says where it is", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn({ turnIndex: 92 }));
		const reports = readdirSync(h.stateDir).filter((name) => name.startsWith("report-"));
		expect(reports.length).toBeGreaterThan(0);
		expect(h.notifications.some((note) => note.text.includes("Contract daily report"))).toBe(true);
	});

	test("/compliance report prints a summary and writes the report file", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.command("report 7");
		const summary = h.notifications.find((note) => note.text.includes("Contract hits"));
		expect(summary?.text).toContain("checks across");
		expect(summary?.text).toContain("Never fired");
		expect(summary?.text).toContain("Report:");
	});
});

describe("reload safety", () => {
	test("registering again tears down the previous registration", async () => {
		let disposed = false;
		const firstPi = {
			on() {
				return () => {
					disposed = true;
				};
			},
			registerCommand() {},
			sendMessage() {},
		};
		const { default: first } = await import(
			"../extensions/prompt-compliance.ts?test-bust=reload-first-" + Math.random()
		);
		first(firstPi as any);
		expect(disposed).toBe(false);

		const secondPi = { on() { return () => {}; }, registerCommand() {}, sendMessage() {} };
		const { default: second } = await import(
			"../extensions/prompt-compliance.ts?test-bust=reload-second-" + Math.random()
		);
		second(secondPi as any);
		expect(disposed).toBe(true);
	});
});

describe("live contract edits", () => {
	const firstContract = "---\ndescription: test contract\n---\n\n## Rules\n\n- NEVER WRITE LIKE TOLSTOY.\n";

	test("a paragraph added to the contract is judged on the next check, no reload", async () => {
		const h = await harness({
			contract: firstContract,
			classify: () => Promise.resolve({ answers: {}, stopReason: "stop" }),
		});
		await h.fire(turn({ turnIndex: 1 }));
		expect(JSON.stringify(h.classifyCalls[0])).toContain("NEVER WRITE LIKE TOLSTOY");
		expect(JSON.stringify(h.classifyCalls[0])).not.toContain("TELL ME A STORY");

		writeFileSync(
			h.contractPath,
			firstContract + "\n- ALWAYS TELL ME A STORY WHEN YOU COMMIT.\n",
		);
		await h.fire(
			turn({
				turnIndex: 2,
				message: { role: "assistant", content: [{ type: "text", text: "Second message after the contract changed." }] },
			}),
		);

		expect(JSON.stringify(h.classifyCalls[1])).toContain("ALWAYS TELL ME A STORY WHEN YOU COMMIT");
		// No notification, no registration step: the file is the configuration.
		expect(h.notifications.some((note) => note.text.includes("unregistered"))).toBe(false);
	});

	test("editing an existing paragraph changes what the classifier is asked", async () => {
		const h = await harness({
			contract: firstContract,
			classify: () => Promise.resolve({ answers: {}, stopReason: "stop" }),
		});
		await h.fire(turn({ turnIndex: 1 }));
		writeFileSync(h.contractPath, firstContract.replace("NEVER WRITE LIKE TOLSTOY.", "NEVER WRITE LIKE TOLSTOY, EVER."));
		await h.fire(
			turn({
				turnIndex: 2,
				message: { role: "assistant", content: [{ type: "text", text: "Second message after the wording changed." }] },
			}),
		);
		expect(JSON.stringify(h.classifyCalls[1])).toContain("NEVER WRITE LIKE TOLSTOY, EVER");
	});
});
