import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DurableInboundMailbox } from "./durable-inbound-mailbox.ts";
import { createSurfacedDeliveryGuard, selectFreshDrained, tellContentKey } from "./inbound-dedup.ts";

describe("surfaced delivery guard", () => {
	test("a first delivery is not a duplicate, the second one is", () => {
		const guard = createSurfacedDeliveryGuard();
		expect(guard.has("d-1")).toBe(false);
		guard.remember("d-1");
		expect(guard.has("d-1")).toBe(true);
		expect(guard.has("d-2")).toBe(false);
	});

	test("distinct deliveries never mask each other", () => {
		const guard = createSurfacedDeliveryGuard();
		guard.remember("a");
		guard.remember("b");
		expect(guard.has("a")).toBe(true);
		expect(guard.has("b")).toBe(true);
		expect(guard.size()).toBe(2);
	});

	test("it stays bounded, forgetting the oldest first", () => {
		const guard = createSurfacedDeliveryGuard(3);
		for (const id of ["1", "2", "3", "4"]) guard.remember(id);
		expect(guard.size()).toBe(3);
		expect(guard.has("1")).toBe(false); // evicted, may surface again
		expect(guard.has("4")).toBe(true);
	});

	test("remembering the same id twice does not consume extra room", () => {
		const guard = createSurfacedDeliveryGuard(2);
		guard.remember("x");
		guard.remember("x");
		guard.remember("y");
		expect(guard.size()).toBe(2);
		expect(guard.has("x")).toBe(true);
	});

	describe("across a restart", () => {
		test("surfaced ids survive, because the replay happens on the restart", () => {
			const path = join(mkdtempSync(join(tmpdir(), "surfaced-")), "surfaced.json");
			const before = createSurfacedDeliveryGuard({ path: () => path });
			before.remember("delivery-1");

			// A restarted session builds a fresh guard with empty memory over the same file.
			const afterRestart = createSurfacedDeliveryGuard({ path: () => path });
			expect(afterRestart.has("delivery-1")).toBe(true);
			expect(afterRestart.has("never-seen")).toBe(false);
		});

		test("stays in memory when no path is available", () => {
			const guard = createSurfacedDeliveryGuard({ path: () => undefined });
			guard.remember("x");
			expect(guard.has("x")).toBe(true);
		});

		test("an unreadable history costs only suppressions, never correctness", () => {
			const path = join(mkdtempSync(join(tmpdir(), "surfaced-bad-")), "surfaced.json");
			writeFileSync(path, "{ not json");
			const guard = createSurfacedDeliveryGuard({ path: () => path });
			expect(guard.has("anything")).toBe(false);
			guard.remember("anything");
			expect(guard.has("anything")).toBe(true);
		});
	});
});

// ── pe-hbdmvoav: one logical tell surfaced repeatedly through the revive drain ──

