/**
 * pi-mesh extension — singleton sidecar architecture
 *
 * One sidecar per machine, shared by all pi sessions.
 * Sessions connect via unix socket (~/.pi/mesh.sock).
 * If the sidecar isn't running, we spawn it on demand.
 */

import { createSurfacedDeliveryGuard, surfacedDeliveryPath } from "./inbound-dedup.ts";
import { tellAttempts } from "./tell-target.ts";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { MeshIdentity } from "@pi-extensions/shared/session-nickname";
import {
  claimNickname,
  getSessionNicknameText,
  setStableId,
} from "@pi-extensions/shared/session-nickname";
import { renderToolResult } from "@pi-extensions/shared/tool-ui-utils";
import { type TSchema, Type } from "@sinclair/typebox";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { createConnection, type Socket } from "node:net";
import { hostname } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSessionTailSnapshotFromLeaf,
  capSessionViewEntries,
  formatSessionViewEntries,
  projectMeaningfulSessionEntries,
  sliceSessionViewEntries,
} from "../../shared/src/session-view.ts";
import {
  appendMeshAskReceipt,
  buildMeshAskEnvelope,
  buildMeshAskReceipt,
  createAskId,
  formatMeshAskReceiptTrail,
  isMeshAskEnvelope,
  isMeshAskReceiptEnvelope,
} from "./ask-protocol.ts";
import { buildPendingAskBatchContent, splitExpiredPendingAsks } from "./ask-queue.ts";
import { isIdentityReuseReason, resolveReuseNickname } from "./identity-pin.ts";
import { resolveDurableTarget } from "./route-resolve.ts";
import {
  readZmxSession,
  reconcileZmxSession,
  type ZmxSessionEnvironment,
} from "./zmx-session.ts";
import {
  ActiveInboundTellMailbox,
  canonicalTellReceiptPhase,
  isSurfacedReceiptRequested,
  type ActiveInboundTellPeek,
  type ActiveInboundTell,
} from "./active-inbound-mailbox.ts";
import {
  buildTellReceiptAck,
  createDeliveryId,
  isMeshTellAckEnvelope,
  type InboundMeshMessage,
  unwrapInboundTell,
} from "./tell-protocol.ts";
import type {
  AnnouncePayload,
  ChannelMessage,
  MeshAskReceiptEnvelope,
  MeshAskReceiptWaitForPhase,
  MeshConfig,
  MeshMessage,
  MeshTellAckEnvelope,
  MeshTellEnvelope,
  MeshTellPreemptLevel,
  MeshTellReceiptPhase,
  MeshTellReceiptWaitForPhase,
  PeerInfo,
  RequestEvent,
} from "./types.ts";
import {
  formatInboundAskContent,
  formatInboundChatContent,
  formatInboundTellContent,
  formatPendingTellsBatch,
  formatReviveDrainBatch,
  formatSentSuffix,
} from "./inbound-format.ts";
import { planInboundTell } from "./inbound-tell-plan.ts";
import {
  DEFAULT_MACHINE_MESH_CONFIG,
  loadMachineMeshConfig,
  machineMeshConfigPath,
  toMeshConfig,
  type MachineMeshConfigV1,
} from "./machine-mesh-config.ts";
import { DurableInboundMailbox } from "./durable-inbound-mailbox.ts";
import {
  buildReviveNotify,
  materialiseDurableDescriptor,
  readDurableDescriptor,
} from "./durable-session-store.ts";
import type { ReviveDescriptor } from "@pi-extensions/shared/revive-descriptor";


const ambientChatBatchMsRaw = Number(process.env.PI_MESH_AMBIENT_CHAT_BATCH_MS ?? "750");
const AMBIENT_CHAT_BATCH_MS =
  Number.isFinite(ambientChatBatchMsRaw) && ambientChatBatchMsRaw >= 0
    ? Math.floor(ambientChatBatchMsRaw)
    : 750;

const TERMINAL_TELL_RECEIPT_PHASES = new Set<MeshTellReceiptPhase>([
  "refused",
  "undeliverable",
  "expired",
]);

function tellReceiptSatisfies(requested: MeshTellReceiptPhase, actual: MeshTellReceiptPhase): boolean {
  if (actual === requested) return true;
  if (TERMINAL_TELL_RECEIPT_PHASES.has(actual)) return true;
  return requested === "delivered" && actual === "surfaced";
}

// ── Mesh icons ────────────────────────────────────────────────────────────────

function _hasNerdFonts(): boolean {
  if (process.env.POWERLINE_NERD_FONTS === "1") return true;
  if (process.env.POWERLINE_NERD_FONTS === "0") return false;
  if (process.env.GHOSTTY_RESOURCES_DIR) return true;
  const term = (process.env.TERM_PROGRAM || "").toLowerCase();
  return ["iterm", "wezterm", "kitty", "ghostty", "alacritty"].some((t) => term.includes(t));
}

const _nerd = _hasNerdFonts();

/** Nerd-font icons with unicode fallbacks for mesh message styling. */
const MI = {
  chat: _nerd ? "\uF086" : "#", // nf-fa-comments
  tell: _nerd ? "\uF0E0" : ">", // nf-fa-envelope
  ask: _nerd ? "\uF059" : "?", // nf-fa-question_circle
  broadcast: _nerd ? "\uF1D8" : "*", // nf-fa-paper_plane
  sep: " \u00b7 ", // middle dot separator (padded)
};
// ── Path resolution ──────────────────────────────────────────────────────────

function resolveBinPath(): string | null {
  const extensionDir = dirname(fileURLToPath(import.meta.url));
  const binName = process.platform === "win32" ? "pi-mesh.exe" : "pi-mesh";
  const primary = resolve(extensionDir, "..", "native", binName);
  const fallback = resolve(extensionDir, "..", "native", "target", "release", binName);
  if (existsSync(primary)) return primary;
  if (existsSync(fallback)) return fallback;
  return null;
}

// ── Sidecar paths, probe, and stray cleanup ──────────────────────────────────

/** HOME-rooted sidecar paths (the ~/.pi dir is created by the sidecar). */
function meshHomeDir(): string {
  return process.env.HOME ?? "/tmp";
}
function meshSocketPath(): string {
  return join(meshHomeDir(), ".pi", "mesh.sock");
}
function meshPidPath(): string {
  return join(meshHomeDir(), ".pi", "mesh.pid");
}

// Pacing for event-demanded repairs (kal-9g0w8pof): each failure event
// schedules the next attempt with doubled, capped pacing. A scheduler for
// retries the events demanded — never a failure verdict, deadline, or give-up
// counter. Nothing is ever abandoned by a clock.
const REPAIR_RETRY_BASE_MS = 250;
const REPAIR_RETRY_MAX_MS = 10_000;

/**
 * Connect-probe verdict for the singleton socket: the kernel 'connect' event
 * means a sidecar is serving; the 'error' event (missing/stale socket, dead
 * listener) means it is not. Both are events — there is no elapsed-time
 * verdict (kal-9g0w8pof).
 */
export function probeSidecarSocket(sockPath: string): Promise<"serving" | "down"> {
  // A missing socket file can never have a listener (kernel invariant), so
  // the verdict is immediate and no connection attempt is made. (This also
  // avoids a failed pipe connect, whose error event bun test mis-delivers.)
  let fileExists = false;
  try {
    fileExists = existsSync(sockPath);
  } catch {}
  if (!fileExists) return Promise.resolve("down");
  // File present: the verdict is the kernel connect/error event (a stale
  // file — dead listener, e.g. a SIGKILLed sidecar — yields "error").
  return new Promise((resolvePromise) => {
    const probe = createConnection(sockPath);
    let settled = false;
    let connected = false;
    const settle = (verdict: "serving" | "down") => {
      if (settled) return;
      settled = true;
      try {
        probe.destroy();
      } catch {}
      resolvePromise(verdict);
    };
    probe.once("connect", () => {
      connected = true;
      settle("serving");
    });
    // Both settle paths are idempotent: a failed socket always errors and/or
    // closes, and error delivery can vary across runtimes (e.g. bun test
    // skips the "error" emit for pipes), so "close" without a prior
    // "connect" settles "down" as well.
    probe.on("error", () => settle("down"));
    probe.once("close", () => {
      if (!connected) settle("down");
    });
  });
}

/**
 * Every pi-mesh sidecar process on this machine: command-line matches of this
 * install's binary path (precise) plus process-name matches of the sidecar
 * (strays spawned from an older install path).
 */
export function findStraySidecarPids(binPath: string): number[] {
  const pids = new Set<number>();
  const collect = (raw: string) => {
    for (const line of raw.split("\n")) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) pids.add(pid);
    }
  };
  try {
    const escaped = binPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    collect(execFileSync("pgrep", ["-f", escaped]).toString());
  } catch {
    // no matches (or no pgrep) — nothing to kill
  }
  const binName = basename(binPath);
  if (binName === "pi-mesh" || binName === "pi-mesh.exe") {
    try {
      collect(execFileSync("pgrep", ["-x", binName]).toString());
    } catch {
      // same as above
    }
  }
  return [...pids];
}

/**
 * Dead = kill(0) reports ESRCH, or the process is a zombie (killed but not
 * yet reaped — kill(0) still succeeds against a zombie).
 */
function isProcessDead(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch {
    return true;
  }
  try {
    const state = execFileSync("ps", ["-o", "state=", "-p", String(pid)]).toString().trim();
    return state.startsWith("Z");
  } catch {
    return true;
  }
}

/**
 * Kill every stray sidecar process (the nuke directive, kal-0suu3dur):
 * SIGTERM, then SIGKILL anything still visible, then one decisive liveness
 * probe per pid. SIGKILL cannot be caught, so the final probe is conclusive.
 *
 * exceptPid: the pidfile's recorded holder, when it is still alive. The
 * recorded holder is the daemon's own authority — a broken one is disposed
 * of by the daemon itself under the start lock (kal-0suu3dur), so the
 * session-side nuke never kills a process that has already published itself.
 */
