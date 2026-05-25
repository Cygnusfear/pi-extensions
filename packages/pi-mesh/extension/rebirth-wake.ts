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
 */

import { MESH_REBIRTH_TYPE } from "./mesh-constants.ts";

export interface RebirthMarker {
	fromSession: string;
	transferedAt: string;
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
 * Prefixed with the parent session id (short form) so the agent has an
 * explicit pointer for searching session history (ouija) if the TPV
 * leaves anything ambiguous.
 */
export function buildRebirthWakeMessage(marker: RebirthMarker | null): {
	customType: string;
	content: string;
	display: boolean;
} {
	const parentShort = marker ? marker.fromSession.slice(0, 8) : "(unknown)";
	const transferedAt = marker ? marker.transferedAt : "(unknown)";
	const content = [
		"# 🔄 You have just been REBIRTHED",
		"",
		`A previous instance of you (running on the same mesh identity) ran \`/rebirth\` at ${transferedAt} to compact this session. They synthesized a Total Perspective Vortex (TPV) handoff and started this new session for you. Parent session: \`${parentShort}\`.`,
		"",
		"**Your TPV is the `rebirth-handoff` custom_message entry in your session history above.** It contains everything your previous self learned, decided, and planned. Read it carefully before doing anything else.",
		"",
		"## What to do RIGHT NOW",
		"",
		"1. Read your TPV (the `rebirth-handoff` message in your context).",
		"2. Identify: what task were you in the middle of? What were the open questions? What was the next step?",
		`3. Check the mesh for context: \`mesh()\` for peers, \`ouija({ action: "view", session: "${parentShort}" })\` to skim the last entries of the parent session, \`mai ls\` for tickets, recent commits, etc.`,
		"4. THEN continue the work, or if you're stuck, ask the hooman with a clear \"I just rebirthed — here's where I am, here's what I think the next step is, [OK]?\".",
		"",
		"Do NOT pretend you remember things you don't. Your only memory is the TPV — everything else is gone. Be honest about what you can and can't see.",
		"",
		"— pi-mesh rebirth wake",
	].join("\n");

	return {
		customType: "mesh-rebirth-wake",
		content,
		display: true,
	};
}
