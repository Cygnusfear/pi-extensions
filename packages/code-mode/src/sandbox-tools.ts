import { fffFindAPI, fffGrepAPI, fffMultiGrepAPI } from "@pi-extensions/fff/api";
import {
  foresightContext,
  foresightRecall,
  foresightUnfold,
} from "@pi-extensions/shared/foresight-read";
import { foresightRetain } from "@pi-extensions/shared/foresight-write";
import {
  isGitPath,
  isGitUnsafeBash,
  isProcessKillBroadcast,
} from "@pi-extensions/shared/git-guards";
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

export function createToolBindings(ctx: SandboxContext): Record<string, unknown> {
  const { cwd, images } = ctx;
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  turndown.remove(["script", "style", "meta", "link", "noscript"]);

  return {
    Bash: async ({
      command,
      cwd: explicitCwd,
      timeout,
    }: {
      command: string;
      cwd?: string;
      timeout?: number;
    }) => {
      // Process-kill broadcast guard — ALWAYS active, not gated by git-lock mode.
      const killResult = isProcessKillBroadcast(command);
      if (killResult) throw new Error(processKillGuardError(killResult.reason));

      if (isGitLockActive()) {
        const gitResult = isGitUnsafeBash(command);
        if (gitResult) throw new Error(gitGuardError(gitResult.reason));
      }
      const timeoutMs = timeout ? timeout * 1000 : SUBPROCESS_TIMEOUT_MS;
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const result = await spawnAsync({
        cmd: "sh",
        args: ["-c", command],
        cwd: dir,
        timeout: timeoutMs,
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
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);
      if (isGitLockActive() && isGitPath(resolved))
        throw new Error(gitGuardError(`write to ${filePath}`));
      const dir = path.dirname(resolved);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(resolved, content, "utf-8");
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
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);
      if (isGitLockActive() && isGitPath(resolved))
        throw new Error(gitGuardError(`edit ${filePath}`));
      const content = fs.readFileSync(resolved, "utf-8");
      if (!content.includes(oldText)) {
        return { matched: false };
      }
      // Replace first occurrence only
      const updated = content.replace(oldText, () => newText);
      fs.writeFileSync(resolved, updated, "utf-8");
      return { matched: true };
    },

    Glob: async ({ pattern, path: searchPath }: { pattern: string; path?: string }) => {
      const dir = searchPath ? resolvePath(searchPath, cwd) : cwd;
      const result = await spawnAsync({
        cmd: "fd",
        args: ["--glob", pattern, "--type", "f", "."],
        cwd: dir,
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
      const signal = AbortSignal.timeout(Math.min(timeout, 120) * 1000);
      const response = await fetch(url, {
        signal,
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

    sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

    // =====================================================================
    // Ticket management (mai CLI)
    // =====================================================================

    mai: async ({ args = "ls", cwd: explicitCwd }: { args?: string; cwd?: string }) => {
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const result = await spawnAsync({
        cmd: "mai",
        args: splitShellArgs(args),
        cwd: dir,
      });
      if (result.error) throw new Error(`mai error: ${result.error.message}`);
      const stdout = (result.stdout || "") + (result.stderr ? "\n" + result.stderr : "");
      return { stdout: stdout.trim(), exitCode: result.status ?? 1 };
    },

    maiTicket: async ({
      title,
      description,
      tags,
      type = "task",
      priority = 2,
      goal,
      acceptanceCriteria,
      verification,
      start = true,
      cwd: explicitCwd,
    }: {
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
    }) => {
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;

      // Build body with Goal/AC/Verification template
      const buildChecklist = (items?: string[]) => {
        const filtered = (items ?? []).filter((s) => s.trim());
        const effective = filtered.length > 0 ? filtered : ["TODO"];
        return effective.map((item) => `- [ ] ${item}`).join("\n");
      };

      const goalText = (goal || description).trim();
      const body = `${description}\n\n## Goal\n${goalText}\n\n## Acceptance Criteria\n${buildChecklist(acceptanceCriteria)}\n\n## Verification\n${buildChecklist(verification)}`;

      // Create ticket: mai ticket "title" type -p priority -l tags -d body
      const createArgs = ["ticket", title, type, "-p", String(priority), "-l", tags, "-d", body];
      const createResult = await spawnAsync({
        cmd: "mai",
        args: createArgs,
        cwd: dir,
      });
      if (createResult.error) throw new Error(`mai ticket error: ${createResult.error.message}`);
      if (createResult.status !== 0) {
        throw new Error(
          `mai ticket failed: ${(createResult.stderr || createResult.stdout || "").trim()}`,
        );
      }

      const id = (createResult.stdout || "").trim().split(/\s+/)[0];
      if (!id) throw new Error("Failed to parse ticket id from mai output");

      // Start ticket
      let started = false;
      if (start) {
        const startResult = await spawnAsync({
          cmd: "mai",
          args: ["start", id],
          cwd: dir,
        });
        started = startResult.status === 0;
      }

      return {
        id,
        started,
        message: `Created ${id}${started ? " (started)" : ""}.`,
      };
    },

    // =====================================================================
    // Foresight memory tools
    // =====================================================================

    recall: async ({
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
    },

    memoryContext: async ({
      task,
      maxNodes = 10,
      bank,
    }: {
      task: string;
      maxNodes?: number;
      bank?: string;
    }) => {
      return foresightContext(bank || FORESIGHT_BANK, task, maxNodes);
    },

    memoryCreate: async ({
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
    },

    memoryUnfold: async ({
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
    },

    memoryStatus: async () => {
      return JSON.stringify({
        backend: "foresight",
        bank: FORESIGHT_BANK,
        status: "ok",
      });
    },

    // =====================================================================
    // Brave Search
    // =====================================================================

    braveSearch: async ({
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
        signal: AbortSignal.timeout(15_000),
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
    },

    braveCodeSearch: async ({ query, numResults = 5 }: { query: string; numResults?: number }) => {
      const apiKey = process.env.BRAVE_API_KEY;
      if (!apiKey) throw new Error("BRAVE_API_KEY not set");

      const params = new URLSearchParams({ q: query, count: String(numResults) });
      const r = await fetch(`https://api.search.brave.com/res/v1/llm/context?${params}`, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "identity",
          "X-Subscription-Token": apiKey,
        },
        signal: AbortSignal.timeout(15_000),
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
    },

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

    // =====================================================================
    // Hashline tools
    // =====================================================================

    hashRead: async ({
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
    },

    hashEdit: async ({
      path: filePath,
      cwd: explicitCwd,
      edits,
    }: {
      path: string;
      cwd?: string;
      edits: HashlineEdit[];
    }) => {
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);
      if (isGitLockActive() && isGitPath(resolved))
        throw new Error(gitGuardError(`hashEdit ${filePath}`));
      const before = fs.readFileSync(resolved, "utf-8");
      const { updated, appliedEdits } = applyHashEdits(before, edits);
      const changed = updated !== before;
      if (changed) {
        fs.writeFileSync(resolved, updated, "utf-8");
      }
      return {
        appliedEdits,
        changed,
        summary: `Applied ${appliedEdits} edit(s) to ${filePath}.${changed ? "" : " (no changes)"}`,
      };
    },

    // =====================================================================
    // Context7 (up-to-date library docs)
    // =====================================================================

    context7Resolve: async ({ query, libraryName }: { query: string; libraryName: string }) => {
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
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Context7 returned ${res.status}: ${await res.text()}`);
      const json = await safeResponseJson<{
        result?: { content?: Array<{ text?: string }> };
        error?: { message?: string };
      }>(res);
      if (json.error)
        throw new Error(`Context7 error: ${json.error.message ?? JSON.stringify(json.error)}`);
      return json.result?.content?.map((c) => c.text).join("\n") ?? "";
    },

    context7Docs: async ({ libraryId, query }: { libraryId: string; query: string }) => {
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
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Context7 returned ${res.status}: ${await res.text()}`);
      const json = await safeResponseJson<{
        result?: { content?: Array<{ text?: string }> };
        error?: { message?: string };
      }>(res);
      if (json.error)
        throw new Error(`Context7 error: ${json.error.message ?? JSON.stringify(json.error)}`);
      return json.result?.content?.map((c) => c.text).join("\n") ?? "";
    },

    // =====================================================================
    // Apply Patch
    // =====================================================================

    applyPatch: async ({ patchText, cwd: explicitCwd }: { patchText: string; cwd?: string }) => {
      if (!patchText) throw new Error("patchText is required");

      const hunks = parsePatchText(patchText);
      if (hunks.length === 0) throw new Error("apply_patch: no hunks found");

      // Guard: check all paths before applying anything
      for (const hunk of hunks) {
        if (isGitLockActive() && isGitPath(hunk.path))
          throw new Error(gitGuardError(`applyPatch targets ${hunk.path}`));
        if (hunk.type === "update" && hunk.move_path && isGitPath(hunk.move_path)) {
          if (isGitLockActive())
            throw new Error(gitGuardError(`applyPatch move targets ${hunk.move_path}`));
        }
      }

      const results: string[] = [];

      for (const hunk of hunks) {
        const filePath = path.resolve(explicitCwd ? resolvePath(explicitCwd, cwd) : cwd, hunk.path);

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

      return `Success. Updated the following files:\n${results.join("\n")}`;
    },

    // =====================================================================
    // FFF — Fast File Finder (fuzzy find + content grep)
    // =====================================================================

    fffFind: async ({
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
    },

    fffGrep: async ({
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
    },

    fffMultiGrep: async ({
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
      const result = await fffMultiGrepAPI(patterns, {
        constraints,
        maxResults,
        context,
        cwd: dir,
      });
      if (result.error) throw new Error(`fffMultiGrep error: ${result.error}`);
      return result.text;
    },

    // =====================================================================
    // Foresight subscriptions (stubs — no live pub/sub yet)
    // =====================================================================

    memorySubscribe: async ({
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
    },

    memoryUnsubscribe: async ({ subscriptionId }: { subscriptionId: string }) => {
      return JSON.stringify({ status: "acknowledged", subscriptionId });
    },

    memoryCheckUpdates: async (input?: { subscriber?: string }) => {
      return JSON.stringify({ updates: [], note: "Pub/sub not available with Foresight backend" });
    },

    // =====================================================================
    // TLDR Code Analysis
    // =====================================================================

    tldrSemanticSearch: async ({
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
    },

    tldrStructure: async ({ path: targetPath, lang }: { path: string; lang?: string }) => {
      const { data, error } = await tldrStructureAPI(targetPath, { lang, cwd });
      if (error) throw new Error(error);
      return data;
    },

    tldrCalls: async ({ path: targetPath }: { path: string }) => {
      const { data, error } = await tldrCallsAPI(targetPath, { cwd });
      if (error) throw new Error(error);
      return data;
    },

    tldrExtract: async ({ file }: { file: string }) => {
      const { data, error } = await tldrExtractAPI(file, { cwd });
      if (error) throw new Error(error);
      return data;
    },

    tldrDead: async ({ path: targetPath }: { path: string }) => {
      const { data, error } = await tldrDeadAPI(targetPath, { cwd });
      if (error) throw new Error(error);
      return data;
    },

    tldrArch: async ({ path: targetPath }: { path: string }) => {
      const { data, error } = await tldrArchAPI(targetPath, { cwd });
      if (error) throw new Error(error);
      return data;
    },

    tldrImpact: async ({ func, path: targetPath }: { func: string; path: string }) => {
      const { data, error } = await tldrImpactAPI(func, targetPath, { cwd });
      if (error) throw new Error(error);
      return data;
    },

    tldrIndexStatus: async (input?: { path?: string }) => {
      return tldrIndexStatusAPI(input?.path ?? cwd);
    },

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
}
