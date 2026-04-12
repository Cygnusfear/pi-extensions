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
} from "@mariozechner/pi-coding-agent";
import { keyHint } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import * as acorn from "acorn";
// Eagerly start Shiki loading via relative path (must match require() in renderCall)
require("../../shared/src/tui-diff-renderer.ts");
import { createToolBindings } from "../src/sandbox-tools";
import { getSandboxFns } from "../../shared/src/sandbox-registry";
import { registerSandboxFn } from "../../shared/src/sandbox-registry";
import { createOuijaExecutor } from "../../shared/src/ouija-core";
import { loadRunbook } from "../../runbooks/src/runbook-engine";
import { createPersistentStore } from "../src/persistent-store";
import {
  buildOutput,
  cachedToolReference,
  extendWithAllTools,
  rebuildCachedReference,
} from "../src/tool-reference";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000; // 2 minutes overall
const MAX_EXECUTION_TIMEOUT_MS = 600_000; // 10 minutes hard cap
const SYNC_TIMEOUT_MS = 5_000; // 5s for parsing/setup
const MAX_OUTPUT_LENGTH = 200_000; // 200KB output cap

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

/** Build context usage footer for execute_code output. Returns null when usage is low. */
function buildContextFooter(ctx: {
  sessionManager?: any;
  getContextUsage?: () => any;
}): string | null {
  const getUsage = ctx.getContextUsage;
  if (!getUsage) return null;
  try {
    const usage = getUsage();
    if (!usage || usage.percent === null || usage.percent < 30) return null;

    const pct = usage.percent.toFixed(1);
    const totalTokens = usage.tokens ?? usage.used ?? 0;
    const maxTokens = usage.contextWindow ?? usage.limit ?? 0;
    const usedK = totalTokens > 0 ? Math.round(totalTokens / 1024) : 0;
    const maxK = maxTokens > 0 ? Math.round(maxTokens / 1024) : 0;
    const context = maxK > 0 ? `${usedK}k/${maxK}k CONTEXT` : `${pct}% CONTEXT`;

    if (usage.percent >= 90) {
      const guard = isContextGuardActive(getUsage) ? " \u{1F6AB} CONTEXT GUARD ACTIVE — save thick context to $.ctx FIRST, then session.squash()" : "";
      return `\u{1F480} ${pct}% (${context}) MAINTENANCE NOW \u2014 session.squash() or contextCheckout() to reclaim context${guard}`;
    }
    if (usage.percent >= 70) {
      return `🚨 ${pct}% (${context}) URGENT — session.squash() to compact, or contextCheckout() to squash a segment`;
    }
    if (usage.percent >= 40) {
      return `🙈 ${pct}% (${context}) idiot threshold — start distilling state into $ vars + session.save()`;
    }
    return `📊 ${pct}% (${context})`;
  } catch {
    return null;
  }
}

interface PersistentSession {
  context: vm.Context;
  store: ReturnType<typeof createPersistentStore>;
  logs: string[];
  images: Array<{ data: string; mimeType: string }>; // stashed by readImage()
}

function createSession(): PersistentSession {
  const store = createPersistentStore({ getEscaped: () => escaped });
  const logs: string[] = [];
  const images: Array<{ data: string; mimeType: string }> = [];

  const sandbox = {
    $: store.proxy,

    // Console capture — logs array is cleared per execution, but reference stays
    console: {
      log: (...args: unknown[]) => logs.push(args.map(formatArg).join(" ")),
      error: (...args: unknown[]) => logs.push("[stderr] " + args.map(formatArg).join(" ")),
      warn: (...args: unknown[]) => logs.push("[warn] " + args.map(formatArg).join(" ")),
      info: (...args: unknown[]) => logs.push(args.map(formatArg).join(" ")),
    },

    // Timers (needed for sleep and async patterns)
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),

    // Process — env, platform, pid are static; cwd is updated per-execution in executeCode()
    process: {
      env: globalThis.process.env,
      cwd: () => globalThis.process.cwd(),
      platform: globalThis.process.platform,
      pid: globalThis.process.pid,
    },
  };

  const context = vm.createContext(sandbox);
  return { context, store, logs, images };
}

let session: PersistentSession | null = null;
let escaped = false;
let contextSize: number | null = null; // null = send everything
let pendingCheckout: { targetId: string; enrichedMessage: string; backupTag?: string } | null = null;
let currentOuijaSessionFile: string | null = null;

