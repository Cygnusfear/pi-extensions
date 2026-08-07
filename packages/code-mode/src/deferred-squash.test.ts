import { describe, expect, test } from "bun:test";
import {
	awaitDeferredSquash,
	buildSquashContinuation,
	type DeferredSquashOptions,
	type DeferredSquashReadiness,
	HANDOFF_COMPACTION_CONTINUATION,
	NON_INTERACTIVE_COMPACTION_CONTINUATION,
	POST_COMPACTION_CONTEXT_CHECK,
	type SquashMode,
} from "./deferred-squash.ts";

function withPostCompactionContextCheck(text: string): string {
	return `${text}\n\n${POST_COMPACTION_CONTEXT_CHECK}`;
}

function controlledCompact(
	mode: SquashMode,
	readiness: DeferredSquashReadiness = { canCompact: true },
) {
	let callbacks:
		| { onComplete?: () => void; onError?: (error: Error) => void }
		| undefined;
	let compactCalls = 0;
	return {
		ctx: {
			mode,
			getCompactionReadiness: () => readiness,
			compact(options: typeof callbacks) {
				compactCalls++;
				callbacks = options;
			},
		},
		compactCalls: () => compactCalls,
		complete: () => callbacks?.onComplete?.(),
		fail: (error: Error) => callbacks?.onError?.(error),
	};
}

