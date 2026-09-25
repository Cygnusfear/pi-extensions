/**
 * Regression: a failed deferred compaction must not leave the context guard as
 * a mechanical dead end.
 *
 * At >=94% usage the guard blocks every sandbox tool; session.squash() is the
 * only compliance path. When the host summariser fails because the
 * conversation is too large, the old handler surfaced an error and left the
 * guard active — tools blocked, compaction impossible, no agent-side recovery.
 * The fix releases the guard and reports a distinct notice. This test drives
 * the real extension and its registered agent_settled handler.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import codeModeExt from "../extensions/code-mode";

interface CapturedMessage {
	customType?: string;
	content?: string;
	display?: boolean;
	options?: any;
}

interface FakeTool {
	name: string;
	execute?: (...args: any[]) => Promise<any>;
}

interface MockPi {
	registerCommand: (name: string, opts: any) => void;
	registerTool: (tool: any) => void;
	setActiveTools: (names: string[]) => void;
	getActiveTools: () => string[];
	getAllTools: () => FakeTool[];
	on: (event: string, handler: any) => void;
	setLabel: (id: string, label: string | undefined) => void;
	sendUserMessage: (msg: string, opts?: any) => void;
	sendMessage: (msg: any, opts?: any) => void;
	commands: Map<string, any>;
	tools: Map<string, any>;
	handlers: Map<string, any[]>;
	activeTools: string[];
	sentMessages: CapturedMessage[];
	sentUserMessages: Array<{ content: string; options?: any }>;
}

function makePi(): MockPi {
	const allTools: FakeTool[] = [
		{ name: "execute_code" },
		{ name: "context_tag" },
		{ name: "read" },
		{ name: "bash" },
	];
	const pi: MockPi = {
		commands: new Map(),
		tools: new Map(),
		handlers: new Map(),
		activeTools: [],
		sentMessages: [],
		sentUserMessages: [],
		registerCommand: (name, opts) => pi.commands.set(name, opts),
		registerTool: (tool) => pi.tools.set(tool.name, tool),
		setActiveTools: (names) => {
			pi.activeTools = [...names];
		},
		getActiveTools: () => pi.activeTools,
		getAllTools: () => allTools,
		on: (event, handler) => {
			const handlers = pi.handlers.get(event) ?? [];
			handlers.push(handler);
			pi.handlers.set(event, handlers);
		},
		setLabel: () => {},
		sendUserMessage: (content, options) => {
			pi.sentUserMessages.push({ content, options });
		},
		sendMessage: (msg, options) => {
			pi.sentMessages.push({ ...msg, options });
		},
	};
	return pi;
}

function registerCodeMode(pi: MockPi): void {
	codeModeExt(pi as any, { isTeamsWorker: () => false });
	const executeCode = pi.tools.get("execute_code");
	const execute = executeCode.execute.bind(executeCode);
	executeCode.execute = (toolCallId: string, params: any, ...rest: any[]) =>
		execute(toolCallId, { thinking: "Test rationale.", ...params }, ...rest);
}

function resultText(result: any): string {
	return (result.content ?? [])
		.filter((part: any) => part.type === "text")
		.map((part: any) => part.text)
		.join("\n");
}

describe("context guard after failed compaction", () => {
	test("failure releases the guard, reports it distinctly, and does not retry compaction", async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-mode-compact-"));
		const probe = path.join(tmp, "probe.txt");
		try {
			const pi = makePi();
			registerCodeMode(pi);
			const executeCode = pi.tools.get("execute_code");
			const compactCalls: any[] = [];
			const ctx = {
				cwd: process.cwd(),
				model: { provider: "test", id: "test-model" },
				modelRegistry: {},
				sessionManager: {},
				ui: { confirm: async () => true, notify: () => {} },
				abort: () => {},
				getContextUsage: () => ({ percent: 95, tokens: 95_000, contextWindow: 100_000 }),
				getCompactionReadiness: () => ({ canCompact: true }),
				mode: "tui",
				compact: (options: any) => {
					compactCalls.push(options);
					options.onError(
						new Error(
							"Summarization failed: generation hit the token cap and the summary is incomplete",
						),
					);
				},
			};
			const signal = new AbortController().signal;
			const run = (id: string, code: string) =>
				executeCode.execute(id, { code }, signal, undefined, ctx);

			// 1. Guard blocks a normal tool at 95%.
			const blocked = await run("c1", `await Write({ path: ${JSON.stringify(probe)}, content: "blocked" });`);
			expect(resultText(blocked)).toContain("Context guard active");
			expect(fs.existsSync(probe)).toBe(false);

			// 2. Schedule the deferred squash through the sandbox API.
			const scheduled = await run("c2", "session.squash({ continue: 'resume' })");
			expect(resultText(scheduled)).toContain("compaction scheduled");

			// 3. Run the real agent_settled handler; compaction fails with the summariser cap.
			const settled = pi.handlers.get("agent_settled") ?? [];
			expect(settled.length).toBeGreaterThan(0);
			for (const handler of settled) await handler({ type: "agent_settled" }, ctx);
			expect(compactCalls.length).toBe(1);
			const firstCrash = pi.sentMessages.find((m) => m.customType === "code-mode-crash");
			expect(firstCrash?.content).toContain("context guard is now RELEASED");
			expect(firstCrash?.content).toContain("Summarization failed: generation hit the token cap");

			// 4. The next call is no longer blocked and does not retry compaction.
			const allowed = await run("c3", `await Write({ path: ${JSON.stringify(probe)}, content: "allowed" });`);
			expect(resultText(allowed)).not.toContain("Context guard active");
			expect(fs.readFileSync(probe, "utf8")).toBe("allowed");
			expect(compactCalls.length).toBe(1);

			// 5. A retried squash keeps working and produces the distinct repeat notice.
			const rescheduled = await run("c4", "session.squash({ continue: 'resume again' })");
			expect(resultText(rescheduled)).toContain("compaction scheduled");
			for (const handler of settled) await handler({ type: "agent_settled" }, ctx);
			expect(compactCalls.length).toBe(2);
			const crashes = pi.sentMessages.filter((m) => m.customType === "code-mode-crash");
			expect(crashes.length).toBe(2);
			expect(crashes[1]?.content).toContain("failed again (attempt 2)");
			expect(crashes[1]?.content).toContain("retrying will not succeed");
			expect(crashes[1]?.content).toContain("remains released");
			expect(crashes[1]?.content).not.toContain("is now RELEASED");
		} finally {
			fs.rmSync(tmp, { recursive: true, force: true });
		}
	});
});
