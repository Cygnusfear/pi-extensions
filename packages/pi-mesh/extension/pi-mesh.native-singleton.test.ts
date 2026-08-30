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