describe("pe-hbdmvoav: revive drain surfaces one logical tell once", () => {
	const SENDER = "a0e1b2c3-sender-durable-id";
	const RECEIVER = "maggie-durable-id";
	// The measured shape: one tell, timestamp 1790528423113, identical text, four ids
	// all minted in that same millisecond.
	const SENT_AT = 1790528423113;
	const TEXT = "fleet notice: pi-mesh redeploy at 17:00, reply when you are back";
	const IDS = [
		"mesh-tell-1790528423113-6haap86y",
		"mesh-tell-1790528423113-81q8i7b1",
		"mesh-tell-1790528423113-dzs1y6e7",
		"mesh-tell-1790528423113-4thidxxx",
	];
	const NOW = SENT_AT + 1_000;

	function fixture() {
		const dir = mkdtempSync(join(tmpdir(), "hbdmvoav-"));
		const guardPath = join(dir, "surfaced.json");
		const mailboxRoot = join(dir, "durable");
		const errors: string[] = [];
		// A "session" is a fresh guard over the same file: exactly what a revive builds.
		const session = () => createSurfacedDeliveryGuard({ path: () => guardPath, onError: (m) => errors.push(m) });
		const mailbox = () => DurableInboundMailbox.forDurableId(RECEIVER, { root: mailboxRoot });
		const append = (deliveryId: string, text = TEXT, sentAt = SENT_AT) =>
			mailbox().append(
				{
					deliveryId,
					fromId: SENDER,
					senderLabel: "Juan",
					payload: text,
					payloadText: text,
					ackRequested: "delivered",
					originalFrom: SENDER,
					sentAt,
				},
				NOW,
			);
		/** One revive: drain the mailbox, return what would be surfaced. */
		const revive = (guard = session()) => selectFreshDrained(mailbox().drain(NOW).drained, guard).fresh;
		return { dir, guardPath, errors, session, mailbox, append, revive };
	}

	test("the reported shape: one tell under 4 deliveryIds through the drain surfaces exactly once", () => {
		const f = fixture();
		// All four in the mailbox at once (the mailbox dedups by id only, so it keeps all four).
		for (const id of IDS) f.append(id);
		expect(f.mailbox().length).toBe(4);
		const surfaced = f.revive();
		expect(surfaced.map((e) => e.deliveryId)).toEqual([IDS[0]]);

		// And spread across revives, each re-append arriving after the previous drain.
		const g = fixture();
		const total: string[] = [];
		for (const id of IDS) {
			g.append(id);
			total.push(...g.revive().map((e) => e.deliveryId));
		}
		expect(total).toEqual([IDS[0]]);
		expect(f.errors).toEqual([]);
		expect(g.errors).toEqual([]);
	});

	test("drain, re-append the same id, drain again across a restart: exactly one surface", () => {
		const f = fixture();
		f.append(IDS[0]);
		const first = f.revive(f.session());
		expect(first).toHaveLength(1);
		expect(f.mailbox().length).toBe(0); // drain consumed it: the mailbox can no longer dedup

		// Restart: a new process, a new guard with empty memory, same file.
		f.append(IDS[0]);
		expect(f.mailbox().length).toBe(1); // re-append after the drain is invisible to the mailbox
		const second = f.revive(f.session());
		expect(second).toHaveLength(0);
	});

	test("two different tells with the same text but different timestamps both surface", () => {
		const f = fixture();
		f.append("mesh-tell-1-aaaa", "ok", SENT_AT);
		f.append("mesh-tell-2-bbbb", "ok", SENT_AT + 60_000);
		expect(f.revive().map((e) => e.deliveryId)).toEqual(["mesh-tell-1-aaaa", "mesh-tell-2-bbbb"]);
		// ...and across revives too.
		f.append("mesh-tell-3-cccc", "ok", SENT_AT + 120_000);
		expect(f.revive().map((e) => e.deliveryId)).toEqual(["mesh-tell-3-cccc"]);
	});

	test("same text and timestamp from DIFFERENT senders are different tells", () => {
		expect(tellContentKey({ from: "a", sentAt: 1, payload: "x" })).not.toBe(
			tellContentKey({ from: "b", sentAt: 1, payload: "x" }),
		);
		expect(tellContentKey({ from: "a", sentAt: undefined, payload: "x" })).toBeUndefined();
	});

	test("the decision is on disk before the caller surfaces", () => {
		const f = fixture();
		const guard = f.session();
		const result = guard.claim({ deliveryId: IDS[0], contentKey: tellContentKey({ from: SENDER, sentAt: SENT_AT, payload: TEXT }) });
		expect(result).toEqual({ fresh: true, persisted: true });
		// Nothing has been "surfaced" yet, and the file already carries both keys.
		const onDisk = JSON.parse(readFileSync(f.guardPath, "utf8")) as string[];
		expect(onDisk).toContain(IDS[0]);
		expect(onDisk.some((k) => k.startsWith("content:"))).toBe(true);
	});

	test("a guard write failure is loud and does not cause a duplicate", () => {
		if (process.getuid?.() === 0) return; // root ignores the permission bits used here
		const f = fixture();
		const guardDir = join(f.dir, "ro");
		mkdirSync(guardDir);
		chmodSync(guardDir, 0o500); // not writable: every save fails
		const errors: string[] = [];
		const guard = createSurfacedDeliveryGuard({ path: () => join(guardDir, "surfaced.json"), onError: (m) => errors.push(m) });
		try {
			f.append(IDS[0]);
			const first = selectFreshDrained(f.mailbox().drain(NOW).drained, guard);
			// Fail-safe: still surfaced (at-least-once), but reported as not persisted.
			expect(first.fresh).toHaveLength(1);
			expect(first.persisted).toBe(false);
			expect(guard.degraded()).toBe(true);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain("could not persist");

			// Redelivered under the same id AND under a re-minted id: neither surfaces again.
			f.append(IDS[0]);
			f.append(IDS[1]);
			const second = selectFreshDrained(f.mailbox().drain(NOW).drained, guard);
			expect(second.fresh).toHaveLength(0);

			// Loud every time, not once: a second failing write is reported again.
			guard.claim({ deliveryId: "another" });
			expect(errors.filter((m) => m.includes("could not persist")).length).toBeGreaterThanOrEqual(2);
		} finally {
			chmodSync(guardDir, 0o700);
		}
		// Once the disk works again the whole in-memory history is written out.
		guard.claim({ deliveryId: "after-heal" });
		expect(guard.degraded()).toBe(false);
		const healed = JSON.parse(readFileSync(join(guardDir, "surfaced.json"), "utf8")) as string[];
		expect(healed).toContain(IDS[0]);
	});

	test("a guard consulted before identity is known still loads its history later", () => {
		const f = fixture();
		f.session().claim({ deliveryId: IDS[0] }); // an earlier incarnation surfaced it
		let identityKnown = false;
		const guard = createSurfacedDeliveryGuard({ path: () => (identityKnown ? f.guardPath : undefined) });
		expect(guard.has("unrelated")).toBe(false); // first call, no identity yet
		identityKnown = true;
		expect(guard.has(IDS[0])).toBe(true);
	});

	test("a corrupt history is moved aside loudly, not silently overwritten", () => {
		const f = fixture();
		writeFileSync(f.guardPath, "{ not json");
		const guard = f.session();
		expect(guard.claim({ deliveryId: "x" }).fresh).toBe(true);
		expect(f.errors.some((m) => m.includes("moved it to"))).toBe(true);
		expect(readdirSync(f.dir).some((n) => n.startsWith("surfaced.json.corrupt-"))).toBe(true);
		expect(existsSync(f.guardPath)).toBe(true);
	});
});
