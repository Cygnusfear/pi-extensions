import { describe, expect, test } from "bun:test";
import { buildPendingAskBatchContent, splitExpiredPendingAsks } from "./ask-queue.ts";

describe("pi-mesh ask queue helpers", () => {
	test("splitExpiredPendingAsks separates active and expired asks", () => {
		const now = 1_000;
		const result = splitExpiredPendingAsks([
			{ requestId: 1, senderLabel: "Alpha", payloadText: "one", expiresAt: 999 },
			{ requestId: 2, senderLabel: "Beta", payloadText: "two", expiresAt: 1_001 },
		], now);

		expect(result.expired.map((item) => item.requestId)).toEqual([1]);
		expect(result.active.map((item) => item.requestId)).toEqual([2]);
	});

	test("buildPendingAskBatchContent renders queued ask instructions", () => {
		const text = buildPendingAskBatchContent([
			{ requestId: 42, senderLabel: "Alpha", payloadText: "Status?" },
			{ requestId: 84, senderLabel: "Beta", payloadText: "Need your verdict." },
		]);

		expect(text).toContain("queued while you were busy");
		expect(text).toContain("mesh_tell");
		expect(text).toContain("#42 Alpha asks");
		expect(text).toContain("#84 Beta asks");
	});
});
