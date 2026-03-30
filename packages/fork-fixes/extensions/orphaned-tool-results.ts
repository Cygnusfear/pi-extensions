import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Drop orphaned tool_result messages whose tool_use is not present on the active branch.
 *
 * After context_checkout or branch navigation, tool_results can be left on the
 * active branch without their originating tool_use (which lives on the old branch).
 * Providers reject these as protocol violations. This extension filters them out
 * before each LLM call using the context event.
 */
export default function (pi: ExtensionAPI) {
	pi.on("context", (event) => {
		const knownToolCallIds = new Set<string>();

		// First pass: collect all tool call IDs from assistant messages
		for (const msg of event.messages) {
			if (msg.role !== "assistant" || !("content" in msg) || !msg.content) continue;
			for (const block of msg.content as Array<{ type: string; id?: string }>) {
				if (block.type === "toolCall" && block.id) {
					knownToolCallIds.add(block.id);
				}
			}
		}

		// Second pass: drop tool results whose tool call is missing
		const filtered = event.messages.filter((msg) => {
			if (msg.role !== "toolResult") return true;
			const toolCallId = (msg as { toolCallId?: string }).toolCallId;
			if (!toolCallId) return true;
			return knownToolCallIds.has(toolCallId);
		});

		if (filtered.length !== event.messages.length) {
			return { messages: filtered };
		}
	});
}
