import { describe, expect, test } from "bun:test";
import { createWorkerCommentEnvelope, createWorkerFinishEnvelope, createWorkerHelloEnvelope } from "./mesh-adapter.ts";

describe("teams v2 mesh adapter", () => {
	test("worker hello envelope is acked and addressed to leader", () => {
		const envelope = createWorkerHelloEnvelope({
			teamId: "team-1",
			leaderEpoch: "epoch-1",
			workerId: "worker-1",
			attemptId: "attempt-1",
			seq: 1,
			runtime: {
				protocolVersion: 1,
				teamId: "team-1",
				leaderEpoch: "epoch-1",
				workerId: "worker-1",
				attemptId: "attempt-1",
				coordinatorSessionId: "session-1",
				leasePath: "/tmp/lease.json",
				sessionMode: { kind: "fresh" },
			},
		});
		expect(envelope.from).toBe("worker");
		expect(envelope.to).toBe("leader");
		expect(envelope.type).toBe("worker.hello");
		expect(envelope.requiresAck).toBe(true);
	});

	test("worker comment envelope carries text without ack requirement", () => {
		const envelope = createWorkerCommentEnvelope({
			teamId: "team-1",
			leaderEpoch: "epoch-1",
			workerId: "worker-1",
			attemptId: "attempt-1",
			seq: 2,
			text: "hello",
		});
		expect(envelope.type).toBe("worker.comment");
		expect(envelope.payload).toEqual({ text: "hello" });
		expect(envelope.requiresAck).toBeUndefined();
	});

	test("worker finish envelope requests ack", () => {
		const envelope = createWorkerFinishEnvelope({
			teamId: "team-1",
			leaderEpoch: "epoch-1",
			workerId: "worker-1",
			attemptId: "attempt-1",
			seq: 3,
			status: "done",
			summary: "done",
		});
		expect(envelope.type).toBe("worker.finish");
		expect(envelope.payload).toEqual({ status: "done", summary: "done" });
		expect(envelope.requiresAck).toBe(true);
	});
});
