import { runRlm } from "./loop";
import type { RlmDeps, RlmHandle, RlmOptions, RlmResult } from "./types";

const activeCancels = new Set<(reason: Error) => void>();

function combineSignals(signals: AbortSignal[]): AbortSignal {
	const live = signals.filter(Boolean);
	if (live.length === 1) return live[0];
	return AbortSignal.any(live);
}

export function createRlmHandle(deps: RlmDeps, opts: RlmOptions, depth = 0): RlmHandle {
	const cancelController = new AbortController();
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	let settled = false;

	const cancel = (reason: Error) => {
		if (settled) return;
		if (timeoutHandle) clearTimeout(timeoutHandle);
		timeoutHandle = null;
		if (!cancelController.signal.aborted) cancelController.abort(reason);
	};

	const effectiveOpts: RlmOptions = {
		...opts,
		signal: opts.signal ? combineSignals([opts.signal, cancelController.signal]) : cancelController.signal,
	};

	const promise = runRlm(deps, effectiveOpts, depth)
		.catch((err) => {
			if (cancelController.signal.aborted && cancelController.signal.reason instanceof Error) {
				throw cancelController.signal.reason;
			}
			throw err;
		})
		.finally(() => {
			settled = true;
			if (timeoutHandle) clearTimeout(timeoutHandle);
			activeCancels.delete(cancel);
		});

	const handle: RlmHandle = {
		then(onfulfilled, onrejected) {
			return promise.then(onfulfilled, onrejected);
		},
		timeout(ms: number) {
			if (settled) return this;
			if (timeoutHandle) clearTimeout(timeoutHandle);
			timeoutHandle = setTimeout(() => cancel(new Error("rlm: timeout after " + ms + "ms")), ms);
			return this;
		},
		unsubscribe() {
			cancel(new Error("rlm: cancelled"));
		},
	};

	activeCancels.add(cancel);
	return handle as RlmHandle<RlmResult>;
}

export function cancelAllRlmHandles(reason: Error): void {
	for (const cancel of [...activeCancels]) cancel(reason);
}
