import { parseSessionEntries, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getMaiBin } from "../shared/src/mai-binary.js";
import type { ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { safeJsonParse } from "@pi-extensions/shared/safe-json";
import { isSessionPhaseEvent, type SessionPhaseEvent } from "@pi-extensions/shared/session-phase-event";
import type { MeshTellReceiptPhase } from "@pi-extensions/pi-mesh/types";
import type { InboundMeshMessage } from "@pi-extensions/pi-mesh/extension/tell-protocol.js";
import {
  formatSessionViewEntries,
  readMeaningfulSessionEntriesFromFile,
  sliceSessionViewEntries,
} from "../shared/src/session-view.ts";
import {
  evaluateIdleState,
  formatRuntimeSummary,
  isReusedWorkerPid,
  sampleWorkerProcessSnapshot,
  sampleWorkerProcessSnapshotAsync,
} from "./activity.js";
import {
  LEASE_HEARTBEAT_INTERVAL_MS,
  buildLeaderLeasePath,
  pruneStaleLeases,
  unlinkLeaderLease,
  writeLeaderLease,
} from "./lease.js";
import { cleanupWorker } from "./cleanup.js";
import { isProcessAlive, killWorker, releaseWorkerActivation, resumeWorker, spawnWorker } from "./spawner.js";
import { getNewNotes, parseMaiShow } from "./tickets.js";
import { wrapPollEvent, type TeamsEvent } from "./subscription.js";
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
import type { LeaderAckPayload, TeamEnvelope, WorkerCommentPayload, WorkerFinishPayload } from "./v2/protocol.ts";
import type { AttemptIdentity, AttemptState, JsonValue, LifecycleFact, WorkerLifecycleState } from "./v2/state.ts";
import { attemptPreservePolicy, attemptStatus } from "./v2/state.ts";
import { LifecycleRuntimeStore } from "./v2/runtime-store.ts";
import { SessionFactWriter, createDeclarationEventId, createEffectId, createLeaderEventId, createRootEventId, sha256Id, workerFinishPendingForAttempt } from "./v2/session-facts.ts";
import { buildPendingDelivery, type DeliveryBatch } from "./v2/delivery.ts";
import { runLegacyMigration } from "./v2/legacy-migration.ts";
import { executeDurableEffect, pendingEffects } from "./v2/effects.ts";
import { createLeaderPersistedAckEnvelope } from "./v2/mesh-adapter.ts";
import { createWorktree, resolveGitToplevel, workerWorktreePath } from "./worktree.js";

/** Entry types that represent real agent work (talking, tool use). */
const REAL_ACTIVITY_TYPES = new Set(["message", "custom_message"]);

const ambientChatBatchMsRaw = Number(process.env.PI_TEAMS_AMBIENT_CHAT_BATCH_MS ?? "750");
const AMBIENT_CHAT_BATCH_MS = Number.isFinite(ambientChatBatchMsRaw) && ambientChatBatchMsRaw >= 0
  ? Math.floor(ambientChatBatchMsRaw)
  : 750;

/** Mesh "message" event payload — direct tells. */
type MessageHandler = (inbound: InboundMeshMessage) => void;

interface RealActivity {
  timestampMs: number;
  label: string;
}

interface WorkerExitAssessment {
  /** The worker's DECLARED terminal status (team_finish → durable mesh finish → handle). */
  explicitTerminal?: "done" | "quit";
  /** A ticket note explicitly signalling an abnormal exit (EXITED:/FAILED:) forces failure —
   *  a defensive net; the retired heartbeat-based forced-shutdown input is gone. */
  forcedExit: boolean;
  /** Process exited 0 — `pi -p` prints a clean turn end as exit 0, error/abort as non-zero. */
  cleanExit: boolean;
  ticketClosed: boolean;
  outputMeaningful: boolean;
  classification: "success" | "warning" | "failure";
  reason?: string;
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


export function assessWorkerExit(
  worker: Pick<WorkerHandle, "freeform" | "hasTools" | "sessionDir" | "terminalStatus" | "terminalSummary">,
  exitCode: number | null,
  ticketClosed: boolean,
  lastNote: string,
): WorkerExitAssessment {
  const outputCheck = workerProducedMeaningfulOutput(worker.sessionDir);
  const outputMeaningful = outputCheck.meaningful;

  // Explicit terminal source: the worker's team_finish, captured on the handle from the
  // durable mesh worker.finish tell (v1d — replaces the retired heartbeat `worker_terminal`
  // entry; explicit-over-inference per the ADR).
  const explicitTerminal = worker.terminalStatus;

  // A ticket note explicitly signalling an abnormal exit forces failure — a defensive net.
  // (The retired heartbeat-based forced-shutdown input — a session_shutdown_close entry the
  // worker never actually wrote — is gone; only the note-prefix check remains.)
  const forcedExit = !explicitTerminal && (lastNote.startsWith("EXITED:") || lastNote.startsWith("FAILED:"));

  // Clean-vs-crash is the process exit code: `pi -p` (print mode) exits 0 on a clean turn
  // end and non-zero on error/abort — no heartbeat needed.
  const cleanExit = exitCode === 0 && !forcedExit;

  let classification: WorkerExitAssessment["classification"];
  let reason: string | undefined;

  if (explicitTerminal === "done") {
    classification = "success";
  } else if (explicitTerminal === "quit") {
    classification = "warning";
    reason = worker.terminalSummary || lastNote || "worker quit";
  } else if (forcedExit) {
    classification = "failure";
    reason = lastNote;
  } else if (!outputMeaningful) {
    classification = "failure";
    reason = outputCheck.reason;
  } else {
    classification = "warning";
    reason = "worker exited without explicit team_finish";
  }

  return {
    explicitTerminal,
    forcedExit,
    cleanExit,
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

/**
 * Detect the "auto-compaction mid-turn" pattern that kills `pi -p` workers.
 *
 * Pi auto-compaction works by aborting the in-flight LLM request to free
 * context, writing a CompactionEntry to the session, and then (in interactive
 * mode) re-prompting with the summarized context. Teams workers run in print
 * mode (`pi -p`), which is one-shot: an aborted assistant message exits 1
 * BEFORE the compacted session can be consumed. The compaction is correct;
 * the surrounding process just dies.
 *
 * Returns true when the session ends with a CompactionEntry whose position
 * is after the last assistant message in the tail — i.e. compaction wrote
 * successfully and there was no follow-up turn before exit. In that state
 * the session is safe to resume via `resumeWorker`.
 *
 * Conservative — only matches the exact post-compaction-shutdown shape. Will
 * NOT trigger on a session that compacted earlier and then did more real work.
 */
export function endedWithUnresolvedCompaction(sessionDir: string): boolean {
  let sessionFile: string | undefined;
  try {
    const files = fs.readdirSync(sessionDir)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => path.join(sessionDir, f));
    if (files.length === 0) return false;
    sessionFile = files.length === 1
      ? files[0]
      : files.map(f => ({ f, mtime: fs.statSync(f).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0].f;
  } catch {
    return false;
  }

  // 32KB tail is enough — a CompactionEntry is small and we're looking at
  // the very end of the file. Same budget as readSessionDiagnostics.
  const TAIL_BYTES = 32768;
  let tail: string;
  try {
    const stat = fs.statSync(sessionFile);
    const size = stat.size;
    if (size === 0) return false;
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
    return false;
  }

  const lines = tail.split("\n");
  let lastMessageIdx = -1;
  let lastCompactionIdx = -1;
  let lastAssistantAborted = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lastMessageIdx >= 0 && lastCompactionIdx >= 0) break;
    const line = lines[i].trim();
    if (!line) continue;
    let entry: Record<string, unknown>;
    try { entry = safeJsonParse<Record<string, unknown>>(line); } catch { continue; }
    if (entry.type === "compaction" && lastCompactionIdx === -1) {
      lastCompactionIdx = i;
    } else if (entry.type === "message" && lastMessageIdx === -1) {
      lastMessageIdx = i;
      const msg = entry.message as Record<string, unknown> | undefined;
      if (msg && msg.role === "assistant" && msg.stopReason === "aborted") {
        lastAssistantAborted = true;
      }
    }
  }

  // Match only if: compaction exists, comes after the last message in the tail,
  // and the last message was an aborted assistant turn. That's the exact
  // pi-print-mode-died-after-compaction shape.
  return lastCompactionIdx > lastMessageIdx
    && lastMessageIdx >= 0
    && lastAssistantAborted;
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
 * Detect the empty-aborted-first-turn stream flake and produce a continuation
 * prompt so the bounded recovery block (handleWorkerExit) can retry the worker
 * once.
 *
 * THE FLAKE: a worker's FIRST model turn yields an empty/aborted response —
 * the provider stream failed or aborted before emitting any content or tool
 * calls. The session's last assistant message has `stopReason` "aborted" or
 * "error" with empty content (no text, no toolCall blocks). Nothing real was
 * produced, so the worker dies having done nothing. This is a transient
 * provider/stream hiccup (observed on zai-coding/glm-5.2), not a real failure.
 *
 * MATCHES (non-null) only when readSessionDiagnostics() shows:
 *   - last assistant: stopReason: aborted | error
 *   - NO "text:" segment on that line (empty content)
 *   - NO "last failing tool:" (no tool calls ran)
 * The "no tool calls" guarantee is provided by the caller: this classifier is
 * only reached on the failure-classified path, where workerProducedMeaningfulOutput
 * has already confirmed there were no tool calls and no substantive text.
 *
 * DIRECTED-ABORT SAFETY — never retry a directed stop. A directed abort (leader
 * kill, mesh interrupt, session shutdown, mid-turn auto-compaction) sets the
 * agent abort signal, which the provider surfaces as stopReason "aborted". Those
 * cases are filtered BEFORE this classifier runs:
 *   - Leader kill        → worker.status="killed" / worker.killedAt guard at the
 *                          top of handleWorkerExit (early return; never reaches
 *                          the recovery block).
 *   - Explicit team_finish → classification success/warning (the recovery block
 *                          is failure-gated, so it never fires).
 *   - Mid-turn compaction → has its own resume path (endedWithUnresolvedCompaction)
 *                          and is excluded here by the caller's guard.
 * This classifier therefore matches the empty abort/error signature; the upstream
 * filters guarantee a leader-directed stop never reaches it. (An external
 * mesh.interrupt aimed at a first-turn worker is indistinguishable from the flake
 * in the session and is not a normal teams workflow — the leader stops workers
 * via kill(), never mesh.interrupt — so the residual risk is one bounded retry.)
 *
 * NOTE on stopReason: per the provider stream (openai-completions.ts /
 * anthropic-messages.ts), stopReason "aborted" means signal.aborted was true at
 * catch time, "error" means it was not. The flake can surface as EITHER depending
 * on whether the stream-failure cleanup races ahead of the catch, so we accept
 * both. "error" is unambiguously a genuine non-directed failure; "aborted" is
 * accepted here because every leader-directed "aborted" is filtered upstream.
 */
export function getRecoverableStreamAbort(diagnostics: string): { error: string; prompt: string } | null {
  // readSessionDiagnostics emits the last assistant message as a single segment:
  //   "\n  last assistant: stopReason: <reason> | error: <msg> | text: <text>"
  // For the empty flake there is no text and no failing tool.
  const assistantMatch = diagnostics.match(/last assistant: ([^\n]+)/);
  if (!assistantMatch) return null;
  const lastAssistant = assistantMatch[1];

  const stopMatch = lastAssistant.match(/stopReason: (aborted|error)/);
  if (!stopMatch) return null;

  // Empty content is the flake signature — a turn that emitted text (even partial)
  // did real work and is not the empty-first-turn flake.
  if (/\btext:/.test(lastAssistant)) return null;
  // A turn that ran tools is not the empty flake.
  if (/last failing tool:/.test(diagnostics)) return null;

  const stopReason = stopMatch[1];
  const errorDetailMatch = lastAssistant.match(/\| error: ([^|]+)/);
  const errorDetail = errorDetailMatch ? errorDetailMatch[1].trim() : undefined;
  const error = errorDetail
    ? `empty ${stopReason} first-turn stream response: ${errorDetail}`
    : `empty ${stopReason} first-turn stream response (no content, no tool calls)`;

  return {
    error,
    prompt: [
      "Your previous turn produced no output — the model stream aborted or errored before any content or tool calls. This was a transient provider/stream flake, not a real failure.",
      "Start the task fresh now and complete it exactly as originally instructed.",
      "Use team_comment to report progress as needed.",
      'When you are done, call team_finish(status="done", summary=...). If you cannot continue, call team_finish(status="quit", summary=...). team_finish is the authoritative terminal signal — do not exit silently.',
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
      workerId: worker.workerId,
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

/** Grace before a finished-but-lingering (non-freeform) worker process is reaped. */
const FINISH_REAP_GRACE_MS = Number(process.env.PI_TEAMS_FINISH_REAP_GRACE_MS ?? "60000");
/** Settle time between SIGTERM → SIGKILL → explicit exit-pipeline drive. */
const FINISH_REAP_KILL_SETTLE_MS = Number(process.env.PI_TEAMS_FINISH_REAP_SETTLE_MS ?? "5000");
export const FINISH_EXIT_SETTLE_MS = 1500;

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
  private lifecycleStore: LifecycleRuntimeStore | null = null;
  private factWriter: SessionFactWriter | null = null;
  private activeDelivery: DeliveryBatch | null = null;
  private teamId: string | null = null;
  private leaderAckSeq = 0;
  private dispatchedEventIds = new Set<string>();
  /** External subscribers to the PollEvent stream (teams.on).
   *  Listeners receive a wrapped TeamsEvent — they can call preventDefault()
   *  to suppress the leader's default notifyLLM batch, or stopPropagation()
   *  to prevent later listeners from seeing the event. */
  private eventListeners = new Set<(event: TeamsEvent) => void>();
  /** Per-worker disposal callbacks — subscriptions register these to clean up
   *  when the target worker is killed, avoiding stale timeout spam. */
  private workerDisposalCallbacks = new Map<string, Set<() => void>>();
  showComments = true;

  // Mesh — shared instance from pi-mesh extension, set via setMesh().
  // Teams listens only for direct durable mesh tells from workers.
  private mesh: {
    tell: (id: string, msg: unknown) => void;
    tellAndWaitForReceipt: (id: string, msg: unknown, phase: MeshTellReceiptPhase, timeoutMs?: number) => Promise<{ phase: MeshTellReceiptPhase }>;
    ask: (id: string, msg: unknown, timeout?: number) => Promise<unknown>;
    stop: () => void;
    on: (event: "message", cb: MessageHandler) => void;
    off: (event: "message", cb: MessageHandler) => void;
    peers: () => Array<{ id: string; sessionId?: string; nickname?: string; name?: string; meshId?: string }>;
    self: () => { id: string };
  } | null = null;
	private readonly leaderEpoch = crypto.randomUUID();
	private meshDelivered = new Map<string, Set<string>>(); // workerName → set of comment texts already delivered via mesh
	private meshEventDedup = new Map<string, number>(); // transport event key → first-seen timestamp
	private pendingAmbientChat = new Map<string, string[]>();
  private pendingAmbientTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private leaseFilePath: string | null = null;
  private leaseTimer: ReturnType<typeof setInterval> | null = null;
  private meshMessageHandler?: MessageHandler;

  private static readonly STALE_RESTORE_PRUNE_MS = 60_000;

  constructor(pi: ExtensionAPI) {
    this.pi = pi;
  }

  private startLeaseHeartbeat() {
    if (!this.ctx) return;
    const leaderSessionFile = this.ctx.sessionManager.getSessionFile();
    if (!leaderSessionFile) return;

    // Opportunistic: prune any stale lease files left behind by long-dead
    // coordinators. Best-effort, never blocks startup.
    try {
      const removed = pruneStaleLeases();
      if (removed > 0) console.log(`[teams] pruned ${removed} stale lease file(s)`);
    } catch { /* swallow — housekeeping */ }

    const leaseFile = buildLeaderLeasePath(leaderSessionFile);
    this.leaseFilePath = leaseFile;
    // First write creates the empty marker. Subsequent timer calls just bump mtime.
    writeLeaderLease(leaseFile);

    if (this.leaseTimer) clearInterval(this.leaseTimer);
    this.leaseTimer = setInterval(() => {
      if (!this.leaseFilePath) return;
      writeLeaderLease(this.leaseFilePath);
    }, LEASE_HEARTBEAT_INTERVAL_MS);
  }

  private stopLeaseHeartbeat() {
    if (this.leaseTimer) {
      clearInterval(this.leaseTimer);
      this.leaseTimer = null;
    }
    // Graceful fast-path: unlink the lease so workers exit immediately on the
    // next tick instead of waiting for the staleness timeout. Hard crashes
    // skip this entirely — that's what the passive mtime timeout is for.
    if (this.leaseFilePath) {
      unlinkLeaderLease(this.leaseFilePath);
      this.leaseFilePath = null;
    }
  }

  private projectedHandle(attempt: AttemptState): WorkerHandle {
    const workerState = this.lifecycleStore?.projection().workers.get(attempt.workerId);
    const status = attempt.declaration?.kind === "done"
      ? (attempt.persistent && attempt.process.phase === "exited" ? "grace" : "done")
      : attempt.declaration?.kind === "quit"
        ? "warning"
        : attempt.assessment?.kind === "killed"
          ? "killed"
          : attempt.assessment
            ? (attempt.assessment.kind === "missing_finish" || attempt.assessment.kind === "legacy_ambiguous" ? "warning" : "failed")
            : attempt.process.phase === "running"
              ? "running"
              : "spawning";
    const spawnedAt = attempt.process.birth?.startedAt ?? 0;
    const workerSessionFile = attempt.process.workerSessionFile ?? "";
    const lastStuck = [...(this.lifecycleStore?.projection().actionableEvents.values() ?? [])]
      .filter((event) => event.attemptId === attempt.attemptId && event.type === "stuck")
      .at(-1);
    return {
      workerId: attempt.workerId,
      workerInstanceId: attempt.attemptId,
      name: attempt.name,
      pid: attempt.process.pid ?? 0,
      ticketId: attempt.ticketId,
      ticketStatus: attempt.declaration || attempt.assessment ? "closed" : "open",
      lastNote: attempt.declaration?.summary ?? attempt.assessment?.reason,
      sessionDir: attempt.process.sessionDir ?? "",
      sessionFile: workerSessionFile,
      worktreePath: attempt.worktreePath,
      model: attempt.model,
      hasTools: attempt.hasTools,
      status,
      spawnedAt,
      lastActivityAt: spawnedAt,
      lastProcessActivityAt: spawnedAt,
      lastOutputAt: spawnedAt,
      hasActiveChildProcess: false,
      activeChildProcessCount: 0,
      lastSeenCommentCount: 0,
      lastStuckWarningAt: lastStuck?.occurredAt,
      routeState: workerState?.route ?? "dead",
      terminalStatus: attempt.declaration?.kind,
      terminalSummary: attempt.declaration?.summary,
      freeform: attempt.persistent,
      attempts: [{
        workerId: attempt.workerId,
        workerInstanceId: attempt.attemptId,
        pid: attempt.process.pid ?? 0,
        sessionDir: attempt.process.sessionDir ?? "",
        sessionFile: workerSessionFile,
        spawnedAt,
        sessionMode: attempt.sessionMode,
        exitCode: attempt.process.exit?.code,
      }],
      exitCode: attempt.process.exit?.code,
      doneAt: attempt.declaration?.at,
    };
  }

  private rearmPersistentLifecycle(workerName: string, worker: WorkerHandle, now = Date.now()) {
    if (!worker.freeform || !worker.doneAt) return;
    worker.graceAt ??= worker.doneAt + DONE_GRACE_MS;
    worker.resumableUntilAt ??= worker.graceAt + RESUMABLE_WINDOW_MS;
    const toGraceMs = Math.max(0, worker.graceAt - now);
    const graceTimer = setTimeout(() => {
      const current = this.workers.get(workerName);
      if (!current || current.workerInstanceId !== worker.workerInstanceId || current.status !== "done") return;
      current.status = "grace";
      current.routeState = "resumable";
      this.renderWidget();
    }, toGraceMs);
    this.trackWorkerTimer(workerName, graceTimer);
  }

  /** Restore canonical lifecycle state from every physical session entry. */
  restoreState(ctx: ExtensionContext) {
	// A leader instance can observe more than one Pi session over its lifetime.
	// Detach old child callbacks and timers before rebinding canonical storage so
	// no late process event can append old-session truth into the new session.
	for (const child of this.childProcesses.values()) {
	  child.removeAllListeners("exit");
	  child.removeAllListeners("error");
	}
	this.clearWorkerRuntimeTimers();
    const entries = ctx.sessionManager.getEntries();
    const coordinatorSessionId = ctx.sessionManager.getSessionId();
    this.ctx = ctx;
    this.workers.clear();
    this.childProcesses.clear();
    this.meshDelivered.clear();
    this.teamId = sha256Id("teams:team:v4:", { coordinatorSessionId });
    this.factWriter = new SessionFactWriter(this.pi, ctx.sessionManager, entries);
    this.lifecycleStore = new LifecycleRuntimeStore(coordinatorSessionId, entries);
    this.teamId = this.lifecycleStore.projection().teamId ?? this.teamId;

    try {
      runLegacyMigration(
        this.factWriter,
        entries,
        ctx.sessionManager.getHeader(),
        this.teamId,
        (fact) => { this.lifecycleStore?.append(fact); },
        this.leaderEpoch,
      );
    } catch (error) {
      console.error(`[teams] lifecycle migration failed closed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const now = Date.now();
    const deadOnRestore: WorkerHandle[] = [];
    const unstartedOnRestore: AttemptState[] = [];
    const exitedOnRestore = [...this.lifecycleStore.projection().attempts.values()]
      .filter((attempt) => attempt.process.phase === "exited" && !attempt.declaration);
    for (const workerState of this.lifecycleStore.projection().workers.values()) {
      if (!workerState.currentAttemptId) continue;
      const attempt = this.lifecycleStore.attempt(workerState.currentAttemptId);
      if (!attempt) continue;
      const recordedRunning = attempt.process.phase === "running" && Boolean(attempt.process.pid);
      const processSnapshot = recordedRunning ? sampleWorkerProcessSnapshot(attempt.process.pid!) : null;
      const pidReused = processSnapshot && attempt.process.birth
        ? isReusedWorkerPid(processSnapshot, attempt.process.birth.startedAt, now)
        : false;
      const activeProcess = Boolean(recordedRunning && processSnapshot?.rootAlive && !pidReused);
      const resumable = workerState.route === "resumable" && attempt.persistent;
      if (!activeProcess && !resumable && !recordedRunning) {
        if (attempt.process.phase === "spawning" && !attempt.assessment && !attempt.declaration) unstartedOnRestore.push(attempt);
        continue;
      }
      const handle = this.projectedHandle(attempt);
      if (activeProcess) {
        handle.status = "running";
        handle.routeState = "pending";
        this.startActivityMonitor(handle.name, handle);
      } else if (resumable) {
        // Outcome status and logical resumability are orthogonal. Preserve the
        // canonical warning/failed projection; only an explicit persistent done
        // declaration projects as grace in projectedHandle().
        handle.routeState = "resumable";
        if (attempt.declaration?.kind === "done") this.rearmPersistentLifecycle(handle.name, handle, now);
      } else {
        handle.status = "running";
        handle.routeState = "pending";
        deadOnRestore.push(handle);
      }
      this.workers.set(handle.name, handle);
    }
    this.renderWidget();
    // Pending worktree creation must settle before an unstarted spawn is
    // classified and cleaned; otherwise reconciliation could create and remove
    // the same worktree concurrently.
    void this.reconcilePendingEffects().then(() => {
      for (const attempt of unstartedOnRestore) {
        const current = this.lifecycleStore?.attempt(attempt.attemptId);
        if (current?.process.phase !== "spawning" || current.assessment || current.declaration) continue;
        this.recordStartupFailure(current, "Coordinator restarted before the worker process start was durably recorded");
      }
      // Worker-local pending declarations remain recoverable even when the
      // coordinator crashed after process_exited or after a provisional warning.
      for (const attempt of exitedOnRestore) {
        let current = this.lifecycleStore?.attempt(attempt.attemptId);
        if (!current || current.declaration) continue;
        const recoveryHandle = this.projectedHandle(current);
        this.recoverPendingWorkerFinish(recoveryHandle);
        current = this.lifecycleStore?.attempt(attempt.attemptId);
        if (!current || current.declaration || current.assessment || !current.process.exit) continue;
        this.recordExitAssessment(
          recoveryHandle,
          Date.now(),
          recoveryHandle.lastNote ? { detail: recoveryHandle.lastNote } : undefined,
        );
        this.schedulePendingDelivery(true);
      }
      for (const workerState of this.lifecycleStore?.projection().workers.values() ?? []) {
        if (!workerState.currentAttemptId) continue;
        const current = this.lifecycleStore?.attempt(workerState.currentAttemptId);
        if (current?.declaration || current?.assessment) this.beginSettledAttemptEffects(current);
      }
      for (const worker of deadOnRestore) void this.handleWorkerExit(worker.name, worker, worker.exitCode ?? null, true);
    }).catch((error) => {
      console.error(`[teams] lifecycle reconciliation failed closed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  isStorageDegraded(): boolean {
    return this.factWriter?.storageDegraded ?? false;
  }

  private requireKernel(): { writer: SessionFactWriter; store: LifecycleRuntimeStore; teamId: string } {
    if (!this.factWriter || !this.lifecycleStore || !this.teamId) throw new Error("Teams lifecycle kernel is not initialized");
    this.factWriter.assertWritable();
    return { writer: this.factWriter, store: this.lifecycleStore, teamId: this.teamId };
  }

  private appendLifecycleFact(fact: LifecycleFact): "appended" | "duplicate" {
    const { writer, store } = this.requireKernel();
    const result = writer.appendFact(fact);
    if (result.status === "appended") store.append(fact);
    return result.status;
  }

  private identityFor(worker: Pick<WorkerHandle, "workerId" | "workerInstanceId">): AttemptIdentity {
    const { writer, teamId } = this.requireKernel();
    return {
      coordinatorSessionId: writer.coordinatorSessionId,
      teamId,
      workerId: worker.workerId,
      attemptId: worker.workerInstanceId,
    };
  }

  /** PID liveness is valid only while the recorded process birth still matches. */
  private isAttemptProcessAlive(worker: Pick<WorkerHandle, "pid" | "spawnedAt">): boolean {
    if (!worker.pid || worker.pid <= 0) return false;
    const snapshot = sampleWorkerProcessSnapshot(worker.pid);
    return snapshot.rootAlive && !isReusedWorkerPid(snapshot, worker.spawnedAt, Date.now());
  }

  private unwireMeshMessageEvents() {
    if (!this.mesh) return;
    if (this.meshMessageHandler) this.mesh.off("message", this.meshMessageHandler);
    this.meshMessageHandler = undefined;
  }

  /** Set the shared mesh instance from the pi-mesh extension. */
  setMesh(mesh: typeof this.mesh): void {
    if (this.mesh && this.mesh !== mesh) this.unwireMeshMessageEvents();
    this.mesh = mesh;
    this.wireMeshMessageEvents();
  }

  private ensureTeamCreated(): string {
    const { writer, teamId } = this.requireKernel();
    if (this.lifecycleStore?.projection().teamId) return teamId;
    const identity: AttemptIdentity = {
      coordinatorSessionId: writer.coordinatorSessionId,
      teamId,
      workerId: "__team__",
      attemptId: "__team__",
    };
    const eventId = createRootEventId("team_created", { coordinatorSessionId: writer.coordinatorSessionId, teamId });
    this.appendLifecycleFact({
      schemaVersion: 4,
      ...identity,
      eventId,
      kind: "team_created",
      sourceLeaderEpoch: this.leaderEpoch,
      occurredAt: Date.now(),
      payload: { root: "coordinator_session" },
    });
    return teamId;
  }

  private spawnRequestEventId(identity: AttemptIdentity): string {
    return createRootEventId("spawn_requested", {
      coordinatorSessionId: identity.coordinatorSessionId,
      teamId: identity.teamId,
      workerId: identity.workerId,
      attemptId: identity.attemptId,
    });
  }

  private beginSettledAttemptEffects(attempt: AttemptState): void {
    if (attempt.protocolViolation) return;
    if (this.lifecycleStore?.worker(attempt.workerId)?.currentAttemptId !== attempt.attemptId) return;
    if (attempt.persistent && attempt.sessionMode.kind === "resume" && attempt.assessment?.kind === "startup_failure") return;
    const worker = this.projectedHandle(attempt);
    // Ticket closure is eligible as soon as a declaration or terminal
    // assessment is canonical. Cleanup additionally requires process exit,
    // except for a startup failure where no process was ever recorded.
    void this.closeTicketWithEffect(worker).catch(() => {});
    const cleanupEligible = attempt.process.phase === "exited" || attempt.assessment?.kind === "startup_failure";
    if (!cleanupEligible) return;
    void this.cleanupWithEffect(worker, attemptPreservePolicy(attempt));
  }


  private recordStartupFailure(identity: AttemptIdentity, reason: string): void {
    const eventId = createLeaderEventId(identity, "assessment_startup_failure", this.spawnRequestEventId(identity));
    this.appendLifecycleFact({
      schemaVersion: 4,
      ...identity,
      eventId,
      kind: "assessment_startup_failure",
      sourceLeaderEpoch: this.leaderEpoch,
      occurredAt: Date.now(),
	  payload: { reason: "Worker failed before the worker process start was durably recorded", provisional: false },
	  diagnostics: { detail: reason },
    });
    const attempt = this.lifecycleStore?.attempt(identity.attemptId);
    if (attempt) {
      this.beginSettledAttemptEffects(attempt);
      this.projectV2WorkerRuntime(attempt.name);
    }
    this.schedulePendingDelivery(true);
  }

  private recordSpawnRequested(config: SpawnConfig, workerSessionFile: string): void {
    this.ensureTeamCreated();
    const identity: AttemptIdentity = {
      coordinatorSessionId: this.factWriter!.coordinatorSessionId,
      teamId: this.teamId!,
      workerId: config.workerId,
      attemptId: config.workerInstanceId,
    };
    const eventId = this.spawnRequestEventId(identity);
    this.appendLifecycleFact({
      schemaVersion: 4,
      ...identity,
      eventId,
      kind: "spawn_requested",
      sourceLeaderEpoch: this.leaderEpoch,
      occurredAt: Date.now(),
      payload: {
        name: config.workerName,
        ticketId: config.ticketId,
        persistent: Boolean(config.freeform),
        sessionMode: config.sessionMode ?? { kind: "fresh" },
        sessionDir: config.sessionDir,
        workerSessionFile,
        worktreePath: config.useWorktree ? config.cwd : null,
        ...(config.model ? { model: config.model } : {}),
        ...(config.hasTools !== undefined ? { hasTools: config.hasTools } : {}),
      },
    });
  }

  private upsertV2WorkerFromHandle(worker: WorkerHandle): void {
    if (this.lifecycleStore?.attempt(worker.workerInstanceId)) {
      this.projectV2WorkerRuntime(worker.name);
      return;
    }
    const current = worker.attempts?.at(-1);
    const config: SpawnConfig = worker.spawnConfig ?? {
      workerId: worker.workerId,
      workerInstanceId: worker.workerInstanceId,
      ticketId: worker.ticketId,
      workerName: worker.name,
      useWorktree: worker.worktreePath !== null,
      cwd: worker.worktreePath ?? this.ctx?.cwd ?? process.cwd(),
      repoRoot: this.ctx?.cwd ?? process.cwd(),
      sessionDir: current?.sessionDir ?? worker.sessionDir,
      leaderSessionFile: this.ctx?.sessionManager.getSessionFile() ?? "",
      model: worker.model,
      hasTools: worker.hasTools,
      teamId: this.teamId ?? undefined,
      leaderEpoch: this.leaderEpoch,
      freeform: worker.freeform,
      sessionMode: current?.sessionMode ?? { kind: "fresh" },
    };
    this.recordSpawnRequested(config, current?.sessionFile ?? worker.sessionFile);
    this.projectV2WorkerRuntime(worker.name);
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

  private recordProcessStart(worker: WorkerHandle, occurredAt: number, pid = worker.pid): void {
	const identity = this.identityFor(worker);
	const attempt = this.lifecycleStore?.attempt(worker.workerInstanceId);
	if (!attempt) throw new Error(`Cannot start unknown lifecycle attempt ${worker.workerInstanceId}`);
	const eventId = createLeaderEventId(identity, "process_started", this.spawnRequestEventId(identity));
	this.appendLifecycleFact({
	  schemaVersion: 4, ...identity, eventId, kind: "process_started", sourceLeaderEpoch: this.leaderEpoch,
	  occurredAt,
	  payload: {
		pid,
		processBirth: { startedAt: worker.spawnedAt },
		sessionMode: attempt.sessionMode,
		workerSessionFile: worker.sessionFile,
		sessionDir: worker.sessionDir,
	  },
	});
	this.projectV2WorkerRuntime(worker.name);
  }

  private recordExitAssessment(worker: WorkerHandle, occurredAt: number, diagnostics?: JsonValue): void {
	const identity = this.identityFor(worker);
	const attempt = this.lifecycleStore?.attempt(worker.workerInstanceId);
	if (!attempt || attempt.declaration || !attempt.process.exit) return;
	const exit = attempt.process.exit;
	const crashed = exit.code !== 0 || Boolean(exit.signal);
	const kind = crashed ? "assessment_crash" : "assessment_missing_finish";
	const reason = crashed
	  ? "Worker process exited abnormally without an explicit team_finish declaration"
	  : "Worker exited without an explicit team_finish declaration";
	const eventId = createLeaderEventId(identity, kind, exit.eventId);
	this.appendLifecycleFact({
	  schemaVersion: 4, ...identity, eventId, kind, sourceLeaderEpoch: this.leaderEpoch,
	  occurredAt,
	  payload: { reason, provisional: !crashed },
	  ...(diagnostics === undefined ? {} : { diagnostics }),
	});
	this.projectV2WorkerRuntime(worker.name);
  }

  private recordKilledAssessment(worker: WorkerHandle, occurredAt: number): void {
	const identity = this.identityFor(worker);
	const attempt = this.lifecycleStore?.attempt(worker.workerInstanceId);
	if (!attempt) return;
	const cause = attempt.process.exit?.eventId ?? this.spawnRequestEventId(identity);
	const eventId = createLeaderEventId(identity, "assessment_killed", cause);
	this.appendLifecycleFact({
	  schemaVersion: 4, ...identity, eventId, kind: "assessment_killed", sourceLeaderEpoch: this.leaderEpoch,
	  occurredAt,
	  payload: { reason: "worker killed by coordinator", provisional: false },
	});
	this.projectV2WorkerRuntime(worker.name);
  }

  private recordProcessExit(worker: WorkerHandle, exitCode: number | null, occurredAt = Date.now(), signal?: string): void {
    const identity = this.identityFor(worker);
    const eventId = createLeaderEventId(identity, "process_exited", `${worker.pid}:${worker.spawnedAt}`);
    this.appendLifecycleFact({
      schemaVersion: 4, ...identity, eventId, kind: "process_exited", sourceLeaderEpoch: this.leaderEpoch,
      occurredAt,
      payload: { pid: worker.pid, processBirth: { startedAt: worker.spawnedAt }, code: exitCode, ...(signal ? { signal } : {}) },
    });
  }

  private projectV2WorkerRuntime(workerName: string): void {
    const worker = this.workers.get(workerName);
    if (!worker || !this.lifecycleStore) return;
    const attempt = this.lifecycleStore.attempt(worker.workerInstanceId);
    if (!attempt) return;
    const status = attemptStatus(attempt);
    if (status === "completed") worker.status = "done";
    else if (status === "warning") worker.status = "warning";
    else if (status === "failed") worker.status = "failed";
    else if (status === "killed") worker.status = "killed";
    else if (attempt.process.phase === "running") worker.status = "running";
    else if (attempt.process.phase === "spawning") worker.status = "spawning";

    // Attempt outcome and logical-session route are deliberately independent.
    // A failed activation of a persistent session is a failed attempt while the
    // logical worker remains resumable for a later attempt.
    const logicalRoute = this.lifecycleStore.projection().workers.get(attempt.workerId)?.route;
    if (logicalRoute === "resumable") worker.routeState = "resumable";
    else if (logicalRoute === "dead") worker.routeState = "dead";
    else if (worker.routeState !== "linked") worker.routeState = "pending";
    if (attempt.persistent && attempt.declaration?.kind === "done" && attempt.process.phase === "exited") {
      worker.status = "grace";
    }
  }

  /** Get this coordinator's DURABLE mesh id (self().id) — passed to workers as the
   *  coordinator route so worker→coordinator tells land on pi/mesh/session/<durableId>. */
  getDurableMeshId(): string {
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
	const live = this.workers.get(name);
	const historicalAttempt = this.lifecycleStore?.currentAttempt(name);
	const worker = live ?? (historicalAttempt ? this.projectedHandle(historicalAttempt) : undefined);
    if (!worker) throw new Error(`Unknown worker \"${name}\"`);

	if (live?.routeState === "linked" && live.durableMeshId && this.mesh) {
      try {
		const reply = await this.mesh.ask(live.durableMeshId, { kind: "mesh:view", start, end }, 10_000) as Record<string, unknown>;
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

  async viewAttempt(attemptId: string, start = -20, end = 0): Promise<{ text: string; source: "mesh" | "session-log"; routeState: WorkerHandle["routeState"] }> {
    const attempt = this.lifecycleStore?.attempt(attemptId);
    if (!attempt) throw new Error(`Unknown attempt "${attemptId}"`);
    const live = [...this.workers.values()].find((worker) => worker.workerInstanceId === attemptId);
    const worker = live ?? this.projectedHandle(attempt);
    if (live?.routeState === "linked" && live.durableMeshId && this.mesh) {
      try {
        const reply = await this.mesh.ask(live.durableMeshId, { kind: "mesh:view", start, end }, 10_000) as Record<string, unknown>;
        if (!reply?.error) return { text: typeof reply?.text === "string" ? reply.text : JSON.stringify(reply), source: "mesh", routeState: live.routeState };
      } catch {}
    }
    const sessionFile = this.resolveWorkerSessionFile(worker);
    if (!sessionFile) throw new Error(`Attempt "${attemptId}" has no readable session log`);
    const entries = readMeaningfulSessionEntriesFromFile(sessionFile);
    return { text: formatSessionViewEntries(sliceSessionViewEntries(entries, start, end)), source: "session-log", routeState: worker.routeState };
  }

  /** Send a turn-triggering message to a specific worker by name.
   *  If its persistent logical route is resumable between attempts (after done or
   *  missing_finish), resume it through a new session-continuation attempt. */
  async tellWorker(name: string, message: unknown): Promise<boolean> {
    const worker = this.workers.get(name);
    if (!worker) return false;

    // Resumable persistent worker — continue the existing session with a new process.
    if (worker.routeState === "resumable" && worker.freeform) {
      const text = typeof message === "string" ? message : JSON.stringify(message);
      const child = this.resumeAsNewAttempt(worker, text);
      if (!child) return false;

      this.clearPendingAmbientChat(name);
      worker.routeState = "pending";
      worker.durableMeshId = undefined;
      worker.doneAt = undefined;
      worker.graceAt = undefined;
      worker.resumableUntilAt = undefined;
      worker.killedAt = undefined;
      this.upsertV2WorkerFromHandle(worker);
      this.recordProcessStart(worker, Date.now(), child.pid ?? worker.pid);
      this.childProcesses.set(name, child);
      child.on("exit", (code, signal) => {
        worker.exitCode = code;
        const attempt = getCurrentAttempt(worker);
        if (attempt) attempt.exitCode = code;
        void this.handleWorkerExit(name, worker, code, false, signal ?? undefined);
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
      return true;
    }

    // Running worker — send via mesh with an HONEST delivery receipt (v1d).
    // The retired fire-and-forget path (`mesh.tell(); return true`) returned true
    // UNCONDITIONALLY even when the durable id had no live/revivable peer — that is
    // Cecilia bug 1 (false-positive receipt). Route over the stable durableMeshId
    // (v1a, never a stale clientId) and await the honest v1b ack:
    //   delivered / surfaced   → reached the peer's durable mailbox / turn context → true
    //   refused / undeliverable / expired / timeout → NOT delivered → false
    if (worker.routeState !== "linked" || !worker.durableMeshId || !this.mesh) return false;
    try {
      const ack = await this.mesh.tellAndWaitForReceipt(worker.durableMeshId, message, "delivered", 5000);
      return ack.phase === "delivered" || ack.phase === "surfaced";
    } catch {
      // No receipt within the window = honest not-delivered.
      return false;
    }
  }

  /** Send a turn-triggering message to all running workers. */
  async tellAllWorkers(message: unknown): Promise<number> {
    let count = 0;
    for (const [name] of this.workers) {
      if (await this.tellWorker(name, message)) count++;
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
	const resumeMode = worker.spawnConfig?.sessionMode ?? { kind: "resume" as const, sessionFile: worker.sessionFile };
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      PI_TEAMS_WORKER: "1",
	  PI_TEAMS_WORKER_ID: worker.workerId,
      PI_TEAMS_WORKER_INSTANCE_ID: worker.workerInstanceId,
      PI_TEAMS_TICKET_ID: worker.ticketId,
      PI_TEAMS_WORKER_NAME: worker.name,
	  PI_TEAMS_TEAM_ID: this.teamId ?? worker.ticketId,
	  PI_TEAMS_LEADER_EPOCH: this.leaderEpoch,
	  PI_TEAMS_COORDINATOR_SESSION_ID: this.factWriter?.coordinatorSessionId ?? "",
	  PI_TEAMS_SESSION_MODE: JSON.stringify(resumeMode),
    };

    if (worker.freeform) env.PI_TEAMS_FREEFORM = "1";
    else delete env.PI_TEAMS_FREEFORM;

    if (worker.hasTools) env.PI_TEAMS_HAS_TOOLS = "1";
    else delete env.PI_TEAMS_HAS_TOOLS;
    if (this.leaseFilePath) env.PI_TEAMS_LEASE_FILE = this.leaseFilePath;

    const meshId = this.getDurableMeshId();
    if (meshId) env.PI_TEAMS_COORDINATOR_ID = meshId;
    if (this.ctx) env.PI_TEAMS_LEADER_SESSION = this.ctx.sessionManager.getSessionFile() ?? "";

    return env;
  }

	private recordResumeRequested(worker: WorkerHandle): void {
		const sessionFile = this.resolveWorkerSessionFile(worker);
		if (!sessionFile) throw new Error(`Worker "${worker.name}" has no persisted session to resume`);
		const config: SpawnConfig = {
			...(worker.spawnConfig ?? {
				ticketId: worker.ticketId,
				workerName: worker.name,
				useWorktree: worker.worktreePath !== null,
				cwd: worker.worktreePath ?? this.ctx?.cwd ?? process.cwd(),
				repoRoot: this.ctx?.cwd ?? process.cwd(),
				leaderSessionFile: this.ctx?.sessionManager.getSessionFile() ?? "",
			}),
			workerId: worker.workerId,
			workerInstanceId: worker.workerInstanceId,
			sessionDir: worker.sessionDir,
			teamId: this.teamId ?? worker.ticketId,
			leaderEpoch: this.leaderEpoch,
			coordinatorSessionId: this.factWriter?.coordinatorSessionId,
			freeform: worker.freeform,
			sessionMode: { kind: "resume", sessionFile },
		};
		worker.spawnConfig = config;
		this.recordSpawnRequested(config, sessionFile);
	}

  private resumeAsNewAttempt(worker: WorkerHandle, message: string): ChildProcess | null {
    const previousAttemptId = worker.workerInstanceId;
    const previousConfig = worker.spawnConfig;
    worker.workerInstanceId = crypto.randomUUID();
    try {
      this.recordResumeRequested(worker);
    } catch (error) {
      // No canonical attempt exists when intent persistence fails.
      worker.workerInstanceId = previousAttemptId;
      worker.spawnConfig = previousConfig;
      throw error;
    }

    const identity = this.identityFor(worker);
    try {
      const child = resumeWorker(worker, message, this.buildWorkerResumeEnv(worker));
      if (child) return child;
      this.recordStartupFailure(identity, "Worker session resume was refused because no persisted session or activation lease was available");
    } catch (error) {
      worker.spawnError = error instanceof Error ? error.message : String(error);
      this.recordStartupFailure(identity, `Worker session resume failed: ${worker.spawnError}`);
    }
    this.projectV2WorkerRuntime(worker.name);
    this.renderWidget();
    return null;
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
	this.clearWorkerRuntimeTimers();
    this.stopLeaseHeartbeat();
    this.unwireMeshMessageEvents();
  }

	private clearWorkerRuntimeTimers(): void {
	  if (this.batchTimer) { clearInterval(this.batchTimer); this.batchTimer = null; }
	  this.monitoredWorkers.clear();
	  for (const timers of this.workerTimers.values()) for (const timer of timers) clearTimeout(timer);
	  this.workerTimers.clear();
	  for (const timer of this.pendingAmbientTimers.values()) clearTimeout(timer);
	  this.pendingAmbientTimers.clear();
	  this.pendingAmbientChat.clear();
	  this.activeDelivery = null;
	}

  /** Bind a worker handle to its DURABLE mesh id (v1a). The id is DECLARED by the
   *  worker in its envelope (envelope.meshId) and is stable across resume/reconnect,
   *  so unlike the retired clientId-route cache it never goes stale. Coordinator→worker
   *  tells then route over pi/mesh/session/<durableId>, which the worker subscribes to
   *  on identity resolution. */
	private bindWorkerRoute(worker: WorkerHandle, durableMeshId: string, nickname?: string) {
	  const changed = worker.durableMeshId !== durableMeshId || worker.routeState !== "linked" || (nickname !== undefined && worker.nickname !== nickname);
	  worker.durableMeshId = durableMeshId;
	  worker.routeState = "linked";
	  if (nickname) worker.nickname = nickname;
	}

	private claimMeshEvent(key: string): boolean {
		if (this.meshEventDedup.has(key)) return false;
		this.meshEventDedup.set(key, Date.now());
		while (this.meshEventDedup.size > 800) {
			const oldest = this.meshEventDedup.keys().next().value;
			if (oldest === undefined) break;
			this.meshEventDedup.delete(oldest);
		}
		return true;
	}

	private handleSessionPhaseEvent(event: SessionPhaseEvent, transportFrom: string): void {
	  const workerName = event.workerId;
	  const worker = this.workers.get(workerName);
	  if (!worker) return;
	  if (event.attemptId && event.attemptId !== worker.workerInstanceId) return;
	  if (this.teamId && event.teamId !== this.teamId) return;
	  if (event.leaderEpoch && event.leaderEpoch !== this.leaderEpoch) return;
	  if (!this.claimMeshEvent(`phase:${event.teamId}:${event.leaderEpoch}:${event.workerId}:${event.attemptId}:${event.seq}`)) return;

    let peerNickname: string | undefined;
    const routeId = event.meshId ?? transportFrom;
    if (!worker.nickname && this.mesh) {
      const peer = this.mesh.peers().find((pr) => pr.id === transportFrom || pr.meshId === routeId || pr.sessionId === transportFrom);
      if (peer?.nickname) peerNickname = peer.nickname;
    }
    this.bindWorkerRoute(worker, routeId, peerNickname);
    worker.lastActivityAt = Date.now();
    worker.lastOutputAt = Date.now();
    worker.lastOutputLabel = `phase:${event.payload.stage}`;

    this.notifyLLM({ type: "phase", worker: { ...worker }, phase: event });
	  this.renderWidget();
	}

	private handleWorkerToLeaderEnvelope(envelope: TeamEnvelope<unknown>, transportFrom: string): void {
		const payload = envelope.payload as Record<string, unknown> | undefined;
		if (!payload || typeof payload !== "object" || envelope.teamId !== this.teamId) return;
		const worker = [...this.workers.values()].find((candidate) =>
			candidate.workerId === envelope.workerId || (candidate.name === envelope.workerId && !process.env.PI_TEAMS_REQUIRE_V4_IDENTITY),
		);
		if (!worker || envelope.attemptId !== worker.workerInstanceId) return;
		const workerName = worker.name;
		const routeId = envelope.meshId ?? transportFrom;
		let peerNickname: string | undefined;
		if (!worker.nickname && this.mesh) {
			const peer = this.mesh.peers().find((candidate) => candidate.id === transportFrom || candidate.meshId === routeId || candidate.sessionId === transportFrom);
			if (peer?.nickname) peerNickname = peer.nickname;
		}

		if (envelope.type === "worker.finish") {
			const status = payload.status;
			const summary = typeof payload.summary === "string" ? payload.summary : "";
			const eventId = typeof payload.eventId === "string" ? payload.eventId : "";
			if ((status !== "done" && status !== "quit") || !eventId) return;
			const identity = this.identityFor(worker);
			const expectedEventId = createDeclarationEventId(identity, status, summary);
			if (eventId !== expectedEventId) {
				const conflictId = createLeaderEventId(identity, "protocol_violation", eventId, { expectedEventId });
				try {
					this.appendLifecycleFact({
						schemaVersion: 4, ...identity, eventId: conflictId, kind: "protocol_violation",
						sourceLeaderEpoch: this.leaderEpoch, occurredAt: Date.now(),
						payload: { conflictingEventId: eventId, reason: "Worker declaration eventId does not match its canonical attempt identity and payload" },
					});
					this.schedulePendingDelivery(true);
				} catch {}
				return;
			}
			try {
				this.appendLifecycleFact({
					schemaVersion: 4,
					...identity,
					eventId,
					kind: status === "done" ? "declaration_done" : "declaration_quit",
					sourceLeaderEpoch: this.leaderEpoch,
					occurredAt: Date.now(),
					payload: { summary },
					diagnostics: { transportFrom, senderLeaderEpoch: envelope.leaderEpoch },
				});
				const attempt = this.lifecycleStore?.attempt(worker.workerInstanceId);
				if (attempt?.assessment?.provisional) {
					const correctionId = createLeaderEventId(identity, "outcome_corrected", attempt.assessment.eventId, { declarationEventId: eventId });
					this.appendLifecycleFact({
						schemaVersion: 4,
						...identity,
						eventId: correctionId,
						kind: "outcome_corrected",
						sourceLeaderEpoch: this.leaderEpoch,
						occurredAt: Date.now(),
						payload: { provisionalEventId: attempt.assessment.eventId, declarationEventId: eventId, summary: `Outcome corrected: ${summary}` },
					});
				}
			} catch (error) {
				if (error instanceof Error && error.message.startsWith("Conflicting lifecycle eventId")) {
					const conflictId = createLeaderEventId(identity, "protocol_violation", eventId);
					try {
						this.appendLifecycleFact({
							schemaVersion: 4, ...identity, eventId: conflictId, kind: "protocol_violation",
							sourceLeaderEpoch: this.leaderEpoch,
							occurredAt: Date.now(),
							payload: { conflictingEventId: eventId, reason: `Conflicting declaration event ${eventId}` },
						});
						this.schedulePendingDelivery(true);
					} catch {}
				}
				console.error(`[teams] finish persistence failed closed: ${error instanceof Error ? error.message : String(error)}`);
				return;
			}
			const acceptedAttempt = this.lifecycleStore?.attempt(worker.workerInstanceId);
			const accepted = acceptedAttempt?.declaration;
			if (!accepted || accepted.eventId !== eventId) {
				this.schedulePendingDelivery(true);
				return;
			}
			if (acceptedAttempt) this.beginSettledAttemptEffects(acceptedAttempt);
			this.bindWorkerRoute(worker, routeId, peerNickname);
			worker.terminalStatus = accepted.kind;
			worker.terminalSummary = summary;
			worker.lastOutputAt = Date.now();
			worker.lastOutputLabel = `mesh ${status}`;
			this.projectV2WorkerRuntime(workerName);
			if (this.mesh) {
				this.mesh.tell(routeId, createLeaderPersistedAckEnvelope({
					teamId: this.teamId!, leaderEpoch: this.leaderEpoch, workerId: worker.workerId,
					attemptId: worker.workerInstanceId, seq: ++this.leaderAckSeq, eventId,
				}));
			}
			this.emitAuthoritativeFinish(workerName, worker, status, summary);
			this.renderWidget();
			return;
		}

		if (!this.claimMeshEvent(`worker:${envelope.teamId}:${worker.workerId}:${envelope.attemptId}:${envelope.type}:${envelope.seq}`)) return;
		const commentText = typeof payload.text === "string" ? payload.text : null;
		if (envelope.type === "worker.comment" && commentText !== null) {
			this.bindWorkerRoute(worker, routeId, peerNickname);
			worker.lastOutputAt = Date.now();
			worker.lastOutputLabel = "mesh comment";
			if (!this.meshDelivered.has(workerName)) this.meshDelivered.set(workerName, new Set());
			const seen = this.meshDelivered.get(workerName)!;
			seen.add(commentText);
			while (seen.size > 50) seen.delete(seen.values().next().value!);
			this.notifyLLM({ type: "comment", worker: { ...worker }, comment: commentText });
			this.queueAmbientChatForResumableWorkers(workerName, commentText);
		} else if (envelope.type === "worker.hello") {
			worker.lastActivityAt = Date.now();
			this.bindWorkerRoute(worker, routeId, peerNickname);
		}
		this.renderWidget();
	}

	private emitAuthoritativeFinish(name: string, worker: WorkerHandle, status: "done" | "quit", summary: string): void {
		const text = summary.trim() || (status === "done" ? "Task completed." : "Worker quit.");
		this.notifyLLM(status === "done"
			? { type: "completed", worker: { ...worker }, result: text }
			: { type: "warning", worker: { ...worker }, reason: `QUIT: ${text}` });
		if (worker.freeform) return;
		const instanceId = worker.workerInstanceId;
		setTimeout(() => {
			const current = this.workers.get(name);
			if (!current || current.workerInstanceId !== instanceId) return;
			if (current.status === "killed" || this.lifecycleStore?.attempt(instanceId)?.process.phase === "exited") return;
			void this.terminateProcessWithEffect(current, "finish_reap").finally(() => {
				setTimeout(() => {
					const final = this.workers.get(name);
					if (final && final.workerInstanceId === instanceId && this.lifecycleStore?.attempt(instanceId)?.process.phase !== "exited") {
						void this.handleWorkerExit(name, final, final.exitCode ?? 0, true);
					}
				}, FINISH_REAP_KILL_SETTLE_MS);
			});
		}, FINISH_REAP_GRACE_MS);
	}

	/** Wire direct mesh tells into the existing notification pipeline. */
	private wireMeshMessageEvents() {
		if (!this.mesh || this.meshMessageHandler) return;
		this.meshMessageHandler = (inbound) => {
			// Inbound mesh tells arrive wrapped in a mesh:tell envelope; unwrap to the
			// inner payload before classifying — mirrors the code-mode inbound consumer
			// (pi-mesh.ts). Without this, worker→leader envelopes (hello/comment/finish)
			// and phase events are matched against the wrapper and silently dropped, so
			// the worker's route never binds (identity stays "…", status stuck "spawning").
			const { message } = inbound;
			if (isSessionPhaseEvent(message.payload)) {
				this.handleSessionPhaseEvent(message.payload, message.from);
				return;
			}
			if (isWorkerToLeaderEnvelope(message.payload)) this.handleWorkerToLeaderEnvelope(message.payload, message.from);
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
    explicitCwd?: string,
  ): Promise<WorkerHandle> {
    if (!this.ctx) throw new Error("Leader context not set");
    this.requireKernel();
    const existing = this.workers.get(workerName);
    if (existing && !["done", "warning", "failed", "killed", "grace"].includes(existing.status)) {
      throw new Error(`Worker name "${workerName}" is already active on ticket #${existing.ticketId}`);
    }
    if (process.env.PI_TEAMS_WORKER === "1" && useWorktree) useWorktree = false;

    const repoDir = explicitCwd ?? this.ctx.cwd;
    const effectiveModel = this.resolveWorkerModel(model);
    const workerId = crypto.randomUUID();
    const workerInstanceId = crypto.randomUUID();
    const sessionDir = path.join(repoDir, ".pi", "sessions", "teams-workers", `team-${workerName}-${ticketId}-${workerInstanceId}`);
    let cwd = repoDir;
    let toplevel = repoDir;
    if (useWorktree) {
      toplevel = await resolveGitToplevel(repoDir);
      cwd = workerWorktreePath(toplevel, workerName, Date.now());
      while (fs.existsSync(cwd)) cwd = workerWorktreePath(toplevel, workerName, Date.now() + 1);
    }
    const sessionMode = this.buildSpawnSessionMode();
    const sessionFile = this.ctx.sessionManager.getSessionFile()!;
    const workerSessionFile = sessionMode.kind === "fresh" ? path.join(sessionDir, "session.jsonl") : sessionMode.sessionFile;
    const config: SpawnConfig = {
      workerId,
      workerInstanceId,
      ticketId,
      workerName,
      useWorktree,
      cwd,
      repoRoot: repoDir,
      sessionDir,
      leaderSessionFile: sessionFile,
      model: effectiveModel,
      hasTools,
      additionalPrompt,
      teamId: this.teamId!,
      leaderEpoch: this.leaderEpoch,
      coordinatorSessionId: this.factWriter?.coordinatorSessionId,
      coordinatorMeshId: this.getDurableMeshId() || undefined,
      ticketCwd: this.ctx.cwd,
      ticketText,
      freeform,
      sessionMode,
    };

    // Canonical intent precedes every spawn-side effect.
    this.recordSpawnRequested(config, workerSessionFile);
    this.wireMeshMessageEvents();

    if (useWorktree) {
      const identity: AttemptIdentity = { coordinatorSessionId: this.factWriter!.coordinatorSessionId, teamId: this.teamId!, workerId, attemptId: workerInstanceId };
	  let effect: { value?: Awaited<ReturnType<typeof createWorktree>> };
	  try {
		effect = await executeDurableEffect(
		  this.factWriter!,
		  this.lifecycleStore!.projection(),
		  { identity, effectKind: "worktree_create", normalizedInputs: { toplevel, workerName, ticketId, cwd, baseRef: baseRef ?? "HEAD" }, sourceLeaderEpoch: this.leaderEpoch },
		  async () => {
			const result = await createWorktree(toplevel, workerName, ticketId, cwd, baseRef);
			if (!result.success) throw new Error(result.error ?? `Failed to create worktree ${cwd}`);
			return result;
		  },
		  (fact) => { this.lifecycleStore?.append(fact); },
		);
	  } catch (error) {
		try {
		  this.recordStartupFailure(identity, "Worktree creation failed: " + (error instanceof Error ? error.message : String(error)));
		} catch {}
		throw error;
	  }
      const result = effect.value ?? { success: fs.existsSync(cwd), path: cwd, branch: `teams/${workerName}/${ticketId}`, error: "worktree effect completed without a live return value" };
      if (!result.success) {
        const reason = `Worktree creation failed: ${result.error}`;
        this.recordStartupFailure(identity, reason);
        throw new Error(reason);
      }
    }

    let spawned: ReturnType<typeof spawnWorker>;
    try {
      spawned = spawnWorker(config);
    } catch (error) {
      const identity: AttemptIdentity = { coordinatorSessionId: this.factWriter!.coordinatorSessionId, teamId: this.teamId!, workerId, attemptId: workerInstanceId };
      this.recordStartupFailure(identity, error instanceof Error ? error.message : String(error));
      throw error;
    }
    const { process: child, handle } = spawned;
    if (freeform) handle.freeform = true;
    handle.spawnConfig = config;
    this.workers.set(workerName, handle);
    this.childProcesses.set(workerName, child);
    try {
      this.recordProcessStart(handle, handle.spawnedAt, handle.pid);
    } catch (error) {
      try { killWorker(handle.pid); } catch {}
      this.workers.delete(workerName);
      this.childProcesses.delete(workerName);
      throw error;
    }

    child.on("exit", (code, signal) => {
      handle.exitCode = code;
      const attempt = getCurrentAttempt(handle);
      if (attempt) attempt.exitCode = code;
      void this.handleWorkerExit(workerName, handle, code, false, signal ?? undefined);
    });
    child.on("error", (error) => {
      handle.exitCode = null;
      handle.spawnError = error.message;
      const attempt = getCurrentAttempt(handle);
      if (attempt) attempt.spawnError = error.message;
      void this.handleWorkerExit(workerName, handle, null);
    });
    this.startActivityMonitor(workerName, handle);
    this.renderWidget();
    return handle;
  }

  private async handleTicketChange(worker: WorkerHandle) {
    if (!this.ctx) return;
    if (["done", "warning", "failed", "killed", "grace"].includes(worker.status) || isTerminalV2Lifecycle(this.getV2WorkerLifecycle(worker.name))) return;

    try {
      const maiResult = await this.pi.exec(getMaiBin(), ["--json", "show", worker.ticketId], {
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

  private async terminateProcessWithEffect(worker: WorkerHandle, reason: string): Promise<void> {
    if (!this.factWriter || !this.lifecycleStore) return;
    const identity = this.identityFor(worker);
    await executeDurableEffect(
      this.factWriter,
      this.lifecycleStore.projection(),
      { identity, effectKind: "process_terminate", normalizedInputs: { pid: worker.pid, processBirth: { startedAt: worker.spawnedAt }, reason }, sourceLeaderEpoch: this.leaderEpoch },
      async () => { if (this.isAttemptProcessAlive(worker)) killWorker(worker.pid); },
      (fact) => { this.lifecycleStore?.append(fact); },
    ).then(() => undefined);
  }

  private async closeTicketWithEffect(worker: WorkerHandle): Promise<void> {
    if (!this.ctx || !this.factWriter || !this.lifecycleStore) return;
    const identity = this.identityFor(worker);
    await executeDurableEffect(
      this.factWriter,
      this.lifecycleStore.projection(),
      { identity, effectKind: "ticket_close", normalizedInputs: { ticketId: worker.ticketId }, sourceLeaderEpoch: this.leaderEpoch },
      async () => {
        await this.pi.exec(getMaiBin(), ["close", worker.ticketId], { cwd: this.ctx!.cwd, timeout: 5000 });
      },
      (fact) => { this.lifecycleStore?.append(fact); },
    ).then(() => undefined);
  }

  private async cleanupWithEffect(
    worker: WorkerHandle,
    options: { preserveBranch: boolean; preserveWorktree: boolean },
  ): Promise<Awaited<ReturnType<typeof cleanupWorker>> | undefined> {
    if (!this.ctx || !this.factWriter || !this.lifecycleStore) return undefined;
    const identity = this.identityFor(worker);
    const normalizedInputs = {
      repoDir: this.ctx.cwd,
      worktreePath: worker.worktreePath,
      preserveBranch: options.preserveBranch,
      preserveWorktree: options.preserveWorktree,
    } as const;
    try {
      const execution = await executeDurableEffect(
        this.factWriter,
        this.lifecycleStore.projection(),
        { identity, effectKind: "cleanup", normalizedInputs, sourceLeaderEpoch: this.leaderEpoch },
        (effectId) => cleanupWorker(this.ctx!.cwd, worker, { ...options, effectId }),
        (fact) => { this.lifecycleStore?.append(fact); },
      );
      return execution.value;
    } catch {
      return undefined;
    }
  }

  private async reconcilePendingEffects(): Promise<void> {
    if (!this.lifecycleStore) return;
    const reconciliations: Promise<unknown>[] = [];
    for (const effect of pendingEffects(this.lifecycleStore.projection())) {
      const attempt = this.lifecycleStore.attempt(effect.attemptId);
      if (!attempt) continue;
	  if (effect.kind === "worktree_create" && attempt.assessment?.kind === "startup_failure") continue;
      const inputs = effect.normalizedInputs as Record<string, unknown>;
      const worker = this.workers.get(attempt.name) ?? this.projectedHandle(attempt);
      if (effect.kind === "cleanup") {
        reconciliations.push(this.cleanupWithEffect(worker, {
          preserveBranch: inputs.preserveBranch === true,
          preserveWorktree: inputs.preserveWorktree === true,
        }));
      } else if (effect.kind === "ticket_close") {
        reconciliations.push(this.closeTicketWithEffect(worker));
      } else if (effect.kind === "process_terminate") {
        reconciliations.push(this.terminateProcessWithEffect(worker, String(inputs.reason ?? "reconcile")));
      } else if (effect.kind === "worktree_create" && this.factWriter) {
        const identity = this.identityFor(worker);
        reconciliations.push(executeDurableEffect(
          this.factWriter,
          this.lifecycleStore.projection(),
          { identity, effectKind: "worktree_create", normalizedInputs: effect.normalizedInputs, sourceLeaderEpoch: this.leaderEpoch },
          async () => {
            const result = await createWorktree(String(inputs.toplevel), String(inputs.workerName), String(inputs.ticketId), String(inputs.cwd), String(inputs.baseRef));
            if (!result.success) throw new Error(result.error ?? `Failed to reconcile worktree ${String(inputs.cwd)}`);
            return result;
          },
          (fact) => { this.lifecycleStore?.append(fact); },
        ));
      }
    }
    await Promise.allSettled(reconciliations);
  }

  private recoverPendingWorkerFinish(worker: WorkerHandle): boolean {
	// Recovery is identity-bearing, not a best-effort log view. Only the exact
	// worker session path persisted in process_started may supply declaration
	// evidence; choosing another JSONL from the directory risks cross-attempt data.
	const sessionFile = worker.sessionFile && fs.existsSync(worker.sessionFile) ? worker.sessionFile : null;
    if (!sessionFile) return false;
    let entries: ReturnType<typeof parseSessionEntries>;
    try {
      entries = parseSessionEntries(fs.readFileSync(sessionFile, "utf8"));
    } catch (error) {
      worker.lastNote = `worker session unreadable during finish recovery: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    }
    const identity = this.identityFor(worker);
	const pending = workerFinishPendingForAttempt(entries, identity);
	if (!pending) return false;
	const status = pending.status;
	const summary = pending.summary;
	const eventId = pending.eventId;
	const expectedEventId = createDeclarationEventId(identity, status, summary);
	if (eventId !== expectedEventId) {
	  const conflictId = createLeaderEventId(identity, "protocol_violation", eventId, { expectedEventId });
	  try {
		this.appendLifecycleFact({
		  schemaVersion: 4, ...identity, eventId: conflictId, kind: "protocol_violation",
		  sourceLeaderEpoch: this.leaderEpoch, occurredAt: Date.now(),
		  payload: { conflictingEventId: eventId, reason: "Recovered worker declaration eventId does not match its canonical attempt identity and payload" },
		});
	  } catch {}
	  this.schedulePendingDelivery(true);
	  return false;
	}
    const provisional = this.lifecycleStore?.attempt(worker.workerInstanceId)?.assessment;
    try {
      this.appendLifecycleFact({
        schemaVersion: 4, ...identity, eventId,
        kind: status === "done" ? "declaration_done" : "declaration_quit",
        sourceLeaderEpoch: this.leaderEpoch,
        occurredAt: Date.now(),
        payload: { summary },
        diagnostics: { recoveredFromWorkerSession: sessionFile },
      });
      if (provisional?.provisional) {
        const correctionId = createLeaderEventId(identity, "outcome_corrected", provisional.eventId, { declarationEventId: eventId });
        this.appendLifecycleFact({
          schemaVersion: 4, ...identity, eventId: correctionId, kind: "outcome_corrected",
          sourceLeaderEpoch: this.leaderEpoch,
          occurredAt: Date.now(),
          payload: { provisionalEventId: provisional.eventId, declarationEventId: eventId, summary: `Outcome corrected: ${summary}` },
        });
      }
    } catch (error) {
      worker.lastNote = `finish recovery persistence failed: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    }
    worker.terminalStatus = status;
    worker.terminalSummary = summary;
    const recoveredAttempt = this.lifecycleStore?.attempt(worker.workerInstanceId);
    if (recoveredAttempt) this.beginSettledAttemptEffects(recoveredAttempt);
    if (this.mesh && worker.durableMeshId) {
      this.mesh.tell(worker.durableMeshId, createLeaderPersistedAckEnvelope({
        teamId: this.teamId!, leaderEpoch: this.leaderEpoch, workerId: worker.workerId,
        attemptId: worker.workerInstanceId, seq: ++this.leaderAckSeq, eventId,
      }));
    }
    this.schedulePendingDelivery(true);
    return true;
  }

  private async handleWorkerExit(
    name: string,
    worker: WorkerHandle,
    exitCode: number | null,
    observedDead = false,
    signal?: string,
  ) {
    if (!this.ctx) return;
	const handlingSessionId = this.factWriter?.coordinatorSessionId;
	if (worker.spawnConfig?.coordinatorSessionId && worker.spawnConfig.coordinatorSessionId !== handlingSessionId) return;
    // Guard: if this worker was explicitly killed and already removed from the map,
    // do NOT re-add it. The exit handler fires asynchronously after kill() deletes
    // the worker — re-adding creates a zombie that persists forever. (RC-A4)
    if (worker.status === "killed" || worker.killedAt) return;
    if (!this.workers.has(name)) {
      this.workers.set(name, worker);
    }
    if (this.lifecycleStore?.attempt(worker.workerInstanceId)?.process.phase === "exited") return;

    // Bun bug: fires child.on("exit") prematurely for workers 2+ in rapid spawns.
    // The process is actually still alive and running. If we detect it's alive,
    // bail out — the REAL exit event will fire when the process truly exits.
    if (!observedDead && this.isAttemptProcessAlive(worker)) {
      // Bun can fire child "exit" prematurely; the process is still alive. The
      // real exit event is NOT guaranteed to fire again, so actually schedule a
      // bounded re-check instead of hoping (a dropped exit = a coordinator that
      // never learns its worker finished).
      const attempts = (worker.exitRecheckAttempts ?? 0) + 1;
      worker.exitRecheckAttempts = attempts;
      if (attempts <= 30) {
        setTimeout(() => void this.handleWorkerExit(name, worker, exitCode, false, signal), 2000);
      }
      return;
    }
    // v1c: the incarnation is confirmed dead — free its activation lease so a
    // resume/revive of this session can re-acquire (recovery below re-acquires a
    // fresh lease; a terminal worker leaves no leftover).
    releaseWorkerActivation(worker);

    if (!this.lifecycleStore?.attempt(worker.workerInstanceId)) {
      this.upsertV2WorkerFromHandle(worker);
    }

    // Stop watching FIRST — before any async work — to prevent race with handleTicketChange
    this.unwatchWorker(name);

    this.recordProcessExit(worker, exitCode, Date.now(), signal);

    // A worker can persist its declaration immediately before the process exit
    // while the mesh envelope or application ack is still in flight.
    await new Promise((resolve) => setTimeout(resolve, FINISH_EXIT_SETTLE_MS));
	if (this.factWriter?.coordinatorSessionId !== handlingSessionId) return;
    if (!worker.terminalStatus) this.recoverPendingWorkerFinish(worker);

    // Read ticket to get final state
    let lastNote = worker.lastNote ?? "(no notes left by worker)";
    let ticketClosed = false;
    try {
      const maiExitResult = await this.pi.exec(getMaiBin(), ["--json", "show", worker.ticketId], {
        cwd: this.ctx.cwd,
        timeout: 5000,
      });
      const ticket = parseMaiShow(maiExitResult.stdout ?? "");
      ticketClosed = ticket.status === "closed" || ticket.status === "done";
      lastNote = ticket.notes.at(-1)?.text ?? lastNote;
    } catch {
      // mai read failed — proceed with what we have
    }
	if (this.factWriter?.coordinatorSessionId !== handlingSessionId) return;

    const assessment = assessWorkerExit(worker, exitCode, ticketClosed, lastNote);
    const classification = assessment.classification;
    if (assessment.reason) {
      lastNote = assessment.reason;
    }

    // Pull session diagnostics for any exit class where the cause is opaque to the
    // leader. Failure: always — used for crash reports + auto-recovery routing.
    // Warning without explicit team_finish: also — surfaces stopReason / last error / last
    // failing tool so the coordinator does not have to guess (e.g. "context cap" inferences
    // that are not actually what the leader observed). Done / quit (explicit) need nothing
    // because the worker chose its own summary via team_finish.
    const isAmbiguousWarning = classification === "warning" && !assessment.explicitTerminal;
    const diagnostics = classification === "failure" || isAmbiguousWarning
      ? readSessionDiagnostics(worker.sessionDir)
      : "";
    if (isAmbiguousWarning && diagnostics) {
      // Fold diagnostics into the warning message so the team-event content carries the
      // real reason ("stopReason: aborted" / "error: ..." / etc.) instead of just the
      // generic "worker exited without explicit team_finish" string.
      lastNote = `${lastNote}${diagnostics}`;
    }

    // Settle the exited attempt before any retry creates the next attempt. The
    // retry is a new process attempt, never a rewrite of the failed history.
    this.recordExitAssessment(worker, Date.now(), { detail: lastNote });

    if (classification === "failure" && (worker.recoveryAttempts ?? 0) < 1) {
      // Try the malformed-tool-JSON classifier first; if it doesn't match, try the
      // empty-aborted-first-turn stream flake. Both reuse the SAME bounded path
      // (recoveryAttempts < 1 IS the cascade guard — at most one auto-retry per
      // worker, then it gives up). The stream-abort classifier is skipped when the
      // session ended with an unresolved compaction (that has its own resume block
      // below) so the two recovery paths never overlap.
      const toolRetry = getRecoverableToolRetry(diagnostics);
      const streamAbort = !toolRetry && !endedWithUnresolvedCompaction(worker.sessionDir)
        ? getRecoverableStreamAbort(diagnostics)
        : null;
      const recovery = toolRetry ?? streamAbort;
      const isStreamAbortRetry = !!streamAbort;
      if (recovery) {
        // Regenerate workerInstanceId so the v2 reducer classifies the resumed
        // attempt from spawn_started only, not from the prior process_exit fact
        // (same pattern as the compaction auto-resume below and the no-session
        // respawn at line ~2011). Without this, v2 lifecycle stays "failed"
        // even though the new pi process is spawning.
        const child = this.resumeAsNewAttempt(worker, recovery.prompt);
        if (!child) return;
        {
          worker.recoveryAttempts = (worker.recoveryAttempts ?? 0) + 1;
          worker.routeState = "pending";
          worker.durableMeshId = undefined;
          worker.lastActivityAt = Date.now();
          worker.lastProcessActivityAt = Date.now();
          worker.lastNote = `AUTO-RETRY: ${recovery.error.slice(0, 120)}`;
          this.upsertV2WorkerFromHandle(worker);
          this.recordProcessStart(worker, Date.now(), child.pid ?? worker.pid);

          const retryNoteText = isStreamAbortRetry
            ? `AUTO-RETRY: previous turn produced no output — the model stream aborted/errored before any content or tool calls (${recovery.error}). Retrying once with a continuation prompt.`
            : `AUTO-RETRY: previous turn failed before tool execution due to malformed JSON tool arguments (${recovery.error}). Retrying once with escape guidance.`;
          await this.pi.exec(
            getMaiBin(),
            [
              "add-note",
              worker.ticketId,
              retryNoteText,
            ],
            { cwd: this.ctx.cwd, timeout: 5000 },
          ).catch(() => {});

          this.childProcesses.set(name, child);
          child.on("exit", (code, signal) => {
            worker.exitCode = code;
            const attempt = getCurrentAttempt(worker);
            if (attempt) attempt.exitCode = code;
            void this.handleWorkerExit(name, worker, code, false, signal ?? undefined);
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
          const retryEventContent = isStreamAbortRetry
            ? `${ICONS.warn} ${workerTag(worker)}:\nauto-retrying once after empty/aborted first-turn stream response: ${recovery.error}`
            : `${ICONS.warn} ${workerTag(worker)}:\nauto-retrying once after malformed tool JSON: ${recovery.error}`;
          this.pi.sendMessage(
            {
              customType: "team-event",
              content: retryEventContent,
              display: true,
            },
            { deliverAs: "followUp", triggerTurn: false },
          );
          return;
        }
      }
    }

    // ── Auto-resume after mid-turn compaction ────────────────────────
    // `pi -p` (print mode) is one-shot: an aborted assistant message exits 1.
    // Pi auto-compaction aborts the in-flight LLM request to free context,
    // writes a CompactionEntry to the session, and then in interactive mode
    // continues with the summarized context. In print mode there is no
    // continuation — the abort fires print mode's "stopReason aborted →
    // exitCode 1" branch (modes/print-mode.js) before the compacted session
    // can be used. The session is correctly compacted on disk; the surrounding
    // process just dies. Resume the worker once with a continuation prompt.
    //
    // Detection: structural — session tail ends with a CompactionEntry that
    // is after the last assistant message AND that message had
    // stopReason=aborted. This is the exact compaction-died-after-write
    // shape. Anything else (real errors, normal turn end, explicit
    // team_finish) falls through.
    if (
      isAmbiguousWarning
      && (worker.recoveryAttempts ?? 0) < 1
      && endedWithUnresolvedCompaction(worker.sessionDir)
    ) {
      const resumePrompt = [
        "Your previous turn was auto-compacted mid-flight.",
        "Pi auto-compaction aborts the in-flight LLM request to free context, then writes a CompactionEntry to the session — that is what just happened. Your session is now compacted; previous progress is preserved in the summary.",
        "Continue the work you started. Use team_comment to report progress as needed.",
        "When you are done, call team_finish(status=\"done\", summary=...). If you cannot continue, call team_finish(status=\"quit\", summary=...). team_finish is the authoritative terminal signal — do not exit silently.",
      ].join("\n");
      // Regenerate the worker instance id so the v2 attempt for this resume is
      // distinct from the original attempt's facts (which include process_exit).
      // resumeWorker pushes onto handle.attempts using the current instance id;
      // upsertV2WorkerFromHandle then creates a fresh v2 attempt under that id,
      // and the reducer classifies it from spawn_started only — not from the
      // prior exit. Mirrors the no-session respawn pattern at line ~2011.
      const child = this.resumeAsNewAttempt(worker, resumePrompt);
      if (!child) return;
      {
        worker.recoveryAttempts = (worker.recoveryAttempts ?? 0) + 1;
        worker.routeState = "pending";
        worker.durableMeshId = undefined;
        worker.lastActivityAt = Date.now();
        worker.lastProcessActivityAt = Date.now();
        worker.lastNote = "AUTO-RESUME: continuing after mid-turn auto-compaction";
        this.upsertV2WorkerFromHandle(worker);
        this.recordProcessStart(worker, Date.now(), child.pid ?? worker.pid);

        await this.pi.exec(
          getMaiBin(),
          [
            "add-note",
            worker.ticketId,
            "AUTO-RESUME: previous turn aborted mid-flight by pi's auto-compaction (print-mode `pi -p` exits 1 on aborted stopReason before the compacted session can be reused). Session is compacted on disk; resuming once with a continuation prompt.",
          ],
          { cwd: this.ctx.cwd, timeout: 5000 },
        ).catch(() => {});

        this.childProcesses.set(name, child);
        child.on("exit", (code, signal) => {
          worker.exitCode = code;
          const attempt = getCurrentAttempt(worker);
          if (attempt) attempt.exitCode = code;
          void this.handleWorkerExit(name, worker, code, false, signal ?? undefined);
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
            content: `${ICONS.warn} ${workerTag(worker)}:\nauto-resuming once after mid-turn compaction (print-mode aborted before continuation)`,
            display: true,
          },
          { deliverAs: "followUp", triggerTurn: false },
        );
        return;
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
    if (classification === "failure" && (worker.recoveryAttempts ?? 0) < 1) {
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
        // A fresh retry is a new canonical attempt. Persist its intent before
        // session-file creation, revive-descriptor writes, or process spawn.
        const workerInstanceId = crypto.randomUUID();
        const config = {
          ...worker.spawnConfig,
          workerId: worker.workerId,
          workerInstanceId,
          // A respawn is a new attempt and must not reuse the failed attempt's
          // session directory. Reuse would mix diagnostics and pending-finish
          // evidence across attempt identities.
          sessionDir: path.join(
            worker.spawnConfig.repoRoot,
            ".pi",
            "sessions",
            "teams-workers",
            `team-${worker.name}-${worker.ticketId}-${workerInstanceId}`,
          ),
        };
        const workerSessionFile = config.sessionMode?.kind === "fork" || config.sessionMode?.kind === "resume"
          ? config.sessionMode.sessionFile
          : path.join(config.sessionDir, "session.jsonl");
        this.recordSpawnRequested(config, workerSessionFile);
        let spawned: ReturnType<typeof spawnWorker>;
        try {
          spawned = spawnWorker(config);
        } catch (error) {
          this.recordStartupFailure({
            coordinatorSessionId: this.factWriter!.coordinatorSessionId,
            teamId: this.teamId!,
            workerId: config.workerId,
            attemptId: config.workerInstanceId,
          }, error instanceof Error ? error.message : String(error));
          return;
        }
        const { process: child, handle: newHandle } = spawned;

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
        worker.durableMeshId = undefined;
        worker.spawnedAt = Date.now();
        worker.lastActivityAt = Date.now();
        worker.lastProcessActivityAt = Date.now();
        const reason = sessionDirGone
          ? `session directory was destroyed externally after ${(runtimeMs / 1000).toFixed(1)}s`
          : `process exited during the startup window (<${(STARTUP_WINDOW_MS / 1000).toFixed(0)}s) before creating a session file`;
        worker.lastNote = `AUTO-RESPAWN: ${reason}, retrying once`;
        worker.spawnConfig = config;
        this.upsertV2WorkerFromHandle(worker);
        this.recordProcessStart(worker, Date.now(), child.pid ?? worker.pid);

        await this.pi.exec(
          getMaiBin(),
          ["add-note", worker.ticketId, `AUTO-RESPAWN: ${reason}. Respawning once.`],
          { cwd: this.ctx.cwd, timeout: 5000 },
        ).catch(() => {});

        this.childProcesses.set(name, child);
        child.on("exit", (code, signal) => {
          worker.exitCode = code;
          const attempt = getCurrentAttempt(worker);
          if (attempt) attempt.exitCode = code;
          void this.handleWorkerExit(name, worker, code, false, signal ?? undefined);
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

    worker.ticketStatus = ticketClosed ? "closed" : worker.ticketStatus;
    worker.lastNote = lastNote;
    worker.lastActivityAt = Date.now();

    this.projectV2WorkerRuntime(name);
	const canonicalAttempt = this.lifecycleStore?.attempt(worker.workerInstanceId);
	const canonicalStatus = canonicalAttempt ? attemptStatus(canonicalAttempt) : "unknown";
	const logicalRoute = this.lifecycleStore?.projection().workers.get(worker.workerId)?.route;
	worker.routeState = logicalRoute ?? "dead";
    worker.durableMeshId = undefined;
	// Build crash diagnostics before cleanup can remove the worker worktree.
	const crashReport = canonicalStatus === "failed" ? buildWorkerCrashReport(worker, exitCode) : "";

    // Cleanup: auto-commit dirty files, preserve success/warning branches, and
    // keep ambiguous warning worktrees on disk so failed terminal signaling does
    // not destroy post-mortem evidence.
    await this.closeTicketWithEffect(worker).catch(() => {});
    const cleanupResult = await this.cleanupWithEffect(
      worker,
      canonicalAttempt ? attemptPreservePolicy(canonicalAttempt) : { preserveBranch: false, preserveWorktree: false },
    );

	if (canonicalStatus === "completed") {
      const branch = `teams/${worker.name}/${worker.ticketId}`;
      const doneBranch = `${branch}.done`;
      const hasMergeableWork = cleanupResult?.branchHasMergeableWork;
      const mergeHint = hasMergeableWork
        ? `\n📌 Branch "${doneBranch}" preserved — merge when ready: git merge ${doneBranch}`
        : "";
      this.notifyLLM({
        type: "completed",
        worker: { ...worker },        result: `${lastNote}${mergeHint}`,
      });
	} else if (canonicalStatus === "warning") {
      const warningHint = cleanupResult?.worktreePreserved && worker.worktreePath
        ? `\n📌 Worktree preserved for inspection: ${worker.worktreePath}`
        : "";
      this.notifyLLM({
        type: "warning",
        worker: { ...worker },
        reason: `${lastNote}${warningHint}`,
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
    const incarnationStartedAt = worker.attempts?.at(-1)?.spawnedAt ?? worker.spawnedAt;
    const pidReused = isReusedWorkerPid(snapshot, incarnationStartedAt, now);
    if (!snapshot.rootAlive || pidReused) {
      if ((worker.status === "running" || worker.status === "spawning") && !isTerminalV2Lifecycle(this.getV2WorkerLifecycle(name))) {
        // observedDead bypasses handleWorkerExit's process.kill(pid,0) guard:
        // for PID reuse that guard sees the unrelated replacement process alive.
        void this.handleWorkerExit(name, worker, worker.exitCode ?? 0, true);
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
        const first = !worker.lastStuckWarningAt;
        worker.lastStuckWarningAt = now;
		const identity = this.identityFor(worker);
		const cooldownIndex = this.lifecycleStore?.attempt(worker.workerInstanceId)?.stuckCount ?? 0;
		const eventId = createLeaderEventId(identity, "stuck", `stuck:${cooldownIndex}`, { cooldownIndex });
		this.appendLifecycleFact({
		  schemaVersion: 4, ...identity, eventId, kind: "stuck", sourceLeaderEpoch: this.leaderEpoch,
		  occurredAt: now,
		  payload: { cooldownIndex, idleSeconds: Math.floor(Math.min(idle.heartbeatIdleMs, idle.processIdleMs) / 1000) },
		});
        this.notifyLLM({
          type: "stuck",
          worker: { ...worker },
          idleSeconds: Math.floor(Math.min(idle.heartbeatIdleMs, idle.processIdleMs) / 1000),
          first,
		  lifecycleEventId: eventId,
		  attemptId: worker.workerInstanceId,
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

    // ── Phase 1: Immediate synchronous teardown ──────────────────────────
    // Everything here is synchronous and fast. No await, no throws.
    this.recordKilledAssessment(worker, Date.now());
    worker.status = "killed";
    worker.routeState = "dead";
    worker.durableMeshId = undefined;
    worker.killedAt = Date.now();
    // v1c: free the activation lease so a standard revive of this durable session
    // can re-acquire immediately (orphan = kill + standard-revive).
    releaseWorkerActivation(worker);

    // Remove from map FIRST — prevents handleWorkerExit zombie re-add (RC-A4)
    // and ensures widget/polling no longer see this worker.
    this.workers.delete(workerName);
    const child = this.childProcesses.get(workerName);
    this.childProcesses.delete(workerName);
    this.meshDelivered.delete(workerName);
    this.clearPendingAmbientChat(workerName);

    // Stop activity monitor + cancel any pending lifecycle timers
    this.unwatchWorker(workerName);
    this.cancelWorkerTimers(workerName);

    // Signal disposal to active subscriptions
    this.disposeSubscriptionsForWorker(workerName);

    // Persist cleared state immediately — even if background cleanup fails (RC-B1)
    this.renderWidget();

    // ── Phase 2: Fire-and-forget background cleanup ──────────────────────
    // Kill the process, close the ticket, clean worktree. All best-effort.
    // Never blocks the caller and never throws back into kill().
    // Defer the cleanup to the next macrotask. Process-birth verification may
    // invoke a synchronous OS snapshot; entering that work before this async
    // method resolves would make the public kill hot path block on `ps`.
    setTimeout(() => { void this.backgroundCleanup(workerName, worker, child); }, 0);
  }

  /**
   * Best-effort background cleanup after a worker is killed.
   * Kills the child process, closes the mai ticket, and cleans up the worktree.
   * All operations are fire-and-forget — never throws.
   */
  private async backgroundCleanup(
    workerName: string,
    worker: WorkerHandle,
    child: ChildProcess | undefined,
  ): Promise<void> {
    try {
      // Kill the child process — try both the ChildProcess reference and the
      // worker's PID directly (restored workers may not have a ChildProcess ref).
      const pid = child?.pid ?? worker.pid;
      if (pid && pid > 0) {
		worker.pid = pid;
		await this.terminateProcessWithEffect(worker, "coordinator_kill").catch(() => {});
		for (let attempt = 0; attempt < 25 && this.isAttemptProcessAlive(worker); attempt++) {
		  await new Promise((resolve) => setTimeout(resolve, 200));
		}
		if (this.isAttemptProcessAlive(worker)) return;
		if (this.lifecycleStore?.attempt(worker.workerInstanceId)?.process.phase !== "exited") {
		  this.recordProcessExit(worker, worker.exitCode ?? null);
		}
      }

      // Close mai ticket (best-effort, 5s timeout)
      if (this.ctx) {
        await this.closeTicketWithEffect(worker).catch(() => {});
        await this.cleanupWithEffect(worker, {
          preserveBranch: true,
          preserveWorktree: false,
        });
      }
    } catch {
      // Swallow everything — this is background best-effort cleanup
    }
  }

  /** Cancel any pending setTimeout-based timers for a worker. */
  private workerTimers = new Map<string, ReturnType<typeof setTimeout>[]>();
  private cancelWorkerTimers(workerName: string) {
    const timers = this.workerTimers.get(workerName);
    if (timers) {
      for (const t of timers) clearTimeout(t);
      this.workerTimers.delete(workerName);
    }
  }

  private trackWorkerTimer(workerName: string, timer: ReturnType<typeof setTimeout>) {
    const arr = this.workerTimers.get(workerName) ?? [];
    arr.push(timer);
    this.workerTimers.set(workerName, arr);
  }

  async killAll(): Promise<void> {
    // Parallel kill with per-worker error isolation (RC-A6)
    const names = [...this.workers.keys()];
    await Promise.allSettled(names.map(name => this.kill(name)));
    this.renderWidget();
  }

  getWorkers(): WorkerHandle[] {
    this.pruneStaleRecoveredWorkers();
    return [...this.workers.values()];
  }

  hasLifecycleAttempt(name: string, ticketId: string): boolean {
    return [...(this.lifecycleStore?.projection().attempts.values() ?? [])]
      .some((attempt) => attempt.name === name && attempt.ticketId === ticketId);
  }

  getLifecycleProjectionRecord(): { teamId: string; coordinatorSessionId: string; leaderEpoch: string; storage: { status: "ok" | "degraded"; error?: string }; workers: Record<string, unknown>; attempts: Record<string, AttemptState> } | null {
    const projection = this.lifecycleStore?.projection();
    if (!projection || !this.teamId) return null;
    return {
      teamId: this.teamId,
      coordinatorSessionId: projection.coordinatorSessionId,
      leaderEpoch: this.leaderEpoch,
	  storage: this.factWriter?.storageDegraded
		? { status: "degraded", error: this.factWriter.storageError?.message }
		: { status: "ok" },
      workers: Object.fromEntries([...projection.workers].map(([id, worker]) => [id, structuredClone(worker)])),
      attempts: Object.fromEntries([...projection.attempts].map(([id, attempt]) => [id, structuredClone(attempt)])),
    };
  }

  getV2WorkerLifecycle(workerName: string): WorkerLifecycleState | null {
    const logicalWorker = this.lifecycleStore?.workerByName(workerName);
    const attempt = this.lifecycleStore?.currentAttempt(workerName);
    if (!attempt) return null;
    if (logicalWorker?.route === "resumable") return "resumable";
    const status = attemptStatus(attempt);
    if (status === "completed") return "done";
    if (status === "warning") return "warning";
    if (status === "failed") return "failed";
    if (status === "killed") return "killed";
    if (attempt.process.phase === "exited") return "finishing";
    if (attempt.process.phase === "running") return "running";
    return "spawning";
  }

  getV2CurrentSessionMode(workerName: string): import("./v2/protocol.ts").WorkerSessionMode | null {
    return this.lifecycleStore?.currentAttempt(workerName)?.sessionMode ?? null;
  }

  getAttemptHistory(input: { attemptId?: string; name?: string; status?: string; start?: number; end?: number }): AttemptState[] {
    return this.lifecycleStore?.history(input).map((attempt) => structuredClone(attempt)) ?? [];
  }

  getCurrentAttemptId(name: string): string | undefined {
    return this.lifecycleStore?.currentAttempt(name)?.attemptId;
  }

  /** Current live workers — used by teams.on to check for already-terminal
   *  targets and by general lookups. Prunes stale "spawning"/"running" recovered
   *  worker entries on access. */
  getWorker(name: string): WorkerHandle | undefined {
    this.pruneStaleRecoveredWorkers();
    return this.workers.get(name);
  }

  private pruneStaleRecoveredWorkers() {
    const now = Date.now();
    let pruned = false;
    for (const [name, worker] of this.workers) {
      if (worker.status !== "spawning" && worker.status !== "running") continue;
      if (this.isAttemptProcessAlive(worker)) continue;
      if (now - worker.spawnedAt < TeamLeader.STALE_RESTORE_PRUNE_MS) continue;

      let hasMeaningfulSession = false;
      try {
        const sessionFile = this.resolveWorkerSessionFile(worker);
        if (sessionFile && fs.existsSync(sessionFile) && fs.statSync(sessionFile).size > 0) {
          hasMeaningfulSession = true;
        }
      } catch {}
      if (hasMeaningfulSession) continue;

      // Never fabricate a presentation-only failure. Let the canonical exit
      // path append process/assessment facts and update the projection.
      void this.handleWorkerExit(name, worker, worker.exitCode ?? null, true);
      pruned = true;
    }
    // Persist prune results so reload doesn't restore the same stale workers again (RC-B3)
    if (pruned) {
      this.renderWidget();
    }
  }

  private scheduleWorkerCleanup(workerName: string, expectedTicketId: string, expectedSpawnedAt: number) {
    const timer = setTimeout(() => {
      this.workerTimers.delete(workerName); // self-clean
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
      }
    }, 180_000);
    this.trackWorkerTimer(workerName, timer);
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

  /**
   * Subscribe to the PollEvent stream. Listener receives a wrapped TeamsEvent
   * carrying DOM-style preventDefault() / stopPropagation() methods. Runs
   * synchronously inside notifyLLM, BEFORE the existing dedupe/queue/turn-trigger
   * logic, so subscribers see every event.
   *
   * Listener contract:
   *   - Call event.preventDefault() to suppress the leader's default
   *     notifyLLM batch for this event (no coordinator turn trigger).
   *   - Call event.stopPropagation() to stop later subscription listeners
   *     from seeing the event in the same dispatch pass.
   *
   * Listener errors are isolated — a throwing listener cannot break the event
   * pipeline for other listeners or for notifyLLM itself.
   *
   * Returns an unsubscribe function. Always call it when done to avoid leaks.
   */
  subscribeToEvents(listener: (event: TeamsEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /** Replay terminal history from the canonical reducer, independent of live handles. */
  getCurrentTerminalEvent(name: string, type: PollEvent["type"] | "terminal", attemptId?: string): PollEvent | null {
	const targetAttempt = attemptId
	  ? this.lifecycleStore?.attempt(attemptId)
	  : this.lifecycleStore?.currentAttempt(name);
	if (!targetAttempt || targetAttempt.name !== name) return null;
	const status = attemptStatus(targetAttempt);
	const authoritativeType = status === "completed"
	  ? "completed"
	  : status === "warning"
		? "warning"
		: status === "failed" || status === "killed"
		  ? "failed"
		  : null;
	if (!authoritativeType || (type !== "terminal" && type !== authoritativeType)) return null;
    const events = [...(this.lifecycleStore?.projection().actionableEvents.values() ?? [])].reverse();
    for (const lifecycle of events) {
	  if (lifecycle.name !== name || lifecycle.attemptId !== targetAttempt.attemptId) continue;
      if (lifecycle.type === "stuck") continue;
      const attempt = this.lifecycleStore?.attempt(lifecycle.attemptId);
      if (!attempt) continue;
      const eventType = lifecycle.type === "completed"
        ? "completed"
        : lifecycle.type === "warning"
          ? "warning"
          : lifecycle.type === "outcome_corrected"
            ? (attempt.declaration?.kind === "done" ? "completed" : "warning")
            : "failed";
	  if (eventType !== authoritativeType) continue;
      const worker = this.workers.get(name) ?? this.projectedHandle(attempt);
      if (eventType === "completed") return { type: "completed", worker, result: lifecycle.summary, lifecycleEventId: lifecycle.eventId, attemptId: lifecycle.attemptId };
      if (eventType === "warning") return { type: "warning", worker, reason: lifecycle.summary, lifecycleEventId: lifecycle.eventId, attemptId: lifecycle.attemptId };
      return { type: "failed", worker, reason: lifecycle.summary, lifecycleEventId: lifecycle.eventId, attemptId: lifecycle.attemptId };
    }
    return null;
  }

  private eventIdForPollEvent(event: PollEvent): string | undefined {
    if (event.lifecycleEventId) return event.lifecycleEventId;
    const attemptId = event.attemptId ?? event.worker.workerInstanceId;
    const candidates = [...(this.lifecycleStore?.projection().actionableEvents.values() ?? [])].reverse();
    return candidates.find((candidate) => {
      if (candidate.attemptId !== attemptId) return false;
      if (event.type === "stuck") return candidate.type === "stuck";
      const candidateAttempt = this.lifecycleStore?.attempt(candidate.attemptId);
      const candidateType = candidate.type === "completed"
        ? "completed"
        : candidate.type === "warning"
          ? "warning"
          : candidate.type === "outcome_corrected"
            ? (candidateAttempt?.declaration?.kind === "done" ? "completed" : "warning")
            : "failed";
      return event.type === candidateType;
    })?.eventId;
  }

  /** Host-owned synchronous wake for TeamsSubscription.wake(). */
  wakeFromSubscription(event: PollEvent, content: string): void {
    const eventId = this.eventIdForPollEvent(event);
    const marked = eventId ? `[teams-event:${eventId}] ${content}` : content;
    this.activeDelivery = eventId ? { eventIds: [eventId], content: marked } : null;
    this.pi.sendMessage(
      { customType: "team-event", content: marked, display: true, ...(eventId ? { details: { eventIds: [eventId] } } : {}) },
      { deliverAs: "followUp", triggerTurn: true },
    );
  }

  private pendingDelivery(): DeliveryBatch | null {
    if (!this.ctx || !this.lifecycleStore) return null;
    // All-tree scan: delivered once anywhere in this coordinator session = delivered.
    return buildPendingDelivery(this.lifecycleStore.projection(), this.ctx.sessionManager.getEntries());
  }

  private schedulePendingDelivery(triggerTurn: boolean): void {
    const batch = this.pendingDelivery();
    if (!batch) return;
    this.activeDelivery = batch;
    this.pi.sendMessage(
      { customType: "team-event", content: batch.content, display: true, details: { eventIds: batch.eventIds } },
      { deliverAs: "followUp", triggerTurn },
    );
  }

  prepareDeliveryForAgentRun(): { customType: string; content: string; display: boolean; details: { eventIds: string[] } } | undefined {
    // A host wake or scheduled delivery already queued this run's message.
    // Don't inject a second copy; events that became pending afterward are
    // scheduled after this run settles (completeAgentRun).
    if (this.activeDelivery) return undefined;
    const batch = this.pendingDelivery();
    this.activeDelivery = batch;
    if (!batch) return undefined;
    // The returned custom message is persisted into the session with these
    // details by the host. That persisted entry IS the delivery record —
    // deliveredTeamEventIds() folds it back on every pendingDelivery() scan.
    return { customType: "team-event", content: batch.content, display: true, details: { eventIds: batch.eventIds } };
  }

  completeAgentRun(): void {
    this.activeDelivery = null;
    if (this.pendingDelivery()) queueMicrotask(() => this.schedulePendingDelivery(true));
  }

  branchChanged(): void {
    if (this.pendingDelivery()) this.schedulePendingDelivery(true);
  }

  /** Register a disposal callback for a specific worker. Called when the worker
   *  is killed, so subscriptions can clean up without waiting for timeout. */
  subscribeToWorkerDisposal(workerName: string, cb: () => void): () => void {
    let set = this.workerDisposalCallbacks.get(workerName);
    if (!set) {
      set = new Set();
      this.workerDisposalCallbacks.set(workerName, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) this.workerDisposalCallbacks.delete(workerName);
    };
  }

  /** Fire all disposal callbacks for a worker (called from kill()). */
  private disposeSubscriptionsForWorker(workerName: string): void {
    const callbacks = this.workerDisposalCallbacks.get(workerName);
    if (!callbacks) return;
    for (const cb of callbacks) {
      try { cb(); } catch { /* best effort */ }
    }
    this.workerDisposalCallbacks.delete(workerName);
  }

  private notifyLLM(event: PollEvent) {
    const eventId = this.eventIdForPollEvent(event);
    const identified = eventId ? { ...event, lifecycleEventId: eventId, attemptId: event.worker.workerInstanceId } as PollEvent : event;
    if (eventId && this.dispatchedEventIds.has(eventId)) return;
    if (eventId) this.dispatchedEventIds.add(eventId);

    const wrapped = wrapPollEvent(identified);
    if (this.eventListeners.size > 0) {
      const listeners = [...this.eventListeners];
      for (const listener of listeners) {
        if (!this.eventListeners.has(listener)) continue;
        try { listener(wrapped); }
        catch (error) { console.warn("[teams] event listener threw:", error instanceof Error ? error.message : String(error)); }
        if (wrapped.propagationStopped) break;
      }
    }
    if (wrapped.defaultPrevented) return;
    if (event.type === "comment") return;

    if (eventId) {
      this.schedulePendingDelivery(true);
      return;
    }
    // Phase/alive events are live telemetry rather than lifecycle outcomes.
    if (event.type === "phase" || event.type === "alive") {
      this.pi.sendMessage(
        { customType: "team-event", content: formatPollEvent(event), display: true },
        { deliverAs: "followUp", triggerTurn: true },
      );
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
    case "phase":
      return `${ICONS.alive} ${tag}:\nphase → ${event.phase.payload.icon} ${event.phase.payload.stage}`;
    case "alive":
      return `${ICONS.alive} ${tag}:\nalive`;
  }
}
