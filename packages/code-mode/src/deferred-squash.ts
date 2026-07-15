export type SquashMode = "tui" | "rpc" | "json" | "print";

export interface DeferredSquashOptions {
	continue?: string;
}

export interface DeferredSquashContext {
	mode: SquashMode;
	compact(options: {
		onComplete?: () => void;
		onError?: (error: Error) => void;
	}): void;
}

export const NON_INTERACTIVE_COMPACTION_CONTINUATION =
	"Compaction complete. Continue the current task from the compacted context.";

/**
 * Await a session.squash() through the callback-only ExtensionContext API.
 *
 * This must run from agent_settled, after the active run is idle. Running it
 * from agent_end deadlocks because AgentSession.compact() waits for that same
 * active run to end. Awaiting it at settlement also keeps print/json mode alive
 * until compaction is written. Non-interactive modes need an automatic
 * continuation because there is no human prompt after compaction; otherwise
 * the correctly-compacted one-shot process simply exits.
 */
export async function awaitDeferredSquash(
	ctx: DeferredSquashContext,
	options: DeferredSquashOptions,
	sendContinuation: (text: string) => Promise<void> | void,
): Promise<void> {
	const continuation =
		options.continue ??
		(ctx.mode === "print" || ctx.mode === "json"
			? NON_INTERACTIVE_COMPACTION_CONTINUATION
			: undefined);

	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const resolveOnce = () => {
			if (settled) return;
			settled = true;
			resolve();
		};
		const rejectOnce = (error: unknown) => {
			if (settled) return;
			settled = true;
			reject(error instanceof Error ? error : new Error(String(error)));
		};

		try {
			ctx.compact({
				onComplete: () => {
					void (async () => {
						try {
							if (continuation) await sendContinuation(continuation);
							resolveOnce();
						} catch (error) {
							rejectOnce(error);
						}
					})();
				},
				onError: rejectOnce,
			});
		} catch (error) {
			rejectOnce(error);
		}
	});
}