export function killStraySidecars(binPath: string, exceptPid: number | null = null): { killed: number[]; survivors: number[] } {
  const killed: number[] = [];
  for (const pid of findStraySidecarPids(binPath)) {
    if (exceptPid !== null && pid === exceptPid) continue;
    try {
      process.kill(pid, "SIGTERM");
      killed.push(pid);
    } catch {}
  }
  const survivors: number[] = [];
  for (const pid of killed) {
    if (!isProcessDead(pid)) {
      // Still running after SIGTERM — escalate.
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
    if (!isProcessDead(pid)) survivors.push(pid);
  }
  return { killed, survivors };
}

// ── Sidecar process wrapper ──────────────────────────────────────────────────

type MeshEventType = "ready" | "message" | "peer-join" | "peer-leave" | "request" | "channel";
type MeshEventCallback<T = unknown> = (data: T) => void;

export class PiMesh {
  private sock: Socket | null = null;
  private peerMap: Map<string, PeerInfo> = new Map();
  private listeners: Map<MeshEventType, Set<MeshEventCallback>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stalePeerTimer: ReturnType<typeof setInterval> | null = null;
  private myZid = ""; // Zenoh peer ID — shared across clients on same machine, metadata only
  private myClientId = ""; // unique per connection — the routing identity
  private mySessionId = ""; // pi session ID — metadata, can change on resume
  private myName: string | undefined;
  private myIdentity: MeshIdentity | null = null; // stable mesh identity (persisted in session file)
  private announceIntervalMs = 30_000;
  private lineBuf = "";
  private pendingGets: Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }> =
    new Map();
  private pendingAskReceipts: Map<
    string,
    { noteReceipt: (v: MeshAskReceiptEnvelope) => void; reject: (e: Error) => void }
  > = new Map();
  private pendingTellReceipts: Map<
    string,
    {
      phase: MeshTellReceiptPhase;
      resolve: (v: MeshTellAckEnvelope) => void;
      reject: (e: Error) => void;
    }
  > = new Map();
  private nextInboundAskRequestId = 1;
  private channelSubs: Set<string> = new Set();
  private channelWildcardSubbed = false;
  private isSocketReady = false;
  private stopped = false;
  private binPath: string | null = null;
  private sockPath: string | null = null;
  private ensuringSidecar = false;
  private readyWaiters: Array<() => void> = [];
  private repairRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private repairRetryDelayMs = REPAIR_RETRY_BASE_MS;

  start(binPath: string, sessionId: string, cwd: string, config?: MeshConfig, name?: string): void {
    if (!sessionId) {
      console.warn("[pi-mesh] No session ID available — skipping mesh start");
      return;
    }
    this.mySessionId = sessionId;
    this.myName = name;
    this.announceIntervalMs = config?.announceIntervalMs ?? 30_000;

    this.binPath = binPath;
    this.sockPath = meshSocketPath();

    // Ensure the singleton sidecar is serving (spawn/repair if not), then
    // connect. Reconnect-on-loss reuses this exact path (kal-0suu3dur).
    this._ensureSidecar(() => this._connectSocket());
  }

  /**
   * Make sure the singleton sidecar is serving, then run onReady.
   *
   * The verdict is an event, never a clock (kal-9g0w8pof): a connect probe
   * settles on the kernel connect/error event. If the sidecar is down, the
   * repair path kills ALL stray pi-mesh processes, unlinks the stale
   * mesh.sock/mesh.pid, re-reads ~/.pi/mesh-config.json, and spawns a fresh
   * sidecar (kal-0suu3dur). Single-instance is enforced by the sidecar's OS
   * advisory lock (kal-kbu1f9xy) — the session never emulates it.
   */
  private _ensureSidecar(onReady: () => void): void {
    if (this.stopped) return;
    this.readyWaiters.push(onReady);
    void this._runEnsure();
  }

  private async _runEnsure(): Promise<void> {
    if (this.ensuringSidecar) return;
    this.ensuringSidecar = true;
    try {
      await this._ensureSidecarRun();
    } catch (e) {
      console.warn("[pi-mesh] sidecar ensure failed:", e);
    } finally {
      this.ensuringSidecar = false;
    }
  }

  private async _ensureSidecarRun(): Promise<void> {
    const sockPath = this.sockPath;
    const binPath = this.binPath;
    if (!sockPath || !binPath) return;

    // Fast path: the singleton is already serving (connect-probe event).
    if ((await probeSidecarSocket(sockPath)) === "serving") {
      this._flushReadyWaiters();
      return;
    }
    if (this.stopped) return;

    // Repair: nuke every stray sidecar process and the stale socket/pidfile
    // BEFORE spawning — restarts ALWAYS nuke old sidecars (Hooman directive,
    // kal-0suu3dur). The probe just proved nothing is serving at the
    // singleton path, so every matched process is a stray — except the
    // pidfile's live recorded holder, which the daemon itself disposes of
    // under the start lock.
    let recordedHolder: number | null = null;
    let holderAlive = false;
    try {
      const holder = parseInt(readFileSync(meshPidPath(), "utf8").trim(), 10);
      if (Number.isInteger(holder) && holder > 0) {
        recordedHolder = holder;
        try {
          process.kill(holder, 0);
          holderAlive = true;
        } catch {}
      }
    } catch {}
    const { killed, survivors } = killStraySidecars(binPath, holderAlive ? recordedHolder : null);
    if (killed.length > 0 || survivors.length > 0) {
      console.warn(
        `[pi-mesh] sidecar repair: killed ${killed.length} stray sidecar(s) [${killed.join(", ")}]` +
          (survivors.length > 0 ? ` — still alive after SIGKILL: [${survivors.join(", ")}]` : ""),
      );
    }
    // Only unlink state that is genuinely stale. A live recorded holder owns
    // (or is about to publish) these files — unlinking under it would race
    // its bind; the daemon's lock + re-check resolves the duplicate.
    if (!holderAlive) {
      try {
        unlinkSync(sockPath);
      } catch {}
      try {
        unlinkSync(meshPidPath());
      } catch {}
    }
    if (this.stopped) return;

    // (Re)spawn re-reads ~/.pi/mesh-config.json so endpoint/mode/scouting
    // changes take effect on every (re)start (kal-0suu3dur).
    const configArg = this._sidecarConfigArg();
    const child = spawn(binPath, [configArg], { detached: true, stdio: "ignore" });
    child.unref(); // Don't keep pi alive for the sidecar

    const outcome = await this._awaitSidecarReady(child);
    if (this.stopped) return;
    if (outcome === "ready") {
      this._resetRepairRetry();
      this._flushReadyWaiters();
      return;
    }

    // The spawned candidate exited before becoming ready. If a peer session's
    // sidecar is already serving, we are done; otherwise the child's exit
    // event demanded a fresh repair — paced and unbounded (no give-up).
    if ((await probeSidecarSocket(sockPath)) === "serving") {
      this._resetRepairRetry();
      this._flushReadyWaiters();
      return;
    }
    if (this.stopped) return;
    const delay = this._armRepairRetry();
    console.warn(`[pi-mesh] sidecar candidate exited before ready — retrying repair in ${delay}ms`);
  }

  /**
   * Wait for the spawned sidecar to become serving. Two events settle this:
   * a successful connect probe, or the child's exit/spawn-error event. Probe
   * attempts are paced with capped backoff — a scheduler for the retry the
   * previous probe's error event demanded; nothing is abandoned by a clock
   * (kal-9g0w8pof).
   */
  private _awaitSidecarReady(child: ChildProcess): Promise<"ready" | "exited" | "stopped"> {
    return new Promise((resolvePromise) => {
      let settled = false;
      let probeTimer: ReturnType<typeof setTimeout> | null = null;
      let delay = REPAIR_RETRY_BASE_MS;
      const onExit = () => settle("exited");
      const onSpawnError = (err: Error) => {
        console.warn(`[pi-mesh] sidecar spawn failed: ${err.message}`);
        settle("exited");
      };
      child.once("exit", onExit);
      child.once("error", onSpawnError);
      const settle = (result: "ready" | "exited" | "stopped") => {
        if (settled) return;
        settled = true;
        if (probeTimer) {
          clearTimeout(probeTimer);
          probeTimer = null;
        }
        child.off("exit", onExit);
        child.off("error", onSpawnError);
        resolvePromise(result);
      };
      const probe = async (): Promise<void> => {
        if (settled) return;
        if (this.stopped) {
          settle("stopped");
          return;
        }
        const verdict = await probeSidecarSocket(this.sockPath ?? meshSocketPath());
        if (settled) return;
        if (verdict === "serving") {
          settle("ready");
          return;
        }
        probeTimer = setTimeout(() => {
          void probe();
        }, delay);
        delay = Math.min(delay * 2, REPAIR_RETRY_MAX_MS);
      };
      void probe();
    });
  }

  private _flushReadyWaiters(): void {
    const waiters = this.readyWaiters;
    this.readyWaiters = [];
    if (this.stopped) return;
    for (const waiter of waiters) {
      try {
        waiter();
      } catch (e) {
        console.warn("[pi-mesh] ready waiter failed:", e);
      }
    }
  }

  private _resetRepairRetry(): void {
    this.repairRetryDelayMs = REPAIR_RETRY_BASE_MS;
  }

  /**
   * Schedule the next event-demanded repair/reconnect attempt. Pacing is
   * capped backoff — a scheduler for the retry an event requested, never a
   * deadline or give-up (kal-9g0w8pof).
   */
  private _armRepairRetry(): number {
    const delay = this.repairRetryDelayMs;
    this.repairRetryDelayMs = Math.min(this.repairRetryDelayMs * 2, REPAIR_RETRY_MAX_MS);
    if (this.repairRetryTimer) clearTimeout(this.repairRetryTimer);
    this.repairRetryTimer = setTimeout(() => {
      this.repairRetryTimer = null;
      if (!this.stopped) void this._runEnsure();
    }, delay);
    return delay;
  }

  /**
   * The zenoh argv for a sidecar (re)spawn. Re-reads ~/.pi/mesh-config.json
   * on every call so endpoint/mode/scouting changes take effect on every
   * (re)start (kal-0suu3dur). An invalid config degrades to the sidecar's
   * own defaults with a warning instead of wedging the mesh.
   */
  private _sidecarConfigArg(): string {
    let machineConfig: MachineMeshConfigV1;
    try {
      // HOME-rooted, like the sock/pid paths (os.homedir() is not a
      // reliable view of the session's HOME).
      machineConfig = loadMachineMeshConfig(machineMeshConfigPath(meshHomeDir()));
    } catch (e) {
      console.warn("[pi-mesh] mesh-config.json is invalid — spawning sidecar with default config:", e);
      machineConfig = DEFAULT_MACHINE_MESH_CONFIG;
    }
    const config = toMeshConfig(machineConfig);
    const zenohConfig: Record<string, unknown> = {};
    if (config.mode) zenohConfig.mode = config.mode;
    if (config.endpoints) zenohConfig.connect = { endpoints: config.endpoints };
    if (config.scouting !== undefined) {
      zenohConfig.scouting = { multicast: { enabled: config.scouting } };
    }
    return JSON.stringify(zenohConfig);
  }

  private _connectSocket(): void {
    if (this.stopped || !this.sockPath) return;
    if (this.sock) return; // a connect is already in flight
    const sock = createConnection(this.sockPath);
    this.sock = sock;
    sock.on("data", (chunk: Buffer) => this._onData(chunk));
    sock.on("error", (err) => {
      console.warn(`[pi-mesh] socket error: ${err.message}`);
      this._handleSocketLost(sock);
    });
    sock.on("close", () => {
      this._handleSocketLost(sock);
    });

    this._startStalePeerEviction();
  }

  /**
   * A connection was lost (kernel close/error event) — rejoin (kal-0suu3dur):
   * make sure the singleton is serving (re-spawn it if it died — its OS lock
   * keeps it a singleton), then connect again. Event-driven and unbounded:
   * no attempt counters, no wall-clock abandonment (kal-9g0w8pof).
   *
   * A new connection gets a fresh client_id; the "ready" handler
   * re-establishes every subscription, and the durable-id subscription keeps
   * this session addressable across the client_id churn.
   */
  private _handleSocketLost(sock: Socket): void {
    if (this.sock !== sock) return; // stale event from an already-replaced socket
    const reachedReady = this.isSocketReady;
    this.isSocketReady = false;
    this.channelWildcardSubbed = false;
    this.sock = null;
    this._rejectPendingRequests("mesh connection lost — reconnecting");
    if (this.stopped) return;
    if (reachedReady) {
      // The session was live; the close event demanded an immediate rejoin.
      this._ensureSidecar(() => this._connectSocket());
    } else {
      // The connection never reached "ready" — a failing connect cycle. Queue
      // the reconnect and pace the next attempt (a scheduler for an
      // event-demanded retry; no give-up).
      this.readyWaiters.push(() => this._connectSocket());
      const delay = this._armRepairRetry();
      console.warn(`[pi-mesh] connection lost before ready — retrying in ${delay}ms`);
    }
  }

  /**
   * In-flight ask/tell/askWithReceipt requests can never be answered on a
   * dead connection — reject them so callers fail fast instead of hanging
   * until their own timeout.
   */
  private _rejectPendingRequests(reason: string): void {
    const error = new Error(reason);
    for (const pending of this.pendingGets.values()) {
      try {
        pending.reject(error);
      } catch {}
    }
    this.pendingGets.clear();
    for (const pending of this.pendingAskReceipts.values()) {
      try {
        pending.reject(error);
      } catch {}
    }
    this.pendingAskReceipts.clear();
    for (const pending of this.pendingTellReceipts.values()) {
      try {
        pending.reject(error);
      } catch {}
    }
    this.pendingTellReceipts.clear();
  }

  stop(): void {
    this.stopped = true;
    if (this.repairRetryTimer) {
      clearTimeout(this.repairRetryTimer);
      this.repairRetryTimer = null;
    }
    this.readyWaiters = [];
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.stalePeerTimer) {
      clearInterval(this.stalePeerTimer);
      this.stalePeerTimer = null;
    }
    this._send({ cmd: "close" });
    // Don't kill sidecar — other sessions may be connected
    if (this.sock) {
      try {
        this.sock.destroy();
      } catch {}
    }
    this.sock = null;
    this.isSocketReady = false;
    this.channelWildcardSubbed = false;
    this.myClientId = "";
    this._rejectPendingRequests("mesh stopped");
  }

  setName(name: string | undefined): void {
    this.myName = name;
  }

  tell(
    sessionId: string,
    message: unknown,
    opts?: { preempt?: MeshTellPreemptLevel },
  ): { deliveryId: string } {
    const deliveryId = createDeliveryId();
    const tellEnvelope: MeshTellEnvelope = {
      kind: "mesh:tell",
      deliveryId,
      from: this.myClientId,
      ...(opts?.preempt ? { preempt: opts.preempt } : {}),
      payload: message,
      timestamp: Date.now(),
    };
    const envelope: MeshMessage = {
      from: this.myClientId,
      topic: `session/${sessionId}`,
      payload: tellEnvelope,
      timestamp: Date.now(),
    };
    this._send({
      cmd: "publish",
      topic: `pi/mesh/session/${sessionId}`,
      payload: JSON.stringify(envelope),
    });
    return { deliveryId };
  }

  tellAndWaitForReceipt(
    sessionId: string,
    message: unknown,
    phase: MeshTellReceiptWaitForPhase,
    timeoutMs = 10_000,
    opts?: { preempt?: MeshTellPreemptLevel },
  ): Promise<MeshTellAckEnvelope> {
    return new Promise((resolve, reject) => {
      const deliveryId = createDeliveryId();
      const requestedPhase = canonicalTellReceiptPhase(phase);
      const timer = setTimeout(() => {
        this.pendingTellReceipts.delete(deliveryId);
        reject(new Error(`mesh_tell: timeout waiting for ${requestedPhase} receipt after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingTellReceipts.set(deliveryId, {
        phase: requestedPhase,
        resolve: (ack) => {
          clearTimeout(timer);
          resolve(ack);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      const tellEnvelope: MeshTellEnvelope = {
        kind: "mesh:tell",
        deliveryId,
        from: this.myClientId,
        ackRequested: requestedPhase,
        ...(opts?.preempt ? { preempt: opts.preempt } : {}),
        payload: message,
        timestamp: Date.now(),
      };
      const envelope: MeshMessage = {
        from: this.myClientId,
        topic: `session/${sessionId}`,
        payload: tellEnvelope,
        timestamp: Date.now(),
      };
      this._send({
        cmd: "publish",
        topic: `pi/mesh/session/${sessionId}`,
        payload: JSON.stringify(envelope),
      });
    });
  }

  sendTellReceipt(sessionId: string, ack: MeshTellAckEnvelope | MeshAskReceiptEnvelope): void {
    const envelope: MeshMessage = {
      from: this.myClientId,
      topic: `session/${sessionId}`,
      payload: ack,
      timestamp: Date.now(),
    };
    this._send({
      cmd: "publish",
      topic: `pi/mesh/session/${sessionId}`,
      payload: JSON.stringify(envelope),
    });
  }

  ask(sessionId: string, message: unknown, timeoutMs = 30_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const askId = createAskId();
      const timer = setTimeout(() => {
        this.pendingGets.delete(askId);
        reject(new Error(`mesh_ask: timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingGets.set(askId, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });

      this.tell(
        sessionId,
        buildMeshAskEnvelope(this.myClientId, message, askId, undefined, timeoutMs),
      );
    });
  }

  askWithReceipt(
    sessionId: string,
    message: unknown,
    timeoutMs = 30_000,
    receiptPhase: MeshAskReceiptWaitForPhase = "delivered",
  ): Promise<{
    reply: unknown;
    receipt?: MeshAskReceiptEnvelope;
    receipts: MeshAskReceiptEnvelope[];
  }> {
    return new Promise((resolve, reject) => {
      const askId = createAskId();
      let receipt: MeshAskReceiptEnvelope | undefined;
      let receipts: MeshAskReceiptEnvelope[] = [];
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        this.pendingGets.delete(askId);
        this.pendingAskReceipts.delete(askId);
        fn();
      };

      const timer = setTimeout(() => {
        finish(() => {
          const receiptNote =
            receipts.length > 0
              ? ` receipts: ${formatMeshAskReceiptTrail(receipts)}; no final reply arrived`
              : " no delivery receipt arrived";
          reject(new Error(`mesh_ask: timeout after ${timeoutMs}ms;${receiptNote}`));
        });
      }, timeoutMs);

      this.pendingAskReceipts.set(askId, {
        noteReceipt: (ack) => {
          receipts = appendMeshAskReceipt(receipts, ack);
          receipt = ack;
        },
        reject: (error) => {
          clearTimeout(timer);
          finish(() => reject(error));
        },
      });

      this.pendingGets.set(askId, {
        resolve: (reply) => {
          clearTimeout(timer);
          finish(() => resolve({ reply, receipt, receipts }));
        },
        reject: (error) => {
          clearTimeout(timer);
          finish(() => reject(error));
        },
      });

      this.tell(
        sessionId,
        buildMeshAskEnvelope(this.myClientId, message, askId, receiptPhase, timeoutMs),
      );
    });
  }

  broadcast(topic: string, message: unknown): void {
    const envelope: MeshMessage = {
      from: this.myClientId,
      topic,
      payload: message,
      timestamp: Date.now(),
    };
    this._send({
      cmd: "publish",
      topic: `pi/mesh/broadcast/${topic}`,
      payload: JSON.stringify(envelope),
    });
  }

  /** Join a named channel. Inbound messages fire the "channel" event (no turn trigger). */
  joinChannel(channelId: string): void {
    if (this.channelSubs.has(channelId)) return;
    this.channelSubs.add(channelId);
    this._ensureChannelSubscription();
  }

  /** Leave a channel — stops emitting "channel" events for this ID. */
  leaveChannel(channelId: string): void {
    this.channelSubs.delete(channelId);
  }

  /** Post a message to a channel. Does not trigger a turn on receivers. */
  chat(channelId: string, message: unknown): void {
    const envelope: ChannelMessage = {
      from: this.myClientId,
      channel: channelId,
      payload: message,
      timestamp: Date.now(),
    };
    this._send({
      cmd: "publish",
      topic: `pi/mesh/channel/${channelId}`,
      payload: JSON.stringify(envelope),
    });
  }

  /** Info about this session, using stable mesh identity when available. */
  self(): PeerInfo {
    return {
      id: this.myIdentity?.id ?? this.myClientId,
      sessionId: this.mySessionId,
      name: this.myName,
      nickname:
        this.myIdentity?.nickname ??
        getLiveNickname(this.myClientId) ??
        getLiveNickname(this.mySessionId),
      hostname: hostname(),
      cwd: process.cwd(),
      lastSeen: Date.now(),
      claimedAt: this.myIdentity?.claimedAt,
      zmxSession: this.myIdentity?.zmxSession,
    };
  }

  /**
   * Returns true if `id` refers to this session.
   *
   * Outbound envelopes stamp `from: this.myClientId` (the routing identity),
   * but `self().id` prefers `this.myIdentity.id` (the stable identity) once
   * resolved. Any echo guard that compares a wire `from` field against this
   * session MUST use this helper — comparing against `self().id` alone misses
   * the routing-identity case and lets self-messages through.
   */
  isSelf(id: string | undefined | null): boolean {
    if (!id) return false;
    if (id === this.myClientId) return true;
    if (this.myIdentity && id === this.myIdentity.id) return true;
    return false;
  }

  /** Set the stable mesh identity (called by the identity resolution logic).
   *
   *  Durable-id routing: once the identity is known, become reachable at
   *  `pi/mesh/session/${durableId}` so a tell addressed to the durable id lands
   *  regardless of sidecar clientId churn — the clientId is a per-connection
   *  transport detail; the durable mesh id is the address. Re-announce right away
   *  so peers learn our meshId without waiting for the next heartbeat. */
  setIdentity(identity: MeshIdentity): void {
    this.myIdentity = identity;
    if (this.isSocketReady && this.myClientId) {
      this._subscribeToDurableTopic();
      this._announce(this.myClientId, process.cwd());
    }
  }

  /** Subscribe to this session's durable-identity topic so inbound tells routed
   *  by durable id are delivered even after the sidecar clientId changes. Safe to
   *  call repeatedly (the sidecar dedups) and before identity is known (no-op). */
  private _subscribeToDurableTopic(): void {
    const durableId = this.myIdentity?.id;
    if (!durableId || durableId === this.myClientId) return;
    this._send({ cmd: "subscribe", topic: `pi/mesh/session/${durableId}` });
  }

  /** Get the current stable mesh identity (if resolved). */
  getIdentity(): MeshIdentity | null {
    return this.myIdentity;
  }

  peers(): PeerInfo[] {
    return Array.from(this.peerMap.values());
  }

  // The "message" event delivers an already-unwrapped InboundMeshMessage: the
  // inner payload is at .message.payload, so a consumer cannot forget to unwrap
  // and silently drop a wrapped tell (see the emit site in _handleMsg).
  on(event: "message", cb: MeshEventCallback<InboundMeshMessage>): void;
  on<T = unknown>(event: MeshEventType, cb: MeshEventCallback<T>): void;
  // biome-ignore lint/suspicious/noExplicitAny: implementation signature must accept every overload's callback variance
  on(event: MeshEventType, cb: MeshEventCallback<any>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb as MeshEventCallback);
  }

  off<T = unknown>(event: MeshEventType, cb: MeshEventCallback<T>): void {
    this.listeners.get(event)?.delete(cb as MeshEventCallback);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private _emit(event: MeshEventType, data: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) {
      try {
        cb(data);
      } catch {}
    }
  }

  private _send(obj: Record<string, unknown>): void {
    if (!this.sock?.writable) return;
    try {
      this.sock.write(JSON.stringify(obj) + "\n");
    } catch {
      // socket broken — sidecar died
    }
  }

  private _onData(chunk: Buffer): void {
    this.lineBuf += chunk.toString();
    let nl: number;
    while ((nl = this.lineBuf.indexOf("\n")) !== -1) {
      const line = this.lineBuf.slice(0, nl).trim();
      this.lineBuf = this.lineBuf.slice(nl + 1);
      if (!line) continue;
      try {
        this._handleEvent(JSON.parse(line));
      } catch {}
    }
  }

  private _handleEvent(ev: Record<string, unknown>): void {
    switch (ev.ev) {
      case "ready":
        // Sidecar ready — extract unique client identity (routing only, NOT identity)
        this.myZid = (ev.zid as string) ?? "";
        this.myClientId = (ev.client_id as string) ?? "";
        this.isSocketReady = true;
        // NOTE: setStableId is now called from identity resolution, not from sidecar ready.
        // The sidecar's client_id stays as routing address only.
        if (!this.myClientId) {
          console.warn("[pi-mesh] sidecar reported empty client_id — subscriptions deferred");
          break;
        }
        this._setupSubscriptions(this.myClientId, process.cwd());
        this._ensureChannelSubscription();
        this._announce(this.myClientId, process.cwd());
        this._startHeartbeat(this.myClientId, process.cwd());
        this._emit("ready", this.self());
        break;
      case "msg":
        this._handleMsg(ev.topic as string, ev.payload as string);
        break;
      case "error":
        console.warn(`[pi-mesh sidecar] ${ev.msg}`);
        break;
    }
  }

  private _handleMsg(topic: string, payload: string): void {
    if (topic.startsWith("pi/mesh/announce/")) {
      try {
        const ann: AnnouncePayload = JSON.parse(payload);
        this._handleAnnounce(ann);
      } catch {}
    } else if (topic.startsWith("pi/mesh/channel/")) {
      const channelId = topic.slice("pi/mesh/channel/".length);
      if (this.channelSubs.has(channelId)) {
        try {
          const msg: ChannelMessage = JSON.parse(payload);
          this._emit("channel", msg);
        } catch {}
      }
    } else if (topic.startsWith("pi/mesh/session/") || topic.startsWith("pi/mesh/broadcast/")) {
      try {
        const msg: MeshMessage = JSON.parse(payload);
        if (isMeshAskReceiptEnvelope(msg.payload)) {
          const pending = this.pendingAskReceipts.get(msg.payload.askId);
          if (pending) {
            pending.noteReceipt(msg.payload);
          }
          return;
        }
        if (isMeshTellAckEnvelope(msg.payload)) {
          const pending = this.pendingTellReceipts.get(msg.payload.deliveryId);
          if (pending && tellReceiptSatisfies(pending.phase, msg.payload.phase)) {
            this.pendingTellReceipts.delete(msg.payload.deliveryId);
            pending.resolve(msg.payload);
          }
          return;
        }
        const unwrapped = unwrapInboundTell(msg);
        // Check if this inbound tell is a reply to a pending ask (contains askId)
        const innerPayload = unwrapped.message.payload;
        if (
          innerPayload &&
          typeof innerPayload === "object" &&
          "askId" in (innerPayload as Record<string, unknown>)
        ) {
          const askId = (innerPayload as Record<string, unknown>).askId;
          if (typeof askId === "string") {
            const pending = this.pendingGets.get(askId);
            if (pending) {
              this.pendingGets.delete(askId);
              // If the reply wraps { askId, response }, unwrap to just the response
              const resolved =
                "response" in (innerPayload as Record<string, unknown>)
                  ? (innerPayload as Record<string, unknown>).response
                  : innerPayload;
              pending.resolve(resolved);
              return;
            }
          }
        }
        if (isMeshAskEnvelope(innerPayload)) {
          const ask = innerPayload as import("./ask-protocol.ts").MeshAskEnvelope;
          if (ask.receiptRequested) {
            this.sendTellReceipt(
              ask.from,
              buildMeshAskReceipt(ask.askId, this.myClientId, "delivered"),
            );
          }
          const senderPeer = this.peerMap.get(ask.from) ?? { id: ask.from, lastSeen: Date.now() };
          const event: RequestEvent = {
            requestId: this.nextInboundAskRequestId++,
            from: senderPeer,
            payload: ask.payload,
            askId: ask.askId,
            askReceiptRequested: ask.receiptRequested,
            timestamp: ask.timestamp,
            timeoutMs: ask.timeoutMs,
          };
          this._emit("request", event);
          return;
        }
        this._emit("message", unwrapped);
      } catch {}
    }
  }

  private _handleAnnounce(ann: AnnouncePayload): void {
    if (ann.clientId === this.myClientId) return;
    const key = ann.clientId || ann.sessionId;
    const existing = this.peerMap.get(key);
    const peer: PeerInfo = {
      id: key,
      sessionId: ann.sessionId,
      name: ann.name,
      hostname: ann.hostname,
      nickname: ann.nickname,
      cwd: ann.cwd,
      lastSeen: Date.now(),
      claimedAt: ann.claimedAt,
      meshId: ann.meshId,
      zmxSession: ann.zmxSession,
    };
    this.peerMap.set(key, peer);
    if (!existing) this._emit("peer-join", peer);

    // ── Nickname conflict detection ──────────────────────────────────────
    if (this.myIdentity && ann.nickname && ann.nickname === this.myIdentity.nickname) {
      const peerMeshId = ann.meshId ?? ann.clientId;
      if (peerMeshId !== this.myIdentity.id) {
        // Same nickname, different identity → collision. Deterministic tie-break.
        const peerClaimedAt = ann.claimedAt ?? Date.now();
        const iLose =
          peerClaimedAt < this.myIdentity.claimedAt ||
          (peerClaimedAt === this.myIdentity.claimedAt && peerMeshId < this.myIdentity.id);
        if (iLose) {
          // We yield — re-claim nickname and notify via _onNicknameConflict callback
          const liveNicknames = new Set(
            this.peers()
              .map((p) => p.nickname)
              .filter(Boolean) as string[],
          );
          liveNicknames.add(ann.nickname); // peer keeps it
          const newNickname = claimNickname(this.myIdentity.id, liveNicknames);
          this.myIdentity = { ...this.myIdentity, nickname: newNickname };
          setStableId(this.myIdentity.id); // re-trigger listeners
          // Re-announce with updated nickname
          this._announce(this.myClientId, process.cwd());
          // Emit conflict event so the extension can persist the updated identity
          this._emit("peer-join", this.self()); // trigger listeners for self-update
          if (this._onNicknameConflict) this._onNicknameConflict(this.myIdentity);
        }
        // else: they lose — they'll handle it on their side
      }
    }
  }

  /** Callback invoked when this peer yields on a nickname conflict. Set by the extension. */
  private _onNicknameConflict: ((updatedIdentity: MeshIdentity) => void) | null = null;

  onNicknameConflict(cb: (updatedIdentity: MeshIdentity) => void): void {
    this._onNicknameConflict = cb;
  }

  private _setupSubscriptions(clientId: string, _cwd: string): void {
    this._send({ cmd: "subscribe", topic: `pi/mesh/session/${clientId}` });
    // Durable-id routing: also subscribe to our stable-identity topic when the
    // identity is already resolved (e.g. reconnect after a reload). On a first
    // connect the identity resolves slightly later, and setIdentity() adds this
    // subscription then.
    this._subscribeToDurableTopic();
    this._send({ cmd: "subscribe", topic: "pi/mesh/announce/**" });
    this._send({ cmd: "subscribe", topic: "pi/mesh/broadcast/**" });
  }

  private _ensureChannelSubscription(): void {
    if (!this.isSocketReady || !this.sock?.writable) return;
    if (this.channelWildcardSubbed || this.channelSubs.size === 0) return;
    this._send({ cmd: "subscribe", topic: "pi/mesh/channel/**" });
    this.channelWildcardSubbed = true;
  }

  private _announce(clientId: string, cwd: string): void {
    const ann: AnnouncePayload = {
      clientId,
      zid: this.myZid,
      sessionId: this.mySessionId,
      name: this.myName,
      nickname:
        this.myIdentity?.nickname ?? getLiveNickname(clientId) ?? getLiveNickname(this.mySessionId),
      hostname: hostname(),
      pid: process.pid,
      cwd,
      claimedAt: this.myIdentity?.claimedAt,
      meshId: this.myIdentity?.id,
      zmxSession: this.myIdentity?.zmxSession,
    };
    this._send({
      cmd: "publish",
      topic: `pi/mesh/announce/${clientId}`,
      payload: JSON.stringify(ann),
    });
  }

  private _startHeartbeat(clientId: string, cwd: string): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => this._announce(clientId, cwd), this.announceIntervalMs);
  }

  updateSessionId(newId: string): void {
    if (newId === this.mySessionId) return;
    this.mySessionId = newId;
    this._announce(this.myClientId, process.cwd());
  }

  private _startStalePeerEviction(): void {
    if (this.stalePeerTimer) clearInterval(this.stalePeerTimer);
    this.stalePeerTimer = setInterval(() => {
      const cutoff = Date.now() - 90_000;
      for (const [id, peer] of this.peerMap) {
        if (peer.lastSeen < cutoff) {
          this.peerMap.delete(id);
          this._emit("peer-leave", peer);
        }
      }
    }, 30_000);
  }
}

