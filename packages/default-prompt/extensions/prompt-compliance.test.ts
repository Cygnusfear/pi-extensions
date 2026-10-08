import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Keep every observation out of the live state directory.
const STATE_DIR = mkdtempSync(path.join(tmpdir(), "pi-compliance-test-"));
process.env.PI_COMPLIANCE_STATE_DIR = STATE_DIR;

interface Harness {
	readonly classifyCalls: unknown[];
	readonly sent: Array<{ message: any; options: any }>;
	readonly notifications: Array<{ text: string; level: string }>;
	/** Isolated state directory, so report/observation behaviour is per test. */
	readonly stateDir: string;
	fire(event: unknown): Promise<void>;
	command(args: string): Promise<void>;
	setClassifier(result: unknown): void;
}

async function harness(options: { classify?: (model: unknown, context: unknown) => Promise<unknown> } = {}): Promise<Harness> {
	const stateDir = mkdtempSync(path.join(tmpdir(), "pi-compliance-harness-"));
	process.env.PI_COMPLIANCE_STATE_DIR = stateDir;
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
	answers: { P03: { type: "bool", probability: 0.97 }, P05: { type: "bool", probability: 0.02 } },
	stopReason: "stop",
};

describe("prompt-compliance wiring", () => {
	test("classifies the agent message and steers a warning on a violation", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn());
		expect(h.classifyCalls.length).toBe(1);
		expect(h.sent.length).toBe(1);
		expect(h.sent[0].options.deliverAs).toBe("steer");
		expect(h.sent[0].message.customType).toBe("prompt-compliance");
		expect(h.sent[0].message.content).toContain("P03");
		expect(h.sent[0].message.details.threshold).toBeGreaterThan(0);
	});

	test("stays silent on a clean message", async () => {
		const h = await harness({ classify: () => Promise.resolve({ answers: { P03: { probability: 0.01 } }, stopReason: "stop" }) });
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

	test("skips turns whose message is not agent speech", async () => {
		const h = await harness();
		await h.fire(turn({ message: { role: "user", content: "hello" } }));
		await h.fire(turn({ message: { role: "assistant", content: [{ type: "toolCall", name: "bash" }] } }));
		expect(h.classifyCalls.length).toBe(0);
	});

	test("does not warn twice for the same rule inside the cooldown window", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn({ turnIndex: 1 }));
		await h.fire(turn({ turnIndex: 2 }));
		expect(h.classifyCalls.length).toBe(2);
		expect(h.sent.length).toBe(1);
	});

	test("/compliance off makes no classifier calls at all", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.command("off");
		await h.fire(turn());
		expect(h.classifyCalls.length).toBe(0);
		expect(h.sent.length).toBe(0);
	});

	test("/compliance threshold raises the bar for a warning", async () => {
		const h = await harness({ classify: () => Promise.resolve({ answers: { P03: { probability: 0.6 } }, stopReason: "stop" }) });
		await h.command("threshold 0.8");
		await h.fire(turn());
		expect(h.sent.length).toBe(0);
	});

	test("/compliance audit reports what happened", async () => {
		const h = await harness({ classify: () => Promise.resolve(violationResult) });
		await h.fire(turn());
		await h.command("audit");
		const audit = h.notifications.find((note) => note.text.includes("audit"));
		expect(audit?.text).toContain("turn 1");
		expect(audit?.text).toContain("P03");
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
		await h.fire(turn({ turnIndex: 91, message: { role: "user", content: "hello" } }));
		const lines = readFileSync(logPath, "utf8").trim().split("\n");
		expect(lines.length).toBe(before + 1);
		const entry = JSON.parse(lines[lines.length - 1]);
		expect(entry.ok).toBe(true);
		expect(entry.fired.map((hit: { id: string }) => hit.id)).toContain("P03");
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
