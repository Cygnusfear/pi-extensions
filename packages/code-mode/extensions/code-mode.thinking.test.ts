import { describe, expect, test } from "bun:test";
import { initTheme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import codeModeExt, { getMixedDoneBatch } from "./code-mode";

initTheme(undefined, false);

interface FakeTool {
	name: string;
	description?: string;
	parameters?: any;
	execute?: (...args: any[]) => Promise<any>;
	renderCall?: (...args: any[]) => Component;
	renderResult?: (...args: any[]) => Component;
}

interface MockPi {
	registerCommand: (name: string, opts: any) => void;
	registerTool: (tool: FakeTool) => void;
	setActiveTools: (names: string[]) => void;
	getActiveTools: () => string[];
	getAllTools: () => FakeTool[];
	on: (event: string, handler: any) => void;
	setLabel: (id: string, label: string | undefined) => void;
	sendUserMessage: (msg: string, opts?: any) => void;
	sendMessage: (msg: any, opts?: any) => void;
	commands: Map<string, any>;
	tools: Map<string, FakeTool>;
	handlers: Map<string, any[]>;
	activeTools: string[];
	setActiveToolsCalls: string[][];
}

function makePi(): MockPi {
	const externalTools: FakeTool[] = [{ name: "context_tag" }, { name: "bash" }];
	const pi: MockPi = {
		commands: new Map(),
		tools: new Map(),
		handlers: new Map(),
		activeTools: [],
		setActiveToolsCalls: [],
		registerCommand: (name, opts) => pi.commands.set(name, opts),
		registerTool: (tool) => pi.tools.set(tool.name, tool),
		setActiveTools: (names) => {
			pi.activeTools = [...names];
			pi.setActiveToolsCalls.push([...names]);
		},
		getActiveTools: () => pi.activeTools,
		getAllTools: () => [...pi.tools.values(), ...externalTools],
		on: (event, handler) => {
			const handlers = pi.handlers.get(event) ?? [];
			handlers.push(handler);
			pi.handlers.set(event, handlers);
		},
		setLabel: () => {},
		sendUserMessage: () => {},
		sendMessage: () => {},
	};
	return pi;
}

function makeExecuteCtx() {
	return {
		cwd: process.cwd(),
		model: { provider: "test", id: "test-model" },
		modelRegistry: {},
		ui: { confirm: async () => true, notify: () => {}, setStatus: () => {} },
		abort: () => {},
	};
}

const theme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
} as any;

function render(component: Component, width = 400): string {
	return component
		.render(width)
		.join("\n")
		.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.trimEnd();
}

function sorted(names: string[]): string[] {
	return [...names].sort();
}

