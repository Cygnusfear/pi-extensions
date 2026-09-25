#!/usr/bin/env bun
/**
 * fake-sidecar — test double for the pi-mesh sidecar.
 *
 * Used by pi-mesh.sidecar-lifecycle.test.ts. Mimics the production daemon
 * contract so the TS session layer is tested against honest behavior:
 *
 *  - argv[2] = zenoh config JSON; recorded to $FAKE_SIDECAR_OUT/last-config.json
 *    and spawns.jsonl (so tests can assert the config was re-read per spawn).
 *  - Emulated ~/.pi/mesh.start.lock (O_EXCL + holder pid, 10ms poll wait).
 *    The PRODUCTION daemon uses a kernel flock (kal-kbu1f9xy) — the real lock
 *    is covered against the real binary by pi-mesh.native-singleton.test.ts.
 *  - Serving re-check (fast path + under the lock): pidfile pid alive AND
 *    socket connectable → exit 0.
 *  - Broken recorded holder (pidfile pid alive but socket not serving) is
 *    killed, per the nuke directive (kal-0suu3dur).
 *  - Publish phase: unlink stale socket → bind → write pidfile → release lock.
 *  - Per connection: sends {"ev":"ready","zid","client_id"} with a FRESH
 *    client_id per connection (like the real daemon), and records every
 *    received command line to $FAKE_SIDECAR_OUT/events.jsonl.
 *  - Pub/sub relay (kal-1dymeveg): tracks each connection's {cmd:"subscribe",
 *    topic} calls (exact topics and "prefix/**" wildcards, matching the real
 *    daemon's topic shape) and on {cmd:"publish", topic, payload} forwards
 *    {"ev":"msg","topic","payload"} to every connection whose subscriptions
 *    match — INCLUDING the publisher itself, mirroring the real sidecar's
 *    self-echo (pi-mesh.ts's own _handleAnnounce/_handleWho already defend
 *    against reacting to a self-echo where it matters). This is the minimum
 *    needed for a multi-client test (two real PiMesh sessions actually
 *    exchanging pi/mesh/announce/pi/mesh/who) without touching the real
 *    zenoh-backed daemon.
 *  - SIGTERM/SIGINT: unlinks sock+pid and exits 0 (the real daemon's
 *    cleanup_files on graceful exit). SIGKILL: no cleanup — stale files
 *    remain, exactly like the production incidents.
 *
 * Env: HOME (sidecar paths), FAKE_SIDECAR_OUT (diagnostics dir),
 * FAKE_SIDECAR_BIND_DELAY_MS (simulate a slow bind phase).
 */
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createConnection, createServer } from "node:net";
import { join } from "node:path";

const home = process.env.HOME ?? "/tmp";
const outDir = process.env.FAKE_SIDECAR_OUT;
const bindDelayMs = Number(process.env.FAKE_SIDECAR_BIND_DELAY_MS ?? "0");
const configArg = process.argv[2] ?? "";
const piDir = join(home, ".pi");
const sockPath = join(piDir, "mesh.sock");
const pidPath = join(piDir, "mesh.pid");
const lockPath = join(piDir, "mesh.start.lock");

const record = (file: string, value: unknown): void => {
  if (!outDir) return;
  try {
    mkdirSync(outDir, { recursive: true });
    if (file.endsWith(".jsonl")) appendFileSync(join(outDir, file), JSON.stringify(value) + "\n");
    else writeFileSync(join(outDir, file), JSON.stringify(value, null, 2));
  } catch {}
};

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const socketConnectable = (p: string): Promise<boolean> =>
  new Promise((resolve) => {
    const s = createConnection(p);
    let doneCalled = false;
    const done = (v: boolean): void => {
      if (doneCalled) return;
      doneCalled = true;
      s.destroy();
      resolve(v);
    };
    s.once("connect", () => done(true));
    s.on("error", () => done(false));
  });

const readHolder = (): number | null => {
  try {
    const pid = parseInt(readFileSync(lockPath, "utf8").trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
};

// Mirrors the daemon: the connect probe alone decides. The pidfile is one
// mutable record that a repair path or an operator tool can delete or
// rewrite at any moment; requiring it to name a live pid once made a
// serving daemon read as "down" and let a second candidate bind a parallel
// socket (2026-09-25).
const serving = async (): Promise<boolean> => socketConnectable(sockPath);

record("spawns.jsonl", { event: "spawn", pid: process.pid, at: Date.now(), configArg });
// Raw config argv — it is already a JSON document, so write it verbatim.
if (outDir) {
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "last-config.json"), configArg);
  } catch {}
}