describe("awaitDeferredSquash", () => {
	test("skips known non-ready branches without invoking compaction or sending a continuation", async () => {
		for (const reason of [
			"too-small",
			"already-compacted",
			"session-needs-migration",
		] as const) {
			const compact = controlledCompact("print", { canCompact: false, reason });
			const sent: string[] = [];
			await expect(
				awaitDeferredSquash(compact.ctx, { continue: "resume" }, (text) =>
					sent.push(text),
				),
			).resolves.toEqual({
				status: "skipped",
				reason,
			});
			expect(compact.compactCalls()).toBe(0);
			expect(sent).toEqual([]);
		}
	});

	test("does not resolve settlement before callback-based compaction completes", async () => {
		const compact = controlledCompact("print");
		let resolved = false;
		const promise = awaitDeferredSquash(compact.ctx, {}, () => {}).then(
			(result) => {
				resolved = true;
				return result;
			},
		);
		await Bun.sleep(5);
		expect(resolved).toBe(false);
		compact.complete();
		expect(await promise).toEqual({ status: "compacted" });
		expect(resolved).toBe(true);
	});

	test("does not resolve settlement until the continuation turn completes", async () => {
		const compact = controlledCompact("print");
		let releaseContinuation = () => {};
		const continuationReleased = new Promise<void>((resolve) => {
			releaseContinuation = resolve;
		});
		let resolved = false;
		const promise = awaitDeferredSquash(compact.ctx, {}, async () => {
			await continuationReleased;
		}).then(() => {
			resolved = true;
		});

		compact.complete();
		await Bun.sleep(5);
		expect(resolved).toBe(false);
		releaseContinuation();
		await promise;
		expect(resolved).toBe(true);
	});

	test("print/json modes automatically continue after no-argument session.squash()", async () => {
		for (const mode of ["print", "json"] as const) {
			const compact = controlledCompact(mode);
			const sent: string[] = [];
			const promise = awaitDeferredSquash(compact.ctx, {}, (text) =>
				sent.push(text),
			);
			compact.complete();
			await promise;
			expect(sent).toEqual([
				withPostCompactionContextCheck(NON_INTERACTIVE_COMPACTION_CONTINUATION),
			]);
		}
	});

	test("interactive mode preserves existing no-argument behavior (no automatic prompt)", async () => {
		const compact = controlledCompact("tui");
		const sent: string[] = [];
		const promise = awaitDeferredSquash(compact.ctx, {}, (text) =>
			sent.push(text),
		);
		compact.complete();
		await promise;
		expect(sent).toEqual([]);
	});

	test("explicit continuation is delivered in every mode", async () => {
		for (const mode of ["tui", "rpc", "print", "json"] as const) {
			const compact = controlledCompact(mode);
			const sent: string[] = [];
			const promise = awaitDeferredSquash(
				compact.ctx,
				{ continue: "Resume P5 from $.ctx." },
				(text) => sent.push(text),
			);
			compact.complete();
			await promise;
			expect(sent).toEqual([
				withPostCompactionContextCheck("Resume P5 from $.ctx."),
			]);
		}
	});

	test("generated handoff precedes a verbatim user continuation", async () => {
		const compact = controlledCompact("tui");
		const sent: string[] = [];
		const userContinue = "Resume the migration; do not alter this text.";
		const promise = awaitDeferredSquash(
			compact.ctx,
			{
				continue: userContinue,
				handoff: {
					text: "AUTHORITATIVE HANDOFF\nnext: migrate",
					source: "ctx",
				},
			},
			(text) => sent.push(text),
		);
		compact.complete();
		await promise;
		expect(sent).toEqual([
			withPostCompactionContextCheck(
				"[SQUASH HANDOFF — READ BEFORE ACTING]\n" +
					"AUTHORITATIVE HANDOFF\nnext: migrate\n" +
					"[/SQUASH HANDOFF]\n\n" +
					"[USER CONTINUE]\n" +
					userContinue +
					"\n[/USER CONTINUE]",
			),
		]);
	});

	test("handoff delivers exactly once for omitted, empty, whitespace, and nonempty continuations in every mode", async () => {
		const cases: Array<{
			name: string;
			continue?: string;
			label: "AUTO CONTINUATION" | "USER CONTINUE";
			text: string;
		}> = [
			{
				name: "omitted",
				label: "AUTO CONTINUATION",
				text: HANDOFF_COMPACTION_CONTINUATION,
			},
			{ name: "empty", continue: "", label: "USER CONTINUE", text: "" },
			{
				name: "whitespace",
				continue: "   ",
				label: "USER CONTINUE",
				text: "   ",
			},
			{
				name: "nonempty",
				continue: "Resume the migration.",
				label: "USER CONTINUE",
				text: "Resume the migration.",
			},
		];

		for (const mode of ["tui", "rpc", "print", "json"] as const) {
			for (const testCase of cases) {
				const compact = controlledCompact(mode);
				const sent: string[] = [];
				const options: DeferredSquashOptions = {
					handoff: { text: "handoff", source: "explicit" },
				};
				if (testCase.continue !== undefined)
					options.continue = testCase.continue;
				const promise = awaitDeferredSquash(compact.ctx, options, (text) =>
					sent.push(text),
				);
				compact.complete();
				await promise;
				expect(sent).toEqual([
					withPostCompactionContextCheck(
						"[SQUASH HANDOFF — READ BEFORE ACTING]\n" +
							"handoff\n" +
							"[/SQUASH HANDOFF]\n\n" +
							`[${testCase.label}]\n` +
							testCase.text +
							`\n[/${testCase.label}]`,
					),
				]);
			}
		}
	});

	test("no-handoff behavior remains unchanged across interactive modes", () => {
		expect(buildSquashContinuation("tui", {})).toBeUndefined();
		expect(buildSquashContinuation("rpc", {})).toBeUndefined();
		expect(buildSquashContinuation("print", {})).toBe(
			withPostCompactionContextCheck(NON_INTERACTIVE_COMPACTION_CONTINUATION),
		);
	});

	test("compaction callback errors reject instead of disappearing", async () => {
		const compact = controlledCompact("print");
		const promise = awaitDeferredSquash(compact.ctx, {}, () => {});
		compact.fail(new Error("compact failed"));
		await expect(promise).rejects.toThrow("compact failed");
	});

	test("synchronous compact failures reject", async () => {
		await expect(
			awaitDeferredSquash(
				{
					mode: "print",
					getCompactionReadiness: () => ({ canCompact: true }),
					compact() {
						throw new Error("sync failure");
					},
				},
				{},
				() => {},
			),
		).rejects.toThrow("sync failure");
	});
});
