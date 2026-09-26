import { afterEach, describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Native singleton tests (kal-kbu1f9xy / kal-0suu3dur): the REAL sidecar
 * binary defending its own single-instance contract.
 *
 *   - Fast path: a serving sidecar → a second candidate exits 0 and leaves
 *     the winner's files untouched.
 *   - Stale-socket blind spot: a stale mesh.sock + dead pidfile must NOT read
 *     as "running" — the new sidecar cleans up and serves.
 *   - Concurrent candidates: the OS advisory lock (flock on
 *     ~/.pi/mesh.start.lock) serializes the bind phase — exactly one
 *     survives, the loser exits 0.
 *   - Broken recorded holder: pidfile pid alive but not serving → the
 *     nuke directive applies (the daemon kills the recorded holder under the
 *     lock before rebind).
 *
 * Each test runs in an isolated HOME so the machine's real ~/.pi state and
 * running sidecar are never touched. Scouting is disabled in the test config
 * so zenoh open stays local and fast. Skipped when the binary is not built.
 */

const NATIVE_BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "native", "pi-mesh");
const SCOUTING_OFF = JSON.stringify({ scouting: { multicast: { enabled: false } } });
const hasBinary = existsSync(NATIVE_BIN);

const run = hasBinary ? test : test.skip;

const homes: string[] = [];
const children: ChildProcess[] = [];

function makeHome(): string {
  const home = mkdtempSync(join(tmpdir(), "pi-mesh-native-"));
  mkdirSync(join(home, ".pi"), { recursive: true });
  homes.push(home);
  return home;
}

function sockPath(home: string): string {
  return join(home, ".pi", "mesh.sock");
}

function pidPath(home: string): string {
  return join(home, ".pi", "mesh.pid");
}

interface SpawnedSidecar {
  child: ChildProcess;
  /** Resolves when the child exits. Registered at spawn time so an early
   *  exit (e.g. a lock loser exiting 0 within ~100ms) is never missed. */
  exited: Promise<{ code: number | null }>;
}

function spawnSidecar(home: string, argv: string = SCOUTING_OFF): SpawnedSidecar {
  const child = spawn(NATIVE_BIN, [argv], {
    env: { ...process.env, HOME: home },
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr?.on("data", () => {}); // drain
  children.push(child);
  const exited = new Promise<{ code: number | null }>((resolve) => {
    child.once("exit", (code) => resolve({ code }));
  });
  return { child, exited };
}

function socketUp(p: string): Promise<boolean> {
  if (!existsSync(p)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const s = createConnection(p);
    let doneCalled = false;
    let connected = false;
    const done = (v: boolean): void => {
      if (doneCalled) return;
      doneCalled = true;
      s.destroy();
      resolve(v);
    };
    s.once("connect", () => {
      connected = true;
      done(true);
    });
    s.on("error", () => done(false));
    s.once("close", () => {
      if (!connected) done(false);
    });
  });
}

/**
 * Test-only observation window (a test assertion, not a product mechanism):
 * poll the socket until it connects or the budget is exhausted.
 */
async function waitSocketUp(home: string, budgetMs = 30000): Promise<void> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    if (await socketUp(sockPath(home))) return;
    if (Date.now() > deadline) {
      throw new Error("sidecar socket not connectable within " + budgetMs + "ms");
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Race an already-registered exit promise against a test-only budget so a
 *  hang fails with a diagnosable message instead of hanging the suite. */
function waitExit(exited: Promise<{ code: number | null }>, budgetMs = 20000): Promise<{ code: number | null }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("sidecar did not exit within " + budgetMs + "ms")),
      budgetMs,
    );
    exited.then((r) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}

