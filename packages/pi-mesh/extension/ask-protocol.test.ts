import { describe, expect, test } from "bun:test";
import { buildMeshAskEnvelope, buildMeshAskReceipt, isMeshAskEnvelope, isMeshAskReceiptEnvelope } from "./ask-protocol.ts";

describe("pi-mesh ask protocol", () => {
	test("buildMeshAskEnvelope includes optional receipt metadata", () => {
		const envelope = buildMeshAskEnvelope("peer-a", { question: "hello" }, "ask-1", "visible");
		expect(isMeshAskEnvelope(envelope)).toBe(true);
		expect(envelope.__meshFrom).toBe("peer-a");
		expect(envelope.__meshPayload).toEqual({ question: "hello" });
		expect(envelope.__meshAskId).toBe("ask-1");
		expect(envelope.__meshAskReceiptRequested).toBe("visible");
	});

	test("buildMeshAskReceipt creates a valid receipt envelope", () => {
		const receipt = buildMeshAskReceipt("ask-1", "peer-b", "delivered");
		expect(isMeshAskReceiptEnvelope(receipt)).toBe(true);
		expect(receipt.askId).toBe("ask-1");
		expect(receipt.from).toBe("peer-b");
		expect(receipt.phase).toBe("delivered");
	});
});
