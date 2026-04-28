import { RlmReturnSignal } from "./return-signal";
import type { RlmResult, RlmState } from "./types";

export function buildRlmReturn(state: RlmState) {
	return function rlmReturn(value: Record<string, unknown>): never {
		if (state.disposed) {
			state.debug.push("late rlm.return ignored after dispose");
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
		throw new RlmReturnSignal(cloned);
	};
}
