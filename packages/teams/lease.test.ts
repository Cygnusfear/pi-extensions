import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildLeaderLeasePath, isLeaderLeaseStale, writeLeaderLease } from "./lease.ts";

const cleanup: string[] = [];

afterEach(() => {
	for (const p of cleanup.splice(0)) {
		try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
	}
});

describe("teams leader lease", () => {
	test("buildLeaderLeasePath is stable for the same leader session file", () => {
		const repoRoot = "/tmp/repo";
		const sessionFile = "/tmp/sessions/a.jsonl";
		expect(buildLeaderLeasePath(repoRoot, sessionFile)).toBe(buildLeaderLeasePath(repoRoot, sessionFile));
	});

	test("lease becomes stale only after ttl", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-lease-"));
		cleanup.push(dir);
		const leaseFile = path.join(dir, "lease.json");
		writeLeaderLease(leaseFile, { leaderSessionFile: "/tmp/a.jsonl" });
		expect(isLeaderLeaseStale(leaseFile, Date.now(), 10_000)).toBe(false);
		expect(isLeaderLeaseStale(leaseFile, Date.now() + 20_000, 10_000)).toBe(true);
	});
});
