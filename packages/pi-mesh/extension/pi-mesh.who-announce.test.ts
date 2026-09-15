import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PiMesh } from "./pi-mesh.ts";
import { reapSidecars, sweepStaleSidecarHomes } from "./sidecar-test-harness.ts";

/**
 * kal-1dymeveg: a fresh session sees an empty roster for up to
 * announceIntervalMs (30s default) because the ONLY proactive roster signal
 * was each peer's own heartbeat — nothing on connect asked already-connected
 * peers to re-announce. Fixed client-side (pi-mesh.ts):
 *
 *   1. every client subscribes to "pi/mesh/who"; on receipt, re-announce
 *      immediately, rate-limited to once per second (shared with every other
 *      _announce() trigger via lastAnnounceAt).
 *   2. on connect, right after the first _announce(), publish "pi/mesh/who".
 *   3. mesh_peers (via PiMesh#peersOrWait) publishes "who" and polls up to
 *      1.5s when the roster is still empty, instead of answering "you're
 *      alone" immediately.
 *
 * These tests run the REAL PiMesh session code end to end against the fake
 * sidecar (fake-sidecar.ts, extended in this same fix with a minimal pub/sub
 * relay — see that file's module doc) — never the live/native sidecar, per
 * the ticket. Isolated HOME per test, exactly like
 * pi-mesh.sidecar-lifecycle.test.ts.
 */

const FAKE_SIDECAR_FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fake-sidecar.ts");
// kal-x2akvjnh: sweep HOMEs left by runs that predate the teardown fix. Age-
// and ownership-bounded, so a concurrent run’s in-flight HOME is never touched.
const sweptHomes = sweepStaleSidecarHomes("pi-mesh-who-");
if (sweptHomes.length > 0) {
  console.log("[pi-mesh test harness] swept " + sweptHomes.length + " stale who home(s)");
}

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_OUT = process.env.FAKE_SIDECAR_OUT;

interface Root {
  home: string;
  out: string;
  fakePath: string;
}

const roots: Root[] = [];
const meshes: PiMesh[] = [];

function makeRoot(): Root {
  const home = mkdtempSync(join(tmpdir(), "pi-mesh-who-"));
  const out = join(home, "out");
  mkdirSync(join(home, ".pi"), { recursive: true });
  // Written as the FULL exact-key V1 shape on purpose: a partial file fails
  // decodeMachineMeshConfig, and _sidecarConfigArg degrades that to the default
  // config - i.e. multicast back ON. scouting:false keeps an orphan off the LAN.
  writeFileSync(
    join(home, ".pi", "mesh-config.json"),
    JSON.stringify({ schemaVersion: 1, mode: "peer", endpoints: [], scouting: false }),
  );
  const fakePath = join(home, "fake-sidecar.ts");
  writeFileSync(fakePath, readFileSync(FAKE_SIDECAR_FIXTURE, "utf8"));
  chmodSync(fakePath, 0o755);
  const root: Root = { home, out, fakePath };
  roots.push(root);
  return root;
}

// PiMesh#stop() intentionally leaves the shared singleton running, so stop()
// alone orphans the sidecar this private test HOME spawned. Teardown reaps it,
// and fails loudly if the kill does not land rather than hiding it in a catch.
afterEach(async () => {
  await reapSidecars({ meshes, roots });
  process.env.HOME = ORIGINAL_HOME;
  process.env.FAKE_SIDECAR_OUT = ORIGINAL_OUT;
});

/** Both clients in a test share ONE fake sidecar (same HOME → same mesh.sock),
 *  exactly like two real pi processes on one box. HOME/FAKE_SIDECAR_OUT are
 *  process-global env vars read by PiMesh#start at call time, so callers must
 *  set them immediately before each mesh.start() — safe here because
 *  mesh.start() reads them synchronously before spawning. */
function startMesh(root: Root, sessionId: string): PiMesh {
  process.env.HOME = root.home;
  process.env.FAKE_SIDECAR_OUT = root.out;
  const mesh = new PiMesh();
  meshes.push(mesh);
  mesh.start(root.fakePath, sessionId, root.home);
  return mesh;
}

