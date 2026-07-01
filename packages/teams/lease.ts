/**
 * Teams leader-alive dead-man's switch.
 *
 * Why this exists: /reload, crashes, SIGKILL, and OOM can leave workers
 * orphaned — their coordinator pi process is dead but the worker is still
 * running with no one watching. We need a PASSIVE timeout mechanism: a signal
 * the leader stops updating when it dies. File mtime on a dedicated lease
 * file is the simplest, most robust dead-man's switch we have.
 *
 * Why a dedicated file instead of the leader's session file mtime: the leader's
 * session file only gets written on observable state changes. During long idle
 * windows (e.g. a worker running a 15-minute `cargo build`), the session file
 * mtime freezes and would trigger false-positive worker suicides. A dedicated
 * 5-second heartbeat timer is decoupled from any business logic.
 *
 * Location: `~/.pi/teams/leases/<sha1(leaderSessionFile)>.lease`
 *   - User-level, never in the repo tree → no gitignore pollution
 *   - Keyed by a stable hash of the leader's session file path → survives /reload
 *   - Opportunistic cleanup on leader startup prunes stale entries (>1h old)
 *
 * Mechanism:
 *   - File is an EMPTY marker. The only signal is its mtime.
 *   - Leader `touch`es it every 5s via `fs.utimesSync` (atomic, one syscall).
 *   - Worker `fs.statSync`'s it every 3s and compares `mtimeMs` to `Date.now()`.
 *   - Leader `fs.unlinkSync`s it on clean shutdown → worker sees missing file
 *     and exits immediately (fast graceful path, optional).
 *   - Worker treats "missing" and "stale" identically: leader is gone, self-terminate.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** How often the leader bumps the lease file's mtime. */
export const LEASE_HEARTBEAT_INTERVAL_MS = 5_000;

/**
 * How long a lease can go un-touched before a worker declares the leader dead.
 * Give /reload + slow extension restart paths plenty of room before workers
 * self-terminate, while still eventually killing orphans if the coordinator
 * dies for real.
 */
export const LEASE_STALE_AFTER_MS = 45_000;

/** Opportunistic cleanup threshold — leases older than this get pruned on leader startup. */
export const LEASE_PRUNE_AFTER_MS = 60 * 60 * 1000; // 1 hour

/** Root directory for all lease files. User-level, one for every pi install. */
export function leaseRoot(): string {
	return path.join(os.homedir(), ".pi", "teams", "leases");
}

/** Build the lease file path for a given leader session file. Stable hash → same key across reloads. */
export function buildLeaderLeasePath(leaderSessionFile: string): string {
	const key = crypto.createHash("sha1").update(leaderSessionFile).digest("hex").slice(0, 16);
	return path.join(leaseRoot(), `${key}.lease`);
}

/**
 * Write or touch the lease file. First call creates an empty marker, subsequent
 * calls bump mtime via utimesSync (atomic single syscall, no parse/stringify).
 */
export function writeLeaderLease(leaseFile: string): void {
	fs.mkdirSync(path.dirname(leaseFile), { recursive: true });
	try {
		// Fast path: file already exists, just bump mtime.
		const now = Date.now() / 1000;
		fs.utimesSync(leaseFile, now, now);
	} catch {
		// Slow path: file doesn't exist yet. Create an empty marker.
		fs.writeFileSync(leaseFile, "", "utf-8");
	}
}

/**
 * Graceful fast-path: leader unlinks its own lease on clean shutdown so workers
 * don't have to wait for the staleness timeout. Safe to call multiple times.
 */
export function unlinkLeaderLease(leaseFile: string): void {
	try {
		fs.unlinkSync(leaseFile);
	} catch {
		// already gone, or never existed — fine
	}
}

/** Read the lease's last-updated time, in ms. Returns null if the file is missing or unreadable. */
export function readLeaderLeaseUpdatedAt(leaseFile: string): number | null {
	try {
		return fs.statSync(leaseFile).mtimeMs;
	} catch {
		return null;
	}
}

/**
 * Is the lease stale? Returns true if the file is missing OR its mtime is older
 * than `staleAfterMs`. Missing is treated as stale so clean-shutdown unlink works
 * as a fast-path for workers.
 */
export function isLeaderLeaseStale(
	leaseFile: string,
	now = Date.now(),
	staleAfterMs = LEASE_STALE_AFTER_MS,
): boolean {
	const updatedAt = readLeaderLeaseUpdatedAt(leaseFile);
	if (updatedAt === null) return true;
	return now - updatedAt > staleAfterMs;
}

