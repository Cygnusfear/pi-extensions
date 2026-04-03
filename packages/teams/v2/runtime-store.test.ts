import { describe, expect, test } from "bun:test";
import { appendFact, createTeamRecord, upsertWorker } from "./runtime-store.ts";

describe("teams v2 runtime store", () => {
	test("upsertWorker creates a worker attempt and appendFact reduces lifecycle", () => {
		let team = createTeamRecord("team-1", "epoch-1");
		team = upsertWorker(team, {
			workerId: "worker-1",
			name: "worker",
			attemptId: "attempt-1",
			sessionMode: { kind: "fresh" },
			sessionDir: "/tmp/worker-1",
			startedAt: 1,
			pid: 123,
		});
		expect(team.workers["worker-1"]?.attempts).toHaveLength(1);
		expect(team.workers["worker-1"]?.lifecycle).toBe("created");

		team = appendFact(team, "worker-1", { type: "spawn_started", at: 2, pid: 123 });
		expect(team.workers["worker-1"]?.lifecycle).toBe("spawning");

		team = appendFact(team, "worker-1", { type: "worker_hello", at: 3 });
		expect(team.workers["worker-1"]?.lifecycle).toBe("running");

		team = appendFact(team, "worker-1", { type: "finish_done", at: 4, summary: "done" });
		expect(team.workers["worker-1"]?.lifecycle).toBe("done");
	});

	test("upsertWorker appends a new attempt for an existing worker", () => {
		let team = createTeamRecord("team-1", "epoch-1");
		team = upsertWorker(team, {
			workerId: "worker-1",
			name: "worker",
			attemptId: "attempt-1",
			sessionMode: { kind: "fresh" },
			sessionDir: "/tmp/worker-1",
			startedAt: 1,
		});
		team = upsertWorker(team, {
			workerId: "worker-1",
			name: "worker",
			attemptId: "attempt-2",
			sessionMode: { kind: "resume", sessionFile: "/tmp/worker-1/session.jsonl" },
			sessionDir: "/tmp/worker-1",
			startedAt: 2,
		});
		expect(team.workers["worker-1"]?.attempts).toHaveLength(2);
		expect(team.workers["worker-1"]?.currentAttemptId).toBe("attempt-2");
	});
});
