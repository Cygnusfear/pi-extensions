/**
 * Code Mode extension for pi
 *
 * Provides a single `execute_code` tool that lets the LLM write JavaScript
 * calling available tools as typed async functions. More efficient than
 * direct tool calls for multi-step operations and complex logic.
 *
 * Inspired by: https://blog.cloudflare.com/code-mode/
 */

import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
  ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { keyHint } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "@sinclair/typebox";
import { getStableNickname } from "@pi-extensions/shared/session-nickname";
// Register rtk as an optional dependency at startup (side-effect import) so a fresh
// machine gets the "install rtk" hint via /deps + showMissingDeps. sandbox-tools
// (lazy-loaded) uses the same rtkDep.resolved for Bash() compaction.
import "../src/rtk-dep";
import fs from "node:fs";
// Eagerly start Shiki loading via relative path (must match require() in renderCall)
require("../../shared/src/tui-diff-renderer.ts");
import { registerSandboxFn } from "../../shared/src/sandbox-registry";
import { createOuijaExecutor } from "../../shared/src/ouija-core";
import {
  formatPendingConfirmsForAgent,
  pendingConfirmCount,
} from "../../shared/src/pending-interactions";
import {
  cachedToolReference,
  extendWithAllTools,
  rebuildCachedReference,
  setCodeModeManual,
} from "../src/tool-reference";
import { composeCodeModeSystemPrompt } from "../src/code-mode-manual";
import {
  createCodeModeSession,
  executeInSession,
  type CodeModeSession,
  type ExecutionDeps,
} from "../src/session-factory";
import {
  buildContextFooter,
  CONTEXT_GUARD_THRESHOLD,
  isContextGuardActive,
} from "../src/context-usage";
import { installCodeModeProcessGuard } from "../src/process-guard";
import {
  awaitDeferredSquash,
  type DeferredSquashContext,
  type DeferredSquashOptions,
} from "../src/deferred-squash";
import { formatProgressiveOutput } from "../src/progressive-output";

// =============================================================================
// Constants
// =============================================================================

// execute_code is UNBOUNDED by default. Callers opt into a deadline via params.timeout.
// session-factory only installs the timeout race when executionTimeoutMs is a positive number.
const SYNC_TIMEOUT_MS = 5_000; // 5s for parsing/setup

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

// The extension workspace compiles against the latest published host package,
// while this lifecycle fix lands alongside the next host API. Keep the staged
// surface explicit and hard-typed until that published dependency includes it.
type RegisterAgentSettled = (
  event: "agent_settled",
  handler: (
    event: { type: "agent_settled" },
    ctx: ExtensionContext & DeferredSquashContext,
  ) => Promise<void> | void,
) => void;
type SendUserMessageAndWait = (
  content: string,
  options?: { deliverAs?: "steer" | "followUp" },
) => Promise<void>;

function surfaceCodeModeInternalError(
  pi: ExtensionAPI,
  title: string,
  error: unknown,
): void {
  const sendMessage = (pi as unknown as {
    sendMessage?: (
      message: { customType: string; content: string; display?: boolean },
      options?: { deliverAs?: "steer" | "followUp"; triggerTurn?: boolean },
    ) => void;
  }).sendMessage;
  if (typeof sendMessage !== "function") return;

  const body = [
    "[CODE-MODE INTERNAL ERROR]",
    "",
    title,
    "",
    formatUnknownError(error),
  ].join("\n");
  try {
    const boundedBody = formatProgressiveOutput(body, {
      filePrefix: "pi-code-mode-crash",
    }).text;
    sendMessage(
      { customType: "code-mode-crash", content: boundedBody, display: true },
      { deliverAs: "followUp", triggerTurn: true },
    );
  } catch {
    // Do not fall back to console.error. In pi, stderr is a host/TUI error
    // channel; contained code-mode failures must surface as messages or stay
    // contained.
  }
}

// =============================================================================
// Local manual and compact system-prompt spine
// =============================================================================

// The full declarations remain a local, bounded manual. They must never be
// concatenated into every agent turn.
const CODE_MODE_MANUAL_SOURCE = fs.readFileSync(
  new URL("./code-mode-declarations.md", import.meta.url),
  "utf-8",
);
setCodeModeManual(CODE_MODE_MANUAL_SOURCE);

const CODE_MODE_SYSTEM_PROMPT = fs.readFileSync(
  new URL("./code-mode-prompt.md", import.meta.url),
  "utf-8",
);

// =============================================================================
// Agent Git Identity
// =============================================================================

/**
 * Derive a git identity from the agent's stable nickname for automatic commit attribution.
 * Uses @manada.dev as the email domain so agent commits are clearly distinguishable.
 * Falls back to model slug if no stable identity is available.
 */
function deriveAgentGitIdentity(
  model: { provider: string; id: string },
): { name: string; email: string } {
  const stableName = getStableNickname();
  if (stableName) {
    const slug = stableName.replace(/[^a-zA-Z0-9._-]/g, "-");
    return {
      name: stableName,
      email: slug + "@manada.dev",
    };
  }
  const slug = model.id.replace(/[^a-zA-Z0-9._-]/g, "-");
  return {
    name: model.id,
    email: slug + "@manada.dev",
  };
}

// =============================================================================
// Extension
// =============================================================================

const CODE_PREVIEW_LINES = 8;
const OUTPUT_PREVIEW_LINES = 15;

// Cache Shiki highlights — code never changes per tool call, avoid re-highlighting on ctrl+O toggle
const shikiCache = new Map<string, string[]>();

interface CodeModeDetails {
  duration: number;
  error?: string;
  lineCount: number;
  code: string;
  /** Only set when execute_code is fired with `async: true`. */
  jobId?: string;
  /** Only set when execute_code is fired with `async: true`. "running" while in flight. */
  asyncStatus?: "running";
}

// ── Async execute_code job tracking ─────────────────────────────────────────
//
// When the caller passes `async: true`, execute_code returns a jobId
// immediately and runs the code in the background. The result is delivered
// later as a follow-up turn via pi.sendMessage.
//
// asyncJobs holds the still-running jobs so executeCodeAsyncList /
// executeCodeAsyncKill can inspect / cancel them.
//
// pendingExecution is the mutex: every execute_code call awaits it before
// starting, so concurrent calls serialize on the shared vm.Context (only one
// runInContext at a time, no $-store races).

interface AsyncJobRecord {
  jobId: string;
  code: string;
  startedAt: number;
  abortController: AbortController;
  promise: Promise<void>;
}

const asyncJobs = new Map<string, AsyncJobRecord>();
let pendingExecution: Promise<void> | null = null;

function nextAsyncJobId(): string {
  // 6-hex random suffix — enough for human-readability and uniqueness within a process.
  const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return `exec-${hex}`;
}

