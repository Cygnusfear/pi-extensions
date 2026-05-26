import { loadSharedPrompt } from "../../shared/src/shared-prompts.ts";
import { MESH_REBIRTH_TYPE } from "./mesh-constants.ts";
import { loadPrompt, reloadPromptCache } from "./prompt-loader.ts";

/**
 * Rebirth wake — surfaces a one-shot system message that nudges a freshly
 * rebirthed agent to read their TPV and orient themselves before doing
 * anything else.
 *
 * Lifecycle: when a session is rebirthed via /rebirth, the previous self
 * synthesized a Total Perspective Vortex (TPV) handoff and stashed it as a
 * `rebirth-handoff` custom_message entry in the new session's history. The
 * new agent boots cold — they SEE the TPV in context but nothing actively
 * tells them they were just rebirthed or that they MUST read it before
 * continuing. Result: agents commonly start a fresh turn without
 * orientation and burn context re-discovering state their previous self
 * already wrote down.
 *
 * Fix: detect rebirth at session_start (reason="new" AND mesh_rebirth
 * marker present) and send a triggerTurn message that wakes the agent
 * with explicit orientation instructions.
 *
 * Prompt content lives in `packages/pi-mesh/prompts/rebirth-wake.md` so
 * the agent-facing UX surface is editable by non-coders without touching
 * TypeScript. Template tokens `{{parentShort}}` and `{{transferedAt}}`
 * are substituted at render time via the shared prompt-loader.
 */

export interface RebirthMarker {
	fromSession: string;
	transferedAt: string;
}

const REBIRTH_WAKE_FALLBACK = [
	"# You have just been REBIRTHED",
	"",
	"Your previous self rebirthed this session at {{transferedAt}} (parent: {{parentShort}}).",
	"Read the `rebirth-handoff` message in your session history before doing anything else.",
].join("\n");

/**
 * Test helper: flush the shared prompt cache so dev edits to the .md
 * file pick up on the next call without a restart.
 *
 * Re-exported from prompt-loader so callers that already imported this
 * module don't have to know about the shared loader. Cache is shared
 * across all loaded prompts — calling this flushes ALL of them.
 */
export function reloadRebirthPromptCache(): void {
	reloadPromptCache();
}

/**
 * Extract the rebirth marker from a session context. Returns the marker
 * data if the session was created via /rebirth, or null otherwise.
 *
 * Returns the LAST marker found if multiple exist (defensive — there
 * should only ever be one but session corruption could double up).
 */
export function extractRebirthMarker(ctx: {
	sessionManager: {
		getEntries: () => Array<{ type: string; customType?: string; data?: unknown }>;
	};
}): RebirthMarker | null {
	let latest: RebirthMarker | null = null;
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === MESH_REBIRTH_TYPE && entry.data) {
			const data = entry.data as Partial<RebirthMarker>;
			if (typeof data.fromSession === "string" && typeof data.transferedAt === "string") {
				latest = { fromSession: data.fromSession, transferedAt: data.transferedAt };
			}
		}
	}
	return latest;
}

/**
 * Build the wake-up message body shown to a freshly rebirthed agent. The
 * message is sent with triggerTurn=true so the agent ACTUALLY responds
 * to it — without that, the agent would sit idle with the TPV in context
 * but no impetus to read it.
 *
 * Loads the markdown template from disk and substitutes `{{parentShort}}`
 * and `{{transferedAt}}` tokens. Prefixed with the parent session id
 * (short form) so the agent has an explicit pointer for searching session
 * history (ouija) if the TPV leaves anything ambiguous.
 */
export function buildRebirthWakeMessage(marker: RebirthMarker | null): {
	customType: string;
	content: string;
	display: boolean;
} {
	const tokens = {
		parentShort: marker ? marker.fromSession.slice(0, 8) : "(unknown)",
		transferedAt: marker ? marker.transferedAt : "(unknown)",
	};
	const content = loadPrompt("rebirth-wake", tokens, REBIRTH_WAKE_FALLBACK);
	return {
		customType: "mesh-rebirth-wake",
		content,
		display: true,
	};
}

/**
 * Build the steering message that the /rebirth command sends to the
 * agent in the OUTGOING session. Tells them to write a TPV and call
 * rebirth().
 *
 * Loads from `prompts/rebirth-command.md` with `{{sessionId}}` and
 * `{{cwd}}` token substitution.
 */
export function buildRebirthCommandPrompt(opts: { sessionId: string; cwd: string }): string {
	const fallback = [
		"REBIRTH — Write a TPV handoff into `$.tpv` and call `rebirth({ tpv: $.tpv })` to be reborn into a fresh session.",
		"",
		"Session ID: {{sessionId}}",
		"CWD: {{cwd}}",
	].join("\n");
	// Pull the canonical TPV checklist from @pi-extensions/shared so the rebirth
	// command and the always-on system prompt show the same fields. Single
	// source of truth — edit once, both surfaces update. Empty fallback so
	// rebirth still works when shared is unavailable (the steering body is
	// still useful without the checklist).
	const tpvChecklist = loadSharedPrompt("tpv-checklist", "");
	return loadPrompt(
		"rebirth-command",
		{
			sessionId: opts.sessionId,
			cwd: opts.cwd,
			tpvChecklist,
		},
		fallback,
	);
}
