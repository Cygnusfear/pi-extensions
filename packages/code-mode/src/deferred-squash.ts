export type SquashMode = "tui" | "rpc" | "json" | "print";

/** Maximum UTF-8 size of a model-visible, generated squash handoff. */
export const SQUASH_HANDOFF_MAX_BYTES = 16 * 1024;

/**
 * A frozen, intentional narrative snapshot carried across a compaction boundary.
 * `source` is diagnostic only: it never changes how the model sees `text`.
 */
export interface SquashHandoff {
	readonly text: string;
	readonly source: "explicit" | "ctx";
}

export interface DeferredSquashOptions {
	continue?: string;
	handoff?: SquashHandoff;
}

/** Structural mirror of the staged host extension API. */
export type DeferredSquashReadiness =
	| { canCompact: true }
	| {
			canCompact: false;
			reason: "already-compacted" | "too-small" | "session-needs-migration";
	  };

export type DeferredSquashResult =
	| { status: "compacted" }
	| {
			status: "skipped";
			reason: Exclude<DeferredSquashReadiness, { canCompact: true }>["reason"];
	  };

export interface DeferredSquashContext {
	mode: SquashMode;
	getCompactionReadiness(): DeferredSquashReadiness;
	compact(options: {
		onComplete?: () => void;
		onError?: (error: Error) => void;
	}): void;
}

export const NON_INTERACTIVE_COMPACTION_CONTINUATION =
	"Compaction complete. Continue the current task from the compacted context.";

export const HANDOFF_COMPACTION_CONTINUATION =
	"Compaction complete. Read the generated squash handoff before acting, then continue the current task.";

/** Delivered only when a compaction already has a continuation; it never creates an extra model turn. */
export const POST_COMPACTION_CONTEXT_CHECK =
	"[CONTEXT CHECK REQUIRED]\nRun `session.tokens()` now. Context usage can change after compaction or a model switch; never act on an earlier percentage.\n[/CONTEXT CHECK REQUIRED]";

function appendPostCompactionContextCheck(
	continuation: string | undefined,
): string | undefined {
	return continuation
		? [continuation, "", POST_COMPACTION_CONTEXT_CHECK].join("\n")
		: undefined;
}

/**
 * Build the exact post-compaction follow-up message.
 *
 * A continuation supplied by the caller is preserved verbatim in its own
 * section. A frozen handoff is placed before it so the resumed agent reads
 * authoritative state before interpreting the request. Existing no-handoff
 * behaviour remains byte-for-byte unchanged.
 */
export function buildSquashContinuation(
	mode: SquashMode,
	options: DeferredSquashOptions,
): string | undefined {
	if (options.handoff) {
		// `undefined` means no user instruction was supplied. An explicit empty
		// string is still user intent and must not make the frozen handoff invisible.
		const hasUserContinuation = options.continue !== undefined;
		const continuation = hasUserContinuation
			? options.continue
			: HANDOFF_COMPACTION_CONTINUATION;
		const continuationLabel = hasUserContinuation
			? "USER CONTINUE"
			: "AUTO CONTINUATION";
		return appendPostCompactionContextCheck(
			[
				"[SQUASH HANDOFF — READ BEFORE ACTING]",
				options.handoff.text,
				"[/SQUASH HANDOFF]",
				"",
				`[${continuationLabel}]`,
				continuation,
				`[/${continuationLabel}]`,
			].join("\n"),
		);
	}

	const continuation =
		options.continue ??
		(mode === "print" || mode === "json"
			? NON_INTERACTIVE_COMPACTION_CONTINUATION
			: undefined);
	// Preserve historical no-handoff semantics, including an explicit empty string.
	return appendPostCompactionContextCheck(continuation || undefined);
}

/**
 * Await a session.squash() through the callback-only ExtensionContext API.
 *
 * This must run from agent_settled, after the active run is idle. Running it
 * from agent_end deadlocks because AgentSession.compact() waits for that same
 * active run to end. Awaiting it at settlement also keeps print/json mode alive
 * until compaction is written. When a handoff is present, every mode gets an
 * automatic continuation so the preserved state is not silently invisible.
 */
export async function awaitDeferredSquash(
	ctx: DeferredSquashContext,
	options: DeferredSquashOptions,
	sendContinuation: (text: string) => Promise<void> | void,
): Promise<DeferredSquashResult> {
	const readiness = ctx.getCompactionReadiness();
	if (!readiness.canCompact) {
		return { status: "skipped", reason: readiness.reason };
	}

	const continuation = buildSquashContinuation(ctx.mode, options);

	return new Promise<DeferredSquashResult>((resolve, reject) => {
		let settled = false;
		const resolveOnce = (result: DeferredSquashResult) => {
			if (settled) return;
			settled = true;
			resolve(result);
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
							resolveOnce({ status: "compacted" });
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
