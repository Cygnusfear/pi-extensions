import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MESH_REBIRTH_TYPE } from "./mesh-constants.ts";

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
 * are substituted at render time. The file is mtime-cached so dev edits
 * pick up on the next call without a restart.
 */

export interface RebirthMarker {
	fromSession: string;
	transferedAt: string;
}

const promptPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"prompts",
	"rebirth-wake.md",
);

let cached: { mtime: number; content: string } | null = null;

/**
 * Load the rebirth wake prompt template from disk with mtime-based caching.
 * Falls back to a minimal hard-coded message if the file is missing or
 * unreadable — never throws (this runs inside a critical session_start
 * path and must not crash the extension).
 */
function loadPromptTemplate(): string {
	try {
		const stat = fs.statSync(promptPath);
		if (cached && cached.mtime === stat.mtimeMs) return cached.content;
		const content = fs.readFileSync(promptPath, "utf-8");
		cached = { mtime: stat.mtimeMs, content };
		return content;
	} catch {
		// Hard fallback so a missing/broken prompt file does not break rebirth.
		return [
			"# You have just been REBIRTHED",
			"",
			"Your previous self rebirthed this session at {{transferedAt}} (parent: {{parentShort}}).",
			"Read the `rebirth-handoff` message in your session history before doing anything else.",
		].join("\n");
	}
}

/**
 * Reload the prompt cache from disk (test/dev helper).
 */
export function reloadRebirthPromptCache(): void {
	cached = null;
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
	const parentShort = marker ? marker.fromSession.slice(0, 8) : "(unknown)";
	const transferedAt = marker ? marker.transferedAt : "(unknown)";
	const template = loadPromptTemplate();
	const content = template
		.replace(/\{\{parentShort\}\}/g, parentShort)
		.replace(/\{\{transferedAt\}\}/g, transferedAt);
	return {
		customType: "mesh-rebirth-wake",
		content,
		display: true,
	};
}
