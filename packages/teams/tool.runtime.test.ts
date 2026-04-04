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
});
