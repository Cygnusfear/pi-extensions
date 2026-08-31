import { describe, it, expect, beforeEach, mock } from "bun:test";
import { DEFAULT_GUARDED_CONFIRM_TIMEOUT_MS, runGuardedConfirm } from "./guarded-confirm.ts";
import { __resetForTests, pendingConfirmCount, getPendingConfirms } from "./pending-interactions.ts";

describe("runGuardedConfirm", () => {
	beforeEach(() => __resetForTests());

	it("returns approved=false (no throw) when confirmFn is absent", async () => {
		const result = await runGuardedConfirm(
			{},
			{ source: "git-safety", tool: "bash", reason: "force push", title: "t", body: "b" },
		);
		expect(result.approved).toBe(false);
		expect(pendingConfirmCount()).toBe(0); // never registered
	});

	it("registers a pending confirm WHILE the dialog is open and releases on resolve", async () => {
		let resolveConfirm!: (v: boolean) => void;
		const confirmFn = (_t: string, _b: string) => new Promise<boolean>((res) => {
			resolveConfirm = res;
		});

		const promise = runGuardedConfirm(
			{ confirmFn },
			{ source: "git-safety", tool: "bash", reason: "force push", title: "⚠️ Destructive git operation", body: "Allow?" },
		);

		// Microtask hop so beginConfirm runs
		await Promise.resolve();
		expect(pendingConfirmCount()).toBe(1);
		const [entry] = getPendingConfirms();
		expect(entry.source).toBe("git-safety");
		expect(entry.tool).toBe("bash");
		expect(entry.reason).toBe("force push");

		resolveConfirm(true);
		const result = await promise;
		expect(result.approved).toBe(true);
		expect(pendingConfirmCount()).toBe(0);
	});

	it("releases the pending confirm even when confirmFn rejects", async () => {
		const confirmFn = async () => {
			throw new Error("dialog crashed");
		};
		await expect(
			runGuardedConfirm(
				{ confirmFn },
				{ source: "git-safety", tool: "bash", reason: "force push", title: "t", body: "b" },
			),
		).rejects.toThrow("dialog crashed");
		expect(pendingConfirmCount()).toBe(0);
	});

	it("calls logFn with the ✅ Hooman approved message on approve", async () => {
		const logFn = mock();
		const confirmFn = async () => true;
		const result = await runGuardedConfirm(
			{ confirmFn, logFn },
			{ source: "git-safety", tool: "write", reason: "write to /repo/.git/config", title: "t", body: "b" },
		);
		expect(result.approved).toBe(true);
		expect(logFn).toHaveBeenCalledTimes(1);
		expect(logFn.mock.calls[0][0]).toBe(
			"✅ Hooman approved write to /repo/.git/config [OK]",
		);
	});

	it("does NOT call logFn when the hooman denies", async () => {
		const logFn = mock();
		const confirmFn = async () => false;
		const result = await runGuardedConfirm(
			{ confirmFn, logFn },
			{ source: "git-safety", tool: "bash", reason: "force push", title: "t", body: "b" },
		);
		expect(result.approved).toBe(false);
		expect(logFn).not.toHaveBeenCalled();
	});

	it("uses approvalSummary in the log when provided (registry reason unaffected)", async () => {
		const logFn = mock();
		const confirmFn = async () => true;
		await runGuardedConfirm(
			{ confirmFn, logFn },
			{
				source: "git-safety",
				tool: "applyPatch",
				reason: "applyPatch targets /repo/.git/config",
				approvalSummary: "applyPatch /repo/.git/config",
				title: "t",
				body: "b",
			},
		);
		expect(logFn.mock.calls[0][0]).toBe(
			"✅ Hooman approved applyPatch /repo/.git/config [OK]",
		);
	});

	it("passes the agent's title/body verbatim to confirmFn (no rewriting)", async () => {
		const confirmFn = mock(async () => true);
		await runGuardedConfirm(
			{ confirmFn },
			{
				source: "git-safety",
				tool: "bash",
				reason: "force push",
				title: "⚠️ Destructive git operation",
				body: "Force push detected.\n\nAllow?",
			},
		);
		expect(confirmFn).toHaveBeenCalledTimes(1);
		expect(confirmFn.mock.calls[0][0]).toBe("⚠️ Destructive git operation");
		expect(confirmFn.mock.calls[0][1]).toBe("Force push detected.\n\nAllow?");
		expect(confirmFn.mock.calls[0][2]?.timeout).toBe(DEFAULT_GUARDED_CONFIRM_TIMEOUT_MS);
	});

	it("passes operation signal and default timeout into the dialog", async () => {
		const ac = new AbortController();
		let seen: { signal?: AbortSignal; timeout?: number } | undefined;
		const { approved } = await runGuardedConfirm(
			{
				signal: ac.signal,
				confirmFn: async (_t, _b, opts) => { seen = opts; return true; },
			},
			{ source: "git-safety", tool: "bash", reason: "x", title: "t", body: "b" },
		);
		expect(approved).toBe(true);
		expect(seen?.signal).toBe(ac.signal);
		expect(seen?.timeout).toBe(DEFAULT_GUARDED_CONFIRM_TIMEOUT_MS);
	});

	it("timeoutMs override wins over the default", async () => {
		let seen: { signal?: AbortSignal; timeout?: number } | undefined;
		await runGuardedConfirm(
			{ confirmFn: async (_t, _b, opts) => { seen = opts; return false; } },
			{ source: "git-safety", tool: "bash", reason: "x", title: "t", body: "b", timeoutMs: 1234 },
		);
		expect(seen?.timeout).toBe(1234);
	});
});
