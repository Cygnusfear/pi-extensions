import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Drop orphaned/displaced tool_result messages before provider conversion.
 *
 * After context_checkout or branch navigation, tool_results can be left on the
 * active branch without their originating tool_use (which lives on the old branch).
 * Anthropic also requires the tool_results run to directly follow the assistant
 * message that emitted the corresponding tool_use blocks. If a user/custom
 * message gets inserted between them, the entire run becomes invalid.
 *
 * This extension filters those invalid tool_results out before each LLM call
 * using the context event.
 */
export default function (pi: ExtensionAPI) {
	pi.on("context", (event) => {
		const filtered: typeof event.messages = [];

		for (let i = 0; i < event.messages.length; i++) {
			const msg = event.messages[i];
			if (msg.role !== "toolResult") {
				filtered.push(msg);
				continue;
			}

			const runStart = i;
			let runEnd = i;
			while (runEnd < event.messages.length && event.messages[runEnd].role === "toolResult") {
				runEnd += 1;
			}

			const preceding = runStart > 0 ? event.messages[runStart - 1] : undefined;
			const precedingToolCallIds = new Set<string>();

			if (preceding?.role === "assistant" && "content" in preceding && Array.isArray(preceding.content)) {
				for (const block of preceding.content as Array<{ type: string; id?: string }>) {
					if (block.type === "toolCall" && block.id) {
						precedingToolCallIds.add(block.id);
					}
				}
			}

			if (precedingToolCallIds.size > 0) {
				for (let j = runStart; j < runEnd; j++) {
					const toolResult = event.messages[j] as { toolCallId?: string } & (typeof event.messages)[number];
					if (!toolResult.toolCallId || precedingToolCallIds.has(toolResult.toolCallId)) {
						filtered.push(toolResult);
					}
				}
			}

			i = runEnd - 1;
		}

		if (filtered.length !== event.messages.length) {
			return { messages: filtered };
		}
	});
}
