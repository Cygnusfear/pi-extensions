import type {
	AgentToolResult,
	ExtensionAPI,
	ExtensionContext,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	createFrontpageExtension,
	type FrontpageSpawn,
} from "../extensions/frontpage.ts";

export interface SpawnCall {
	command: string;
	args: string[];
	cwd?: string;
}

export interface SpawnResponse {
	stdout?: string;
	stderr?: string;
	code?: number;
}

const toolContext = {} as ExtensionContext;

export function createFrontpageTestHarness() {
	// These tests drive the real tools, which write real pages. They go to a
	// scratch directory: a test run must never touch the store the operator
	// works in, and must not push its own pages to the top of the index.
	const scratch = mkdtempSync(path.join(tmpdir(), "frontpage-test-store-"));
	process.env.FRONTPAGE_STORE_DIR = scratch;
	// And talk to nothing: a live server on the default port would accept these
	// pages and write them into its own store.
	process.env.FRONTPAGE_PORT = "1";
	process.once("exit", () => {
		try { rmSync(scratch, { recursive: true, force: true }); } catch { /* nothing to clean */ }
	});
	const spawnCalls: SpawnCall[] = [];
	const tools = new Map<string, ToolDefinition>();
	// Programmable per-call child result. Default: exit 0, no output.
	let respond: (call: SpawnCall) => SpawnResponse = () => ({ code: 0 });

	const fakeSpawn = ((
		command: string,
		argsOrOptions?: readonly string[] | object,
		options?: object,
	) => {
		const args = Array.isArray(argsOrOptions) ? argsOrOptions.map(String) : [];
		const cwd =
			options && "cwd" in options
				? ((options as { cwd?: string }).cwd ?? undefined)
				: undefined;
		const call: SpawnCall = { command, args, ...(cwd ? { cwd } : {}) };
		spawnCalls.push(call);
		const response = respond(call);
		const streamFor = (key: "stdout" | "stderr") => {
			const stream = {
				on(event: string, callback: (...args: unknown[]) => void) {
					if (event === "data")
						setTimeout(
							() => callback(Buffer.from(response[key] ?? "")),
							0,
						);
					return stream;
				},
				resume() {
					return stream;
				},
			};
			return stream;
		};
		const fakeChild = {
			pid: 12_345,
			on(event: string, callback: (...args: unknown[]) => void) {
				if (event === "close")
					setTimeout(() => callback(response.code ?? 0), 0);
				return fakeChild;
			},
			once(event: string, callback: (...args: unknown[]) => void) {
				return fakeChild.on(event, callback);
			},
			unref() {},
			kill() {
				return true;
			},
			stdin: { write() {}, end() {} },
			stdout: streamFor("stdout"),
			stderr: streamFor("stderr"),
		};
		return fakeChild;
	}) as unknown as FrontpageSpawn;
	const fakeApi = {
		on() {},
		registerTool(definition: ToolDefinition) {
			tools.set(definition.name, definition);
		},
		registerCommand() {},
	};
	createFrontpageExtension({ spawn: fakeSpawn, maiBin: "mai" })(
		fakeApi as ExtensionAPI,
	);

	return {
		spawnCalls,
		resetSpawnCalls() {
			spawnCalls.length = 0;
		},
		setResponder(fn: (call: SpawnCall) => SpawnResponse) {
			respond = fn;
		},
		async execute(
			name: string,
			callId: string,
			params: object,
			ctx: ExtensionContext = toolContext,
		): Promise<AgentToolResult<unknown>> {
			const tool = tools.get(name);
			if (!tool) throw new Error(`Frontpage tool was not registered: ${name}`);
			return tool.execute(callId, params, undefined, undefined, ctx);
		},
	};
}

export function resultText(result: AgentToolResult<unknown>): string {
	return result.content
		.filter(
			(
				item,
			): item is Extract<(typeof result.content)[number], { type: "text" }> =>
				item.type === "text",
		)
		.map((item) => item.text)
		.join("\n");
}

export function resultDetails<T>(result: AgentToolResult<unknown>): T {
	return result.details as T;
}
