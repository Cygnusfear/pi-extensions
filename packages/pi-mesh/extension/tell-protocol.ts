import type {
	MeshMessage,
	MeshTellAckEnvelope,
	MeshTellAckView,
	MeshTellEnvelope,
	MeshTellPreemptLevel,
	MeshTellReceiptPhase,
} from "./types.ts";

export function createDeliveryId(): string {
	return `mesh-tell-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isMeshTellEnvelope(payload: unknown): payload is MeshTellEnvelope {
	return !!payload
		&& typeof payload === "object"
		&& (payload as Record<string, unknown>).kind === "mesh:tell"
		&& typeof (payload as Record<string, unknown>).deliveryId === "string";
}

export function isMeshTellAckEnvelope(payload: unknown): payload is MeshTellAckEnvelope {
	return !!payload
		&& typeof payload === "object"
		&& (payload as Record<string, unknown>).kind === "mesh:tell:ack"
		&& typeof (payload as Record<string, unknown>).deliveryId === "string";
}

export function buildTellReceiptAck(
	deliveryId: string,
	from: string,
	phase: MeshTellReceiptPhase,
	extras?: {
		receiverBusy?: boolean;
		receiverDeafened?: boolean;
		view?: MeshTellAckView;
		aborted?: boolean;
	},
): MeshTellAckEnvelope {
	return {
		kind: "mesh:tell:ack",
		deliveryId,
		from,
		phase,
		timestamp: Date.now(),
		...(extras?.receiverBusy !== undefined ? { receiverBusy: extras.receiverBusy } : {}),
		...(extras?.receiverDeafened !== undefined ? { receiverDeafened: extras.receiverDeafened } : {}),
		...(extras?.view !== undefined ? { view: extras.view } : {}),
		...(extras?.aborted !== undefined ? { aborted: extras.aborted } : {}),
	};
}

export function unwrapInboundTell(msg: MeshMessage): {
	message: MeshMessage;
	deliveryId?: string;
	ackRequested?: MeshTellReceiptPhase;
	preempt?: MeshTellPreemptLevel;
	originalFrom?: string;
} {
	if (!isMeshTellEnvelope(msg.payload)) return { message: msg };
	return {
		message: { ...msg, from: msg.payload.from, payload: msg.payload.payload },
		deliveryId: msg.payload.deliveryId,
		ackRequested: msg.payload.ackRequested,
		preempt: msg.payload.preempt,
		originalFrom: msg.payload.from,
	};
}
