import type { MeshTellPreemptLevel, MeshTellReceiptPhase } from "./types.ts";

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
	ackRequested?: MeshTellReceiptPhase;
}): InboundTellPlan {
	const requestVisible = input.ackRequested === "visible";
	const visiblePhase: MeshTellReceiptPhase = requestVisible ? "visible" : "delivered";

	// (B) Respect /mesh deafen even for an interrupt — receiver sovereignty.
	if (input.deafened) {
		return { action: "drop-deafened", ackPhase: "delivered", ackDeafened: true, abortFirst: false };
	}

	if (input.preempt === "abort") {
		return {
			action: "preempt-abort",
			ackPhase: visiblePhase,
			ackDeafened: false,
			abortFirst: true,
			deliverAs: "followUp",
			triggerTurn: true,
		};
	}

	if (input.preempt === "steer") {
		return {
			action: "preempt-steer",
			ackPhase: visiblePhase,
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
	// a 'visible'-requesting sender gets pi's default surface (no forced turn);
	// otherwise wake a turn so the message is actually read.
	return {
		action: "surface",
		ackPhase: visiblePhase,
		ackDeafened: false,
		abortFirst: false,
		...(requestVisible ? {} : { deliverAs: "followUp", triggerTurn: true }),
	};
}