function codePreview(code: string, max = 80): string {
  const trimmed = code.trim().split("\n")[0]?.trim() ?? "";
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

// Sync execute_code auto-promotes to async after this threshold. The TUI-freeze
// safety net: when an agent forgets to pass `async: true` for heavy work, the
// tool returns a "still running" stub at the threshold so the agent's turn
// ends and the TUI is freed. The bg work keeps going; result delivers as a
// follow-up turn when done. Override via PI_CODE_MODE_PROMOTE_MS env var.
const DEFAULT_SYNC_PROMOTE_THRESHOLD_MS = 60_000;
function getSyncPromoteThresholdMs(): number {
  const fromEnv = Number.parseInt(process.env.PI_CODE_MODE_PROMOTE_MS ?? "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_SYNC_PROMOTE_THRESHOLD_MS;
}

// When a blocking confirm dialog opens (e.g. git-safety popup), the agent's
// execute_code is stuck awaiting the popup. Waiting the full 60s before
// promoting means 60s of silence while the hooman is potentially in another
// tab and the agent has no idea a popup fired. Promote within ~3s of a
// pending confirm so the agent gets the explicit "blocked on confirm" stub
// quickly and can call notify() to pull the hooman in.
const CONFIRM_BLOCKED_PROMOTE_THRESHOLD_MS = 3_000;


// Code Execution Engine (persistent context)
// =============================================================================

function formatArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg === undefined) return "undefined";
  if (arg === null) return "null";
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}

// =============================================================================
// Session + execution — extracted into ./src/session-factory.ts.
//
// This extension keeps the singleton, the lifecycle/UX state (deferred squash,
// deferred checkout, contextSize cap, current ouija session file, context-guard
// toggle) and the dispatch/UI wrapper around `executeInSession`. The actual
// runtime (vm.Context, $-store, AST persist, console.wake, session API, runbook
// runner, bare-global hydration, vm.runInContext + Promise.race) lives in the
// factory module.
// =============================================================================

let session: CodeModeSession | null = null;
let contextSize: number | null = null; // null = send everything
let pendingCheckout: { targetId: string; enrichedMessage: string; backupTag?: string } | null = null;
let pendingSquash: DeferredSquashOptions | null = null;
let currentOuijaSessionFile: string | null = null;

// ── Context Guard ─────────────────────────────────────────────────────────────
// When context usage exceeds the threshold (default 94%), only context-management
// tools are allowed. The guard auto-disarms when usage drops back below threshold.
let contextGuardEnabled = true; // default on, toggle with /context-guard on|off

function getSession(): CodeModeSession {
  if (!session) session = createCodeModeSession();
  return session;
}

// Bind the $ store to a SESSION-SCOPED disk snapshot so it survives a
// reload_runtime / pi restart-with-resume. The `session` singleton above is
// module-level: on reload the module re-evaluates, `session` resets to null,
// and getSession() rebuilds an EMPTY store — silently wiping every $ var
// mid-session (the "$ flakiness"). bindPersistence() is idempotent and cheap,
// so we (re)assert the binding on every execute once the sessionManager (hence
// the durable, session-scoped path) is available. Best-effort: never break a
// run if the path can't be derived.
function bindStorePersistence(sess: CodeModeSession, ctx: unknown): void {
  try {
    const sessionFile: string | undefined = (ctx as any)?.sessionManager?.getSessionFile?.();
    if (!sessionFile) return;
    const storePath = sessionFile.endsWith(".jsonl")
      ? sessionFile.slice(0, -".jsonl".length) + ".code-mode-store.json"
      : sessionFile + ".code-mode-store.json";
    sess.store.bindPersistence(storePath);
  } catch {
    /* persistence is best-effort */
  }
}

// =============================================================================
// Tool Exclusivity — tools that remain as direct LLM tools
// =============================================================================

const PASSTHROUGH_TOOLS = new Set([
  "execute_code",
  // Conversation history
  "context_tag",
  "context_log",
  "context_checkout",
  // Supervisor
  "start_supervision",
  // Autoresearch
  "init_experiment",
  "run_experiment",
  "log_experiment",
  // VS Code integration
  "editor_open",
  "editor_highlight",
  "editor_reveal",
  "editor_state",
  // Mesh networking
  "mesh_tell",
  "mesh_ask",
  "mesh_broadcast",
  "mesh_peers",
  "mesh_view",
  "mesh_interrupt",
  "mesh_join_channel",
  "mesh_leave_channel",
  "mesh_chat",
  // Git AI attribution
  "git-ai",
  // Handbook
  "hotseat_handbook_update",
  "hotseat_handbook_read",
  // Session search
  "ouija",
  // Heredoc injection (bypasses code-mode JS escaping)
  "code_heredoc",
  // Async execute_code job management — must be callable while an async job
  // is in flight, so they bypass the per-session mutex (they don't touch the VM).
  "execute_code_async_list",
  "execute_code_async_kill",
]);

// Tools the LLM must NOT call directly — they exist only inside code-mode sandbox
const CODE_MODE_ONLY_TOOLS = new Set([
  "bash",
  "teams",
  "read",
  "write",
  "edit",
  "grep",
  "find",
  "ls",
  "apply_patch",
  "hash_read",
  "hash_edit",
  "web_search_brave",
  "code_search_brave",
  "context7_resolve",
  "context7_docs",
  "fff_find",
  "fff_grep",
  "fff_multi_grep",
  "WebFetch",
  "get_current_time",
  "tldr_semantic_search",
  "tldr_structure",
  "tldr_calls",
  "tldr_extract",
  "tldr_dead",
  "tldr_arch",
  "tldr_impact",
  "tldr_index_status",
]);

