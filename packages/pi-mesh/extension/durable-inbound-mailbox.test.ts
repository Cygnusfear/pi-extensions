import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	computeDrain,
	dedupeAppend,
	DurableInboundMailbox,
	DURABLE_MAILBOX_TTL_MS,
	durableMailboxPath,
	durableMeshRoot,
	durableSessionDir,
	orderForDrain,
	partitionByExpiry,
	type DurableMailboxEntry,
} from "./durable-inbound-mailbox.ts";

const cleanup: string[] = [];
function tmpMailbox(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "durable-mailbox-"));
	cleanup.push(dir);
	return path.join(dir, "mailbox.jsonl");
}
afterEach(() => {
	for (const dir of cleanup.splice(0)) {
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	}
});

function entry(overrides: Partial<DurableMailboxEntry> & { deliveryId: string; seq: number }): DurableMailboxEntry {
	return {
		fromId: "sender",
		senderLabel: "Sender",
		payload: { body: overrides.deliveryId },
		payloadText: overrides.deliveryId,
		sentAt: 1000,
		expiresAt: 1000 + DURABLE_MAILBOX_TTL_MS,
		...overrides,
	};
}

describe("durable mailbox — pure core", () => {
	test("dedupeAppend drops a duplicate deliveryId (idempotent surface)", () => {
		const a = entry({ deliveryId: "d1", seq: 1 });
		const first = dedupeAppend([], a);
		expect(first.duplicate).toBe(false);
		expect(first.entries).toHaveLength(1);
		const dup = dedupeAppend(first.entries, entry({ deliveryId: "d1", seq: 2 }));
		expect(dup.duplicate).toBe(true);
		expect(dup.entries).toHaveLength(1);
	});

	test("partitionByExpiry splits on expiresAt <= now", () => {
		const live = entry({ deliveryId: "live", seq: 1, expiresAt: 5000 });
		const dead = entry({ deliveryId: "dead", seq: 2, expiresAt: 2000 });
		const { live: l, expired: e } = partitionByExpiry([live, dead], 3000);
		expect(l.map((x) => x.deliveryId)).toEqual(["live"]);
		expect(e.map((x) => x.deliveryId)).toEqual(["dead"]);
	});

	test("orderForDrain is FIFO by seq regardless of on-disk order", () => {
		const out = orderForDrain([
			entry({ deliveryId: "c", seq: 3 }),
			entry({ deliveryId: "a", seq: 1 }),
			entry({ deliveryId: "b", seq: 2 }),
		]);
		expect(out.map((x) => x.deliveryId)).toEqual(["a", "b", "c"]);
	});

	test("computeDrain returns FIFO live + expired", () => {
		const now = 4000;
		const { drained, expired } = computeDrain(
			[
				entry({ deliveryId: "old", seq: 1, expiresAt: 2000 }),
				entry({ deliveryId: "m2", seq: 3, expiresAt: 9000 }),
				entry({ deliveryId: "m1", seq: 2, expiresAt: 9000 }),
			],
			now,
		);
		expect(drained.map((x) => x.deliveryId)).toEqual(["m1", "m2"]);
		expect(expired.map((x) => x.deliveryId)).toEqual(["old"]);
	});
});

