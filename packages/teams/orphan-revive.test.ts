import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReviveDescriptor } from "@pi-extensions/shared/revive-descriptor";
import { DurableInboundMailbox } from "../pi-mesh/extension/durable-inbound-mailbox.ts";
import {
	isRevivable,
	readDurableDescriptor,
	writeDurableDescriptor,
} from "../pi-mesh/extension/durable-session-store.ts";
import {
	buildActivationLeasePath,
	commitActivationLease,
	readActivationLease,
	tryAcquireActivationLease,
} from "./lease.ts";

const cleanup: string[] = [];
let n = 0;
function tmp(prefix: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), `orphan-${prefix}-${n++}-`));
	cleanup.push(dir);
	return dir;
}
afterEach(() => {
	for (const dir of cleanup.splice(0)) {
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	}
});

/**
 * The v1c orphan policy (superseding "adopt"): a dead coordinator KILLS its child
 * PROCESSES; the durable SESSION persists and is REVIVABLE-BY-ANYONE via the
 * STANDARD revive path — no adopt, no lease re-key, no ticket-anchor. This proves
 * that model end-to-end over the primitives (activation lease + durable mailbox +
 * revive descriptor).
 */
describe("orphan = KILL + STANDARD-REVIVE (not adopt)", () => {
	test("a dead-coordinator worker's durable session is revivable-by-anyone; mail survives + drains FIFO", () => {
		const root = tmp("root");
		const sessionDir = tmp("session");
		const sessionFile = path.join(sessionDir, "session.jsonl");
		fs.writeFileSync(sessionFile, "");
		const durableId = "orphan-worker-durable-id";
		const DEAD_WORKER_PID = 424242;
		const OLD_COORD_PID = 111111;
		cleanup.push(buildActivationLeasePath(sessionFile));

		// ── While the worker was alive under its (now-dead) coordinator ──────────
		const held = tryAcquireActivationLease(sessionFile, OLD_COORD_PID, { isAlive: () => true });
		commitActivationLease(sessionFile, held.epoch!, DEAD_WORKER_PID);
		// The durable session record (descriptor) persists — it outlives the coordinator.
		writeDurableDescriptor(
			durableId,
			buildReviveDescriptor({
				durableId,
				sessionFile,
				cwd: sessionDir,
				command: "pi",
				args: ["--session", sessionFile],
				ticketId: "tk-orphan",
			}),
			root,
		);

		// ── Coordinator dies → its child PROCESS is killed (leaseWatchdog). The
		//    worker's pid is now DEAD. Mail is sent to it while it is down. ────────
		const mailbox = new DurableInboundMailbox(path.join(root, durableId, "mailbox.jsonl"));
		const sentAt = Date.now();
		mailbox.append({ deliveryId: "m1", fromId: "peer", senderLabel: "Peer", payload: "one", payloadText: "one", sentAt });
		mailbox.append({ deliveryId: "m2", fromId: "peer", senderLabel: "Peer", payload: "two", payloadText: "two", sentAt: sentAt + 1 });

		// ── STANDARD revive by ANYONE (new coordinator / human /resume) ──────────
		// The dead worker's stale lease is re-acquired — the SAME lease key
		// (fn(sessionFile)), a NEW epoch. NO adopt, NO re-key, NO ticket-anchor.
		const NEW_COORD_PID = 222222;
		const beforePath = buildActivationLeasePath(sessionFile);
		const revive = tryAcquireActivationLease(sessionFile, NEW_COORD_PID, {
			isAlive: (pid) => pid !== DEAD_WORKER_PID, // the killed worker is gone
		});
		expect(revive.acquired).toBe(true);
		expect(revive.epoch).not.toBe(held.epoch); // fresh epoch, not the dead one
		// Same lease key — the lease was NOT re-keyed to a ticket or a new owner.
		expect(buildActivationLeasePath(sessionFile)).toBe(beforePath);
		expect(readActivationLease(sessionFile)!.sessionFile).toBe(sessionFile);

		// The session is revivable because the descriptor persisted (record + descriptor).
		expect(isRevivable(durableId, root)).toBe(true);
		expect(readDurableDescriptor(durableId, root)!.ticketId).toBe("tk-orphan");

		// Mail sent while the worker was down SURVIVES and drains FIFO on revive.
		const { drained } = mailbox.drain();
		expect(drained.map((d) => d.deliveryId)).toEqual(["m1", "m2"]);
	});

	test("a LIVE worker is NOT stealable — orphan revive only re-acquires a genuinely dead incarnation", () => {
		const sessionDir = tmp("session");
		const sessionFile = path.join(sessionDir, "session.jsonl");
		fs.writeFileSync(sessionFile, "");
		cleanup.push(buildActivationLeasePath(sessionFile));
		const held = tryAcquireActivationLease(sessionFile, 1, { isAlive: () => true });
		commitActivationLease(sessionFile, held.epoch!, 2);
		// The worker (pid 2) is still ALIVE → a revive attempt is refused (no double-activation).
		const revive = tryAcquireActivationLease(sessionFile, 3, { isAlive: () => true });
		expect(revive.acquired).toBe(false);
		expect(revive.heldBy?.workerPid).toBe(2);
	});
});