// Fast path (mirrors the daemon): a sidecar is already serving → exit 0.
if (await serving()) process.exit(0);

// Emulated start lock: block until a live holder's bind phase completes,
// steal stale (dead-holder) locks.
for (;;) {
  try {
    const fd = openSync(lockPath, "wx");
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
    break;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code !== "EEXIST") throw e;
    const holder = readHolder();
    if (holder !== null && isAlive(holder)) {
      await new Promise((r) => setTimeout(r, 10));
      continue;
    }
    try {
      unlinkSync(lockPath);
    } catch {}
  }
}

try {
  // Authoritative re-check under the lock.
  if (await serving()) process.exit(0);

  // Broken recorded holder (alive but not serving): kill it (the nuke
  // directive, kal-0suu3dur) before re-publishing.
  try {
    const holder = parseInt(readFileSync(pidPath, "utf8").trim(), 10);
    if (isAlive(holder)) {
      process.kill(holder, "SIGKILL");
      record("spawns.jsonl", { event: "killed-holder", pid: holder });
    }
  } catch {}

  // Publish our pid BEFORE the (possibly slow) bind phase — mirrors the
  // daemon: a starting candidate announces its existence via the pidfile.
  writeFileSync(pidPath, String(process.pid));

  if (bindDelayMs > 0) await new Promise((r) => setTimeout(r, bindDelayMs));

  try {
    unlinkSync(sockPath);
  } catch {}
  mkdirSync(piDir, { recursive: true });

  // kal-1dymeveg: connections + their subscriptions, for the pub/sub relay
  // below. A connection is dropped from here on socket close/error so a
  // dead client never receives (or blocks on) a relay write.
  interface Conn {
    readonly id: string;
    readonly socket: import("node:net").Socket;
    readonly topics: Set<string>;
  }
  const conns = new Map<string, Conn>();

  const topicMatches = (pattern: string, topic: string): boolean => {
    if (pattern === topic) return true;
    if (pattern.endsWith("/**")) return topic.startsWith(pattern.slice(0, -2));
    return false;
  };

  const relay = (fromId: string, topic: string, payload: string): void => {
    const line = JSON.stringify({ ev: "msg", topic, payload }) + "\n";
    for (const conn of conns.values()) {
      if (![...conn.topics].some((pattern) => topicMatches(pattern, topic))) continue;
      try {
        conn.socket.write(line);
      } catch {}
    }
    record("events.jsonl", { event: "relay", from: fromId, topic, recipients: [...conns.values()].filter((c) => [...c.topics].some((p) => topicMatches(p, topic))).map((c) => c.id) });
  };

  const server = createServer((socket) => {
    const clientId = randomUUID();
    conns.set(clientId, { id: clientId, socket, topics: new Set() });
    socket.write(JSON.stringify({ ev: "ready", zid: "fake-zid", client_id: clientId }) + "\n");
    record("events.jsonl", { event: "ready", connection: clientId, zid: "fake-zid", client_id: clientId });
    let buf = "";
    socket.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let command: unknown = line;
        try {
          command = JSON.parse(line);
        } catch {}
        record("events.jsonl", { event: "command", connection: clientId, command });
        if (command && typeof command === "object") {
          const cmd = command as { cmd?: string; topic?: string; payload?: string };
          if (cmd.cmd === "subscribe" && typeof cmd.topic === "string") {
            conns.get(clientId)?.topics.add(cmd.topic);
          } else if (cmd.cmd === "publish" && typeof cmd.topic === "string") {
            relay(clientId, cmd.topic, cmd.payload ?? "");
          }
        }
      }
    });
    const cleanup = (): void => {
      conns.delete(clientId);
    };
    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(sockPath, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
} finally {
  try {
    unlinkSync(lockPath);
  } catch {}
}
record("spawns.jsonl", { event: "published", pid: process.pid });

// Stay alive until signalled (the server keeps the event loop alive).
let shuttingDown = false;
const shutdown = (): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    unlinkSync(sockPath);
  } catch {}
  try {
    unlinkSync(pidPath);
  } catch {}
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);