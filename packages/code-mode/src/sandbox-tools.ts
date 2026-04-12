import { fffFindAPI, fffGrepAPI, fffMultiGrepAPI } from "@pi-extensions/fff/api";
import {
  foresightContext,
  foresightRecall,
  foresightUnfold,
} from "@pi-extensions/shared/foresight-read";
import { runEditHooks } from "../../shared/src/edit-hooks";
import { foresightRetain } from "@pi-extensions/shared/foresight-write";
import {
  isGitPath,
  isGitUnsafeBash,
  isProcessKillBroadcast,
} from "@pi-extensions/shared/git-guards";
import { isLocked, lockError } from "./shell-utils";
import { maiDep } from "../../shared/src/mai-binary";
import { safeResponseJson } from "@pi-extensions/shared/safe-json";
import {
  tldrArchAPI,
  tldrCallsAPI,
  tldrDeadAPI,
  tldrExtractAPI,
  tldrImpactAPI,
  tldrIndexStatusAPI,
  tldrSemanticSearchAPI,
  tldrStructureAPI,
} from "@pi-extensions/tldr-code/api";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import TurndownService from "turndown";
import type { HashlineEdit } from "./hashline";
import { applyHashEdits, formatHashLines } from "./hashline";
import { parsePatchText, patchDeriveNewContent } from "./patch-parser";
import {
  FORESIGHT_BANK,
  SUBPROCESS_TIMEOUT_MS,
  gitGuardError,
  isGitLockActive,
  processKillGuardError,
  resolvePath,
  spawnAsync,
  splitShellArgs,
} from "./shell-utils";
import { formatManPage } from "./tool-reference";
import type { SandboxContext } from "./types";

/** Wrap a namespace callable so its methods survive the VM context boundary.
 *  Bun's vm.createContext proxy strips function own-properties, so
 *  fn.method = ... disappears when fn is accessed inside the VM.
 *  This Proxy re-exposes them via get/getOwnPropertyDescriptor traps. */
function vmSafe<T extends Function>(fn: T): T {
  return new Proxy(fn, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      return undefined;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) return { configurable: true, enumerable: true, value: (target as any)[prop] };
      return undefined;
    },
  }) as T;
}

