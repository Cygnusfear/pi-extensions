import { describe, expect, test } from "bun:test";
import type { MeshMessage } from "./types.js";
import { buildTellReceiptAck, isMeshTellAckEnvelope, isMeshTellEnvelope, unwrapInboundTell } from "./tell-protocol.ts";

describe("pi-mesh direct tell envelopes", () => {
	test("unwrapInboundTell exposes payload and delivery metadata", () => {
		const inbound: MeshMessage = {
			from: "receiver-side-wrapper",
			topic: "session/peer-b",
			payload: {
				kind: "mesh:tell",
				deliveryId: "mesh-tell-123",
				from: "peer-a",
				ackRequested: "visible",
				payload: { text: "hello" },
				timestamp: 123,
			},
			timestamp: 124,
		};

		const unwrapped = unwrapInboundTell(inbound);
		expect(unwrapped.deliveryId).toBe("mesh-tell-123");
		expect(unwrapped.ackRequested).toBe("visible");
		expect(unwrapped.originalFrom).toBe("peer-a");
		expect(unwrapped.message.from).toBe("peer-a");
		expect(unwrapped.message.payload).toEqual({ text: "hello" });
		expect(unwrapped.preempt).toBeUndefined();
	});

	test("unwrapInboundTell surfaces the preempt level for interrupts", () => {
		const inbound: MeshMessage = {
			from: "wrapper",
			topic: "session/peer-b",
			payload: {
				kind: "mesh:tell",
				deliveryId: "mesh-tell-int",
				from: "peer-a",
				ackRequested: "delivered",
				preempt: "abort",
				payload: { text: "STOP" },
				timestamp: 7,
			},
			timestamp: 8,
		};
		expect(unwrapInboundTell(inbound).preempt).toBe("abort");
	});

	test("unwrapInboundTell leaves regular mesh messages unchanged", () => {
		const inbound: MeshMessage = {
			from: "peer-a",
			topic: "session/peer-b",
			payload: { text: "plain" },
			timestamp: 1,
		};

		const unwrapped = unwrapInboundTell(inbound);
		expect(unwrapped.deliveryId).toBeUndefined();
		expect(unwrapped.message).toEqual(inbound);
	});

	test("buildTellReceiptAck creates a valid ack envelope", () => {
		const ack = buildTellReceiptAck("mesh-tell-123", "peer-b", "delivered");
		expect(isMeshTellAckEnvelope(ack)).toBe(true);
		expect(ack.phase).toBe("delivered");
		expect(ack.deliveryId).toBe("mesh-tell-123");
		expect(ack.from).toBe("peer-b");
		// Unenriched ack carries no snapshot fields.
		expect(ack.receiverBusy).toBeUndefined();
		expect(ack.view).toBeUndefined();
		expect(ack.receiverDeafened).toBeUndefined();
	});

	test("buildTellReceiptAck carries the enriched receipt (busy + snapshot)", () => {
		const view = { entries: [], text: "(no meaningful entries in that window)", total: 0, windowFrom: 0 };
		const ack = buildTellReceiptAck("mesh-tell-123", "peer-b", "delivered", {
			receiverBusy: true,
			view,
		});
		expect(ack.receiverBusy).toBe(true);
		expect(ack.view).toEqual(view);
		expect(ack.receiverDeafened).toBeUndefined();
	});

	test("buildTellReceiptAck flags receiverDeafened so a dropped interrupt is not silent", () => {
		const ack = buildTellReceiptAck("mesh-tell-123", "peer-b", "delivered", {
			receiverBusy: true,
			receiverDeafened: true,
		});
		expect(ack.receiverDeafened).toBe(true);
		expect(ack.receiverBusy).toBe(true);
	});

	test("tell envelope guards recognize only the expected shapes", () => {
		expect(
			isMeshTellEnvelope({
				kind: "mesh:tell",
				deliveryId: "mesh-tell-123",
				from: "peer-a",
				payload: "hello",
				timestamp: 1,
			}),
		).toBe(true);
		expect(isMeshTellEnvelope({ kind: "mesh:tell" })).toBe(false);
		expect(isMeshTellAckEnvelope({ kind: "mesh:tell:ack" })).toBe(false);
	});
});