export default function (pi: ExtensionAPI) {
  const registerAgentSettled = pi.on.bind(pi) as unknown as RegisterAgentSettled;
  const sendUserMessageAndWait = pi.sendUserMessage.bind(pi) as unknown as SendUserMessageAndWait;
  // Process-level safety net: contain unhandled rejections / uncaught exceptions
  // from vm-context user code so the host pi process can't be taken out by a
  // background promise on $ that rejects with no .catch().
  installCodeModeProcessGuard(pi);

  // Enforce tool exclusivity: only execute_code + passthrough tools visible to LLM
  pi.on("session_start", () => {

    const all = pi.getAllTools();
    const allowed = all
      .filter((t) => PASSTHROUGH_TOOLS.has(t.name) || !CODE_MODE_ONLY_TOOLS.has(t.name))
      .map((t) => t.name);
    pi.setActiveTools(allowed);

    // Extend tool reference with all registered extension tools
    extendWithAllTools(pi);
    rebuildCachedReference();


  });

  // Register ouija sandbox fn — calls pi tool if available
  {
    const _hlExecute = createOuijaExecutor({
      getCurrentSessionFile: () => currentOuijaSessionFile,
    });

    let _bm25: any = null;
    try { _bm25 = require("../../shared/src/bm25.js"); } catch {}

    type Duration = { minutes?: number; hours?: number; days?: number; weeks?: number };
    function resolveDuration(d: Duration): number {
      return (d.minutes ?? 0) * 60_000 + (d.hours ?? 0) * 3_600_000 + (d.days ?? 0) * 86_400_000 + (d.weeks ?? 0) * 604_800_000 || 7 * 86_400_000;
    }
    function relativeAge(ms: number): string {
      const mins = Math.floor(ms / 60000);
      if (mins < 60) return mins + "m ago";
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + "h ago";
      return Math.floor(hrs / 24) + "d ago";
    }

    const HL_PRESETS: Record<string, any> = {
      tickets: { _preset: "tickets", fields: { title: 3, body: 1, tags: 2 }, extract: (item: any) => ({ title: item.title ?? item.name ?? (typeof item === "string" ? (item.match(/^#\s+(.+)/m)?.[1] ?? "") : ""), body: item.body ?? item.text ?? item.content ?? (typeof item === "string" ? item : ""), tags: Array.isArray(item.tags) ? item.tags.join(" ") : (item.tags ?? "") }) },
      session: { _preset: "session", fields: { label: 1.5, text: 1 }, extract: (item: any) => ({ label: item.role ?? item.label ?? "", text: item.content ?? item.text ?? (typeof item === "string" ? item : JSON.stringify(item)) }) },
      code: { _preset: "code", fields: { name: 4, path: 1, body: 1 }, extract: (item: any) => ({ name: item.name ?? item.function ?? "", path: item.path ?? item.file ?? "", body: item.body ?? item.text ?? item.content ?? (typeof item === "string" ? item : "") }) },
      docs: { _preset: "docs", fields: { path: 2, body: 1 }, extract: (item: any) => ({ path: item.path ?? item.file ?? item.name ?? "", body: item.body ?? item.text ?? item.content ?? (typeof item === "string" ? item : "") }) },
      logs: { _preset: "logs", fields: { text: 1 }, extract: (item: any) => ({ text: typeof item === "string" ? item : (item.text ?? item.message ?? JSON.stringify(item)) }) },
      lines: { _preset: "lines", fields: { text: 1 }, extract: (item: any) => ({ text: String(item) }) },
    };

    function enrichPipeHits(hits: any[], rawText: string): any {
      const r = hits as any;
      r.toString = () => rawText;
      r[Symbol.for("nodejs.util.inspect.custom")] = () => rawText;
      r.text = () => rawText;
      r.json = () => hits.map((h: any) => { const { rerank, limit, toString, ...rest } = h; return rest; });
      r.limit = (n: number) => { const s = hits.slice(0, Math.max(0, n)); return enrichPipeHits(s, s.map((h: any) => h.toString()).join("\n")); };
      r.rerank = (opts?: { recency?: Duration }) => {
        if (!opts) opts = {};
        const now = Date.now(); const hl = Math.max(1, opts.recency ? resolveDuration(opts.recency) : 7 * 86_400_000);
        const scored = hits.map((h: any) => { const ts = h.timestamp ?? now; const decay = Math.exp(-Math.max(0, now - ts) * Math.LN2 / hl); return { ...h, score: (h.score ?? 1) * decay, originalScore: h.score, recencyWeight: decay }; });
        scored.sort((a: any, b: any) => b.score - a.score);
        const raw = scored.map((h: any) => { const age = h.timestamp ? " · " + relativeAge(Date.now() - h.timestamp) : ""; return h.rawBlock ? h.rawBlock.replace(/━━━\s*$/, age + " ━━━") : h.toString(); }).join("\n\n");
        return enrichPipeHits(scored, raw);
      };
      return r;
    }

    async function hlPipe(data: any[], shape: any, query: string) {
      const bm25 = _bm25;
      if (!bm25) return enrichPipeHits([], "BM25 engine not available");
      const preset = !shape ? { fields: { text: 1 } } : typeof shape === "string" ? (HL_PRESETS[shape] ?? { fields: { text: 1 } }) : (shape._preset ? HL_PRESETS[shape._preset] : shape);
      const fields = preset?.fields ?? shape?.fields ?? { text: 1 };
      const extract = preset?.extract ?? ((item: any) => { const doc: any = {}; for (const k of Object.keys(fields)) doc[k] = typeof item === "string" ? item : String(item[k] ?? ""); return doc; });
      const docs = data.map((item: any, i: number) => ({ id: String(i), fields: extract(item, i) }));
      const index = bm25.buildBm25Index(docs, fields);
      if (typeof query !== "string" || !query.trim()) return enrichPipeHits([], "");
      const results = bm25.searchBm25(index, query, data.length);
      const hits = results.map((r: any) => {
        const i = parseInt(r.id); const item = data[i]; const extracted = extract(item, i);
        const preview = Object.values(extracted).filter(Boolean).join(" | ").slice(0, 200);
        const hit: any = { index: i, score: r.score, item, ...extracted, timestamp: item?.timestamp ? new Date(item.timestamp).getTime() : item?.modified ? new Date(item.modified).getTime() : undefined };
        hit.toString = () => `[${r.score.toFixed(1)}] #${i} ${preview}`;
        return hit;
      });
      return enrichPipeHits(hits, hits.map((h: any) => h.toString()).join("\n"));
    }

    async function hlSession(params: Record<string, unknown>) {
      if (!_hlExecute) return "Ouija: init failed";
      const exec = _hlExecute;
      const action = params.action as string;
      if (action === "grep" || action === "self" || action === "search") {
        const raw = (await exec(params as Parameters<typeof exec>[0])) ?? "";
        const hits: any[] = []; const sessionId = (params.session as string) || "self";
        if (action === "grep" || action === "self") {
          const lines = raw.split("\n"); let cur: any = null;
          for (const line of lines) {
            const m = line.match(/^\[#(\d+)\]\s*(.+)/);
            if (m) {
              if (cur) hits.push(cur);
              const label = m[2].trim();
              const tm = label.match(/^(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/i);
              let ts = Date.now();
              if (tm) { const d = new Date(); const [time, ampm] = tm[1].split(/\s+/); const [h, min, sec] = time.split(":").map(Number); let hour = h; if (ampm?.toUpperCase() === "PM" && hour !== 12) hour += 12; if (ampm?.toUpperCase() === "AM" && hour === 12) hour = 0; d.setHours(hour, min, sec, 0); ts = d.getTime(); }
              cur = { index: parseInt(m[1]), label, text: "", rawBlock: line, session: sessionId, timestamp: ts, expand: null as any };
            } else if (cur && line.startsWith("  ") && !line.includes("→ ouija")) { cur.text += (cur.text ? " " : "") + line.trim(); cur.rawBlock += "\n" + line; }
          }
          if (cur) hits.push(cur);
          for (const h of hits) {  h.toString = () => `[#${h.index}] ${h.label}\n  ${h.text.slice(0, 200)}`; }
        }
        if (action === "search") {
          const blocks = raw.split("━━━").filter(Boolean);
          for (let i = 1; i < blocks.length; i += 2) {
            const header = blocks[i]; const content = blocks[i + 1] ?? ""; const rawBlock = "━━━" + header + "━━━" + content;
            const idMatch = header.match(/([a-f0-9]{8})/); const scoreMatch = header.match(/\[(\d+\.?\d*)\]/); const nameMatch = header.match(/\]\s+(.+?)\s*·/); const isoMatch = header.match(/(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/);
            if (idMatch) {
              const entry: any = { session: idMatch[1], score: scoreMatch ? parseFloat(scoreMatch[1]) : 0, name: nameMatch?.[1]?.trim() ?? "", text: content.trim(), rawBlock, timestamp: isoMatch ? new Date(isoMatch[1]).getTime() : Date.now() };
              
              
              entry.toString = () => rawBlock;
              hits.push(entry);
            }
          }
        }
        return enrichPipeHits(hits, raw);
        }
        // view/list — raw string
        return (await exec(params as Parameters<typeof exec>[0])) ?? "";
    }

    const hlFn = async (...args: any[]) => {
      try {
        if (!args.length || args[0] == null) return enrichPipeHits([], "No input provided");
        if (Array.isArray(args[0])) return hlPipe(args[0], args[1] ?? { fields: { text: 1 } }, String(args[2] ?? ""));
        if (typeof args[0] !== "object") return enrichPipeHits([], "Expected array or { action, query } object");
        return hlSession(args[0] as Record<string, unknown>);
      } catch (e: any) { return "Ouija error: " + e.message; }
    };
    for (const [name, preset] of Object.entries(HL_PRESETS)) (hlFn as any)[name] = preset;
    registerSandboxFn("ouija", hlFn);

    // executeCodeAsyncList — inspect pending async execute_code jobs from inside a code block.
    registerSandboxFn("executeCodeAsyncList", () => {
      const now = Date.now();
      return [...asyncJobs.values()].map((j) => ({
        jobId: j.jobId,
        codePreview: codePreview(j.code),
        runtimeMs: now - j.startedAt,
      }));
    });

    // executeCodeAsyncKill — abort a runaway async job. Returns true if a job was killed.
    registerSandboxFn("executeCodeAsyncKill", (jobId: string) => {
      const job = asyncJobs.get(jobId);
      if (!job) return false;
      try { job.abortController.abort(new Error("Killed via executeCodeAsyncKill")); } catch { /* ignore */ }
      // Don't await; the .finally in the fire path will unregister + deliver the follow-up.
      return true;
    });
  }

  // Context window management — filter messages before LLM call
  pi.on("context", (event) => {
    if (contextSize !== null && event.messages.length > contextSize) {
      const sliced = event.messages.slice(-contextSize);
      // Pi internal roles: "user", "assistant", "toolResult"
      // Anthropic API requires: first msg is user, toolResults must match assistant toolCalls.
      // We must find a clean boundary that doesn't orphan toolCall/toolResult pairs.

      // Step 1: Find the first user message — that's our required start anchor.
      let startIdx = -1;
      for (let i = 0; i < sliced.length; i++) {
        if (sliced[i].role === "user") {
          startIdx = i;
          break;
        }
      }
      if (startIdx === -1) {
        // No user message in slice — can't form a valid sequence, send everything.
        return;
      }

      // Step 2: Walk forward from startIdx and build a valid sequence.
      // Collect toolCall IDs from each assistant, then verify following toolResults match.
      const result: typeof sliced = [sliced[startIdx]];
      for (let i = startIdx + 1; i < sliced.length; i++) {
        const msg = sliced[i];
        if (msg.role === "assistant") {
          // Accept this assistant. Collect its toolCall IDs (if any).
          const toolCallIds = new Set<string>();
          if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
              if (block.type === "toolCall" && block.id) {
                toolCallIds.add(block.id);
              }
            }
          }
          result.push(msg);
          if (toolCallIds.size > 0) {
            // Expect the next messages to be toolResults matching these IDs.
            // Collect all consecutive toolResults and verify they cover our toolCalls.
            const toolResults: typeof sliced = [];
            let j = i + 1;
            while (j < sliced.length && sliced[j].role === "toolResult") {
              toolResults.push(sliced[j]);
              j++;
            }
            // Check: do the toolResults cover ALL toolCall IDs?
            const resultIds = new Set(toolResults.map((tr: any) => tr.toolCallId));
            const allCovered = [...toolCallIds].every((id) => resultIds.has(id));
            if (allCovered) {
              // Complete pair — include all toolResults and continue from j.
              result.push(...toolResults);
              i = j - 1; // for loop will i++
            } else {
              // Incomplete pair — drop both the assistant and its toolResults.
              // Remove the assistant we just pushed.
              result.pop();
              // Skip the toolResults too.
              i = j - 1;
            }
          }
          // Assistant without toolCalls: fine, continue.
        } else if (msg.role === "toolResult") {
          // Orphaned toolResult (no preceding assistant with matching toolCall).
          // Skip it.
          continue;
        } else if (msg.role === "user") {
          result.push(msg);
        }
      }

      if (result.length === 0) {
        return; // Fallback: send everything
      }
      return { messages: result };
    }
  });

  // /escape_code_mode — user-facing escape hatch
  pi.registerCommand("escape_code_mode", {
    description: "Restore all tools for this session (disable sandbox restriction).",
    handler: async (_args, ctx) => {
      getSession().setEscaped(true);
      pi.setActiveTools(pi.getAllTools().map((t) => t.name));
      ctx.ui.notify(
        "Escape mode: all tools restored. Use /code_mode to re-enable sandbox.",
        "info",
      );
    },
  });

  // /code_mode — re-enable sandbox
  pi.registerCommand("code_mode", {
    description: "Re-enable code-mode sandbox (restrict tools to execute_code).",
    handler: async (_args, ctx) => {
      getSession().setEscaped(false);
      const allowed = pi
        .getAllTools()
        .filter((t) => PASSTHROUGH_TOOLS.has(t.name) || !CODE_MODE_ONLY_TOOLS.has(t.name))
        .map((t) => t.name);
      pi.setActiveTools(allowed);
      ctx.ui.notify("Sandbox mode: tools restricted to execute_code.", "info");
    },
  });

  // ── /context-guard command ────────────────────────────────────────────────
  pi.registerCommand("context-guard", {
    description: "Toggle context guard: at >94% context, block all non-essential tools. Usage: /context-guard on|off|status",
    handler: async (args, ctx) => {
      const sub = (args ?? "").trim().toLowerCase();
      const getUsage = (ctx as any).getContextUsage as (() => any) | undefined;
      const usage = getUsage ? getUsage() : null;
      const pct = usage?.percent?.toFixed(1) ?? "?";

      if (sub === "on") {
        contextGuardEnabled = true;
        ctx.ui.notify(`Context guard ENABLED (threshold ${(CONTEXT_GUARD_THRESHOLD * 100).toFixed(0)}%). Current: ${pct}%`, "info");
      } else if (sub === "off") {
        contextGuardEnabled = false;
        ctx.ui.notify(`Context guard DISABLED. Current: ${pct}%`, "info");
      } else {
        // status (default)
        const state = contextGuardEnabled ? "ON" : "OFF";
        const active = isContextGuardActive(contextGuardEnabled, getUsage) ? " 🚫 ACTIVE (context critical)" : "";
        ctx.ui.notify(`Context guard: ${state} (threshold ${(CONTEXT_GUARD_THRESHOLD * 100).toFixed(0)}%). Current: ${pct}%${active}`, "info");
      }
    },
  });

  // Hard guard: if LLM somehow calls a code-mode-only tool directly, redirect it
  pi.on("tool_call", async (event) => {
    if (!getSession().getEscaped() && CODE_MODE_ONLY_TOOLS.has(event.toolName)) {
      return {
        block: true,
        reason: `Tool '${event.toolName}' is only available inside execute_code. Use execute_code to call ${event.toolName}().`,
      };
    }
  });

  pi.registerTool({
    name: "execute_code",
    label: "Code Mode",
    description:
      "Execute JavaScript code with typed async functions for calling tools. " +
      "Use for multi-step operations, loops, data processing, and chaining tool calls. " +
      "Available functions: Bash, Read, Write, Edit, Glob, rg, fd, WebFetch, sleep, man, readImage, " +
      "mai, maiTicket, recall, memoryContext, memoryCreate, memoryUnfold, memoryStatus, " +
      "memorySubscribe, memoryUnsubscribe, memoryCheckUpdates, " +
      "braveSearch, braveCodeSearch, getCurrentTime, hashRead, hashEdit, applyPatch, " +
      "context7Resolve, context7Docs, fffFind, fffGrep, fffMultiGrep, " +
      "tldrSemanticSearch, tldrStructure, tldrCalls, tldrExtract, tldrDead, tldrArch, tldrImpact, tldrIndexStatus. " +
      "Python code execution via Python({ code, cwd?, timeout? }). " +
      "Background bash: bashBgStart, bashBgStatus, bashBgLogs, bashBgStop, bashBgList. " +
      "Team coordination: teams({ action, tasks?, name?, message?, ... }). " +
      "Also available: session.messages(), session.tokens(), session.tags(), session.tag(), session.save(), session.load(). " +
      "Namespaced callables: mesh.tell/ask/peers/view/broadcast/chat, editorOpen, editorState, gitAi. " +
      "Use console.log() to return results. Model-visible output is hard-capped; overflow is saved to /tmp with bounded Read guidance.",
    parameters: Type.Object({
      code: Type.String({
        description:
          "JavaScript code to execute. All tool functions are async (use await). " +
          "Use console.log() to output results. Errors are caught automatically.",
      }),
      timeout: Type.Optional(
        Type.Number({
          description:
            "Execution timeout in seconds. UNBOUNDED by default — no timeout race installed unless you set this. " +
            "Set to opt into a deadline (e.g. browser automation, untrusted code). Minimum 1 second when set.",
          promptGuidelines: [
            "Use man('ToolName') to see detailed help for any sandbox function.",
            "Use $ to persist data across code blocks — no time limit, only 150MB memory cap.",
            "Errors are non-fatal. $ survives. After an error, reference $.var to continue.",
            "Bash timeouts return { timedOut: true } instead of throwing.",
            "Prefer one large code block over many small execute_code calls.",
          ],
          minimum: 1,
        }),
      ),
      async: Type.Optional(
        Type.Boolean({
          description:
            "When true, return a jobId immediately and run the code in the background. The result is delivered " +
            "later as a follow-up turn (same channel as console.wake). Use for long-running work that shouldn't " +
            "block the TUI. Concurrent execute_code calls serialize on the shared VM context. Manage pending jobs " +
            "with executeCodeAsyncList() and executeCodeAsyncKill(jobId).",
        }),
      ),
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      // Unbounded by default. If params.timeout is set, honor exactly — no cap.
      // session-factory skips the timeout race entirely when timeoutMs is undefined.
      const timeoutMs = params.timeout ? params.timeout * 1000 : undefined;
      // ── Site 3 escape sync (pe-tk4s AC3 v4 patch — preserve setActiveTools side-effects) ──
      const sess = getSession();
      // Durable $ store: bind to the session-scoped snapshot so $ survives reload.
      bindStorePersistence(sess, ctx);
      const wantEscape = sess.store.proxy.__escaped === true;
      if (wantEscape !== sess.getEscaped()) {
        sess.setEscaped(wantEscape);
        if (wantEscape) {
          pi.setActiveTools(pi.getAllTools().map((t) => t.name));
        } else {
          const allowed = pi
            .getAllTools()
            .filter((t) => PASSTHROUGH_TOOLS.has(t.name) || !CODE_MODE_ONLY_TOOLS.has(t.name))
            .map((t) => t.name);
          pi.setActiveTools(allowed);
        }
      }

      // Capture current ouija session file for the in-block ouija executor.
      currentOuijaSessionFile = (ctx as any).sessionManager?.getSessionFile?.() ?? null;

      const model = (ctx as any).model as { provider: string; id: string } | undefined;

      // ── Per-session mutex ────────────────────────────────────────────────
      // The CodeModeSession shares one vm.Context. Concurrent runInContext
      // calls would race on the $ store and on injected globals. Serialize
      // every execute_code call (sync or async) on pendingExecution.
      //
      // For SYNC, the natural await of executeInSession satisfies this. For
      // ASYNC, the bg promise must replace pendingExecution so the next call
      // waits for it before starting.
      if (pendingExecution) {
        try { await pendingExecution; } catch { /* prior job already surfaced its error */ }
      }

      // Common deps builder — sync and async paths use the same shape.
      // `runtimeSignal` differs: sync uses the tool-call signal so /cancel
      // works; async uses a fresh controller so the work outlives the call.
      const buildDeps = (runtimeSignal: AbortSignal): ExecutionDeps => ({
        signal: runtimeSignal,
        cwd: ctx.cwd,
        model: model ?? { provider: "unknown", id: "unknown" },
        modelRegistry: (ctx as any).modelRegistry,
        executionTimeoutMs: timeoutMs,
        sessionManager: (ctx as any).sessionManager,
        // ctx is the host's typed ExtensionContext — getContextUsage is checked
        // against SandboxContextUsage structurally, no any/cast at this seam.
        getContextUsage: ctx.getContextUsage,
        // Live host model read — ctx.model is a getter on the host's extension
        // context, so this reflects a same-block model.switch() on the next read.
        // Do NOT substitute the captured per-call `model` snapshot above.
        getModel: () => ctx.model,
        setModel: (m: unknown) => pi.setModel(m as any),
        confirmFn: (ctx as any).ui?.confirm?.bind((ctx as any).ui) as
          | ((title: string, body: string) => Promise<boolean>)
          | undefined,
        compact: (ctx as any).compact?.bind(ctx),
        setLabel: (id: string, label: string | undefined) => pi.setLabel(id, label),
        abort: () => ctx.abort(),
        sendUserMessage: (content: string, options?: { deliverAs?: "steer" | "followUp" }) =>
          pi.sendUserMessage(content, options),
        sendMessage: (
          message: { customType: string; content: string; display?: boolean },
          options?: { deliverAs?: "steer" | "followUp"; triggerTurn?: boolean },
        ) => (pi as any).sendMessage?.(message, options),
        contextGuardEnabled,
        agentGitIdentity: model ? deriveAgentGitIdentity(model) : undefined,
        requestSquash: (options: DeferredSquashOptions) => {
          // Snapshot primitive values before the current vm turn ends. The
          // generated handoff must describe the exact state the caller froze,
          // not a mutable caller-owned options object.
          pendingSquash = {
            continue: options.continue,
            handoff: options.handoff && {
              text: options.handoff.text,
              source: options.handoff.source,
            },
          };
        },
        requestCheckout: (info: { targetId: string; enrichedMessage: string; backupTag?: string }) => {
          pendingCheckout = info;
        },
        setContextSize: (n: number | null) => {
          contextSize = n;
        },
      });

      // Build the text result body from an ExecutionResult. Shared by sync + async.
      const buildResultText = (output: string, error: string | undefined): string => {
        let text = output || "";
        if (error) {
          text += (text ? "\n\n" : "") + `Error: ${error}`;
        }
        if (!text) {
          text = "(no output — use console.log() to return results)";
        }
        const ctxFooter = buildContextFooter(ctx as any, {
          contextGuardEnabled,
          suppressBecauseCompactionScheduled: pendingSquash !== null,
        });
        if (ctxFooter) {
          text += "\n\n" + ctxFooter;
        }
        return text;
      };

      // ── ASYNC path ───────────────────────────────────────────────────────
      if (params.async) {
        const jobId = nextAsyncJobId();
        const startedAt = Date.now();
        // Fresh controller — the tool-call signal would fire when this execute
        // returns, killing the bg work instantly. We want the work to outlive.
        const bgAbort = new AbortController();
        // If the host explicitly aborts (e.g. session shutdown), propagate.
        if (signal) {
          const onHostAbort = () => bgAbort.abort(new Error("Host aborted execute_code session"));
          if (signal.aborted) onHostAbort();
          else signal.addEventListener("abort", onHostAbort, { once: true });
        }

        const bgWork = (async () => {
          const result = await executeInSession(sess, params.code, buildDeps(bgAbort.signal));
          // Build the follow-up message body. Same shape as a sync result, plus
          // a jobId tag so the agent can correlate.
          const body = buildResultText(result.output, result.error);
          const status = result.error ? "failed" : "completed";
          const durStr = result.duration < 1000 ? `${result.duration}ms` : `${(result.duration / 1000).toFixed(1)}s`;
          const followUp = formatProgressiveOutput(
            `[async execute_code ${jobId} ${status} · ${durStr}]\n\n${body}`,
            { filePrefix: "pi-codemode-async" },
          ).text;
          try {
            (pi as any).sendMessage?.(
              { customType: "async-execute-code-result", content: followUp, display: true },
              { deliverAs: "followUp", triggerTurn: true },
            );
          } catch (err) {
            // sendMessage shouldn't throw, but if it does we don't want to crash the host.
            // process-guard would catch it anyway, but cleaner to swallow here.
            const _ignore = err;
          }
        })().finally(() => {
          asyncJobs.delete(jobId);
          // Only clear the mutex if WE are still the holder. A later async job
          // may have already overwritten pendingExecution.
          if (pendingExecution === record.promise) pendingExecution = null;
        });

        const record: AsyncJobRecord = {
          jobId,
          code: params.code,
          startedAt,
          abortController: bgAbort,
          promise: bgWork,
        };
        asyncJobs.set(jobId, record);
        pendingExecution = bgWork;

        const preview = codePreview(params.code);
        const startedText =
          `🚀 async execute_code started — jobId=${jobId}\n` +
          (preview ? `first line: ${preview}\n` : "") +
          `\nResult will arrive as a follow-up turn when done. ` +
          `Manage via executeCodeAsyncList() / executeCodeAsyncKill("${jobId}"). ` +
          `Next execute_code call will wait for this one to finish.`;
        return {
          content: [{ type: "text" as const, text: startedText }],
          details: {
            duration: 0,
            lineCount: startedText.split("\n").length,
            code: params.code,
            jobId,
            asyncStatus: "running",
          } satisfies CodeModeDetails,
        };
      }

      // ── SYNC path (default) with TUI-freeze safety net ──────────────────
      //
      // We race executeInSession against a promotion timer. If the work
      // finishes first, normal sync return — agent gets the result inline,
      // zero turn-cost. If the timer fires first (default 60s), we auto-
      // promote: the work keeps running in the background, but the tool
      // returns a "still running" stub so the agent's turn ends and the
      // TUI is freed. The eventual result delivers as a follow-up turn via
      // the same channel async: true uses.
      //
      // Fresh AbortController for the bg path: linking the host signal as a
      // listener so /cancel still works after promotion. We don't use the
      // tool-call signal directly because some pi-agent versions dispose it
      // when the tool call returns (which would instantly kill the promoted
      // bg work).
      const bgAbort = new AbortController();
      if (signal) {
        const onHostAbort = () => bgAbort.abort(new Error("Host aborted execute_code session"));
        if (signal.aborted) onHostAbort();
        else signal.addEventListener("abort", onHostAbort, { once: true });
      }

      const syncStartedAt = Date.now();
      const syncPromise = executeInSession(
        sess,
        params.code,
        buildDeps(bgAbort.signal),
      );
      // pendingExecution is a void-typed mirror so callers don't see the result type.
      const syncMutex = syncPromise.then(() => undefined, () => undefined);
      pendingExecution = syncMutex;

      // A Teams worker is a non-interactive, one-shot `pi -p` process: returning an
      // auto-promotion stub ends its turn, and some providers legitimately stop instead
      // of waiting for the promised follow-up. There is no TUI to free in that process,
      // so preserve the synchronous turn (including normal RLM/Ouija use). An explicit
      // `async: true` request remains available when a worker intentionally wants one.
      const workerOwnedTurn = process.env.PI_TEAMS_WORKER === "1";
      const promoteMs = getSyncPromoteThresholdMs();
      let promoteHandle: ReturnType<typeof setTimeout> | undefined;
      let pollHandle: ReturnType<typeof setInterval> | undefined;
      let promoteReason = "timeout" as "timeout" | "blocked-confirm";

      type RaceWinner =
        | { kind: "result"; r: { output: string; error?: string; duration: number } }
        | { kind: "promote" };
      let winner: RaceWinner;
      if (workerOwnedTurn) {
        winner = { kind: "result", r: await syncPromise };
      } else {
        // Interactive sessions race the normal 60s TUI-freeze safety net and the
        // fast pending-confirm path.
        const promotePromise = new Promise<"PROMOTE">((resolve) => {
          promoteHandle = setTimeout(() => {
            promoteReason = "timeout";
            resolve("PROMOTE");
          }, promoteMs);
          pollHandle = setInterval(() => {
            if (
              pendingConfirmCount() > 0 &&
              Date.now() - syncStartedAt >= CONFIRM_BLOCKED_PROMOTE_THRESHOLD_MS
            ) {
              promoteReason = "blocked-confirm";
              resolve("PROMOTE");
            }
          }, 500);
        });
        winner = await Promise.race<RaceWinner>([
          syncPromise.then((r) => ({ kind: "result" as const, r })),
          promotePromise.then(() => ({ kind: "promote" as const })),
        ]);
      }
      if (promoteHandle) clearTimeout(promoteHandle);
      if (pollHandle) clearInterval(pollHandle);

      if (winner.kind === "promote") {
        // The sync call took too long. Promote to async: register the
        // in-flight promise as an async job, attach a delivery handler,
        // return a "still running" stub.
        const jobId = nextAsyncJobId();
        syncPromise
          .then((result) => {
            const body = buildResultText(result.output, result.error);
            const status = result.error ? "failed" : "completed";
            const durStr =
              result.duration < 1000 ? `${result.duration}ms` : `${(result.duration / 1000).toFixed(1)}s`;
            const followUp = formatProgressiveOutput(
              `[async execute_code ${jobId} ${status} · ${durStr} · auto-promoted from sync]\n\n${body}`,
              { filePrefix: "pi-codemode-async" },
            ).text;
            try {
              (pi as any).sendMessage?.(
                { customType: "async-execute-code-result", content: followUp, display: true },
                { deliverAs: "followUp", triggerTurn: true },
              );
            } catch (err) { const _ignore = err; }
          })
          .finally(() => {
            asyncJobs.delete(jobId);
            if (pendingExecution === syncMutex) pendingExecution = null;
          });

        const record: AsyncJobRecord = {
          jobId,
          code: params.code,
          startedAt: syncStartedAt,
          abortController: bgAbort,
          promise: syncMutex,
        };
        asyncJobs.set(jobId, record);

        const preview = codePreview(params.code);
        const elapsedMs = Date.now() - syncStartedAt;
        const elapsedSec = (elapsedMs / 1000).toFixed(1);
        const pendingBlock = formatPendingConfirmsForAgent();
        let stub: string;
        if (promoteReason === "blocked-confirm" && pendingBlock) {
          // Specific stub: the agent's code is stuck on a blocking dialog
          // awaiting the hooman, NOT on slow async work. Tell the agent
          // explicitly so they can call notify() to pull the hooman in.
          stub =
            `🚦 execute_code is blocked on a hooman confirm dialog — auto-promoted to async after ${elapsedSec}s (jobId=${jobId}).\n` +
            (preview ? `first line: ${preview}\n` : "") +
            `\n${pendingBlock}\n` +
            `\nThe hooman may be in another tab and not see the popup. ` +
            `Call \`notify("git operation blocked — confirm in this pane")\` (or similar) to pull them in, and ` +
            `set \`status("attention")\`. Execution resumes automatically once they answer the dialog; ` +
            `the result arrives as a follow-up turn. ` +
            `Manage via execute_code_async_list / execute_code_async_kill.`;
        } else {
          stub =
            `⏳ execute_code auto-promoted to async after ${promoteMs / 1000}s — jobId=${jobId}\n` +
            (preview ? `first line: ${preview}\n` : "") +
            `\nThe code is still running in the background. TUI is now free. Result will arrive as a follow-up turn when done. ` +
            `Manage via execute_code_async_list / execute_code_async_kill. ` +
            `Next execute_code call will wait for this one to finish.`;
        }
        return {
          content: [{ type: "text" as const, text: stub }],
          details: {
            duration: elapsedMs,
            lineCount: stub.split("\n").length,
            code: params.code,
            jobId,
            asyncStatus: "running",
          } satisfies CodeModeDetails,
        };
      }

      // winner.kind === "result" — normal sync return path.
      if (pendingExecution === syncMutex) pendingExecution = null;
      const { output, error, duration } = winner.r;
      const text = formatProgressiveOutput(buildResultText(output, error), {
        filePrefix: "pi-codemode",
      }).text;
      const lineCount = text.split("\n").length;
      // Include any images stashed by readImage()
      const imageContent = getSession().images.map((img) => ({
        type: "image" as const,
        data: img.data,
        mimeType: img.mimeType,
      }));
      return {
        content: [{ type: "text" as const, text }, ...imageContent],
        details: { duration, error, lineCount, code: params.code } satisfies CodeModeDetails,
      };
    },

    renderCall(args: { code: string }, theme: Theme, context: { expanded: boolean }) {
      const rawLines = (args.code || "").split("\n");
      const showAll = context.expanded;

      // Syntax-highlight via Shiki — cached to avoid re-highlighting on ctrl+O toggle
      const codeKey = args.code || "";
      let allHighlighted = shikiCache.get(codeKey);
      if (!allHighlighted) {
        try {
          const { highlightCode: hl } = require("../../shared/src/tui-diff-renderer.ts");
          const raw = hl(codeKey, "code-mode.js") as string[];
          const FG_RST = "\x1b[39;22;23;24m";
          allHighlighted = raw.map((l: string) => l.replace(/\x1b\[0m/g, FG_RST));
        } catch {
          allHighlighted = rawLines;
        }
        shikiCache.set(codeKey, allHighlighted);
      }
      const safeLines = showAll ? allHighlighted : allHighlighted.slice(0, CODE_PREVIEW_LINES);
      const remaining = showAll ? 0 : rawLines.length - CODE_PREVIEW_LINES;

      let text = theme.fg("toolTitle", theme.bold("execute_code"));
      text += "\n\n" + safeLines.join("\n");
      if (remaining > 0) {
        text +=
          "\n" +
          theme.fg("muted", `... (${remaining} more lines,`) +
          ` ${keyHint("app.tools.expand", "to expand")})`;
      }
      return new Text(text, 0, 0);
    },

    renderResult(result: any, { expanded }: ToolRenderResultOptions, theme: Theme) {
      const details = result.details as CodeModeDetails | undefined;
      if (!details) return new Text("", 0, 0);

      // Duration
      const dur = details.duration;
      const durStr = dur < 1000 ? `${dur}ms` : `${(dur / 1000).toFixed(1)}s`;

      if (details.error) {
        return new Text(
          theme.fg("muted", durStr) + " " + theme.fg("error", `Error: ${details.error}`),
          0,
          0,
        );
      }

      const output = (result.content ?? [])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text ?? "")
        .join("")
        .trimEnd();

      if (!output) {
        return new Text(theme.fg("muted", `${durStr} (no output)`), 0, 0);
      }

      const lines = output.split("\n");
      const header = theme.fg("muted", `${durStr} · ${details.lineCount} lines`);

      if (expanded) {
        const styled = lines.map((l: string) => theme.fg("toolOutput", l)).join("\n");
        return new Text(`${header}\n\n${styled}`, 0, 0);
      }

      const preview = lines.slice(0, OUTPUT_PREVIEW_LINES);
      const remaining = lines.length - preview.length;
      const styled = preview.map((l: string) => theme.fg("toolOutput", l)).join("\n");

      if (remaining > 0) {
        const hint =
          theme.fg("muted", `... (${remaining} more lines,`) +
          ` ${keyHint("app.tools.expand", "to expand")})`;
        return new Text(`${header}\n\n${styled}\n${hint}`, 0, 0);
      }

      return new Text(`${header}\n\n${styled}`, 0, 0);
    },
  });

  // ── execute_code_async_list / _kill: direct tools for async-job management ─────────
  //
  // The sandbox versions (executeCodeAsyncList / executeCodeAsyncKill) are useful from
  // INSIDE an execute_code block. But to call them you must enter a new execute_code call,
  // which waits on the per-session mutex — and the mutex is held by the very async job you
  // want to inspect or kill. Catch-22.
  //
  // These direct tools bypass the mutex by reading the asyncJobs map directly. Use them
  // while an async execute_code is in flight to peek at progress or kill a runaway.

  pi.registerTool({
    name: "execute_code_async_list",
    label: "async list",
    description:
      "List pending async execute_code jobs (jobs fired with \`async: true\` whose results " +
      "have not yet been delivered). Returns { jobs: [{ jobId, codePreview, runtimeMs }] }. " +
      "Safe to call while an async execute_code is in flight — does NOT wait on the mutex.",
    parameters: Type.Object({}),
    async execute() {
      const now = Date.now();
      const jobs = [...asyncJobs.values()].map((j) => ({
        jobId: j.jobId,
        codePreview: codePreview(j.code),
        runtimeMs: now - j.startedAt,
      }));
      const text =
        jobs.length === 0
          ? "(no pending async jobs)"
          : jobs
              .map((j) => `${j.jobId} · ${j.runtimeMs}ms · ${j.codePreview}`)
              .join("\n");
      return {
        content: [{ type: "text" as const, text }],
        details: { jobs },
      };
    },
  });

  pi.registerTool({
    name: "execute_code_async_kill",
    label: "async kill",
    description:
      "Abort a pending async execute_code job by jobId. Returns { killed: boolean, jobId }. " +
      "The killed job still delivers a follow-up turn (showing the abort error) so the agent " +
      "learns the kill landed. Safe to call while async work is in flight — does NOT wait on " +
      "the mutex.",
    parameters: Type.Object({
      jobId: Type.String({ description: "jobId returned by the original async execute_code call (e.g. exec-a3f2c1)." }),
    }),
    async execute(_toolCallId, params: { jobId: string }) {
      const job = asyncJobs.get(params.jobId);
      if (!job) {
        return {
          content: [{ type: "text" as const, text: `No pending async job with jobId=${params.jobId}` }],
          details: { killed: false, jobId: params.jobId },
        };
      }
      try { job.abortController.abort(new Error("Killed via execute_code_async_kill")); } catch { /* ignore */ }
      return {
        content: [{ type: "text" as const, text: `✅ killed jobId=${params.jobId} — follow-up turn will deliver the abort result` }],
        details: { killed: true, jobId: params.jobId },
      };
    },
  });

  // ── code_heredoc: inject pre-escaped content into $ for use in execute_code ──────────
  //
  // The LLM calls this as a direct tool (not inside execute_code). The content goes through
  // exactly ONE level of JSON unescaping (the tool-call parameter parse). The result is stored
  // as $.heredoc_<key> on the persistent store proxy, which the next execute_code call can
  // reference directly — no additional JS-string-escaping layer.
  //
  // This solves the "every tool eats backslashes" problem: when the target file needs literal
  // backslash sequences (Python escape strings, regex, LaTeX, etc.), the LLM calls
  // code_heredoc to stage the content, then execute_code with Write({ content: $.heredoc_x }).
  pi.registerTool({
    name: "code_heredoc",
    label: "Heredoc",
    description:
      "Inject content into the code-mode persistent store ($). Use when the target content " +
      "contains backslash sequences that would be mangled by double-escaping through " +
      "execute_code's JS execution layer. The content goes through only one level of JSON " +
      "unescaping (the tool-call protocol), then is stored verbatim as $.heredoc_<key>. " +
      "Reference it in the next execute_code call as $.heredoc_<key>.",
    parameters: Type.Object({
      key: Type.String({
        description:
          "Storage key. Content will be available as $.heredoc_<key> in execute_code. " +
          "Use a descriptive name like 'script', 'config', 'regex'.",
      }),
      content: Type.String({
        description:
          "The content to inject. This string goes through exactly one JSON.parse " +
          "(standard tool-call parameter parsing) and is then stored verbatim in $.heredoc_<key>.",
        promptGuidelines: [
          "Use code_heredoc when Write/Edit/Python drop backslashes from content.",
          "Common cases: Python strings with \" escapes, regex patterns, LaTeX, Windows paths.",
          "The content goes through ONE JSON parse (not two) — single-level escaping works correctly.",
          "After calling code_heredoc, use execute_code with $.heredoc_<key> as the content argument.",
        ],
      }),
    }),
    async execute(_toolCallId, params) {
      const storeKey = "heredoc_" + params.key;
      getSession().store.proxy[storeKey] = params.content;
      const byteLen = Buffer.byteLength(params.content, "utf-8");
      const humanSize = byteLen < 1024 ? byteLen + "B" : (byteLen / 1024).toFixed(1) + "KB";
      return {
        content: [
          {
            type: "text" as const,
            text:
              "$." + storeKey + " set (" + humanSize + ", " +
              params.content.split("\n").length + " lines). " +
              "Use in execute_code: Write({ content: $." + storeKey + " })",
          },
        ],
        details: undefined,
      };
    },
  });

  // Stash compaction data into $.preCompact for post-compaction review
  pi.on("session_before_compact", async (event, ctx) => {
    const { preparation } = event;
    try {
      // Build outline of what's being compacted
      const outline: string[] = [];
      for (const msg of preparation.messagesToSummarize) {
        // AgentMessage is a union including custom message types (e.g. bashExecution)
        // that don't carry a `content` field. Narrow with a runtime guard.
        if (!("content" in msg)) continue;
        const content = msg.content;
        if (typeof content === "string") {
          outline.push("[" + msg.role + "] " + content.slice(0, 200));
        } else if (Array.isArray(content)) {
          const text = (content as any[]).filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").trim();
          const tools = (content as any[]).filter((p: any) => p.type === "toolCall").map((p: any) => p.name);
          if (text || tools.length) {
            outline.push("[" + msg.role + "] " + (text.slice(0, 150) || "") + (tools.length ? " (tools: " + tools.join(", ") + ")" : ""));
          }
        }
      }

      // Stash outline into $ — the summary will be added by session_compact
      const sess = getSession();
      sess.store.proxy.preCompact = {
        messageCount: preparation.messagesToSummarize.length,
        outline: outline.join("\n"),
      };
    } catch (e: unknown) {
      surfaceCodeModeInternalError(pi, "Failed to build preCompact outline.", e);
    }
    // Let compaction proceed normally
    return undefined;
  });

  // After compaction completes, add summary to $.preCompact and inject continuation
  pi.on("session_compact", async (event) => {
    try {
      const sess = getSession();
      const rawExisting = sess.store.proxy.preCompact;
      const existing = rawExisting && typeof rawExisting === "object" ? rawExisting : {};
      sess.store.proxy.preCompact = {
        ...existing,
        summary: event.compactionEntry.summary,
      };

    } catch (e: unknown) {
      surfaceCodeModeInternalError(pi, "Failed to store preCompact summary.", e);
    }
  });

  // Deferred context checkout — navigate after the current turn completes
  pi.on("turn_end", async (_event, ctx) => {
    if (!pendingCheckout && !pendingSquash) return;
    ctx.abort();
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (pendingCheckout) {
      const checkout = pendingCheckout;
      pendingCheckout = null;
      try {
        const cmdCtx = ctx as any;
        if (cmdCtx.navigateTree) {
          await cmdCtx.navigateTree(checkout.targetId, { summarize: false });
        }
      } catch {}
    }
  });

  // AgentSession.compact() waits for the active run to become idle, so deferred
  // squash must run at settlement rather than agent_end. Await both compaction
  // and its continuation to keep one-shot print/json runtimes alive throughout.
  registerAgentSettled("agent_settled", async (_event, ctx) => {
    if (!pendingSquash) return;
    const squash = pendingSquash;
    pendingSquash = null;
    try {
      await awaitDeferredSquash(ctx, squash, (continuation) =>
        sendUserMessageAndWait(continuation, { deliverAs: "followUp" }),
      );
    } catch (error) {
      surfaceCodeModeInternalError(pi, "Deferred session.squash() failed.", error);
    }
  });

  // Inject code-mode declarations and instructions into system prompt
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: composeCodeModeSystemPrompt(
        event.systemPrompt,
        CODE_MODE_SYSTEM_PROMPT,
        cachedToolReference,
      ),
    };
  });
}