describe("DurableInboundMailbox — persistence", () => {
	test("append persists, assigns monotonic seq + TTL, survives a fresh reader (hibernation)", () => {
		const p = tmpMailbox();
		const mb = new DurableInboundMailbox(p);
		mb.append({ deliveryId: "d1", fromId: "s", senderLabel: "S", payload: "one", payloadText: "one", sentAt: 1000 });
		mb.append({ deliveryId: "d2", fromId: "s", senderLabel: "S", payload: "two", payloadText: "two", sentAt: 1001 });

		// A DIFFERENT instance (simulating the revived process) still sees the mail.
		const revived = new DurableInboundMailbox(p);
		const peeked = revived.peek(2000);
		expect(peeked.map((e) => e.deliveryId)).toEqual(["d1", "d2"]);
		expect(peeked[0].seq).toBe(1);
		expect(peeked[1].seq).toBe(2);
		expect(peeked[0].expiresAt).toBe(1000 + DURABLE_MAILBOX_TTL_MS);
	});

	test("dedup across processes — re-append of same deliveryId is a no-op", () => {
		const p = tmpMailbox();
		const r1 = new DurableInboundMailbox(p).append({ deliveryId: "dup", fromId: "s", senderLabel: "S", payload: "x", payloadText: "x", sentAt: 1000 });
		expect(r1.duplicate).toBe(false);
		const r2 = new DurableInboundMailbox(p).append({ deliveryId: "dup", fromId: "s", senderLabel: "S", payload: "x", payloadText: "x", sentAt: 1005 });
		expect(r2.duplicate).toBe(true);
		expect(new DurableInboundMailbox(p).length).toBe(1);
	});

	test("drain surfaces FIFO live + reports expired, then empties the mailbox", () => {
		const p = tmpMailbox();
		const mb = new DurableInboundMailbox(p, { ttlMs: 500 });
		mb.append({ deliveryId: "old", fromId: "s", senderLabel: "S", payload: "old", payloadText: "old", sentAt: 1000 }); // expires 1500
		mb.append({ deliveryId: "new", fromId: "s", senderLabel: "S", payload: "new", payloadText: "new", sentAt: 3000 }); // expires 3500

		const { drained, expired } = mb.drain(3200);
		expect(drained.map((e) => e.deliveryId)).toEqual(["new"]);
		expect(expired.map((e) => e.deliveryId)).toEqual(["old"]);
		// Fully consumed → file removed → empty for any later reader.
		expect(mb.length).toBe(0);
		expect(fs.existsSync(p)).toBe(false);
	});

	test("FIFO-per-sender preserved across the hibernation seam", () => {
		const p = tmpMailbox();
		const mb = new DurableInboundMailbox(p);
		// msg1 sat while hibernated; msg2 arrived later. Both durable. On revive
		// they must surface msg1 then msg2 — never reordered.
		mb.append({ deliveryId: "msg1", fromId: "s", senderLabel: "S", payload: "1", payloadText: "1", sentAt: 1000 });
		mb.append({ deliveryId: "msg2", fromId: "s", senderLabel: "S", payload: "2", payloadText: "2", sentAt: 1100 });
		const { drained } = mb.drain(2000);
		expect(drained.map((e) => e.deliveryId)).toEqual(["msg1", "msg2"]);
	});

	test("pruneExpired drops stale mail without surfacing live", () => {
		const p = tmpMailbox();
		const mb = new DurableInboundMailbox(p, { ttlMs: 100 });
		mb.append({ deliveryId: "gone", fromId: "s", senderLabel: "S", payload: "g", payloadText: "g", sentAt: 1000 });
		mb.append({ deliveryId: "keep", fromId: "s", senderLabel: "S", payload: "k", payloadText: "k", sentAt: 5000 });
		const expired = mb.pruneExpired(1200);
		expect(expired.map((e) => e.deliveryId)).toEqual(["gone"]);
		expect(mb.peek(1200).map((e) => e.deliveryId)).toEqual(["keep"]);
	});

	test("path helpers sanitize a hostile durable id (no traversal)", () => {
		const dir = durableSessionDir("../../etc/passwd");
		expect(dir).not.toContain("..");
		// The sanitized segment stays a DIRECT child of the durable root — it can
		// never climb out via "." or ".." or an embedded separator.
		expect(path.dirname(dir)).toBe(durableMeshRoot());
		expect(durableSessionDir("..")).toBe(path.join(durableMeshRoot(), "__"));
		expect(durableMailboxPath("abc-123")).toContain(path.join("abc-123", "mailbox.jsonl"));
	});
});
