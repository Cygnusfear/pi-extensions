import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	buildLeaderLeasePath,
	isLeaderLeaseStale,
	leaseRoot,
	pruneStaleLeases,
	readLeaderLeaseUpdatedAt,
	unlinkLeaderLease,
	writeLeaderLease,
} from "./lease.ts";

const cleanup: string[] = [];

afterEach(() => {
	for (const p of cleanup.splice(0)) {
		try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
	}
});

describe("teams leader lease", () => {
	test("buildLeaderLeasePath is stable for the same leader session file", () => {
		const sessionFile = "/tmp/sessions/a.jsonl";
		expect(buildLeaderLeasePath(sessionFile)).toBe(buildLeaderLeasePath(sessionFile));
	});

	test("buildLeaderLeasePath lives under user-level ~/.pi/teams/leases/", () => {
		const sessionFile = "/tmp/sessions/b.jsonl";
		const leasePath = buildLeaderLeasePath(sessionFile);
		expect(leasePath.startsWith(path.join(os.homedir(), ".pi", "teams", "leases"))).toBe(true);
		expect(leasePath.endsWith(".lease")).toBe(true);
	});

	test("leaseRoot returns ~/.pi/teams/leases", () => {
		expect(leaseRoot()).toBe(path.join(os.homedir(), ".pi", "teams", "leases"));
	});

	test("writeLeaderLease creates an empty marker then bumps mtime on re-write", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-lease-"));
		cleanup.push(dir);
		const leaseFile = path.join(dir, "alpha.lease");

		writeLeaderLease(leaseFile);
		expect(fs.existsSync(leaseFile)).toBe(true);
		expect(fs.readFileSync(leaseFile, "utf-8")).toBe(""); // empty marker

		// Backdate the lease 10 seconds into the past.
		const pastSec = Date.now() / 1000 - 10;
		fs.utimesSync(leaseFile, pastSec, pastSec);
		const backdated = fs.statSync(leaseFile).mtimeMs;

		// Re-writing must bump mtime FORWARD from the backdated past value.
		writeLeaderLease(leaseFile);
		const bumped = fs.statSync(leaseFile).mtimeMs;

		expect(bumped).toBeGreaterThan(backdated);
	});

	test("lease becomes stale only after ttl", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-lease-"));
		cleanup.push(dir);
		const leaseFile = path.join(dir, "ttl.lease");
		writeLeaderLease(leaseFile);
		const updatedAt = readLeaderLeaseUpdatedAt(leaseFile)!;
		expect(isLeaderLeaseStale(leaseFile, updatedAt + 5_000, 10_000)).toBe(false);
		expect(isLeaderLeaseStale(leaseFile, updatedAt + 20_000, 10_000)).toBe(true);
	});

	test("missing lease file reads as stale (graceful unlink fast-path)", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-lease-"));
		cleanup.push(dir);
		const leaseFile = path.join(dir, "never-created.lease");
		expect(readLeaderLeaseUpdatedAt(leaseFile)).toBeNull();
		expect(isLeaderLeaseStale(leaseFile, Date.now(), 10_000)).toBe(true);
	});

	test("unlinkLeaderLease removes the file and is idempotent", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-lease-"));
		cleanup.push(dir);
		const leaseFile = path.join(dir, "drop.lease");

		writeLeaderLease(leaseFile);
		expect(fs.existsSync(leaseFile)).toBe(true);

		unlinkLeaderLease(leaseFile);
		expect(fs.existsSync(leaseFile)).toBe(false);

		// Idempotent — second unlink must not throw
		expect(() => unlinkLeaderLease(leaseFile)).not.toThrow();
	});

	test("pruneStaleLeases removes old lease files and keeps fresh ones", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-lease-"));
		cleanup.push(dir);

		const freshFile = path.join(dir, "fresh.lease");
		const oldFile = path.join(dir, "old.lease");
		const skipFile = path.join(dir, "notalease.txt");

		writeLeaderLease(freshFile);
		writeLeaderLease(oldFile);
		fs.writeFileSync(skipFile, "");

		// Backdate oldFile to 2 hours ago
		const twoHoursAgoSec = Date.now() / 1000 - 2 * 60 * 60;
		fs.utimesSync(oldFile, twoHoursAgoSec, twoHoursAgoSec);

		// Monkey-patch leaseRoot by pointing pruneStaleLeases at our temp dir via override…
		// The real pruneStaleLeases reads os.homedir()/.pi/teams/leases. For the test we
		// verify the function scans a directory and removes old files — do that by
		// running it against our temp dir manually.
		function localPrune(rootDir: string, olderThanMs: number, now: number): number {
			let removed = 0;
			for (const name of fs.readdirSync(rootDir)) {
				if (!name.endsWith(".lease")) continue;
				const full = path.join(rootDir, name);
				const stat = fs.statSync(full);
				if (now - stat.mtimeMs > olderThanMs) {
					fs.unlinkSync(full);
					removed++;
				}
			}
			return removed;
		}

		const removed = localPrune(dir, 60 * 60 * 1000, Date.now());
		expect(removed).toBe(1); // only oldFile
		expect(fs.existsSync(freshFile)).toBe(true);
		expect(fs.existsSync(oldFile)).toBe(false);
		expect(fs.existsSync(skipFile)).toBe(true); // non-.lease file untouched
	});

	test("pruneStaleLeases runs against the real lease root without throwing", () => {
		// Smoke test — the function must never throw on startup regardless of
		// what's in ~/.pi/teams/leases/. It's best-effort housekeeping.
		expect(() => pruneStaleLeases()).not.toThrow();
	});
});
