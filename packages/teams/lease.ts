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
