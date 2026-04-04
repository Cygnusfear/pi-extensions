import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("reload-runtime", {
		description: "Reload extensions, skills, prompts, and themes",
		handler: async (_args, ctx) => {
			await ctx.reload();
		},
	});

	pi.registerTool({
		name: "reload_runtime",
		label: "Reload Runtime",
		description: "Reload extensions, skills, prompts, and themes. Use after editing extension code to pick up changes without restarting.",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			if (typeof (ctx as { reload?: unknown }).reload === "function") {
				await (ctx as { reload: () => Promise<void> }).reload();
				return {
					content: [{ type: "text", text: "Reloaded extensions, skills, prompts, and themes." }],
				};
			}

			pi.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
			return {
				content: [{ type: "text", text: "Queued /reload-runtime — extensions will reload after this turn." }],
			};
		},
	});
}
