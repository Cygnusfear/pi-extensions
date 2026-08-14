/** Voice-mode toggle parsing — pure, unit-tested. Typed or SPOKEN (transcribed) messages feed the same matcher. */

export type VoiceToggleAction = "on" | "off" | "status";

/**
 * Normalize a whole hooman message for toggle matching: drop the bot mention,
 * lowercase, collapse whitespace, strip trailing sentence punctuation.
 */
function normalizeVoiceMessage(raw: string): string {
	return raw
		.replace(/@ramdock_bot\b/gi, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/[.!?,…\s]+$/g, "")
		.trim();
}

/**
 * Bounded discourse lead-ins people actually speak before the toggle phrase —
 * "All right, speak to me." / "Okay, text only." Natural prefixes are stripped
 * (max twice), then the exact-phrase contract still applies: "speak to me
 * please" is NOT a toggle. Longest-first ordering keeps "okay" from being
 * half-eaten by "ok" and "all right" from being shadowed by "right".
 */
const LEAD_INS = ["all right", "alright", "okay", "ok", "please", "right", "fine", "so", "now", "yes", "yeah", "well", "then"];

function stripLeadIns(text: string): string {
	let out = text;
	for (let i = 0; i < 2; i++) {
		const lead = LEAD_INS.find((l) => out === l || out.startsWith(l + " ") || out.startsWith(l + ", "));
		if (!lead) break;
		out = out.slice(lead.length).replace(/^[\s,]+/, "");
	}
	return out;
}

/**
 * Detect a voice-mode toggle in an inbound hooman message.
 * Accepts "/voice [on|off|status]" (bare "/voice" enables, mirroring /afk)
 * and the exact phrases "speak to me" (on) / "text only" (off) — including
 * when the hooman speaks them as a voice note and the bridge transcribes it.
 * Whole-message exact match only: "speak to me please" is not a toggle.
 */
export function parseVoiceToggle(raw: string): VoiceToggleAction | null {
	const text = stripLeadIns(normalizeVoiceMessage(raw));
	if (text.startsWith("/voice")) {
		const sub = text.slice("/voice".length).trim();
		if (sub === "on") return "on";
		if (sub === "off") return "off";
		if (sub === "status") return "status";
		return sub === "" ? "on" : null;
	}
	if (text === "speak to me") return "on";
	if (text === "text only") return "off";
	return null;
}
