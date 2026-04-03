import { describe, expect, test } from "bun:test";
import type { WorkerHandle } from "./types.ts";
import { projectWidgetStatus } from "./widget.ts";

function makeWorker(): WorkerHandle {
	const now = Date.now();
	return {
		workerInstanceId: "w-1",
		name: "worker-1",
		pid: 123,
		ticketId: "tk-1",
		sessionDir: "/tmp/session",
		sessionFile: "/tmp/session/session.jsonl",
		worktreePath: null,
		status: "running",
		spawnedAt: now,
		lastActivityAt: now,
		lastProcessActivityAt: now,
		hasActiveChildProcess: false,
		activeChildProcessCount: 0,
		lastSeenCommentCount: 0,
		routeState: "linked",
	};
}

describe("teams widget projection", () => {
	test("includes v2 lifecycle in route label when available", () => {
		const projected = projectWidgetStatus(makeWorker(), "running");
		expect(projected.status).toBe("running");
		expect(projected.routeLabel).toBe("linked / v2:running");
	});

	test("falls back to legacy route label when v2 lifecycle missing", () => {
		const projected = projectWidgetStatus(makeWorker(), null);
		expect(projected.routeLabel).toBe("linked");
	});
});
