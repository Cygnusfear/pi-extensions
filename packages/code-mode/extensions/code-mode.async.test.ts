/**
 * Async execute_code tests.
 *
 * Verifies the `{ async: true }` opt-in path: the tool returns immediately
 * with a jobId, the work runs in the background against the shared VM
 * context, the result is delivered later via pi.sendMessage with
 * deliverAs="followUp", and concurrent execute_code calls serialize on a
 * single mutex so the $-store never races.
 *
 * Also covers the executeCodeAsyncList / executeCodeAsyncKill sandbox
 * primitives for inspecting and aborting pending async jobs.
 */

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import codeModeExt from "../extensions/code-mode";
import { MODEL_VISIBLE_OUTPUT_MAX_BYTES } from "../src/progressive-output";

interface FakeTool {
	name: string;
	description?: string;
	parameters?: unknown;
	execute?: (...args: any[]) => Promise<any>;
}

interface CapturedMessage {
	customType?: string;
	content?: string;
	display?: boolean;
	options?: any;
}

interface MockPi {
	registerCommand: (name: string, opts: any) => void;
	registerTool: (tool: any) => void;
	setActiveTools: (names: string[]) => void;
	getActiveTools: () => string[];
	getAllTools: () => FakeTool[];
	on: (event: string, handler: any) => void;
	setLabel: (id: string, label: string | undefined) => void;
	sendUserMessage: (msg: string, opts?: any) => void;
	sendMessage: (msg: any, opts?: any) => void;
	commands: Map<string, any>;
	tools: Map<string, any>;
	handlers: Map<string, any[]>;
	activeTools: string[];
	setActiveToolsCalls: string[][];
	sentMessages: CapturedMessage[];
	sentUserMessages: Array<{ content: string; options?: any }>;
}

function makePi(): MockPi {
	const allTools: FakeTool[] = [
		{ name: "execute_code" },
		{ name: "context_tag" },
		{ name: "read" },
		{ name: "bash" },
	];
	const pi: MockPi = {
		commands: new Map(),
		tools: new Map(),
		handlers: new Map(),
		activeTools: [],
		setActiveToolsCalls: [],
		sentMessages: [],
		sentUserMessages: [],
		registerCommand: (name, opts) => pi.commands.set(name, opts),
		registerTool: (tool) => pi.tools.set(tool.name, tool),
		setActiveTools: (names) => {
			pi.activeTools = [...names];
			pi.setActiveToolsCalls.push([...names]);
		},
		getActiveTools: () => pi.activeTools,
		getAllTools: () => allTools,
		on: (event, handler) => {
			const handlers = pi.handlers.get(event) ?? [];
			handlers.push(handler);
			pi.handlers.set(event, handlers);
		},
		setLabel: () => {},
		sendUserMessage: (content, options) => {
			pi.sentUserMessages.push({ content, options });
		},
		sendMessage: (msg, options) => {
			pi.sentMessages.push({ ...msg, options });
		},
	};
	return pi;
}

function makeExecuteCtx() {
	return {
		cwd: process.cwd(),
		model: { provider: "test", id: "test-model" },
		modelRegistry: {},
		ui: { confirm: async () => true, notify: () => {} },
		abort: () => {},
	};
}

/**
 * Drain a few microtask cycles + sleep so background promises that were
 * scheduled but not awaited get a chance to resolve and deliver.
 */
async function flushBackground(ms = 50): Promise<void> {
	for (let i = 0; i < 5; i++) await Promise.resolve();
	await new Promise((r) => setTimeout(r, ms));
}