describe("code-mode reasoning", () => {
	test("execute_code requires thinking before code in its serialized schema", () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const schema = pi.tools.get("execute_code")?.parameters;

		expect(Object.keys(schema.properties).slice(0, 2)).toEqual([
			"thinking",
			"code",
		]);
		expect(schema.required).toEqual(["thinking", "code"]);
		expect(schema.required).not.toContain("timeout");
		expect(schema.required).not.toContain("async");
	});

	test("execute_code thinking schema is non-empty and warns about recorded-reasoning secrets", () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const thinkingSchema =
			pi.tools.get("execute_code")?.parameters.properties.thinking;

		expect(thinkingSchema.minLength).toBe(1);
		expect(thinkingSchema.description).toContain("Recorded reasoning");
		expect(thinkingSchema.description).toContain(
			"Never include secrets or credentials",
		);
	});

	test("normal execution preserves reasoning in details without copying it into stdout", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code")!;
		const reasoning =
			"Read one deterministic value and verify the printed result.";

		const result = await executeCode.execute!(
			"thinking-sync",
			{ thinking: reasoning, code: "console.log('visible output');" },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);

		expect(result.details.thinking).toBe(reasoning);
		expect(result.content[0].text).toContain("visible output");
		expect(result.content[0].text).not.toContain(reasoning);
	});

	test("done is a zero-argument terminating tool", async () => {
		const pi = makePi();
		codeModeExt(pi as any, { isTeamsWorker: () => false });
		const done = pi.tools.get("done")!;
		expect(done.parameters.properties).toEqual({});
		expect(done.parameters.required).toBeUndefined();

		const result = await done.execute!(
			"done-ready",
			{},
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		expect(result).toMatchObject({
			content: [{ type: "text", text: "Task complete." }],
			terminate: true,
		});
		expect(render(done.renderResult!(result, { expanded: false }, theme))).toBe(
			"task complete",
		);
	});

	test("teams-worker done teaches team_finish as the completion path", async () => {
		const pi = makePi();
		codeModeExt(pi as any, { isTeamsWorker: () => true });
		const done = pi.tools.get("done")!;
		expect(done.description).toContain("team_finish");
		expect(done.description).toContain("does NOT complete your assignment");
		const result = await done.execute!(
			"done-worker",
			{},
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		expect(result.terminate).toBe(true);
		expect(result.content[0].text).toContain("team_finish");
		expect(result.content[0].text).toContain("NOT finished");
	});

	test("done must be emitted alone so its terminating result stops the loop", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const mixedMessage = {
			role: "assistant",
			content: [
				{ type: "toolCall", id: "done-1", name: "done", arguments: {} },
				{
					type: "toolCall",
					id: "action-1",
					name: "execute_code",
					arguments: { thinking: "idle", code: "console.log('idle')" },
				},
			],
		};
		expect(getMixedDoneBatch(mixedMessage)?.map((call) => call.id)).toEqual([
			"done-1",
			"action-1",
		]);
		expect(
			getMixedDoneBatch({
				role: "assistant",
				content: [mixedMessage.content[0]],
			}),
		).toBeUndefined();
		for (const handler of pi.handlers.get("message_end") ?? []) {
			await handler({ type: "message_end", message: mixedMessage });
		}
		const guard = pi.handlers.get("tool_call")?.[0];
		await expect(
			guard(
				{ toolCallId: "done-1", toolName: "done", input: {} },
				makeExecuteCtx(),
			),
		).resolves.toMatchObject({
			block: true,
			reason: expect.stringContaining("done must be emitted alone"),
		});
		await expect(
			guard(
				{ toolCallId: "action-1", toolName: "execute_code", input: {} },
				makeExecuteCtx(),
			),
		).resolves.toMatchObject({
			block: true,
			reason: expect.stringContaining("done must be emitted alone"),
		});
	});

	test("historical execute_code thinking block uses the same readable color roles", () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code")!;
		const calls: Array<{ color: string; text: string }> = [];
		const recordingTheme = {
			fg: (color: string, text: string) => {
				calls.push({ color, text });
				return text;
			},
			bold: (text: string) => text,
		} as any;

		executeCode.renderCall!(
			{ thinking: "old-thought", code: "console.log(1)" },
			recordingTheme,
			{ expanded: true },
		);
		expect(calls).toContainEqual({ color: "thinkingText", text: "thinking" });
		expect(calls).toContainEqual({ color: "text", text: "old-thought" });
	});

	test("execute_code renderer places bounded reasoning before bounded code", () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code")!;
		const thoughts = Array.from(
			{ length: 8 },
			(_, index) => `reason-${index + 1}`,
		);
		const code = Array.from(
			{ length: 10 },
			(_, index) => `// code-${index + 1}`,
		);
		const args = { thinking: thoughts.join("\n"), code: code.join("\n") };

		const collapsed = render(
			executeCode.renderCall!(args, theme, { expanded: false }),
		);
		const expanded = render(
			executeCode.renderCall!(args, theme, { expanded: true }),
		);

		expect(collapsed.indexOf("reason-1")).toBeLessThan(
			collapsed.indexOf("code-1"),
		);
		expect(collapsed).toContain("reason-6");
		expect(collapsed).not.toContain("reason-7");
		expect(collapsed).toContain("code-8");
		expect(collapsed).not.toContain("code-9");
		expect(expanded).toContain("reason-8");
		expect(expanded).toContain("code-10");
	});

	test("session start and /code_mode keep done active", async () => {
		const pi = makePi();
		codeModeExt(pi as any);

		for (const handler of pi.handlers.get("session_start") ?? [])
			await handler({}, makeExecuteCtx());
		expect(sorted(pi.activeTools)).toEqual([
			"code_heredoc",
			"context_tag",
			"done",
			"execute_code",
			"execute_code_async_kill",
			"execute_code_async_list",
		]);

		await pi.commands
			.get("escape_code_mode")
			.handler(undefined, { ui: { notify: () => {} } });
		expect(sorted(pi.activeTools)).toEqual([
			"bash",
			"code_heredoc",
			"context_tag",
			"done",
			"execute_code",
			"execute_code_async_kill",
			"execute_code_async_list",
		]);

		await pi.commands
			.get("code_mode")
			.handler(undefined, { ui: { notify: () => {} } });
		expect(sorted(pi.activeTools)).toEqual([
			"code_heredoc",
			"context_tag",
			"done",
			"execute_code",
			"execute_code_async_kill",
			"execute_code_async_list",
		]);
	});
});
