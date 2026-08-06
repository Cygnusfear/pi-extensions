import { describe, expect, test } from "bun:test";
import { formatTellAckReceipt } from "./pi-mesh.ts";
import type { MeshTellAckEnvelope } from "./types.ts";

function receipt(overrides: Partial<MeshTellAckEnvelope> = {}): MeshTellAckEnvelope {
	return {
		kind: "mesh:tell:ack",
		deliveryId: "delivery-1",
		from: "peer-1",
		phase: "delivered",
		timestamp: 1,
		...overrides,
	};
}

describe("formatTellAckReceipt", () => {
	test("bare receipts add no unsupported compatibility conclusion", () => {
		expect(formatTellAckReceipt(receipt())).toBe("");
	});

	test("renders actual receipt facts when present", () => {
		const text = formatTellAckReceipt(receipt({ receiverBusy: true, aborted: false }));
		expect(text).toContain("peer was BUSY");
		expect(text).toContain("abort was a NO-OP");
	});
});
