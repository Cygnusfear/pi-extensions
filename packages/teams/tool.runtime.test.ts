import { describe, expect, test } from "bun:test";
import path from "node:path";
import { runTeamsAction } from "./tool.ts";

describe("teams tool runtime action", () => {
	test("returns v2 runtime JSON when available", async () => {
		const leader = {
			setContext: () => {},
			getLifecycleProjectionRecord: () => ({ teamId: "team-1", leaderEpoch: "epoch-1", createdAt: 1, workers: {} }),
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
			hasLifecycleAttempt: () => false,
		} as any;
		const pi = {
			exec: async (cmd: string, args: string[]) => {
				if (path.basename(cmd) === 'mai' && args[0] === 'ticket') return { stdout: 'pe-new\n', code: 0 };
				return { stdout: '', code: 0 };
			},
		} as any;
		const result = await runTeamsAction(pi, leader, { action: 'delegate', tasks: [{ text: 'x', assignee: 'dup' }], useWorktree: true }, { cwd: '/tmp' } as any);
		expect(result.content[0]?.text).toContain('already active');
	});

	test("delegate creates worker instruction tickets, not review artifacts", async () => {
		const execCalls: Array<{ cmd: string; args: string[] }> = [];
		const leader = {
			setContext: () => {},
			delegate: async () => ({ pid: 123 }),
			startPolling: () => {},
		} as any;
		const pi = {
			exec: async (cmd: string, args: string[]) => {
				execCalls.push({ cmd, args });
				if (path.basename(cmd) === 'mai' && args[0] === 'ticket') return { stdout: 'pe-review-inst\n', code: 0 };
				return { stdout: '', code: 0 };
			},
		} as any;

		await runTeamsAction(
			pi,
			leader,
			{ action: 'delegate', tasks: [{ text: 'review x', assignee: 'rev', template: 'review' }], useWorktree: false },
			// template 'review' (a built-in DEFAULT_TEAM_TEMPLATES entry) has an array
			// model, so the router calls ctx.modelRegistry.getAvailable() to pick a concrete
			// one. Provide one of review's models as available so resolveModelRole resolves
			// and delegation proceeds — this asserts the real behavior (mai ticket args),
			// independent of the user's configured ~/.pi/agent/team-templates.json.
			{ cwd: '/tmp', modelRegistry: { getAvailable: () => [{ provider: 'openai-codex', id: 'gpt-5.6-terra' }] } } as any,
		);

		const create = execCalls.find((c) => path.basename(c.cmd) === 'mai' && c.args[0] === 'ticket');
		expect(create?.args).toEqual(['ticket', 'review x', 'task', '-l', 'team,agent-instruction,reviewer', '-a', 'rev']);
		expect(create?.args).not.toContain('artifact');
		expect(create?.args.join(',')).not.toContain('review,');
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


describe("teams adopt action", () => {
	test("creates an adopted-session instruction ticket and forwards the hard-typed selector without a model override", async () => {
		const execCalls: Array<{ cmd: string; args: string[] }> = [];
		const adopted: unknown[][] = [];
		const leader = {
			setContext: () => {},
			adoptSession: async (...args: unknown[]) => {
				adopted.push(args);
				return { pid: 321 };
			},
			startPolling: () => {},
			hasLifecycleAttempt: () => false,
		} as any;
		const pi = {
			exec: async (cmd: string, args: string[]) => {
				execCalls.push({ cmd, args });
				if (path.basename(cmd) === "mai" && args[0] === "ticket") return { stdout: "pe-adopted\n", code: 0 };
				return { stdout: "", code: 0 };
			},
		} as any;
		const result = await runTeamsAction(pi, leader, {
			action: "adopt",
			adoption: {
				session: { kind: "id", id: "source-session" },
				as: "durable",
				message: "continue exact context",
				hasTools: true,
			},
		}, { cwd: "/tmp" } as any);

		expect(result.isError).not.toBe(true);
		expect(result.content[0]?.text).toContain("[session model]");
		expect(adopted).toEqual([[
			"pe-adopted",
			"durable",
			{ kind: "id", id: "source-session" },
			"continue exact context",
			undefined,
			true,
		]]);
		const create = execCalls.find((call) => path.basename(call.cmd) === "mai" && call.args[0] === "ticket");
		expect(create?.args).toEqual([
			"ticket",
			"continue exact context",
			"task",
			"-l",
			"team,agent-instruction,adopted-session",
			"-a",
			"durable",
		]);
	});

	test("rejects unsafe aliases before creating or starting a ticket", async () => {
		const execCalls: string[][] = [];
		const pi = {
			exec: async (_cmd: string, args: string[]) => {
				execCalls.push(args);
				return { stdout: "", code: 0 };
			},
		} as any;
		const result = await runTeamsAction(pi, { setContext: () => {} } as any, {
			action: "adopt",
			adoption: { session: { kind: "file", path: "/tmp/source.jsonl" }, as: "../escape", message: "go" },
		}, { cwd: "/tmp" } as any);
		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toContain("path separators");
		expect(execCalls.some((args) => args[0] === "ticket" || args[0] === "start")).toBe(false);
	});

	test("does not close a caller-owned ticket when adoption is rejected before lifecycle intent", async () => {
		const execCalls: string[][] = [];
		const leader = {
			setContext: () => {},
			adoptSession: async () => { throw new Error("live activation lease"); },
			hasLifecycleAttempt: () => false,
		} as any;
		const pi = {
			exec: async (_cmd: string, args: string[]) => {
				execCalls.push(args);
				return { stdout: "", code: 0 };
			},
		} as any;
		const result = await runTeamsAction(pi, leader, {
			action: "adopt",
			adoption: {
				session: { kind: "id", id: "source" },
				as: "durable",
				message: "continue",
				ticketId: "pe-owned",
			},
		}, { cwd: "/tmp" } as any);
		expect(result.isError).toBe(true);
		expect(execCalls).toContainEqual(["start", "pe-owned"]);
		expect(execCalls.some((args) => args[0] === "close")).toBe(false);
	});
});