function readPid(home: string): number | null {
  try {
    const pid = parseInt(readFileSync(pidPath(home), "utf8").trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function makeDeadPid(): Promise<number> {
  const dummy = spawn("bun", ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore", detached: true });
  dummy.unref();
  const pid = await waitSpawned(dummy);
  process.kill(pid, "SIGKILL");
  return pid;
}

function waitSpawned(child: ChildProcess, budgetMs = 10000): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child did not spawn within " + budgetMs + "ms")), budgetMs);
    child.once("spawn", () => {
      clearTimeout(timer);
      resolve(child.pid ?? 0);
    });
    child.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function leaveStaleSocket(p: string): Promise<void> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(p, () => resolve());
  });
  server.close(); // the file remains, no listener → ECONNREFUSED
}

afterEach(() => {
  for (const child of children.splice(0)) {
    try {
      child.kill("SIGKILL");
    } catch {}
  }
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});

describe("pi-mesh native singleton (kal-kbu1f9xy)", () => {
  run("fast path: a second candidate exits 0 while the first is serving", async () => {
    const home = makeHome();
    const first = spawnSidecar(home);
    await waitSocketUp(home);
    const firstPid = readPid(home)!;
    expect(firstPid).toBe(first.child.pid!);

    const second = spawnSidecar(home);
    const exit = await waitExit(second.exited);
    expect(exit.code).toBe(0);

    // The winner still serves and its pidfile is untouched.
    expect(alive(first.child.pid!)).toBe(true);
    expect(readPid(home)).toBe(first.child.pid);
    expect(await socketUp(sockPath(home))).toBe(true);
  });

  run("a malformed config argument refuses to start instead of silently falling back to the default", async () => {
    const home = makeHome();
    const spawned = spawnSidecar(home, '{"connect": broken json');
    const exit = await waitExit(spawned.exited, 10000);
    expect(exit.code).not.toBe(0); // refusal must be the OUTCOME, not a log line
    expect(await socketUp(sockPath(home))).toBe(false);
  });

  run("a serving daemon is respected even when mesh.pid is missing or stale (no split-brain)", async () => {
    const home = makeHome();
    const first = spawnSidecar(home);
    await waitSocketUp(home);
    const firstPid = first.child.pid!;
    expect(readPid(home)).toBe(firstPid);

    // An operator tool (my mesh-restart) or a repair path removes the pidfile
    // while the daemon serves. Requiring a live recorded pid turned a serving
    // daemon into "down", so the next candidate unlinked its socket and bound a
    // parallel one — two meshes, each with its own client set (2026-09-25).
    rmSync(pidPath(home), { force: true });
    const second = spawnSidecar(home);
    expect((await waitExit(second.exited)).code).toBe(0);
    expect(alive(firstPid)).toBe(true);
    expect(await socketUp(sockPath(home))).toBe(true);

    // Same with a recorded pid that is alive but stale: the connect probe
    // still wins over the pidfile record, so a healthy daemon is never nuked.
    const stalePid = await makeDeadPid();
    writeFileSync(pidPath(home), String(stalePid));
    const third = spawnSidecar(home);
    expect((await waitExit(third.exited)).code).toBe(0);
    expect(alive(firstPid)).toBe(true);
    expect(await socketUp(sockPath(home))).toBe(true);
  });

  run("a daemon that loses its socket path to another listener exits instead of serving a ghost mesh", async () => {
    const home = makeHome();
    const first = spawnSidecar(home);
    await waitSocketUp(home);
    const firstPid = first.child.pid!;
    expect(alive(firstPid)).toBe(true);

    // Take the path: unlink the sidecar's socket and bind our own listener —
    // the shape an operator rm plus a racing candidate produces. This daemon
    // has no idle timeout, so only lost ownership can make it exit.
    rmSync(sockPath(home), { force: true });
    const usurper = createServer();
    await new Promise<void>((resolve, reject) => {
      usurper.once("error", reject);
      usurper.listen(sockPath(home), () => resolve());
    });
    try {
      const exit = await waitExit(first.exited, 10000);
      expect(exit.code).toBe(0); // decided by ownership, not by idleness
      expect(await socketUp(sockPath(home))).toBe(true); // the path has one owner
    } finally {
      await new Promise<void>((resolve) => usurper.close(() => resolve()));
    }
  }, 15000);

  run("stale socket file + dead pidfile: the new sidecar serves instead of exiting", async () => {
    const home = makeHome();
    await leaveStaleSocket(sockPath(home));
    const deadPid = await makeDeadPid();
    writeFileSync(pidPath(home), String(deadPid));
    expect(await socketUp(sockPath(home))).toBe(false); // ECONNREFUSED

    const sidecar = spawnSidecar(home);
    await waitSocketUp(home);
    const pid = readPid(home)!;
    expect(pid).toBe(sidecar.child.pid!);
    expect(pid).not.toBe(deadPid);
    expect(alive(sidecar.child.pid!)).toBe(true);
  });

  run("concurrent candidates: exactly one survives, the loser exits 0", async () => {
    const home = makeHome();
    const a = spawnSidecar(home);
    const b = spawnSidecar(home);
    await waitSocketUp(home);
    const winnerPid = readPid(home)!;
    expect([a.child.pid!, b.child.pid!]).toContain(winnerPid);
    const winner = winnerPid === a.child.pid ? a : b;
    const loser = winner === a ? b : a;
    const exit = await waitExit(loser.exited);
    expect(exit.code).toBe(0);
    expect(alive(winner.child.pid!)).toBe(true);
    expect(await socketUp(sockPath(home))).toBe(true);
  });

  run("broken recorded holder (alive but not serving) is killed before rebind", async () => {
    const home = makeHome();
    const dummy = spawn("bun", ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore", detached: true });
    children.push(dummy);
    const dummyPid = await waitSpawned(dummy);
    writeFileSync(pidPath(home), String(dummyPid));
    expect(alive(dummyPid)).toBe(true);

    const sidecar = spawnSidecar(home);
    await waitSocketUp(home);

    expect(alive(dummyPid)).toBe(false); // the nuke directive
    expect(readPid(home)).toBe(sidecar.child.pid!);
    expect(alive(sidecar.child.pid!)).toBe(true);
  });
});