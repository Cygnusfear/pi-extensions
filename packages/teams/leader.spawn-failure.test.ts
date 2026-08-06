import { describe, expect, test } from "bun:test";
import { TeamLeader } from "./leader.ts";
import type { SpawnConfig } from "./types.ts";

function initializedLeader() {
	const entries: any[] = [{ type: "message", id: "assistant", message: { role: "assistant", content: [] } }];
	const pi = {
		appendEntry: (customType: string, data: unknown) => entries.push({ type: "custom", customType, data }),
		exec: async () => ({ stdout: JSON.stringify({ status: "open", comments: [] }) }),
		sendMessage: () => {},
	};
	const leader = new TeamLeader(pi as any) as any;
	const ctx = {
		cwd: "/tmp/pe-52ei8nq4",
		sessionManager: {
			getSessionFile: () => "/tmp/pe-52ei8nq4/leader.jsonl",
			getSessionId: () => "coordinator-session",
			getEntries: () => entries,
			getBranch: () => entries,
			getHeader: () => null,
		},
		ui: { setWidget: () => {} },
	};
	leader.ctx = ctx;
	leader.restoreState(ctx);
	return { leader, entries };
}

describe("TeamLeader launch-failure lifecycle", () => {
	test("persists the exact typed launch diagnostic as a terminal startup-failure attempt", () => {
		const { leader, entries } = initializedLeader();
		const config: SpawnConfig = {
			workerId: "logical-worker",
			workerInstanceId: "failed-resume-attempt",
			ticketId: "pe-52ei8nq4",
			workerName: "resumable",
			useWorktree: false,
			cwd: "/tmp/pe-52ei8nq4",
			repoRoot: "/tmp/pe-52ei8nq4",
			sessionDir: "/tmp/pe-52ei8nq4/worker",
			leaderSessionFile: "/tmp/pe-52ei8nq4/leader.jsonl",
			teamId: "team-test",
			sessionMode: { kind: "resume", sessionFile: "/tmp/pe-52ei8nq4/stopped-worker.jsonl" },
			freeform: true,
		};
		leader.recordSpawnRequested(config, config.sessionMode.sessionFile);
		const identity = {
			coordinatorSessionId: leader.factWriter.coordinatorSessionId,
			teamId: "team-test",
			workerId: config.workerId,
			attemptId: config.workerInstanceId,
		};
		const reason = "Worker session resume failed: pi-unavailable: PATH lacked Pi CLI";
		leader.recordStartupFailure(identity, reason);

		const fact = entries
			.filter((entry) => entry.type === "custom")
			.map((entry) => entry.data)
			.find((data) => data.kind === "assessment_startup_failure");
		expect(fact.payload).toEqual({ reason, provisional: false });
		const attempt = leader.lifecycleStore.attempt(config.workerInstanceId);
		expect(attempt.assessment?.kind).toBe("startup_failure");
		expect(attempt.process.phase).toBe("spawning");
	});
});
