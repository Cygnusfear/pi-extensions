import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Expose pi's built-in /reload as an LLM-callable tool.
 *
 * pi already ships a built-in /reload slash command that reloads extensions,
 * skills, prompts, and themes. This package wraps that command in a
 * `reload_runtime` tool so agents can trigger it after editing extension
 * code mid-session — no manual /reload required.
 *
 * The tool queues "/reload" as a follow-up user message; the interactive
 * mode's slash-command dispatcher handles the actual reload after the
 * current turn completes.
 */
export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "reload_runtime",
		label: "Reload Runtime",
		description:
			"Reload extensions, skills, prompts, and themes. Use after editing extension code to pick up changes without restarting pi.",
		parameters: Type.Object({}),
		async execute() {
			pi.sendUserMessage("/reload", { deliverAs: "followUp" });
			return {
				content: [
					{
						type: "text",
						text: "Queued /reload — extensions, skills, prompts, and themes will reload after this turn.",
					},
				],
			};
		},
	});
}
