import { describe, expect, test } from "bun:test";
import { buildPendingAskBatchContent, splitExpiredPendingAsks } from "./ask-queue.ts";
import type { MeshIcons } from "./inbound-format.ts";

const ICONS: MeshIcons = { tell: "📨", chat: "💬", ask: "❓", sep: "·" };

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
		], ICONS);

		expect(text).toContain("queued while you were busy");
		expect(text).toContain("mesh_tell");
		expect(text).toContain("#42 Alpha asks");
		expect(text).toContain("#84 Beta asks");
	});

	test("a queued ask renders its send time, and an unstamped one renders none", () => {
		const stamped = buildPendingAskBatchContent(
			[{ requestId: 7, senderLabel: "Alpha", payloadText: "Status?", sentAt: Date.UTC(2026, 8, 11, 0, 48, 12, 345) }],
			ICONS,
		);
		expect(stamped).toContain(" sent 2026-09-11T00:48:12.345Z");

		const unstamped = buildPendingAskBatchContent(
			[{ requestId: 8, senderLabel: "Beta", payloadText: "Status?" }],
			ICONS,
		);
		expect(unstamped).not.toContain("sent");
	});
});
