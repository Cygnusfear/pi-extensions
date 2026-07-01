import { canonicalTellReceiptPhase, isSurfacedReceiptRequested } from "./active-inbound-mailbox.ts";
import type { MeshTellPreemptLevel, MeshTellReceiptPhase, MeshTellReceiptWaitForPhase } from "./types.ts";

/**
 * What the receiver does with an inbound direct tell, decided purely from
 * (deafen state, preempt level, busy state, requested ack phase). Extracted as
 * a pure function so the branchy routing is unit-tested instead of buried in
 * the extension closure — the closure just executes the returned plan.
 */
export type InboundTellAction =
	| "drop-deafened" // /mesh deafen on — drop, report receiverDeafened
	| "preempt-abort" // NUCLEAR — abort in-flight op, then deliver + wake
	| "preempt-steer" // soft — land at next reasoning boundary
	| "queue" // busy + normal tell — park until agent_end flush
	| "surface"; // idle + normal tell — surface now

export interface InboundTellPlan {
	action: InboundTellAction;
	/** Phase to ack with (only sent when the sender requested a receipt). */
	ackPhase: MeshTellReceiptPhase;
	/** Mark the ack receiverDeafened so the sender's interrupt is never silent. */
	ackDeafened: boolean;
	/** Cancel the receiver's in-flight operation before delivering. */
	abortFirst: boolean;
	/** sendMessage delivery mode for preempt/surface actions ("queue"/"drop" omit it). */
	deliverAs?: "steer" | "followUp";
	/** Wake an idle receiver. Ignored by pi while streaming. */
	triggerTurn?: boolean;
}

export function planInboundTell(input: {
	deafened: boolean;
	preempt?: MeshTellPreemptLevel;
	agentBusy: boolean;
	ackRequested?: MeshTellReceiptWaitForPhase;
}): InboundTellPlan {
	const requestSurfaced = isSurfacedReceiptRequested(input.ackRequested);
	const requestedPhase: MeshTellReceiptPhase = input.ackRequested
		? canonicalTellReceiptPhase(input.ackRequested)
		: "delivered";
	const surfacedPhase: MeshTellReceiptPhase = requestSurfaced ? requestedPhase : "delivered";

	// (B) Respect /mesh deafen even for an interrupt — receiver sovereignty.
	if (input.deafened) {
		return { action: "drop-deafened", ackPhase: "refused", ackDeafened: true, abortFirst: false };
	}

	if (input.preempt === "abort") {
		// abort = cancel IN-FLIGHT work. If the receiver is idle there is nothing to
		// cancel, so abortFirst is false (a no-op ctx.abort() would otherwise make the
		// sender's receipt claim a cancellation that never happened). The message is
		// still delivered + wakes a turn either way.
		return {
			action: "preempt-abort",
			ackPhase: surfacedPhase,
			ackDeafened: false,
			abortFirst: input.agentBusy,
			deliverAs: "followUp",
			triggerTurn: true,
		};
	}

	if (input.preempt === "steer") {
		return {
			action: "preempt-steer",
			ackPhase: surfacedPhase,
			ackDeafened: false,
			abortFirst: false,
			deliverAs: "steer",
			triggerTurn: true,
		};
	}

	if (input.agentBusy) {
		// Park it; the 'visible' ack fires on flush at agent_end.
		return { action: "queue", ackPhase: "delivered", ackDeafened: false, abortFirst: false };
	}

	// Idle + normal tell — surface now. Mirrors getInboundDeliveryOptions(false, …):
	// a 'surfaced'/'visible'-requesting sender gets pi's default surface (no forced turn);
	// otherwise wake a turn so the message is actually read.
	return {
		action: "surface",
		ackPhase: surfacedPhase,
		ackDeafened: false,
		abortFirst: false,
		...(requestSurfaced ? {} : { deliverAs: "followUp", triggerTurn: true }),
	};
}
