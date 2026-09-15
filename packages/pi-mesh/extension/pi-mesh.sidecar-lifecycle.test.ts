import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PiMesh } from "./pi-mesh.ts";
import { pidFileOf, pidsForScript, reapSidecars, sweepStaleSidecarHomes, sidecarPid } from "./sidecar-test-harness.ts";

/**
 * Sidecar lifecycle tests (kal-0suu3dur): ensure-sidecar nuke-and-respawn,
 * reconnect-on-loss, and per-spawn config re-read.
 *
 * These run the REAL PiMesh session code (start/_ensureSidecar/_connectSocket/
 * stop) end-to-end against a fake sidecar binary (fake-sidecar.ts) that mimics
 * the production daemon contract, in an isolated HOME so the machine's real
 * ~/.pi state and running sidecar are never touched. The daemon's OWN
 * single-instance OS lock (kal-kbu1f9xy) is covered against the real binary
 * by pi-mesh.native-singleton.test.ts.
 */

const FAKE_SIDECAR_FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fake-sidecar.ts");
// kal-x2akvjnh: clear HOMEs abandoned by earlier crashed or leaking runs.
// Bounded by age and live-process ownership, because this prefix is shared by
// concurrent runs of this suite - see sweepStaleSidecarHomes().
const sweptHomes = sweepStaleSidecarHomes("pi-mesh-lifecycle-");
if (sweptHomes.length > 0) {
  console.log("[pi-mesh test harness] swept " + sweptHomes.length + " stale lifecycle home(s)");
}

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_OUT = process.env.FAKE_SIDECAR_OUT;
const ORIGINAL_DELAY = process.env.FAKE_SIDECAR_BIND_DELAY_MS;

interface Root {
  home: string;
  out: string;
  fakePath: string;
}

const roots: Array<{ root: Root }> = [];
const meshes: PiMesh[] = [];

function makeRoot(): Root {
  const home = mkdtempSync(join(tmpdir(), "pi-mesh-lifecycle-"));
  const out = join(home, "out");
  mkdirSync(join(home, ".pi"), { recursive: true });
  const fakePath = join(home, "fake-sidecar.ts");
  writeFileSync(fakePath, readFileSync(FAKE_SIDECAR_FIXTURE, "utf8"));
  chmodSync(fakePath, 0o755);
  process.env.HOME = home;
  process.env.FAKE_SIDECAR_OUT = out;
  delete process.env.FAKE_SIDECAR_BIND_DELAY_MS;
  const root = { home, out, fakePath };
  roots.push({ root });
  return root;
}

function restoreEnv(): void {
  process.env.HOME = ORIGINAL_HOME;
  process.env.FAKE_SIDECAR_OUT = ORIGINAL_OUT;
  if (ORIGINAL_DELAY === undefined) delete process.env.FAKE_SIDECAR_BIND_DELAY_MS;
  else process.env.FAKE_SIDECAR_BIND_DELAY_MS = ORIGINAL_DELAY;
}

afterEach(async () => {
  const collected = roots.splice(0).map((entry) => entry.root);
  await reapSidecars({ meshes, roots: collected });
  restoreEnv();
});

function startMesh(root: Root, sessionId: string): PiMesh {
  const mesh = new PiMesh();
  meshes.push(mesh);
  mesh.start(root.fakePath, sessionId, root.home);
  return mesh;
}

function sockPathOf(home: string): string {
  return join(home, ".pi", "mesh.sock");
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

function readJsonl(out: string, file: string): Array<Record<string, unknown>> {
  try {
    return readFileSync(join(out, file), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
  } catch {
    return [];
  }
}

function spawnRecords(out: string): Array<Record<string, unknown>> {
  return readJsonl(out, "spawns.jsonl").filter((e) => e.event === "spawn");
}

function writeConfig(home: string, cfg: Record<string, unknown>): void {
  mkdirSync(join(home, ".pi"), { recursive: true });
  writeFileSync(join(home, ".pi", "mesh-config.json"), JSON.stringify(cfg));
}

/**
 * Test-only observation window: resolves on the next "ready" event or fails
 * with a diagnosable error after budgetMs. A test assertion, not a product
 * mechanism (the product itself waits on events only — kal-9g0w8pof).
 */
function waitReady(mesh: PiMesh, budgetMs = 25000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("ready event did not arrive within " + budgetMs + "ms")),
      budgetMs,
    );
    mesh.on("ready", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Wait for a child's spawn event (or fail after the test-only window). */
function waitSpawned(child: ReturnType<typeof spawn>, budgetMs = 10000): Promise<number> {
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

/** Leave a stale socket file behind (a dead listener was SIGKILLed). */
async function leaveStaleSocket(p: string): Promise<void> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(p, () => resolve());
  });
  server.close(); // the file remains, no listener → ECONNREFUSED
}

