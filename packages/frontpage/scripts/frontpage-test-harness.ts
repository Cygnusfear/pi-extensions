import type {
	AgentToolResult,
	ExtensionAPI,
	ExtensionContext,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import {
	createFrontpageExtension,
	type FrontpageSpawn,
} from "../extensions/frontpage.ts";

export interface SpawnCall {
	command: string;
	args: string[];
}

const toolContext = {} as ExtensionContext;

export function createFrontpageTestHarness() {
	const spawnCalls: SpawnCall[] = [];
	const tools = new Map<string, ToolDefinition>();
	const fakeSpawn = ((
		command: string,
		argsOrOptions?: readonly string[] | object,
	) => {
		const args = Array.isArray(argsOrOptions) ? argsOrOptions.map(String) : [];
		spawnCalls.push({ command, args });
		const fakeChild = {
			pid: 12_345,
			on(event: string, callback: (...args: unknown[]) => void) {
				if (event === "close") setTimeout(() => callback(0), 0);
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
			stdout: {
				on() {
					return fakeChild.stdout;
				},
				resume() {
					return fakeChild.stdout;
				},
			},
			stderr: {
				on() {
					return fakeChild.stderr;
				},
				resume() {
					return fakeChild.stderr;
				},
			},
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
	createFrontpageExtension({ spawn: fakeSpawn })(fakeApi as ExtensionAPI);

	return {
		spawnCalls,
		resetSpawnCalls() {
			spawnCalls.length = 0;
		},
		async execute(
			name: string,
			callId: string,
			params: object,
		): Promise<AgentToolResult<unknown>> {
			const tool = tools.get(name);
			if (!tool) throw new Error(`Frontpage tool was not registered: ${name}`);
			return tool.execute(callId, params, undefined, undefined, toolContext);
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
