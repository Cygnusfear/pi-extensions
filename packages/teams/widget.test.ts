import { describe, expect, test } from "bun:test";
import type { WorkerHandle } from "./types.ts";
import { createTeamsWidget, projectWidgetStatus } from "./widget.ts";

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

describe("teams widget render — identity-first shape (v1a thesis at the render layer)", () => {
	// Theme fake — strips styling but keeps text so we can assert on content.
	const theme = {
		fg: (_color: string, text: string) => text,
		bold: (text: string) => text,
	} as unknown as Parameters<ReturnType<typeof createTeamsWidget>>[1];
	const tui = {} as unknown as Parameters<ReturnType<typeof createTeamsWidget>>[0];

	function renderRows(workers: WorkerHandle[]): string[] {
		const factory = createTeamsWidget(() => workers);
		return factory(tui, theme).render(200);
	}

	test("line 1 = durable nickname first · role · status (the worker IS its durable peer; role is a mutable alias)", () => {
		const w = { ...makeWorker(), nickname: "Roger Geodesic Maudin", name: "admin-intel", status: "spawning" as const };
		const lines = renderRows([w]);
		// lines[0] = "Teams" header; lines[1] = identity row.
		expect(lines[1]).toContain("Roger Geodesic Maudin");
		expect(lines[1]).toContain("admin-intel");
		expect(lines[1]).toContain("spawning");
		// Identity BEFORE role BEFORE status — order encodes the "peer, not lesser-typed subagent" thesis.
		expect(lines[1].indexOf("Roger Geodesic Maudin")).toBeLessThan(lines[1].indexOf("admin-intel"));
		expect(lines[1].indexOf("admin-intel")).toBeLessThan(lines[1].indexOf("spawning"));
	});

	test("line 1 shows … in the identity slot when the hello envelope hasn't arrived yet (peer exists, identity resolving — never hide the slot)", () => {
		const w = { ...makeWorker(), nickname: undefined, name: "admin-intel" };
		const lines = renderRows([w]);
		expect(lines[1]).toContain("…");
		expect(lines[1]).toContain("admin-intel");
		expect(lines[1].indexOf("…")).toBeLessThan(lines[1].indexOf("admin-intel"));
	});

	test("line 2 = metadata badges (model · session-mode · ticket) — separated so metadata never buries the peer name again", () => {
		const w = {
			...makeWorker(),
			nickname: "Roger Geodesic Maudin",
			name: "admin-intel",
			model: "anthropic/claude-opus-4-8",
			ticketId: "mp-p0xi9j23",
			ticketStatus: "in_progress" as const,
		};
		const lines = renderRows([w]);
		expect(lines[1]).toContain("Roger Geodesic Maudin");
		expect(lines[2]).toContain("anthropic/claude-opus-4-8");
		expect(lines[2]).toContain("mp-p0xi9j23");
		expect(lines[2]).toContain("in_progress");
		// The whole point of the split: metadata is NOT on the identity line.
		expect(lines[1]).not.toContain("anthropic/claude-opus-4-8");
		expect(lines[1]).not.toContain("mp-p0xi9j23");
	});
});