/** A process pid that is guaranteed dead (spawn, SIGKILL). */
async function makeDeadPid(): Promise<number> {
  const dummy = spawn("bun", ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore", detached: true });
  dummy.unref();
  const pid = await waitSpawned(dummy);
  process.kill(pid, "SIGKILL");
  return pid;
}

const CONFIG_A = { schemaVersion: 1, mode: "peer", endpoints: ["tcp/fake-a:7447"], scouting: true };
const CONFIG_B = { schemaVersion: 1, mode: "peer", endpoints: ["tcp/fake-b:7447"], scouting: false };
const EXPECTED_ZENOH_A = {
  mode: "peer",
  connect: { endpoints: ["tcp/fake-a:7447"] },
  scouting: { multicast: { enabled: true } },
};
const EXPECTED_ZENOH_B = {
  mode: "peer",
  connect: { endpoints: ["tcp/fake-b:7447"] },
  scouting: { multicast: { enabled: false } },
};

describe("PiMesh sidecar lifecycle (kal-0suu3dur)", () => {
  test("fresh start spawns the singleton sidecar and reaches ready", async () => {
    const root = makeRoot();
    writeConfig(root.home, CONFIG_A);
    const mesh = startMesh(root, "session-fresh");
    await waitReady(mesh);

    expect(pidsForScript(root.fakePath)).toHaveLength(1);
    const pid = sidecarPid(root.home);
    expect(pid).toBe(pidsForScript(root.fakePath)[0]);
    expect(await socketUp(sockPathOf(root.home))).toBe(true);
    expect(spawnRecords(root.out)).toHaveLength(1);
    const lastConfig = JSON.parse(readFileSync(join(root.out, "last-config.json"), "utf8"));
    expect(lastConfig).toEqual(EXPECTED_ZENOH_A);
  });

  test("stale socket file + dead pidfile are cleaned and a fresh sidecar serves", async () => {
    const root = makeRoot();
    writeConfig(root.home, CONFIG_A);
    await leaveStaleSocket(sockPathOf(root.home));
    const deadPid = await makeDeadPid();
    writeFileSync(pidFileOf(root.home), String(deadPid));
    expect(await socketUp(sockPathOf(root.home))).toBe(false); // ECONNREFUSED

    const mesh = startMesh(root, "session-stale");
    await waitReady(mesh);

    const pids = pidsForScript(root.fakePath);
    expect(pids).toHaveLength(1);
    expect(pids[0]).not.toBe(deadPid);
    expect(sidecarPid(root.home)).toBe(pids[0]);
    expect(await socketUp(sockPathOf(root.home))).toBe(true);
  });

  test("kills all stray sidecar processes before spawning (the Aug 25 duplicate state)", async () => {
    const root = makeRoot();
    // A stray sidecar running from THIS install's binary path, under a
    // different HOME (its own files) — the duplicate left behind by the old
    // racy spawn.
    const strayHome = mkdtempSync(join(tmpdir(), "pi-mesh-lifecycle-stray-"));
    try {
      mkdirSync(join(strayHome, ".pi"), { recursive: true });
      const stray = spawn(root.fakePath, ["{}"], {
        env: { ...process.env, HOME: strayHome, FAKE_SIDECAR_OUT: "" },
        stdio: "ignore",
        detached: true,
      });
      stray.unref();
      const strayPid = await waitSpawned(stray);
      // The production end state: stale socket file + dead pidfile, stray alive.
      await leaveStaleSocket(sockPathOf(root.home));
      const deadPid = await makeDeadPid();
      writeFileSync(pidFileOf(root.home), String(deadPid));

      const mesh = startMesh(root, "session-nuke");
      await waitReady(mesh);

      // The stray was killed; exactly one sidecar remains (the fresh one).
      let strayAlive = true;
      try {
        process.kill(strayPid, 0);
      } catch {
        strayAlive = false;
      }
      expect(strayAlive).toBe(false);
      const pids = pidsForScript(root.fakePath);
      expect(pids).toHaveLength(1);
      expect(sidecarPid(root.home)).toBe(pids[0]);
      expect(await socketUp(sockPathOf(root.home))).toBe(true);
    } finally {
      rmSync(strayHome, { recursive: true, force: true });
    }
  });

  test("reconnects after sidecar death and re-subscribes on the fresh connection", async () => {
    const root = makeRoot();
    writeConfig(root.home, CONFIG_A);
    const mesh = startMesh(root, "session-reconnect");
    await waitReady(mesh);
    const firstPid = sidecarPid(root.home)!;
    expect(firstPid).not.toBeNull();

    // Sidecar dies (SIGKILL → stale sock+pid remain, exactly like production).
    process.kill(firstPid, "SIGKILL");
    await waitReady(mesh, 30000);
    // settle: the session re-subscribes right after "ready"; the fake records
    // commands on its own event loop.
    await new Promise((r) => setTimeout(r, 250));

    const secondPid = sidecarPid(root.home);
    expect(secondPid).not.toBe(firstPid);
    expect(secondPid).not.toBeNull();
    const readyEvents = readJsonl(root.out, "events.jsonl").filter((e) => e.event === "ready");
    expect(readyEvents.length).toBeGreaterThanOrEqual(2);
    const firstClientId = String(readyEvents[0]!.client_id);
    const secondClientId = String(readyEvents[readyEvents.length - 1]!.client_id);
    expect(secondClientId).not.toBe(firstClientId);

    // The fresh connection re-established every subscription.
    const commands = readJsonl(root.out, "events.jsonl")
      .filter((e) => e.event === "command" && e.connection === secondClientId)
      .map((e) => e.command as Record<string, unknown>);
    const topics = commands.filter((c) => c.cmd === "subscribe").map((c) => String(c.topic));
    expect(topics).toContain("pi/mesh/session/" + secondClientId);
    expect(topics).toContain("pi/mesh/announce/**");
    expect(topics).toContain("pi/mesh/broadcast/**");

    // Still exactly one sidecar.
    expect(pidsForScript(root.fakePath)).toHaveLength(1);
  });

  test("re-reads mesh-config.json on (re)spawn so endpoint changes take effect", async () => {
    const root = makeRoot();
    writeConfig(root.home, CONFIG_A);
    const mesh = startMesh(root, "session-config");
    await waitReady(mesh);
    const firstPid = sidecarPid(root.home)!;

    // The operator changes the machine config while the session runs.
    writeConfig(root.home, CONFIG_B);
    process.kill(firstPid, "SIGKILL");
    await waitReady(mesh, 30000);

    const spawns = spawnRecords(root.out);
    expect(spawns).toHaveLength(2);
    expect(JSON.parse(String(spawns[0]!.configArg))).toEqual(EXPECTED_ZENOH_A);
    expect(JSON.parse(String(spawns[1]!.configArg))).toEqual(EXPECTED_ZENOH_B);
  });

  test("stop() disconnects without reconnecting or respawning", async () => {
    const root = makeRoot();
    writeConfig(root.home, CONFIG_A);
    const mesh = startMesh(root, "session-stop");
    await waitReady(mesh);
    const pid = sidecarPid(root.home)!;

    mesh.stop();
    process.kill(pid, "SIGKILL");
    const spawnCountBefore = spawnRecords(root.out).length;
    // Test observation window: give a (buggy) reconnect time to fire.
    await new Promise((r) => setTimeout(r, 600));

    expect(pidsForScript(root.fakePath)).toHaveLength(0);
    expect(spawnRecords(root.out).length).toBe(spawnCountBefore);
  });

  test("pending tell waits are rejected when the connection is lost", async () => {
    const root = makeRoot();
    writeConfig(root.home, CONFIG_A);
    const mesh = startMesh(root, "session-pending");
    await waitReady(mesh);
    const pid = sidecarPid(root.home)!;

    let settledKind: "reject" | "resolve" | "window" = "window";
    let rejectMessage: string | undefined;
    const tellPromise = mesh.tellAndWaitForReceipt("some-peer", "needs a receipt", "delivered", 30_000);
    tellPromise.then(
      () => {
        if (settledKind === "window") settledKind = "resolve";
      },
      (e: Error) => {
        if (settledKind === "window") {
          settledKind = "reject";
          rejectMessage = e.message;
        }
      },
    );

    process.kill(pid, "SIGKILL");
    // Test observation window for the connection-lost rejection.
    await new Promise((r) => setTimeout(r, 1500));

    expect(settledKind).toBe("reject");
    expect(rejectMessage).toContain("connection lost");
    // The session auto-reconnects; stop() cancels any in-flight repair.
    mesh.stop();
  });

  test("concurrent session starts converge on one sidecar", async () => {
    // The real kernel flock (with its ~150ms zenoh-open critical section) is
    // covered against the real binary by pi-mesh.native-singleton.test.ts;
    // here the fake's emulated lock keeps concurrent candidates to one
    // published sidecar.
    const root = makeRoot();
    writeConfig(root.home, CONFIG_A);
    const meshA = startMesh(root, "session-concurrent-a");
    const meshB = startMesh(root, "session-concurrent-b");
    await Promise.all([waitReady(meshA, 30000), waitReady(meshB, 30000)]);

    const pids = pidsForScript(root.fakePath);
    expect(pids).toHaveLength(1);
    expect(sidecarPid(root.home)).toBe(pids[0]);
    expect(await socketUp(sockPathOf(root.home))).toBe(true);
    // At most one wasted candidate (the lock loser exits after the winner
    // publishes).
    expect(spawnRecords(root.out).length).toBeLessThanOrEqual(2);
  });
});