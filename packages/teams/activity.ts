import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import { safeJsonParse } from "@pi-extensions/shared/safe-json";

// ── Cached process table ─────────────────────────────────────────────────
// Instead of each worker spawning its own `ps -ax`, we cache the parsed
// process table for a short TTL.  All workers polling within the same
// cycle share a single subprocess call.

export const PROCESS_TABLE_CACHE_TTL_MS = 2_000;

let _cachedRows: ProcessRow[] | null = null;
let _cachedAt = 0;
let _pendingFetch: Promise<ProcessRow[] | null> | null = null;

function fetchProcessTableSync(): ProcessRow[] {
  return readProcessTable(PROCESS_TABLE_CACHE_TTL_MS) ?? [];
}

/**
 * Read the process table with an explicit freshness requirement. A cache TTL of
 * 0 bypasses the cache entirely, and a failed `ps` returns null: "no
 * observation" is a different answer from "the process is gone", and only the
 * caller may decide which one it needs.
 */
function readProcessTable(cacheTtlMs: number): ProcessRow[] | null {
  const now = Date.now();
  if (cacheTtlMs > 0 && _cachedRows && now - _cachedAt < cacheTtlMs) return _cachedRows;
  try {
    const output = execFileSync("ps", ["-ax", "-o", "pid=,ppid=,pcpu=,etime=,state=,comm="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    _cachedRows = parseProcessTable(output);
    _cachedAt = now;
    return _cachedRows;
  } catch {
    return null;
  }
}

async function fetchProcessTableAsync(): Promise<ProcessRow[] | null> {
  const now = Date.now();
  if (_cachedRows && now - _cachedAt < PROCESS_TABLE_CACHE_TTL_MS) return _cachedRows;
  // Coalesce concurrent callers onto a single subprocess. The clear happens in a
  // finally AFTER an await, so it cannot run before the assignment below has
  // completed — a callback that fires synchronously (a test double, or any future
  // shim) would otherwise overwrite the clear and strand a resolved promise in
  // _pendingFetch, making every later call return the old observation.
  if (_pendingFetch) return _pendingFetch;
  const pending = (async (): Promise<ProcessRow[] | null> => {
    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile("ps", ["-ax", "-o", "pid=,ppid=,pcpu=,etime=,state=,comm="], {
          encoding: "utf8",
        }, (err, out) => (err ? reject(err) : resolve(out)));
      });
      _cachedRows = parseProcessTable(stdout);
      _cachedAt = Date.now();
      return _cachedRows;
    } catch {
      // A failed ps is NO OBSERVATION, not an empty process table. Resolving []
      // made every pid derive rootAlive:false, and the activity poll then settled
      // every worker older than the cache TTL on one transient execFile failure
      // (EMFILE/fork pressure — the nightly-spawn regime that produced
      // pe-ltanf0de). The sync path has always returned null for exactly this
      // reason; the async path must not disagree with it. (pe-jy0szn6e F1)
      return null;
    } finally {
      _pendingFetch = null;
    }
  })();
  _pendingFetch = pending;
  return pending;
}

export interface ProcessRow {
  pid: number;
  ppid: number;
  cpuPercent: number;
  elapsedSeconds: number;
  state: string;
  command: string;
}

export interface WorkerProcessSnapshot {
  rootAlive: boolean;
  /** Elapsed lifetime of the process currently occupying workerPid. Used to
   *  detect PID reuse (PID existence alone is not worker identity). */
  rootElapsedSeconds?: number;
  hasActiveChildProcess: boolean;
  activeChildProcessCount: number;
  currentCommand?: string;
  currentCommandElapsedSeconds?: number;
  maxChildCpuPercent: number;
}

export interface IdleStateInput {
  now?: number;
  thresholdMs: number;
  outputSilenceThresholdMs: number;
  hasActiveChildProcess: boolean;
  lastHeartbeatAt: number;
  lastProcessActivityAt: number;
  /** Last meaningful agent/session output. Heartbeats and process activity are excluded. */
  lastOutputAt: number;
}

export interface IdleState {
  /** Legacy liveness warning: both heartbeat and process activity are stale. */
  shouldWarnStuck: boolean;
  /** Progress warning: meaningful output is stale, regardless of liveness telemetry. */
  shouldWarnOutputSilence: boolean;
  heartbeatIdleMs: number;
  processIdleMs: number;
  outputIdleMs: number;
}

