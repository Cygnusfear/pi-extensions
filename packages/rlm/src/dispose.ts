import type { RlmState } from "./types";

export function disposeSub(state: RlmState): void {
	if (state.disposed) return;
	state.disposed = true;
	state.disposeAbort.abort();
	if (state.timeoutHandle) clearTimeout(state.timeoutHandle);
	state.timeoutHandle = null;
}
