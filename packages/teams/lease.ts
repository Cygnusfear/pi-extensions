import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const LEASE_HEARTBEAT_INTERVAL_MS = 2_000;
// Give /reload and slow extension restart paths plenty of room before workers
// self-terminate, while still eventually killing orphans if the coordinator dies.
export const LEASE_STALE_AFTER_MS = 45_000;

export function buildLeaderLeasePath(repoRoot: string, leaderSessionFile: string): string {
	const key = crypto.createHash("sha1").update(leaderSessionFile).digest("hex").slice(0, 16);
	return path.join(repoRoot, ".pi", "teams", "leader-leases", `${key}.json`);
}

export function writeLeaderLease(leaseFile: string, payload?: Record<string, unknown>): void {
	fs.mkdirSync(path.dirname(leaseFile), { recursive: true });
	fs.writeFileSync(
		leaseFile,
		JSON.stringify({ updatedAt: Date.now(), ...(payload ?? {}) }),
		"utf-8",
	);
}

export function readLeaderLeaseUpdatedAt(leaseFile: string): number | null {
	try {
		const raw = fs.readFileSync(leaseFile, "utf-8");
		const data = JSON.parse(raw) as { updatedAt?: number };
		return typeof data.updatedAt === "number" ? data.updatedAt : null;
	} catch {
		return null;
	}
}

export function isLeaderLeaseStale(
	leaseFile: string,
	now = Date.now(),
	staleAfterMs = LEASE_STALE_AFTER_MS,
): boolean {
	const updatedAt = readLeaderLeaseUpdatedAt(leaseFile);
	if (updatedAt === null) return true;
	return now - updatedAt > staleAfterMs;
}
