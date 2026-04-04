import { describe, expect, test } from "bun:test";
import { runTeamsAction } from "./tool.ts";

describe("teams tool runtime action", () => {
	test("returns v2 runtime JSON when available", async () => {
		const leader = {
			setContext: () => {},
			getV2TeamRecord: () => ({ teamId: "team-1", leaderEpoch: "epoch-1", createdAt: 1, workers: {} }),
		} as any;
		const result = await runTeamsAction({} as any, leader, { action: "runtime" }, { cwd: "/tmp" } as any);
		expect(result.content[0]?.text).toContain('"teamId": "team-1"');
	});

	test("normalizes thrown errors for view action", async () => {
		const leader = {
			setContext: () => {},
			viewWorker: async () => {
				throw new Error("Unknown worker \"nope\"");
			},
		} as any;
		const result = await runTeamsAction({} as any, leader, { action: "view", name: "nope" }, { cwd: "/tmp" } as any);
		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe('Error: Unknown worker "nope"');
	});

	test("delegate surfaces duplicate active worker name errors", async () => {
		const leader = {
			setContext: () => {},
			delegate: async () => {
				throw new Error('Worker name "dup" is already active on ticket #pe-old');
			},
			startPolling: () => {},
		} as any;
		const pi = {
			exec: async (cmd: string, args: string[]) => {
				if (cmd === 'mai' && args[0] === 'ticket') return { stdout: 'pe-new\n', code: 0 };
				return { stdout: '', code: 0 };
			},
		} as any;
		const result = await runTeamsAction(pi, leader, { action: 'delegate', tasks: [{ text: 'x', assignee: 'dup' }], useWorktree: true }, { cwd: '/tmp' } as any);
		expect(result.content[0]?.text).toContain('already active');
	});

	test("kill action accepts an array of worker names", async () => {
		const killed: string[] = [];
		const leader = {
			setContext: () => {},
			kill: async (name: string) => { killed.push(name); },
		} as any;
		const result = await runTeamsAction({} as any, leader, { action: 'kill', names: ['a', 'b'] }, { cwd: '/tmp' } as any);
		expect(killed).toEqual(['a', 'b']);
		expect(result.content[0]?.text).toContain('Killed 2 workers');
	});
});
