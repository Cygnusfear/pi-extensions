import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Expose pi's restart as both a slash command and a tool.
 *
 * The heavier sibling of /reload (see packages/reload). reload() re-reads
 * extensions/skills/prompts IN-PROCESS — the same Node process keeps running,
 * so module-level caches survive. restart() re-execs pi as a FRESH process
 * resuming the current session, clearing memoized state a reload cannot:
 * stale package-export maps, cached code-mode tool bindings, and anything
 * else pinned at module load. Use it when a reload isn't enough, or for a
 * clean-process smoke test.
 *
 * Requires pi-coding-agent to expose restart() on ExtensionAPI (pi.restart())
 * and ExtensionCommandContext (ctx.restart()), analogous to reload(). Until a
 * build ships that primitive, BOTH surfaces degrade gracefully rather than
 * throw — the tool returns an isError explanation, the slash command notifies.
 * This mirrors how packages/reload was written before the host exposed
 * pi.reload().
 *
 * Two surfaces:
 *   - /restart-runtime — slash command for direct hooman invocation. Uses
 *     ctx.restart() from ExtensionCommandContext.
 *   - restart_runtime  — tool the LLM can call when an in-process reload is
 *     insufficient. Calls pi.restart() directly. Because restart re-execs the
 *     process, a successful call typically does not return — the process is
 *     replaced and the session resumes fresh.
 */
export default function (pi: ExtensionAPI) {
	// ── /restart-runtime ── full process restart, resuming the current session.
	pi.registerCommand("restart-runtime", {
		description:
			"Restart pi as a fresh process, resuming the current session. Heavier than /reload — clears module caches an in-process reload can't.",
		handler: async (_args, ctx) => {
			const restart = (ctx as { restart?: () => Promise<void> }).restart;
			if (typeof restart !== "function") {
				if (ctx.hasUI) {
					ctx.ui.notify(
						"restart-runtime: this pi-coding-agent build does not expose ctx.restart(). Upgrade pi-coding-agent to a build that adds restart().",
						"error",
					);
				}
				return;
			}
			if (ctx.hasUI) ctx.ui.notify("Restarting…", "info");
			await restart();
		},
	});

	// ── restart_runtime tool ── calls pi.restart() directly. Requires host
	// support (pi-coding-agent that exposes restart() on ExtensionAPI).
	pi.registerTool({
		name: "restart_runtime",
		label: "Restart Runtime",
		description:
			"Restart pi as a fresh process, resuming the current session. " +
			"Heavier than reload_runtime: use when an in-process reload is not enough — " +
			"e.g. a host/runtime change, a stale module-export map, or memoized tool bindings " +
			"that only a full process restart clears. The current session resumes automatically.",
		parameters: Type.Object({}),
		async execute() {
			if (typeof (pi as { restart?: () => Promise<void> }).restart !== "function") {
				return {
					content: [
						{
							type: "text",
							text:
								"restart_runtime: this pi-coding-agent build does not expose pi.restart() on ExtensionAPI. " +
								"Upgrade pi-coding-agent to a build that adds restart(), or restart pi manually.",
						},
					],
					isError: true,
				};
			}
			await pi.restart();
			// restart() re-execs the process, so this is typically unreachable —
			// returned only if a host implementation resolves without replacing
			// the process.
			return {
				content: [
					{
						type: "text",
						text: "✅ Restarting pi — fresh process, resuming this session…",
					},
				],
			};
		},
	});
}
