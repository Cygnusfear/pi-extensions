import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Expose pi's reload as both a slash command and a tool.
 *
 * Requires pi-coding-agent ≥ <version-with-pi.reload()>. The host runtime
 * exposes `pi.reload()` on the ExtensionAPI, routing to the same
 * AgentSession.reload() the built-in /reload slash command uses.
 *
 * Two surfaces:
 *   - /reload-runtime  — slash command for direct hooman invocation. Uses
 *     ctx.reload() from ExtensionCommandContext (the historical path).
 *   - reload_runtime   — tool the LLM can call after editing extension
 *     code. Calls pi.reload() directly. The await resolves only after the
 *     reload has fully run, so the next agent turn sees the new code.
 *
 * History:
 *   - v1 used pi.sendUserMessage("/reload", ...) which silently never
 *     fired (sendUserMessage hardcodes expandPromptTemplates=false, so
 *     the slash dispatcher never saw the text).
 *   - v2 used ctx.reload() from tool execute(). Failed at runtime —
 *     tools receive ExtensionContext, not ExtensionCommandContext.
 *   - v3 abandoned trying to reload from a tool and pinged the hooman
 *     via desktop notification asking them to /reload. Honest but dumb —
 *     reload should reload, not pester.
 *   - v4 (this) waits for pi-coding-agent to expose pi.reload() on the
 *     base ExtensionAPI and calls it directly. The tool finally does
 *     what its name says.
 */
export default function (pi: ExtensionAPI) {
	// ── /reload-runtime ── synonym for built-in /reload (slash command path).
	pi.registerCommand("reload-runtime", {
		description: "Reload extensions, skills, prompts, themes, and keybindings.",
		handler: async (_args, ctx) => {
			if (ctx.hasUI) ctx.ui.notify("Reloading…", "info");
			await ctx.reload();
		},
	});

	// ── reload_runtime tool ── calls pi.reload() directly. Requires host
	// support (pi-coding-agent ≥ the version that added pi.reload()).
	pi.registerTool({
		name: "reload_runtime",
		label: "Reload Runtime",
		description:
			"Reload extensions, skills, prompts, themes, and keybindings. " +
			"Use after editing extension code to pick up changes without restarting pi. " +
			"The await resolves only after the reload has finished; the next agent turn sees the new code.",
		parameters: Type.Object({}),
		async execute() {
			if (typeof (pi as { reload?: () => Promise<void> }).reload !== "function") {
				return {
					content: [
						{
							type: "text",
							text:
								"reload_runtime: this pi-coding-agent build does not expose pi.reload() on ExtensionAPI. " +
								"Upgrade pi-coding-agent, or type /reload (built-in) or /reload-runtime (this extension) yourself.",
						},
					],
					isError: true,
				};
			}
			await pi.reload();
			return {
				content: [
					{
						type: "text",
						text: "✅ Reloaded extensions, skills, prompts, themes, and keybindings.",
					},
				],
			};
		},
	});
}