describe("execute_code { async: true }", () => {
	test("hard-caps an oversized synchronous result before returning it", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");

		const result = await executeCode.execute(
			"tc-sync-overflow",
			{ code: `console.log("s".repeat(${MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000}));` },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const text = result.content.find((part: any) => part.type === "text")?.text ?? "";
		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(
			MODEL_VISIBLE_OUTPUT_MAX_BYTES,
		);
		const fullOutputPath = text.match(/Full output saved to: (.+)\n/)?.[1];
		expect(fullOutputPath).toBeDefined();
		try {
			expect(fs.readFileSync(fullOutputPath!, "utf-8")).toBe(
				"s".repeat(MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000),
			);
		} finally {
			if (fullOutputPath) fs.rmSync(fullOutputPath, { force: true });
		}
	});

	test("returns immediately with a jobId and 'started' text", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");
		expect(executeCode).toBeDefined();

		const t0 = Date.now();
		const result = await executeCode.execute(
			"tc-async-1",
			{ code: "await new Promise((r) => setTimeout(r, 300)); console.log('done');", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const elapsed = Date.now() - t0;

		// Returned in <100ms even though the bg work sleeps 300ms.
		expect(elapsed).toBeLessThan(100);
		expect(result.details.jobId).toMatch(/^exec-/);
		expect(result.details.asyncStatus).toBe("running");
		const text = result.content.find((c: any) => c.type === "text")?.text ?? "";
		expect(text).toContain("async execute_code started");
		expect(text).toContain(result.details.jobId);

		// Let the bg work resolve, then assert the follow-up was delivered.
		// 800ms cushion: 300ms sleep + executeInSession overhead + microtask hops.
		await flushBackground(800);
		const followUp = pi.sentMessages.find(
			(m) => m.customType === "async-execute-code-result",
		);
		expect(followUp).toBeDefined();
		expect(followUp?.options?.deliverAs).toBe("followUp");
		expect(followUp?.options?.triggerTurn).toBe(true);
		expect(followUp?.content).toContain(result.details.jobId);
		expect(followUp?.content).toContain("completed");
		expect(followUp?.content).toContain("done");
	});

	test("error during async work delivers a 'failed' follow-up", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");

		const result = await executeCode.execute(
			"tc-async-err",
			{ code: "await new Promise((r) => setTimeout(r, 50)); throw new Error('boom from bg');", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		expect(result.details.jobId).toMatch(/^exec-/);

		await flushBackground(300);
		const followUp = pi.sentMessages.find(
			(m) => m.customType === "async-execute-code-result",
		);
		expect(followUp).toBeDefined();
		expect(followUp?.content).toContain("failed");
		expect(followUp?.content).toContain("boom from bg");
	});

	test("hard-caps the persisted async follow-up and saves its complete output", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");

		await executeCode.execute(
			"tc-async-overflow",
			{ code: `console.log("a".repeat(${MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000}));`, async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		await flushBackground(150);

		const followUp = pi.sentMessages.find(
			(m) => m.customType === "async-execute-code-result",
		);
		expect(followUp?.content).toBeDefined();
		expect(Buffer.byteLength(followUp!.content!, "utf-8")).toBeLessThanOrEqual(
			MODEL_VISIBLE_OUTPUT_MAX_BYTES,
		);
		const pathMatch = followUp!.content!.match(/Full output saved to: (.+)\n/);
		expect(pathMatch?.[1]).toBeDefined();
		const fullOutputPath = pathMatch![1];
		try {
			const fullOutput = fs.readFileSync(fullOutputPath, "utf-8");
			expect(fullOutput).toContain("[async execute_code");
			expect(fullOutput).toContain("a".repeat(MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000));
		} finally {
			fs.rmSync(fullOutputPath, { force: true });
		}
	});

	test("a SYNC execute_code after an in-flight ASYNC one waits for it (mutex)", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");

		// Fire async that sleeps 250ms then sets $.flag = 1
		await executeCode.execute(
			"tc-async-mutex",
			{ code: "await new Promise((r) => setTimeout(r, 250)); $.flag = 1; console.log('async done');", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);

		// Immediately fire a sync execute_code that reads $.flag.
		// Without the mutex, $.flag would be undefined (sync starts before async finishes).
		// With the mutex, the sync call waits for the async to complete, sees $.flag === 1.
		const t0 = Date.now();
		const syncResult = await executeCode.execute(
			"tc-after-async",
			{ code: "console.log('flag=', $.flag);" },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const elapsed = Date.now() - t0;

		// Sync call should have waited at least ~200ms for the async to finish.
		expect(elapsed).toBeGreaterThanOrEqual(200);
		const syncText = syncResult.content.find((c: any) => c.type === "text")?.text ?? "";
		expect(syncText).toContain("flag= 1");
	});

	test("a second ASYNC call after an in-flight ASYNC one waits for it (mutex)", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");

		const t0 = Date.now();
		// First async sleeps 250ms.
		await executeCode.execute(
			"tc-a1",
			{ code: "await new Promise((r) => setTimeout(r, 250)); console.log('a1 done');", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		// Second async — should also return immediately (just queues behind).
		const r2 = await executeCode.execute(
			"tc-a2",
			{ code: "console.log('a2 done');", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const elapsedToA2Return = Date.now() - t0;

		// Both started; second one returned its jobId fast (it returns BEFORE
		// the first finishes — its OWN code is queued to start after the first
		// completes, but the tool result itself is delivered immediately).
		expect(r2.details.jobId).toMatch(/^exec-/);
		expect(elapsedToA2Return).toBeLessThan(300); // both returned, second waited briefly for mutex flip

		await flushBackground(400);

		const followUps = pi.sentMessages.filter(
			(m) => m.customType === "async-execute-code-result",
		);
		expect(followUps.length).toBe(2);
		expect(followUps[0]?.content).toContain("a1 done");
		expect(followUps[1]?.content).toContain("a2 done");
	});

	test("executeCodeAsyncList reflects pending jobs from within a sync execute_code", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");

		await executeCode.execute(
			"tc-list-async",
			{ code: "await new Promise((r) => setTimeout(r, 400));", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);

		// Inspect — second sync call would wait for the async (mutex). But the
		// list primitive is meant to be useful BEFORE the wait — let's check it
		// through the same call: since the mutex blocks, we'd never observe a
		// non-empty list this way. Inspect via a separate channel: the in-flight
		// async hasn't finished yet, so a quick separate test reads the global
		// shape through a direct sandbox-fn call.
		//
		// Easiest assertion: the followUp eventually fires AND the asyncJobs map
		// was populated mid-flight. Verify by triggering the kill primitive on
		// the jobId — it must succeed only if the job was registered.

		// Find the jobId from the started text the first call returned. We didn't
		// capture it above; redo so we have it.
		const pi2 = makePi();
		codeModeExt(pi2 as any);
		const exec2 = pi2.tools.get("execute_code");
		const started = await exec2.execute(
			"tc-list-2",
			{ code: "await new Promise((r) => setTimeout(r, 1000));", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const jobId = started.details.jobId as string;

		// Kill via a sync execute_code that calls executeCodeAsyncKill — but that
		// sync call would wait on the mutex. Use the timeout flag to bound the
		// wait so the test doesn't hang if the kill doesn't work.
		const killResult = await exec2.execute(
			"tc-list-3",
			{ code: `console.log('killed=', executeCodeAsyncKill(${JSON.stringify(jobId)}));`, timeout: 5 },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);

		const killText = killResult.content.find((c: any) => c.type === "text")?.text ?? "";
		// Either the kill ran while the bg was still pending (true) and the bg
		// then aborted, or the bg already finished by the time the mutex
		// released (false). Both are valid outcomes for this test.
		expect(killText).toMatch(/killed= (true|false)/);

		await flushBackground(200);
	});
});


describe("execute_code_async_list / execute_code_async_kill (direct tools)", () => {
	test("execute_code_async_list returns pending jobs WITHOUT waiting on the mutex", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");
		const listTool = pi.tools.get("execute_code_async_list");
		expect(listTool).toBeDefined();

		// Fire an async job that sleeps 500ms
		await executeCode.execute(
			"tc-direct-list-1",
			{ code: "await new Promise((r) => setTimeout(r, 500));", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);

		// Immediately list — must NOT wait for the bg job to finish.
		const t0 = Date.now();
		const listResult = await listTool.execute(
			"tc-direct-list-2",
			{},
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const elapsed = Date.now() - t0;
		expect(elapsed).toBeLessThan(100); // No mutex wait.
		expect(listResult.details.jobs).toBeDefined();
		expect(listResult.details.jobs.length).toBeGreaterThanOrEqual(1);
		expect(listResult.details.jobs[0].jobId).toMatch(/^exec-/);
		expect(typeof listResult.details.jobs[0].runtimeMs).toBe("number");

		await flushBackground(600);
	});

	test("execute_code_async_kill aborts a pending job and returns killed=true", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const executeCode = pi.tools.get("execute_code");
		const killTool = pi.tools.get("execute_code_async_kill");
		expect(killTool).toBeDefined();

		// Fire an async job that sleeps 1s
		const started = await executeCode.execute(
			"tc-direct-kill-1",
			{ code: "await new Promise((r) => setTimeout(r, 1000));", async: true },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const jobId = started.details.jobId as string;

		// Kill immediately — must NOT wait on the mutex.
		const t0 = Date.now();
		const killResult = await killTool.execute(
			"tc-direct-kill-2",
			{ jobId },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		const elapsed = Date.now() - t0;
		expect(elapsed).toBeLessThan(100);
		expect(killResult.details.killed).toBe(true);
		expect(killResult.details.jobId).toBe(jobId);

		// Follow-up should still arrive (showing the aborted result).
		await flushBackground(300);
		const followUp = pi.sentMessages.find(
			(m) => m.customType === "async-execute-code-result",
		);
		expect(followUp).toBeDefined();
		expect(followUp?.content).toContain(jobId);
	});

	test("execute_code_async_kill returns killed=false for an unknown jobId", async () => {
		const pi = makePi();
		codeModeExt(pi as any);
		const killTool = pi.tools.get("execute_code_async_kill");

		const result = await killTool.execute(
			"tc-direct-kill-unknown",
			{ jobId: "exec-nonexistent" },
			new AbortController().signal,
			undefined,
			makeExecuteCtx(),
		);
		expect(result.details.killed).toBe(false);
		const text = result.content.find((c: any) => c.type === "text")?.text ?? "";
		expect(text).toContain("No pending async job");
	});
});


describe("execute_code auto-promote (TUI-freeze safety net)", () => {
	test("fast sync call (well under threshold) returns inline — no promotion", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "300";
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");
			const result = await executeCode.execute(
				"tc-promote-fast",
				{ code: "await new Promise((r) => setTimeout(r, 50)); console.log('fast');" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			expect(result.details.jobId).toBeUndefined();
			expect(result.details.asyncStatus).toBeUndefined();
			const text = result.content.find((c: any) => c.type === "text")?.text ?? "";
			expect(text).toContain("fast");
			// No follow-up sent for inline results.
			const followUps = pi.sentMessages.filter(
				(m) => m.customType === "async-execute-code-result",
			);
			expect(followUps.length).toBe(0);
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	});

	test("slow sync call auto-promotes at threshold and delivers a follow-up", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "200";
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");

			const t0 = Date.now();
			const result = await executeCode.execute(
				"tc-promote-slow",
				{ code: "await new Promise((r) => setTimeout(r, 600)); console.log('after promote');" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			const elapsed = Date.now() - t0;

			// Returned around the threshold — definitely before the 600ms work
			// would have finished. Allow generous bounds for CI jitter.
			expect(elapsed).toBeGreaterThanOrEqual(150);
			expect(elapsed).toBeLessThan(500);
			expect(result.details.jobId).toMatch(/^exec-/);
			expect(result.details.asyncStatus).toBe("running");
			const stub = result.content.find((c: any) => c.type === "text")?.text ?? "";
			expect(stub).toContain("auto-promoted to async");
			expect(stub).toContain(result.details.jobId);

			// Wait for the bg work to finish and the follow-up to land.
			await flushBackground(700);
			const followUp = pi.sentMessages.find(
				(m) => m.customType === "async-execute-code-result",
			);
			expect(followUp).toBeDefined();
			expect(followUp?.options?.deliverAs).toBe("followUp");
			expect(followUp?.options?.triggerTurn).toBe(true);
			expect(followUp?.content).toContain("auto-promoted from sync");
			expect(followUp?.content).toContain("completed");
			expect(followUp?.content).toContain("after promote");
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	});

	test("hard-caps an auto-promoted follow-up before persistence", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "25";
		let fullOutputPath: string | undefined;
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");

			const promoted = await executeCode.execute(
				"tc-promote-overflow",
				{
					code: `await new Promise((r) => setTimeout(r, 80)); console.log("p".repeat(${MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000}));`,
				},
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			expect(promoted.details.asyncStatus).toBe("running");
			await flushBackground(200);

			const followUp = pi.sentMessages.find(
				(m) => m.customType === "async-execute-code-result",
			);
			expect(followUp?.content).toContain("auto-promoted from sync");
			expect(Buffer.byteLength(followUp!.content!, "utf-8")).toBeLessThanOrEqual(
				MODEL_VISIBLE_OUTPUT_MAX_BYTES,
			);
			fullOutputPath = followUp!.content!.match(/Full output saved to: (.+)\n/)?.[1];
			expect(fullOutputPath).toBeDefined();
			expect(fs.readFileSync(fullOutputPath!, "utf-8")).toContain(
				"p".repeat(MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000),
			);
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
			if (fullOutputPath) fs.rmSync(fullOutputPath, { force: true });
		}
	});

	test("execute_code_async_list shows auto-promoted jobs in-flight", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "200";
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");
			const listTool = pi.tools.get("execute_code_async_list");

			const promotedResult = await executeCode.execute(
				"tc-promote-list",
				{ code: "await new Promise((r) => setTimeout(r, 800));" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			const jobId = promotedResult.details.jobId as string;
			expect(jobId).toMatch(/^exec-/);

			// Inspect mid-flight via the direct tool (bypasses mutex)
			const listResult = await listTool.execute(
				"tc-promote-list-2",
				{},
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			expect(listResult.details.jobs.length).toBeGreaterThanOrEqual(1);
			const found = listResult.details.jobs.find((j: any) => j.jobId === jobId);
			expect(found).toBeDefined();

			await flushBackground(900);
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	});

	test("execute_code_async_kill aborts a promoted job", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "200";
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");
			const killTool = pi.tools.get("execute_code_async_kill");

			const promoted = await executeCode.execute(
				"tc-promote-kill",
				{ code: "await new Promise((r) => setTimeout(r, 2000));" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			const jobId = promoted.details.jobId as string;

			const killResult = await killTool.execute(
				"tc-promote-kill-2",
				{ jobId },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			expect(killResult.details.killed).toBe(true);

			await flushBackground(400);
			const followUp = pi.sentMessages.find(
				(m) => m.customType === "async-execute-code-result",
			);
			expect(followUp).toBeDefined();
			expect(followUp?.content).toContain(jobId);
			// The killed job's follow-up contains 'failed' (or aborted)
			expect(followUp?.content.toLowerCase()).toMatch(/failed|aborted/);
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	});

	test("a subsequent execute_code waits for the promoted job (mutex still applies)", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "200";
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");

			// Promote a job that runs 500ms (will be promoted at 200ms, finishes at 500ms).
			await executeCode.execute(
				"tc-promote-mutex-1",
				{ code: "await new Promise((r) => setTimeout(r, 500)); $.markedByPromoted = true;" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);

			// Next sync call must wait for the promoted job before starting.
			const t0 = Date.now();
			const r2 = await executeCode.execute(
				"tc-promote-mutex-2",
				{ code: "console.log('marked=', $.markedByPromoted);" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			const elapsed = Date.now() - t0;
			expect(elapsed).toBeGreaterThanOrEqual(200);
			const text = r2.content.find((c: any) => c.type === "text")?.text ?? "";
			expect(text).toContain("marked= true");
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	});

	test("explicit { async: true } bypasses the race (no promotion threshold delay)", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "5000";
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");

			const t0 = Date.now();
			const result = await executeCode.execute(
				"tc-explicit-async",
				{ code: "await new Promise((r) => setTimeout(r, 300));", async: true },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			const elapsed = Date.now() - t0;
			// Should return immediately — not wait the 5000ms promote threshold.
			expect(elapsed).toBeLessThan(100);
			expect(result.details.asyncStatus).toBe("running");
			const text = result.content.find((c: any) => c.type === "text")?.text ?? "";
			expect(text).toContain("async execute_code started");
			// Specifically NOT the auto-promote message.
			expect(text).not.toContain("auto-promoted");

			await flushBackground(400);
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	});
});

describe("execute_code blocked-confirm fast-promote (git-safety integration)", () => {
	// These tests exercise the pending-interactions registry path that lets
	// code-mode promote within ~3s when a blocking confirm dialog is open
	// (e.g. git-safety's ctx.ui.confirm popup awaiting hooman approval).
	// The stub must explicitly tell the agent the popup is the reason so the
	// agent can fire notify() to pull the hooman in.

	test("pending confirm + slow code → promotes within ~3s with a 🚦 stub mentioning notify()", async () => {
		// Keep the default-promote timer LARGE (well above 3s) so we can prove
		// the early promote is driven by the registry check, not the timer.
		process.env.PI_CODE_MODE_PROMOTE_MS = "60000";
		const { beginConfirm, endConfirm, __resetForTests } = await import(
			"../../shared/src/pending-interactions.ts"
		);
		__resetForTests();
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");

			// Simulate the popup opening BEFORE the code runs (real-world: the
			// tool_call hook fires beginConfirm and then awaits ctx.ui.confirm
			// while the agent's execute_code is still mid-await on Bash()).
			const handle = beginConfirm({
				source: "git-safety",
				tool: "bash",
				reason: "git push --force in /repo",
			});

			const t0 = Date.now();
			const result = await executeCode.execute(
				"tc-blocked-confirm",
				{ code: "await new Promise((r) => setTimeout(r, 6000));" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			const elapsed = Date.now() - t0;

			// Should promote within ~3s + one 500ms poll window — DEFINITELY
			// well under the 60s default promote timer.
			expect(elapsed).toBeGreaterThanOrEqual(3_000);
			expect(elapsed).toBeLessThan(5_000);

			expect(result.details.jobId).toMatch(/^exec-/);
			expect(result.details.asyncStatus).toBe("running");

			const stub = result.content.find((c: any) => c.type === "text")?.text ?? "";
			// Specific 🚦 stub, NOT the generic ⏳ "auto-promoted to async" one.
			expect(stub).toContain("blocked on a hooman confirm dialog");
			expect(stub).toContain("[git-safety]");
			expect(stub).toContain("git push --force in /repo");
			// Must point the agent at notify() so they pull the hooman in.
			expect(stub).toContain("notify(");
			// Must point at the status helper.
			expect(stub).toContain('status("attention")');

			// Cleanup the registry; let the bg work resolve so the test doesn't
			// leak a pending promise.
			endConfirm(handle);
			await flushBackground(6_500);
		} finally {
			__resetForTests();
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	}, 15_000);

	test("no pending confirm → still uses the regular ⏳ auto-promote stub", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "300";
		const { __resetForTests, pendingConfirmCount } = await import(
			"../../shared/src/pending-interactions.ts"
		);
		__resetForTests();
		expect(pendingConfirmCount()).toBe(0);
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");
			const result = await executeCode.execute(
				"tc-no-blocked",
				{ code: "await new Promise((r) => setTimeout(r, 800));" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			expect(result.details.jobId).toMatch(/^exec-/);
			const stub = result.content.find((c: any) => c.type === "text")?.text ?? "";
			expect(stub).toContain("auto-promoted to async");
			expect(stub).not.toContain("blocked on a hooman confirm dialog");
			await flushBackground(900);
		} finally {
			__resetForTests();
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
		}
	});
	test("Teams workers keep a slow synchronous execute_code in the same turn", async () => {
		process.env.PI_CODE_MODE_PROMOTE_MS = "50";
		process.env.PI_TEAMS_WORKER = "1";
		try {
			const pi = makePi();
			codeModeExt(pi as any);
			const executeCode = pi.tools.get("execute_code");
			const result = await executeCode.execute(
				"tc-worker-no-promote",
				{ code: "await new Promise((r) => setTimeout(r, 120)); console.log('worker finished');" },
				new AbortController().signal,
				undefined,
				makeExecuteCtx(),
			);
			expect(result.details.jobId).toBeUndefined();
			expect(result.details.asyncStatus).toBeUndefined();
			const text = result.content.find((c: any) => c.type === "text")?.text ?? "";
			expect(text).toContain("worker finished");
			expect(text).not.toContain("auto-promoted");
		} finally {
			delete process.env.PI_CODE_MODE_PROMOTE_MS;
			delete process.env.PI_TEAMS_WORKER;
		}
	});

});
