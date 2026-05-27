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
  Theme,
  ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { keyHint } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "@sinclair/typebox";
import { getStableNickname } from "@pi-extensions/shared/session-nickname";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// Eagerly start Shiki loading via relative path (must match require() in renderCall)
require("../../shared/src/tui-diff-renderer.ts");
import { registerSandboxFn } from "../../shared/src/sandbox-registry";
import { createOuijaExecutor } from "../../shared/src/ouija-core";
import {
  cachedToolReference,
  extendWithAllTools,
  rebuildCachedReference,
} from "../src/tool-reference";
import {
  createCodeModeSession,
  executeInSession,
  type CodeModeSession,
} from "../src/session-factory";
import {
  buildContextFooter,
  CONTEXT_GUARD_THRESHOLD,
  isContextGuardActive,
} from "../src/context-usage";
import { installCodeModeProcessGuard } from "../src/process-guard";

// =============================================================================
// Constants
// =============================================================================

// execute_code is UNBOUNDED by default. Callers opt into a deadline via params.timeout.
// session-factory only installs the timeout race when executionTimeoutMs is a positive number.
const SYNC_TIMEOUT_MS = 5_000; // 5s for parsing/setup
const MAX_OUTPUT_LENGTH = 200_000; // 200KB output cap

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

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
    sendMessage(
      { customType: "code-mode-crash", content: body, display: true },
      { deliverAs: "followUp", triggerTurn: true },
    );
  } catch {
    // Do not fall back to console.error. In pi, stderr is a host/TUI error
    // channel; contained code-mode failures must surface as messages or stay
    // contained.
  }
}

// =============================================================================
// TypeScript Declarations (injected into system prompt)
// =============================================================================

const CODE_MODE_DECLARATIONS = fs.readFileSync(
  new URL("./code-mode-declarations.md", import.meta.url),
  "utf-8",
);

// =============================================================================
// System Prompt Addition
// =============================================================================

const CODE_MODE_SYSTEM_PROMPT = fs
  .readFileSync(new URL("./code-mode-prompt.md", import.meta.url), "utf-8")
  .replace("{{CODE_MODE_DECLARATIONS}}", CODE_MODE_DECLARATIONS);

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
}

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
let pendingSquash: { continue?: string } | null = null;
let currentOuijaSessionFile: string | null = null;

// ── Context Guard ─────────────────────────────────────────────────────────────
// When context usage exceeds the threshold (default 94%), only context-management
// tools are allowed. The guard auto-disarms when usage drops back below threshold.
let contextGuardEnabled = true; // default on, toggle with /context-guard on|off

function getSession(): CodeModeSession {
  if (!session) session = createCodeModeSession();
  return session;
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
  "recall",
  "memory_create",
  "memory_unfold",
  "memory_context",
  "memory_status",
  "memory_subscribe",
  "memory_unsubscribe",
  "memory_check_updates",
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
      "Use console.log() to return results.",
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
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      // Unbounded by default. If params.timeout is set, honor exactly — no cap.
      // session-factory skips the timeout race entirely when timeoutMs is undefined.
      const timeoutMs = params.timeout ? params.timeout * 1000 : undefined;
      // ── Site 3 escape sync (pe-tk4s AC3 v4 patch — preserve setActiveTools side-effects) ──
      const sess = getSession();
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
      const { output, error, duration } = await executeInSession(
        sess,
        params.code,
        {
          signal: signal ?? new AbortController().signal,
          cwd: ctx.cwd,
          model: model ?? { provider: "unknown", id: "unknown" },
          modelRegistry: (ctx as any).modelRegistry,
          executionTimeoutMs: timeoutMs,
          sessionManager: (ctx as any).sessionManager,
          getContextUsage: (ctx as any).getContextUsage,
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
          requestSquash: (options) => {
            pendingSquash = { continue: options?.continue };
          },
          requestCheckout: (info) => {
            pendingCheckout = info;
          },
          setContextSize: (n) => {
            contextSize = n;
          },
        },
      );

      let text = output || "";
      if (error) {
        text += (text ? "\n\n" : "") + `Error: ${error}`;
      }
      if (!text) {
        text = "(no output — use console.log() to return results)";
      }

      // Context usage footer (shown when ≥ 30%, warning at ≥ 40%)
      const ctxFooter = buildContextFooter(ctx as any, {
        contextGuardEnabled,
        suppressBecauseCompactionScheduled: pendingSquash !== null,
      });
      if (ctxFooter) {
        text += "\n\n" + ctxFooter;
      }

      // Truncate if too large
      if (text.length > MAX_OUTPUT_LENGTH) {
        const tempFile = path.join(os.tmpdir(), `pi-codemode-${Date.now()}.log`);
        fs.writeFileSync(tempFile, text, "utf-8");
        text =
          text.slice(0, MAX_OUTPUT_LENGTH) +
          `\n\n[output truncated. Full output saved to: ${tempFile}]`;
      }

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

    if (pendingSquash) {
      const squash = pendingSquash;
      pendingSquash = null;
      try {
        const cmdCtx = ctx as any;
        if (cmdCtx.compact) {
          cmdCtx.compact({
            onComplete: () => {
              if (squash.continue) {
                pi.sendUserMessage(squash.continue, { deliverAs: "followUp" });
              }
            },
          });
        }
      } catch {}
    }
  });

  // Inject code-mode declarations and instructions into system prompt
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt + "\n\n" + CODE_MODE_SYSTEM_PROMPT + "\n\n" + cachedToolReference,
    };
  });
}
