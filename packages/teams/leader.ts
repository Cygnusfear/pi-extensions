import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { safeJsonParse } from "@pi-extensions/shared/safe-json";
import {
  formatSessionViewEntries,
  readMeaningfulSessionEntriesFromFile,
  sliceSessionViewEntries,
} from "../shared/src/session-view.ts";
import {
  evaluateIdleState,
  formatRuntimeSummary,
  sampleWorkerProcessSnapshotAsync,
} from "./activity.js";
import { LEASE_HEARTBEAT_INTERVAL_MS, buildLeaderLeasePath, writeLeaderLease } from "./lease.js";
import { cleanupWorker } from "./cleanup.js";
import { isProcessAlive, resumeWorker, spawnWorker } from "./spawner.js";
import { getNewNotes, parseMaiShow } from "./tickets.js";
import type { PollEvent, SpawnConfig, WorkerAttempt, WorkerHandle } from "./types.js";
import {
  ACTIVITY_POLL_INTERVAL_MS,
  DONE_GRACE_MS,
  NOTIFY_BATCH_WINDOW_MS,
  RESUMABLE_WINDOW_MS,
  STUCK_THRESHOLD_MS,
  STUCK_WARNING_COOLDOWN_MS,
} from "./types.js";
import { createTeamsWidget } from "./widget.js";
import { buildTeamChannelId } from "./v2/mesh-adapter.ts";
import type { TeamEnvelope, WorkerCommentPayload, WorkerFinishPayload } from "./v2/protocol.ts";
import type { TeamRecord } from "./v2/state.ts";
import { appendFact as applyV2Fact, createTeamRecord, upsertWorker as upsertV2Worker } from "./v2/runtime-store.ts";
import { createWorktree, resolveGitToplevel, workerWorktreePath } from "./worktree.js";

/** Entry types that represent real agent work (talking, tool use). */
const REAL_ACTIVITY_TYPES = new Set(["message", "custom_message"]);

const ambientChatBatchMsRaw = Number(process.env.PI_TEAMS_AMBIENT_CHAT_BATCH_MS ?? "750");
const AMBIENT_CHAT_BATCH_MS = Number.isFinite(ambientChatBatchMsRaw) && ambientChatBatchMsRaw >= 0
  ? Math.floor(ambientChatBatchMsRaw)
  : 750;

interface RealActivity {
  timestampMs: number;
  label: string;
}

interface WorkerLifecycleFacts {
  sawAgentEnd: boolean;
  sawForcedSessionShutdown: boolean;
  sawSessionShutdownClose: boolean;
  lastHeartbeatEvent?: string;
  lastAgentEndSeq?: number;
  lastForcedShutdownSeq?: number;
  lastTerminalSeq?: number;
  lastTerminalStatus?: "done" | "quit";
  lastTerminalSummary?: string;
}

interface WorkerExitAssessment {
  lifecycle: WorkerLifecycleFacts;
  forcedExit: boolean;
  cleanAgentEnd: boolean;
  ticketClosed: boolean;
  outputMeaningful: boolean;
  classification: "success" | "warning" | "failure" | "turn_finished";
  reason?: string;
}

interface PersistedWorkerState {
  workerInstanceId: string;
  attempts?: WorkerAttempt[];
  name: string;
  pid: number;
  ticketId: string;
  ticketStatus?: string;
  lastNote?: string;
  sessionDir: string;
  sessionFile: string;
  worktreePath: string | null;
  model?: string;
  hasTools?: boolean;
  status: WorkerHandle["status"] | "idle";
  spawnedAt: number;
  sessionMode?: import("./v2/protocol.ts").WorkerSessionMode;
  freeform?: boolean;
  nickname?: string;
  meshClientId?: string;
  routeState?: WorkerHandle["routeState"];
  lastActivityAt?: number;
  lastOutputAt?: number;
  lastSeenCommentCount?: number;
  doneAt?: number;
  graceAt?: number;
  resumableUntilAt?: number;
  killedAt?: number;
}

interface LeaderStateSnapshot {
  version: number;
  meshChannelId: string | null;
  v2TeamId?: string | null;
  v2TeamRecord?: TeamRecord | null;
  workers: Record<string, PersistedWorkerState>;
  savedAt: number;
  clearedAt?: number;
}

/**
 * Derive a short human label from a session entry.
 * Examples: "rg", "bash", "response", "prompt", "context-inject"
 */
function labelFromEntry(entry: Record<string, unknown>): string {
  if (entry.type === "message" && entry.message && typeof entry.message === "object") {
    const msg = entry.message as Record<string, unknown>;
    if (msg.role === "toolResult" && typeof msg.toolName === "string") {
      return msg.toolName;
    }
    if (msg.role === "assistant") return "response";
    if (msg.role === "user") return "prompt";
    return String(msg.role ?? "message");
  }
  if (entry.type === "custom_message" && typeof entry.customType === "string") {
    return entry.customType;
  }
  return "activity";
}

/**
 * Read the session JSONL from the end and return the timestamp + label of the
 * last entry that represents real agent activity — a message or custom_message.
 * Skips heartbeats, metadata changes, and other bookkeeping entries.
 *
 * Reads the tail of the file (last 8KB) to avoid loading multi-MB session files.
 */
function findLastRealActivity(sessionFile: string): RealActivity | undefined {
  const TAIL_BYTES = 8192;
  let tail: string;
  try {
    const stat = fs.statSync(sessionFile);
    const size = stat.size;
    if (size === 0) return undefined;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(Math.min(size, TAIL_BYTES));
    const fd = fs.openSync(sessionFile, "r");
    try {
      fs.readSync(fd, buf, 0, buf.length, start);
    } finally {
      fs.closeSync(fd);
    }
    tail = buf.toString("utf8");
  } catch {
    return undefined;
  }

  // Split into lines, walk backwards
  const lines = tail.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const entry = safeJsonParse<Record<string, any>>(line);
      if (!REAL_ACTIVITY_TYPES.has(entry.type)) continue;
      // Use the entry's own timestamp (ISO string) — more accurate than file mtime
      if (entry.timestamp) {
        const ms = new Date(entry.timestamp).getTime();
        if (Number.isFinite(ms)) {
          return { timestampMs: ms, label: labelFromEntry(entry) };
        }
      }
    } catch {
      // Partial line from mid-read or corrupt — skip
      continue;
    }
  }
  return undefined;
}

function readDiagnosticLog(sessionDir: string, fileName: string, label: string): string {
  try {
    const raw = fs.readFileSync(path.join(sessionDir, fileName), "utf-8").trim();
    if (!raw) return "";
    return `\n${label}: ${raw.slice(-500)}`;
  } catch {
    return "";
  }
}

function readWorkerLifecycleFacts(sessionDir: string): WorkerLifecycleFacts {
  let sessionFile: string | undefined;
  try {
    const files = fs.readdirSync(sessionDir)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => path.join(sessionDir, f));
    if (files.length === 0) return { sawAgentEnd: false, sawForcedSessionShutdown: false, sawSessionShutdownClose: false };
    sessionFile = files.length === 1
      ? files[0]
      : files.map(f => ({ f, mtime: fs.statSync(f).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0].f;
  } catch {
    return { sawAgentEnd: false, sawForcedSessionShutdown: false, sawSessionShutdownClose: false };
  }

  const TAIL_BYTES = 65536;
  let tail = "";
  try {
    const stat = fs.statSync(sessionFile);
    const size = stat.size;
    if (size === 0) return { sawAgentEnd: false, sawForcedSessionShutdown: false, sawSessionShutdownClose: false };
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(Math.min(size, TAIL_BYTES));
    const fd = fs.openSync(sessionFile, "r");
    try {
      fs.readSync(fd, buf, 0, buf.length, start);
    } finally {
      fs.closeSync(fd);
    }
    tail = buf.toString("utf8");
  } catch {
    return { sawAgentEnd: false, sawForcedSessionShutdown: false, sawSessionShutdownClose: false };
  }

  let sawAgentEnd = false;
  let sawSessionShutdownClose = false;
  let lastHeartbeatEvent: string | undefined;
  let lastAgentEndSeq: number | undefined;
  let lastForcedShutdownSeq: number | undefined;
  let lastTerminalSeq: number | undefined;
  let lastTerminalStatus: "done" | "quit" | undefined;
  let lastTerminalSummary: string | undefined;
  let seq = 0;

  for (const line of tail.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = safeJsonParse<Record<string, any>>(trimmed);
      if (entry.type !== "custom" || entry.customType !== "teams-worker-heartbeat") continue;
      const data = entry.data;
      if (!data || typeof data !== "object") continue;
      const event = typeof data.event === "string" ? data.event : undefined;
      if (!event) continue;
      seq += 1;
      lastHeartbeatEvent = event;
      if (event === "agent_end") {
        sawAgentEnd = true;
        lastAgentEndSeq = seq;
      }
      if (event === "session_shutdown_close") {
        sawSessionShutdownClose = true;
        if (data.isForced === true) lastForcedShutdownSeq = seq;      }
      if (event === "worker_terminal") {
        const status = data.status === "done" || data.status === "quit" ? data.status : undefined;
        if (status) {
          lastTerminalSeq = seq;
          lastTerminalStatus = status;
          if (typeof data.summary === "string") lastTerminalSummary = data.summary;
        }
      }
    } catch {
      continue;
    }
  }

  const sawForcedSessionShutdown =
    lastForcedShutdownSeq !== undefined &&
    (lastAgentEndSeq === undefined || lastForcedShutdownSeq > lastAgentEndSeq);

  return {
    sawAgentEnd,
    sawForcedSessionShutdown,
    sawSessionShutdownClose,
    lastHeartbeatEvent,
    lastAgentEndSeq,
    lastForcedShutdownSeq,
    lastTerminalSeq,
    lastTerminalStatus,
    lastTerminalSummary,
  };
}

export function assessWorkerExit(
  worker: Pick<WorkerHandle, "freeform" | "hasTools" | "sessionDir">,
  exitCode: number | null,
  ticketClosed: boolean,
  lastNote: string,
): WorkerExitAssessment {
  const lifecycle = readWorkerLifecycleFacts(worker.sessionDir);
  const outputCheck = workerProducedMeaningfulOutput(worker.sessionDir);
  const outputMeaningful = outputCheck.meaningful;
  const explicitTerminal = lifecycle.lastTerminalStatus;

  const forcedExit = !explicitTerminal && (lifecycle.sawForcedSessionShutdown || lastNote.startsWith("EXITED:") || lastNote.startsWith("FAILED:"));
  const cleanAgentEnd = lifecycle.sawAgentEnd && exitCode === 0 && !forcedExit;

  let classification: WorkerExitAssessment["classification"];
  let reason: string | undefined;

  if (explicitTerminal === "done") {
    classification = "success";
  } else if (explicitTerminal === "quit") {
    classification = "warning";
    reason = lifecycle.lastTerminalSummary || lastNote || "worker quit";
  } else if (worker.freeform && cleanAgentEnd) {
    classification = "turn_finished";
  } else if (!forcedExit && ticketClosed && (lastNote.startsWith("DONE:") || cleanAgentEnd)) {
    // Legacy compatibility for workers that still closed the ticket directly.
    classification = "success";
  } else if (forcedExit) {
    classification = "failed";
    reason = lastNote;
  } else if (!outputMeaningful) {
    classification = "failed";
    reason = outputCheck.reason;
  } else {
    classification = "warning";
    reason = "worker exited without explicit team_finish";
  }

  return {
    lifecycle,
    forcedExit,
    cleanAgentEnd,
    ticketClosed,
    outputMeaningful,
    classification,
    reason,
  };
}

