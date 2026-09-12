/**
 * Inbound-message format helpers.
 *
 * The senderLabel is appended at BOTH the top (as a header) and the bottom
 * (as an authoritative signature) of every rendered inbound message. Why
 * both: agents reading messages routinely focus on either end and miss the
 * other. Worse, agents constantly sign their outbound messages with a name
 * they THINK is theirs (often wrong), and receiving agents trust that
 * inline signature and search the mesh for the fake name — finding and
 * tell-spamming the wrong real peer. Defense: render the mesh-authoritative
 * sender label at the bottom too, so any agent that skims the end of a
 * message still attributes it correctly.
 *
 * The matching mitigation on the send side lives in @pi-extensions/default-prompt
 * (identity block re-anchored every turn).
 *
 * Each rendered message also carries the SEND time (unix ms -> ISO-8601 UTC).
 * Why: delivery order is not send order. A tell can be batched, preempt a
 * queue, or land from the durable mailbox after live mail, so a reader that
 * cannot see when a message was SENT cannot tell it is reading out of order.
 * A receive time would not do — by construction it is monotonic, so it would
 * hide exactly the inversion we want visible.
 */

export interface MeshIcons {
	tell: string;
	chat: string;
	ask: string;
	sep: string;
}

const SIGNATURE_HINT = "(mesh sender, authoritative)";

/**
 * Trailing `<sep> sent <ISO-8601 UTC>` fragment for a sender-stamped send time.
 *
 * Exported so every inbound surface renders the stamp identically — the tell
 * renderers here, plus the ambient-chat and queued-ask batch builders that
 * format their own entry lines.
 *
 * ISO-8601 UTC because the stamp must survive being written into a transcript:
 * it stays unambiguous across machines and does not decay the way a relative
 * age ("3m ago") would. A reader that wants the age computes it against the
 * current time it can already ask for.
 *
 * Returns "" for a missing or non-finite stamp so callers may append it
 * unconditionally instead of rendering "Invalid Date" into a transcript. A
 * peer on an older build, or a queue entry drained before the stamp existed,
 * simply renders without one.
 */
export function formatSentSuffix(sep: string, sentAt?: number): string {
	if (typeof sentAt !== "number" || !Number.isFinite(sentAt)) return "";
	return ` ${sep} sent ${new Date(sentAt).toISOString()}`;
}

export function formatInboundTellContent(
	icons: MeshIcons,
	senderLabel: string,
	payloadText: string,
	sentAt?: number,
): string {
	return `${icons.tell} ${icons.sep} ${senderLabel}${formatSentSuffix(icons.sep, sentAt)}\n${payloadText}\n\n— ${senderLabel} ${SIGNATURE_HINT}`;
}

export function formatInboundChatContent(
	icons: MeshIcons,
	channel: string,
	senderLabel: string,
	text: string,
	sentAt?: number,
): string {
	return `${icons.chat} ${icons.sep} #${channel} ${icons.sep} ${senderLabel}${formatSentSuffix(icons.sep, sentAt)}\n${text}\n\n— ${senderLabel} ${SIGNATURE_HINT}`;
}

export function formatInboundAskContent(
	icons: MeshIcons,
	senderLabel: string,
	payloadText: string,
	replyHint: string,
	sentAt?: number,
): string {
	return `${icons.ask} ${icons.sep} ${senderLabel} asks${formatSentSuffix(icons.sep, sentAt)}\n${payloadText}\n\n${replyHint}\n\n— ${senderLabel} ${SIGNATURE_HINT}`;
}

export interface PendingTell {
	senderLabel: string;
	payloadText: string;
	/** Sender-stamped send time (unix ms) — rendered so out-of-order arrival is visible. */
	sentAt?: number;
}

export function formatPendingTellsBatch(
	icons: MeshIcons,
	tells: PendingTell[],
): string {
	const header =
		tells.length === 1
			? "1 direct mesh-tell arrived while you were busy."
			: `${tells.length} direct mesh-tells arrived while you were busy.`;
	return [
		header,
		"These are direct messages targeted at this session — read, decide, act.",
		"",
		...tells.map(
			({ senderLabel, payloadText, sentAt }, idx) =>
				// Numbered entry. Top: tell icon + sender label + send time. Bottom:
				// the same label as a signature so agents who skim the end of each
				// entry still attribute it to the right peer.
				`${idx + 1}. ${icons.tell} ${icons.sep} ${senderLabel}${formatSentSuffix(icons.sep, sentAt)}:\n${payloadText}\n   — ${senderLabel} ${SIGNATURE_HINT}`,
		),
	].join("\n");
}

/**
 * The hibernation-seam drain (ADD-2). Mail that arrived while this session was
 * HIBERNATED, surfaced FIFO on revive BEFORE any live tell — so a message that
 * sat in the durable mailbox is never jumped by one that arrives live post-revive.
 */
export function formatReviveDrainBatch(
	icons: MeshIcons,
	tells: PendingTell[],
): string {
	const header =
		tells.length === 1
			? "1 direct mesh-tell arrived while you were HIBERNATED and is delivered now (on revive)."
			: `${tells.length} direct mesh-tells arrived while you were HIBERNATED and are delivered now (on revive), oldest first.`;
	return [
		header,
		"These waited in your durable mailbox while you were offline — read them in order, they precede anything that arrived live after you woke.",
		"",
		...tells.map(
			({ senderLabel, payloadText, sentAt }, idx) =>
				`${idx + 1}. ${icons.tell} ${icons.sep} ${senderLabel}${formatSentSuffix(icons.sep, sentAt)}:\n${payloadText}\n   — ${senderLabel} ${SIGNATURE_HINT}`,
		),
	].join("\n");
}