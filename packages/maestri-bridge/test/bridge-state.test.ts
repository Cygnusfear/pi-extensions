import { describe, expect, test } from "bun:test";
import {
	BridgeRequestTracker,
	DetachedTransportQueue,
} from "../extension/maestri-bridge/bridge-state.ts";

const OPTS = {
	replayLimit: 3,
	replayGraceMs: 1_000,
	outboundRecordTtlMs: 10_000,
};

describe("claimIncomingRequest", () => {
	test("new then replay", () => {
		const t = new BridgeRequestTracker(OPTS);
		const req = { id: "r1", expiresAt: 5_000 };
		expect(t.claimIncomingRequest(req, 1_000)).toBe("new");
		expect(t.claimIncomingRequest(req, 1_500)).toBe("replay");
	});

	test("saturated at the replay limit", () => {
		const t = new BridgeRequestTracker(OPTS);
		expect(t.claimIncomingRequest({ id: "a", expiresAt: 5_000 }, 1_000)).toBe(
			"new",
		);
		expect(t.claimIncomingRequest({ id: "b", expiresAt: 5_000 }, 1_000)).toBe(
			"new",
		);
		expect(t.claimIncomingRequest({ id: "c", expiresAt: 5_000 }, 1_000)).toBe(
			"new",
		);
		expect(t.claimIncomingRequest({ id: "d", expiresAt: 5_000 }, 1_000)).toBe(
			"saturated",
		);
	});

	test("expired entries are pruned and can be admitted again", () => {
		const t = new BridgeRequestTracker(OPTS);
		const req = { id: "r1", expiresAt: 2_000 };
		expect(t.claimIncomingRequest(req, 1_000)).toBe("new");
		expect(t.claimIncomingRequest(req, 2_500)).toBe("replay");
		expect(t.claimIncomingRequest(req, 3_500)).toBe("new");
	});
});

describe("outbound request tracking", () => {
	test("remember then claim once", () => {
		const t = new BridgeRequestTracker(OPTS);
		expect(t.rememberOutboundRequest("o1", 1_000)).toBe(true);
		expect(t.claimOutboundReply("o1", 2_000)).toBe(true);
		expect(t.claimOutboundReply("o1", 2_500)).toBe(false);
	});

	test("unknown reply id is not claimable", () => {
		const t = new BridgeRequestTracker(OPTS);
		expect(t.claimOutboundReply("nope", 1_000)).toBe(false);
	});

	test("expired outbound record is pruned", () => {
		const t = new BridgeRequestTracker(OPTS);
		t.rememberOutboundRequest("o1", 1_000);
		expect(
			t.claimOutboundReply("o1", 1_000 + OPTS.outboundRecordTtlMs + 1),
		).toBe(false);
	});

	test("drop removes a pending outbound record", () => {
		const t = new BridgeRequestTracker(OPTS);
		t.rememberOutboundRequest("o1", 1_000);
		t.dropOutboundRequest("o1");
		expect(t.claimOutboundReply("o1", 1_500)).toBe(false);
	});

	test("outbound saturation refuses new records", () => {
		const t = new BridgeRequestTracker(OPTS);
		t.rememberOutboundRequest("a", 1_000);
		t.rememberOutboundRequest("b", 1_000);
		t.rememberOutboundRequest("c", 1_000);
		expect(t.rememberOutboundRequest("d", 1_000)).toBe(false);
	});
});

