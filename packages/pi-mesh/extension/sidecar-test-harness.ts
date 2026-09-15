/**
 * Shared teardown and hermeticity helpers for pi-mesh tests that start a REAL
 * PiMesh against `fake-sidecar.ts` (kal-x2akvjnh).
 *
 * WHY THE KILL BELONGS HERE, NOT IN PiMesh#stop()
 * -----------------------------------------------
 * `PiMesh#stop()` deliberately does not kill the sidecar: in production it is a
 * machine singleton that other sessions may still be connected to, so a client
 * that merely disconnects must not tear the mesh down for everyone. That is
 * correct and stays as it is.
 *
 * A test HOME is not shared. So a test that calls only `stop()` orphans the
 * sidecar its own private HOME spawned, permanently - and each orphan keeps
 * re-creating the temp HOME that teardown deleted, because the fixture
 * `mkdirSync`s its out dir at startup. `pi-mesh.who-announce.test.ts` leaked
 * exactly this way, and hid it behind a bare `catch {}` around `stop()`.
 *
 * HERMETICITY - CORRECTED RECORD (kal-x2akvjnh point 4)
 * -----------------------------------------------------
 * This ticket was opened on my report that leaked fixtures "announce as phantom
 * peers on the LAN". That part was WRONG, and the correction matters for how
 * point 4 is carried out:
 *
 *   - `fake-sidecar.ts` never touches a multicast transport. It is a
 *     `node:net` server bound to `<HOME>/.pi/mesh.sock` (see its createServer /
 *     server.listen(sockPath)), and it only RECORDS the zenoh config argv to
 *     `last-config.json` - it does not act on `scouting`. A leaked fake
 *     therefore cannot join the mesh. The leak is real (processes, sockets,
 *     temp dirs) but its blast radius is the box, not the LAN.
 *   - The only tests that spawn the REAL native sidecar are in
 *     `pi-mesh.native-singleton.test.ts`, which already passes SCOUTING_OFF for
 *     every spawn and never calls `PiMesh#start()`. Audited as part of this
 *     ticket: no test in the suite can bring up a native daemon with scouting
 *     enabled.
 *
 * So fixtures still pin `scouting: false` where that is free of test intent
 * (defence in depth if a fixture is ever swapped for the real daemon), but
 * `pi-mesh.sidecar-lifecycle.test.ts` intentionally asserts
 * `scouting: true` pass-through via CONFIG_A/EXPECTED_ZENOH_A, and that
 * assertion is load-bearing coverage - it is deliberately left alone.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** One test's fake-sidecar HOME, as created by each file's makeRoot(). */
export interface ReapableRoot {
  /** Absolute path of the sidecar script spawned for this root. */
  fakePath: string;
  /** The temp HOME created for this root; removed during reaping. */
  home: string;
}

export interface ReapableMesh {
  stop(): void;
}

const SETTLE_TIMEOUT_MS = 2_000;
const SETTLE_POLL_MS = 20;

/** A HOME older than this cannot belong to a test still running (budgets are
 *  10-25s), so it is safe to treat as abandoned. */
export const STALE_HOME_MAX_AGE_MS = 10 * 60_000;

export function pidFileOf(home: string): string {
  return join(home, ".pi", "mesh.pid");
}