export interface RuntimeSummaryInput {
  hasActiveChildProcess: boolean;
  activeChildProcessCount?: number;
  currentCommand?: string;
  currentCommandElapsedSeconds?: number;
  startedAt?: number;
  lastOutputAt?: number;
  lastOutputLabel?: string;
}

const MEANINGFUL_SESSION_ENTRY_TYPES = new Set(["message", "custom_message"]);
export const DEFAULT_SESSION_ACTIVITY_SCAN_BUDGET_BYTES = 256 * 1024;
const DEFAULT_SESSION_METADATA_PREFIX_BYTES = 16 * 1024;

export interface MeaningfulSessionActivity {
  timestampMs: number;
  label: string;
}

export type SessionActivityScanState =
  | {
      phase: "recovering_tail";
      snapshotSize: number;
      cursor: number;
    }
  | {
      phase: "recovering_lines";
      snapshotSize: number;
      cursor: number;
      lineEnd: number;
      forwardCommittedOffset: number;
      forwardScanOffset: number;
      sawValidTimestamp: boolean;
      sawMalformedRecord: boolean;
    }
  | {
      phase: "following";
      committedOffset: number;
      scanOffset: number;
      baselineTrusted: boolean;
    };

export interface SessionActivityScanOptions {
  now: number;
  cutoffMs: number;
  budgetBytes?: number;
  metadataPrefixBytes?: number;
}

export interface SessionActivityScanResult {
  state: SessionActivityScanState;
  activity?: MeaningfulSessionActivity;
  /** False while unseen/partial bytes could still contain recent meaningful output. */
  progressKnown: boolean;
  /** Test/telemetry evidence that each invocation performs bounded synchronous I/O. */
  bytesRead: number;
}

function meaningfulActivityLabel(entry: Record<string, unknown>): string {
  if (entry.type === "message" && entry.message && typeof entry.message === "object") {
    const message = entry.message as Record<string, unknown>;
    if (message.role === "toolResult" && typeof message.toolName === "string") return message.toolName;
    if (message.role === "assistant") return "response";
    if (message.role === "user") return "prompt";
    return String(message.role ?? "message");
  }
  if (entry.type === "custom_message" && typeof entry.customType === "string") return entry.customType;
  return "activity";
}

function extractJsonString(prefix: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`"${escapedKey}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`).exec(prefix);
  if (!match?.[1]) return undefined;
  try { return JSON.parse(match[1]); }
  catch { return undefined; }
}

interface SessionRecordMetadata {
  timestampMs?: number;
  activity?: MeaningfulSessionActivity;
  malformed: boolean;
  future: boolean;
}

function inspectSessionRecord(
  fd: number,
  start: number,
  end: number,
  now: number,
  metadataPrefixBytes: number,
  direct?: Buffer,
): { metadata: SessionRecordMetadata; bytesRead: number } {
  if (end <= start) return { metadata: { malformed: false, future: false }, bytesRead: 0 };
  const recordLength = end - start;
  let bytesRead = 0;
  let entry: Record<string, unknown> | undefined;
  let type: string | undefined;
  let timestamp: string | undefined;
  let label = "activity";

  if (direct && direct.length === recordLength) {
    try { entry = safeJsonParse<Record<string, unknown>>(direct.toString("utf8")); }
    catch { return { metadata: { malformed: true, future: false }, bytesRead }; }
  } else {
    const prefixLength = Math.min(recordLength, metadataPrefixBytes);
    const prefixBuffer = Buffer.allocUnsafe(prefixLength);
    fs.readSync(fd, prefixBuffer, 0, prefixLength, start);
    bytesRead += prefixLength;
    const prefix = prefixBuffer.toString("utf8");
    if (prefixLength === recordLength) {
      try { entry = safeJsonParse<Record<string, unknown>>(prefix); }
      catch { return { metadata: { malformed: true, future: false }, bytesRead }; }
    } else {
      type = extractJsonString(prefix, "type");
      timestamp = extractJsonString(prefix, "timestamp");
      const role = extractJsonString(prefix, "role");
      const toolName = extractJsonString(prefix, "toolName");
      const customType = extractJsonString(prefix, "customType");
      if (type === "message") label = role === "toolResult" && toolName ? toolName : role === "assistant" ? "response" : role === "user" ? "prompt" : role ?? "message";
      else if (type === "custom_message") label = customType ?? "custom_message";
      if (!type || !timestamp) return { metadata: { malformed: true, future: false }, bytesRead };
    }
  }

  if (entry) {
    type = typeof entry.type === "string" ? entry.type : undefined;
    timestamp = typeof entry.timestamp === "string" ? entry.timestamp : undefined;
    label = meaningfulActivityLabel(entry);
  }
  const timestampMs = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  if (!type || !Number.isFinite(timestampMs)) return { metadata: { malformed: true, future: false }, bytesRead };
  if (timestampMs > now) return { metadata: { timestampMs, malformed: false, future: true }, bytesRead };
  const activity = MEANINGFUL_SESSION_ENTRY_TYPES.has(type) ? { timestampMs, label } : undefined;
  return { metadata: { timestampMs, activity, malformed: false, future: false }, bytesRead };
}

