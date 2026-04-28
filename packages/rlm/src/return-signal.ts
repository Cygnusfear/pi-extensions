import type { RlmResult } from "./types";

export const RLM_RETURN_TAG = Symbol.for("rlm.returnSignal");

export class RlmReturnSignal extends Error {
	readonly [RLM_RETURN_TAG] = true;
	constructor(public readonly value: RlmResult) {
		super("rlm.return signal");
	}
}

export function isRlmReturnSignal(e: unknown): e is RlmReturnSignal {
	return !!(e && typeof e === "object" && (e as any)[RLM_RETURN_TAG] === true);
}
