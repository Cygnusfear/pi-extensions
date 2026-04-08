import { describe, expect, test } from "bun:test";
import {
	appendMeshAskReceipt,
	buildMeshAskEnvelope,
	buildMeshAskReceipt,
	formatMeshAskReceiptTrail,
	isMeshAskEnvelope,
	isMeshAskReceiptEnvelope,
} from "./ask-protocol.ts";

describe("pi-mesh ask protocol", () => {
	test("buildMeshAskEnvelope includes optional receipt metadata", () => {
		const envelope = buildMeshAskEnvelope("peer-a", { question: "hello" }, "ask-1", "visible", 45_000);
		expect(isMeshAskEnvelope(envelope)).toBe(true);
		expect(envelope.kind).toBe("mesh:ask");
		expect(envelope.from).toBe("peer-a");
		expect(envelope.payload).toEqual({ question: "hello" });
		expect(envelope.askId).toBe("ask-1");
		expect(envelope.receiptRequested).toBe("visible");
		expect(envelope.timeoutMs).toBe(45_000);
	});

	test("buildMeshAskReceipt creates a valid receipt envelope", () => {
		const receipt = buildMeshAskReceipt("ask-1", "peer-b", "delivered");
		expect(isMeshAskReceiptEnvelope(receipt)).toBe(true);
		expect(receipt.askId).toBe("ask-1");
		expect(receipt.from).toBe("peer-b");
		expect(receipt.phase).toBe("delivered");
	});

	test("appendMeshAskReceipt keeps the latest receipt per phase", () => {
		const delivered = buildMeshAskReceipt("ask-1", "peer-b", "delivered");
		const busy = buildMeshAskReceipt("ask-1", "peer-b", "busy");
		const visible = buildMeshAskReceipt("ask-1", "peer-b", "visible");
		const redelivered = { ...delivered, timestamp: delivered.timestamp + 10 };

		let receipts = appendMeshAskReceipt([], delivered);
		receipts = appendMeshAskReceipt(receipts, busy);
		receipts = appendMeshAskReceipt(receipts, visible);
		receipts = appendMeshAskReceipt(receipts, redelivered);

		expect(receipts.map((receipt) => receipt.phase)).toEqual(["busy", "visible", "delivered"]);
		expect(receipts.find((receipt) => receipt.phase === "delivered")?.timestamp).toBe(redelivered.timestamp);
	});

	test("formatMeshAskReceiptTrail renders receipt progression", () => {
		const receipts = [
			buildMeshAskReceipt("ask-1", "peer-b", "delivered"),
			buildMeshAskReceipt("ask-1", "peer-b", "busy"),
			buildMeshAskReceipt("ask-1", "peer-b", "visible"),
		];
		const trail = formatMeshAskReceiptTrail(receipts);
		expect(trail).toContain("delivered by peer-b");
		expect(trail).toContain("busy by peer-b");
		expect(trail).toContain("visible by peer-b");
	});
});