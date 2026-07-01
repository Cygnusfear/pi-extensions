import { describe, test, expect } from "bun:test";

// Mirrors packages/default-prompt/extensions/default-prompt.test.ts: import the
// extension's register fn, hand it a fake pi that captures the registered tool +
// command, then exercise them directly. No full pi runtime needed.

async function loadRestart() {
	const mod = await import("../extensions/restart.ts?test-bust=" + Math.random());
	const register = mod.default;
	let tool: any = null;
	let command: any = null;
	const base = {
		registerTool(def: any) { tool = def; },
		registerCommand(name: string, def: any) { command = { name, ...def }; },
	};
	return { register, base, getTool: () => tool, getCommand: () => command };
}

describe("restart extension — restart_runtime tool", () => {
	test("returns isError when the host does not expose pi.restart()", async () => {
		const { register, base, getTool } = await loadRestart();
		register(base as any); // base pi has no .restart
		const tool = getTool();
		expect(tool.name).toBe("restart_runtime");
		const result = await tool.execute({});
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("does not expose pi.restart()");
	});

	test("calls pi.restart() when the host exposes it", async () => {
		const { register, base, getTool } = await loadRestart();
		let called = false;
		const pi = { ...base, restart: async () => { called = true; } };
		register(pi as any);
		const result = await getTool().execute({});
		expect(called).toBe(true);
		expect(result.isError).toBeUndefined();
		expect(result.content[0].text).toContain("Restarting pi");
	});
});

describe("restart extension — /restart-runtime slash command", () => {
	test("registers the restart-runtime command", async () => {
		const { register, base, getCommand } = await loadRestart();
		register(base as any);
		const cmd = getCommand();
		expect(cmd.name).toBe("restart-runtime");
		expect(typeof cmd.handler).toBe("function");
	});

	test("notifies error (no throw) when ctx.restart() is absent", async () => {
		const { register, base, getCommand } = await loadRestart();
		register(base as any);
		const notes: any[] = [];
		const ctx = { hasUI: true, ui: { notify: (m: string, level: string) => notes.push({ m, level }) } };
		await getCommand().handler({}, ctx as any); // ctx has no .restart
		expect(notes.length).toBe(1);
		expect(notes[0].level).toBe("error");
		expect(notes[0].m).toContain("ctx.restart()");
	});

	test("calls ctx.restart() when present", async () => {
		const { register, base, getCommand } = await loadRestart();
		register(base as any);
		let called = false;
		const ctx = { hasUI: true, restart: async () => { called = true; }, ui: { notify: () => {} } };
		await getCommand().handler({}, ctx as any);
		expect(called).toBe(true);
	});
});