describe("DetachedTransportQueue reply reservations", () => {
	test("reservation capacity accounts active + queued + reserved", async () => {
		const q = new DetachedTransportQueue(2, 2);
		const gate: Array<() => void> = [];
		const pending = () =>
			new Promise<string>((res) => gate.push(() => res("done")));

		expect(q.tryReserveReply()).toBe(true); // reserved 1
		expect(q.tryReserveReply()).toBe(true); // reserved 2
		expect(q.tryReserveReply()).toBe(true); // reserved 3
		expect(q.tryReserveReply()).toBe(true); // reserved 4 = cap
		expect(q.tryReserveReply()).toBe(false); // committed → refused

		q.submitReservedReply(pending);
		q.submitReservedReply(pending);
		expect(q.activeCount).toBe(2);
		q.submitReservedReply(pending);
		q.submitReservedReply(pending);
		expect(q.queuedCount).toBe(2);
		expect(q.reservedCount).toBe(0);

		while (gate.length > 0 || q.activeCount > 0 || q.queuedCount > 0) {
			const release = gate.shift();
			if (release) release();
			await Promise.resolve();
		}
	});

	test("a reserved reply is never dropped, even beyond maxQueued", async () => {
		const q = new DetachedTransportQueue(1, 1);
		const gate: Array<() => void> = [];
		const pending = (name: string) => () =>
			new Promise<string>((res) => gate.push(() => res(name)));

		// fill capacity with two reservations: one starts, one queues
		expect(q.tryReserveReply()).toBe(true);
		expect(q.tryReserveReply()).toBe(true);
		const a = q.submitReservedReply(pending("a"));
		const b = q.submitReservedReply(pending("b"));
		expect(a.disposition).toBe("started");
		expect(b.disposition).toBe("queued");

		// a third reservation is refused (committed), so no reply is ever dropped:
		// the would-be third request is rejected as busy at admission instead
		expect(q.tryReserveReply()).toBe(false);

		while (gate.length > 0 || q.activeCount > 0 || q.queuedCount > 0) {
			const release = gate.shift();
			if (release) release();
			await Promise.resolve();
		}
		expect(await a.done!).toBe("a");
		expect(await b.done!).toBe("b");
	});

	test("release frees capacity for a later reservation", () => {
		const q = new DetachedTransportQueue(1, 0);
		expect(q.tryReserveReply()).toBe(true);
		expect(q.tryReserveReply()).toBe(false);
		q.releaseReplyReservation();
		expect(q.tryReserveReply()).toBe(true);
	});

	test("reserved replies run in fifo order", async () => {
		const q = new DetachedTransportQueue(1, 4);
		const order: string[] = [];
		const gate: Array<() => void> = [];
		const mk = (name: string) => () =>
			new Promise<string>((res) =>
				gate.push(() => {
					order.push(name);
					res(name);
				}),
			);

		q.tryReserveReply();
		q.tryReserveReply();
		q.tryReserveReply();
		const first = q.submitReservedReply(mk("a"));
		const second = q.submitReservedReply(mk("b"));
		const third = q.submitReservedReply(mk("c"));
		expect(second.disposition).toBe("queued");

		while (gate.length > 0 || q.activeCount > 0 || q.queuedCount > 0) {
			const release = gate.shift();
			if (release) release();
			await Promise.resolve();
		}
		await Promise.all([first.done!, second.done!, third.done!]);
		expect(order).toEqual(["a", "b", "c"]);
	});

	test("task rejection propagates to done and frees the slot", async () => {
		const q = new DetachedTransportQueue(1, 1);
		q.tryReserveReply();
		const boom = q.submitReservedReply(() => Promise.reject(new Error("boom")));
		await expect(boom.done!).rejects.toThrow("boom");
		expect(q.activeCount).toBe(0);
	});
});

describe("DetachedTransportQueue courtesy rejections", () => {
	test("rejections start up to maxActive, then drop — never queue", async () => {
		const q = new DetachedTransportQueue(2, 4);
		const gate: Array<() => void> = [];
		const pending = () =>
			new Promise<string>((res) => gate.push(() => res("done")));

		expect(q.submitRejection(pending).disposition).toBe("started");
		expect(q.submitRejection(pending).disposition).toBe("started");
		expect(q.submitRejection(pending).disposition).toBe("dropped");
		expect(q.submitRejection(pending).disposition).toBe("dropped");
		expect(q.queuedCount).toBe(0);

		while (gate.length > 0) gate.shift()?.();
	});

	test("a rejection starts only while global commitment is below cap", async () => {
		const q = new DetachedTransportQueue(2, 2); // cap 4
		const gate: Array<() => void> = [];
		expect(q.tryReserveReply()).toBe(true); // committed 1
		const r = q.submitRejection(
			() => new Promise<string>((res) => gate.push(() => res("r"))),
		);
		expect(r.disposition).toBe("started"); // committed 2
		// fill to cap with two more reservations, then a rejection must drop
		expect(q.tryReserveReply()).toBe(true);
		expect(q.tryReserveReply()).toBe(true);
		expect(q.submitRejection(() => Promise.resolve("x")).disposition).toBe(
			"dropped",
		);
		while (gate.length > 0) gate.shift()?.();
		await r.done;
	});
});

describe("DetachedTransportQueue global commitment invariant (R3)", () => {
	test("20 reserved + rejection flood never exceeds 20 live/waiting transports", async () => {
		const q = new DetachedTransportQueue(4, 16);
		const gate: Array<() => void> = [];
		const pending = (name: string) => () =>
			new Promise<string>((res) => gate.push(() => res(name)));

		for (let i = 0; i < 20; i++) expect(q.tryReserveReply()).toBe(true);
		expect(q.tryReserveReply()).toBe(false);
		// with commitment at cap, courtesy rejections drop even with free active slots
		expect(q.submitRejection(pending("rej")).disposition).toBe("dropped");

		const subs = [];
		for (let i = 0; i < 20; i++)
			subs.push(q.submitReservedReply(pending(`r${i}`)));
		expect(q.activeCount).toBe(4);
		expect(q.queuedCount).toBe(16); // reply queue never exceeds maxQueued
		expect(q.activeCount + q.queuedCount + q.reservedCount).toBeLessThanOrEqual(
			20,
		);

		while (gate.length > 0 || q.activeCount > 0 || q.queuedCount > 0) {
			const release = gate.shift();
			if (release) release();
			await Promise.resolve();
		}
		await Promise.all(subs.map((s) => s.done));
		expect(q.activeCount + q.queuedCount + q.reservedCount).toBe(0);
	});
});