type RecoveringTailScanState = Extract<SessionActivityScanState, { phase: "recovering_tail" }>;

function initialScanState(size: number): RecoveringTailScanState {
  return { phase: "recovering_tail", snapshotSize: size, cursor: size };
}

/**
 * Advance meaningful-session discovery by at most one bounded I/O slice.
 * Recovery walks backward until it finds recent output or crosses the time
 * cutoff. Following mode consumes appended bytes incrementally and never
 * advances the committed line boundary past an incomplete JSONL record.
 */
export function scanMeaningfulSessionActivity(
  sessionFile: string,
  prior: SessionActivityScanState | undefined,
  options: SessionActivityScanOptions,
): SessionActivityScanResult {
  const budgetBytes = Math.max(1024, Math.floor(options.budgetBytes ?? DEFAULT_SESSION_ACTIVITY_SCAN_BUDGET_BYTES));
  const metadataPrefixBytes = Math.max(1024, Math.floor(options.metadataPrefixBytes ?? DEFAULT_SESSION_METADATA_PREFIX_BYTES));
  let fd: number | undefined;
  let bytesRead = 0;
  try {
    const size = fs.statSync(sessionFile).size;
    let state = prior ?? initialScanState(size);
    if (
      (state.phase === "following" && (size < state.committedOffset || size < state.scanOffset))
      || (state.phase !== "following" && size < state.snapshotSize)
    ) state = initialScanState(size);

    fd = fs.openSync(sessionFile, "r");

    if (state.phase === "recovering_tail") {
      // Include bytes appended while tail recovery was pending. A newly completed
      // line should become visible immediately rather than preserving an old EOF.
      if (size > state.snapshotSize) state = initialScanState(size);
      if (state.cursor === 0) {
        const following: SessionActivityScanState = { phase: "following", committedOffset: 0, scanOffset: state.snapshotSize, baselineTrusted: state.snapshotSize === 0 };
        return { state: following, progressKnown: state.snapshotSize === 0, bytesRead };
      }
      const length = Math.min(budgetBytes, state.cursor);
      const start = state.cursor - length;
      const buffer = Buffer.allocUnsafe(length);
      fs.readSync(fd, buffer, 0, length, start);
      bytesRead += length;
      const newline = buffer.lastIndexOf(0x0a);
      if (newline < 0) {
        const next: SessionActivityScanState = { ...state, cursor: start };
        if (start > 0) return { state: next, progressKnown: false, bytesRead };
        const following: SessionActivityScanState = { phase: "following", committedOffset: 0, scanOffset: state.snapshotSize, baselineTrusted: false };
        return { state: following, progressKnown: false, bytesRead };
      }
      const newlineOffset = start + newline;
      const next: SessionActivityScanState = {
        phase: "recovering_lines",
        snapshotSize: state.snapshotSize,
        cursor: newlineOffset,
        lineEnd: newlineOffset,
        forwardCommittedOffset: newlineOffset + 1,
        forwardScanOffset: state.snapshotSize,
        sawValidTimestamp: false,
        sawMalformedRecord: false,
      };
      return { state: next, progressKnown: false, bytesRead };
    }

    if (state.phase === "recovering_lines") {
      if (state.cursor === 0) {
        let sawValidTimestamp = state.sawValidTimestamp;
        let sawMalformedRecord = state.sawMalformedRecord;
        let activity: MeaningfulSessionActivity | undefined;
        if (state.lineEnd > 0) {
          const inspected = inspectSessionRecord(fd, 0, state.lineEnd, options.now, metadataPrefixBytes);
          bytesRead += inspected.bytesRead;
          sawMalformedRecord ||= inspected.metadata.malformed;
          if (inspected.metadata.timestampMs !== undefined && !inspected.metadata.future) sawValidTimestamp = true;
          if (inspected.metadata.activity && !inspected.metadata.future && inspected.metadata.activity.timestampMs >= options.cutoffMs) activity = inspected.metadata.activity;
        }
        const baselineTrusted = Boolean(activity) || sawValidTimestamp || !sawMalformedRecord;
        const following: SessionActivityScanState = {
          phase: "following",
          committedOffset: state.forwardCommittedOffset,
          scanOffset: state.forwardScanOffset,
          baselineTrusted,
        };
        const caughtUp = following.scanOffset === size && following.committedOffset === size;
        return { state: following, activity, progressKnown: baselineTrusted && caughtUp, bytesRead };
      }

      const length = Math.min(budgetBytes, state.cursor);
      const start = state.cursor - length;
      const buffer = Buffer.allocUnsafe(length);
      fs.readSync(fd, buffer, 0, length, start);
      bytesRead += length;
      let lineEnd = state.lineEnd;
      let sawValidTimestamp = state.sawValidTimestamp;
      let sawMalformedRecord = state.sawMalformedRecord;

      for (let index = buffer.length - 1; index >= 0; index--) {
        if (buffer[index] !== 0x0a) continue;
        const newlineOffset = start + index;
        const recordStart = newlineOffset + 1;
        const direct = recordStart >= start && lineEnd <= start + buffer.length
          ? buffer.subarray(recordStart - start, lineEnd - start)
          : undefined;
        const inspected = inspectSessionRecord(fd, recordStart, lineEnd, options.now, metadataPrefixBytes, direct);
        bytesRead += inspected.bytesRead;
        sawMalformedRecord ||= inspected.metadata.malformed;
        if (inspected.metadata.timestampMs !== undefined && !inspected.metadata.future) sawValidTimestamp = true;
        if (inspected.metadata.activity && !inspected.metadata.future && inspected.metadata.activity.timestampMs >= options.cutoffMs) {
          const following: SessionActivityScanState = {
            phase: "following",
            committedOffset: state.forwardCommittedOffset,
            scanOffset: state.forwardScanOffset,
            baselineTrusted: true,
          };
          const caughtUp = following.scanOffset === size && following.committedOffset === size;
          return { state: following, activity: inspected.metadata.activity, progressKnown: caughtUp, bytesRead };
        }
        if (inspected.metadata.timestampMs !== undefined && !inspected.metadata.future && inspected.metadata.timestampMs < options.cutoffMs) {
          const following: SessionActivityScanState = {
            phase: "following",
            committedOffset: state.forwardCommittedOffset,
            scanOffset: state.forwardScanOffset,
            baselineTrusted: true,
          };
          const caughtUp = following.scanOffset === size && following.committedOffset === size;
          return { state: following, progressKnown: caughtUp, bytesRead };
        }
        lineEnd = newlineOffset;
      }

      const next: SessionActivityScanState = {
        ...state,
        cursor: start,
        lineEnd,
        sawValidTimestamp,
        sawMalformedRecord,
      };
      return { state: next, progressKnown: false, bytesRead };
    }

    // Following mode: consume only one bounded slice of appended bytes. The
    // scan cursor may advance through a partial record, but committedOffset does
    // not move until its newline arrives.
    if (state.scanOffset >= size) {
      const progressKnown = state.baselineTrusted && state.committedOffset === size;
      return { state, progressKnown, bytesRead };
    }
    const length = Math.min(budgetBytes, size - state.scanOffset);
    const buffer = Buffer.allocUnsafe(length);
    fs.readSync(fd, buffer, 0, length, state.scanOffset);
    bytesRead += length;
    let committedOffset = state.committedOffset;
    let baselineTrusted = state.baselineTrusted;
    let latestActivity: MeaningfulSessionActivity | undefined;

    for (let index = 0; index < buffer.length; index++) {
      if (buffer[index] !== 0x0a) continue;
      const newlineOffset = state.scanOffset + index;
      const direct = committedOffset >= state.scanOffset
        ? buffer.subarray(committedOffset - state.scanOffset, index)
        : undefined;
      const inspected = inspectSessionRecord(fd, committedOffset, newlineOffset, options.now, metadataPrefixBytes, direct);
      bytesRead += inspected.bytesRead;
      if (inspected.metadata.activity && !inspected.metadata.future && inspected.metadata.activity.timestampMs >= options.cutoffMs) {
        latestActivity = inspected.metadata.activity;
        baselineTrusted = true;
      }
      committedOffset = newlineOffset + 1;
    }

    const scanOffset = state.scanOffset + length;
    const next: SessionActivityScanState = { phase: "following", committedOffset, scanOffset, baselineTrusted };
    const progressKnown = baselineTrusted && scanOffset === size && committedOffset === size;
    return { state: next, activity: latestActivity, progressKnown, bytesRead };
  } catch {
    const fallback = prior ?? { phase: "recovering_tail" as const, snapshotSize: 0, cursor: 0 };
    return { state: fallback, progressKnown: false, bytesRead };
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
  }
}

