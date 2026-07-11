import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/** Custom entry the restart_runtime TOOL appends right before re-exec, marking an
 *  AGENT-triggered restart. The human /restart-runtime command does NOT append it,
 *  so the marker cleanly separates "the agent restarted itself" (resume with a
 *  turn) from "a human restarted it" (resume idle). */
const RESTART_RESUME_TURN_TYPE = "restart-resume-turn";

/** Appended once the resume-turn has fired, so a later /reload or restart of the
 *  same session does not re-fire it. Order vs the marker gives once-only semantics. */
const RESTART_RESUME_CONSUMED_TYPE = "restart-resume-consumed";

/** True when the session carries an UNCONSUMED agent-restart marker — this session
 *  just resumed from a restart_runtime call and the agent should get a turn to
 *  continue. Order-based: the last marker sits after the last consumed entry. */
function hasUnconsumedRestartMarker(entries: Array<{ customType?: string }>): boolean {
	let lastMarker = -1;
	let lastConsumed = -1;
	entries.forEach((e, i) => {
		if (e.customType === RESTART_RESUME_TURN_TYPE) lastMarker = i;
		else if (e.customType === RESTART_RESUME_CONSUMED_TYPE) lastConsumed = i;
	});
	return lastMarker > lastConsumed;
}

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
	// Agent-triggered restart (restart_runtime tool) resumes with a turn so the
	// agent continues its work instead of coming back idle. On session_start, if
	// this session carries an unconsumed restart marker, consume it and fire a
	// hidden triggerTurn continuation. Mirrors pi-mesh's rebirth-wake.
	pi.on("session_start", (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		if (!hasUnconsumedRestartMarker(entries)) return;
		pi.appendEntry(RESTART_RESUME_CONSUMED_TYPE, { at: Date.now() });
		pi.sendMessage(
			{
				customType: "restart-resume",
				content:
					"[restart] This session just resumed after your restart_runtime call. Your full context is intact — continue what you were doing before the restart.",
				display: false,
			},
			{ deliverAs: "followUp", triggerTurn: true },
		);
	});

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
			// Mark this restart as agent-triggered so the resumed process fires a
			// continuation turn (see the session_start handler above). Appended
			// BEFORE the re-exec so it persists in the session file.
			pi.appendEntry(RESTART_RESUME_TURN_TYPE, { at: Date.now() });
			await pi.restart();
			// On a current host, pi.restart() DEFERS the re-exec to the end of this
			// turn (a mid-turn restart cannot re-exec while streaming), so this line
			// runs: the process re-execs once the turn settles, then resumes and
			// fires a continuation turn from the marker above.
			return {
				content: [
					{
						type: "text",
						text: "Restart queued — pi will re-exec when this turn finishes, then resume and continue.",
					},
				],
			};
		},
	});
}
