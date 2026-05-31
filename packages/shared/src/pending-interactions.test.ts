import { describe, it, expect, beforeEach } from "bun:test";
import {
	beginConfirm,
	endConfirm,
	getPendingConfirms,
	pendingConfirmCount,
	formatPendingConfirmsForAgent,
	__resetForTests,
} from "./pending-interactions.ts";

describe("pending-interactions registry", () => {
	beforeEach(() => __resetForTests());

	it("starts empty", () => {
		expect(pendingConfirmCount()).toBe(0);
		expect(getPendingConfirms()).toEqual([]);
		expect(formatPendingConfirmsForAgent()).toBeNull();
	});

	it("tracks an open confirm and releases it", () => {
		const h = beginConfirm({ source: "git-safety", tool: "bash", reason: "git push --force" });
		expect(pendingConfirmCount()).toBe(1);
		const [entry] = getPendingConfirms();
		expect(entry.source).toBe("git-safety");
		expect(entry.tool).toBe("bash");
		expect(entry.reason).toBe("git push --force");
		expect(entry.handle).toBe(h);
		expect(typeof entry.openedAt).toBe("number");

		endConfirm(h);
		expect(pendingConfirmCount()).toBe(0);
	});

	it("handles multiple concurrent confirms in open-order", async () => {
		const h1 = beginConfirm({ source: "git-safety", tool: "bash", reason: "first" });
		// guarantee ordering even if Date.now() returns identical values
		await new Promise((r) => setTimeout(r, 2));
		const h2 = beginConfirm({ source: "lock-mode", tool: "write", reason: "second" });
		await new Promise((r) => setTimeout(r, 2));
		const h3 = beginConfirm({ source: "git-safety", tool: "apply_patch", reason: "third" });

		const entries = getPendingConfirms();
		expect(entries.map((e) => e.reason)).toEqual(["first", "second", "third"]);

		endConfirm(h2);
		expect(getPendingConfirms().map((e) => e.reason)).toEqual(["first", "third"]);

		endConfirm(h1);
		endConfirm(h3);
		expect(pendingConfirmCount()).toBe(0);
	});

	it("double-end is idempotent", () => {
		const h = beginConfirm({ source: "git-safety", tool: "bash", reason: "x" });
		endConfirm(h);
		expect(() => endConfirm(h)).not.toThrow();
		expect(pendingConfirmCount()).toBe(0);
	});

	it("end of unknown handle is a no-op", () => {
		expect(() => endConfirm(99999)).not.toThrow();
		expect(pendingConfirmCount()).toBe(0);
	});

	it("formatPendingConfirmsForAgent produces a useful agent-visible string", () => {
		beginConfirm({ source: "git-safety", tool: "bash", reason: "git push --force in /repo" });
		const out = formatPendingConfirmsForAgent();
		expect(out).not.toBeNull();
		expect(out!).toContain("1 blocking dialog");
		expect(out!).toContain("[git-safety]");
		expect(out!).toContain("git push --force in /repo");
		expect(out!).toContain("tool: bash");
	});

	it("returns unique monotonic handles", () => {
		const h1 = beginConfirm({ source: "a", tool: "bash", reason: "1" });
		const h2 = beginConfirm({ source: "a", tool: "bash", reason: "2" });
		const h3 = beginConfirm({ source: "a", tool: "bash", reason: "3" });
		expect(new Set([h1, h2, h3]).size).toBe(3);
		expect(h2).toBeGreaterThan(h1);
		expect(h3).toBeGreaterThan(h2);
	});

	it("optional context is preserved", () => {
		const h = beginConfirm({
			source: "git-safety",
			tool: "bash",
			reason: "force push",
			context: { cwd: "/repo", branch: "main" },
		});
		const [entry] = getPendingConfirms();
		expect(entry.context).toEqual({ cwd: "/repo", branch: "main" });
		endConfirm(h);
	});
});
