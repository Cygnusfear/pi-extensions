import { describe, expect, test } from "bun:test";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	ExtensionContext,
	RegisteredCommand,
	SessionStartEvent,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";

type CommandDefinition = Omit<RegisteredCommand, "name" | "sourceInfo">;
type CapturedCommand = CommandDefinition & { name: string };
type SessionStartHandler = (
	event: SessionStartEvent,
	context: ExtensionContext,
) => unknown;

// Mirrors packages/default-prompt/extensions/default-prompt.test.ts: import the
// extension's register fn, hand it a fake pi that captures the registered tool,
// command, and lifecycle hook, then exercise them directly. No full pi runtime needed.
async function loadRestart() {
	const mod = await import(
		`../extensions/restart.ts?test-bust=${Math.random()}`
	);
	const register = mod.default;
	let tool: ToolDefinition | undefined;
	let command: CapturedCommand | undefined;
	const lifecycleHandlers = new Map<string, SessionStartHandler>();
	const entries: Array<{ customType: string; data: unknown }> = [];
	const messages: Array<{ message: unknown; options: unknown }> = [];
	const base = {
		registerTool(definition: ToolDefinition) {
			tool = definition;
		},
		registerCommand(name: string, definition: CommandDefinition) {
			command = { name, ...definition };
		},
		on(event: string, handler: SessionStartHandler) {
			lifecycleHandlers.set(event, handler);
		},
		appendEntry(customType: string, data: unknown) {
			entries.push({ customType, data });
		},
		sendMessage(message: unknown, options: unknown) {
			messages.push({ message, options });
		},
	};
	return {
		register,
		base,
		getTool: () => {
			if (!tool) throw new Error("restart_runtime tool was not registered");
			return tool;
		},
		getCommand: () => {
			if (!command)
				throw new Error("restart-runtime command was not registered");
			return command;
		},
		getLifecycleHandler: (event: string) => lifecycleHandlers.get(event),
		getEntries: () => entries,
		getMessages: () => messages,
	};
}

const asExtensionApi = (value: unknown): ExtensionAPI => value as ExtensionAPI;
const asCommandContext = (value: unknown): ExtensionCommandContext =>
	value as ExtensionCommandContext;
const toolContext = {} as ExtensionContext;

async function executeRestartTool(tool: ToolDefinition) {
	return tool.execute("test-call", {}, undefined, undefined, toolContext);
}

describe("restart extension — restart_runtime tool", () => {
	test("registers and executes the restart-resume lifecycle handler", async () => {
		const { register, base, getLifecycleHandler, getEntries, getMessages } =
			await loadRestart();
		register(asExtensionApi(base));
		const handler = getLifecycleHandler("session_start");
		expect(typeof handler).toBe("function");
		await handler?.(
			{ type: "session_start" } as SessionStartEvent,
			asCommandContext({
				sessionManager: {
					getEntries: () => [{ customType: "restart-resume-turn" }],
				},
			}),
		);
		expect(getEntries().map((entry) => entry.customType)).toEqual([
			"restart-resume-consumed",
		]);
		expect(getMessages()).toHaveLength(1);
		expect(getMessages()[0]?.options).toEqual({
			deliverAs: "followUp",
			triggerTurn: true,
		});
	});

	test("returns isError when the host does not expose pi.restart()", async () => {
		const { register, base, getTool } = await loadRestart();
		register(asExtensionApi(base));
		const tool = getTool();
		expect(tool.name).toBe("restart_runtime");
		const result = await executeRestartTool(tool);
		expect(result.isError).toBe(true);
		expect(
			result.content[0]?.type === "text" ? result.content[0].text : "",
		).toContain("does not expose pi.restart()");
	});

	test("calls pi.restart() when the host exposes it", async () => {
		const { register, base, getTool, getEntries } = await loadRestart();
		let called = false;
		const pi = {
			...base,
			restart: async () => {
				called = true;
			},
		};
		register(asExtensionApi(pi));
		const result = await executeRestartTool(getTool());
		expect(called).toBe(true);
		expect(getEntries().map((entry) => entry.customType)).toEqual([
			"restart-resume-turn",
		]);
		expect(result.isError).toBeUndefined();
		expect(
			result.content[0]?.type === "text" ? result.content[0].text : "",
		).toContain("Restart queued");
	});
});

describe("restart extension — /restart-runtime slash command", () => {
	test("registers the restart-runtime command", async () => {
		const { register, base, getCommand } = await loadRestart();
		register(asExtensionApi(base));
		const command = getCommand();
		expect(command.name).toBe("restart-runtime");
		expect(typeof command.handler).toBe("function");
	});

	test("notifies error (no throw) when ctx.restart() is absent", async () => {
		const { register, base, getCommand } = await loadRestart();
		register(asExtensionApi(base));
		const notes: Array<{ message: string; level: string }> = [];
		const context = {
			hasUI: true,
			ui: {
				notify: (message: string, level: string) =>
					notes.push({ message, level }),
			},
		};
		await getCommand().handler("", asCommandContext(context));
		expect(notes).toHaveLength(1);
		expect(notes[0]?.level).toBe("error");
		expect(notes[0]?.message).toContain("ctx.restart()");
	});

	test("calls ctx.restart() when present", async () => {
		const { register, base, getCommand } = await loadRestart();
		register(asExtensionApi(base));
		let called = false;
		const context = {
			hasUI: true,
			restart: async () => {
				called = true;
			},
			ui: { notify: () => {} },
		};
		await getCommand().handler("", asCommandContext(context));
		expect(called).toBe(true);
	});
});
