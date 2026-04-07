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
// Eagerly start Shiki loading via relative path (must match require() in renderCall)
require("../../shared/src/tui-diff-renderer.ts");
import { createToolBindings } from "../src/sandbox-tools";
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
  };

  const context = vm.createContext(sandbox);
  return { context, store, logs, images };
}

let session: PersistentSession | null = null;
let escaped = false;
let contextSize: number | null = null; // null = send everything

function getSession(): PersistentSession {
  if (!session) session = createSession();
  return session;
}

async function executeCode(
  code: string,
  cwd: string,
  signal?: AbortSignal,
  executionTimeoutMs: number = DEFAULT_EXECUTION_TIMEOUT_MS,
  toolCtx?: { sessionManager?: any; getContextUsage?: () => any; ctx?: any; pi?: any },
): Promise<{ output: string; error?: string; duration: number }> {
  const sess = getSession();

  // Advance turn and process expiry
  sess.store.nextTurn();
  const warnings = sess.store.processExpiry();

  // Clear logs for this execution
  sess.logs.length = 0;

  function extractAutoPersistNames(code: string): string[] {
    const names: string[] = [];
    const lines = code.split("\n");
    let braceDepth = 0;
    let parenDepth = 0;

    for (const rawLine of lines) {
      const trimmed = rawLine.trimStart();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

      // Track scope depth (braces not inside parens are real scope changes)
      for (const ch of rawLine) {
        if (ch === "(" || ch === "[") parenDepth++;
        if (ch === ")" || ch === "]") parenDepth--;
        if (parenDepth <= 0) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }
      }

      // Only match at IIFE body level (depth 0-1)
      if (braceDepth > 1) continue;

      // Match: const/let/var name = (not for...of/in)
      const m = trimmed.match(/^(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
      // Match: function name(...) or async function name(...)
      const fm = !m ? trimmed.match(/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/) : null;
      const name = m?.[1] ?? fm?.[1];
      if (!name) continue;
      if (m && (trimmed.includes(" of ") || trimmed.includes(" in "))) continue;


      names.push(name);
    }

    return [...new Set(names)];
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
  const bindings = createToolBindings({ cwd, images: sess.images });
  Object.assign(sess.context, bindings);

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
  }

  // Generic passthrough tool wrappers — call registered tools from sandbox
  if (toolCtx?.pi && toolCtx?.ctx) {
    const passthroughNames = [
      "mesh_tell", "mesh_ask", "mesh_reply", "mesh_broadcast",
      "mesh_peers", "mesh_view", "mesh_join_channel", "mesh_leave_channel", "mesh_chat",
      "editor_open", "editor_highlight", "editor_reveal", "editor_state",
      "git-ai",
      "hotseat_handbook_update", "hotseat_handbook_read",
    ];
    // Try to get full tool definitions (with execute method)
    const getToolDef = (toolCtx.pi as any).getToolDefinition?.bind(toolCtx.pi)
      ?? ((name: string) => {
        // Fallback: scan getAllTools and hope execute is there (it won't be)
        const info = toolCtx.pi.getAllTools().find((t: any) => t.name === name);
        return info?.execute ? info : undefined;
      });
    const wrappers: Record<string, unknown> = {};
    for (const name of passthroughNames) {
      const tool = getToolDef(name);
      if (!tool?.execute) continue;
      const camelName = name.replace(/[-_]([a-z])/g, (_: string, c: string) => c.toUpperCase());
      wrappers[camelName] = async (params: any = {}) => {
        const result = await tool.execute("sandbox-" + Date.now(), params, undefined, undefined, toolCtx.ctx);
        if (result?.content) {
          if (typeof result.content === "string") return result.content;
          if (Array.isArray(result.content)) {
            return result.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("\n");
          }
        }
        return JSON.stringify(result);
      };
    }
    Object.assign(sess.context, wrappers);
  }

  try {
    const promise = vm.runInContext(wrapped, sess.context, {
      filename: "code-mode.js",
      timeout: SYNC_TIMEOUT_MS,
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
  "apply_patch",
  // Agent orchestration
  "teams",
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
  "mesh_reply",
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
]);

// Tools the LLM must NOT call directly — they exist only inside code-mode sandbox
const CODE_MODE_ONLY_TOOLS = new Set([
  "bash",
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

  // Context window management — filter messages before LLM call
  pi.on("context", (event) => {
    if (contextSize !== null && event.messages.length > contextSize) {
      return { messages: event.messages.slice(-contextSize) };
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
      "Also available: session.messages(), session.tokens(), session.tags(), session.tag(), session.save(), session.load(). " +
      "Passthrough wrappers: meshTell, meshAsk, meshPeers, meshView, meshChat, editorOpen, editorState, gitAi. " +
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
            "Use $ to persist data across code blocks — no time limit, only 50MB memory cap.",
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
        { sessionManager: (ctx as any).sessionManager, getContextUsage: (ctx as any).getContextUsage, ctx, pi },
      );

      let text = output || "";
      if (error) {
        text += (text ? "\n\n" : "") + `Error: ${error}`;
      }
      if (!text) {
        text = "(no output — use console.log() to return results)";
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

    renderCall(args: { code: string }, theme: Theme) {
      const rawLines = (args.code || "").split("\n");
      const preview = rawLines.slice(0, CODE_PREVIEW_LINES);
      const remaining = rawLines.length - preview.length;

      // Syntax-highlight via Shiki (same instance as core-edit-ui)
      let highlighted: string[];
      try {
        const { highlightCode: hl } = require("../../shared/src/tui-diff-renderer.ts");
        highlighted = hl(preview.join("\n"), "code-mode.js");
      } catch {
        highlighted = preview;
      }

      // Replace full reset (\x1b[0m) with FG-only reset (\x1b[39;22;23;24m)
      // so Shiki tokens don't kill the tool container's background
      const FG_RST = "\x1b[39;22;23;24m";
      const safeLines = highlighted.map((l: string) => l.replace(/\x1b\[0m/g, FG_RST));

      let text = theme.fg("toolTitle", theme.bold("execute_code"));
      text += "\n\n" + safeLines.join("\n");
      if (remaining > 0) {
        text += theme.fg("muted", `\n... (${remaining} more lines)`);
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

  // Inject code-mode declarations and instructions into system prompt
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt + "\n\n" + CODE_MODE_SYSTEM_PROMPT + "\n\n" + cachedToolReference,
    };
  });
}