// ── Identity resolution ──────────────────────────────────────────────────────

// Constants live in mesh-constants.ts so helper modules (rebirth-wake.ts,
// inbound-format.ts, etc.) can import them without pulling the whole
// pi-mesh.ts module graph.
import {
	MESH_IDENTITY_TYPE,
	MESH_CHANNELS_TYPE,
	MESH_BROADCAST_ALLOWED_TYPE,
	MESH_REBIRTH_TYPE,
} from "./mesh-constants.ts";
import { buildRebirthCommandPrompt, buildRebirthWakeMessage, extractRebirthMarker } from "./rebirth-wake.ts";

/**
 * Scan session entries for the most recent mesh_identity custom entry.
 * Returns the identity data, or null if none found.
 */
function resolveIdentityFromSession(ctx: {
  sessionManager: {
    getEntries: () => Array<{ type: string; customType?: string; data?: unknown }>;
  };
}): MeshIdentity | null {
  let latest: MeshIdentity | null = null;
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === MESH_IDENTITY_TYPE && entry.data) {
      latest = entry.data as MeshIdentity;
    }
  }
  return latest;
}

/**
 * Scan session entries for the most recent mesh_channels custom entry.
 * Returns the persisted channel ID list, or an empty array if none found.
 *
 * Channel subscriptions live on the PiMesh instance, which gets recreated
 * on every /reload. Without persistence, users would silently drop out of
 * every channel they joined after a reload. We persist the current channel
 * set on every join/leave and rejoin them on session_start.
 */
function resolveChannelsFromSession(ctx: {
  sessionManager: {
    getEntries: () => Array<{ type: string; customType?: string; data?: unknown }>;
  };
}): string[] {
  let latest: string[] = [];
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === MESH_CHANNELS_TYPE && entry.data) {
      const data = entry.data as { channels?: unknown };
      if (Array.isArray(data.channels)) {
        latest = data.channels.filter((c): c is string => typeof c === "string");
      }
    }
  }
  return latest;
}

/**
 * Scan session entries for the most recent mesh_broadcast_allowed custom entry.
 *
 * Broadcasts are globally-visible screams to every peer on the mesh, and by
 * policy agents are NOT allowed to emit them by default — too easy to spam
 * every other session on the network with a single publish. The hooman must
 * explicitly opt-in per session via `/mesh allow-broadcast on`. We persist
 * the decision so /reload and resume keep the setting.
 */
function resolveBroadcastAllowedFromSession(ctx: {
  sessionManager: {
    getEntries: () => Array<{ type: string; customType?: string; data?: unknown }>;
  };
}): boolean {
  let latest = false;
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === MESH_BROADCAST_ALLOWED_TYPE && entry.data) {
      const data = entry.data as { allowed?: unknown };
      if (typeof data.allowed === "boolean") latest = data.allowed;
    }
  }
  return latest;
}

/**
 * Resolve and set the mesh identity based on session_start reason.
 *
 * v1a identity-pin: reload / resume / startup / rebirth REUSE the durable
 * session's existing mesh id instead of re-minting it. Since the nickname is a
 * deterministic function of the id, pinning the id keeps the name stable across
 * resume/revive for free. Only `fork` and a genuinely new `/new` session mint a
 * fresh id. A genuine concurrent duplicate is disambiguated by the DISPLAY-only
 * nickname rename in _handleAnnounce (and, in v1c, the activation lease) — never
 * by re-minting the id, which was the identity-churn bug (Simon→Robert Kirshner).
 */