/**
 * Extract the last meaningful entries from a session JSONL file to show why a worker failed.
 * Walks backwards to find the last assistant message (may contain error/stopReason),
 * the last tool result (may show a failing tool), and any error messages.
 * Returns a short summary string.
 */
function readSessionDiagnostics(sessionDir: string): string {
  let sessionFile: string | undefined;
  try {
    const files = fs.readdirSync(sessionDir)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => path.join(sessionDir, f));
    if (files.length === 0) return "";
    // Pick the most recently modified
    sessionFile = files.length === 1
      ? files[0]
      : files.map(f => ({ f, mtime: fs.statSync(f).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0].f;
  } catch {
    return "";
  }

  const TAIL_BYTES = 32768;
  let tail: string;
  try {
    const stat = fs.statSync(sessionFile);
    const size = stat.size;
    if (size === 0) return "";
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(Math.min(size, TAIL_BYTES));
    const fd = fs.openSync(sessionFile, "r");
    try {
      fs.readSync(fd, buf, 0, buf.length, start);
    } finally {
      fs.closeSync(fd);
    }
    tail = buf.toString("utf8");
  } catch {
    return "";
  }

  const lines = tail.split("\n");
  let lastAssistant: string | undefined;
  let lastError: string | undefined;
  let lastToolResult: string | undefined;

  // Walk backwards — collect the first (most recent) of each type we care about
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lastAssistant && lastError !== undefined && lastToolResult) break;
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const entry = safeJsonParse<Record<string, any>>(line);
      if (entry.type !== "message") continue;
      const msg = entry.message;
      if (!msg || typeof msg !== "object") continue;

      if (!lastAssistant && msg.role === "assistant") {
        const parts: string[] = [];
        if (msg.stopReason && msg.stopReason !== "end_turn") {
          parts.push(`stopReason: ${msg.stopReason}`);
        }
        if (msg.errorMessage) {
          parts.push(`error: ${msg.errorMessage}`);
          if (!lastError) lastError = msg.errorMessage;
        }
        // Extract text content (truncated)
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === "text" && typeof block.text === "string" && block.text.trim()) {
              parts.push(`text: ${block.text.slice(0, 200)}`);
              break;
            }
          }
        }
        if (parts.length > 0) {
          lastAssistant = parts.join(" | ");
        }
      }

      if (!lastToolResult && msg.role === "toolResult" && msg.isError) {
        const text = Array.isArray(msg.content)
          ? msg.content.map((b: Record<string, unknown>) => b.type === "text" ? b.text : "").join("").slice(0, 200)
          : "";
        lastToolResult = `${msg.toolName}: ${text}`;
      }
    } catch {
      continue;
    }
  }

  const parts: string[] = [];
  if (lastError) parts.push(`\n  error: ${lastError.slice(0, 300)}`);
  if (lastAssistant) parts.push(`\n  last assistant: ${lastAssistant.slice(0, 300)}`);
  if (lastToolResult) parts.push(`\n  last failing tool: ${lastToolResult.slice(0, 300)}`);
  return parts.join("");
}

export function readWorkerFailureDiagnostics(sessionDir: string): string {
  return [
    readSessionDiagnostics(sessionDir),
    readDiagnosticLog(sessionDir, "stdout.log", "stdout"),
    readDiagnosticLog(sessionDir, "stderr.log", "stderr"),
  ].join("");
}

export function extractAssistantError(diagnostics: string): string | undefined {
  const direct = diagnostics.match(/\n\s*error: ([^\n]+)/)?.[1]?.trim();
  if (direct) return direct;

  const assistant = diagnostics.match(/\n\s*last assistant: .*?error: ([^|\n]+)/)?.[1]?.trim();
  if (assistant) return assistant;

  return undefined;
}

export function getRecoverableToolRetry(diagnostics: string): { error: string; prompt: string } | null {
  const error = extractAssistantError(diagnostics);
  if (!error) return null;
  if (!/(JSON Parse error|Invalid escape character|Bad escaped character in JSON|escaped character in JSON)/i.test(error)) return null;

  return {
    error,
    prompt: [
      "Your previous turn ended before the tool ran because the tool call JSON was malformed.",
      `Error: ${error}`,
      "Retry the task immediately.",
      "Important: tool arguments are JSON, so every literal backslash must be escaped.",
      "Examples:",
      "- If the source code must contain \\x1b, send \\\\x1b in the JSON string.",
      "- If the source code must contain \\n, send \\\\n in the JSON string.",
      "- If the source code must contain C:\\\\tmp, escape every backslash in the JSON string.",
      "This usually happens with hash_edit, apply_patch, regexes, ANSI escapes, or Windows paths.",
      "If the edit text has lots of backslashes, use execute_code and write the file from JavaScript instead of a raw JSON tool call.",
      "Do the same work again now and do not stop after this reminder.",
    ].join("\n"),
  };
}

/**
 * Build a structured crash report for a dead worker. This is the full picture
 * a coordinator needs to understand what happened without any manual inspection.
 */
