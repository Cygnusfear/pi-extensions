/**
 * Slash-command escape roundtrip test (pe-tk4s V5 + V16).
 *
 * The extension keeps getSession() private, so these tests verify the observable
 * singleton state that getSession().getEscaped() controls:
 *   - the tool_call guard blocks code-mode-only tools when escaped=false;
 *   - /escape_code_mode flips that state to escaped=true;
 *   - /code_mode flips it back;
 *   - the next execute_code call syncs in-band $.__escaped changes and preserves
 *     the pi.setActiveTools side effects from the migrated full escape-sync block.
 */

import { describe, expect, test } from "bun:test";
import codeModeExt from "../extensions/code-mode";

interface FakeTool {
	name: string;
	description?: string;
	parameters?: unknown;
	execute?: (...args: any[]) => Promise<any>;
}

interface MockPi {
	registerCommand: (name: string, opts: { handler: any }) => void;
	registerTool: (tool: any) => void;
	setActiveTools: (names: string[]) => void;
	getActiveTools: () => string[];
	getAllTools: () => FakeTool[];
	on: (event: string, handler: any) => void;
	setLabel: (id: string, label: string | undefined) => void;
	sendUserMessage: (msg: string, opts?: any) => void;
	sendMessage?: (...args: any[]) => void;
	commands: Map<string, any>;
	tools: Map<string, any>;
	handlers: Map<string, any[]>;
	activeTools: string[];
	setActiveToolsCalls: string[][];
}

function makePi(): MockPi {
	const allTools: FakeTool[] = [
		{ name: "execute_code" },
		{ name: "context_tag" },
		{ name: "read" },
		{ name: "bash" },
		{ name: "grep" },
	];
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
		getAllTools: () => allTools,
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

function sorted(names: string[]): string[] {
	return [...names].sort();
}

function makeExecuteCtx() {
	return {
		cwd: process.cwd(),
		model: { provider: "test", id: "test-model" },
		modelRegistry: {},
		ui: { confirm: async () => true, notify: () => {} },
		abort: () => {},
	};
}

describe("slash-command escape roundtrip (pe-tk4s V5)", () => {
	test("/escape_code_mode flips observable guard state to escaped=true", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const guard = pi.handlers.get("tool_call")?.[0];
		expect(guard).toBeDefined();

		const blockedBefore = await guard({ toolName: "bash" });
		expect(blockedBefore).toEqual({
			block: true,
			reason: "Tool 'bash' is only available inside execute_code. Use execute_code to call bash().",
		});

		await pi.commands.get("escape_code_mode").handler(undefined, { ui: { notify: () => {} } });
		expect(sorted(pi.activeTools)).toEqual(["bash", "context_tag", "execute_code", "grep", "read"]);
		expect(await guard({ toolName: "bash" })).toBeUndefined();
	});

	test("/code_mode flips observable guard state back to escaped=false", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const guard = pi.handlers.get("tool_call")?.[0];

		await pi.commands.get("escape_code_mode").handler(undefined, { ui: { notify: () => {} } });
		expect(await guard({ toolName: "bash" })).toBeUndefined();

		await pi.commands.get("code_mode").handler(undefined, { ui: { notify: () => {} } });
		expect(sorted(pi.activeTools)).toEqual(["context_tag", "execute_code"]);
		expect(await guard({ toolName: "bash" })).toEqual({
			block: true,
			reason: "Tool 'bash' is only available inside execute_code. Use execute_code to call bash().",
		});
	});
});

describe("execute_code escape-sync side effects (pe-tk4s V16)", () => {
	test("$.__escaped=true on one call makes the next execute_code call restore all tools", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");
		expect(executeCode).toBeDefined();

		await executeCode.execute("tc1", { code: "$.__escaped = true;" }, new AbortController().signal, undefined, makeExecuteCtx());
		pi.setActiveToolsCalls.length = 0;
		await executeCode.execute("tc2", { code: "console.log('sync');" }, new AbortController().signal, undefined, makeExecuteCtx());

		expect(pi.setActiveToolsCalls).toContainEqual(["execute_code", "context_tag", "read", "bash", "grep"]);
	});

	test("$.__escaped=false on one call makes the next execute_code call restore filtered tools", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");

		await pi.commands.get("escape_code_mode").handler(undefined, { ui: { notify: () => {} } });
		await executeCode.execute("tc1", { code: "$.__escaped = false;" }, new AbortController().signal, undefined, makeExecuteCtx());
		pi.setActiveToolsCalls.length = 0;
		await executeCode.execute("tc2", { code: "console.log('sync');" }, new AbortController().signal, undefined, makeExecuteCtx());

		expect(pi.setActiveToolsCalls).toContainEqual(["execute_code", "context_tag"]);
	});
});