// ── Context Guard ─────────────────────────────────────────────────────────────
// When context usage exceeds the threshold (default 94%), only context-management
// tools are allowed. The guard auto-disarms when usage drops back below threshold.
let contextGuardEnabled = true; // default on, toggle with /context-guard on|off
const CONTEXT_GUARD_THRESHOLD = 0.94;

/** Tools allowed through the context guard (context management + safe reads). */
const CONTEXT_GUARD_ALLOWED = new Set([
  // These are NOT from createToolBindings — they're injected by executeCode() itself
  // into the VM context. The guard only wraps createToolBindings keys, so these
  // naturally pass through since they're assigned after wrapping.
  // But we list them for documentation:
  // session, contextTag, contextLog, contextCheckout, $, console, process, setTimeout, clearTimeout
  //
  // From createToolBindings — allowed:
  "Read", "read",
  "sleep",
  "man",
]);

/** Check if context usage exceeds the guard threshold. */
function isContextGuardActive(getUsage?: (() => any) | undefined): boolean {
  if (!contextGuardEnabled) return false;
  if (!getUsage) return false;
  try {
    const usage = getUsage();
    if (!usage || usage.percent === null) return false;
    return usage.percent >= CONTEXT_GUARD_THRESHOLD * 100;
  } catch {
    return false;
  }
}

/** Wrap tool bindings so blocked tools throw when the guard is active. */
function wrapWithContextGuard(
  bindings: Record<string, unknown>,
  getUsage?: (() => any) | undefined,
): Record<string, unknown> {
  if (!getUsage) return bindings; // no usage info → can't guard

  const wrapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bindings)) {
    if (CONTEXT_GUARD_ALLOWED.has(key)) {
      wrapped[key] = value; // pass through
    } else if (typeof value === "function") {
      wrapped[key] = (...args: unknown[]) => {
        if (isContextGuardActive(getUsage)) {
          const pct = (() => { try { return getUsage().percent.toFixed(1); } catch { return "?"; } })();
          throw new Error(
            `🚫 Context guard active (${pct}% used, threshold ${(CONTEXT_GUARD_THRESHOLD * 100).toFixed(0)}%). ` +
            `Most tools blocked — only context management allowed.\n\n` +
            `BEFORE squashing, save thick context to $ (survives compaction):\n` +
            `$.ctx = \`TASK — mid-stream\nDone: ...\nGotcha: ...\nNext: ...\`;\n\n` +
            `Then squash with continuation:\n` +
            `session.squash({ continue: \"Squash done. Continue with [next step].\" });\n\n` +
            `Toggle guard: /context-guard off`
          );
        }
        return (value as Function)(...args);
      };
    } else {
      wrapped[key] = value; // non-function values (shouldn't exist, but defensive)
    }
  }
  return wrapped;
}

function getSession(): PersistentSession {
  if (!session) session = createSession();
  return session;
}

