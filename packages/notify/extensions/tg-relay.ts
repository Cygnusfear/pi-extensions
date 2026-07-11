/**
 * Relay notify() pings to the Hooman's Telegram.
 *
 * Composes a concise line from the notify parts and hands it to relayToHooman()
 * (in @pi-extensions/shared) which sends it over the agent's live mesh
 * connection to the Hooman's Telegram topic. Fire-and-forget; never throws.
 */
import { relayToHooman } from "../../shared/src/relay-to-hooman.ts";
import type { NotifyParts } from "../../shared/src/desktop-notify.ts";

/**
 * Compose the TG-facing text from notify parts. Drops the title — the bridge
 * already labels the message with the sending agent's nickname, so echoing the
 * title (which defaults to the same short name) would duplicate it.
 */
function composeText({ subtitle, body }: NotifyParts): string {
	const sub = (subtitle ?? "").trim();
	const bod = (body ?? "").trim();
	if (sub && bod) return "🔔 " + sub + ": " + bod;
	if (bod) return "🔔 " + bod;
	if (sub) return "🔔 " + sub;
	return "";
}

/** Relay a notify() ping to the Hooman's Telegram. Returns true when handed to the mesh. */
export function relayNotifyToHooman(parts: NotifyParts): boolean {
	return relayToHooman(composeText(parts));
}
