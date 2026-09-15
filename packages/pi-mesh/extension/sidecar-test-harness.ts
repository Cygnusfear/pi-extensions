/**
 * Shared teardown for pi-mesh tests that start a REAL PiMesh against
 * `fake-sidecar.ts`.
 *
 * WHY THIS EXISTS (it is not a convenience refactor)
 * --------------------------------------------------
 * `PiMesh#stop()` deliberately does NOT kill the sidecar: in production the
 * sidecar is a machine singleton that other sessions may still be connected
 * to, so a client that merely disconnects must not tear the mesh down from
 * under everyone else. That is correct product behaviour and it stays as is.
 *
 * A test HOME is not shared. So a test that copies this harness shape and
 * calls only `stop()` orphans its own sidecar process permanently. That is a
 * real leak, not a cosmetic one: every orphan keeps a socket, a temp HOME and
 * — under the default V1 machine config, where `scouting` is `true` — a live
 * multicast scouting listener, which means an abandoned test fixture
 * advertises itself on the same LAN mesh as real sessions.
 *
 * `pi-mesh.who-announce.test.ts` did exactly that, and its teardown hid the
 * failure behind a bare `catch {}` around `stop()`, so nothing ever surfaced.
 *
 * Therefore: killing belongs HERE, in test teardown; it belongs in ONE place so
 * the next copy of this pattern cannot silently drop it again; and it is
 * fail-loud, because a kill that did not land must fail the run instead of
 * quietly growing the pile.
 */
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

/** One test's fake-sidecar HOME, as created by each file's makeRoot(). */
export interface ReapableRoot {
  /** Absolute path of the sidecar script that was spawned for this root. */
  fakePath: string;
  /** The temp HOME created for this root; removed during reaping. */
  home: string;
}

/** Anything with a stop() — structurally, PiMesh. */
export interface ReapableMesh {
  stop(): void;
}

/** How long to wait for SIGKILLed sidecars to disappear before declaring a leak. */
const SETTLE_TIMEOUT_MS = 2_000;
const SETTLE_POLL_MS = 20;

/**
 * PIDs whose command line references `scriptPath`.
 *
 * Matching on the per-root script path (not on "sidecar") is what keeps this
 * safe to run while other tests, or another session's suite, are live: each
 * root's `fake-sidecar.ts` lives under its own unique mkdtemp HOME, so a query
 * can only ever hit this test's own processes.
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
 * Narrow to pids that are still executing.
 *
 * A SIGKILLed child that its parent has not reaped yet is a zombie: it is
 * still listed by pgrep and still answers `process.kill(pid, 0)`, but it holds
 * no socket, no HOME and no multicast listener. Treating one as a survivor
 * would make teardown flaky for the wrong reason, while a live peer would be
 * reported honestly.
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
    if (!parsed) continue;
    if (!parsed[2].includes("Z")) alive.push(Number(parsed[1]));
  }
  return alive;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stop every mesh, kill the sidecars they spawned, wait until those kills are
 * observable, and only then remove the test HOMEs.
 *
 * `meshes` and `roots` are drained (spliced) so the caller's module-level arrays
 * cannot accumulate across tests. `stop()` failures are tolerated *only* because
 * the kill below is what actually prevents the leak — but unlike the bare
 * `catch {}` this replaces, a failed kill is not tolerated: it throws.
 *
 * HOMEs are removed even when a survivor is found, so a teardown error can
 * never itself become a temp-dir leak.
 */
export async function reapSidecars(opts: {
  meshes: ReapableMesh[];
  roots: ReapableRoot[];
}): Promise<void> {
  for (const mesh of opts.meshes.splice(0)) {
    try {
      mesh.stop();
    } catch {
      // Swallowed on purpose: stop() must not be able to skip the kill below.
    }
  }

  const collected = opts.roots.splice(0);
  for (const root of collected) killPids(pidsForScript(root.fakePath));

  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  let survivors: number[] = [];
  for (;;) {
    survivors = livePids(collected.flatMap((root) => pidsForScript(root.fakePath)));
    if (survivors.length === 0 || Date.now() >= deadline) break;
    await sleep(SETTLE_POLL_MS);
  }

  for (const root of collected) rmSync(root.home, { recursive: true, force: true });

  if (survivors.length > 0) {
    throw new Error(
      `pi-mesh test leak: ${String(survivors.length)} fake sidecar(s) survived teardown: ` +
        `${survivors.join(", ")}. Their HOMEs were removed, so kill these pids ` +
        "before trusting this run — a survivor still holds a live multicast listener.",
    );
  }
}