async function executeCode(
  code: string,
  cwd: string,
  signal?: AbortSignal,
  executionTimeoutMs: number = DEFAULT_EXECUTION_TIMEOUT_MS,
  toolCtx?: {
    sessionManager?: any;
    getContextUsage?: () => any;
    confirmFn?: (title: string, body: string) => Promise<boolean>;
    compact?: (options?: any) => void;
    setLabel?: (entryId: string, label: string | undefined) => void;
    navigateTree?: (targetId: string, options?: any) => Promise<any>;
    abort?: () => void;
    model?: any;
    modelRegistry?: any;
    sendUserMessage?: (content: string, options?: { deliverAs?: "steer" | "followUp" }) => void;
    sendMessage?: (
      message: { customType: string; content: string; display?: boolean },
      options?: { deliverAs?: "steer" | "followUp"; triggerTurn?: boolean },
    ) => void;
  },
): Promise<{ output: string; error?: string; duration: number }> {
  const sess = getSession();

  // Advance turn and process expiry
  sess.store.nextTurn();
  const warnings = sess.store.processExpiry();

  // Clear logs for this execution
  sess.logs.length = 0;

  function extractAutoPersistNames(code: string): string[] {
    try {
      const ast = acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "module",
        locations: false,
        ranges: false,
      }) as any;

      const names: string[] = [];

      for (const node of ast.body) {
        if (node.type === "VariableDeclaration") {
          for (const decl of node.declarations) {
            collectBindingNames(decl.id, names);
          }
        } else if (node.type === "FunctionDeclaration" && node.id) {
          names.push(node.id.name);
        }
      }

      return [...new Set(names)];
    } catch {
      // Parse failed — fall back to no auto-persist (hydration still works)
      return [];
    }
  }

  /** Recursively collect all binding names from a pattern (handles destructuring). */
  function collectBindingNames(pattern: any, out: string[]): void {
    if (!pattern) return;
    switch (pattern.type) {
      case "Identifier":
        out.push(pattern.name);
        break;
      case "ObjectPattern":
        for (const prop of pattern.properties) {
          if (prop.type === "RestElement") {
            collectBindingNames(prop.argument, out);
          } else {
            // Property: key (static) → value (binding pattern)
            // { foo } → prop.value is Identifier
            // { foo: bar } → prop.value is Identifier "bar"
            // { foo: { baz } } → prop.value is ObjectPattern
            collectBindingNames(prop.value, out);
          }
        }
        break;
      case "ArrayPattern":
        for (const elem of pattern.elements) {
          if (elem === null) continue; // holes: const [a, , b]
          if (elem.type === "RestElement") {
            collectBindingNames(elem.argument, out);
          } else {
            collectBindingNames(elem, out);
          }
        }
        break;
      case "AssignmentPattern":
        // const { foo = defaultValue } → pattern.left is the binding
        collectBindingNames(pattern.left, out);
        break;
      // RestElement at top level shouldn't happen, but handle defensively
      case "RestElement":
        collectBindingNames(pattern.argument, out);
        break;
    }
  }

  // --- Layer 1: Syntax pre-validation ---
  // Catch parse errors (Unexpected EOF, etc.) without touching the store
  const autoPersistNames = extractAutoPersistNames(code);
  const autoPersistSuffix = autoPersistNames
    .map((n) => `$.${n} = typeof ${n} !== "undefined" ? ${n} : $.${n};`)
    .join("\n");
  const wrapped = `(async () => {\n${code}\n${autoPersistSuffix}\n})()`;
  const start = Date.now();
  try {
    new vm.Script(wrapped, { filename: "code-mode.js" });
  } catch (parseErr) {
    const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    const storeInfo = sess.store.getStatus();
    return {
      output: buildOutput(warnings, [
        `\u26a0\ufe0f Syntax error: ${parseMsg}`,
        "",
        "Your $ store was NOT affected. Fix the syntax and retry.",
        "",
        storeInfo,
      ]),
      error: parseMsg,
      duration: Date.now() - start,
    };
  }

  // --- Layer 2: Execute with fault tolerance ---
  // Refresh tool bindings (cwd may have changed)
  sess.images.length = 0; // clear stashed images for this execution
  currentOuijaSessionFile = toolCtx?.sessionManager?.getSessionFile?.() ?? null;
  const rawBindings = createToolBindings({ cwd, images: sess.images, confirmFn: toolCtx?.confirmFn, logFn: (msg: string) => sess.logs.push(msg), signal, sessionManager: toolCtx?.sessionManager });
  const bindings = wrapWithContextGuard(rawBindings, toolCtx?.getContextUsage);
  Object.assign(sess.context, bindings);

  // Update process.cwd to reflect the current session working directory
  (sess.context as any).process.cwd = () => cwd;

  // Inject console.wake — lets background promises trigger a new agent turn.
  // console.log() only writes to the current block's output (gone when block returns).
  // console.wake(message) queues a user message via deliverAs:"followUp" so it lands
  // safely whether the agent is idle OR currently streaming a response. Without the
  // explicit deliverAs, pi throws "Agent is already processing. Specify
  // streamingBehavior ('steer' or 'followUp') to queue the message." and the wake
  // is lost — which is exactly what was happening to background teams.on callbacks
  // that fired mid-turn.
  //
  // No one-wake-per-block limit anymore: every call goes through. Pi's own message
  // queue serializes followUp messages correctly, so multiple subscriptions firing
  // in close succession each land as their own follow-up turn trigger.
  if (toolCtx?.sendMessage || toolCtx?.sendUserMessage) {
    const sendMsg = toolCtx.sendMessage;
    const sendUser = toolCtx.sendUserMessage;
    (sess.context as any).console.wake = (...args: unknown[]) => {
      const message = args.map(formatArg).join(" ");
      try {
        if (sendMsg) {
          // Deliver as a custom-typed entry so the renderer can distinguish
          // background wakes from hooman user messages. Carries display:true so
          // it still shows up in the TUI, and deliverAs:"followUp" so it lands
          // safely whether the agent is idle or mid-turn.
          sendMsg(
            { customType: "console-wake", content: "[CONSOLE.WAKE] " + message, display: true },
            { deliverAs: "followUp", triggerTurn: true },
          );
        } else if (sendUser) {
          // Fallback for older host versions that don't expose sendMessage.
          sendUser(message, { deliverAs: "followUp" });
        }
      } catch (err) {
        // Last-ditch: log the wake content to the block output so it isn't totally
        // lost. The caller will still see it the next time they inspect the block.
        console.warn("[console.wake] send failed:", err instanceof Error ? err.message : String(err));
        console.warn("[console.wake] wake content:", message.slice(0, 400));
      }
    };
  }

  // Inject session introspection API if ctx available
  if (toolCtx?.sessionManager) {
    const sm = toolCtx.sessionManager;
    const getUsage = toolCtx.getContextUsage;
    Object.assign(sess.context, {
      session: {
        messages: () => {
          const branch = sm.getBranch();
          return branch
            .filter((e: any) => e.type === "message")
            .map((e: any) => {
              const m = e.message;
              const content = typeof m.content === "string"
                ? m.content
                : Array.isArray(m.content)
                  ? m.content
                      .filter((p: any) => p.type === "text")
                      .map((p: any) => p.text)
                      .join("\n")
                  : "";
              return { id: e.id, role: m.role, content, timestamp: e.timestamp };
            });
        },
        tokens: () => {
          if (!getUsage) return null;
          const usage = getUsage();
          return usage ?? null;
        },
        tags: () => {
          const entries = sm.getEntries();
          return entries
            .filter((e: any) => e.type === "label" && e.label)
            .map((e: any) => ({ id: e.id, targetId: e.targetId, label: e.label, timestamp: e.timestamp }));
        },
        tag: (name: string) => {
          if (!name || !name.trim()) return "Tag name cannot be empty";
          const leafId = sm.getLeafId();
          if (!leafId) return "No current position to tag";
          sm.appendLabelChange(leafId, name.trim());
          return "Tagged: " + name.trim();
        },
        id: () => sm.getSessionId(),
        name: () => sm.getSessionName() ?? null,
        save: (key: string, data: unknown) => {
          if (!key || !key.trim()) return "Key cannot be empty";
          if (key.length > 128) return "Key too long (max 128 chars)";
          let json: string;
          try {
            json = JSON.stringify(data);
          } catch {
            return "Cannot save: data is not JSON-serializable";
          }
          if (json === undefined) return "Cannot save: data is not JSON-serializable (function/symbol)";
          if (json.length > 512 * 1024) return "Cannot save: data exceeds 512KB limit";
          sm.appendCustomEntry("code-mode:" + key.trim(), data);
          return "Saved: " + key.trim();
        },
        setContextSize: (n?: number) => {
          if (n === undefined || n === null) {
            contextSize = null;
            return "Context size reset (sending all messages)";
          }
          if (typeof n !== "number" || !isFinite(n)) {
            return "Invalid context size: must be a finite number";
          }
          const size = Math.max(4, Math.abs(Math.round(n)));
          contextSize = size;
          return "Context limited to last " + size + " messages";
        },
        preCompact: () => {
          const log = (msg: string) => sess.logs.push(msg);
          const branch = sm.getBranch();
          const outline: string[] = [];
          let msgCount = 0;
          for (const entry of branch) {
            if (entry.type !== "message") continue;
            const msg = (entry as any).message;
            if (!msg) continue;
            msgCount++;
            if (typeof msg.content === "string") {
              outline.push("[" + msg.role + "] " + msg.content.slice(0, 200));
            } else if (Array.isArray(msg.content)) {
              const text = msg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").trim();
              const tools = msg.content.filter((p: any) => p.type === "toolCall").map((p: any) => p.name);
              if (text || tools.length) {
                outline.push("[" + msg.role + "] " + (text.slice(0, 150) || "") + (tools.length ? " (tools: " + tools.join(", ") + ")" : ""));
              }
            }
          }
          sess.store.proxy.preCompact = {
            messageCount: msgCount,
            outline: outline.join("\n"),
          };
          log("preCompact: stashed outline of " + msgCount + " messages into $.preCompact. Review it, save important context to $, then call session.squash().");
        },
        squash: (options?: { continue?: string }) => {
          const log = (msg: string) => sess.logs.push(msg);
          if (!toolCtx?.compact) {
            log("session.squash(): compaction not available in this context");
            return;
          }
          const continueText = options?.continue;
          toolCtx.compact({
            onComplete: () => {
              if (continueText && toolCtx?.sendUserMessage) {
                toolCtx.sendUserMessage(continueText, { deliverAs: "followUp" });
              }
            },
          });
        },
        load: (key: string) => {
          const entries = sm.getEntries();
          const prefix = "code-mode:" + key;
          // Find the LAST matching custom entry
          let latest: any = null;
          for (const e of entries) {
            if (e.type === "custom" && e.customType === prefix) {
              latest = e.data;
            }
          }
          return latest;
        },
        entries: () => {
          return sm.getBranch().map((e: any) => ({
            id: e.id,
            type: e.type,
            timestamp: e.timestamp,
            ...(e.type === "message" ? { role: e.message?.role } : {}),
            ...(e.type === "label" ? { label: e.label } : {}),
            ...(e.type === "compaction" || e.type === "branch_summary" ? { summary: e.summary } : {}),
            ...(e.type === "custom" ? { customType: e.customType, data: e.data } : {}),
          }));
        },
      },
    });

    // Context management functions (vendored from pi-context, always available)
    Object.assign(sess.context, {
      contextTag: (args: { name: string; target?: string }) => {
        if (!args?.name || !args.name.trim()) return "Error: tag name required";
        const tagName = args.name.trim();

        const resolveTargetId = (target: string): string => {
          if (target.toLowerCase() === "root") { const t = sm.getTree(); return t.length > 0 ? t[0].entry.id : target; }
          if (/^[0-9a-f]{8,}$/i.test(target)) return target;
          const stack: any[] = [...sm.getTree()];
          while (stack.length > 0) { const n = stack.pop()!; if (sm.getLabel(n.entry.id) === target) return n.entry.id; if (n.children?.length) stack.push(...n.children); }
          return target;
        };

        const findTagInTree = (nodes: any[], name: string): string | null => {
          for (const n of nodes) {
            if (sm.getLabel(n.entry.id) === name) return n.entry.id;
            const r = findTagInTree(n.children || [], name);
            if (r) return r;
          }
          return null;
        };

        const existing = findTagInTree(sm.getTree(), tagName);
        if (existing) return "Error: Tag '" + tagName + "' already exists at " + existing;

        let id = args.target ? resolveTargetId(args.target) : undefined;
        if (!id) {
          const branch = sm.getBranch();
          for (let i = branch.length - 1; i >= 0; i--) {
            const entry = branch[i];
            if (entry.type === "message" && entry.message.role === "toolResult") continue;
            id = entry.id;
            break;
          }
          if (!id) id = sm.getLeafId() ?? "";
        }

        if (toolCtx?.setLabel) {
          toolCtx.setLabel(id, tagName);
        } else {
          sm.appendLabelChange(id, tagName);
        }
        return "Tagged '" + tagName + "' at " + id;
      },

      contextLog: (args?: { limit?: number; verbose?: boolean }) => {
        const branch = sm.getBranch();
        const leafId = sm.getLeafId();
        const verbose = args?.verbose ?? false;
        const limit = args?.limit ?? 50;

        const getContent = (entry: any): string => {
          if (entry.type === "branch_summary" || entry.type === "compaction") return (entry.summary || "[No summary]").slice(0, 120);
          if (entry.type === "label") return "tag: " + entry.label;
          if (entry.type === "message") {
            const msg = entry.message;
            if (msg.role === "toolResult") {
              const text = (msg.content || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").trim();
              return "(" + msg.toolName + ") " + (text.length > 80 ? text.slice(0, 80) + "..." : text);
            }
            if (msg.role === "bashExecution") return "[Bash] " + msg.command;
            if (msg.role === "user") return (typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) ? msg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").trim() : "").slice(0, 120);
            if (msg.role === "assistant") {
              let text = typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) ? msg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").trim() : "";
              const tcs = (msg.content || []).filter((c: any) => c.type === "toolCall").map((tc: any) => tc.name);
              if (tcs.length) text = (text ? text + " | " : "") + "tools: " + tcs.join(", ");
              return text.slice(0, 120);
            }
          }
          return "";
        };

        const isInteresting = (entry: any): boolean => {
          if (entry.id === leafId) return true;
          if (branch[0] && entry.id === branch[0].id) return true;
          if (sm.getLabel(entry.id)) return true;
          if (entry.type === "label") return false;
          if (entry.type === "branch_summary" || entry.type === "compaction") return true;
          if (sm.getChildren(entry.id).length > 1) return true;
          if (entry.type === "message" && entry.message.role === "user") return true;
          return false;
        };

        const seq: any[] = [];
        const backboneIds = new Set(branch.map((e: any) => e.id));
        branch.forEach((entry: any) => {
          seq.push(entry);
          sm.getChildren(entry.id).forEach((child: any) => {
            if ((child.type === "branch_summary" || child.type === "compaction") && !backboneIds.has(child.id)) seq.push(child);
          });
        });

        const visIds = new Set<string>();
        seq.forEach((e: any) => { if (verbose || isInteresting(e)) visIds.add(e.id); });
        let vis = seq.filter((e: any) => visIds.has(e.id));
        if (vis.length > limit) {
          const allowed = new Set(vis.slice(-limit).map((e: any) => e.id));
          visIds.clear();
          allowed.forEach((id: string) => visIds.add(id));
        }

        const lines: string[] = [];
        let hidden = 0;
        seq.forEach((entry: any) => {
          if (!visIds.has(entry.id)) { hidden++; return; }
          if (hidden > 0) { lines.push("  ... (" + hidden + " hidden) ..."); hidden = 0; }
          const isHead = entry.id === leafId;
          const label = sm.getLabel(entry.id);
          const body = getContent(entry).replace(/\s+/g, " ");
          let role = entry.type === "message" ? (entry.message.role === "assistant" ? "AI" : entry.message.role === "user" ? "USER" : "TOOL") : entry.type === "compaction" || entry.type === "branch_summary" ? "SUMMARY" : entry.type.toUpperCase();
          if (role === "CUSTOM_MESSAGE") return;
          const meta = [branch[0] && entry.id === branch[0].id ? "ROOT" : null, isHead ? "HEAD" : null, label ? "tag:" + label : null].filter(Boolean).join(", ");
          lines.push((isHead ? "*" : role === "USER" ? "•" : "|") + " " + entry.id.slice(0, 8) + (meta ? " (" + meta + ")" : "") + " [" + role + "] " + body);
        });
        if (hidden > 0) lines.push("  ... (" + hidden + " hidden) ...");

        const usage = getUsage ? getUsage() : null;
        let usageStr = "Unknown";
        if (usage) usageStr = (usage.percent?.toFixed(1) ?? "?") + "% (" + Math.round((usage.tokens ?? 0) / 1024) + "k/" + Math.round((usage.contextWindow ?? 0) / 1024) + "k)";
        let stepsSince = 0, nearestTag = "None";
        for (let i = branch.length - 1; i >= 0; i--) { const l = sm.getLabel(branch[i].id); if (l) { nearestTag = l; break; } stepsSince++; }
        return "[Context Dashboard]\n• Usage: " + usageStr + "\n• Steps since '" + nearestTag + "': " + stepsSince + "\n---\n" + (lines.join("\n") || "(empty)");
      },

      contextCheckout: (args: { target: string; message: string; backupTag?: string }) => {
        if (!args?.target) return "Error: target required";
        if (!args?.message) return "Error: message required";

        const resolveId = (target: string): string => {
          if (target.toLowerCase() === "root") { const t = sm.getTree(); return t.length > 0 ? t[0].entry.id : target; }
          if (/^[0-9a-f]{8,}$/i.test(target)) return target;
          const stack: any[] = [...sm.getTree()];
          while (stack.length > 0) { const n = stack.pop()!; if (sm.getLabel(n.entry.id) === target) return n.entry.id; if (n.children?.length) stack.push(...n.children); }
          return target;
        };

        const tid = resolveId(args.target);
        const currentLeaf = sm.getLeafId();
        if (currentLeaf === tid) return "Already at target " + tid;
        if (args.backupTag && currentLeaf && toolCtx?.setLabel) toolCtx.setLabel(currentLeaf, args.backupTag);

        const label = currentLeaf ? sm.getLabel(currentLeaf) : undefined;
        const origin = label ? "tag: " + label : (currentLeaf || "unknown");
        const enrichedMessage = "(summary from " + origin + ")\n" + args.message;

        const nid = sm.branchWithSummary(tid, enrichedMessage);
        pendingCheckout = { targetId: nid, enrichedMessage, backupTag: args.backupTag };

        return "Checkout initiated -> " + args.target + ". Backup: " + (args.backupTag || "none") + ". Navigation completes after this turn.";
      },
    });
  }


  // Inject sandbox functions registered by other extensions
  const sandboxFns = getSandboxFns();
  if (Object.keys(sandboxFns).length > 0) {
    Object.assign(sess.context, sandboxFns);
  }

  // runbookRun — executes a saved runbook in the current VM context
  (sess.context as any).runbookRun = async (input: { name: string; args?: Record<string, unknown> }) => {
    const { code } = loadRunbook(cwd, input.name);
    const argsLine = input.args ? `const args = ${JSON.stringify(input.args)};\n` : "const args = {};\n";
    const wrapped = `(async () => {\n${argsLine}${code}\n})()`;
    return vm.runInContext(wrapped, sess.context, { filename: `runbook:${input.name}` });
  };

  // --- Hydrate persisted $ vars as bare context globals ---
  // Agents naturally expect `const x = ...` in call N to be available as bare `x` in call N+1.
  // Without this, they waste 2-3 turns discovering the $. prefix requirement.
  const storeKeys = sess.store.proxy.__keys();
  const PROTECTED = new Set(["$", "console", "session", "setTimeout", "clearTimeout", "process"]);
  for (const key of storeKeys) {
    if (key.startsWith("__") || PROTECTED.has(key)) continue;
    // Never overwrite tool bindings or other functions (tools always win)
    const existing = (sess.context as any)[key];
    if (typeof existing === "function") continue;
    (sess.context as any)[key] = sess.store.proxy[key];
  }

  try {
    const promise = vm.runInContext(wrapped, sess.context, {
      filename: "code-mode.js",
      // timeout intentionally omitted: Bun 1.3.9 applies vm.runInContext timeout to
      // async code as well, causing a panic(main thread): unreachable when slow async
      // operations (like multiple ouija calls) exceed the timeout. Async execution
      // is bounded by the Promise.race timeout below. Sync parse errors are caught by
      // the vm.Script(wrapped) call above.
    });

    // Race: execution vs timeout vs abort
    const races: Promise<unknown>[] = [promise];

    // Async timeout
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`Execution timed out after ${executionTimeoutMs / 1000}s`)),
        executionTimeoutMs,
      );
    });
    races.push(timeoutPromise);

    // Abort signal
    if (signal) {
      const abortPromise = new Promise<never>((_, reject) => {
        if (signal.aborted) {
          reject(new Error("Aborted"));
          return;
        }
        signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
      });
      races.push(abortPromise);
    }

    await Promise.race(races);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    const output = buildOutput(warnings, sess.logs);
    return {
      output,
      duration: Date.now() - start,
    };
  } catch (err) {
    // --- Layer 3: Graceful error with recovery context ---
    const error = err instanceof Error ? err.message : String(err);
    const partialOutput = buildOutput(warnings, sess.logs);
    const storeInfo = sess.store.getStatus();
    const recoveryHint =
      storeInfo !== "$ is empty"
        ? `Your $ store survived. Use $.<var> to continue from where you left off.\n${storeInfo}`
        : "$ store is empty — nothing to recover.";

    const output = partialOutput
      ? `${partialOutput}\n\n\u274c ${error}\n\n${recoveryHint}`
      : `\u274c ${error}\n\n${recoveryHint}`;

    return {
      output,
      error,
      duration: Date.now() - start,
    };
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
        const raw = (await exec(params)) ?? "";
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
        return (await exec(params)) ?? "";
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
      escaped = true;
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
      escaped = false;
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
        const active = isContextGuardActive(getUsage) ? " 🚫 ACTIVE (context critical)" : "";
        ctx.ui.notify(`Context guard: ${state} (threshold ${(CONTEXT_GUARD_THRESHOLD * 100).toFixed(0)}%). Current: ${pct}%${active}`, "info");
      }
    },
  });

  // Hard guard: if LLM somehow calls a code-mode-only tool directly, redirect it
  pi.on("tool_call", async (event) => {
    if (!escaped && CODE_MODE_ONLY_TOOLS.has(event.toolName)) {
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
            "Execution timeout in seconds (default: 120, max: 600). " +
            "Increase for long-running operations like browser automation or large builds.",
          promptGuidelines: [
            "Use man('ToolName') to see detailed help for any sandbox function.",
            "Use $ to persist data across code blocks — no time limit, only 150MB memory cap.",
            "Errors are non-fatal. $ survives. After an error, reference $.var to continue.",
            "Bash timeouts return { timedOut: true } instead of throwing.",
            "Prefer one large code block over many small execute_code calls.",
          ],
          minimum: 1,
          maximum: 600,
        }),
      ),
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      const timeoutMs = params.timeout
        ? Math.min(params.timeout * 1000, MAX_EXECUTION_TIMEOUT_MS)
        : DEFAULT_EXECUTION_TIMEOUT_MS;
      // Check escape mode toggle after execution
      const sess = getSession();
      const wantEscape = sess.store.proxy.__escaped === true;
      if (wantEscape !== escaped) {
        escaped = wantEscape;
        if (escaped) {
          pi.setActiveTools(pi.getAllTools().map((t) => t.name));
        } else {
          const allowed = pi
            .getAllTools()
            .filter((t) => PASSTHROUGH_TOOLS.has(t.name) || !CODE_MODE_ONLY_TOOLS.has(t.name))
            .map((t) => t.name);
          pi.setActiveTools(allowed);
        }
      }
      const { output, error, duration } = await executeCode(
        params.code,
        ctx.cwd,
        signal,
        timeoutMs,
        {
          sessionManager: (ctx as any).sessionManager,
          getContextUsage: (ctx as any).getContextUsage,
          confirmFn: (ctx as any).ui?.confirm?.bind((ctx as any).ui) as
            | ((title: string, body: string) => Promise<boolean>)
            | undefined,
          compact: (ctx as any).compact?.bind(ctx),
          setLabel: (id: string, label: string | undefined) => pi.setLabel(id, label),
          abort: () => ctx.abort(),
          model: (ctx as any).model,
          modelRegistry: (ctx as any).modelRegistry,
          sendUserMessage: (content: string, options?: { deliverAs?: "steer" | "followUp" }) =>
            pi.sendUserMessage(content, options),
          sendMessage: (
            message: { customType: string; content: string; display?: boolean },
            options?: { deliverAs?: "steer" | "followUp"; triggerTurn?: boolean },
          ) => (pi as any).sendMessage?.(message, options),
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
      const ctxFooter = buildContextFooter(ctx as any);
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

  // Stash compaction data into $.preCompact for post-compaction review
  pi.on("session_before_compact", async (event, ctx) => {
    const { preparation } = event;
    try {
      // Build outline of what's being compacted
      const outline: string[] = [];
      for (const msg of preparation.messagesToSummarize) {
        if (typeof msg.content === "string") {
          outline.push("[" + msg.role + "] " + msg.content.slice(0, 200));
        } else if (Array.isArray(msg.content)) {
          const text = (msg.content as any[]).filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").trim();
          const tools = (msg.content as any[]).filter((p: any) => p.type === "toolCall").map((p: any) => p.name);
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
    } catch (e: any) {
      console.error("[code-mode] preCompact outline error:", e?.message || e);
    }
    // Let compaction proceed normally
    return undefined;
  });

  // After compaction completes, add summary to $.preCompact and inject continuation
  pi.on("session_compact", async (event) => {
    try {
      const sess = getSession();
      const existing = sess.store.proxy.preCompact || {};
      sess.store.proxy.preCompact = {
        ...existing,
        summary: event.compactionEntry.summary,
      };

    } catch (e: any) {
      console.error("[code-mode] preCompact summary error:", e?.message || e);
    }
  });

  // Deferred context checkout — navigate after the current turn completes
  pi.on("turn_end", async (_event, ctx) => {
    if (!pendingCheckout) return;
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

  // Inject code-mode declarations and instructions into system prompt
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt + "\n\n" + CODE_MODE_SYSTEM_PROMPT + "\n\n" + cachedToolReference,
    };
  });
}