/** The pid the sidecar recorded for itself, or null if there is no usable one. */
export function sidecarPid(home: string): number | null {
  try {
    const pid = parseInt(readFileSync(pidFileOf(home), "utf8").trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/**
 * PIDs whose command line references `scriptPath` (excluding this process).
 *
 * Matching on the per-root script path - not on "sidecar" - is what makes this
 * safe while other tests or another session's suite are live: each root's
 * fixture lives under its own unique mkdtemp HOME, so a query can only ever
 * return this test's own processes.
 */
export function pidsForScript(scriptPath: string): number[] {
  try {
    const escaped = scriptPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const raw = execFileSync("pgrep", ["-f", escaped]).toString();
    return raw
      .split("\n")
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch {
    return [];
  }
}

/** True when `pid` is running a command line that references `scriptPath`. */
function pidRunsScript(pid: number, scriptPath: string): boolean {
  try {
    return execFileSync("ps", ["-o", "command=", "-p", String(pid)]).toString().includes(scriptPath);
  } catch {
    return false;
  }
}

/**
 * Every pid attributable to this root: the pid it recorded for itself, plus any
 * other process running its unique fixture script.
 *
 * The pidfile is the exact answer (point 1: track the spawned pid), but a stale
 * pidfile can name a pid the OS has since recycled onto an unrelated process.
 * So the recorded pid is only killed after its command line is confirmed to
 * reference this root's fixture, and the per-root script scan covers holders the
 * pidfile missed (e.g. a lock-retry successor).
 */
export function attributablePids(root: ReapableRoot): number[] {
  const pids = new Set(pidsForScript(root.fakePath));
  const recorded = sidecarPid(root.home);
  if (recorded !== null && pidRunsScript(recorded, root.fakePath)) pids.add(recorded);
  return [...pids];
}

/** SIGKILL a set of pids, tolerating ones that already exited. */
export function killPids(pids: readonly number[]): void {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone: that is the desired end state.
    }
  }
}

/**
 * Narrow to pids still executing.
 *
 * A SIGKILLed child its parent has not reaped is a zombie: still listed by
 * pgrep, still answering `process.kill(pid, 0)`, but holding no socket and no
 * listener. Counting one as a survivor would make teardown flaky for the wrong
 * reason, while a live peer is reported honestly.
 */
function livePids(pids: readonly number[]): number[] {
  if (pids.length === 0) return [];
  let report = "";
  try {
    report = execFileSync("ps", ["-o", "pid=,state=", "-p", pids.join(",")]).toString();
  } catch {
    return [];
  }
  const alive: number[] = [];
  for (const line of report.split("\n")) {
    const parsed = /^\s*(\d+)\s+(\S+)\s*$/.exec(line);
    if (parsed && !parsed[2].includes("Z")) alive.push(Number(parsed[1]));
  }
  return alive;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Remove abandoned test HOMEs left by earlier crashed or leaking runs.
 *
 * Call this once at suite start. It is deliberately narrow, because the temp-dir
 * prefix is SHARED by concurrent runs on this machine - several agents run this
 * suite at once - so an unconditional sweep would delete another live session's
 * in-flight HOME and turn someone else's green test into a rare red one.
 *
 * A directory is removed only when BOTH hold:
 *   1. it is older than STALE_HOME_MAX_AGE_MS (no live test can still be using
 *      it: per-test budgets are 10-25s), and
 *   2. no live process references it (its fixture is not running).
 * Anything else is left for the run that owns it.
 */
export function sweepStaleSidecarHomes(prefix: string): string[] {
  const root = tmpdir();
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return [];
  }
  const cutoff = Date.now() - STALE_HOME_MAX_AGE_MS;
  const removed: string[] = [];
  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const home = join(root, name);
    try {
      if (statSync(home).mtimeMs > cutoff) continue;           // recent: some run may own it
    } catch {
      continue;
    }
    if (pidsForScript(home).length > 0) continue;              // a live fixture still holds it
    try {
      rmSync(home, { recursive: true, force: true });
      removed.push(home);
    } catch {
      // Not ours to remove; leave it and let its owner clean up.
    }
  }
  return removed;
}

/**
 * Stop every mesh, kill the sidecars they spawned, wait until those kills are
 * observable, and only then remove the test HOMEs.
 *
 * `meshes` and `roots` are drained so the caller's module-level arrays cannot
 * accumulate across tests.
 *
 * A `stop()` failure is no longer swallowed: it is collected and rethrown, so a
 * broken stop fails the test. It does NOT short-circuit the kill, because the
 * kill is the step that actually prevents the leak. HOMEs are removed even when
 * the run reports a problem, so a teardown error can never itself become a
 * temp-dir leak.
 */
export async function reapSidecars(opts: {
  meshes: ReapableMesh[];
  roots: ReapableRoot[];
}): Promise<void> {
  const stopErrors: unknown[] = [];
  for (const mesh of opts.meshes.splice(0)) {
    try {
      mesh.stop();
    } catch (error) {
      stopErrors.push(error);
    }
  }

  const collected = opts.roots.splice(0);
  for (const root of collected) killPids(attributablePids(root));

  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  let survivors: number[] = [];
  for (;;) {
    survivors = livePids(collected.flatMap((root) => attributablePids(root)));
    if (survivors.length === 0 || Date.now() >= deadline) break;
    await sleep(SETTLE_POLL_MS);
  }

  for (const root of collected) {
    if (existsSync(root.home)) rmSync(root.home, { recursive: true, force: true });
  }

  const problems: string[] = [];
  if (survivors.length > 0) {
    problems.push(
      `${String(survivors.length)} fake sidecar(s) survived teardown: ${survivors.join(", ")} ` +
        "- their HOMEs were removed, so kill these pids before trusting this run.",
    );
  }
  for (const error of stopErrors) {
    problems.push(`PiMesh#stop() threw during teardown: ${String((error as Error)?.message ?? error)}`);
  }
  if (problems.length > 0) {
    throw new Error("pi-mesh test leak guard (kal-x2akvjnh): " + problems.join(" | "));
  }
}
