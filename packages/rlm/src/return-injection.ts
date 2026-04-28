import type { RlmResult, RlmState } from "./types";

export function buildRlmReturn(state: RlmState) {
	return function rlmReturn(value: Record<string, unknown>): never {
		if (state.disposed) {
			return undefined as never;
		}
		if (state.resolved) throw new Error("rlm: already returned");

		let cloned: RlmResult;
		try {
			const json = JSON.stringify(value);
			if (json === undefined) throw new TypeError("JSON.stringify returned undefined");
			cloned = JSON.parse(json) as RlmResult;
		} catch (e) {
			throw new Error("rlm.return: value must be JSON-serializable", { cause: e as Error });
		}

		state.value = cloned;
		state.resolved = true;
		state.onReturn?.();

		// Historically this threw RlmReturnSignal for control flow. That breaks when
		// callers put rlm.return() inside an unawaited async function: the thrown
		// signal becomes an unhandled promise rejection. State + onReturn now carry
		// the terminal signal, so rlm.return() can be safe in both awaited and
		// fire-and-forget async shapes.
		return undefined as never;
	};
}
