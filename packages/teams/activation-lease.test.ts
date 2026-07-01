import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	ACTIVATION_LEASE_STALE_AFTER_MS,
	activationLeaseRoot,
	buildActivationLeasePath,
	commitActivationLease,
	isActivationLeaseHeldLive,
	readActivationLease,
	releaseActivationLease,
	tryAcquireActivationLease,
} from "./lease.ts";

const cleanup: string[] = [];
let counter = 0;
/** Unique session file per test → unique lease path → no cross-test collision. */
function uniqueSessionFile(): string {
	const f = path.join(os.tmpdir(), `v1c-activation-${process.pid}-${Date.now()}-${counter++}`, "session.jsonl");
	cleanup.push(buildActivationLeasePath(f));
	return f;
}
const ALIVE = () => true;
const DEAD = () => false;

afterEach(() => {
	for (const p of cleanup.splice(0)) {
		try { fs.rmSync(p, { force: true }); } catch {}
	}
});

describe("activation lease — single live incarnation per durable session", () => {
	test("buildActivationLeasePath is stable + lives under ~/.pi/teams/activation/", () => {
		const s = "/tmp/x/session.jsonl";
		expect(buildActivationLeasePath(s)).toBe(buildActivationLeasePath(s));
		expect(buildActivationLeasePath(s).startsWith(activationLeaseRoot())).toBe(true);
		expect(activationLeaseRoot()).toBe(path.join(os.homedir(), ".pi", "teams", "activation"));
	});

	test("acquires a fresh session file", () => {
		const s = uniqueSessionFile();
		const r = tryAcquireActivationLease(s, 1111, { isAlive: ALIVE });
		expect(r.acquired).toBe(true);
		expect(typeof r.epoch).toBe("string");
		const rec = readActivationLease(s);
		expect(rec!.reserverPid).toBe(1111);
		expect(rec!.workerPid).toBeUndefined();
	});

	test("CONCURRENT resume (same process) — exactly one wins, the other refuses", () => {
		const s = uniqueSessionFile();
		// tryAcquire is synchronous (openSync wx), so two calls serialise: first
		// wins the exclusive create, second sees a live reservation → refuses.
		const first = tryAcquireActivationLease(s, process.pid, { isAlive: ALIVE });
		const second = tryAcquireActivationLease(s, process.pid, { isAlive: ALIVE });
		expect(first.acquired).toBe(true);
		expect(second.acquired).toBe(false);
		expect(second.heldBy?.epoch).toBe(first.epoch);
		// The lease on disk is the FIRST winner's — session.jsonl has one owner.
		expect(readActivationLease(s)!.epoch).toBe(first.epoch);
	});

	test("a LIVE committed holder blocks a second resume (single-activation-while-live)", () => {
		const s = uniqueSessionFile();
		const a = tryAcquireActivationLease(s, 2000, { isAlive: ALIVE });
		commitActivationLease(s, a.epoch!, 2001); // worker pid 2001, alive
		const b = tryAcquireActivationLease(s, 3000, { isAlive: ALIVE });
		expect(b.acquired).toBe(false);
		expect(b.heldBy?.workerPid).toBe(2001);
	});

	test("a DEAD worker's lease is stolen by a standard revive (orphan = kill + revive)", () => {
		const s = uniqueSessionFile();
		const a = tryAcquireActivationLease(s, 4000, { isAlive: ALIVE });
		commitActivationLease(s, a.epoch!, 4001);
		// The worker (4001) has died — a dead-coordinator scenario killed it.
		const revive = tryAcquireActivationLease(s, 5000, { isAlive: (pid) => pid !== 4001 });
		expect(revive.acquired).toBe(true);
		expect(revive.epoch).not.toBe(a.epoch);
		expect(readActivationLease(s)!.reserverPid).toBe(5000);
	});

	test("a stale RESERVATION (reserver dead) is stealable; a fresh one is not", () => {
		const s = uniqueSessionFile();
		const a = tryAcquireActivationLease(s, 6000, { isAlive: ALIVE });
		expect(a.acquired).toBe(true);
		// Reserver 6000 died before committing → stealable.
		const steal = tryAcquireActivationLease(s, 7000, { isAlive: (pid) => pid !== 6000 });
		expect(steal.acquired).toBe(true);

		// Fresh reservation with a live reserver → NOT stealable.
		const s2 = uniqueSessionFile();
		tryAcquireActivationLease(s2, 8000, { isAlive: ALIVE });
		const blocked = tryAcquireActivationLease(s2, 9000, { isAlive: ALIVE });
		expect(blocked.acquired).toBe(false);
	});

	test("commit records the worker pid + verifies the epoch (stale holder can't clobber)", () => {
		const s = uniqueSessionFile();
		const a = tryAcquireActivationLease(s, 100, { isAlive: ALIVE });
		expect(commitActivationLease(s, a.epoch!, 200)).toBe(true);
		const rec = readActivationLease(s);
		expect(rec!.workerPid).toBe(200);
		expect(typeof rec!.committedAt).toBe("number");
		// Wrong epoch → refused.
		expect(commitActivationLease(s, "not-the-epoch", 999)).toBe(false);
		expect(readActivationLease(s)!.workerPid).toBe(200);
	});

	test("release unlinks only when the epoch matches (fencing)", () => {
		const s = uniqueSessionFile();
		const a = tryAcquireActivationLease(s, 100, { isAlive: ALIVE });
		expect(releaseActivationLease(s, "wrong")).toBe(false);
		expect(readActivationLease(s)).not.toBeNull();
		expect(releaseActivationLease(s, a.epoch!)).toBe(true);
		expect(readActivationLease(s)).toBeNull();
		// After release, a fresh acquire succeeds (revive re-acquisition).
		expect(tryAcquireActivationLease(s, 101, { isAlive: ALIVE }).acquired).toBe(true);
	});

	test("isActivationLeaseHeldLive reflects committed-alive / committed-dead / stale-reservation", () => {
		const s = uniqueSessionFile();
		expect(isActivationLeaseHeldLive(s, { isAlive: ALIVE })).toBe(false); // no lease
		const a = tryAcquireActivationLease(s, 10, { isAlive: ALIVE });
		commitActivationLease(s, a.epoch!, 11);
		expect(isActivationLeaseHeldLive(s, { isAlive: ALIVE })).toBe(true);
		expect(isActivationLeaseHeldLive(s, { isAlive: DEAD })).toBe(false); // worker dead
	});

	test("reservation staleness backstop uses ACTIVATION_LEASE_STALE_AFTER_MS", () => {
		const s = uniqueSessionFile();
		const now = 1_000_000;
		tryAcquireActivationLease(s, 42, { isAlive: ALIVE, now });
		// Same alive reserver, but far in the future → the reservation is stale → stealable.
		const later = now + ACTIVATION_LEASE_STALE_AFTER_MS + 1;
		const steal = tryAcquireActivationLease(s, 43, { isAlive: ALIVE, now: later });
		expect(steal.acquired).toBe(true);
	});
});
