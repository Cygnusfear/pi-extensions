import { combineSignals } from "./combine-signals";
import { DEFAULT_TIMEOUT_MS } from "./constants";
import { runRlmWithMonitor } from "./loop";
import { RlmProgressMonitor, resolveRlmIdentity } from "./progress";
import type { RlmDeps, RlmEventCallback, RlmEventType, RlmHandle, RlmOptions, RlmResult } from "./types";

const activeCancels = new Set<(reason: Error) => void>();

export function createRlmHandle(deps: RlmDeps, opts: RlmOptions, depth = 0): RlmHandle {
	const cancelController = new AbortController();
	const monitor = new RlmProgressMonitor(resolveRlmIdentity(opts.identity));
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	let settled = false;

	const cancel = (reason: Error) => {
		if (settled) return;
		if (timeoutHandle) clearTimeout(timeoutHandle);
		timeoutHandle = null;
		if (!cancelController.signal.aborted) cancelController.abort(reason);
		monitor.settle(reason.message.startsWith("rlm: timeout") ? "timeout" : "cancelled", reason.message);
	};

	const effectiveOpts: RlmOptions = {
		...opts,
		signal: opts.signal ? combineSignals([opts.signal, cancelController.signal]) : cancelController.signal,
	};

	const promise = Promise.resolve()
		.then(() => runRlmWithMonitor(deps, effectiveOpts, depth, monitor))
		.then((result) => {
			monitor.settle("resolved");
			return result;
		})
		.catch((err) => {
			if (cancelController.signal.aborted && cancelController.signal.reason instanceof Error) {
				throw cancelController.signal.reason;
			}
			monitor.settle("failed", err instanceof Error ? err.message : String(err));
			throw err;
		})
		.finally(() => {
			settled = true;
			if (timeoutHandle) clearTimeout(timeoutHandle);
			activeCancels.delete(cancel);
		});

	// Mark the internal promise as observed immediately. Callers can still await the
	// handle and receive the original rejection, but fire-and-cancel patterns do not
	// crash the host with an unhandled rejection before the next block can inspect it.
	void promise.catch(() => {});

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
		inspect() {
			return monitor.inspect();
		},
		on(type: RlmEventType, callback: RlmEventCallback) {
			monitor.on(type, callback);
			return this;
		},
		unsubscribe() {
			cancel(new Error("rlm: cancelled"));
		},
	};

	timeoutHandle = setTimeout(() => cancel(new Error("rlm: timeout after " + DEFAULT_TIMEOUT_MS + "ms")), DEFAULT_TIMEOUT_MS);
	activeCancels.add(cancel);
	return handle as RlmHandle<RlmResult>;
}

export function cancelAllRlmHandles(reason: Error): void {
	for (const cancel of [...activeCancels]) cancel(reason);
}