async function settleSessionFile(sessionDir: string, waitMs = 1500): Promise<boolean> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    try {
      const files = fs.readdirSync(sessionDir).filter(f => f.endsWith(".jsonl"));
      if (files.length > 0) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

function getCurrentAttempt(worker: WorkerHandle): WorkerAttempt | null {
  const attempts = worker.attempts ?? [];
  if (attempts.length === 0) return null;
  return attempts[attempts.length - 1] ?? null;
}

function scoreAttempt(attempt: WorkerAttempt): number {
  let score = 0;
  try {
    const files = fs.readdirSync(attempt.sessionDir).filter(f => f.endsWith(".jsonl"));
    if (files.length > 0) score += 100;
  } catch {}
  try {
    const stderr = fs.readFileSync(path.join(attempt.sessionDir, "stderr.log"), "utf-8").trim();
    if (stderr) score += 50;  } catch {}
  if (attempt.spawnError) score += 25;
  if (attempt.exitCode && attempt.exitCode !== 0) score += 10;
  return score;
}

function getBestAttempt(worker: WorkerHandle): WorkerAttempt {
  const attempts = worker.attempts ?? [];
  if (attempts.length === 0) {
    return {
      workerInstanceId: worker.workerInstanceId,
      pid: worker.pid,
      sessionDir: worker.sessionDir,
      sessionFile: worker.sessionFile,
      spawnedAt: worker.spawnedAt,
      exitCode: worker.exitCode,
      spawnError: worker.spawnError,
    };
  }
  return [...attempts].sort((a, b) => scoreAttempt(b) - scoreAttempt(a))[0];
}

function buildWorkerCrashReport(worker: WorkerHandle, exitCode: number | null): string {
  const lines: string[] = [];
  const attempt = getBestAttempt(worker);
  const runtimeMs = Date.now() - attempt.spawnedAt;
  const runtimeSec = (runtimeMs / 1000).toFixed(1);
  const STARTUP_WINDOW_MS = 5000;

  lines.push("── worker crash report ──");
  lines.push(`worker: ${worker.name} | ticket: ${worker.ticketId} | pid: ${attempt.pid}`);
  lines.push(`model: ${worker.model ?? "default"} | exit code: ${(attempt.exitCode ?? exitCode) ?? "null (spawn error)"}`);
  lines.push(`runtime: ${runtimeSec}s | status: ${worker.status}`);
  if ((worker.attempts?.length ?? 0) > 1) lines.push(`attempts: ${worker.attempts?.length}`);
  const lifecycle = readWorkerLifecycleFacts(attempt.sessionDir);
  if (lifecycle.lastHeartbeatEvent) {
    lines.push(`worker lifecycle: last=${lifecycle.lastHeartbeatEvent} | agent_end=${lifecycle.sawAgentEnd} | forced_shutdown=${lifecycle.sawForcedSessionShutdown}`);
  }
  if (attempt.spawnError || worker.spawnError) lines.push(`spawn error: ${attempt.spawnError ?? worker.spawnError}`);

  // Session file check
  let hasSessionFile = false;
  let sessionEntryCount = 0;
  try {
    const files = fs.readdirSync(attempt.sessionDir).filter(f => f.endsWith(".jsonl"));
    hasSessionFile = files.length > 0;
    if (hasSessionFile) {
      const sf = files.length === 1
        ? path.join(attempt.sessionDir, files[0])
        : files.map(f => ({ f: path.join(attempt.sessionDir, f), mtime: fs.statSync(path.join(attempt.sessionDir, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime)[0].f;
      const content = fs.readFileSync(sf, "utf-8");
      sessionEntryCount = content.split("\n").filter(l => l.trim()).length;
    }
  } catch {}

  if (!hasSessionFile) {
    lines.push("session: NO FILE CREATED — process exited before pi initialized");
    lines.push("diagnosis: pi binary crashed on startup, or spawn() failed at OS level");
    if (runtimeMs < STARTUP_WINDOW_MS) {
      lines.push(`note: exited during the startup window (<${(STARTUP_WINDOW_MS / 1000).toFixed(0)}s) — likely a startup env, module resolution, deleted cwd, or provider init issue`);
    }
  } else {
    lines.push(`session: ${sessionEntryCount} entries`);
  }

  // stderr — this is where provider errors and node crashes land
  const stderr = readDiagnosticLog(attempt.sessionDir, "stderr.log", "").trim();
  if (stderr) {
    // Strip the label prefix that readDiagnosticLog adds
    lines.push(`stderr: ${stderr.replace(/^\n/, "").slice(0, 500)}`);
  } else {
    lines.push("stderr: (empty)");
  }

  // stdout
  const stdout = readDiagnosticLog(attempt.sessionDir, "stdout.log", "").trim();
  if (stdout) {
    lines.push(`stdout: ${stdout.replace(/^\n/, "").slice(0, 300)}`);
  } else {
    lines.push("stdout: (empty)");
  }

  // Session-level diagnostics (last assistant error, last failing tool)
  if (hasSessionFile) {
    const sessionDiag = readSessionDiagnostics(attempt.sessionDir).trim();
    if (sessionDiag) lines.push(sessionDiag);
  }

  // Meaningful output check result
  const outputCheck = workerProducedMeaningfulOutput(attempt.sessionDir);
  if (!outputCheck.meaningful) {
    lines.push(`output check: FAILED — ${outputCheck.reason}`);
  }

  lines.push("── end crash report ──");
  return lines.join("\n");
}

function isWorkerToLeaderEnvelope(payload: unknown): payload is TeamEnvelope<unknown> {
	if (!payload || typeof payload !== "object") return false;
	const p = payload as Record<string, unknown>;
	return p.version === 1 && p.from === "worker" && p.to === "leader" && typeof p.type === "string";
}

function isTerminalV2Lifecycle(lifecycle: import("./v2/state.ts").WorkerLifecycleState | null): boolean {
	return lifecycle === "done"
		|| lifecycle === "warning"
		|| lifecycle === "failed"
		|| lifecycle === "killed"
		|| lifecycle === "resumable"
		|| lifecycle === "orphaned";
}

/**
 * Check if a worker actually did meaningful work by inspecting its session file.
 * Returns false if:
 * - No session file exists (process died before init)
 * - Session has no tool calls and no substantive assistant messages
 * - Last assistant message had stopReason "error" or "aborted"
 *
 * This catches rate limits, auth failures, and instant-death scenarios where
 * the worker technically "completed" (exit 0, ticket closed) but produced nothing.
 */
function workerProducedMeaningfulOutput(sessionDir: string): { meaningful: boolean; reason?: string } {
  let sessionFile: string | undefined;
  try {
    const files = fs.readdirSync(sessionDir)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => path.join(sessionDir, f));
    if (files.length === 0) {
      return { meaningful: false, reason: "no session file created (process died before init)" };
    }
    sessionFile = files.length === 1
      ? files[0]
      : files.map(f => ({ f, mtime: fs.statSync(f).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0].f;
  } catch {
    return { meaningful: false, reason: "could not read session directory" };
  }

  let content: string;
  try {
    content = fs.readFileSync(sessionFile, "utf-8");
  } catch {
    return { meaningful: false, reason: "could not read session file" };
  }

  const lines = content.split("\n").filter(l => l.trim());
  let hasToolCall = false;
  let lastAssistantStopReason: string | undefined;
  let lastAssistantError: string | undefined;
  let hasSubstantiveText = false;

  for (const line of lines) {
    try {
      const entry = safeJsonParse<Record<string, any>>(line);
      if (entry.type !== "message") continue;
      const msg = entry.message;
      if (!msg || typeof msg !== "object") continue;

      if (msg.role === "assistant") {
        lastAssistantStopReason = msg.stopReason;
        lastAssistantError = msg.errorMessage;
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === "toolCall") hasToolCall = true;
            if (block.type === "text" && typeof block.text === "string" && block.text.trim().length > 20) {
              hasSubstantiveText = true;
            }
          }
        }
      }

      if (msg.role === "toolResult") hasToolCall = true;
    } catch {
      continue;
    }
  }

  // If there were tool calls, the worker did real work.
  // A late provider error after substantial work should not erase that fact —
  // success/failure is decided by assessWorkerExit(), not by this helper.
  if (hasToolCall) return { meaningful: true };

  // If there was substantive text output but no tool calls, still counts.
  if (hasSubstantiveText) return { meaningful: true };

  // If the last assistant message was an error AND there was no meaningful work,
  // surface the provider error as the failure reason.
  if (lastAssistantStopReason === "error" || lastAssistantStopReason === "aborted") {
    const errorSnippet = lastAssistantError ? `: ${lastAssistantError.slice(0, 200)}` : "";
    return { meaningful: false, reason: `provider ${lastAssistantStopReason}${errorSnippet}` };
  }

  return { meaningful: false, reason: "no tool calls or substantive output in session" };
}

export class TeamLeader {
  private workers = new Map<string, WorkerHandle>();
  private childProcesses = new Map<string, ChildProcess>();
  // activityTimers removed — replaced by single batchTimer + monitoredWorkers set

  private pi: ExtensionAPI;
  private ctx: ExtensionContext | null = null;
  private widgetFactory = createTeamsWidget(
    () => this.getWorkers(),
    (workerName) => this.getV2WorkerLifecycle(workerName),
    (workerName) => {
      const mode = this.getV2CurrentSessionMode(workerName);
      if (!mode) return null;
      return mode.kind === "fork" ? `fork:${mode.parentLeafId}` : mode.kind;
    },
  );
  private notifiedTerminal = new Set<string>();
  private notifyQueue: Array<{ msg: string; triggerTurn: boolean }> = [];
  private notifyDraining = false;
  private stateHydrated = false;
  private lastSavedStateSignature: string | null = null;
  showComments = true;

  // Mesh — shared instance from pi-mesh extension, set via setMesh()
  private mesh: {
    tell: (id: string, msg: unknown) => void;
    ask: (id: string, msg: unknown, timeout?: number) => Promise<unknown>;
    chat: (ch: string, msg: unknown) => void;
    joinChannel: (ch: string) => void;
    stop: () => void;
    on: (event: "channel" | "message", cb: (payload: unknown) => void) => void;
    peers: () => Array<{ id: string; sessionId?: string; nickname?: string; name?: string }>;
    self: () => { id: string };
  } | null = null;
  private meshChannelId: string | null = null;
  private v2TeamId: string | null = null;
  private v2TeamRecord: TeamRecord | null = null;
  private readonly leaderEpoch = crypto.randomUUID();
  private meshDelivered = new Map<string, Set<string>>(); // workerName → set of comment texts already delivered via mesh
  private pendingAmbientChat = new Map<string, string[]>();
  private pendingAmbientTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private leaseFilePath: string | null = null;
  private leaseTimer: ReturnType<typeof setInterval> | null = null;
  private meshChannelHandler?: (payload: unknown) => void;
  private meshMessageHandler?: (payload: unknown) => void;

  private static readonly STATE_ENTRY_TYPE = "teams-leader-state";
  private static readonly STALE_RESTORE_PRUNE_MS = 60_000;

  constructor(pi: ExtensionAPI) {
    this.pi = pi;
  }

  private startLeaseHeartbeat() {
    if (!this.ctx) return;
    const leaderSessionFile = this.ctx.sessionManager.getSessionFile();
    if (!leaderSessionFile) return;

    const leaseFile = buildLeaderLeasePath(this.ctx.cwd, leaderSessionFile);
    this.leaseFilePath = leaseFile;
    writeLeaderLease(leaseFile, { leaderSessionFile, cwd: this.ctx.cwd });

    if (this.leaseTimer) clearInterval(this.leaseTimer);
    this.leaseTimer = setInterval(() => {
      if (!this.leaseFilePath) return;
      writeLeaderLease(this.leaseFilePath, { leaderSessionFile, cwd: this.ctx?.cwd });
    }, LEASE_HEARTBEAT_INTERVAL_MS);
  }

  private stopLeaseHeartbeat() {    if (this.leaseTimer) {
      clearInterval(this.leaseTimer);
      this.leaseTimer = null;
    }
  }

  private buildPersistedWorkers(): Record<string, PersistedWorkerState> {
    const workers: Record<string, PersistedWorkerState> = {};
    for (const [name, w] of this.workers) {
      // Persist only lifecycle state needed for reload recovery.
      // Do NOT persist volatile poll/widget fields like lastActivityAt,
      // lastOutputAt, ticketStatus, lastNote, or comment counters — those change
      // constantly and were bloating sessions with near-duplicate snapshots.
      workers[name] = {
        workerInstanceId: w.workerInstanceId,
        attempts: w.attempts,
        name: w.name,
        pid: w.pid,
        ticketId: w.ticketId,
        sessionDir: w.sessionDir,
        sessionFile: w.sessionFile,
        worktreePath: w.worktreePath,
        model: w.model,
        hasTools: w.hasTools,
        status: w.status,
        spawnedAt: w.spawnedAt,
        sessionMode: w.attempts?.at(-1)?.sessionMode,
        freeform: w.freeform,
        nickname: w.nickname,
        meshClientId: w.meshClientId,
        routeState: w.routeState,
        doneAt: w.doneAt,
        graceAt: w.graceAt,
        resumableUntilAt: w.resumableUntilAt,
        killedAt: w.killedAt,
      };
    }
    return workers;
  }

  private buildStateSignature(workers: Record<string, PersistedWorkerState>, cleared = false): string {
    return JSON.stringify({
      version: 3,
      meshChannelId: this.meshChannelId,
      v2TeamId: this.v2TeamId,
      v2TeamRecord: this.v2TeamRecord,
      cleared,
      workers,
    });
  }

  private persistStateIfHydrated(options?: { cleared?: boolean }) {
    if (!this.stateHydrated) return;
    this.saveState(options);
  }

  /**
   * Snapshot current worker state to the session JSONL.
   * This is reload-recovery state only, not a general branch/fork state store.
   * Empty state is written only on explicit clears to avoid wiping good state during reload churn.
   *
   * Dedupe identical snapshots. This method may be called frequently from UI
   * update paths, but we only persist when lifecycle state actually changed.
   */
  private saveState(options?: { cleared?: boolean }) {
    try {
      const workers = this.buildPersistedWorkers();
      if (Object.keys(workers).length === 0 && !options?.cleared) return;

      const signature = this.buildStateSignature(workers, Boolean(options?.cleared));
      if (signature === this.lastSavedStateSignature) return;
      this.lastSavedStateSignature = signature;

      const snapshot: LeaderStateSnapshot = {
        version: 3,
        meshChannelId: this.meshChannelId,
        v2TeamId: this.v2TeamId,
        v2TeamRecord: this.v2TeamRecord,
        workers,
        savedAt: Date.now(),
        ...(options?.cleared ? { clearedAt: Date.now() } : {}),
      };
      this.pi.appendEntry(TeamLeader.STATE_ENTRY_TYPE, snapshot);
    } catch {
      // best effort
    }
  }

  private deriveRestoredStatus(saved: PersistedWorkerState, now: number): WorkerHandle["status"] | null {
    if (saved.killedAt) return null;

    const lifecycle = readWorkerLifecycleFacts(saved.sessionDir);
    if (lifecycle.lastTerminalStatus === "done") {
      return saved.freeform
        ? (saved.graceAt && now >= saved.graceAt ? "grace" : "done")
        : "done";
    }
    if (lifecycle.lastTerminalStatus === "quit") return "warning";
    if (lifecycle.sawForcedSessionShutdown) return "failed";

    const legacyStatus = saved.status === "idle" ? "grace" : saved.status;

    if (saved.freeform) {
      if (saved.resumableUntilAt && now > saved.resumableUntilAt) return null;
      if (saved.doneAt) {
        if (saved.graceAt && now >= saved.graceAt) return "grace";
        return "done";
      }
      if (legacyStatus === "grace") return "grace";
    }

    if ((legacyStatus === "running" || legacyStatus === "spawning") && !isProcessAlive(saved.pid)) {
      return saved.freeform ? (saved.graceAt && now >= saved.graceAt ? "grace" : "done") : "done";
    }

    return legacyStatus as WorkerHandle["status"];
  }

  private deriveRestoredRouteState(
    saved: PersistedWorkerState,
    status: WorkerHandle["status"],
  ): WorkerHandle["routeState"] {
    if (status === "warning" || status === "failed" || status === "killed") return "dead";
    if (saved.freeform && (status === "done" || status === "grace")) return "resumable";
    if ((status === "running" || status === "spawning") && saved.meshClientId) return "linked";
    if (status === "running" || status === "spawning") return "pending";
    return "dead";
  }

  private rearmPersistentLifecycle(workerName: string, worker: WorkerHandle, now = Date.now()) {
    if (!worker.freeform || !worker.doneAt || !worker.graceAt || !worker.resumableUntilAt) return;

    const toGraceMs = Math.max(0, worker.graceAt - now);
    setTimeout(() => {
      const current = this.workers.get(workerName);
      if (!current || current.status !== "done") return;
      current.status = "grace";
      this.renderWidget();
      this.persistStateIfHydrated();
    }, toGraceMs);

    const toExpireMs = Math.max(0, worker.resumableUntilAt - now);
    setTimeout(() => {
      const current = this.workers.get(workerName);
      if (!current) return;
      if (current.freeform && current.resumableUntilAt && Date.now() >= current.resumableUntilAt) {
        // Silent cleanup — coordinator already got turn_finished and can see
        // the widget. A stale "completed" 2+ minutes later would just confuse it.
        this.workers.delete(workerName);
        this.meshDelivered.delete(workerName);
        this.childProcesses.delete(workerName);
        this.clearPendingAmbientChat(workerName);
        this.renderWidget();
        this.persistStateIfHydrated({ cleared: this.workers.size === 0 });
      }
    }, toExpireMs);
  }

  /** Restore worker state from the session JSONL after a reload. */
  restoreState(ctx: ExtensionContext) {
    try {
      const branch = ctx.sessionManager.getBranch();
      let lastState: LeaderStateSnapshot | null = null;
      for (let i = branch.length - 1; i >= 0; i--) {
        const entry = branch[i];
        if (entry.type === "custom" && entry.customType === TeamLeader.STATE_ENTRY_TYPE) {
          const data = entry.data;
          if (data && typeof data === "object") {
            lastState = data as LeaderStateSnapshot;
            break;
          }
        }
      }
      if (!lastState) {
        this.lastSavedStateSignature = null;
        this.stateHydrated = true;
        this.renderWidget();
        return;
      }

		this.workers.clear();
		this.childProcesses.clear();
		this.meshDelivered.clear();
		this.v2TeamId = lastState.v2TeamId ?? this.v2TeamId;

		if (lastState.meshChannelId && this.mesh) {
			this.meshChannelId = lastState.meshChannelId;
			this.mesh.joinChannel(this.meshChannelId);
			this._wireMeshChannelEvents();
		}
		if (lastState.v2TeamRecord?.teamId === this.v2TeamId) {
			this.v2TeamRecord = structuredClone(lastState.v2TeamRecord);
		} else if (this.v2TeamId) {
			this.v2TeamRecord = createTeamRecord(this.v2TeamId, this.leaderEpoch);
		}

		const now = Date.now();
      for (const [name, saved] of Object.entries(lastState.workers ?? {})) {
        const status = this.deriveRestoredStatus(saved, now);
        if (!status) continue;
        const routeState = this.deriveRestoredRouteState(saved, status);
        const restoredAttempts = saved.attempts?.length
          ? saved.attempts
          : [{
              workerInstanceId: saved.workerInstanceId ?? `${saved.name}:${saved.ticketId}:${saved.spawnedAt}`,
              pid: saved.pid,
              sessionDir: saved.sessionDir,
              sessionFile: saved.sessionFile,
              spawnedAt: saved.spawnedAt,
              sessionMode: saved.sessionMode,
            }];

        const handle: WorkerHandle = {
          workerInstanceId: saved.workerInstanceId ?? `${saved.name}:${saved.ticketId}:${saved.spawnedAt}`,
          name: saved.name,
          pid: saved.pid,
          ticketId: saved.ticketId,
          ticketStatus: saved.ticketStatus ?? (status === "done" || status === "grace" || status === "warning" || status === "failed" ? "closed" : "unknown"),
          lastNote: saved.lastNote,
          sessionDir: saved.sessionDir,
          sessionFile: saved.sessionFile,
          worktreePath: saved.worktreePath,
          model: saved.model,
          hasTools: saved.hasTools,
          status,
          spawnedAt: saved.spawnedAt,
          freeform: saved.freeform,
          nickname: saved.nickname,
          meshClientId: saved.meshClientId,
          routeState,
          lastActivityAt: saved.lastActivityAt ?? now,
          lastProcessActivityAt: now,
          lastOutputAt: saved.lastOutputAt,
          lastSeenCommentCount: saved.lastSeenCommentCount ?? 0,
          hasActiveChildProcess: false,
          activeChildProcessCount: 0,
          attempts: restoredAttempts,
          doneAt: saved.doneAt,
          graceAt: saved.graceAt,
          resumableUntilAt: saved.resumableUntilAt,
          killedAt: saved.killedAt,
        };
        this.workers.set(name, handle);
        if (!this.v2TeamRecord?.workers[name]) {
          this.upsertV2WorkerFromHandle(handle);
          this.seedV2FactsFromRestoredHandle(handle);
        } else {
          this.projectV2WorkerRuntime(name);
        }
        if (status === "running" || status === "spawning") this.startActivityMonitor(name, handle);
        if (status === "done" || status === "grace") this.rearmPersistentLifecycle(name, handle, now);
      }

      this.lastSavedStateSignature = this.buildStateSignature(this.buildPersistedWorkers());
      this.stateHydrated = true;
      this.renderWidget();
    } catch {
      this.lastSavedStateSignature = null;
      this.stateHydrated = true;
      this.renderWidget();
    }
  }

  private unwireMeshChannelEvents() {
    if (!this.mesh) return;
    if (this.meshChannelHandler) this.mesh.off("channel", this.meshChannelHandler);
    if (this.meshMessageHandler) this.mesh.off("message", this.meshMessageHandler);
    this.meshChannelHandler = undefined;
    this.meshMessageHandler = undefined;
  }

  /** Set the shared mesh instance from the pi-mesh extension. */
  setMesh(mesh: typeof this.mesh): void {
    if (this.mesh && this.mesh !== mesh) this.unwireMeshChannelEvents();
    this.mesh = mesh;
  }

  private ensureV2Team(): TeamRecord {
    if (!this.v2TeamId) {
      this.v2TeamId = `team-${crypto.randomUUID().slice(0, 8)}`;
    }    if (!this.v2TeamRecord || this.v2TeamRecord.teamId !== this.v2TeamId || this.v2TeamRecord.leaderEpoch !== this.leaderEpoch) {
      this.v2TeamRecord = createTeamRecord(this.v2TeamId, this.leaderEpoch);
    }
    return this.v2TeamRecord;
  }

  private upsertV2WorkerFromHandle(worker: WorkerHandle): void {
    const team = this.ensureV2Team();
    const latestAttempt = worker.attempts?.at(-1);
    this.v2TeamRecord = upsertV2Worker(team, {
      workerId: worker.name,
      name: worker.name,
      attemptId: latestAttempt?.workerInstanceId ?? worker.workerInstanceId,
      sessionMode: latestAttempt?.sessionMode ?? (latestAttempt?.sessionFile ? { kind: "resume", sessionFile: latestAttempt.sessionFile } : { kind: "fresh" }),
      sessionDir: latestAttempt?.sessionDir ?? worker.sessionDir,
      sessionFile: latestAttempt?.sessionFile ?? worker.sessionFile,
      pid: latestAttempt?.pid ?? worker.pid,
      startedAt: latestAttempt?.spawnedAt ?? worker.spawnedAt,
    });
    this.projectV2WorkerRuntime(worker.name);
  }

  private seedV2FactsFromRestoredHandle(worker: WorkerHandle): void {
    const latestAttempt = worker.attempts?.at(-1);
    const pid = latestAttempt?.pid ?? worker.pid;
    const restoredStatus = worker.status;
    this.appendV2Fact(worker.name, { type: "spawn_started", at: worker.spawnedAt, pid });

    switch (restoredStatus) {
      case "spawning":
        return;
      case "running":
        this.appendV2Fact(worker.name, { type: "worker_hello", at: worker.spawnedAt });
        return;
      case "done":
      case "grace":
        this.appendV2Fact(worker.name, { type: "worker_hello", at: worker.spawnedAt });
        this.appendV2Fact(worker.name, {
          type: "finish_done",
          at: worker.doneAt ?? Date.now(),
          summary: worker.lastNote ?? "restored done worker",
        });
        return;
      case "warning":
        this.appendV2Fact(worker.name, { type: "worker_hello", at: worker.spawnedAt });
        this.appendV2Fact(worker.name, {
          type: "finish_quit",
          at: worker.doneAt ?? Date.now(),
          summary: worker.lastNote ?? "restored warning worker",
        });
        return;
      case "failed":
      case "killed":
        this.appendV2Fact(worker.name, { type: "worker_hello", at: worker.spawnedAt });
        this.appendV2Fact(worker.name, {
          type: "process_exit",
          at: worker.killedAt ?? Date.now(),
          exitCode: worker.exitCode ?? 1,
        });
        return;
    }
  }

  private buildSpawnSessionMode(): import("./v2/protocol.ts").WorkerSessionMode {
    const preferFork = process.env.PI_TEAMS_PREFER_FORK === "1";
    if (!preferFork) return { kind: "fresh" };

    const sessionManager = this.ctx?.sessionManager as unknown as {
      getSessionFile?: () => string | undefined;
      getLeafId?: () => string | null;
      createBranchedSession?: (leafId: string) => string | undefined;
    } | undefined;
    const parentSessionFile = sessionManager?.getSessionFile?.();
    const leafId = sessionManager?.getLeafId?.();
    const sessionFile = leafId ? sessionManager?.createBranchedSession?.(leafId) : undefined;
    if (parentSessionFile && leafId && sessionFile) {
      try {
        const firstLine = fs.readFileSync(sessionFile, "utf-8").split("\n").find((line) => line.trim());
        if (firstLine) {
          const parsed = JSON.parse(firstLine) as { cwd?: unknown };
          if (typeof parsed.cwd === "string" && parsed.cwd.length > 0 && !fs.existsSync(parsed.cwd)) {
            return { kind: "fresh" };
          }
        }
      } catch {
        return { kind: "fresh" };
      }
      return {
        kind: "fork",
        parentSessionFile,
        parentLeafId: leafId,
        sessionFile,
      };
    }
    return { kind: "fresh" };
  }

  private appendV2Fact(workerName: string, fact: import("./v2/state.ts").WorkerFact): void {
    if (!this.v2TeamRecord) return;
    this.v2TeamRecord = applyV2Fact(this.v2TeamRecord, workerName, fact);
    this.projectV2WorkerRuntime(workerName);
  }

  private projectV2WorkerRuntime(workerName: string): void {
    const v2Worker = this.v2TeamRecord?.workers[workerName];
    const worker = this.workers.get(workerName);
    if (!v2Worker || !worker) return;

    switch (v2Worker.lifecycle) {
      case "created":
      case "spawning":
        worker.status = "spawning";
        if (worker.routeState === "dead") worker.routeState = "pending";
        break;
      case "running":
        worker.status = "running";
        if (worker.routeState === "dead") worker.routeState = worker.meshClientId ? "linked" : "pending";
        break;
      case "done":
        worker.status = "done";
        break;
      case "warning":
        worker.status = "warning";
        break;
      case "failed":
        worker.status = "failed";
        worker.routeState = "dead";
        break;
      case "orphaned":
        worker.status = worker.status === "failed" ? "failed" : "warning";
        worker.routeState = "dead";
        break;
      case "resumable":
        worker.status = "grace";
        worker.routeState = "resumable";
        break;
      case "finishing":
      case "killed":
        break;
    }
  }

  /** Get the mesh client ID (for passing to workers as coordinator ID). */
  getMeshClientId(): string {
    return this.mesh?.self()?.id ?? "";
  }

  private resolveWorkerSessionFile(worker: WorkerHandle): string | null {
    if (fs.existsSync(worker.sessionFile)) return worker.sessionFile;
    try {
      const files = fs.readdirSync(worker.sessionDir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => path.join(worker.sessionDir, f));
      if (files.length === 0) return null;
      const picked = files.length === 1
        ? files[0]
        : files
          .map((f) => ({ f, mtime: fs.statSync(f).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime)[0].f;
      worker.sessionFile = picked;
      return picked;
    } catch {
      return null;
    }
  }

  async viewWorker(name: string, start = -20, end = 0): Promise<{ text: string; source: "mesh" | "session-log"; routeState: WorkerHandle["routeState"] }> {
    const worker = this.workers.get(name);
    if (!worker) throw new Error(`Unknown worker \"${name}\"`);

    if (worker.routeState === "linked" && worker.meshClientId && this.mesh) {
      try {
        const reply = await this.mesh.ask(worker.meshClientId, { kind: "mesh:view", start, end }, 10_000) as Record<string, unknown>;
        if (reply?.error) throw new Error(String(reply.error));
        return {
          text: typeof reply?.text === "string" ? reply.text : JSON.stringify(reply),
          source: "mesh",
          routeState: worker.routeState,
        };
      } catch {
        // Fall through to session-log view.
      }
    }

    const sessionFile = this.resolveWorkerSessionFile(worker);
    if (!sessionFile) throw new Error(`Worker \"${name}\" has no readable session log`);
    const entries = readMeaningfulSessionEntriesFromFile(sessionFile);
    const windowed = sliceSessionViewEntries(entries, start, end);
    return {
      text: formatSessionViewEntries(windowed),
      source: "session-log",
      routeState: worker.routeState,
    };
  }

  /** Send a turn-triggering message to a specific worker by name.
   *  If the worker is in done/grace (persistent, between turns), resumes it via session continuation. */
  tellWorker(name: string, message: unknown): boolean {
    const worker = this.workers.get(name);
    if (!worker) return false;

    // Resumable persistent worker — continue the existing session with a new process.
    if (worker.routeState === "resumable" && worker.freeform) {
      const text = typeof message === "string" ? message : JSON.stringify(message);
      const env = this.buildWorkerResumeEnv(worker);

      const child = resumeWorker(worker, text, env);
      if (!child) return false;

      this.clearPendingAmbientChat(name);
      worker.routeState = "pending";
      worker.meshClientId = undefined;
      worker.doneAt = undefined;
      worker.graceAt = undefined;
      worker.resumableUntilAt = undefined;
      worker.killedAt = undefined;
      this.upsertV2WorkerFromHandle(worker);
      this.appendV2Fact(name, { type: "spawn_started", at: Date.now(), pid: child.pid ?? undefined });
      this.childProcesses.set(name, child);
      child.on("exit", (code) => {
        worker.exitCode = code;
        const attempt = getCurrentAttempt(worker);
        if (attempt) attempt.exitCode = code;
        void this.handleWorkerExit(name, worker, code);
      });
      child.on("error", (err) => {
        worker.exitCode = null;
        worker.spawnError = err.message;
        const attempt = getCurrentAttempt(worker);
        if (attempt) attempt.spawnError = err.message;
        void this.handleWorkerExit(name, worker, null);
      });
      this.startActivityMonitor(name, worker);
      this.renderWidget();
      this.persistStateIfHydrated();
      return true;
    }

    // Running worker — send via mesh
    if (worker.routeState !== "linked" || !worker.meshClientId || !this.mesh) return false;
    this.mesh.tell(worker.meshClientId, message);
    return true;
  }

  /** Send a turn-triggering message to all running workers. */
  tellAllWorkers(message: unknown): number {
    let count = 0;
    for (const [name] of this.workers) {
      if (this.tellWorker(name, message)) count++;
    }
    return count;
  }

  private clearPendingAmbientChat(workerName: string) {
    this.pendingAmbientChat.delete(workerName);
    const timer = this.pendingAmbientTimers.get(workerName);
    if (timer) clearTimeout(timer);
    this.pendingAmbientTimers.delete(workerName);
  }

  private buildWorkerResumeEnv(worker: WorkerHandle): Record<string, string> {
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      PI_TEAMS_WORKER: "1",
      PI_TEAMS_WORKER_INSTANCE_ID: worker.workerInstanceId,
      PI_TEAMS_TICKET_ID: worker.ticketId,
      PI_TEAMS_WORKER_NAME: worker.name,
    };

    if (worker.freeform) env.PI_TEAMS_FREEFORM = "1";
    else delete env.PI_TEAMS_FREEFORM;

    if (worker.hasTools) env.PI_TEAMS_HAS_TOOLS = "1";
    else delete env.PI_TEAMS_HAS_TOOLS;
    if (this.meshChannelId) env.PI_TEAMS_CHANNEL_ID = this.meshChannelId;
    if (this.leaseFilePath) env.PI_TEAMS_LEASE_FILE = this.leaseFilePath;

    const meshId = this.getMeshClientId();
    if (meshId) env.PI_TEAMS_COORDINATOR_ID = meshId;
    if (this.ctx) env.PI_TEAMS_LEADER_SESSION = this.ctx.sessionManager.getSessionFile() ?? "";

    return env;
  }

  private queueAmbientChatForResumableWorkers(fromWorkerName: string, message: string) {
    for (const [name, worker] of this.workers) {
      if (name === fromWorkerName) continue;
      if (!worker.freeform) continue;
      if (worker.routeState !== "resumable") continue;

      const queued = this.pendingAmbientChat.get(name) ?? [];
      queued.push(`${fromWorkerName}: ${message}`);
      this.pendingAmbientChat.set(name, queued);

      const existingTimer = this.pendingAmbientTimers.get(name);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        this.pendingAmbientTimers.delete(name);
        const current = this.workers.get(name);
        const batch = this.pendingAmbientChat.get(name) ?? [];
        this.pendingAmbientChat.delete(name);
        if (!current || batch.length === 0) return;
        if (!current.freeform) return;
        if (current.routeState !== "resumable") return;
        const blob = [
          "Ambient team chat arrived while you were idle.",
          "This is background team context, not necessarily a direct request.",
          "Read it and decide whether to act, reply, or ignore it.",
          "",
          ...batch.map((line, idx) => `${idx + 1}. ${line}`),
        ].join("\n");

        void this.tellWorker(name, blob);
      }, AMBIENT_CHAT_BATCH_MS);

      this.pendingAmbientTimers.set(name, timer);
    }
  }

  setContext(ctx: ExtensionContext) {
    this.ctx = ctx;
    this.startLeaseHeartbeat();
  }

  // Keep these for backward compat with tool.ts
  startPolling() {}

  stopPolling() {
    if (this.batchTimer) { clearInterval(this.batchTimer); this.batchTimer = null; }
    this.monitoredWorkers.clear();
    this.stopLeaseHeartbeat();
    this.unwireMeshChannelEvents();
  }

  private linkWorkerRoute(worker: WorkerHandle, meshClientId: string, nickname?: string) {
    const changed = worker.meshClientId !== meshClientId || worker.routeState !== "linked" || (nickname !== undefined && worker.nickname !== nickname);
    worker.meshClientId = meshClientId;
    worker.routeState = "linked";
    if (nickname) worker.nickname = nickname;
    if (changed) this.persistStateIfHydrated();
  }

  /** Wire mesh channel events into the existing notification pipeline. */
	private _wireMeshChannelEvents() {
		if (!this.mesh) return;
		if (this.meshChannelHandler || this.meshMessageHandler) return;
		this.meshChannelHandler = (msg: { from: string; channel: string; payload: unknown; timestamp: number }) => {
			if (!isWorkerToLeaderEnvelope(msg.payload)) return;
			const envelope = msg.payload;
			const p = envelope.payload as Record<string, unknown> | undefined;
			if (!p || typeof p !== "object") return;
			const workerName = envelope.workerId ?? "unknown";
			const workerInstanceId = envelope.attemptId ?? "";
			const ticketId = typeof p.ticketId === "string" ? p.ticketId : "";
			const worker = this.workers.get(workerName);
			if (!worker) return;
			if (workerInstanceId && workerInstanceId !== worker.workerInstanceId) return;
			if (ticketId && ticketId !== worker.ticketId) return; // ignore late events from an older batch reusing the same worker name

			// Resolve sender nickname from mesh peer list
			let peerNickname: string | undefined;
			if (!worker.nickname && this.mesh) {
				const peer = this.mesh.peers().find((pr) => pr.id === msg.from || pr.sessionId === msg.from);
				if (peer?.nickname) peerNickname = peer.nickname;
      }

			if (envelope.type === "worker.comment" && typeof (p as WorkerCommentPayload).text === "string") {
				const commentText = (p as WorkerCommentPayload).text;
        this.appendV2Fact(workerName, { type: "comment_posted", at: Date.now(), text: commentText });
        // Any worker channel activity tells us its current direct mesh route.
        this.linkWorkerRoute(worker, msg.from, peerNickname);
        // Instant progress — feed into existing notification pipeline
        worker.lastOutputAt = Date.now();
        worker.lastOutputLabel = "mesh comment";
        // Track for dedup against polling (capped to last 50 per worker)
        if (!this.meshDelivered.has(workerName)) this.meshDelivered.set(workerName, new Set());
        const seen = this.meshDelivered.get(workerName)!;
        seen.add(commentText);
        if (seen.size > 50) {
          const first = seen.values().next().value;
          if (first !== undefined) seen.delete(first);
        }
        this.notifyLLM({ type: "comment", worker: { ...worker }, comment: commentText });
        this.queueAmbientChatForResumableWorkers(workerName, commentText);
				this.renderWidget();
	      } else if (envelope.type === "worker.hello") {
        this.appendV2Fact(workerName, { type: "worker_hello", at: Date.now() });
        worker.lastActivityAt = Date.now();
        this.linkWorkerRoute(worker, msg.from, peerNickname);
        this.renderWidget();
      }
    };
		this.mesh.on("channel", this.meshChannelHandler);

    // Direct tells from workers (completion/failure) — these trigger a turn
		this.meshMessageHandler = (msg: { from: string; payload: unknown }) => {
			if (!isWorkerToLeaderEnvelope(msg.payload)) return;
			const envelope = msg.payload;
			const p = envelope.payload as Record<string, unknown> | undefined;
			if (!p || typeof p !== "object") return;
			const workerName = envelope.workerId ?? "unknown";
			const workerInstanceId = envelope.attemptId ?? "";
			const ticketId = typeof p.ticketId === "string" ? p.ticketId : "";
			const worker = this.workers.get(workerName);
			if (!worker) return;
			if (workerInstanceId && workerInstanceId !== worker.workerInstanceId) return;
			if (ticketId && ticketId !== worker.ticketId) return; // ignore stale direct messages from an older batch

			this.linkWorkerRoute(worker, msg.from);
			if (envelope.type === "worker.finish" && (p as WorkerFinishPayload).status === "done") {
        this.appendV2Fact(workerName, { type: "finish_done", at: Date.now(), summary: (p as WorkerFinishPayload).summary });
        worker.lastOutputAt = Date.now();
        worker.lastOutputLabel = "mesh done";
        // Don't emit completion here — process exit handler is authoritative.
        // But update the widget immediately.
        this.renderWidget();
      } else if (envelope.type === "worker.finish" && (p as WorkerFinishPayload).status === "quit") {
        this.appendV2Fact(workerName, { type: "finish_quit", at: Date.now(), summary: (p as WorkerFinishPayload).summary });
        worker.lastOutputAt = Date.now();
        worker.lastOutputLabel = "mesh quit";
        this.renderWidget();
      }
    };
		this.mesh.on("message", this.meshMessageHandler);
  }

  async delegate(
    ticketId: string,
    workerName: string,
    useWorktree: boolean,
    model?: string,
    hasTools?: boolean,
    additionalPrompt?: string,
    freeform?: boolean,
    baseRef?: string,
    ticketText?: string,
  ): Promise<WorkerHandle> {
    if (!this.ctx) throw new Error("Leader context not set");

    const existing = this.workers.get(workerName);
    if (existing && !["done", "warning", "failed", "killed", "grace"].includes(existing.status)) {
      throw new Error(`Worker name \"${workerName}\" is already active on ticket #${existing.ticketId}`);
    }

    const isNestedWorker = process.env.PI_TEAMS_WORKER === "1";

    // Worker-leaders must not create worktrees — sub-workers share the parent's working directory.
    // Creating nested worktrees off a worktree causes git confusion and cleanup headaches.
    if (isNestedWorker && useWorktree) {
      useWorktree = false;
    }

    const repoDir = this.ctx.cwd;
    let cwd = repoDir;

    if (useWorktree) {
      // Resolve the real repo root so worker worktrees are never nested inside
      // another worktree. If ctx.cwd is already the repo root this is a no-op.
      const toplevel = await resolveGitToplevel(repoDir);
      const wtPath = workerWorktreePath(toplevel, workerName);
      const result = await createWorktree(toplevel, workerName, ticketId, wtPath, baseRef);
      if (!result.success) throw new Error(`Worktree creation failed: ${result.error}`);
      cwd = wtPath;
    }

    // Resolve effective model: verify requested model is available, fall back to leader's
    const effectiveModel = this.resolveWorkerModel(model);
    const workerInstanceId = crypto.randomUUID();

    const sessionFile = this.ctx.sessionManager.getSessionFile() ?? "";

    // Ensure a mesh channel exists for this delegation batch
    if (!this.meshChannelId && this.mesh) {
      if (!this.v2TeamId) this.v2TeamId = `team-${crypto.randomUUID().slice(0, 8)}`;
      this.meshChannelId = buildTeamChannelId(this.v2TeamId);
      this.mesh.joinChannel(this.meshChannelId);
      this._wireMeshChannelEvents();
    }

    const config: SpawnConfig = {
      workerInstanceId,
      ticketId,
      workerName,
      useWorktree,
      cwd,
      repoRoot: repoDir,
      leaderSessionFile: sessionFile,
      model: effectiveModel,
      hasTools,
      additionalPrompt,
      channelId: this.meshChannelId ?? undefined,
      teamId: this.v2TeamId ?? ticketId,
      leaderEpoch: this.leaderEpoch,
      coordinatorMeshId: this.getMeshClientId() || undefined,
      ticketCwd: this.ctx.cwd,
      ticketText,
      freeform,
      sessionMode: this.buildSpawnSessionMode(),
    };

    const { process: child, handle } = spawnWorker(config);
    this.upsertV2WorkerFromHandle(handle);
    this.appendV2Fact(workerName, { type: "spawn_requested", at: Date.now() });
    this.appendV2Fact(workerName, { type: "spawn_started", at: Date.now(), pid: handle.pid });
    if (freeform) handle.freeform = true;
    handle.spawnConfig = config;
    this.workers.set(workerName, handle);
    this.childProcesses.set(workerName, child);

    // Process exit — the definitive completion signal
    child.on("exit", (code) => {
      handle.exitCode = code;
      const attempt = getCurrentAttempt(handle);
      if (attempt) attempt.exitCode = code;
      void this.handleWorkerExit(workerName, handle, code);
    });

    // Spawn failure — if the OS can't create the process at all (EMFILE, EAGAIN, etc.)
    // the "error" event fires and "exit" may never come.
    child.on("error", (err) => {
      handle.exitCode = null;
      handle.spawnError = err.message;
      const attempt = getCurrentAttempt(handle);
      if (attempt) attempt.spawnError = err.message;
      void this.handleWorkerExit(workerName, handle, null);
    });

    // Activity + stuck detection
    this.startActivityMonitor(workerName, handle);

    this.renderWidget();
    this.persistStateIfHydrated();
    return handle;
  }

  private async handleTicketChange(worker: WorkerHandle) {
    if (!this.ctx) return;
    if (["done", "warning", "failed", "killed", "grace"].includes(worker.status) || isTerminalV2Lifecycle(this.getV2WorkerLifecycle(worker.name))) return;

    try {
      const maiResult = await this.pi.exec("mai", ["--json", "show", worker.ticketId], {
        cwd: this.ctx.cwd,
        timeout: 5000,
      });
      const ticket = parseMaiShow(maiResult.stdout ?? "");

      worker.ticketStatus = ticket.status;
      worker.lastNote = ticket.notes.at(-1)?.text;

      // Re-check after async gap — worker may have exited while we were reading the ticket
      if (["done", "warning", "failed", "killed"].includes(worker.status) || isTerminalV2Lifecycle(this.getV2WorkerLifecycle(worker.name))) return;

      // Emit new comments (skip any already delivered via mesh)
      const newNotes = getNewNotes(ticket.notes, worker.lastSeenCommentCount);
      const meshSeen = this.meshDelivered.get(worker.name);
      for (const note of newNotes) {        if (meshSeen?.has(note.text)) continue; // already delivered via mesh
        this.notifyLLM({
          type: "comment",
          worker: { ...worker },
          comment: note.text,
        });
      }
      if (newNotes.length > 0) {
        const now = Date.now();
        worker.lastSeenCommentCount = ticket.notes.length;
        worker.lastActivityAt = now;
        worker.lastOutputAt = now;
        worker.lastOutputLabel = "ticket note";
      }

      this.renderWidget();
    } catch {
      // ticket read failed — ignore, process exit will handle it
    }
  }

  private async handleWorkerExit(name: string, worker: WorkerHandle, exitCode: number | null) {
    if (!this.ctx) return;
    if (!this.workers.has(name)) {
      this.workers.set(name, worker);
    }
    if (["done", "warning", "failed", "killed", "grace"].includes(worker.status) || isTerminalV2Lifecycle(this.getV2WorkerLifecycle(name))) return;

    // Bun bug: fires child.on("exit") prematurely for workers 2+ in rapid spawns.
    // The process is actually still alive and running. If we detect it's alive,
    // bail out — the REAL exit event will fire when the process truly exits.
    if (isProcessAlive(worker.pid)) {
      // Schedule a re-check — when the real exit fires, process will be dead
      return;
    }

    if (!this.v2TeamRecord?.workers[name]) {
      this.upsertV2WorkerFromHandle(worker);
    }

    // Stop watching FIRST — before any async work — to prevent race with handleTicketChange
    this.unwatchWorker(name);

    this.appendV2Fact(name, { type: "process_exit", at: Date.now(), exitCode });

    // Read ticket to get final state
    let lastNote = "(no notes left by worker)";
    let ticketClosed = false;
    try {
      const maiExitResult = await this.pi.exec("mai", ["--json", "show", worker.ticketId], {
        cwd: this.ctx.cwd,
        timeout: 5000,
      });
      const ticket = parseMaiShow(maiExitResult.stdout ?? "");
      ticketClosed = ticket.status === "closed" || ticket.status === "done";
      lastNote = ticket.notes.at(-1)?.text ?? lastNote;
    } catch {
      // mai read failed — proceed with what we have
    }

    const assessment = assessWorkerExit(worker, exitCode, ticketClosed, lastNote);
    const classification = assessment.classification;
    const isSuccess = classification === "success" || classification === "turn_finished";
    if (assessment.reason) {
      lastNote = assessment.reason;
    }

    const diagnostics = classification === "failed" ? readSessionDiagnostics(worker.sessionDir) : "";

    if (classification === "failed" && (worker.recoveryAttempts ?? 0) < 1) {
      const recovery = getRecoverableToolRetry(diagnostics);
      if (recovery) {
        const child = resumeWorker(worker, recovery.prompt, this.buildWorkerResumeEnv(worker));
        if (child) {
          worker.recoveryAttempts = (worker.recoveryAttempts ?? 0) + 1;
          worker.routeState = "pending";
          worker.meshClientId = undefined;
          worker.lastActivityAt = Date.now();
          worker.lastProcessActivityAt = Date.now();
          worker.lastNote = `AUTO-RETRY: ${recovery.error.slice(0, 120)}`;
          this.upsertV2WorkerFromHandle(worker);
          this.appendV2Fact(name, { type: "spawn_started", at: Date.now(), pid: child.pid ?? undefined });

          await this.pi.exec(
            "mai",
            [
              "add-note",
              worker.ticketId,
              `AUTO-RETRY: previous turn failed before tool execution due to malformed JSON tool arguments (${recovery.error}). Retrying once with escape guidance.`,
            ],
            { cwd: this.ctx.cwd, timeout: 5000 },
          ).catch(() => {});

          this.childProcesses.set(name, child);
          child.on("exit", (code) => {
            worker.exitCode = code;
            const attempt = getCurrentAttempt(worker);
            if (attempt) attempt.exitCode = code;
            void this.handleWorkerExit(name, worker, code);
          });
          child.on("error", (err) => {
            worker.exitCode = null;
            worker.spawnError = err.message;
            const attempt = getCurrentAttempt(worker);
            if (attempt) attempt.spawnError = err.message;
            void this.handleWorkerExit(name, worker, null);
          });

          this.startActivityMonitor(name, worker);
          this.renderWidget();
          this.pi.sendMessage(
            {
              customType: "team-event",
              content: `${ICONS.warn} ${workerTag(worker)}:\nauto-retrying once after malformed tool JSON: ${recovery.error}`,
              display: true,
            },
            { deliverAs: "followUp", triggerTurn: false },
          );
          return;
        }
      }
    }

    // ── No-session respawn ───────────────────────────────────────────
    // If the worker exited without ever creating a session file, it never
    // reached Pi's init. Two common causes:
    //   1. Startup death (within a 5s startup window) — env/module/auth issue.
    //   2. Session directory destroyed externally — another worker's cleanup
    //      or a manual worktree prune deleted the directory while the worker
    //      was still alive.
    // In both cases, resumeWorker can't work (no session to continue).
    // We respawn from the original SpawnConfig once.
    if (classification === "failed" && (worker.recoveryAttempts ?? 0) < 1) {
      const runtimeMs = Date.now() - worker.spawnedAt;
      const STARTUP_WINDOW_MS = 5000;

      let sessionDirGone = false;
      let noSessionFile = false;
      try {
        const jsonls = fs.readdirSync(worker.sessionDir).filter(f => f.endsWith(".jsonl"));
        noSessionFile = jsonls.length === 0;
      } catch {
        // readdirSync threw — directory doesn't exist or isn't readable
        sessionDirGone = true;
        noSessionFile = true;
      }

      // Session files can land slightly after the child exit/error is observed.
      // Re-check briefly before declaring startup death and overwriting the worker
      // handle with a fresh respawn, otherwise we lose the real diagnostics and can
      // end up with false "NO FILE CREATED" crash reports.
      if (noSessionFile && !sessionDirGone) {
        const appeared = await settleSessionFile(worker.sessionDir, 1500);
        if (appeared) {
          noSessionFile = false;
        }
      }

      // Respawn if: no session file AND (startup-window death OR session dir was destroyed)
      if (noSessionFile && worker.spawnConfig && (runtimeMs < STARTUP_WINDOW_MS || sessionDirGone)) {
        // Fresh respawn with a new session dir
        const config = { ...worker.spawnConfig, workerInstanceId: crypto.randomUUID() };
        const { process: child, handle: newHandle } = spawnWorker(config);

        // Carry over state from the old handle
        worker.recoveryAttempts = (worker.recoveryAttempts ?? 0) + 1;
        worker.workerInstanceId = newHandle.workerInstanceId;
        worker.pid = newHandle.pid;
        worker.sessionDir = newHandle.sessionDir;
        worker.sessionFile = newHandle.sessionFile;
        worker.attempts = worker.attempts ?? [];
        if (newHandle.attempts?.[0]) worker.attempts.push(newHandle.attempts[0]);
        worker.status = "spawning";
        worker.routeState = "pending";
        worker.meshClientId = undefined;
        worker.spawnedAt = Date.now();
        worker.lastActivityAt = Date.now();
        worker.lastProcessActivityAt = Date.now();
        const reason = sessionDirGone
          ? `session directory was destroyed externally after ${(runtimeMs / 1000).toFixed(1)}s`
          : `process exited during the startup window (<${(STARTUP_WINDOW_MS / 1000).toFixed(0)}s) before creating a session file`;
        worker.lastNote = `AUTO-RESPAWN: ${reason}, retrying once`;
        worker.spawnConfig = config;
        this.upsertV2WorkerFromHandle(worker);
        this.appendV2Fact(name, { type: "spawn_started", at: Date.now(), pid: child.pid ?? undefined });

        await this.pi.exec(
          "mai",
          ["add-note", worker.ticketId, `AUTO-RESPAWN: ${reason}. Respawning once.`],
          { cwd: this.ctx.cwd, timeout: 5000 },
        ).catch(() => {});

        this.childProcesses.set(name, child);
        child.on("exit", (code) => {
          worker.exitCode = code;
          const attempt = getCurrentAttempt(worker);
          if (attempt) attempt.exitCode = code;
          void this.handleWorkerExit(name, worker, code);
        });
        child.on("error", (err) => {
          worker.exitCode = null;
          worker.spawnError = err.message;
          const attempt = getCurrentAttempt(worker);
          if (attempt) attempt.spawnError = err.message;
          void this.handleWorkerExit(name, worker, null);
        });

        this.startActivityMonitor(name, worker);
        this.renderWidget();
        this.pi.sendMessage(
          {
            customType: "team-event",
            content: `${ICONS.warn} ${workerTag(worker)}:\nauto-respawning once — ${reason}`,
            display: true,
          },
          { deliverAs: "followUp", triggerTurn: false },
        );
        return;
      }
    }

    this.appendV2Fact(name, { type: "exit_assessed", at: Date.now(), outcome: classification === "failure" ? "failed" : classification, reason: lastNote });
    worker.ticketStatus = ticketClosed ? "closed" : worker.ticketStatus;
    worker.lastNote = lastNote;
    worker.lastActivityAt = Date.now();

    // Persistent/freeform workers: a plain turn end becomes resumable idle.
    // Explicit team_finish still counts as terminal success/warning/failure.
    if (worker.freeform && classification === "turn_finished") {
      const now = Date.now();
      worker.doneAt = now;
      worker.graceAt = now + DONE_GRACE_MS;
      worker.resumableUntilAt = worker.graceAt + RESUMABLE_WINDOW_MS;
      this.projectV2WorkerRuntime(name);
      this.childProcesses.delete(name);
      this.notifyLLM({ type: "turn_finished", worker: { ...worker }, result: lastNote });
      this.renderWidget();
      this.persistStateIfHydrated();
      this.rearmPersistentLifecycle(name, worker, now);
      return;
    }

    // Build crash report BEFORE cleanup — cleanup deletes the session directory
    const crashReport = classification === "failed" ? buildWorkerCrashReport(worker, exitCode) : "";
    this.projectV2WorkerRuntime(name);
    worker.routeState = "dead";
    worker.meshClientId = undefined;

    // Cleanup: auto-commit dirty files, remove worktree, rename branch to .done
    const preserveBranch = (classification === "success" || classification === "warning") && worker.worktreePath !== null;
    const cleanupResult = await cleanupWorker(this.ctx.cwd, worker, preserveBranch).catch(() => undefined);

    if (classification === "success") {
      const branch = `teams/${worker.name}/${worker.ticketId}`;
      const doneBranch = `${branch}.done`;
      const hasBranch = cleanupResult?.branchPreserved;
      const mergeHint = hasBranch
        ? `\n📌 Branch "${doneBranch}" preserved — merge when ready: git merge ${doneBranch}`
        : "";
      this.notifyLLM({
        type: "completed",
        worker: { ...worker },        result: `${lastNote}${mergeHint}`,
      });
    } else if (classification === "warning") {
      this.notifyLLM({
        type: "warning",
        worker: { ...worker },
        reason: lastNote,
      });
    } else {
      // If the worker left no ticket notes, put a short diagnostic in lastNote
      // so the widget shows something useful instead of "(no notes left by worker)"
      if (lastNote === "(no notes left by worker)" && diagnostics) {
        // Extract just the error line for the widget (keep it short)
        const errorMatch = diagnostics.match(/error: (.+?)(?:\n|$)/);
        const assistantMatch = diagnostics.match(/last assistant: (.+?)(?:\n|$)/);
        worker.lastNote = errorMatch?.[1]?.slice(0, 120) ?? assistantMatch?.[1]?.slice(0, 120) ?? lastNote;
      }
      this.notifyLLM({
        type: "failed",
        worker: { ...worker },
        reason: crashReport,
      });
    }
    this.childProcesses.delete(name);

    // Schedule removal of this terminal worker from the widget after a delay.
    // Scope cleanup to this exact worker instance so old timers can't delete a
    // newer worker that reused the same name.
    this.scheduleWorkerCleanup(name, worker.ticketId, worker.spawnedAt);
    this.renderWidget();
    this.persistStateIfHydrated();
  }

  // ── Batched activity monitor ───────────────────────────────────────────
  // Instead of one setInterval per worker (each spawning its own `ps -ax`),
  // a single timer iterates all monitored workers.  The async process-table
  // cache in activity.ts means they all share one subprocess call per cycle.
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private monitoredWorkers = new Set<string>();

  private startActivityMonitor(name: string, _worker: WorkerHandle) {
    this.monitoredWorkers.add(name);
    // Kick off the shared timer if it's not running yet
    if (!this.batchTimer) {
      this.batchTimer = setInterval(() => void this.runActivityBatch(), ACTIVITY_POLL_INTERVAL_MS);
    }
    // Immediate first tick for this worker
    const w = this.workers.get(name);
    if (w) void this.refreshWorkerActivity(name, w);
  }

  private stopActivityMonitor(name: string) {
    this.monitoredWorkers.delete(name);
    // Tear down the shared timer when no workers remain
    if (this.monitoredWorkers.size === 0 && this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private async runActivityBatch() {
    for (const name of this.monitoredWorkers) {
      const worker = this.workers.get(name);
      if (!worker) { this.monitoredWorkers.delete(name); continue; }
      await this.refreshWorkerActivity(name, worker);
    }
  }

  private refreshSessionActivity(worker: WorkerHandle) {
    // Resolve the actual session file on first call — pi names files
    // as `${timestamp}_${sessionId}.jsonl`, not the hardcoded `session.jsonl`
    // from spawner.ts.
    if (!fs.existsSync(worker.sessionFile)) {
      try {
        const files = fs.readdirSync(worker.sessionDir)
          .filter(f => f.endsWith(".jsonl"))
          .map(f => path.join(worker.sessionDir, f));
        if (files.length === 1) {
          worker.sessionFile = files[0];
        } else if (files.length > 1) {
          // Pick the most recently modified one
          const sorted = files
            .map(f => ({ f, mtime: fs.statSync(f).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
          worker.sessionFile = sorted[0].f;
        } else {
          return; // no session file yet
        }
      } catch {
        return; // session dir may not exist yet
      }
    }

    try {
      const stat = fs.statSync(worker.sessionFile);
      const mtimeMs = stat.mtimeMs;
      if (!Number.isFinite(mtimeMs)) return;
      // File hasn't changed since last check — skip the read
      if (worker.lastSessionMtimeMs && mtimeMs <= worker.lastSessionMtimeMs) return;
      worker.lastSessionMtimeMs = mtimeMs;

      // Always update lastActivityAt from file mtime (includes heartbeats — good for stuck detection)
      worker.lastActivityAt = Math.max(worker.lastActivityAt, mtimeMs);

      // For lastOutputAt, find the last real agent activity (message/tool use),
      // ignoring heartbeat entries that fire every 5s and make workers look perpetually active.
      const lastReal = findLastRealActivity(worker.sessionFile);
      if (lastReal) {
        if (lastReal.timestampMs > (worker.lastOutputAt ?? 0)) {
          worker.lastOutputAt = lastReal.timestampMs;
          worker.lastOutputLabel = lastReal.label;
        }
      }
    } catch {
      // Session file may not exist yet.
    }
  }

  private async refreshWorkerActivity(name: string, worker: WorkerHandle) {
    if (["done", "warning", "failed", "killed", "grace"].includes(worker.status) || isTerminalV2Lifecycle(this.getV2WorkerLifecycle(name))) {
      this.stopActivityMonitor(name);
      return;
    }

    const now = Date.now();
    this.refreshSessionActivity(worker);
    void this.handleTicketChange(worker);

    const snapshot = await sampleWorkerProcessSnapshotAsync(worker.pid);
    if (!snapshot.rootAlive) {
      if ((worker.status === "running" || worker.status === "spawning") && !isTerminalV2Lifecycle(this.getV2WorkerLifecycle(name))) {
        void this.handleWorkerExit(name, worker, worker.exitCode ?? 0);
      }
      return;
    }

    worker.hasActiveChildProcess = snapshot.hasActiveChildProcess;
    worker.activeChildProcessCount = snapshot.activeChildProcessCount;
    worker.currentCommand = snapshot.currentCommand;
    worker.currentCommandElapsedSeconds = snapshot.currentCommandElapsedSeconds;

    if (snapshot.hasActiveChildProcess) {
      worker.lastProcessActivityAt = now;
    }

    const idle = evaluateIdleState({
      now,
      thresholdMs: STUCK_THRESHOLD_MS,
      hasActiveChildProcess: snapshot.hasActiveChildProcess,
      lastHeartbeatAt: worker.lastActivityAt,
      lastProcessActivityAt: worker.lastProcessActivityAt,
    });

    if (idle.shouldWarnStuck) {
      const cooldownExpired =
        !worker.lastStuckWarningAt || now - worker.lastStuckWarningAt >= STUCK_WARNING_COOLDOWN_MS;
      if (cooldownExpired) {
        worker.lastStuckWarningAt = now;
        this.notifyLLM({
          type: "stuck",
          worker: { ...worker },
          idleSeconds: Math.floor(Math.min(idle.heartbeatIdleMs, idle.processIdleMs) / 1000),
        });
      }
    } else {
      worker.lastStuckWarningAt = undefined;
    }

    this.renderWidget();
  }

  private unwatchWorker(name: string) {
    this.stopActivityMonitor(name);
  }

  async waitForAllWorkersToFinish(pollMs = 250): Promise<void> {
    while ([...this.workers.values()].some((w) => !["done", "warning", "failed", "killed", "grace"].includes(w.status) && !isTerminalV2Lifecycle(this.getV2WorkerLifecycle(w.name)))) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  async kill(workerName: string): Promise<void> {
    const worker = this.workers.get(workerName);
    if (!worker) return;
    this.appendV2Fact(workerName, { type: "worker_killed", at: Date.now() });
    worker.status = "killed";
    worker.routeState = "dead";
    worker.meshClientId = undefined;
    worker.killedAt = Date.now();
    this.unwatchWorker(workerName);
    if (this.ctx) {
      await this.pi.exec("mai", ["close", worker.ticketId], { cwd: this.ctx.cwd, timeout: 5000 }).catch(() => {});
      await cleanupWorker(this.ctx.cwd, worker, true /* always preserve branch on kill */);
    }
    this.workers.delete(workerName);
    this.childProcesses.delete(workerName);
    this.meshDelivered.delete(workerName);
    this.clearPendingAmbientChat(workerName);
    this.renderWidget();
    this.persistStateIfHydrated({ cleared: this.workers.size === 0 });
  }

  async killAll(): Promise<void> {
    for (const name of [...this.workers.keys()]) {
      await this.kill(name);
    }
    this.renderWidget();
  }

  getWorkers(): WorkerHandle[] {
    this.pruneStaleRecoveredWorkers();
    return [...this.workers.values()];
  }

  getV2TeamRecord(): TeamRecord | null {
    return this.v2TeamRecord ? structuredClone(this.v2TeamRecord) : null;
  }

  getV2WorkerLifecycle(workerName: string): import("./v2/state.ts").WorkerLifecycleState | null {
    return this.v2TeamRecord?.workers[workerName]?.lifecycle ?? null;
  }

  getV2CurrentSessionMode(workerName: string): import("./v2/protocol.ts").WorkerSessionMode | null {
    const worker = this.v2TeamRecord?.workers[workerName];
    if (!worker?.currentAttemptId) return null;
    return worker.attempts.find((attempt) => attempt.attemptId === worker.currentAttemptId)?.sessionMode ?? null;
  }

  getWorker(name: string): WorkerHandle | undefined {
    this.pruneStaleRecoveredWorkers();
    return this.workers.get(name);
  }

  private pruneStaleRecoveredWorkers() {
    const now = Date.now();
    for (const [name, worker] of this.workers) {
      if (worker.status !== "spawning" && worker.status !== "running") continue;
      if (isProcessAlive(worker.pid)) continue;
      if (now - worker.spawnedAt < TeamLeader.STALE_RESTORE_PRUNE_MS) continue;

      let hasMeaningfulSession = false;
      try {
        const sessionFile = this.resolveWorkerSessionFile(worker);
        if (sessionFile && fs.existsSync(sessionFile) && fs.statSync(sessionFile).size > 0) {
          hasMeaningfulSession = true;
        }
      } catch {}
      if (hasMeaningfulSession) continue;

      worker.status = "failed";
      worker.routeState = "dead";
      worker.meshClientId = undefined;
      worker.lastNote = worker.lastNote ?? "stale recovered worker pruned after reload";
    }
  }

  private scheduleWorkerCleanup(workerName: string, expectedTicketId: string, expectedSpawnedAt: number) {
    setTimeout(() => {
      const w = this.workers.get(workerName);
      if (!w) return;
      if (w.ticketId !== expectedTicketId) return;
      if (w.spawnedAt !== expectedSpawnedAt) return;
      if (["done", "warning", "failed", "killed"].includes(w.status)) {
        this.workers.delete(workerName);
        this.meshDelivered.delete(workerName);
        this.childProcesses.delete(workerName);
        this.clearPendingAmbientChat(workerName);
        this.renderWidget();
        this.persistStateIfHydrated({ cleared: this.workers.size === 0 });
      }
    }, 180_000);
  }

  /**
   * Resolve the effective model for a worker.
   * If the requested model is available, use it. Otherwise fall back to the leader's current model.
   * If neither is set, returns undefined (worker inherits pi's default).
   */
  /**
   * Resolve and validate the model for a worker.
   * Throws if the model (or its provider) has no auth — prevents spawning workers
   * that will immediately die on the first API call.
   */
  private resolveWorkerModel(requested?: string): string | undefined {
    if (!requested || !this.ctx) return requested;
    const available = this.ctx.modelRegistry.getAvailable();
    const needle = requested.toLowerCase();
    const found = available.some(m =>
      `${m.provider}/${m.id}`.toLowerCase() === needle || m.id.toLowerCase() === needle,
    );

    if (found) return requested;

    // Check if it's a provider auth issue vs unknown model
    const allModels = this.ctx.modelRegistry.getAll?.() ?? [];
    const modelExists = allModels.length > 0
      ? allModels.some((m: any) => `${m.provider}/${m.id}`.toLowerCase() === needle || m.id.toLowerCase() === needle)
      : false;

    if (modelExists) {
      const provider = requested.split("/")[0];
      const availableProviders = [...new Set(available.map(m => m.provider))].join(", ");
      throw new Error(
        `No auth for model "${requested}" (provider "${provider}" has no API key). ` +
        `Authed providers: ${availableProviders || "none"}. ` +
        `Use a model from an authed provider or add credentials for "${provider}".`
      );
    }

    // Model doesn't exist at all — fall back to leader's model
    const leader = this.ctx.model;
    const fallback = leader ? `${leader.provider}/${leader.id}` : undefined;

    this.pi.sendMessage(
      {
        customType: "team-event",
        content: `⚠ Model "${requested}" not found — falling back to ${fallback ?? "default"}.`,
        display: true,
      },
      { deliverAs: "followUp", triggerTurn: false },
    );

    return fallback;
  }

  clearWidget() {
    this.ctx?.ui.setWidget("pi-teams", undefined);
  }

  private renderWidget() {
    if (!this.ctx) return;
    if (this.workers.size === 0) {
      this.ctx.ui.setWidget("pi-teams", undefined);
      return;
    }
    this.ctx.ui.setWidget("pi-teams", this.widgetFactory);
  }

  private notifyLLM(event: PollEvent) {
    if (event.type === "completed" || event.type === "warning" || event.type === "failed") {
      const key = `${event.worker.name}:terminal`;
      if (this.notifiedTerminal.has(key)) return;
      this.notifiedTerminal.add(key);
    }

    // turn_finished is informational — the worker finished a turn but is still
    // resumable. Don't trigger a coordinator turn (it's not actionable yet).
    if (event.type === "turn_finished") {
      const msg = formatPollEvent(event);
      this.notifyQueue.push({ msg, triggerTurn: false });
      void this.drainNotifyQueue();
      return;
    }

    if (event.type === "comment" && (event.comment.startsWith("DONE:") || event.comment.startsWith("QUIT:"))) {
      return;
    }

    // Comments are delivered instantly via mesh-chat channel — skip the delayed
    // team-event duplicate. Lifecycle events (completed/failed/stuck) still go through.
    if (event.type === "comment") {
      return;
    }

    const msg = formatPollEvent(event);
    const triggerTurn = event.type === "stuck" ? false : true;
    this.notifyQueue.push({ msg, triggerTurn });
    void this.drainNotifyQueue();
  }

  private async drainNotifyQueue() {
    if (this.notifyDraining) return;
    this.notifyDraining = true;
    try {
      // Wait briefly to let concurrent events accumulate before sending
      await new Promise((r) => setTimeout(r, NOTIFY_BATCH_WINDOW_MS));

      // Collate all queued messages into a single update
      const batch: Array<{ msg: string; triggerTurn: boolean }> = [];
      while (this.notifyQueue.length > 0) {
        batch.push(this.notifyQueue.shift()!);
      }
      if (batch.length === 0) return;

      const combined = batch.map((b) => b.msg).join("\n\n");
      const triggerTurn = batch.some((b) => b.triggerTurn);

      this.pi.sendMessage(
        {
          customType: "team-event",
          content: combined,
          display: true,
        },
        { deliverAs: "followUp", triggerTurn },
      );
    } finally {
      this.notifyDraining = false;
    }
  }
}

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const ICONS = {
  done: `${GREEN}\uF00C${RESET}`,
  fail: `${RED}\uF00D${RESET}`,
  warn: `${YELLOW}\uF071${RESET}`,
  comment: `${CYAN}\uF075${RESET}`,
  alive: `${DIM}\uF111${RESET}`,
};

function workerTag(w: WorkerHandle): string {
  const shortTicket = w.ticketId.slice(0, 6);
  const nick = w.nickname ? ` ${w.nickname}` : "";
  return `[${w.name} • ${shortTicket}]${nick}`;
}

function formatPollEvent(event: PollEvent): string {
  const tag = workerTag(event.worker);
  switch (event.type) {
    case "completed":
      return `${ICONS.done} ${tag}:\n${event.result}`;
    case "turn_finished":
      return `${ICONS.alive} ${tag}:\nturn finished (still resumable) · ${event.result}`;
    case "warning":
      return `${ICONS.warn} ${tag}:\n${event.reason}`;
    case "failed":
      return `${ICONS.fail} ${tag}:\n${event.reason}`;
    case "stuck": {
      const summary = formatRuntimeSummary({
        hasActiveChildProcess: event.worker.hasActiveChildProcess,
        activeChildProcessCount: event.worker.activeChildProcessCount,
        currentCommand: event.worker.currentCommand,
        currentCommandElapsedSeconds: event.worker.currentCommandElapsedSeconds,
        startedAt: event.worker.spawnedAt,
        lastOutputAt: event.worker.lastOutputAt,
        lastOutputLabel: event.worker.lastOutputLabel,
      });
      return `${ICONS.warn} ${tag}:\nstuck ${event.idleSeconds}s idle · ${summary}`;
    }
    case "comment":
      return `${ICONS.comment} ${tag}:\n${event.comment}`;
    case "alive":
      return `${ICONS.alive} ${tag}:\nalive`;
  }
}
