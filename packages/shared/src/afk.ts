/**
 * The Hooman's AFK notice — the one fact shared between the process that owns the
 * flag and the extensions that display it.
 *
 * Why a file rather than the mesh: the flag lives in the BRIDGE process (Telegram's
 * /afk command), while the banner is rendered by pi's code-mode extension. Separate
 * processes, no shared memory, so the flag needs a published contract. The bridge's
 * own state.json is a 500KB+ private document — consumers must never parse it — so
 * the bridge mirrors just this one fact into a small file beside it.
 *
 * The bridge owns the write; everyone else reads. Missing, empty or corrupt reads
 * mean "not away": a display nicety must never break a tool call.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Beside the bridge's own state, so one directory holds the bridge's durable facts.
 *
 * PI_AFK_STATE_PATH overrides it for tests: writing the real file from a test would
 * toggle the Hooman's banner for real.
 */
export const AFK_STATE_PATH =
	process.env.PI_AFK_STATE_PATH?.trim() || join(homedir(), ".config", "mesh-telegram-bridge", "afk.json");

/** Shown to agents in code-mode output while the Hooman is away. */
export const AFK_CONTACT_BANNER =
	"📞 Please contact the Hooman over mesh.tell so they can receive your message on Telegram where they are available now";

export interface AfkState {
	on: boolean;
	/** The Hooman's own note for this absence (status line only). */
	message?: string;
	since?: number;
}

/** Read the published flag. Never throws: an unreadable flag reads as "not away". */
export function readAfkState(): AfkState {
	try {
		if (!existsSync(AFK_STATE_PATH)) return { on: false };
		const parsed: unknown = JSON.parse(readFileSync(AFK_STATE_PATH, "utf8"));
		if (!parsed || typeof parsed !== "object") return { on: false };
		const record = parsed as Record<string, unknown>;
		if (record.on !== true) return { on: false };
		return {
			on: true,
			...(typeof record.message === "string" ? { message: record.message } : {}),
			...(typeof record.since === "number" ? { since: record.since } : {}),
		};
	} catch {
		return { on: false };
	}
}

/** Publish the flag (bridge side). Atomic rename, never throws. */
export function writeAfkState(state: AfkState): void {
	try {
		mkdirSync(dirname(AFK_STATE_PATH), { recursive: true });
		const temporaryPath = `${AFK_STATE_PATH}.tmp.${process.pid}`;
		writeFileSync(temporaryPath, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
		renameSync(temporaryPath, AFK_STATE_PATH);
	} catch {}
}

/**
 * Append the contact banner to tool output while the Hooman is away.
 *
 * Bottom, not top: the banner is a standing reminder, and the output above it is
 * what the caller asked for. Reading the flag per call keeps a /afk toggle live
 * without any cross-process plumbing.
 */
export function withAfkContactBanner(text: string): string {
	if (!readAfkState().on) return text;
	return `${text}\n\n${AFK_CONTACT_BANNER}`;
}