/**
 * Opportunistic cleanup: remove lease files older than `olderThanMs` from the
 * lease root. Called once on leader startup to keep the directory from
 * accumulating zombies over months of use.
 *
 * Failures during pruning are swallowed — this is best-effort housekeeping,
 * never block startup on it.
 */
export function pruneStaleLeases(olderThanMs = LEASE_PRUNE_AFTER_MS, now = Date.now()): number {
	const dir = leaseRoot();
	let removed = 0;
	try {
		if (!fs.existsSync(dir)) return 0;
		for (const name of fs.readdirSync(dir)) {
			if (!name.endsWith(".lease")) continue;
			const full = path.join(dir, name);
			try {
				const stat = fs.statSync(full);
				if (now - stat.mtimeMs > olderThanMs) {
					fs.unlinkSync(full);
					removed++;
				}
			} catch {
				// per-file errors are fine
			}
		}
	} catch {
		// dir read errors are fine
	}
	return removed;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVATION LEASE (v1c) — single live incarnation per durable session
// ═══════════════════════════════════════════════════════════════════════════
//
// The leader lease above is a dead-man's switch (workers self-terminate when
// their coordinator dies). The ACTIVATION lease is a different authority: it
// governs the ONE live incarnation of a durable SESSION and GATES revive
// re-acquisition — a revive must acquire it before spawning `pi --session
// <file>` (contract pe-jimphzxj, council amendment D + M3).
//
// Why it exists: two concurrent resumes of the SAME session file each spawn a
// `pi --session <file>` process → concurrent appends corrupt one session.jsonl.
// The activation lease makes the first resume win and the second refuse.
//
// Keyed by the session FILE (stable + known at both spawn and resume time). The
// SINGLE SOURCE OF TRUTH for "is there a live incarnation" is holder-pid
// liveness — no heartbeat is renewed:
//   - a live worker pid   → the lease is held → a second resume refuses.
//   - a dead worker pid    → the lease is stale → a standard revive re-acquires
//                            (this IS the orphan = kill + standard-revive model:
//                            a dead coordinator's worker is killed, its pid dies,
//                            the session becomes revivable-by-anyone).
// A pre-commit RESERVATION (worker pid not yet known) is gated by reserver-pid
// liveness + a short staleness backstop, so a reserver that dies mid-spawn does
// not strand the session.
//
// The `epoch` is the fencing token: commit and release verify it, so a stale
// holder can never clobber the winner's committed lease.
//
// NOTE ON RACES: tryAcquire is SYNCHRONOUS (fs.openSync with the exclusive "wx"
// flag). Two resumes in the SAME coordinator process therefore serialise on the
// event loop — the first openSync completes before the second begins, so exactly
// one wins with no split-brain. Cross-process contention is bounded by pid
// liveness + the reservation TTL (a full distributed lock is v2).

export const ACTIVATION_LEASE_STALE_AFTER_MS = 45_000;

export interface ActivationLeaseRecord {
	/** Fencing token — unique per acquisition. */
	epoch: string;
	/** Who reserved the lease (the coordinator / activator process). */
	reserverPid: number;
	/** The live incarnation's pid — set on commit, undefined while reserving. */
	workerPid?: number;
	/** The durable session file this lease governs. */
	sessionFile: string;
	acquiredAt: number;
	committedAt?: number;
}

export interface ActivationLeaseOptions {
	/** Liveness probe (injectable for tests). Default: process.kill(pid, 0). */
	isAlive?: (pid: number) => boolean;
	now?: number;
	/** How long an un-committed reservation stays valid before it's stealable. */
	staleAfterMs?: number;
}

export function activationLeaseRoot(): string {
	return path.join(os.homedir(), ".pi", "teams", "activation");
}

/** Build the activation-lease path for a session file. Stable hash → same key
 *  across resumes of the same session. */
export function buildActivationLeasePath(sessionFile: string): string {
	const key = crypto.createHash("sha1").update(sessionFile).digest("hex").slice(0, 16);
	return path.join(activationLeaseRoot(), `${key}.lease`);
}

function defaultIsAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

function newActivationEpoch(pid: number, now: number): string {
	return `${pid}-${now}-${crypto.randomBytes(6).toString("hex")}`;
}

export function readActivationLease(sessionFile: string): ActivationLeaseRecord | null {
	try {
		const raw = fs.readFileSync(buildActivationLeasePath(sessionFile), "utf-8");
		const parsed = JSON.parse(raw) as ActivationLeaseRecord;
		if (parsed && typeof parsed.epoch === "string" && typeof parsed.reserverPid === "number") {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

/** Is the lease held by a LIVE incarnation (committed → worker pid alive) or a
 *  live+fresh reservation (uncommitted → reserver alive AND within the TTL)? */
function isActivationRecordLive(
	record: ActivationLeaseRecord,
	isAlive: (pid: number) => boolean,
	now: number,
	staleAfterMs: number,
): boolean {
	if (record.workerPid !== undefined) return isAlive(record.workerPid);
	return isAlive(record.reserverPid) && now - record.acquiredAt < staleAfterMs;
}

/** True iff a LIVE incarnation currently holds the activation lease. */
export function isActivationLeaseHeldLive(
	sessionFile: string,
	opts: ActivationLeaseOptions = {},
): boolean {
	const record = readActivationLease(sessionFile);
	if (!record) return false;
	return isActivationRecordLive(
		record,
		opts.isAlive ?? defaultIsAlive,
		opts.now ?? Date.now(),
		opts.staleAfterMs ?? ACTIVATION_LEASE_STALE_AFTER_MS,
	);
}

/**
 * Try to acquire the activation lease for a session file BEFORE spawning a
 * `pi --session <file>` incarnation. Returns { acquired, epoch } on success, or
 * { acquired: false, heldBy } when a LIVE incarnation already holds it (the
 * caller must NOT spawn — that would corrupt the shared session.jsonl).
 *
 * A dead/stale holder is stolen (its incarnation is gone), which is exactly how
 * a standard revive re-acquires an orphaned session.
 */
export function tryAcquireActivationLease(
	sessionFile: string,
	reserverPid: number = process.pid,
	opts: ActivationLeaseOptions = {},
): { acquired: boolean; epoch?: string; heldBy?: ActivationLeaseRecord } {
	const leasePath = buildActivationLeasePath(sessionFile);
	const isAlive = opts.isAlive ?? defaultIsAlive;
	const now = opts.now ?? Date.now();
	const staleAfterMs = opts.staleAfterMs ?? ACTIVATION_LEASE_STALE_AFTER_MS;
	fs.mkdirSync(path.dirname(leasePath), { recursive: true });

	const epoch = newActivationEpoch(reserverPid, now);
	const record: ActivationLeaseRecord = { epoch, reserverPid, sessionFile, acquiredAt: now };
	const serialized = JSON.stringify(record);

	// Up to 2 attempts: exclusive-create, or steal-a-dead-holder then create.
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const fd = fs.openSync(leasePath, "wx"); // atomic exclusive create
			try {
				fs.writeSync(fd, serialized);
			} finally {
				fs.closeSync(fd);
			}
			return { acquired: true, epoch };
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
			const existing = readActivationLease(sessionFile);
			if (!existing) continue; // vanished (race) — retry the create
			if (isActivationRecordLive(existing, isAlive, now, staleAfterMs)) {
				return { acquired: false, heldBy: existing }; // live incarnation → refuse
			}
			// Dead/stale holder → evict, then retry the exclusive create. The
			// create is the sole winner-determiner, so a concurrent stealer that
			// re-creates first will make our retry EEXIST → see a LIVE fresh
			// reservation → refuse.
			try {
				fs.unlinkSync(leasePath);
			} catch {
				// already gone — fine
			}
		}
	}
	return { acquired: false, heldBy: readActivationLease(sessionFile) ?? undefined };
}

/**
 * Commit a reservation to a live incarnation: record the worker pid so liveness
 * tracking follows the actual `pi` process. Verifies the epoch so a stale holder
 * cannot commit over the winner. Returns true on success.
 */
export function commitActivationLease(sessionFile: string, epoch: string, workerPid: number): boolean {
	const existing = readActivationLease(sessionFile);
	if (!existing || existing.epoch !== epoch) return false;
	const updated: ActivationLeaseRecord = { ...existing, workerPid, committedAt: Date.now() };
	const leasePath = buildActivationLeasePath(sessionFile);
	const tmp = `${leasePath}.${process.pid}.${Date.now()}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(updated), "utf-8");
	fs.renameSync(tmp, leasePath);
	return true;
}

/**
 * Release the activation lease iff we still hold it (epoch matches). Called when
 * the incarnation exits — a fast free so the next revive need not wait for the
 * staleness backstop. Idempotent.
 */
export function releaseActivationLease(sessionFile: string, epoch: string): boolean {
	const existing = readActivationLease(sessionFile);
	if (!existing || existing.epoch !== epoch) return false;
	try {
		fs.unlinkSync(buildActivationLeasePath(sessionFile));
	} catch {
		// already gone — fine
	}
	return true;
}