export function resolveAndSetIdentity(
  reason: string,
  ctx: {
    sessionManager: {
      getEntries: () => Array<{ type: string; customType?: string; data?: unknown }>;
      getSessionId: () => string;
    };
  },
  mesh: PiMesh,
  pi: ExtensionAPI,
  environment: ZmxSessionEnvironment = process.env,
): void {
  const existing = resolveIdentityFromSession(ctx);
  const zmxSession = readZmxSession(environment);

  // Reuse the pinned identity for every reason except fork / genuine-new.
  if (existing && isIdentityReuseReason(reason, !!extractRebirthMarker(ctx))) {
    const zmxReconciliation = reconcileZmxSession(existing, zmxSession);
    // Reclaim the DISPLAY nickname only if a DIFFERENT identity already holds it.
    // A lingering same-id predecessor (dead incarnation still in the peer window)
    // is our own id and must not rename us — that keeps /resume's name stable.
    const nicknameResolution = resolveReuseNickname(zmxReconciliation.identity, mesh.peers());
    const identity = nicknameResolution.changed
      ? { ...zmxReconciliation.identity, nickname: nicknameResolution.nickname }
      : zmxReconciliation.identity;
    mesh.setIdentity(identity);
    setStableId(identity.id);
    if (zmxReconciliation.changed || nicknameResolution.changed) {
      pi.appendEntry(MESH_IDENTITY_TYPE, identity);
    }
    return;
  }
  // fork, new (non-rebirth), or missing identity → generate a fresh identity below.

  // Generate fresh identity
  const id = randomUUID();
  const liveNicknames = new Set(
    mesh
      .peers()
      .map((p) => p.nickname)
      .filter(Boolean) as string[],
  );
  const nickname = claimNickname(id, liveNicknames);
  const identity: MeshIdentity = {
    id,
    nickname,
    claimedAt: Date.now(),
    host: hostname(),
    ...(zmxSession === undefined ? {} : { zmxSession }),
  };
  mesh.setIdentity(identity);
  setStableId(identity.id);
  try {
    pi.appendEntry(MESH_IDENTITY_TYPE, identity);
  } catch (e) {
    console.warn("[pi-mesh] Failed to persist mesh identity:", e);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a human-readable string from any message payload. */
function extractPayloadText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.question === "string") return p.question;
    if (typeof p.message === "string") return p.message;
    if (typeof p.text === "string") return p.text;
    if (typeof p.content === "string") return p.content;
  }
  return JSON.stringify(payload);
}

/** Pretty-print a structured object/array as a fenced JSON code block. */
function prettyPrintJsonValue(value: unknown): string {
  return "```json\n" + JSON.stringify(value, null, 2) + "\n```";
}

/** Try to parse a string as a JSON object or array. Returns undefined on any other shape. */
function tryParseJsonStructured(s: string): unknown | undefined {
  const trimmed = s.trim();
  if (trimmed.length < 2) return undefined;
  const first = trimmed[0];
  if (first !== "{" && first !== "[") return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* not JSON — fall through */
  }
  return undefined;
}

/**
 * Try to render a structured object as readable prose.
 *
 * Agents commonly send payloads like `{from, type, subject, body}` or
 * `{from, topic, text}`. When we detect these shapes, render them as
 * a human-readable message instead of a raw JSON block.
 *
 * Returns undefined if the object doesn't match a known prose pattern.
 */
function tryRenderAsMessage(obj: Record<string, unknown>): string | undefined {
  // Resolve the main body text from common field names.
  const body =
    typeof obj.body === "string"
      ? obj.body
      : typeof obj.text === "string"
        ? obj.text
        : typeof obj.message === "string"
          ? obj.message
          : typeof obj.content === "string"
            ? obj.content
            : undefined;
  if (!body) return undefined;

  const parts: string[] = [];

  // Header: subject or topic line (bold via markdown)
  const headline =
    typeof obj.subject === "string"
      ? obj.subject
      : typeof obj.topic === "string"
        ? obj.topic
        : undefined;
  if (headline) parts.push(`**${headline}**`);

  // Body text — unescape literal \n that LLMs bake into JSON string values.
  parts.push(body.replace(/\\n/g, "\n"));

  return parts.join("\n");
}

/**
 * Format a message payload for human display.
 *
 * 1. Strings pass through unless they contain a JSON object/array — those are
 *    parsed and re-formatted.
 * 2. Objects with a recognisable message shape (subject/body, topic/text, etc.)
 *    render as readable prose with a bold headline.
 * 3. Single-field text wrappers (`{text: "hi"}`) unwrap cleanly.
 * 4. Everything else pretty-prints as a ```json fenced code block.
 */
function formatPayloadForDisplay(payload: unknown): string {
  if (typeof payload === "string") {
    const parsed = tryParseJsonStructured(payload);
    if (parsed !== undefined) return formatPayloadForDisplay(parsed);
    return payload;
  }
  if (payload === null || payload === undefined) return String(payload);
  if (typeof payload !== "object") return String(payload);
  if (Array.isArray(payload)) return prettyPrintJsonValue(payload);

  const obj = payload as Record<string, unknown>;
  const keys = Object.keys(obj);

  // Unwrap single-field text carriers so `{text: "hi"}` still renders as "hi".
  if (keys.length === 1) {
    const k = keys[0];
    const v = obj[k];
    if (
      (k === "text" || k === "message" || k === "content" || k === "question") &&
      typeof v === "string"
    ) {
      return formatPayloadForDisplay(v);
    }
  }

  // Try to render as human-readable prose (subject/body, topic/text, etc.).
  const prose = tryRenderAsMessage(obj);
  if (prose) return prose;

  // Fallback: fenced JSON block.
  return prettyPrintJsonValue(obj);
}

/** Returns true for teams lifecycle events that should NOT show as generic chat.
 *  teams:comment is allowed through — it's the only user-facing content. */
function isTeamsLifecyclePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (
    p.version === 1 &&
    typeof p.teamId === "string" &&
    typeof p.type === "string" &&
    (p.from === "worker" || p.from === "leader")
  ) {
    return true;
  }
  const kind = p.kind;
  if (typeof kind !== "string" || !kind.startsWith("teams:")) return false;
  return kind !== "teams:comment"; // comments are user content — show them
}

/** Payload marker for control-plane tells — harness commands (setModel, …), not
 *  conversation. Routed to a registered handler and never surfaced to the LLM. */
const MESH_CONTROL_KIND = "mesh:control";

/** Handler for a control-plane op. Receives the op name, the raw payload, and the
 *  sender's id (for authorization — the handler decides who may issue the op). */
type MeshControlHandler = (input: {
  op: string;
  payload: Record<string, unknown>;
  from: string | undefined;
}) => void;

/** Registry other extensions populate to handle mesh:control ops. Symmetric with
 *  globalThis.__piMesh (which exposes SENDING) — this exposes inbound control. */
function meshControlRegistry(): Map<string, MeshControlHandler> {
  const g = globalThis as unknown as { __piMeshControls?: Map<string, MeshControlHandler> };
  if (!g.__piMeshControls) g.__piMeshControls = new Map();
  return g.__piMeshControls;
}

/** Route a control-plane tell to its registered handler. Returns true when the
 *  payload IS a control tell (so the caller must NOT surface it to the LLM),
 *  whether or not a handler was registered for the op. */
function routeControlTell(payload: unknown, from: string | undefined): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (p.kind !== MESH_CONTROL_KIND) return false;
  const op = typeof p.op === "string" ? p.op : "";
  const handler = op ? meshControlRegistry().get(op) : undefined;
  if (!handler) {
    console.warn("[pi-mesh] control tell with no handler for op:", op || "(missing)");
    return true;
  }
  try {
    handler({ op, payload: p, from });
  } catch (e) {
    console.warn("[pi-mesh] control handler error for op", op, ":", e);
  }
  return true;
}

function getPeerLabel(peer: PeerInfo): string {
  return peer.nickname?.trim() || peer.name?.trim() || peer.id.slice(0, 8);
}

function getPeerExtraParts(peer: PeerInfo): string[] {
  const parts: string[] = [];
  if (!peer.nickname && peer.name?.trim()) parts.push(peer.name.trim());
  if (peer.hostname?.trim()) parts.push(peer.hostname.trim());
  if (peer.cwd?.trim()) parts.push(peer.cwd.trim());
  if (peer.zmxSession?.trim()) parts.push(`zmx: ${peer.zmxSession.trim()}`);
  return parts;
}

function getLiveNickname(id?: string | null): string | undefined {
  return getSessionNicknameText(id ?? undefined) ?? undefined;
}

function isMeshViewRequest(
  payload: unknown,
): payload is { kind: "mesh:view"; start?: number; end?: number } {
  return (
    !!payload &&
    typeof payload === "object" &&
    (payload as Record<string, unknown>).kind === "mesh:view"
  );
}

/**
 * Render the enriched tell receipt for human/tool display: the receiver's
 * busy/deafened state plus the bounded "what were they doing" snapshot that
 * rode back on the ack. This is the "before" window the sender uses to decide
 * whether to wait, follow up, or preempt.
 */
export function formatTellAckReceipt(ack: MeshTellAckEnvelope): string {
  const parts: string[] = [];
  if (ack.receiverDeafened) {
    parts.push("⚠️ peer is DEAFENED (/mesh deafen) — message dropped, not surfaced.");
  } else if (ack.receiverBusy) {
    parts.push("peer was BUSY (mid-turn) when this landed.");
  } else if (ack.receiverBusy === false) {
    parts.push("peer was IDLE when this landed.");
  }
  // Abort outcome — present only on preempt='abort' acks. false ⟹ no-op (idle peer
  // or no live ctx); the sender must NOT assume the peer's work was stopped.
  if (ack.aborted === true) {
    parts.push("🛑 abort FIRED — the peer's in-flight operation was cancelled.");
  } else if (ack.aborted === false) {
    parts.push(
      "⚠️ abort was a NO-OP — nothing was in flight (peer idle) or the peer had no live session context. The peer's work was NOT stopped.",
    );
  }
  // Empty-window check via entries.length (not a brittle string compare against
  // formatSessionViewEntries' empty-window prose).
  if (ack.view && ack.view.entries.length > 0) {
    parts.push("", "— recent activity on the peer —", ack.view.text);
  }
  return parts.join("\n");
}

// ── Extension entry point ─────────────────────────────────────────────────────