export function createToolBindings(ctx: SandboxContext): Record<string, unknown> {
  const { cwd, images, signal, sessionManager } = ctx;
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  turndown.remove(["script", "style", "meta", "link", "noscript"]);

  /** Throw if the abort signal has fired. */
  const throwIfAborted = () => {
    if (signal?.aborted) throw new Error("Aborted");
  };

  // ==========================================================================
  // mai — callable raw CLI + namespaced helpers for structured operations
  // ==========================================================================

  const maiResolveDir = (explicitCwd?: string) =>
    explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;

  async function maiRun(args: string[], dir: string) {
    maiDep.guard();
    // Spawn by ABSOLUTE path so we never depend on PATH at spawn time.
    // This is the fix for posix_spawn 'mai' ENOENT failures in sessions
    // where the child process inherits a stripped or stale PATH even though
    // the binary resolved fine at extension init time.
    const cmd = maiDep.resolved ?? "mai";
    let result = await spawnAsync({ cmd, args, cwd: dir, signal });
    // ENOENT recovery: cached path may be stale (binary moved/reinstalled
    // mid-session). Re-probe once and retry with the fresh absolute path.
    if (result.error && /ENOENT/i.test(result.error.message)) {
      if (maiDep.recheck() && maiDep.resolved && maiDep.resolved !== cmd) {
        result = await spawnAsync({ cmd: maiDep.resolved, args, cwd: dir, signal });
      }
    }
    if (result.error) throw new Error(`mai error: ${result.error.message}`);
    return result;
  }

  type MaiFn = (input?: { args?: string; cwd?: string }) => Promise<{ stdout: string; exitCode: number }>;
  type MaiNs = MaiFn & {
    /** Create a structured ticket with optional Goal/AC/Verification body. */
    ticket: (input: {
      title: string;
      description: string;
      tags: string;
      type?: string;
      priority?: number;
      goal?: string;
      acceptanceCriteria?: string[];
      verification?: string[];
      start?: boolean;
      cwd?: string;
    }) => Promise<{ id: string; started: boolean; message: string }>;
    /** Start a ticket (mai start <id>). */
    start: (id: string, opts?: { cwd?: string }) => Promise<{ ok: boolean }>;
    /** Close a ticket (mai close <id>). */
    close: (id: string, opts?: { cwd?: string }) => Promise<{ ok: boolean }>;
    /** Show a ticket (mai --json show <id>). Returns parsed JSON. */
    show: (id: string, opts?: { cwd?: string }) => Promise<unknown>;
    /** Add an inline note (mai add-note <id> <text>). */
    note: (id: string, text: string, opts?: { cwd?: string }) => Promise<{ ok: boolean }>;
    /** Add a note from a file (mai add-note <id> --file <path>). */
    noteFile: (id: string, filePath: string, opts?: { cwd?: string }) => Promise<{ ok: boolean }>;
    /** List tickets (mai ls). */
    ls: (opts?: { cwd?: string }) => Promise<{ stdout: string; exitCode: number }>;
  };

  const mai: MaiNs = (async ({ args = "ls", cwd: explicitCwd }: { args?: string; cwd?: string } = {}) => {
    const dir = maiResolveDir(explicitCwd);
    const result = await maiRun(splitShellArgs(args), dir);
    const stdout = (result.stdout || "") + (result.stderr ? "\n" + result.stderr : "");
    return { stdout: stdout.trim(), exitCode: result.status ?? 1 };
  }) as MaiNs;

  mai.ticket = async ({
    title, description, tags,
    type = "task", priority = 2,
    goal, acceptanceCriteria, verification,
    start = true, cwd: explicitCwd,
  }) => {
    const dir = maiResolveDir(explicitCwd);
    const buildChecklist = (items?: string[]) => {
      const filtered = (items ?? []).filter((s) => s.trim());
      const effective = filtered.length > 0 ? filtered : ["TODO"];
      return effective.map((item) => `- [ ] ${item}`).join("\n");
    };
    const goalText = (goal || description).trim();
    const body = `${description}\n\n## Goal\n${goalText}\n\n## Acceptance Criteria\n${buildChecklist(acceptanceCriteria)}\n\n## Verification\n${buildChecklist(verification)}`;

    const createResult = await maiRun(
      ["ticket", title, type, "-p", String(priority), "-l", tags, "-d", body],
      dir,
    );
    if (createResult.status !== 0) {
      throw new Error(`mai ticket failed: ${(createResult.stderr || createResult.stdout || "").trim()}`);
    }
    const id = (createResult.stdout || "").trim().split(/\s+/)[0];
    if (!id) throw new Error("Failed to parse ticket id from mai output");

    let started = false;
    if (start) {
      const startResult = await maiRun(["start", id], dir);
      started = startResult.status === 0;
    }
    return { id, started, message: `Created ${id}${started ? " (started)" : ""}.` };
  };

  mai.start = async (id, opts) => {
    const result = await maiRun(["start", id], maiResolveDir(opts?.cwd));
    return { ok: result.status === 0 };
  };

  mai.close = async (id, opts) => {
    const result = await maiRun(["close", id], maiResolveDir(opts?.cwd));
    return { ok: result.status === 0 };
  };

  mai.show = async (id, opts) => {
    const result = await maiRun(["--json", "show", id], maiResolveDir(opts?.cwd));
    if (result.status !== 0) {
      throw new Error(`mai show failed: ${(result.stderr || result.stdout || "").trim()}`);
    }
    try {
      return JSON.parse(result.stdout || "{}");
    } catch (e) {
      throw new Error(`mai show: invalid JSON: ${(e as Error).message}`);
    }
  };

  mai.note = async (id, text, opts) => {
    const result = await maiRun(["add-note", id, text], maiResolveDir(opts?.cwd));
    return { ok: result.status === 0 };
  };

  mai.noteFile = async (id, filePath, opts) => {
    const result = await maiRun(["add-note", id, "--file", filePath], maiResolveDir(opts?.cwd));
    return { ok: result.status === 0 };
  };

  mai.ls = async (opts) => {
    const result = await maiRun(["ls"], maiResolveDir(opts?.cwd));
    const stdout = (result.stdout || "") + (result.stderr ? "\n" + result.stderr : "");
    return { stdout: stdout.trim(), exitCode: result.status ?? 1 };
  };

  // ==========================================================================
  // memory namespace — callable (recall) + methods
  // ==========================================================================

  const memory = async ({
    query,
    limit = 10,
    factType,
    minScore,
    bank,
  }: {
    query: string;
    limit?: number;
    factType?: string;
    minScore?: number;
    bank?: string;
  }) => {
    const data = await foresightRecall(bank || FORESIGHT_BANK, query, limit, factType, minScore);
    return JSON.stringify(data);
  };

  (memory as any).context = async ({
    task,
    maxNodes = 10,
    bank,
  }: {
    task: string;
    maxNodes?: number;
    bank?: string;
  }) => {
    return foresightContext(bank || FORESIGHT_BANK, task, maxNodes);
  };

  (memory as any).create = async ({
    factType,
    oneLiner,
    summary,
    fullSynthesis,
    entityName,
    repo,
    bank,
  }: {
    factType: string;
    oneLiner: string;
    summary: string;
    fullSynthesis?: string;
    entityName?: string;
    repo?: string;
    bank?: string;
  }) => {
    const result = await foresightRetain(bank || FORESIGHT_BANK, {
      factType: factType as any,
      oneLiner,
      summary,
      fullSynthesis,
      entityName,
      repo,
    });
    return JSON.stringify(result);
  };

  (memory as any).unfold = async ({
    nodeId,
    depth = "full",
    bank,
  }: {
    nodeId: string;
    depth?: string;
    bank?: string;
  }) => {
    const data = await foresightUnfold(bank || FORESIGHT_BANK, nodeId, depth);
    return JSON.stringify(data);
  };

  (memory as any).status = async () => {
    return JSON.stringify({
      backend: "foresight",
      bank: FORESIGHT_BANK,
      status: "ok",
    });
  };

  (memory as any).subscribe = async ({
    nodeId,
    entity,
    topic,
    subscriber,
  }: {
    nodeId?: string;
    entity?: string;
    topic?: string;
    subscriber?: string;
  }) => {
    const watching = nodeId
      ? `node:${nodeId.slice(0, 8)}…`
      : entity
        ? `entity:${entity}`
        : `topic:${topic}`;
    return JSON.stringify({
      status: "acknowledged",
      subscriptionId: `stub-${Date.now()}`,
      watching,
      note: "Pub/sub not available with Foresight backend",
    });
  };

  (memory as any).unsubscribe = async ({ subscriptionId }: { subscriptionId: string }) => {
    return JSON.stringify({ status: "acknowledged", subscriptionId });
  };

  (memory as any).checkUpdates = async (input?: { subscriber?: string }) => {
    return JSON.stringify({ updates: [], note: "Pub/sub not available with Foresight backend" });
  };
  const _memory = vmSafe(memory);

  // ==========================================================================
  // brave namespace — callable (search) + codeSearch method
  // ==========================================================================

  const brave = async ({
    query,
    numResults = 5,
    type = "llm_context",
  }: {
    query: string;
    numResults?: number;
    type?: string;
  }) => {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) throw new Error("BRAVE_API_KEY not set");

    const url =
      type === "web"
        ? "https://api.search.brave.com/res/v1/web/search"
        : "https://api.search.brave.com/res/v1/llm/context";

    const params = new URLSearchParams({ q: query, count: String(numResults) });
    const r = await fetch(`${url}?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        "X-Subscription-Token": apiKey,
      },
      signal: signal ? AbortSignal.any([AbortSignal.timeout(15_000), signal]) : AbortSignal.timeout(15_000),
    });

    if (!r.ok) throw new Error(`Brave API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await safeResponseJson<Record<string, any>>(r);

    if (type !== "web") {
      const results = (data.grounding?.generic ?? []) as Array<{
        title: string;
        url: string;
        snippets: string[];
      }>;
      return (
        results
          .map(
            (res) =>
              `### ${res.title}\n${res.url}\n\n${res.snippets?.slice(0, 3).join("\n\n") || ""}`,
          )
          .join("\n\n---\n\n") || "No results."
      );
    }

    const results = (data.web?.results ?? []) as Array<{
      title: string;
      url: string;
      description?: string;
    }>;
    return (
      results
        .map(
          (res, i) =>
            `${i + 1}. ${res.title}\n   ${res.url}\n   ${(res.description || "").replace(/<\/?strong>/g, "**")}`,
        )
        .join("\n\n") || "No results."
    );
  };

  (brave as any).codeSearch = async ({ query, numResults = 5 }: { query: string; numResults?: number }) => {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) throw new Error("BRAVE_API_KEY not set");

    const params = new URLSearchParams({ q: query, count: String(numResults) });
    const r = await fetch(`https://api.search.brave.com/res/v1/llm/context?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        "X-Subscription-Token": apiKey,
      },
      signal: signal ? AbortSignal.any([AbortSignal.timeout(15_000), signal]) : AbortSignal.timeout(15_000),
    });

    if (!r.ok) throw new Error(`Brave API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await safeResponseJson<Record<string, any>>(r);
    const results = (data.grounding?.generic ?? []) as Array<{
      title: string;
      url: string;
      snippets: string[];
    }>;
    return (
      results
        .map(
          (res) =>
            `### ${res.title}\n${res.url}\n\n${res.snippets?.slice(0, 3).join("\n\n") || ""}`,
        )
        .join("\n\n---\n\n") || "No results."
    );
  };

  // ==========================================================================
  // hash namespace — callable (read) + edit method
  // ==========================================================================

  const hash = async ({
    path: filePath,
    cwd: explicitCwd,
    startLine,
    endLine,
  }: {
    path: string;
    cwd?: string;
    startLine?: number;
    endLine?: number;
  }) => {
    const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
    const resolved = resolvePath(filePath, base);
    const content = fs.readFileSync(resolved, "utf-8");
    return formatHashLines(content, startLine ?? 1, endLine);
  };

  (hash as any).edit = async ({
    path: filePath,
    cwd: explicitCwd,
    edits,
  }: {
    path: string;
    cwd?: string;
    edits: HashlineEdit[];
  }) => {
    if (isLocked()) throw new Error(lockError("hashEdit"));
    const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
    const resolved = resolvePath(filePath, base);
    if (isGitLockActive() && isGitPath(resolved)) {
      const title = "⚠️ .git write detected";
      const body = `hashEdit ${filePath}\n\nThis can corrupt your repository. Allow?`;
      if (ctx.confirmFn) {
        const ok = await ctx.confirmFn(title, body);
        if (!ok) throw new Error(gitGuardError(`hashEdit ${filePath}`));
        ctx.logFn?.(`✅ Hooman approved hashEdit ${filePath} [OK]`);
      } else {
        throw new Error(gitGuardError(`hashEdit ${filePath}`));
      }
    }
    await runEditHooks({ phase: "pre", toolName: "hashEdit", filePaths: [resolved], cwd, sessionManager, signal });
    const before = fs.readFileSync(resolved, "utf-8");
    const { updated, appliedEdits } = applyHashEdits(before, edits);
    const changed = updated !== before;
    if (changed) {
      fs.writeFileSync(resolved, updated, "utf-8");
    }
    await runEditHooks({ phase: "post", toolName: "hashEdit", filePaths: [resolved], cwd, sessionManager, signal });
    return {
      appliedEdits,
      changed,
      summary: `Applied ${appliedEdits} edit(s) to ${filePath}.${changed ? "" : " (no changes)"}`,
    };
  };
  const _hash = vmSafe(hash);

  // ==========================================================================
  // context7 namespace — callable (resolve) + docs method
  // ==========================================================================

  const context7 = async ({ query, libraryName }: { query: string; libraryName: string }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    const apiKey = process.env.CONTEXT7_API_KEY;
    if (apiKey) headers["CONTEXT7_API_KEY"] = apiKey;

    const res = await fetch("https://mcp.context7.com/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "resolve-library-id", arguments: { query, libraryName } },
      }),
      signal: signal ? AbortSignal.any([AbortSignal.timeout(30_000), signal]) : AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Context7 returned ${res.status}: ${await res.text()}`);
    const json = await safeResponseJson<{
      result?: { content?: Array<{ text?: string }> };
      error?: { message?: string };
    }>(res);
    if (json.error)
      throw new Error(`Context7 error: ${json.error.message ?? JSON.stringify(json.error)}`);
    return json.result?.content?.map((c) => c.text).join("\n") ?? "";
  };

  (context7 as any).docs = async ({ libraryId, query }: { libraryId: string; query: string }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    const apiKey = process.env.CONTEXT7_API_KEY;
    if (apiKey) headers["CONTEXT7_API_KEY"] = apiKey;

    const res = await fetch("https://mcp.context7.com/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "query-docs", arguments: { libraryId, query } },
      }),
      signal: signal ? AbortSignal.any([AbortSignal.timeout(30_000), signal]) : AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Context7 returned ${res.status}: ${await res.text()}`);
    const json = await safeResponseJson<{
      result?: { content?: Array<{ text?: string }> };
      error?: { message?: string };
    }>(res);
    if (json.error)
      throw new Error(`Context7 error: ${json.error.message ?? JSON.stringify(json.error)}`);
    return json.result?.content?.map((c) => c.text).join("\n") ?? "";
  };
  const _context7 = vmSafe(context7);

  // ==========================================================================
  // fff namespace — callable (find) + grep/multiGrep methods
  // ==========================================================================

  const fff = async ({
    query,
    maxResults,
    cwd: explicitCwd,
  }: {
    query: string;
    maxResults?: number;
    cwd?: string;
  }) => {
    const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
    const result = await fffFindAPI(query, { maxResults, cwd: dir });
    if (result.error) throw new Error(`fffFind error: ${result.error}`);
    return result.text;
  };

  (fff as any).grep = async ({
    query,
    mode,
    maxResults,
    context,
    cwd: explicitCwd,
  }: {
    query: string;
    mode?: string;
    maxResults?: number;
    context?: number;
    cwd?: string;
  }) => {
    const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
    const result = await fffGrepAPI(query, { mode, maxResults, context, cwd: dir });
    if (result.error) throw new Error(`fffGrep error: ${result.error}`);
    return result.text;
  };

  (fff as any).multiGrep = async ({
    patterns,
    constraints,
    maxResults,
    context,
    cwd: explicitCwd,
  }: {
    patterns: string[];
    constraints?: string;
    maxResults?: number;
    context?: number;
    cwd?: string;
  }) => {
    const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
    const result = await fffMultiGrepAPI(patterns, { constraints, maxResults, context, cwd: dir });
    if (result.error) throw new Error(`fffMultiGrep error: ${result.error}`);
    return result.text;
  };
  const _fff = vmSafe(fff);

  // ==========================================================================
  // tldr namespace — callable (search) + structure/calls/extract/dead/arch/impact/indexStatus
  // ==========================================================================

  const tldr = async ({
    query,
    path: projectPath,
    k,
    expand,
  }: {
    query: string;
    path?: string;
    k?: number;
    expand?: boolean;
  }) => {
    const { results, error } = await tldrSemanticSearchAPI(query, {
      path: projectPath,
      k,
      expand,
      cwd,
    });
    if (error) throw new Error(error);
    return results;
  };

  (tldr as any).structure = async ({ path: targetPath, lang }: { path: string; lang?: string }) => {
    const { data, error } = await tldrStructureAPI(targetPath, { lang, cwd });
    if (error) throw new Error(error);
    return data;
  };

  (tldr as any).calls = async ({ path: targetPath }: { path: string }) => {
    const { data, error } = await tldrCallsAPI(targetPath, { cwd });
    if (error) throw new Error(error);
    return data;
  };

  (tldr as any).extract = async ({ file }: { file: string }) => {
    const { data, error } = await tldrExtractAPI(file, { cwd });
    if (error) throw new Error(error);
    return data;
  };

  (tldr as any).dead = async ({ path: targetPath }: { path: string }) => {
    const { data, error } = await tldrDeadAPI(targetPath, { cwd });
    if (error) throw new Error(error);
    return data;
  };

  (tldr as any).arch = async ({ path: targetPath }: { path: string }) => {
    const { data, error } = await tldrArchAPI(targetPath, { cwd });
    if (error) throw new Error(error);
    return data;
  };

  (tldr as any).impact = async ({ func, path: targetPath }: { func: string; path: string }) => {
    const { data, error } = await tldrImpactAPI(func, targetPath, { cwd });
    if (error) throw new Error(error);
    return data;
  };

  (tldr as any).indexStatus = async (input?: { path?: string }) => {
    return tldrIndexStatusAPI(input?.path ?? cwd);
  };
  const _tldr = vmSafe(tldr);

  const tools = {
    Bash: async ({
      command,
      cwd: explicitCwd,
      timeout,
    }: {
      command: string;
      cwd?: string;
      timeout?: number;
    }) => {
      throwIfAborted();
      if (isLocked()) throw new Error(lockError("Bash"));
      // Process-kill broadcast guard — ALWAYS active, not gated by git-lock mode.
      const killResult = isProcessKillBroadcast(command);
      if (killResult) throw new Error(processKillGuardError(killResult.reason));

      if (isGitLockActive()) {
        const gitResult = isGitUnsafeBash(command);
        if (gitResult) {
          const title = gitResult.type === "destructive"
            ? "⚠️ Destructive git operation"
            : "⚠️ .git write detected";
          const body = gitResult.type === "destructive"
            ? gitResult.reason + "\n\nAllow?"
            : gitResult.reason + "\n\nThis can corrupt your repository. Allow?";

          if (ctx.confirmFn) {
            const ok = await ctx.confirmFn(title, body);
            if (!ok) throw new Error(gitGuardError(gitResult.reason));
            ctx.logFn?.("✅ Hooman approved " + gitResult.reason + " [OK]");
          } else {
            throw new Error(gitGuardError(gitResult.reason));
          }
        }
      }
      const timeoutMs = timeout ? timeout * 1000 : SUBPROCESS_TIMEOUT_MS;
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const result = await spawnAsync({
        cmd: "sh",
        args: ["-c", command],
        cwd: dir,
        timeout: timeoutMs,
        signal,
      });
      if (result.error) {
        const isTimeout = result.error.message.includes("Timed out");
        if (isTimeout) {
          // Non-fatal: return timeout info instead of killing the whole script
          return {
            stdout: result.stdout || "",
            stderr:
              (result.stderr || "") +
              (result.stderr ? "\n" : "") +
              `[TIMEOUT] ${result.error.message}`,
            exitCode: -1,
            timedOut: true,
          };
        }
        throw new Error(`Bash error: ${result.error.message}`);
      }
      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.status ?? 0,
        timedOut: false,
      };
    },

    Python: async ({
      code,
      cwd: explicitCwd,
      timeout,
    }: {
      code: string;
      cwd?: string;
      timeout?: number;
    }) => {
      throwIfAborted();
      if (isLocked()) throw new Error(lockError("Python"));
      const timeoutMs = timeout ? timeout * 1000 : SUBPROCESS_TIMEOUT_MS;
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const tmpFile = path.join(os.tmpdir(), `pi-python-${Date.now()}-${Math.random().toString(36).slice(2)}.py`);
      fs.writeFileSync(tmpFile, code, "utf-8");
      try {
        const result = await spawnAsync({
          cmd: "python3",
          args: [tmpFile],
          cwd: dir,
          timeout: timeoutMs,
          signal,
        });
        if (result.error) {
          const isTimeout = result.error.message.includes("Timed out");
          if (isTimeout) {
            return {
              stdout: result.stdout || "",
              stderr:
                (result.stderr || "") +
                (result.stderr ? "\n" : "") +
                `[TIMEOUT] ${result.error.message}`,
              exitCode: -1,
              timedOut: true,
            };
          }
          throw new Error(`Python error: ${result.error.message}`);
        }
        return {
          stdout: result.stdout || "",
          stderr: result.stderr || "",
          exitCode: result.status ?? 0,
          timedOut: false,
        };
      } finally {
        try { fs.unlinkSync(tmpFile); } catch { /* temp file cleanup best-effort */ }
      }
    },

    Read: async ({
      path: filePath,
      cwd: explicitCwd,
      offset,
      limit,
    }: {
      path: string;
      cwd?: string;
      offset?: number;
      limit?: number;
    }) => {
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);
      const content = fs.readFileSync(resolved, "utf-8");
      if (!offset && !limit) return content;
      const lines = content.split("\n");
      const start = Math.max(0, (offset || 1) - 1);
      const end = limit ? start + limit : lines.length;
      return lines.slice(start, end).join("\n");
    },

    Write: async ({
      path: filePath,
      cwd: explicitCwd,
      content,
    }: {
      path: string;
      cwd?: string;
      content: string;
    }) => {
      if (isLocked()) throw new Error(lockError("Write"));
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);
      if (isGitLockActive() && isGitPath(resolved)) {
        const title = "⚠️ .git write detected";
        const body = `write to ${filePath}\n\nThis can corrupt your repository. Allow?`;
        if (ctx.confirmFn) {
          const ok = await ctx.confirmFn(title, body);
          if (!ok) throw new Error(gitGuardError(`write to ${filePath}`));
          ctx.logFn?.(`✅ Hooman approved write to ${filePath} [OK]`);
        } else {
          throw new Error(gitGuardError(`write to ${filePath}`));
        }
      }
      await runEditHooks({ phase: "pre", toolName: "Write", filePaths: [resolved], cwd, sessionManager, signal });
      const dir = path.dirname(resolved);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(resolved, content, "utf-8");
      await runEditHooks({ phase: "post", toolName: "Write", filePaths: [resolved], cwd, sessionManager, signal });
    },

    Edit: async ({
      path: filePath,
      cwd: explicitCwd,
      oldText,
      newText,
    }: {
      path: string;
      cwd?: string;
      oldText: string;
      newText: string;
    }) => {
      if (isLocked()) throw new Error(lockError("Edit"));
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);
      if (isGitLockActive() && isGitPath(resolved)) {
        const title = "⚠️ .git write detected";
        const body = `edit ${filePath}\n\nThis can corrupt your repository. Allow?`;
        if (ctx.confirmFn) {
          const ok = await ctx.confirmFn(title, body);
          if (!ok) throw new Error(gitGuardError(`edit ${filePath}`));
          ctx.logFn?.(`✅ Hooman approved edit ${filePath} [OK]`);
        } else {
          throw new Error(gitGuardError(`edit ${filePath}`));
        }
      }
      const content = fs.readFileSync(resolved, "utf-8");
      if (!content.includes(oldText)) {
        return { matched: false };
      }
      // Replace first occurrence only
      const updated = content.replace(oldText, () => newText);
      await runEditHooks({ phase: "pre", toolName: "Edit", filePaths: [resolved], cwd, sessionManager, signal });
      fs.writeFileSync(resolved, updated, "utf-8");
      await runEditHooks({ phase: "post", toolName: "Edit", filePaths: [resolved], cwd, sessionManager, signal });
      return { matched: true };
    },

    Glob: async ({ pattern, path: searchPath }: { pattern: string; path?: string }) => {
      const dir = searchPath ? resolvePath(searchPath, cwd) : cwd;
      const result = await spawnAsync({
        cmd: "fd",
        args: ["--glob", pattern, "--type", "f", "."],
        cwd: dir,
        signal,
      });
      if (result.error) {
        throw new Error(`Glob failed: ${result.error.message}`);
      }
      return (result.stdout || "").trim().split("\n").filter(Boolean);
    },

    rg: async ({ args, cwd: explicitCwd }: { args: string; cwd?: string }) => {
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const result = await spawnAsync({
        cmd: "rg",
        args: splitShellArgs(args),
        cwd: dir,
        signal,
      });
      if (result.error) {
        throw new Error(`rg error: ${result.error.message}`);
      }
      // Return stdout, or stderr if stdout is empty (e.g., no matches produces exit 1)
      return result.stdout || result.stderr || "";
    },

    fd: async ({ args, cwd: explicitCwd }: { args: string; cwd?: string }) => {
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const result = await spawnAsync({
        cmd: "fd",
        args: splitShellArgs(args),
        cwd: dir,
        signal,
      });
      if (result.error) {
        throw new Error(`fd error: ${result.error.message}`);
      }
      return result.stdout || result.stderr || "";
    },

    WebFetch: async ({
      url,
      format = "text",
      timeout = 30,
    }: {
      url: string;
      format?: string;
      timeout?: number;
    }) => {
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("URL must start with http:// or https://");
      }
      const fetchSignal = signal
        ? AbortSignal.any([AbortSignal.timeout(Math.min(timeout, 120) * 1000), signal])
        : AbortSignal.timeout(Math.min(timeout, 120) * 1000);
      const response = await fetch(url, {
        signal: fetchSignal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          Accept: "text/html,text/plain,text/markdown,*/*",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const html = await response.text();

      if (format === "html") return html;
      if (format === "markdown") return turndown.turndown(html);
      // text: strip tags
      return html
        .replace(/<\s*(script|style|noscript)[^>]*>[\s\S]*?<\s*\/\1\s*>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    sleep: (ms: number) => {
      if (!signal) return new Promise((resolve) => setTimeout(resolve, ms));
      return new Promise((resolve, reject) => {
        if (signal.aborted) { reject(new Error("Aborted")); return; }
        const timer = setTimeout(resolve, ms);
        signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Aborted")); }, { once: true });
      });
    },

    // =====================================================================
    // Ticket management (mai CLI)
    // =====================================================================

    mai: _mai,
    maiTicket: _mai.ticket,  // backward compat — prefer mai.ticket() in new code

    // memory — defined below as namespaced callable
    memory: _memory,
    recall: _memory,
    memoryContext: _memory.context,
    memoryCreate: _memory.create,
    memoryUnfold: _memory.unfold,
    memoryStatus: _memory.status,

    // brave — defined below as namespaced callable
    brave: _brave,
    braveSearch: _brave,
    braveCodeSearch: _brave.codeSearch,

    // =====================================================================
    // Time
    // =====================================================================

    getCurrentTime: async (format?: string) => {
      const now = new Date();
      const fmt = (format || "iso8601").toLowerCase();

      let formatted: string;
      switch (fmt) {
        case "iso8601":
        case "iso":
          formatted = now.toISOString();
          break;
        case "unix":
          formatted = String(Math.floor(now.getTime() / 1000));
          break;
        case "date":
          formatted = now.toLocaleDateString();
          break;
        case "time":
          formatted = now.toLocaleTimeString();
          break;
        default:
          formatted = now.toISOString();
      }

      const offsetMin = -now.getTimezoneOffset();
      const h = Math.floor(Math.abs(offsetMin) / 60);
      const m = Math.abs(offsetMin) % 60;
      const sign = offsetMin >= 0 ? "+" : "-";

      return {
        formatted,
        date: now.toLocaleDateString("en-CA"),
        time: now.toLocaleTimeString("en-GB", { hour12: false }),
        timezone: `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        day_of_week: now.toLocaleDateString("en-US", { weekday: "long" }),
        unix: Math.floor(now.getTime() / 1000),
      };
    },

    // hash — defined below as namespaced callable
    hash: _hash,
    hashRead: _hash,
    hashEdit: _hash.edit,

    // context7 — defined below as namespaced callable
    context7: _context7,
    context7Resolve: _context7,
    context7Docs: _context7.docs,

    // =====================================================================
    // Apply Patch
    // =====================================================================

    applyPatch: async ({ patchText, cwd: explicitCwd }: { patchText: string; cwd?: string }) => {
      if (isLocked()) throw new Error(lockError("applyPatch"));
      if (!patchText) throw new Error("patchText is required");

      const hunks = parsePatchText(patchText);
      if (hunks.length === 0) throw new Error("apply_patch: no hunks found");

      // Guard: check all paths before applying anything
      for (const hunk of hunks) {
        if (isGitLockActive() && isGitPath(hunk.path)) {
          const title = "⚠️ .git write detected";
          const body = `applyPatch targets ${hunk.path}\n\nThis can corrupt your repository. Allow?`;
          if (ctx.confirmFn) {
            const ok = await ctx.confirmFn(title, body);
            if (!ok) throw new Error(gitGuardError(`applyPatch targets ${hunk.path}`));
            ctx.logFn?.(`✅ Hooman approved applyPatch ${hunk.path} [OK]`);
          } else {
            throw new Error(gitGuardError(`applyPatch targets ${hunk.path}`));
          }
        }
        if (hunk.type === "update" && hunk.move_path && isGitPath(hunk.move_path)) {
          if (isGitLockActive()) {
            const title = "⚠️ .git write detected";
            const body = `applyPatch move targets ${hunk.move_path}\n\nThis can corrupt your repository. Allow?`;
            if (ctx.confirmFn) {
              const ok = await ctx.confirmFn(title, body);
              if (!ok) throw new Error(gitGuardError(`applyPatch move targets ${hunk.move_path}`));
              ctx.logFn?.(`✅ Hooman approved applyPatch move ${hunk.move_path} [OK]`);
            } else {
              throw new Error(gitGuardError(`applyPatch move targets ${hunk.move_path}`));
            }
          }
        }
      }

      // Collect all absolute paths this patch will touch (including moves)
      const patchBaseDir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const touchedPaths = new Set<string>();
      for (const hunk of hunks) {
        touchedPaths.add(path.resolve(patchBaseDir, hunk.path));
        if (hunk.type === "update" && hunk.move_path) {
          // NB: matches the existing inner resolve which uses raw cwd, not patchBaseDir.
          touchedPaths.add(path.resolve(cwd, hunk.move_path));
        }
      }
      const touchedPathsArr = [...touchedPaths];

      await runEditHooks({ phase: "pre", toolName: "applyPatch", filePaths: touchedPathsArr, cwd, sessionManager, signal });

      const results: string[] = [];

      for (const hunk of hunks) {
        const filePath = path.resolve(patchBaseDir, hunk.path);

        switch (hunk.type) {
          case "add": {
            const content =
              hunk.contents.length === 0 || hunk.contents.endsWith("\n")
                ? hunk.contents
                : `${hunk.contents}\n`;
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, content, "utf-8");
            results.push(`A ${hunk.path}`);
            break;
          }
          case "delete": {
            fs.unlinkSync(filePath);
            results.push(`D ${hunk.path}`);
            break;
          }
          case "update": {
            const newContent = patchDeriveNewContent(filePath, hunk.chunks);
            const movePath = hunk.move_path ? path.resolve(cwd, hunk.move_path) : undefined;
            if (movePath) {
              fs.mkdirSync(path.dirname(movePath), { recursive: true });
              fs.writeFileSync(movePath, newContent, "utf-8");
              fs.unlinkSync(filePath);
              results.push(`M ${hunk.move_path} (moved from ${hunk.path})`);
            } else {
              fs.writeFileSync(filePath, newContent, "utf-8");
              results.push(`M ${hunk.path}`);
            }
            break;
          }
        }
      }

      await runEditHooks({ phase: "post", toolName: "applyPatch", filePaths: touchedPathsArr, cwd, sessionManager, signal });

      return `Success. Updated the following files:\n${results.join("\n")}`;
    },

    // fff — from namespace above
    fff: _fff,
    fffFind: _fff,
    fffGrep: _fff.grep,
    fffMultiGrep: _fff.multiGrep,

    // memory.subscribe/unsubscribe/checkUpdates — from namespace below
    memorySubscribe: _memory.subscribe,
    memoryUnsubscribe: _memory.unsubscribe,
    memoryCheckUpdates: _memory.checkUpdates,

    // tldr — defined below as namespaced callable
    tldr: _tldr,
    tldrSemanticSearch: _tldr,
    tldrStructure: _tldr.structure,
    tldrCalls: _tldr.calls,
    tldrExtract: _tldr.extract,
    tldrDead: _tldr.dead,
    tldrArch: _tldr.arch,
    tldrImpact: _tldr.impact,
    tldrIndexStatus: _tldr.indexStatus,

    // =====================================================================
    // readImage() — read image file and include in tool result for LLM
    // =====================================================================

    readImage: async ({
      path: filePath,
      cwd: explicitCwd,
    }: {
      path: string;
      cwd?: string;
    }): Promise<string> => {
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);
      const ext = path.extname(resolved).toLowerCase();
      const mimeMap = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
      } as Record<string, string>;
      const mimeType = mimeMap[ext];
      if (!mimeType) {
        throw new Error("Unsupported image type: " + ext + ". Supported: png, jpg, gif, webp");
      }
      const buffer = fs.readFileSync(resolved);
      const base64 = buffer.toString("base64");
      images.push({ data: base64, mimeType });
      return (
        "Image loaded: " +
        path.basename(resolved) +
        " (" +
        mimeType +
        ", " +
        Math.round(buffer.length / 1024) +
        "KB)"
      );
    },

    // =====================================================================
    // man() — get detailed help for any sandbox function
    // =====================================================================

    man: async (name: string): Promise<string> => {
      return formatManPage(name);
    },
  };

  // Lowercase aliases — so agents can use either Bash() or bash(), Read() or read(), etc.
  // camelCase is the "normal" JS convention; PascalCase kept for backwards compat.
  return {
    ...tools,
    bash: tools.Bash,
    python: tools.Python,
    read: tools.Read,
    write: tools.Write,
    edit: tools.Edit,
    glob: tools.Glob,
    webFetch: tools.WebFetch,
  };
}