export function parseElapsedSeconds(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  let days = 0;
  let clock = trimmed;

  if (trimmed.includes("-")) {
    const [dayPart, rest] = trimmed.split("-", 2);
    const parsedDays = Number(dayPart);
    if (!Number.isFinite(parsedDays)) return 0;
    days = parsedDays;
    clock = rest;
  }

  const parts = clock.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return 0;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return days * 86400 + minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

export function parseProcessTable(raw: string): ProcessRow[] {
  const rows: ProcessRow[] = [];
  const lines = raw.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ps -o pid=,ppid=,pcpu=,etime=,state=,comm=
    const match = trimmed.match(/^(\d+)\s+(\d+)\s+([0-9.]+)\s+([0-9:-]+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;

    const [, pidRaw, ppidRaw, cpuRaw, etimeRaw, state, commandRaw] = match;

    const pid = Number(pidRaw);
    const ppid = Number(ppidRaw);
    const cpuPercent = Number(cpuRaw);
    if (!Number.isFinite(pid) || !Number.isFinite(ppid) || !Number.isFinite(cpuPercent)) continue;

    rows.push({
      pid,
      ppid,
      cpuPercent,
      elapsedSeconds: parseElapsedSeconds(etimeRaw),
      state,
      command: commandRaw.trim(),
    });
  }

  return rows;
}

function isZombie(state: string): boolean {
  return state.toUpperCase().startsWith("Z");
}

export function deriveWorkerProcessSnapshot(rows: ProcessRow[], workerPid: number): WorkerProcessSnapshot {
  const byPid = new Map<number, ProcessRow>(rows.map((row) => [row.pid, row]));
  const root = byPid.get(workerPid);
  if (!root) {
    return {
      rootAlive: false,
      hasActiveChildProcess: false,
      activeChildProcessCount: 0,
      maxChildCpuPercent: 0,
    };
  }

  const childrenByParent = new Map<number, ProcessRow[]>();
  for (const row of rows) {
    const existing = childrenByParent.get(row.ppid) ?? [];
    existing.push(row);
    childrenByParent.set(row.ppid, existing);
  }

  const subtree: ProcessRow[] = [root];
  const seen = new Set<number>([workerPid]);
  const stack = [workerPid];

  while (stack.length > 0) {
    const currentPid = stack.pop()!;
    const directChildren = childrenByParent.get(currentPid) ?? [];

    for (const child of directChildren) {
      if (seen.has(child.pid)) continue;
      seen.add(child.pid);
      subtree.push(child);
      stack.push(child.pid);
    }
  }

  const activeChildren = subtree.filter((row) => row.pid !== workerPid && !isZombie(row.state));
  const busiestChild = activeChildren.reduce<ProcessRow | undefined>((best, row) => {
    if (!best) return row;
    if (row.cpuPercent > best.cpuPercent) return row;
    if (row.cpuPercent < best.cpuPercent) return best;
    return row.elapsedSeconds > best.elapsedSeconds ? row : best;
  }, undefined);

  return {
    rootAlive: !isZombie(root.state),
    rootElapsedSeconds: root.elapsedSeconds,
    hasActiveChildProcess: activeChildren.length > 0,
    activeChildProcessCount: activeChildren.length,
    currentCommand: busiestChild?.command,
    currentCommandElapsedSeconds: busiestChild?.elapsedSeconds,
    maxChildCpuPercent: activeChildren.reduce((max, row) => Math.max(max, row.cpuPercent), 0),
  };
}

/**
 * True when workerPid is occupied by a process born materially AFTER this
 * worker incarnation. macOS reuses PIDs aggressively under fleet/process churn;
 * process.kill(pid, 0) and a raw ps lookup then mistake an unrelated live tree
 * for the dead worker forever. etime is second-granularity, hence tolerance.
 */
export function isReusedWorkerPid(
  snapshot: WorkerProcessSnapshot,
  incarnationStartedAt: number,
  now = Date.now(),
  toleranceMs = 30_000,
): boolean {
  if (!snapshot.rootAlive || snapshot.rootElapsedSeconds === undefined) return false;
  const expectedAgeMs = Math.max(0, now - incarnationStartedAt);
  const observedAgeMs = Math.max(0, snapshot.rootElapsedSeconds * 1000);
  return observedAgeMs + toleranceMs < expectedAgeMs;
}

/**
 * Synchronous variant — uses cached process table (TTL-based).
 * Kept for backward compat but prefer the async version.
 */
export function sampleWorkerProcessSnapshot(workerPid: number): WorkerProcessSnapshot {
  const rows = fetchProcessTableSync();
  return deriveWorkerProcessSnapshot(rows, workerPid);
}

/**
 * Observation-strength snapshot for liveness decisions. It bypasses the table
 * cache, because absence from a table sampled BEFORE the question was asked says
 * nothing about a process that started moments ago — and that is exactly the
 * window Bun's premature child "exit" event lands in. Returns null when no
 * observation could be made at all (the process table could not be read);
 * callers must treat that as unknown, never as "dead".
 */
export function sampleWorkerProcessSnapshotFresh(workerPid: number): WorkerProcessSnapshot | null {
  if (!Number.isFinite(workerPid) || workerPid <= 0) return null;
  const rows = readProcessTable(0);
  if (!rows) return null;
  return deriveWorkerProcessSnapshot(rows, workerPid);
}

/**
 * Async variant — non-blocking, coalesces concurrent callers onto one
 * subprocess.  All workers in the same poll cycle share a single `ps -ax`.
 */
export async function sampleWorkerProcessSnapshotAsync(workerPid: number): Promise<WorkerProcessSnapshot | null> {
  const rows = await fetchProcessTableAsync();
  // null = the process table could not be read at all. Callers must treat that as
  // unknown and skip the cycle, exactly as sampleWorkerProcessSnapshotFresh does.
  if (!rows) return null;
  return deriveWorkerProcessSnapshot(rows, workerPid);
}

export function evaluateIdleState(input: IdleStateInput): IdleState {
  const now = input.now ?? Date.now();
  const heartbeatIdleMs = Math.max(0, now - input.lastHeartbeatAt);
  const processIdleMs = Math.max(0, now - input.lastProcessActivityAt);
  const outputIdleMs = Math.max(0, now - input.lastOutputAt);

  const shouldWarnStuck =
    !input.hasActiveChildProcess &&
    heartbeatIdleMs >= input.thresholdMs &&
    processIdleMs >= input.thresholdMs;
  const shouldWarnOutputSilence = outputIdleMs >= input.outputSilenceThresholdMs;

  return {
    shouldWarnStuck,
    shouldWarnOutputSilence,
    heartbeatIdleMs,
    processIdleMs,
    outputIdleMs,
  };
}

function formatDuration(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  if (clamped < 60) return `${clamped}s`;

  if (clamped < 3600) {
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }

  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatAge(timestampMs: number | undefined, now: number): string {
  if (!timestampMs || !Number.isFinite(timestampMs)) return "n/a";
  const seconds = Math.max(0, Math.floor((now - timestampMs) / 1000));
  if (seconds < 1) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/** How recently lastOutputAt must be to count as "thinking" rather than "idle" */
const THINKING_THRESHOLD_MS = 120_000;

export function formatRuntimeSummary(input: RuntimeSummaryInput, now = Date.now()): string {
  const children = input.activeChildProcessCount ?? 0;

  let state: string;
  if (input.hasActiveChildProcess) {
    state = "busy";
  } else if (
    input.lastOutputAt &&
    Number.isFinite(input.lastOutputAt) &&
    now - input.lastOutputAt < THINKING_THRESHOLD_MS
  ) {
    state = "thinking";
  } else {
    state = "idle";
  }

  let commandPart = "";
  if (input.hasActiveChildProcess && input.currentCommand) {
    const elapsed =
      typeof input.currentCommandElapsedSeconds === "number"
        ? ` (${formatDuration(input.currentCommandElapsedSeconds)})`
        : "";
    commandPart = ` ${input.currentCommand}${elapsed}`;
  }

  const processPart = `${state}${input.hasActiveChildProcess ? ` (${children} child${children === 1 ? "" : "ren"})` : ""}${commandPart}`;
  const startedPart = `started ${formatAge(input.startedAt, now)}`;
  const labelSuffix = input.lastOutputLabel ? ` (${input.lastOutputLabel})` : "";
  const outputPart = `last output ${formatAge(input.lastOutputAt, now)}${labelSuffix}`;

  return `${processPart} · ${startedPart} · ${outputPart}`;
}
