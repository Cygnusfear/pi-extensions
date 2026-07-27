/**
 * Assistant-message observation: flag rate-limited models, heal on success.
 *
 * Extracted from the extension so the policy is unit-testable without a pi
 * runtime. The extension's message_end hook is a thin call into this module.
 */

import {
	checkModelHealth,
	classifyRateLimitError,
	markHealthy,
	markUnhealthy,
	type LivenessEntry,
} from "./router.js";

export interface AssistantMessageLike {
	role?: string;
	provider?: string;
	model?: string;
	stopReason?: string;
	errorMessage?: string;
}

export type ObserveAction = "flagged" | "healed" | "none";

export interface ObserveResult {
	action: ObserveAction;
	id?: string;
	entry?: LivenessEntry;
}

/**
 * Inspect one assistant message and update the liveness store:
 * - error matching rate-limit/quota patterns -> flag (escalating TTL)
 * - successful stop on a flagged model -> heal (the model provably works again)
 *
 * Aborted and error-stop messages never heal: they are not evidence of health.
 */
export function observeAssistantMessage(message: AssistantMessageLike): ObserveResult {
	if (message.role !== "assistant" || !message.provider || !message.model) return { action: "none" };
	const id = `${message.provider}/${message.model}`;

	if (message.stopReason === "error") {
		if (message.errorMessage && classifyRateLimitError(message.errorMessage)) {
			const entry = markUnhealthy({ id, reason: `rate_limited: ${message.errorMessage.slice(0, 120)}` });
			return { action: "flagged", id, entry };
		}
		return { action: "none" };
	}

	if (message.stopReason === "stop" || message.stopReason === "length" || message.stopReason === "toolUse") {
		if (!checkModelHealth(id).healthy) {
			markHealthy(id);
			return { action: "healed", id };
		}
	}

	return { action: "none" };
}