export default function piMeshExtension(pi: ExtensionAPI) {
  let binPath = resolveBinPath();
  if (!binPath) {
    // Binary missing — kick off a background build now and notify the user
    // once the extension runtime is initialized. We cannot call pi.sendMessage
    // synchronously from inside the load callback: pi 0.74+ rejects action
    // methods during loading with "Extension runtime not initialized". The
    // build kickoff itself is just a child process spawn and is safe at load
    // time. The user-facing notice is deferred to the next session_start.
    const extensionDir = dirname(fileURLToPath(import.meta.url));
    const nativeDir = resolve(extensionDir, "..", "native");
    const buildScript = resolve(nativeDir, "build.sh");
    const proc = spawn("bash", [buildScript], { cwd: nativeDir, stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) {
        console.warn("[pi-mesh] Build complete. Restart pi to activate mesh tools.");
      } else {
        console.warn(
          `[pi-mesh] Build failed (exit ${code}). Run: cd packages/pi-mesh/native && ./build.sh`,
        );
      }
    });
    let buildNoticeSent = false;
    pi.on("session_start", () => {
      if (buildNoticeSent) return;
      buildNoticeSent = true;
      pi.sendMessage({
        customType: "mesh-build",
        content:
          "[pi-mesh] Binary not found — building now (~2 min). Restart pi when done.\n\nRun manually: cd packages/pi-mesh/native && ./build.sh",
        display: true,
      });
    });
    return;
  }

  const mesh = new PiMesh();
  let started = false;
  let currentCtx: {
    sessionManager: {
      getBranch: () => unknown[];
      getSessionId: () => string;
      getLeafEntry: () => unknown;
      getEntry: (id: string) => unknown;
    };
    abort: () => void;
  } | null = null;

  // Tail-bounded snapshot of THIS session for enriched tell receipts. Walks
  // parent pointers back from the leaf — O(window), with NO full-branch
  // materialization. (getBranch() is O(n^2); calling it on every inbound tell
  // would be an O(session) regression — review finding, ADR perf-constraint #0.)
  // Returns undefined when no session context is bound yet.
  const buildReceiverSnapshot = (): import("./types.ts").MeshTellAckView | undefined => {
    if (!currentCtx) return undefined;
    try {
      const sm = currentCtx.sessionManager;
      return buildSessionTailSnapshotFromLeaf(
        () => sm.getLeafEntry(),
        (id) => sm.getEntry(id),
      );
    } catch {
      return undefined;
    }
  };
  let rebirthStash: {
    ctx: ExtensionCommandContext;
    sessionId: string;
    sessionName: string | null;
    sessionFile: string | undefined;
    cwd: string;
    identity: MeshIdentity;
    channels: string[];
    broadcastAllowed: boolean;
  } | null = null;
  let agentBusy = false;
  // ── v1c revive-drain barrier (ADD-2, FIFO across the hibernation seam) ──────
  // While a revive is draining the DURABLE mailbox, a live tell must NOT surface
  // ahead of the hibernated mail. pendingReviveDrain holds live 'surface' tells in
  // the active mailbox until the durable batch has been surfaced; reviveDrained is
  // the one-shot guard so we drain exactly once per incarnation.
  let pendingReviveDrain = true;
  let reviveDrained = false;
  // Deafen silences incoming mesh messages (both direct tells and channel chat)
  // so the TUI stays quiet while you're focused. Toggled via /mesh deafen.
  // Mute blocks outbound mesh tell/chat/ask from your session so accidental
  // slash commands don't broadcast anything. Toggled via /mesh mute.
  // broadcastAllowed gates outbound mesh.broadcast from both the code-mode
  // sandbox fn and the mesh_broadcast tool. Default OFF — agents must get
  // explicit hooman approval via /mesh allow-broadcast on before they can
  // scream at every peer on the network. Persisted per session.
  let deafened = false;
  let muted = false;
  let broadcastAllowed = false;
  const persistBroadcastAllowed = (): void => {
    try {
      pi.appendEntry(MESH_BROADCAST_ALLOWED_TYPE, { allowed: broadcastAllowed });
    } catch {}
  };
  let ambientChatFlushTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingAmbientChat: Array<{ channelId: string; senderLabel: string; text: string; sentAt: number }> = [];
  // User-initiated channel subscriptions. Mirrored into session entries so a
  // /reload or session resume can rejoin them — the PiMesh instance itself is
  // recreated on every reload and its channelSubs set starts empty.
  const subscribedChannels = new Set<string>();
  const persistChannels = (): void => {
    try {
      pi.appendEntry(MESH_CHANNELS_TYPE, { channels: [...subscribedChannels] });
    } catch {}
  };
  const joinAndPersist = (channelId: string): void => {
    mesh.joinChannel(channelId);
    if (!subscribedChannels.has(channelId)) {
      subscribedChannels.add(channelId);
      persistChannels();
    }
  };
  const leaveAndPersist = (channelId: string): void => {
    mesh.leaveChannel(channelId);
    if (subscribedChannels.has(channelId)) {
      subscribedChannels.delete(channelId);
      persistChannels();
    }
  };
  const activeTellMailbox = new ActiveInboundTellMailbox();
  // Redelivery guard: ack a duplicate so the sender stops retrying, but never
  // render the same delivery twice (see inbound-dedup.ts).
  const surfacedDeliveries = createSurfacedDeliveryGuard({
    // Persisted per durable id: the replay that duplicates mail happens on the
    // restart, which is exactly when an in-memory set would be empty.
    path: () => {
      const durableId = mesh.getIdentity()?.id;
      return durableId ? surfacedDeliveryPath(durableId) : undefined;
    },
  });
  const pendingAsks: Array<{
    requestId: number;
    senderLabel: string;
    fromId: string;
    payloadText: string;
    askId: string;
    askReceiptRequested: MeshAskReceiptWaitForPhase | undefined;
    sentAt: number;
    expiresAt: number;
  }> = [];

  const peekInbox = (): ActiveInboundTellPeek[] => activeTellMailbox.peek();

  // Expose mesh instance for other extensions (e.g. teams) — avoids duplicate connections
  (globalThis as any).__piMesh = mesh;
  // Expose the inbound control-plane registry too (symmetric with the send-side
  // __piMesh above). Extensions register harness ops (e.g. setModel) here; a
  // mesh:control tell is routed to its handler instead of the LLM. See
  // routeControlTell / MeshControlHandler.
  meshControlRegistry();
  // Resolve a raw target to a concrete ROUTE. Durable-id aware: matches on the
  // stable meshId (not just the sidecar clientId) and returns the durable id as
  // the route when the peer has one, so routing survives clientId churn. See
  // route-resolve.ts for the pure, unit-tested resolution logic.
  const resolveTargetSessionId = (rawSessionId: string): string =>
    resolveDurableTarget(mesh.peers(), rawSessionId);


  // /agent <name> <message> — message a mesh peer by name (native mesh command).
  pi.registerCommand("agent", {
    description: "Message a mesh peer by name",
    getArgumentCompletions: (prefix: string): { value: string; label: string }[] | null => {
      const names = mesh
        .peers()
        .map((p) => p.nickname ?? p.name)
        .filter((n): n is string => !!n)
        .filter((n) => n.toLowerCase().startsWith(prefix.toLowerCase()))
        .map((n) => ({ value: n, label: n }));
      return names.length > 0 ? names : null;
    },
    handler: async (args, ctx) => {
      const trimmed = (args ?? "").trim();
      const sp = trimmed.indexOf(" ");
      const name = sp === -1 ? trimmed : trimmed.slice(0, sp).trim();
      const message = sp === -1 ? "" : trimmed.slice(sp + 1).trim();
      if (!name || !message) {
        ctx.ui.notify("Usage: /agent <name> <message>", "error");
        return;
      }
      try {
        const target = resolveTargetSessionId(name);
        mesh.tell(target, message);
        ctx.ui.notify("Told " + name + ": " + message.slice(0, 60), "info");
      } catch (e) {
        ctx.ui.notify("mesh: " + (e instanceof Error ? e.message : String(e)), "error");
      }
    },
  });

  // ── v1c revive-on-send (activator: supervisor-NOTIFIED, v1 = notify) ────────
  const selfLabel = (): string => getPeerLabel(mesh.self());

  // Best-effort nudge to a hibernated session's supervisors that it has pending
  // mail. v1 = NOTIFY ONLY — the supervisor (or a human) revives via the STANDARD
  // path; the durable mailbox is the reliable channel, this is the wake nudge.
  const notifyReviveSupervisors = (
    descriptor: ReviveDescriptor,
    durableId: string,
    deliveryId: string,
    mailboxCount: number,
  ): number => {
    let notified = 0;
    for (const supervisor of descriptor.supervisors ?? []) {
      try {
        const route = resolveTargetSessionId(supervisor); // throws when offline
        mesh.tell(
          route,
          buildReviveNotify({
            durableId,
            nickname: descriptor.nickname,
            deliveryId,
            from: mesh.self().id,
            senderLabel: selfLabel(),
            mailboxCount,
          }),
        );
        notified++;
      } catch {
        // supervisor offline — skip the nudge; the mail persists durably.
      }
    }
    return notified;
  };

  // Deliver a tell to a HIBERNATED durable session's persisted mailbox. Returns
  // null when the target has no revive descriptor (→ dead → 'undeliverable').
  const deliverToDurableMailbox = (
    durableId: string,
    message: unknown,
    payloadText: string,
    receiptMode: MeshTellReceiptWaitForPhase,
  ): { descriptor: ReviveDescriptor; deliveryId: string; mailboxCount: number; notified: number } | null => {
    const descriptor = readDurableDescriptor(durableId);
    if (!descriptor) return null;
    const now = Date.now();
    const deliveryId = createDeliveryId();
    const mailbox = DurableInboundMailbox.forDurableId(durableId);
    const { entry } = mailbox.append(
      {
        deliveryId,
        fromId: mesh.self().id,
        senderLabel: selfLabel(),
        payload: message,
        payloadText,
        ackRequested: receiptMode,
        originalFrom: mesh.self().id,
        sentAt: now,
      },
      now,
    );
    const mailboxCount = mailbox.length;
    const notified = notifyReviveSupervisors(descriptor, durableId, entry.deliveryId, mailboxCount);
    return { descriptor, deliveryId: entry.deliveryId, mailboxCount, notified };
  };

  // Materialise THIS session's canonical revive descriptor (keyed by durable id)
  // from the spawner's partial one. No-op for a session with no partial (a plain
  // human session stays out of the registry → honest 'undeliverable' offline).
  const materialiseOwnDescriptor = (ctx: {
    sessionManager: { getSessionFile?: () => string | undefined; getSessionId?: () => string };
  }): void => {
    const identity = mesh.getIdentity();
    if (!identity) return;
    try {
      materialiseDurableDescriptor({
        durableId: identity.id,
        sessionId: ctx.sessionManager.getSessionId?.(),
        nickname: identity.nickname,
        sessionFile: ctx.sessionManager.getSessionFile?.(),
      });
    } catch {
      // registry write is best-effort — never block a turn on it.
    }
  };

  const flushAmbientChat = () => {
    ambientChatFlushTimer = null;
    if (agentBusy || pendingAmbientChat.length === 0) return;
    const batch = pendingAmbientChat.splice(0, pendingAmbientChat.length);
    const blob = [
      "Ambient mesh chat arrived while you were idle.",
      "This is background context, not necessarily a direct request.",
      "Read it and decide whether to act, reply, or ignore it.",
      "",
      ...batch.map(
        ({ channelId, senderLabel, text, sentAt }, idx) =>
          `${idx + 1}. ${MI.chat} ${MI.sep} #${channelId} ${MI.sep} ${senderLabel}${formatSentSuffix(MI.sep, sentAt)}: ${text}`,
      ),
    ].join("\n");
    pi.sendMessage(
      {
        customType: "mesh-chat-batch",
        content: blob,
        display: false,
      },
      { deliverAs: "followUp", triggerTurn: true },
    );
  };

  const scheduleAmbientChatFlush = () => {
    if (agentBusy || pendingAmbientChat.length === 0) return;
    if (ambientChatFlushTimer) clearTimeout(ambientChatFlushTimer);
    ambientChatFlushTimer = setTimeout(flushAmbientChat, AMBIENT_CHAT_BATCH_MS);
  };

  const flushPendingAsks = () => {
    if (agentBusy || pendingAsks.length === 0) return;
    const { active, expired } = splitExpiredPendingAsks(pendingAsks);
    pendingAsks.length = 0;
    pendingAsks.push(...active);
    if (pendingAsks.length === 0) return;
    const batch = pendingAsks.splice(0, pendingAsks.length);
    const blob = buildPendingAskBatchContent(
      batch.map((ask) => ({
        requestId: ask.requestId,
        senderLabel: ask.senderLabel,
        payloadText: ask.payloadText,
        sentAt: ask.sentAt,
      })),
      MI,
    );
    pi.sendMessage(
      {
        customType: "mesh-inbound-ask-batch",
        content: blob,
        display: true,
        details: {
          count: batch.length,
          asks: batch.map((ask) => ({
            requestId: ask.requestId,
            from: ask.fromId,
            senderLabel: ask.senderLabel,
            askId: ask.askId,
            askReceiptRequested: ask.askReceiptRequested,
          })),
        },
      },
      { deliverAs: "followUp", triggerTurn: true },
    );
    for (const ask of batch) {
      if (ask.askId && ask.askReceiptRequested === "visible" && ask.fromId !== "unknown") {
        mesh.sendTellReceipt(ask.fromId, buildMeshAskReceipt(ask.askId, mesh.self().id, "visible"));
      }
    }
  };

  const flushPendingTells = () => {
    if (agentBusy || activeTellMailbox.length === 0) return;
    const batch = activeTellMailbox.drain();
    const blob = formatPendingTellsBatch(MI, batch);
    pi.sendMessage(
      {
        customType: "mesh-inbound-batch",
        content: blob,
        display: true,
        details: {
          count: batch.length,
          tells: batch.map((t) => ({
            from: t.fromId,
            senderLabel: t.senderLabel,
            topic: t.topic,
            deliveryId: t.deliveryId,
            ackRequested: t.ackRequested,
          })),
        },
      },
      { deliverAs: "followUp", triggerTurn: true },
    );
    // Send 'surfaced' acks for queued tells that requested them — the agent is now seeing them.
    // Enrich with a fresh snapshot (agent is idle at flush time, so receiverBusy: false).
    const flushView = buildReceiverSnapshot();
    for (const t of batch) {
      if (t.deliveryId && t.originalFrom && isSurfacedReceiptRequested(t.ackRequested)) {
        mesh.sendTellReceipt(
          t.originalFrom,
          buildTellReceiptAck(t.deliveryId, mesh.self().id, "surfaced", {
            receiverBusy: false,
            view: flushView,
          }),
        );
      }
    }
  };

  // ── v1c drain-before-live on revive (ADD-2) ────────────────────────────────
  // On revive, DRAIN the durable mailbox into the turn context BEFORE any new
  // live tell surfaces — hibernated mail is older, so it must lead (FIFO across
  // the hibernation seam). One-shot per incarnation; a fresh session drains an
  // empty mailbox (cheap no-op). Clears the revive-drain barrier and flushes any
  // live tells that queued behind it, so the durable batch always lands first.
  const drainDurableMailboxOnRevive = (): void => {
    if (reviveDrained) return;
    const durableId = mesh.getIdentity()?.id;
    if (!durableId) return; // identity not resolved yet — a later call will drain
    reviveDrained = true;
    try {
      const mailbox = DurableInboundMailbox.forDurableId(durableId);
      const { drained, expired } = mailbox.drain();

      // Late 'expired' acks so a sender never believes 'delivered' forever.
      // ackRequested is a MeshTellReceiptWaitForPhase (never "none" — the mailbox
      // is only written for receipt-requesting tells), so a truthy check suffices.
      for (const e of expired) {
        if (e.deliveryId && e.originalFrom && e.ackRequested) {
          mesh.sendTellReceipt(
            e.originalFrom,
            buildTellReceiptAck(e.deliveryId, mesh.self().id, "expired"),
          );
        }
      }

      // A tell surfaced live in a previous incarnation can still be sitting in the
      // mailbox, and the revive drain is where it came back a second time - seen by
      // several agents, not just this one. Same guard as the live path, which is why
      // it has to persist across the restart that triggers the replay.
      const fresh = drained.filter((d) => !(d.deliveryId && surfacedDeliveries.has(d.deliveryId)));
      for (const d of fresh) if (d.deliveryId) surfacedDeliveries.remember(d.deliveryId);

      if (fresh.length > 0) {
        const blob = formatReviveDrainBatch(
          MI,
          fresh.map((d) => ({ senderLabel: d.senderLabel, payloadText: d.payloadText, sentAt: d.sentAt })),
        );
        pi.sendMessage(
          {
            customType: "mesh-revive-drain",
            content: blob,
            display: true,
            details: {
              count: fresh.length,
              tells: drained.map((d) => ({
                from: d.fromId,
                senderLabel: d.senderLabel,
                topic: d.topic,
                deliveryId: d.deliveryId,
                ackRequested: d.ackRequested,
              })),
            },
          },
          { deliverAs: "followUp", triggerTurn: true },
        );
        // 'surfaced' acks — the hibernated mail has now entered the turn context.
        const view = buildReceiverSnapshot();
        for (const d of drained) {
          if (d.deliveryId && d.originalFrom && isSurfacedReceiptRequested(d.ackRequested)) {
            mesh.sendTellReceipt(
              d.originalFrom,
              buildTellReceiptAck(d.deliveryId, mesh.self().id, "surfaced", {
                receiverBusy: false,
                view,
              }),
            );
          }
        }
      }
    } finally {
      // Lift the barrier and surface any live tells that queued during the drain —
      // AFTER the durable batch, preserving FIFO across the seam.
      pendingReviveDrain = false;
      flushPendingTells();
    }
  };

  pi.on("agent_start", () => {
    agentBusy = true;
    if (ambientChatFlushTimer) {
      clearTimeout(ambientChatFlushTimer);
      ambientChatFlushTimer = null;
    }
  });

  pi.on("agent_end", () => {
    agentBusy = false;
    flushPendingAsks();
    flushPendingTells();
    scheduleAmbientChatFlush();
  });

  pi.on("session_start", async (event, ctx) => {
    currentCtx = ctx;
    const sessionId = ctx.sessionManager.getSessionId();
    const reason = (event as { reason?: string }).reason ?? "startup";

    // Load persisted channel subscriptions from the session and rejoin them.
    // Without this, /reload silently drops every channel the user joined.
    const persistedChannels = resolveChannelsFromSession(ctx);
    for (const ch of persistedChannels) {
      subscribedChannels.add(ch);
      mesh.joinChannel(ch);
    }

    // Load persisted broadcast-allowed flag. Default off (see declaration).
    broadcastAllowed = resolveBroadcastAllowedFromSession(ctx);

    if (started) {
      // Already running — handle identity for reload/resume/fork/new transitions
      mesh.updateSessionId(sessionId);
      resolveAndSetIdentity(reason, ctx, mesh, pi);
      // v1c: (re)materialise this session's canonical revive descriptor so a
      // hibernated peer stays reachable at its durable id after reload/resume.
      materialiseOwnDescriptor(ctx);
      // v1c: drain any durable mail that arrived while hibernated BEFORE live
      // tells surface (FIFO across the hibernation seam).
      drainDurableMailboxOnRevive();
      return;
    }
    started = true;

    // Rebirth wake — fire AFTER first session_start so the freshly-rebirthed
    // agent is actively nudged to read its TPV before doing anything else.
    // Gated on reason === "new" so subsequent /reloads of the same rebirthed
    // session don't re-wake (the wake message is already in their history).
    // See rebirth-wake.ts for the orientation contract.
    if (reason === "new") {
      const rebirthMarker = extractRebirthMarker(ctx);
      if (rebirthMarker) {
        pi.sendMessage(
          buildRebirthWakeMessage(rebirthMarker),
          { deliverAs: "followUp", triggerTurn: true },
        );
      }
    }

    // Register sandbox-callable functions for code-mode (ESM import to share module instance)
    try {
      const { registerSandboxFn } = await import("../../shared/src/sandbox-registry");

      // mesh namespace — callable (peers) + tell/view/broadcast/chat/joinChannel/leaveChannel
      const meshPeers = async () => JSON.stringify(mesh.peers());
      (meshPeers as any).inbox = () => peekInbox();
      (meshPeers as any).tell = async (params: {
        sessionId: string;
        message: unknown;
        waitFor?: string;
        timeoutMs?: number;
      }) => {
        const mode = (params.waitFor ?? "delivered") as "none" | MeshTellReceiptWaitForPhase;
        let resolved: string;
        try {
          resolved = resolveTargetSessionId(params.sessionId);
        } catch (e) {
          if (mode === "none") throw e;
          // v1c revive-on-send: no LIVE peer, but if the target is a REVIVABLE
          // durable session the code-mode tell lands in its durable mailbox +
          // notifies supervisors — same honest 'delivered' as the mesh_tell tool.
          const receiptMode = mode === "visible" ? "surfaced" : mode;
          const delivered = deliverToDurableMailbox(
            params.sessionId,
            params.message,
            formatPayloadForDisplay(params.message),
            receiptMode,
          );
          if (delivered) {
            const ack = buildTellReceiptAck(delivered.deliveryId, mesh.self().id, "delivered");
            return JSON.stringify({
              sent: true,
              sessionId: params.sessionId,
              durableMailbox: true,
              supervisorsNotified: delivered.notified,
              ack,
            });
          }
          // Same rule as the mesh_tell tool, which this duplicates: a nickname that
          // matched nothing is genuinely unresolvable, while an explicit address is
          // routable because its topic is deterministic. Both copies must change
          // together - extracting them is owed work, not done here.
          // One shared decision (tell-target.ts). Two copies of this rule cost an
          // evening: an explicit address is routable without a peer-map entry, a
          // nickname that matched nothing is genuinely unresolvable.
          const routeFallback = tellAttempts(params.sessionId, resolveTargetSessionId).find(
            (attempt) => attempt.kind === "route",
          );
          if (routeFallback?.kind === "route") {
            resolved = routeFallback.route;
          } else {
            const deliveryId = createDeliveryId();
            const ack = buildTellReceiptAck(deliveryId, mesh.self().id, "undeliverable");
            return JSON.stringify({ sent: false, sessionId: params.sessionId, ack });
          }
        }
        if (mode === "none") {
          mesh.tell(resolved, params.message);
          return JSON.stringify({ sent: true, sessionId: resolved });
        }
        const receiptMode = mode === "visible" ? "surfaced" : mode;
        const ack = await mesh.tellAndWaitForReceipt(
          resolved,
          params.message,
          receiptMode,
          params.timeoutMs ?? 10_000,
        );
        return JSON.stringify({ sent: true, sessionId: resolved, ack });
      };
      (meshPeers as any).view = async (params: {
        sessionId: string;
        start?: number;
        end?: number;
        timeoutMs?: number;
      }) => {
        const resolved = resolveTargetSessionId(params.sessionId);
        const reply = await mesh.ask(
          resolved,
          { kind: "mesh:view", start: params.start ?? -20, end: params.end ?? 0 },
          params.timeoutMs ?? 10_000,
        );
        return JSON.stringify(reply);
      };
      (meshPeers as any).broadcast = async (params: { topic: string; message: unknown }) => {
        if (!broadcastAllowed) {
          throw new Error(
            "mesh.broadcast is disabled for this session. Broadcasts reach every peer on the mesh and are off by default. " +
              "Ask the hooman to run '/mesh allow-broadcast on' if a broadcast is actually warranted — prefer mesh.tell or mesh.chat.",
          );
        }
        mesh.broadcast(params.topic, params.message);
        return JSON.stringify({ broadcast: true, topic: params.topic });
      };
      (meshPeers as any).chat = async (params: { channelId: string; message: unknown }) => {
        mesh.chat(params.channelId, params.message);
        return JSON.stringify({ sent: true, channelId: params.channelId });
      };
      (meshPeers as any).joinChannel = async (params: { channelId: string }) => {
        joinAndPersist(params.channelId);
        return JSON.stringify({ joined: params.channelId });
      };
      (meshPeers as any).leaveChannel = async (params: { channelId: string }) => {
        leaveAndPersist(params.channelId);
        return JSON.stringify({ left: params.channelId });
      };
      // interrupt: PREEMPT a busy peer's queue. level 'steer' (DEFAULT, safe) lands
      // your message at the peer's next reasoning boundary without killing in-flight
      // work — prefer this. level 'abort' (NUCLEAR) cancels the peer's in-flight
      // tool/build/git/publish and can leave half-done work corrupt — use only when
      // stopping the peer NOW prevents real damage. Returns the enriched receipt
      // (receiverBusy + a snapshot of what the peer was doing). Respects /mesh deafen
      // (a deafened peer drops it; ack reports receiverDeafened).
      (meshPeers as any).interrupt = async (params: {
        sessionId: string;
        message: unknown;
        level?: MeshTellPreemptLevel;
        timeoutMs?: number;
      }) => {
        const resolved = resolveTargetSessionId(params.sessionId);
        const level: MeshTellPreemptLevel = params.level === "abort" ? "abort" : "steer";
        const ack = await mesh.tellAndWaitForReceipt(
          resolved,
          params.message,
          "delivered",
          params.timeoutMs ?? 10_000,
          { preempt: level },
        );
        return JSON.stringify({ sent: true, sessionId: resolved, level, ack });
      };

      // Register namespace + backward-compat aliases
      registerSandboxFn("mesh", meshPeers);
      registerSandboxFn("meshPeers", meshPeers);
      registerSandboxFn("meshTell", (meshPeers as any).tell);
      registerSandboxFn("meshView", (meshPeers as any).view);
      registerSandboxFn("meshBroadcast", (meshPeers as any).broadcast);
      registerSandboxFn("meshChat", (meshPeers as any).chat);
      registerSandboxFn("meshJoinChannel", (meshPeers as any).joinChannel);
      registerSandboxFn("meshLeaveChannel", (meshPeers as any).leaveChannel);
      registerSandboxFn("meshInterrupt", (meshPeers as any).interrupt);

      // rebirth: creates a fresh session with the agent-written TPV handoff.
      // Called from execute_code after the agent writes a TPV into $ vars.
      registerSandboxFn("rebirth", async (params: { tpv: string }) => {
        if (!rebirthStash) {
          throw new Error("rebirth() called without /rebirth — run /rebirth first.");
        }
        const stash = rebirthStash;
        rebirthStash = null; // one-shot

        const tpvText = params.tpv;
        if (!tpvText || typeof tpvText !== "string" || tpvText.trim().length === 0) {
          throw new Error("rebirth() requires a non-empty tpv string — write the TPV first.");
        }

        const result = await stash.ctx.newSession({
          parentSession: stash.sessionFile ?? undefined,
          setup: async (sm) => {
            // Inject the agent-written TPV as a custom_message entry (participates in LLM context)
            sm.appendCustomMessageEntry("rebirth-handoff", tpvText, false, {
              parentSessionId: stash.sessionId,
              parentSessionName: stash.sessionName,
              transferedAt: new Date().toISOString(),
            });

            // Rebirth marker so session_start knows to reuse identity
            sm.appendCustomEntry(MESH_REBIRTH_TYPE, {
              fromSession: stash.sessionId,
              transferedAt: new Date().toISOString(),
            });

            // Transfer mesh identity
            sm.appendCustomEntry(MESH_IDENTITY_TYPE, stash.identity);

            // Transfer channel subscriptions
            if (stash.channels.length > 0) {
              sm.appendCustomEntry(MESH_CHANNELS_TYPE, { channels: stash.channels });
            }

            // Transfer broadcast setting
            if (stash.broadcastAllowed) {
              sm.appendCustomEntry(MESH_BROADCAST_ALLOWED_TYPE, { allowed: true });
            }
          },
        });

        return JSON.stringify({ ok: !result.cancelled, cancelled: result.cancelled });
      });
    } catch (err) {
      console.warn("[pi-mesh] Failed to register sandbox functions:", err);
    }

    try {
      const name = pi.getSessionName?.() ?? undefined;
      // Sidecar (re)spawn re-reads ~/.pi/mesh-config.json itself (kal-0suu3dur);
      // loading it here would be dead weight, and an unguarded throw would
      // wedge mesh startup on a malformed file.
      mesh.start(binPath, sessionId, ctx.cwd, undefined, name);

      // Resolve identity once sidecar is ready (tentatively — peer list may be empty)
      mesh.on("ready", () => {
        resolveAndSetIdentity(reason, ctx, mesh, pi);
        // v1c: materialise the canonical revive descriptor now the durable id is
        // known — the activator reads it to route revive-on-send by durable id.
        materialiseOwnDescriptor(ctx);
        // v1c: durable id is known → drain hibernated mail before live tells.
        drainDurableMailboxOnRevive();
      });

      // v1a identity-pin: resume/revive REUSE the durable session's mesh id, so a
      // lingering same-id predecessor is no longer treated as a fork — the old
      // peer-join double-resume re-mint (identity churn) is removed. Genuine
      // concurrent single-activation is the v1c activation-lease's responsibility.

      // Persist identity updates on nickname conflicts
      mesh.onNicknameConflict((updatedIdentity) => {
        try {
          pi.appendEntry("mesh_identity", updatedIdentity);
        } catch (e) {
          console.warn("[pi-mesh] Failed to persist identity update after conflict:", e);
        }
      });

      // Wire inbound tells into the conversation.
      // Busy → queue and flush on agent_end so the agent actually wakes up to see it.
      // Idle → deliver immediately.
      mesh.on("message", (inbound) => {
        const { message: msg, deliveryId, ackRequested, preempt, originalFrom } = inbound;
        // Already surfaced: this is a redelivery (sender retry or mailbox replay).
        // Ack it so the retry stops, render nothing - the human saw it once.
        if (deliveryId && surfacedDeliveries.has(deliveryId)) {
          if (originalFrom && ackRequested) {
            mesh.sendTellReceipt(originalFrom, buildTellReceiptAck(deliveryId, mesh.self().id, "delivered"));
          }
          return;
        }
        if (deliveryId) surfacedDeliveries.remember(deliveryId);
        if (isTeamsLifecyclePayload(msg.payload)) return;
        // Control-plane: a mesh:control tell is a harness command (setModel, …),
        // not conversation. Route it to its handler and never surface to the LLM.
        // We pass the sender's DURABLE mesh id (resolved from the ephemeral
        // clientId via peers) so the handler can authorize by durable identity.
        // Ack 'delivered' when requested so the sender knows it was accepted.
        const controlFrom = mesh.peers().find((p) => p.id === msg.from)?.meshId ?? msg.from;
        if (routeControlTell(msg.payload, controlFrom)) {
          if (deliveryId && originalFrom && ackRequested) {
            mesh.sendTellReceipt(
              originalFrom,
              buildTellReceiptAck(deliveryId, mesh.self().id, "delivered", {
                receiverBusy: agentBusy,
              }),
            );
          }
          return;
        }
        const senderPeer = mesh.peers().find((p) => p.id === msg.from);
        const senderLabel = senderPeer
          ? getPeerLabel(senderPeer)
          : (msg.from?.slice(0, 8) ?? "unknown");
        const payloadText = formatPayloadForDisplay(msg.payload);

        // Snapshot of what THIS session is doing right now, captured BEFORE we
        // act — the "before" window the sender uses to decide. Only built when an
        // ack will actually be sent (waitFor:'none' opts out), so no-ack tells pay
        // nothing. O(window) via parentId walk (see buildReceiverSnapshot).
        const willAck = !!(deliveryId && originalFrom && ackRequested);
        // Only build the snapshot when an ack will be sent AND the receiver is not
        // deafened — a heads-down peer drops the message and must NOT leak its
        // recent activity back to the sender. O(window) via parentId walk.
        const snapshot = willAck && !deafened ? buildReceiverSnapshot() : undefined;
        const receiverBusy = agentBusy;
        const basePlan = planInboundTell({ deafened, preempt, agentBusy, ackRequested });
        // v1c revive-drain barrier (ADD-2): while the durable mailbox is draining
        // on revive, hold a live idle 'surface' tell in the active mailbox so the
        // older hibernated mail leads. Deafen + preempt (steer/abort) still take
        // effect — only a normal idle surface is deferred, then flushed right after
        // the durable batch (see drainDurableMailboxOnRevive).
        const plan =
          pendingReviveDrain && basePlan.action === "surface"
            ? { action: "queue" as const, ackPhase: "delivered" as const, ackDeafened: false, abortFirst: false }
            : basePlan;

        // Enriched receipt — only sent when the sender requested one
        // (waitFor:'none' opted out, so there is no channel to enrich).
        const sendAck = (aborted?: boolean) => {
          if (deliveryId && originalFrom && ackRequested) {
            mesh.sendTellReceipt(
              originalFrom,
              buildTellReceiptAck(deliveryId, mesh.self().id, plan.ackPhase, {
                receiverBusy,
                view: snapshot,
                ...(plan.ackDeafened ? { receiverDeafened: true } : {}),
                ...(aborted !== undefined ? { aborted } : {}),
              }),
            );
          }
        };

        if (plan.action === "drop-deafened") {
          sendAck();
          return;
        }

        if (plan.action === "queue") {
          activeTellMailbox.enqueue({
            senderLabel,
            fromId: msg.from ?? "unknown",
            topic: msg.topic,
            payload: msg.payload,
            payloadText,
            deliveryId,
            originalFrom,
            ackRequested,
            sentAt: msg.timestamp,
          });
          // We have the message — ack 'delivered' now. 'surfaced' ack fires only on flush.
          sendAck();
          return;
        }

        // preempt-abort | preempt-steer | surface → deliver now.
        // NUCLEAR abort: only actually cancels when there is in-flight work
        // (plan.abortFirst, gated on agentBusy) AND a live session context. When
        // it cannot (idle peer, or ctx null mid-reload) it is a NO-OP — the ack's
        // aborted flag reports which happened so the sender never assumes a
        // cancellation that did not occur.
        let aborted: boolean | undefined;
        if (plan.action === "preempt-abort") {
          aborted = plan.abortFirst && !!currentCtx;
          if (aborted) currentCtx?.abort();
        }
        // Append a bottom signature so an agent who only reads the END of the
        // message still sees the real mesh sender (see default-prompt identity
        // block + inbound-format.ts).
        const content = formatInboundTellContent(MI, senderLabel, payloadText, msg.timestamp);
        const details = {
          from: msg.from,
          senderLabel,
          topic: msg.topic,
          deliveryId,
          ackRequested,
          ...(preempt ? { preempt } : {}),
          ...(aborted !== undefined ? { aborted } : {}),
        };
        const deliveryOptions =
          plan.deliverAs !== undefined
            ? { deliverAs: plan.deliverAs, triggerTurn: plan.triggerTurn }
            : {};
        pi.sendMessage(
          { customType: "mesh-inbound", content, display: true, details },
          deliveryOptions,
        );
        sendAck(aborted);
      });

      // Wire inbound channel messages — ambient context, visible immediately.
      // If the session is idle, batch them and wake the agent once with a hidden blob.
      mesh.on<ChannelMessage>("channel", (msg) => {
        if (mesh.isSelf(msg.from)) return; // don't echo own messages (checks both routing + stable identity)
        if (isTeamsLifecyclePayload(msg.payload)) return; // teams lifecycle events rendered by teams extension
        if (deafened) return; // /mesh deafen — drop channel chatter silently

        const senderPeer = mesh.peers().find((p) => p.id === msg.from || p.sessionId === msg.from);
        const senderLabel = senderPeer
          ? getPeerLabel(senderPeer)
          : (msg.from?.slice(0, 8) ?? "unknown");
        const text = formatPayloadForDisplay(msg.payload);
        pi.sendMessage({
          customType: "mesh-chat",
          content: formatInboundChatContent(MI, msg.channel, senderLabel, text, msg.timestamp),
          display: true,
        });
        pendingAmbientChat.push({ channelId: msg.channel, senderLabel, text, sentAt: msg.timestamp });
        scheduleAmbientChatFlush();
      });

      // Wire inbound asks — agent sees the question and can reply
      mesh.on<RequestEvent>("request", (req) => {
        if (isMeshViewRequest(req.payload)) {
          if (!currentCtx) {
            mesh.tell(req.from.id, {
              askId: req.askId,
              error: "mesh_view unavailable: session context missing",
            });
            return;
          }
          const entries = projectMeaningfulSessionEntries(currentCtx.sessionManager.getBranch());
          // Cap the wire entries[] so a single fat entry can't flood the asker's
          // context (per-entry bound; text is additionally total-capped by
          // formatSessionViewEntries). See pe-zw1n8x78.
          const windowed = capSessionViewEntries(
            sliceSessionViewEntries(entries, req.payload.start ?? -20, req.payload.end ?? 0),
          );
          mesh.tell(req.from.id, {
            askId: req.askId,
            sessionId: currentCtx.sessionManager.getSessionId(),
            start: req.payload.start ?? -20,
            end: req.payload.end ?? 0,
            total: entries.length,
            entries: windowed,
            text: formatSessionViewEntries(windowed),
          });
          return;
        }

        const reqId = req.requestId;
        const senderLabel = req.from.id !== "unknown" ? getPeerLabel(req.from) : "unknown";
        const payloadText = extractPayloadText(req.payload);

        if (agentBusy) {
          pendingAsks.push({
            requestId: reqId,
            senderLabel,
            fromId: req.from.id,
            payloadText,
            askId: req.askId,
            askReceiptRequested: req.askReceiptRequested,
            sentAt: req.timestamp,
            expiresAt: Date.now() + Math.max(35_000, (req.timeoutMs ?? 30_000) + 5_000),
          });
          if (req.from.id !== "unknown") {
            mesh.sendTellReceipt(
              req.from.id,
              buildMeshAskReceipt(req.askId, mesh.self().id, "busy"),
            );
          }
          return;
        }

        const requestVisible = req.askReceiptRequested === "visible";
        // Reached only when idle (the busy path returned above). A 'visible' waiter
        // gets pi's default surface; otherwise wake a turn so the ask is read.
        const deliveryOptions: { deliverAs?: "followUp"; triggerTurn?: boolean } = requestVisible
          ? {}
          : { deliverAs: "followUp", triggerTurn: true };
        const replyHint =
          req.from.id !== "unknown"
            ? `Reply with: mesh_tell("${req.from.id}", { askId: "${req.askId}", response: "your reply" })`
            : "Reply with: mesh_tell";
        pi.sendMessage(
          {
            customType: "mesh-inbound-ask",
            content: formatInboundAskContent(MI, senderLabel, payloadText, replyHint, req.timestamp),
            display: true,
          },
          deliveryOptions,
        );
        if (requestVisible && req.from.id !== "unknown") {
          mesh.sendTellReceipt(
            req.from.id,
            buildMeshAskReceipt(req.askId, mesh.self().id, "visible"),
          );
        }
      });
    } catch (e) {
      console.warn(`[pi-mesh] Failed to start: ${e}`);
    }
  });

  pi.on("session_shutdown", async () => {
    currentCtx = null;
    if (ambientChatFlushTimer) {
      clearTimeout(ambientChatFlushTimer);
      ambientChatFlushTimer = null;
    }
    pendingAmbientChat.length = 0;
    activeTellMailbox.clear();
    pendingAsks.length = 0;
    if (!started) return;
    try {
      mesh.stop();
    } catch {}
  });

  // ── MCP Tools ─────────────────────────────────────────────────────────────

  // Discriminated tool-result details — one variant per outcome, so the agent
  // (and any consumer) reads an unambiguous state instead of an optional bag of
  // half-undefined fields. (ts-review: make wrong states impossible.)
  type MeshTellDetails =
    | { status: "error"; sessionId: string; resolvedSessionId?: string; error: string }
    | { status: "sent"; sessionId: string; resolvedSessionId: string; deliveryId: string; waitFor: "none" }
    | { status: "acked"; sessionId: string; resolvedSessionId: string; waitFor: string; ack: MeshTellAckEnvelope };
  type MeshInterruptDetails =
    | { status: "error"; sessionId: string; resolvedSessionId?: string; error: string }
    | { status: "sent"; sessionId: string; resolvedSessionId: string; level: MeshTellPreemptLevel; ack: MeshTellAckEnvelope };
  type MeshViewDetails =
    | { status: "error"; sessionId: string; resolvedSessionId?: string; error: string }
    | { status: "ok"; sessionId: string; resolvedSessionId: string; reply: Record<string, unknown> };
  type MeshInboxDetails = { status: "ok"; count: number; tells: ActiveInboundTellPeek[] };

  pi.registerTool<TSchema, MeshTellDetails>({
    name: "mesh_tell",
    label: "Mesh Tell",
    description:
      "Send a direct message to another pi session. By default waits for a target-session delivery receipt so direct tells are diagnosable instead of silently vanishing. The receipt is ENRICHED: it reports whether the peer was busy/idle/deafened and includes a snapshot of what the peer was doing when your message landed — so you can decide whether to wait, follow up, or preempt with mesh_interrupt. A busy peer surfaces your message only at the end of its current turn; use mesh_interrupt to jump that queue.",
    parameters: Type.Object({
      sessionId: Type.String({
        description:
          "Peer ID, short ID prefix, or full name (case-insensitive). e.g. 'Galileo Accretion Rubin' or '7e9bb362'",
      }),
      message: Type.Unknown({
        description:
          "Plain text preferred. For structured messages use {subject: '...', body: '...'} fields for readable rendering. When the Hooman Telegram bridge is available, use its configured durable Hooman ID from the mesh-telegram-bridge skill as sessionId and {image: '/absolute/bridge-visible/render.png', text: 'Here it is.'} to send a photo; file/attachment/path are aliases. text is an ordinary Telegram message sent before the attachment, not its media caption. The path must be a completed local file visible to the bridge, not a URL, blob, base64 payload, or remote-worker-private path. One attachment per tell. The Mesh receipt confirms bridge receipt only, not Telegram upload or Hooman visibility.",
      }),
      waitFor: Type.Optional(
        Type.String({
          description:
            "Receipt to wait for: 'none', 'delivered', 'surfaced' (or legacy alias 'visible'), 'refused', or 'undeliverable'. Default: 'delivered'",
        }),
      ),
      timeoutMs: Type.Optional(
        Type.Number({
          description: "Timeout in ms when waiting for receipt (default: 10000)",
          minimum: 100,
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { sessionId, message, waitFor, timeoutMs } = params as {
        sessionId: string;
        message: unknown;
        waitFor?: "none" | MeshTellReceiptWaitForPhase;
        timeoutMs?: number;
      };
      const receiptMode = waitFor === "visible" ? "surfaced" : (waitFor ?? "delivered");
      const rendered = formatPayloadForDisplay(message);
      let resolved: string;
      try {
        resolved = resolveTargetSessionId(sessionId);
      } catch (e) {
        if (receiptMode !== "none") {
          // v1c revive-on-send: no LIVE peer, but if the target is a REVIVABLE
          // durable session (a persisted descriptor exists) the tell lands in its
          // durable mailbox + notifies its supervisors — an HONEST 'delivered'
          // (it reached the durable mailbox), never a false-negative drop.
          const delivered = deliverToDurableMailbox(sessionId, message, rendered, receiptMode);
          if (delivered) {
            const ack = buildTellReceiptAck(delivered.deliveryId, mesh.self().id, "delivered");
            const label = delivered.descriptor.nickname ?? sessionId.slice(0, 8);
            const supervisorNote =
              delivered.notified > 0
                ? `${delivered.notified} supervisor${delivered.notified === 1 ? "" : "s"} notified to revive`
                : "no live supervisor to notify — mail waits for the next revive";
            const text = `${MI.tell} ${MI.sep} ${label} (delivered → durable mailbox; peer hibernated, ${supervisorNote})\n${rendered}`;
            return {
              content: [{ type: "text", text }],
              details: { status: "acked", sessionId, resolvedSessionId: sessionId, waitFor: receiptMode, ack } satisfies MeshTellDetails,
            };
          }
          // No live peer AND no revive descriptor. A NICKNAME that matched nothing
          // is genuinely unresolvable. An explicit address is not: the topic is
          // deterministic, so publish and let the receipt decide - declaring a
          // reachable peer undeliverable is how the bridge became unreachable.
          // One shared decision (tell-target.ts). Two copies of this rule cost an
          // evening: an explicit address is routable without a peer-map entry, a
          // nickname that matched nothing is genuinely unresolvable.
          const routeFallback = tellAttempts(sessionId, resolveTargetSessionId).find(
            (attempt) => attempt.kind === "route",
          );
          if (routeFallback?.kind === "route") {
            resolved = routeFallback.route;
          } else {
            const deliveryId = createDeliveryId();
            const ack = buildTellReceiptAck(deliveryId, mesh.self().id, "undeliverable");
            const text = `${MI.tell} ${MI.sep} ${sessionId} (undeliverable)\n${rendered}\n\nNo live peer matched '${sessionId}' and no revivable durable session is registered for it.`;
            return {
              content: [{ type: "text", text }],
              details: { status: "acked", sessionId, resolvedSessionId: sessionId, waitFor: receiptMode, ack } satisfies MeshTellDetails,
            };
          }
        }
        return {
          content: [{ type: "text", text: `Error: ${e}` }],
          details: { status: "error", sessionId, error: String(e) } satisfies MeshTellDetails,
          isError: true,
        };
      }

      const peerLabel = (() => {
        const peer = mesh.peers().find((p) => p.id === resolved || p.meshId === resolved);
        return peer ? getPeerLabel(peer) : resolved.slice(0, 8);
      })();
      if (receiptMode === "none") {
        const { deliveryId } = mesh.tell(resolved, message);
        return {
          content: [{ type: "text", text: `${MI.tell} ${MI.sep} ${peerLabel}\n${rendered}` }],
          details: { status: "sent", sessionId, resolvedSessionId: resolved, deliveryId, waitFor: "none" } satisfies MeshTellDetails,
        };
      }

      try {
        const ack = await mesh.tellAndWaitForReceipt(
          resolved,
          message,
          receiptMode,
          timeoutMs ?? 10_000,
        );
        const receiptText = formatTellAckReceipt(ack);
        const text =
          `${MI.tell} ${MI.sep} ${peerLabel} (${ack.phase})\n${rendered}` +
          (receiptText ? `\n\n${receiptText}` : "");
        return {
          content: [{ type: "text", text }],
          details: { status: "acked", sessionId, resolvedSessionId: resolved, waitFor: receiptMode, ack } satisfies MeshTellDetails,
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${e}` }],
          details: { status: "error", sessionId, resolvedSessionId: resolved, error: String(e) } satisfies MeshTellDetails,
          isError: true,
        };
      }
    },
  });

  pi.registerTool<TSchema, MeshInboxDetails>({
    name: "mesh_inbox",
    label: "Mesh Inbox",
    description:
      "Peek pending inbound direct mesh tells queued for this live session. Non-destructive: does not consume and never emits a surfaced receipt; queued tells still flush at agent_end.",
    parameters: Type.Object({}),
    async execute() {
      const tells = peekInbox();
      const text = tells.length === 0
        ? "mesh inbox empty"
        : tells
            .map((t, idx) => {
              const sent = t.sentAt === undefined ? "" : ` · sent ${new Date(t.sentAt).toISOString()}`;
              return `${idx + 1}. ${t.senderLabel}${sent}: ${t.preview}`;
            })
            .join("\n");
      return {
        content: [{ type: "text", text }],
        details: { status: "ok", count: tells.length, tells } satisfies MeshInboxDetails,
      };
    },
  });

  pi.registerTool<TSchema, MeshInterruptDetails>({
    name: "mesh_interrupt",
    label: "Mesh Interrupt",
    description:
      "PREEMPT a busy peer's queue. A normal mesh_tell to a busy peer only surfaces at the end of its current turn — mesh_interrupt jumps that queue. " +
      "level='steer' (DEFAULT, SAFE): your message lands at the peer's next reasoning boundary (after its current tool finishes), WITHOUT killing in-flight work. Prefer this for 'wait, not this' corrections. " +
      "level='abort' (NUCLEAR): cancels the peer's in-flight tool/build/git/publish via the agent abort signal — a half-done operation can be left corrupt. Use abort ONLY when stopping the peer right now prevents real damage. " +
      "Respects /mesh deafen (a deafened peer drops it; the receipt reports receiverDeafened). Returns the same enriched receipt as mesh_tell (peer busy-state + a snapshot of what it was doing).",
    parameters: Type.Object({
      sessionId: Type.String({
        description:
          "Peer ID, short ID prefix, or full name (case-insensitive). e.g. 'Galileo Accretion Rubin' or '7e9bb362'",
      }),
      message: Type.Unknown({
        description:
          "Plain text preferred. For structured messages use {subject: '...', body: '...'} fields for readable rendering.",
      }),
      level: Type.Optional(
        Type.String({
          description:
            "Preempt level: 'steer' (default, safe — lands at next reasoning boundary) or 'abort' (NUCLEAR — cancels in-flight work). Prefer 'steer'.",
        }),
      ),
      timeoutMs: Type.Optional(
        Type.Number({
          description: "Timeout in ms when waiting for receipt (default: 10000)",
          minimum: 100,
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { sessionId, message, level, timeoutMs } = params as {
        sessionId: string;
        message: unknown;
        level?: "steer" | "abort";
        timeoutMs?: number;
      };
      let resolved: string;
      try {
        resolved = resolveTargetSessionId(sessionId);
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${e}` }],
          details: { status: "error", sessionId, error: String(e) } satisfies MeshInterruptDetails,
          isError: true,
        };
      }

      const preemptLevel: MeshTellPreemptLevel = level === "abort" ? "abort" : "steer";
      const rendered = formatPayloadForDisplay(message);
      const peerLabel = (() => {
        const peer = mesh.peers().find((p) => p.id === resolved);
        return peer ? getPeerLabel(peer) : resolved.slice(0, 8);
      })();
      try {
        const ack = await mesh.tellAndWaitForReceipt(
          resolved,
          message,
          "delivered",
          timeoutMs ?? 10_000,
          { preempt: preemptLevel },
        );
        const receiptText = formatTellAckReceipt(ack);
        const banner = preemptLevel === "abort" ? "🛑 INTERRUPT (abort)" : "⚠️ INTERRUPT (steer)";
        const text =
          `${MI.tell} ${MI.sep} ${peerLabel} ${banner}\n${rendered}` +
          (receiptText ? `\n\n${receiptText}` : "");
        return {
          content: [{ type: "text", text }],
          details: { status: "sent", sessionId, resolvedSessionId: resolved, level: preemptLevel, ack } satisfies MeshInterruptDetails,
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${e}` }],
          details: { status: "error", sessionId, resolvedSessionId: resolved, error: String(e) } satisfies MeshInterruptDetails,
          isError: true,
        };
      }
    },
  });

  pi.registerTool<TSchema, MeshViewDetails>({
    name: "mesh_view",
    label: "Mesh View",
    description:
      "Read recent meaningful entries from another live pi session. Offsets are relative to the end by default: 0 is newest, -1 is one before that.",
    parameters: Type.Object({
      sessionId: Type.String({
        description:
          "Peer ID, short ID prefix, or full name (case-insensitive). e.g. 'Galileo Accretion Rubin' or '7e9bb362'",
      }),
      start: Type.Optional(Type.Number({ description: "Window start offset. Defaults to -20." })),
      end: Type.Optional(
        Type.Number({ description: "Window end offset. Defaults to 0 (newest entry)." }),
      ),
      timeoutMs: Type.Optional(
        Type.Number({ description: "Timeout in ms (default: 10000)", minimum: 100 }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { sessionId, start, end, timeoutMs } = params as {
        sessionId: string;
        start?: number;
        end?: number;
        timeoutMs?: number;
      };
      let resolved: string;
      try {
        resolved = resolveTargetSessionId(sessionId);
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${e}` }],
          details: { status: "error", sessionId, error: String(e) } satisfies MeshViewDetails,
          isError: true,
        };
      }

      try {
        const reply = (await mesh.ask(
          resolved,
          { kind: "mesh:view", start, end },
          timeoutMs ?? 10_000,
        )) as Record<string, unknown>;
        if (reply?.error) throw new Error(String(reply.error));
        const replyText =
          typeof reply?.text === "string" ? reply.text : formatPayloadForDisplay(reply);
        return {
          content: [{ type: "text", text: replyText }],
          details: { status: "ok", sessionId, resolvedSessionId: resolved, reply } satisfies MeshViewDetails,
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${e}` }],
          details: { status: "error", sessionId, resolvedSessionId: resolved, error: String(e) } satisfies MeshViewDetails,
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "mesh_broadcast",
    label: "Mesh Broadcast",
    description: "Broadcast a message to all peers on a topic.",
    parameters: Type.Object({
      topic: Type.String({ description: "Broadcast topic (e.g. 'status', 'shutdown')" }),
      message: Type.Unknown({
        description:
          "Plain text preferred. For structured messages use {subject: '...', body: '...'} fields for readable rendering.",
      }),
    }),
    async execute(_toolCallId, params) {
      const { topic, message } = params as { topic: string; message: unknown };
      if (!broadcastAllowed) {
        const text =
          "mesh_broadcast is disabled for this session. Broadcasts reach every peer on the mesh and " +
          "are off by default. Ask the hooman to run '/mesh allow-broadcast on' if a broadcast is " +
          "actually warranted — otherwise prefer mesh_tell or mesh_chat.";
        return {
          content: [{ type: "text", text }],
          details: { topic, sent: false, reason: "broadcast_disabled" },
          isError: true,
        };
      }
      mesh.broadcast(topic, message);
      return {
        content: [
          {
            type: "text",
            text: `${MI.broadcast} ${MI.sep} ${topic}\n${formatPayloadForDisplay(message)}`,
          },
        ],
        details: { topic, sent: true, reason: undefined as string | undefined },
      };
    },
  });

  pi.registerTool({
    name: "mesh_peers",
    label: "Mesh Peers",
    description: "List all pi sessions currently visible on the mesh network, including zmx coordinates when announced.",
    parameters: Type.Object({}),
    async execute() {
      const me = mesh.self();
      const peerList = mesh.peers();
      const fmtPeer = (p: PeerInfo, tag?: string) => {
        const label = getPeerLabel(p);
        const short = p.id.slice(0, 8);
        const extra = getPeerExtraParts(p).join(" · ");
        const seen = new Date(p.lastSeen).toLocaleTimeString();
        const parts = [`${label} (${short})${tag ? ` ${tag}` : ""}`];
        if (extra) parts.push(extra);
        parts.push(seen);
        return parts.join("  ");
      };
      const lines = [fmtPeer(me, "← you"), ...peerList.map((p) => fmtPeer(p))];
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { self: me, peers: peerList },
      };
    },
  });

  pi.registerTool({
    name: "mesh_join_channel",
    label: "Mesh Join Channel",
    description:
      "Join a named mesh channel. Inbound messages appear in context without triggering a turn.",
    parameters: Type.Object({
      channelId: Type.String({
        description: "Channel ID to join (e.g. 'teams-abc123', 'project-collab')",
      }),
    }),
    async execute(_toolCallId, params) {
      const { channelId } = params as { channelId: string };
      joinAndPersist(channelId);
      return {
        content: [{ type: "text", text: `Joined channel #${channelId}` }],
        details: { channelId },
      };
    },
  });

  pi.registerTool({
    name: "mesh_leave_channel",
    label: "Mesh Leave Channel",
    description: "Leave a mesh channel. No longer receive messages from it.",
    parameters: Type.Object({
      channelId: Type.String({ description: "Channel ID to leave" }),
    }),
    async execute(_toolCallId, params) {
      const { channelId } = params as { channelId: string };
      leaveAndPersist(channelId);
      return {
        content: [{ type: "text", text: `Left channel #${channelId}` }],
        details: { channelId },
      };
    },
  });

  pi.registerTool({
    name: "mesh_chat",
    label: "Mesh Chat",
    description:
      "Post a message to a mesh channel. Receivers see it immediately. Busy sessions do not get interrupted; idle sessions batch ambient chat and wake once with a single blob. Use mesh_tell for direct urgent messages.",
    parameters: Type.Object({
      channelId: Type.String({ description: "Channel ID to post to" }),
      message: Type.Unknown({
        description:
          "Plain text preferred. For structured messages use {subject: '...', body: '...'} — these render as a bold headline + body. Raw JSON objects without a body/text field render as a code block.",
      }),
    }),
    async execute(_toolCallId, params) {
      const { channelId, message } = params as { channelId: string; message: unknown };
      mesh.chat(channelId, message);
      const rendered = formatPayloadForDisplay(message);
      return {
        content: [{ type: "text", text: `${MI.chat} ${MI.sep} #${channelId}\n${rendered}` }],
        details: { channelId, sent: true },
      };
    },
  });

  // ── Register sandbox-callable functions for code-mode ──────────────
  // Done in session_start (async context) to use dynamic ESM import
  // and capture live mesh/socket state. See session_start handler.

  pi.registerMessageRenderer("mesh-list", (msg, options, theme) =>
    renderToolResult(msg, options.expanded, theme),
  );

  // ── /mesh command ─────────────────────────────────────────────────────────

  pi.registerCommand("mesh", {
    description:
      "Mesh. Usage: /mesh [list] | /mesh tell <peer> <msg> [--visible|--no-wait] | /mesh view <peer> [start] [end] | /mesh join <channel> | /mesh leave <channel> | /mesh chat <channel> <msg> | /mesh mute [on|off] | /mesh deafen [on|off] | /mesh allow-broadcast [on|off] | /mesh status",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const sub = parts[0] ?? "list";
      const parseToggle = (current: boolean, arg: string | undefined): boolean => {
        if (!arg) return !current;
        const v = arg.toLowerCase();
        if (v === "on" || v === "true" || v === "1" || v === "yes") return true;
        if (v === "off" || v === "false" || v === "0" || v === "no") return false;
        return !current;
      };
      if (sub === "mute") {
        muted = parseToggle(muted, parts[1]);
        ctx.ui.notify(`mesh mute: ${muted ? "ON (outbound blocked)" : "off"}`, "info");
        return;
      } else if (sub === "deafen" || sub === "deafened") {
        deafened = parseToggle(deafened, parts[1]);
        ctx.ui.notify(
          `mesh deafen: ${deafened ? "ON (inbound chat/tells silenced)" : "off"}`,
          "info",
        );
        return;
      } else if (sub === "allow-broadcast" || sub === "allow_broadcast" || sub === "broadcast") {
        broadcastAllowed = parseToggle(broadcastAllowed, parts[1]);
        persistBroadcastAllowed();
        ctx.ui.notify(
          `mesh broadcast: ${broadcastAllowed ? "ALLOWED (agent may publish to all peers)" : "blocked (default — agent cannot broadcast)"}`,
          broadcastAllowed ? "warning" : "info",
        );
        return;
      } else if (sub === "status") {
        ctx.ui.notify(
          `mute=${muted ? "ON" : "off"} | deafen=${deafened ? "ON" : "off"} | broadcast=${broadcastAllowed ? "ALLOWED" : "blocked"}`,
          "info",
        );
        return;
      } else if (sub === "join") {
        const channelId = parts[1];
        if (!channelId) {
          ctx.ui.notify("Usage: /mesh join <channel>", "warning");
          return;
        }
        joinAndPersist(channelId);
        ctx.ui.notify(`Joined #${channelId}`, "info");
      } else if (sub === "leave") {
        const channelId = parts[1];
        if (!channelId) {
          ctx.ui.notify("Usage: /mesh leave <channel>", "warning");
          return;
        }
        leaveAndPersist(channelId);
        ctx.ui.notify(`Left #${channelId}`, "info");
      } else if (sub === "chat") {
        const channelId = parts[1];
        const message = parts.slice(2).join(" ");
        if (!channelId || !message) {
          ctx.ui.notify("Usage: /mesh chat <channel> <message>", "warning");
          return;
        }
        if (muted) {
          ctx.ui.notify("mesh is muted — /mesh mute off to send", "warning");
          return;
        }
        mesh.chat(channelId, message);
        const rendered = formatPayloadForDisplay(message);
        ctx.ui.notify(`${MI.chat} ${MI.sep} #${channelId}\n${rendered}`, "info");
      } else if (
        sub === "list" ||
        sub === "peers" ||
        sub === "" ||
        sub === "me" ||
        sub === "status"
      ) {
        const me = mesh.self();
        const peerList = mesh.peers();
        const formatPeer = (p: PeerInfo, tag?: string) => {
          const label = getPeerLabel(p);
          const short = p.id.slice(0, 8);
          const lines = [`${label}  (${short})${tag ? `  ${tag}` : ""}`];
          if (!p.nickname && p.name) lines.push(`  title: ${p.name}`);
          if (p.hostname) lines.push(`  hostname: ${p.hostname}`);
          if (p.cwd) lines.push(`  cwd: ${p.cwd}`);
          if (p.zmxSession?.trim()) lines.push(`  zmx: ${p.zmxSession.trim()}`);
          lines.push(`  lastSeen: ${new Date(p.lastSeen).toLocaleTimeString()}`);
          return lines.join("\n");
        };
        const output = [formatPeer(me, "← you"), ...peerList.map((p) => formatPeer(p))];
        ctx.ui.notify(output.join("\n\n"), "info");
      } else if (sub === "tell") {
        const targetId = parts[1];
        const tellFlags = new Set<"--visible" | "--no-wait">(
          parts.filter(
            (part): part is "--visible" | "--no-wait" =>
              part === "--visible" || part === "--no-wait",
          ),
        );
        const message = parts
          .slice(2)
          .filter((part) => !tellFlags.has(part as "--visible" | "--no-wait"))
          .join(" ");
        if (!targetId || !message) {
          ctx.ui.notify("Usage: /mesh tell <sessionId> <message>", "warning");
          return;
        }
        if (muted) {
          ctx.ui.notify("mesh is muted — /mesh mute off to send", "warning");
          return;
        }
        let resolved: string;
        try {
          resolved = resolveTargetSessionId(targetId);
        } catch (e) {
          ctx.ui.notify(`Error: ${e}`, "warning");
          return;
        }
        const tellPeer = mesh.peers().find((p) => p.id === resolved);
        const tellLabel = tellPeer ? getPeerLabel(tellPeer) : resolved.slice(0, 8);
        try {
          if (tellFlags.has("--no-wait")) {
            const { deliveryId } = mesh.tell(resolved, message);
            ctx.ui.notify(`${MI.tell} ${MI.sep} ${tellLabel}\n${message}`, "info");
          } else {
            const phase: MeshTellReceiptPhase = tellFlags.has("--visible")
              ? "surfaced"
              : "delivered";
            await mesh.tellAndWaitForReceipt(resolved, message, phase, 10_000);
            ctx.ui.notify(`${MI.tell} ${MI.sep} ${tellLabel} (${phase})\n${message}`, "info");
          }
        } catch (e) {
          ctx.ui.notify(`Error: ${e}`, "warning");
        }
      } else if (sub === "view") {
        const targetId = parts[1];
        if (!targetId) {
          ctx.ui.notify("Usage: /mesh view <sessionId> [start] [end]", "warning");
          return;
        }
        const start = parts[2] ? Number(parts[2]) : -20;
        const end = parts[3] ? Number(parts[3]) : 0;
        let resolved: string;
        try {
          resolved = resolveTargetSessionId(targetId);
        } catch (e) {
          ctx.ui.notify(`Error: ${e}`, "warning");
          return;
        }
        try {
          const reply = (await mesh.ask(
            resolved,
            { kind: "mesh:view", start, end },
            10_000,
          )) as Record<string, unknown>;
          if (reply?.error) throw new Error(String(reply.error));
          const viewText =
            typeof reply?.text === "string" ? reply.text : formatPayloadForDisplay(reply);
          ctx.ui.notify(viewText, "info");
        } catch (e) {
          ctx.ui.notify(`Error: ${e}`, "warning");
        }
      } else {
        ctx.ui.notify(
          "Unknown. Use: /mesh list | /mesh tell <id> <msg> | /mesh view <id> [start] [end] | /mesh join/leave/chat <channel>",
          "warning",
        );
      }
    },
  });

  // ── /rebirth command ──────────────────────────────────────────────────────────────
  // Phase 1: stash session metadata, then steer the agent to write a TPV.
  // The agent calls rebirth() from execute_code with the synthesized TPV text.
  // Phase 2 is the rebirth sandbox fn (registered in session_start).

  pi.registerCommand("rebirth", {
    description:
      "Rebirth: steer the agent to write a TPV, then rebirth into a fresh session with identity preserved.",
    handler: async (args, ctx) => {
      const sessionId = ctx.sessionManager.getSessionId();
      const sessionName = ctx.sessionManager.getSessionName() || "null";
      const sessionFile = ctx.sessionManager.getSessionFile();
      const cwd = ctx.sessionManager.getCwd();

      const identity = resolveIdentityFromSession(ctx);
      const channels = resolveChannelsFromSession(ctx);
      const broadcastSetting = resolveBroadcastAllowedFromSession(ctx);

      if (!identity) {
        ctx.ui.notify("Cannot rebirth: no mesh identity found in current session.", "warning");
        return;
      }

      // Stash everything the sandbox fn needs
      rebirthStash = {
        ctx,
        sessionId,
        sessionName,
        sessionFile,
        cwd,
        identity,
        channels,
        broadcastAllowed: broadcastSetting,
      };

      ctx.ui.notify("Rebirth initiated — writing TPV handoff...", "info");

      // Steer the agent: write a TPV, then call rebirth().
      // Prompt body lives in packages/pi-mesh/prompts/rebirth-command.md so
      // the agent-facing copy is editable without touching TypeScript.
      pi.sendUserMessage([
        {
          type: "text",
          text: buildRebirthCommandPrompt({ sessionId, cwd }),
        },
      ]);
    },
  });
}
