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
