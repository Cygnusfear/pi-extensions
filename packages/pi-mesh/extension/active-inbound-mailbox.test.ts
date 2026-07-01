import { describe, expect, test } from "bun:test";
import { ActiveInboundTellMailbox, canonicalTellReceiptPhase, isSurfacedReceiptRequested } from "./active-inbound-mailbox.ts";

describe("ActiveInboundTellMailbox — peek is not consumption", () => {
	test("peek returns pending inbound tells without draining them", () => {
		const mailbox = new ActiveInboundTellMailbox();
		mailbox.enqueue({
			senderLabel: "Sender Nova",
			fromId: "sender-1",
			topic: "session/receiver",
			payload: { body: "full body" },
			payloadText: "full body",
			deliveryId: "delivery-1",
			originalFrom: "sender-1",
			ackRequested: "surfaced",
			receivedAt: 123,
			sequence: 7,
		});

		const peeked = mailbox.peek();

		expect(peeked).toEqual([
			{
				from: "sender-1",
				senderLabel: "Sender Nova",
				topic: "session/receiver",
				deliveryId: "delivery-1",
				ackRequested: "surfaced",
				receivedAt: 123,
				sequence: 7,
				payload: { body: "full body" },
				preview: "full body",
			},
		]);
		const surfacedAcks: string[] = [];
		// mesh.inbox()/$.inbox uses peek(): observable, but not consumption.
		// Therefore it must not emit surfaced. Only the runtime flush/drain does.
		mailbox.peek();
		expect(surfacedAcks).toEqual([]);
		expect(mailbox.length).toBe(1);

		for (const tell of mailbox.drain()) {
			if (tell.deliveryId && isSurfacedReceiptRequested(tell.ackRequested)) surfacedAcks.push(tell.deliveryId);
		}
		expect(surfacedAcks).toEqual(["delivery-1"]);
		expect(mailbox.length).toBe(0);
	});

	test("surfaced is requested only by surfaced or legacy visible, never by a passive peek", () => {
		expect(isSurfacedReceiptRequested("surfaced")).toBe(true);
		expect(isSurfacedReceiptRequested("visible")).toBe(true);
		expect(isSurfacedReceiptRequested("delivered")).toBe(false);
		expect(isSurfacedReceiptRequested(undefined)).toBe(false);
		expect(canonicalTellReceiptPhase("visible")).toBe("surfaced");
	});
});
