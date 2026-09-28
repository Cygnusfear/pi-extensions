import { afterAll, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * pe-jy0szn6e F1: the async process-table probe must report NO OBSERVATION when
 * `ps` fails, never an empty table. Resolving [] made every pid derive
 * rootAlive:false, and the activity poll then settled every worker older than the
 * cache TTL on a single transient execFile failure (EMFILE/fork pressure — the
 * nightly-spawn regime that produced the original premature-exit bug). The sync
 * path has always returned null for this reason; the two paths must agree, and a
 * failure must not be cached as if it were a reading.
 *
 * The failure is produced by a real failing `ps` (a stub earlier on PATH), not by
 * mocking node:child_process: a module mock registered here leaks into every later
 * test file in the same bun process. An empty PATH is no good either — posix_spawnp
 * falls back to a default search path, so `ps` still runs.
 */

const ORIGINAL_PATH = process.env.PATH;
const stubDir = mkdtempSync(join(tmpdir(), "teams-fake-ps-"));
writeFileSync(join(stubDir, "ps"), "#!/bin/sh\nexit 1\n");
chmodSync(join(stubDir, "ps"), 0o755);

afterAll(() => {
  if (ORIGINAL_PATH === undefined) delete process.env.PATH;
  else process.env.PATH = ORIGINAL_PATH;
});

const { sampleWorkerProcessSnapshotAsync } = await import("./activity.ts");

// Runs FIRST on purpose: the module's table cache starts empty, so this case
// cannot be masked by a reading cached from an earlier call.
test("a failed ps is NO observation, not an empty table", async () => {
  process.env.PATH = stubDir;
  const snapshot = await sampleWorkerProcessSnapshotAsync(4242);
  expect(snapshot).toBeNull();
});

test("ps recovering yields a snapshot again: the failure was not cached as a reading", async () => {
  process.env.PATH = ORIGINAL_PATH;
  const snapshot = await sampleWorkerProcessSnapshotAsync(process.pid);
  expect(snapshot).not.toBeNull();
});
