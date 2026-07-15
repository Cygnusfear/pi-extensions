import { describe, expect, test } from "bun:test";
import {
	awaitDeferredSquash,
	NON_INTERACTIVE_COMPACTION_CONTINUATION,
	type SquashMode,
} from "./deferred-squash.ts";

function controlledCompact(mode: SquashMode) {
	let callbacks:
		| { onComplete?: () => void; onError?: (error: Error) => void }
		| undefined;
	return {
		ctx: {
			mode,
			compact(options: typeof callbacks) {
				callbacks = options;
			},
		},
		complete: () => callbacks?.onComplete?.(),
		fail: (error: Error) => callbacks?.onError?.(error),
	};
}

describe("awaitDeferredSquash", () => {
	test("does not resolve settlement before callback-based compaction completes", async () => {
		const compact = controlledCompact("print");
		let resolved = false;
		const promise = awaitDeferredSquash(compact.ctx, {}, () => {}).then(() => {
			resolved = true;
		});
		await Bun.sleep(5);
		expect(resolved).toBe(false);
		compact.complete();
		await promise;
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
			expect(sent).toEqual([NON_INTERACTIVE_COMPACTION_CONTINUATION]);
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
		const compact = controlledCompact("tui");
		const sent: string[] = [];
		const promise = awaitDeferredSquash(
			compact.ctx,
			{ continue: "Resume P5 from $.ctx." },
			(text) => sent.push(text),
		);
		compact.complete();
		await promise;
		expect(sent).toEqual(["Resume P5 from $.ctx."]);
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
