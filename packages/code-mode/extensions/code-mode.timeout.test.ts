/**
 * Regression: execute_code with the `timeout` parameter.
 *
 * `timeout` is a transport knob the protocol decoder does not own. A previous
 * version spread `timeoutMs` into decodeCodeExecutionRequest, whose exact-key
 * check rejected it, so EVERY call with a timeout died as
 * `invalid_code_execution_request_v1` before executing. Long-running subagent
 * briefs were hit hardest because that is exactly when a timeout gets passed.
 */
import { describe, expect, test } from "bun:test";
import codeModeExt from "../extensions/code-mode";

interface FakeTool {
	name: string;
	execute?: (...args: any[]) => Promise<any>;
}

function makePi() {
	const tools = new Map<string, any>();
	const allTools: FakeTool[] = [
		{ name: "execute_code" },
		{ name: "context_tag" },
		{ name: "read" },
		{ name: "bash" },
	];
	const pi: any = {
		commands: new Map(),
		tools,
		handlers: new Map(),
		activeTools: [] as string[],
		registerCommand: (name: string, opts: any) => pi.commands.set(name, opts),
		registerTool: (tool: any) => tools.set(tool.name, tool),
		setActiveTools: (names: string[]) => {
			pi.activeTools = [...names];
		},
		getActiveTools: () => pi.activeTools,
		getAllTools: () => allTools,
		on: (event: string, handler: any) => {
			const list = pi.handlers.get(event) ?? [];
			list.push(handler);
			pi.handlers.set(event, list);
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
		ui: { confirm: async () => true, notify: () => {} },
		abort: () => {},
	};
}

describe("execute_code timeout parameter", () => {
	test("a timeout no longer rejects the call as an invalid request", async () => {
		const pi = makePi();
		codeModeExt(pi, { isTeamsWorker: () => false });
		const executeCode = pi.tools.get("execute_code");
		const execute = executeCode.execute.bind(executeCode);
		const wrapped = (id: string, params: any, ...rest: any[]) =>
			execute(id, { thinking: "Timeout regression rationale.", ...params }, ...rest);

		const result = await wrapped(
			"tc-timeout-1",
			{ code: "console.log('timeout-path-ran');", timeout: 5 },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const text = result.content.find((c: any) => c.type === "text")?.text ?? "";
		expect(text).toContain("timeout-path-ran");
		expect(text).not.toContain("invalid_code_execution_request_v1");
	});

	test("timeout is enforced, not merely accepted", async () => {
		const pi = makePi();
		codeModeExt(pi, { isTeamsWorker: () => false });
		const executeCode = pi.tools.get("execute_code");
		const execute = executeCode.execute.bind(executeCode);
		const wrapped = (id: string, params: any, ...rest: any[]) =>
			execute(id, { thinking: "Timeout enforcement rationale.", ...params }, ...rest);

		const t0 = Date.now();
		const result = await wrapped(
			"tc-timeout-2",
			{ code: "await sleep(4000); console.log('NOT CUT');", timeout: 1 },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const elapsed = Date.now() - t0;
		const text = result.content.find((c: any) => c.type === "text")?.text ?? "";
		expect(elapsed).toBeLessThan(3000);
		expect(text).not.toContain("NOT CUT");
		expect(text).toMatch(/timed out/i);
	});
});