function waitFor(predicate: () => boolean, timeoutMs: number, intervalMs = 20): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = (): void => {
      if (predicate()) return resolve();
      if (Date.now() > deadline) return reject(new Error(`waitFor: condition not met within ${String(timeoutMs)}ms`));
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function onceReady(mesh: PiMesh): Promise<void> {
  return new Promise((resolve) => mesh.on("ready", () => resolve()));
}

describe("mesh who/re-announce on join (kal-1dymeveg)", () => {
  test(
    "a late-connecting second client sees the first within one 'who' round, not after a 30s heartbeat wait",
    async () => {
      const root = makeRoot();

      // Long heartbeat (30s, the production default) so the ONLY way A's
      // announce reaches B this fast is the who round-trip this fix adds —
      // if the fix regressed, this test would time out waiting on B's peers.
      const a = startMesh(root, "session-a");
      await onceReady(a);

      // B connects "late" — well after A is already up and announced once.
      await new Promise((resolve) => setTimeout(resolve, 200));
      const b = startMesh(root, "session-b");
      await onceReady(b);

      // B's connect-time publishWho() should reach A (A re-announces,
      // rate-limit permitting) AND B's own who round should surface A's own
      // already-published announce/who cycle. Either path is a legitimate
      // "one who round" per the ticket; assert the OUTCOME (B sees A) within
      // a budget far short of the 30s heartbeat.
      await waitFor(() => b.peers().some((p) => p.sessionId === "session-a"), 3_000);
      expect(b.peers().some((p) => p.sessionId === "session-a")).toBe(true);

      // Symmetric: A should also learn about B (A is subscribed to "who" too,
      // and B publishes one on its own connect).
      await waitFor(() => a.peers().some((p) => p.sessionId === "session-b"), 3_000);
      expect(a.peers().some((p) => p.sessionId === "session-b")).toBe(true);
    },
    10_000,
  );

  test(
    "mesh_peers-style peersOrWait() sees the other peer immediately if already known, or after publishing who if not",
    async () => {
      const root = makeRoot();
      const a = startMesh(root, "session-a");
      await onceReady(a);
      const b = startMesh(root, "session-b");
      await onceReady(b);
      // Let the who-rate-limit window from A/B's own connect-time round
      // clear before C joins — this test is about a THIRD peer joining an
      // already-settled two-peer mesh (the ticket's core scenario: a fresh
      // session sees an established mesh's roster within one who round), not
      // a zero-delay burst of three simultaneous joins racing the same 1s
      // rate-limit window (a real but secondary case: the rate limit's job
      // is exactly to make that burst cheap, at the cost of not every peer
      // answering every asker in the same instant — see the rate-limit test
      // for that budget being enforced).
      await new Promise((resolve) => setTimeout(resolve, 1_100));

      // Construct a THIRD, freshly-connected mesh that has seen no one yet
      // — this is the literal "mesh_peers called moments after connecting,
      // before any who round has landed" case peersOrWait exists for.
      const c = startMesh(root, "session-c");
      // Wait only for the CONNECTION itself (the "ready" event) — not for
      // its own who round to resolve — then call peersOrWait immediately,
      // the way a turn that runs mesh_peers in its very first second after
      // connecting would.
      await onceReady(c);
      // peersOrWait's contract (per the ticket): don't answer "you're alone"
      // when peers exist and are about to respond — it returns as soon as
      // AT LEAST ONE peer answers (or the 1.5s ceiling), not once every peer
      // on the mesh has converged. The bug this proves fixed is an EMPTY
      // roster; assert non-empty, then confirm full convergence separately
      // (peers() keeps filling asynchronously as more who-replies land).
      const peers = await c.peersOrWait(1_500);
      expect(peers.length).toBeGreaterThan(0);
      await waitFor(() => c.peers().some((p) => p.sessionId === "session-a") && c.peers().some((p) => p.sessionId === "session-b"), 2_000);
      expect(c.peers().some((p) => p.sessionId === "session-a")).toBe(true);
      expect(c.peers().some((p) => p.sessionId === "session-b")).toBe(true);
    },
    10_000,
  );

  test(
    "the who rate limit holds: a burst of who messages triggers at most one extra announce per second",
    async () => {
      const root = makeRoot();
      const a = startMesh(root, "session-a");
      await onceReady(a);

      const b = startMesh(root, "session-b");
      await onceReady(b);
      await waitFor(() => a.peers().some((p) => p.sessionId === "session-b"), 3_000);

      // Count A's announce publishes from here on by watching B's peerMap's
      // lastSeen advance — instead, observe via the sidecar's own event log
      // (ground truth, independent of PiMesh's own bookkeeping): every
      // "relay" event whose topic starts with pi/mesh/announce/ and whose
      // payload embeds A's clientId.
      const aClientId = a.self().id;
      const eventsPath = join(root.out, "events.jsonl");
      const countAnnouncesFromA = (): number => {
        let raw: string;
        try {
          raw = readFileSync(eventsPath, "utf8");
        } catch {
          return 0;
        }
        return raw
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as Record<string, unknown>)
          .filter((e) => e.event === "relay" && typeof e.topic === "string" && (e.topic as string).startsWith("pi/mesh/announce/") && (e.topic as string) === `pi/mesh/announce/${aClientId}`)
          .length;
      };

      const before = countAnnouncesFromA();
      // B fires five "who"s in a tight burst — far more than the 1/s budget
      // could legitimately turn into announces from A.
      for (let i = 0; i < 5; i++) {
        (b as unknown as { _publishWho(): void })._publishWho();
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      const afterBurst = countAnnouncesFromA();
      // At most one new announce from A in the whole 300ms burst window —
      // NOT one per "who" received.
      expect(afterBurst - before).toBeLessThanOrEqual(1);

      // After the rate-limit window elapses, A DOES answer a fresh who.
      await new Promise((resolve) => setTimeout(resolve, 1_100));
      const beforeSecond = countAnnouncesFromA();
      (b as unknown as { _publishWho(): void })._publishWho();
      await waitFor(() => countAnnouncesFromA() > beforeSecond, 2_000);
      expect(countAnnouncesFromA()).toBeGreaterThan(beforeSecond);
    },
    15_000,
  );
});
