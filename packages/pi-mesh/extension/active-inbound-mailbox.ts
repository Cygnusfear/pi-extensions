import type { MeshTellReceiptPhase, MeshTellReceiptWaitForPhase } from "./types.ts";

export interface ActiveInboundTell {
	senderLabel: string;
	fromId: string;
	topic: string | undefined;
	payload: unknown;
	payloadText: string;
	deliveryId: string | undefined;
	originalFrom: string | undefined;
	ackRequested: MeshTellReceiptWaitForPhase | undefined;
	receivedAt: number;
	sequence: number;
}

export interface ActiveInboundTellPeek {
	from: string;
	senderLabel: string;
	topic?: string;
	deliveryId?: string;
	ackRequested?: MeshTellReceiptWaitForPhase;
	receivedAt: number;
	sequence: number;
	payload: unknown;
	preview: string;
}

export function canonicalTellReceiptPhase(phase: MeshTellReceiptWaitForPhase): MeshTellReceiptPhase {
	return phase === "visible" ? "surfaced" : phase;
}

export function isSurfacedReceiptRequested(phase: MeshTellReceiptWaitForPhase | undefined): boolean {
	return phase === "surfaced" || phase === "visible";
}

export function toActiveInboundTellPeek(tell: ActiveInboundTell): ActiveInboundTellPeek {
	return {
		from: tell.fromId,
		senderLabel: tell.senderLabel,
		...(tell.topic !== undefined ? { topic: tell.topic } : {}),
		...(tell.deliveryId !== undefined ? { deliveryId: tell.deliveryId } : {}),
		...(tell.ackRequested !== undefined ? { ackRequested: tell.ackRequested } : {}),
		receivedAt: tell.receivedAt,
		sequence: tell.sequence,
		payload: tell.payload,
		preview: tell.payloadText,
	};
}

/** Active-peer in-memory mailbox for tells that arrive while the receiver is busy. */
export class ActiveInboundTellMailbox {
	private tells: ActiveInboundTell[] = [];
	private nextSequence = 1;

	enqueue(input: Omit<ActiveInboundTell, "receivedAt" | "sequence"> & { receivedAt?: number; sequence?: number }): ActiveInboundTell {
		const record: ActiveInboundTell = {
			...input,
			receivedAt: input.receivedAt ?? Date.now(),
			sequence: input.sequence ?? this.nextSequence++,
		};
		if (record.sequence >= this.nextSequence) this.nextSequence = record.sequence + 1;
		this.tells.push(record);
		return record;
	}

	peek(): ActiveInboundTellPeek[] {
		return this.tells.map(toActiveInboundTellPeek);
	}

	drain(): ActiveInboundTell[] {
		return this.tells.splice(0, this.tells.length);
	}

	clear(): void {
		this.tells.length = 0;
	}

	get length(): number {
		return this.tells.length;
	}
}
