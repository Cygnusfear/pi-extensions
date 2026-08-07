import { fffFindAPI, fffGrepAPI, fffMultiGrepAPI } from "@pi-extensions/fff/api";
import { runEditHooks } from "../../shared/src/edit-hooks";
import { runGuardedConfirm } from "../../shared/src/guarded-confirm.ts";
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
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import TurndownService from "turndown";
import type { HashlineEdit } from "./hashline";
import { applyHashEdits, formatHashLines } from "./hashline";
import { parsePatchText, patchDeriveNewContent } from "./patch-parser";
import {
  SUBPROCESS_TIMEOUT_MS,
  gitGuardError,
  isGitLockActive,
  processKillGuardError,
  resolvePath,
  spawnAsync,
  splitShellArgs,
} from "./shell-utils";
import { formatManPage } from "./tool-reference";
import {
  formatImageAttachmentNote,
  formatImageTooLargeError,
  prepareImagesForAttachment,
  resolveImageBudgetBytes,
} from "./image-prepare";
import type { SandboxContext } from "./types";
import { rtkDep } from "./rtk-dep";
import { createMaiCall, type MaiCallInput } from "./mai-call";

// ─── rtk integration (Arch A: native rtk compaction, raw via failure-tee) ─────────
// rtk (https://github.com/rtk-ai/rtk) is a CLI proxy that compacts noisy dev-command
// output (cargo/tsc/test/lint/git…) by 60–90% before it reaches the agent's context.
// We route code-mode Bash() through it: `rtk rewrite "<cmd>"` (rtk's single source of
// truth for 70+ patterns) tells us the compacting form; we run that. rtk preserves
// exit codes and tees the full raw output on FAILURES, referenced as
// `[full output: <path>]` — which we read and expose via the result's raw() so the
// agent can always retrieve the unfiltered output when rtk drops signal. Global
// opt-out: PI_RTK=0. Graceful no-op when rtk is absent.
/** Ask rtk for the compacting rewrite of a command. Returns the rewrite, or null when
 *  rtk doesn't handle it (run raw). Never reimplements rtk's registry. */
export async function rtkRewrite(rtkBin: string, command: string, env: Record<string, string | undefined>): Promise<string | null> {
	try {
		const r = await spawnAsync({ cmd: rtkBin, args: ["rewrite", command], timeout: 5000, env });
		// rtk rewrite signals via EXIT CODE (3 = rewrite on stdout, 1 = no rewrite ⇒
		// empty stdout), NOT 0/nonzero success — so read stdout regardless of status.
		const out = (r.stdout || "").trim();
		if (!out || out === command) return null;
		if (!/(^|\s)rtk\s/.test(out)) return null; // defensive: must contain an actual rtk invocation
		return out;
	} catch {
		return null;
	}
}

const RTK_TEE_RE = /\n?\[full output:\s*([^\]]+)\]\s*/;

/** Split rtk's compacted output: pull the failure-tee raw (if any) and strip the
 *  `[full output: <path>]` reference from the displayed view. raw is null when rtk
 *  did not tee (e.g. on success) — callers fall back to the compacted text. */
export function rtkSplitTee(compacted: string): { compacted: string; raw: string | null } {
	const m = compacted.match(RTK_TEE_RE);
	if (!m) return { compacted, raw: null };
	let raw: string | null = null;
	try {
		raw = fs.readFileSync(m[1].trim().replace(/^~(?=\/)/, os.homedir()), "utf8");
	} catch {
		raw = null;
	}
	return { compacted: compacted.replace(RTK_TEE_RE, "\n").trim(), raw };
}
// ──────────────────────────────────────────────────────────────────────────────────

export function createToolBindings(ctx: SandboxContext): Record<string, unknown> {
  const { cwd, images, signal, sessionManager, model, modelRegistry } = ctx;
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

  interface ReviewHandoffInput {
    worktree?: string;
    base?: string;
    head?: string;
    commits: string[];
    branch?: string;
    ticket?: string;
    worker?: string;
    session?: string;
    token?: string;
    cwd?: string;
  }

  interface TicketLinkResult {
    ticket: string;
    link: string;
    vscodeLink: string;
    terminalLink: string;
  }

  interface ReviewHandoffResult {
    token: string;
    link: string;
    vscodeLink: string;
    terminalLink: string;
    file: string;
    payload: {
      version: 1;
      token: string;
      createdAt: string;
      worktree: string;
      base?: string;
      head?: string;
      commits: string[];
      commitOrder: "oldest-to-newest";
      branch?: string;
      ticket?: string;
      worker?: string;
      session?: string;
    };
  }

  type MaiFn = (input?: MaiCallInput) => Promise<{ stdout: string; exitCode: number }>;
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
    /** Create a short Maiboard ticket link. */
    ticketLink: (input: string | { ticket: string }) => Promise<TicketLinkResult>;
    /** Create a short Maiboard review handoff link backed by ~/.maitake/review-handoffs/<token>.json. */
    reviewLink: (input: ReviewHandoffInput) => Promise<ReviewHandoffResult>;
    /** Create a KNOWLEDGE constraint — a durable rule, born active, never in mai.ls() (the work queue). Use for "never do X" / invariants. */
    constraint: (title: string, opts?: { body?: string; tags?: string; target?: string; cwd?: string }) => Promise<{ id: string }>;
    /** Create a RECORD artifact — a delivered output (ADR/research/post-mortem/review writeup), born closed, not work. */
    artifact: (title: string, opts?: { body?: string; tags?: string; cwd?: string }) => Promise<{ id: string }>;
    /** List the active KNOWLEDGE base (mai rules) — constraints + warnings. */
    rules: (opts?: { cwd?: string }) => Promise<{ stdout: string; exitCode: number }>;
    /** Retire a KNOWLEDGE rule (active → superseded). 'close' is rejected on rules. */
    supersede: (id: string, by?: string, opts?: { cwd?: string }) => Promise<{ ok: boolean }>;
    /** Change a note's KIND, preserving its ID + history (repairs mis-filed notes). Aligns status to the new class (RECORD→closed, KNOWLEDGE→active, WORK→open). */
    reclass: (id: string, kind: string, opts?: { cwd?: string }) => Promise<{ ok: boolean }>;
  };

  const mai = createMaiCall(maiRun, maiResolveDir, splitShellArgs) as MaiNs;

  mai.ticket = async ({
    title, description, tags,
    type = "task", priority = 2,
    goal, acceptanceCriteria, verification,
    // Default to false: mai's substrate convention is "creation = open / backlog,
    // start when actually working on it". Auto-starting on creation skipped the
    // backlog state and made all filed tickets look in-progress. Callers who
    // want to start immediately pass start: true explicitly.
    start = false, cwd: explicitCwd,
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

  // Class-aware creators: pick the right epistemic class so notes land in the
  // right surface. constraint/warn = KNOWLEDGE (born active, mai.rules()),
  // artifact = RECORD (born closed). Never file a rule or a record as a ticket.
  mai.constraint = async (title, opts) => {
    const args = ["constraint", title];
    if (opts?.body) args.push("-d", opts.body);
    if (opts?.tags) args.push("-l", opts.tags);
    if (opts?.target) args.push("--target", opts.target);
    const r = await maiRun(args, maiResolveDir(opts?.cwd));
    if (r.status !== 0) throw new Error(`mai constraint failed: ${(r.stderr || r.stdout || "").trim()}`);
    return { id: (r.stdout || "").trim().split(/\s+/)[0] };
  };

  mai.artifact = async (title, opts) => {
    const args = ["artifact", title];
    if (opts?.body) args.push("-d", opts.body);
    if (opts?.tags) args.push("-l", opts.tags);
    const r = await maiRun(args, maiResolveDir(opts?.cwd));
    if (r.status !== 0) throw new Error(`mai artifact failed: ${(r.stderr || r.stdout || "").trim()}`);
    return { id: (r.stdout || "").trim().split(/\s+/)[0] };
  };

  mai.rules = async (opts) => {
    const r = await maiRun(["rules"], maiResolveDir(opts?.cwd));
    const stdout = (r.stdout || "") + (r.stderr ? "\n" + r.stderr : "");
    return { stdout: stdout.trim(), exitCode: r.status ?? 1 };
  };

  mai.supersede = async (id, by, opts) => {
    const args = ["supersede", id];
    if (by) args.push("--by", by);
    const r = await maiRun(args, maiResolveDir(opts?.cwd));
    return { ok: r.status === 0 };
  };

  mai.reclass = async (id, kind, opts) => {
    const r = await maiRun(["reclass", id, "-k", kind], maiResolveDir(opts?.cwd));
    return { ok: r.status === 0 };
  };

  mai.ls = async (opts) => {
    const result = await maiRun(["ls"], maiResolveDir(opts?.cwd));
    const stdout = (result.stdout || "") + (result.stderr ? "\n" + result.stderr : "");
    return { stdout: stdout.trim(), exitCode: result.status ?? 1 };
  };

  const REVIEW_HANDOFF_TOKEN_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/;
  const REVIEW_HANDOFF_COMMIT_RE = /^[0-9a-f]{7,64}$/i;
  const MAI_TICKET_ID_RE = /^[a-z]{2,4}-[a-z0-9]{4,8}$/;

  const shortReviewHandoffToken = () => crypto.randomBytes(7).toString("base64url");

  mai.ticketLink = async (input) => {
    const ticket = (typeof input === "string" ? input : input.ticket).trim();
    if (!MAI_TICKET_ID_RE.test(ticket)) throw new Error(`mai.ticketLink invalid ticket id: ${ticket}`);
    const vscodeLink = `vscode://pi0.maiboard/ticket/${ticket}`;
    return {
      ticket,
      link: `mai://ticket/${ticket}`,
      vscodeLink,
      terminalLink: `http://127.0.0.1:39287/ticket/${ticket}`,
    };
  };

  const osc8Link = (href: string, label: string) => {
    const safeHref = href.replace(/[\u0000-\u001f\u007f]/g, "");
    const safeLabel = label.replace(/[\u001b\u0007]/g, "");
    return `\u001b]8;;${safeHref}\u001b\\${safeLabel}\u001b]8;;\u001b\\`;
  };

  const gitOutForReviewHandoff = async (dir: string, args: string[]) => {
    const result = await spawnAsync({ cmd: "git", args, cwd: dir, signal, timeout: 10_000 });
    return result.status === 0 ? (result.stdout || "").trim() : "";
  };

  mai.reviewLink = async ({
    worktree,
    base,
    head,
    commits,
    branch,
    ticket,
    worker,
    session,
    token,
    cwd: explicitCwd,
  }) => {
    const dir = worktree ? resolvePath(worktree, cwd) : maiResolveDir(explicitCwd);
    const resolvedWorktree = path.resolve(dir);
    const cleanedCommits = (commits ?? []).map((commit) => String(commit).trim()).filter(Boolean);
    if (cleanedCommits.length === 0) throw new Error("mai.reviewLink requires at least one commit");
    const invalidCommit = cleanedCommits.find((commit) => !REVIEW_HANDOFF_COMMIT_RE.test(commit));
    if (invalidCommit) throw new Error(`mai.reviewLink invalid commit: ${invalidCommit}`);

    const safeToken = token ?? shortReviewHandoffToken();
    if (!REVIEW_HANDOFF_TOKEN_RE.test(safeToken)) throw new Error("mai.reviewLink invalid token");

    const resolvedBranch = branch || await gitOutForReviewHandoff(resolvedWorktree, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const resolvedHead = head || cleanedCommits[cleanedCommits.length - 1];
    const resolvedBase = base || (await gitOutForReviewHandoff(resolvedWorktree, ["rev-parse", cleanedCommits[0] + "^"])) || undefined;

    const payload: ReviewHandoffResult["payload"] = {
      version: 1,
      token: safeToken,
      createdAt: new Date().toISOString(),
      worktree: resolvedWorktree,
      commits: cleanedCommits,
      commitOrder: "oldest-to-newest",
    };
    if (resolvedBase) payload.base = resolvedBase;
    if (resolvedHead) payload.head = resolvedHead;
    if (resolvedBranch && resolvedBranch !== "HEAD") payload.branch = resolvedBranch;
    if (ticket) payload.ticket = ticket;
    if (worker) payload.worker = worker;
    if (session) payload.session = session;

    const dirPath = path.join(os.homedir(), ".maitake", "review-handoffs");
    fs.mkdirSync(dirPath, { recursive: true });
    const file = path.join(dirPath, safeToken + ".json");
    fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n", "utf-8");

    const vscodeLink = `vscode://pi0.maiboard/review/${safeToken}`;
    return {
      token: safeToken,
      link: `mai://review/${safeToken}`,
      vscodeLink,
      terminalLink: `http://127.0.0.1:39287/review/${safeToken}`,
      file,
      payload,
    };
  };

  // ==========================================================================
  // brave namespace — callable (search) + codeSearch method
  // ==========================================================================

  const brave = Object.assign(
    async ({
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
    },
    {
      codeSearch: async ({ query, numResults = 5 }: { query: string; numResults?: number }) => {
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
      },
    },
  );

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
      const reason = `hashEdit ${filePath}`;
      const { approved } = await runGuardedConfirm(ctx, {
        source: "git-safety",
        tool: "hashEdit",
        reason,
        title: "⚠️ .git write detected",
        body: `${reason}\n\nThis can corrupt your repository. Allow?`,
      });
      if (!approved) throw new Error(gitGuardError(reason));
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

          const { approved } = await runGuardedConfirm(ctx, {
            source: "git-safety",
            tool: "bash",
            reason: gitResult.reason,
            title,
            body,
          });
          if (!approved) throw new Error(gitGuardError(gitResult.reason));
        }
      }
      const timeoutMs = timeout ? timeout * 1000 : SUBPROCESS_TIMEOUT_MS;
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;

      // Build env with optional agent git identity
      const gitEnv: Record<string, string | undefined> = { ...process.env };
      if (ctx.agentGitIdentity) {
        gitEnv.GIT_AUTHOR_NAME = ctx.agentGitIdentity.name;
        gitEnv.GIT_AUTHOR_EMAIL = ctx.agentGitIdentity.email;
        gitEnv.GIT_COMMITTER_NAME = ctx.agentGitIdentity.name;
        gitEnv.GIT_COMMITTER_EMAIL = ctx.agentGitIdentity.email;
        gitEnv.PI_AGENT_NAME = ctx.agentGitIdentity.name;
        gitEnv.PI_AGENT_EMAIL = ctx.agentGitIdentity.email;
        if (ctx.agentGitIdentity.model) gitEnv.PI_AGENT_MODEL = ctx.agentGitIdentity.model;
        if (ctx.agentGitIdentity.sessionId) gitEnv.PI_SESSION_ID = ctx.agentGitIdentity.sessionId;
        if (ctx.agentGitIdentity.sessionName) gitEnv.PI_SESSION_NAME = ctx.agentGitIdentity.sessionName;
      }

      // rtk compaction (Arch A): run the compacting rewrite when rtk handles this
      // command; the unfiltered output stays reachable via raw(). The guards above
      // already ran on the ORIGINAL command, and rtk only wraps it (same operation),
      // so the safety decision holds. Global opt-out: PI_RTK=0.
      let effectiveCommand = command;
      let rtkApplied = false;
      // rtk resolves via the shared dep registry (PI_RTK_BIN → PATH → absolute
      // fallbacks); spawning the ABSOLUTE path avoids PATH-stripping. Absent → skip
      // (commands run raw, rtk:false). Disable entirely with PI_RTK=0.
      const rtkBin = process.env.PI_RTK === "0" ? null : rtkDep.resolved;
      if (rtkBin) {
        const rewritten = await rtkRewrite(rtkBin, command, gitEnv);
        if (rewritten) {
          effectiveCommand = rewritten;
          rtkApplied = true;
        }
      }

      const result = await spawnAsync({
        cmd: "sh",
        args: ["-c", effectiveCommand],
        cwd: dir,
        timeout: timeoutMs,
        signal,
        env: gitEnv,
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
            rtk: rtkApplied,
            raw: () => ({ stdout: result.stdout || "", stderr: result.stderr || "" }),
          };
        }
        throw new Error(`Bash error: ${result.error.message}`);
      }
      const rawStdout = result.stdout || "";
      const rawStderr = result.stderr || "";
      let displayStdout = rawStdout;
      let teeRaw: string | null = null;
      if (rtkApplied) {
        const split = rtkSplitTee(rawStdout);
        displayStdout = split.compacted;
        teeRaw = split.raw;
      }
      // raw(): the full failure-tee when rtk teed it, else the (already complete)
      // compacted view. exitCode is ALWAYS the real command's exit (rtk preserves it).
      const rawView = { stdout: teeRaw ?? rawStdout, stderr: rawStderr };
      return {
        stdout: displayStdout,
        stderr: rawStderr,
        exitCode: result.status ?? 0,
        timedOut: false,
        rtk: rtkApplied,
        raw: () => rawView,
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
      optional = false,
    }: {
      path: string;
      cwd?: string;
      offset?: number;
      limit?: number;
      optional?: boolean;
    }) => {
      const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const resolved = resolvePath(filePath, base);

      // Image extension → MIME map (same as readImage)
      const imageExtMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };

      // Check if the file is an image by extension
      const ext = path.extname(resolved).toLowerCase();
      const imageMime = imageExtMap[ext];

      // Sniff first bytes to detect binary content (even without a known extension)
      const isBinaryContent = (buf: Buffer): boolean => {
        // Check for known image magic bytes
        if (buf.length >= 8) {
          // PNG: 89 50 4E 47 0D 0A 1A 0A
          if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
          // JPEG: FF D8 FF
          if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
          // GIF: GIF87a or GIF89a
          if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
          // WebP: RIFF....WEBP
          if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
            && buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
          // PDF: %PDF
          if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return true;
          // ZIP/PKG/JAR/DOCX etc: PK
          if (buf[0] === 0x50 && buf[1] === 0x4b) return true;
          // Gzip
          if (buf[0] === 0x1f && buf[1] === 0x8b) return true;
          // BZip2
          if (buf[0] === 0x42 && buf[1] === 0x5a && buf[2] === 0x68) return true;
          // 7z
          if (buf[0] === 0x37 && buf[1] === 0x7a && buf[2] === 0xbc && buf[3] === 0xaf) return true;
          // RAR
          if (buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72) return true;
          // SQLite
          if (buf.toString("ascii", 0, 6) === "SQLite") return true;
          // Class file (Java)
          if (buf[0] === 0xca && buf[1] === 0xfe && buf[2] === 0xba && buf[3] === 0xbe) return true;
          // ELF
          if (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) return true;
          // Mach-O
          if ((buf[0] === 0xfe && buf[1] === 0xed && buf[2] === 0xfa) || (buf[0] === 0xce && buf[1] === 0xfa && buf[2] === 0xed)) return true;
        }
        // Fallback: check for null bytes in first 8KB (binary files almost always have them)
        const sniffSize = Math.min(buf.length, 8192);
        for (let i = 0; i < sniffSize; i++) {
          if (buf[i] === 0) return true;
        }
        return false;
      };

      let buffer: Buffer;
      try {
        buffer = fs.readFileSync(resolved);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") {
          if (optional) return null;
          throw new Error("Read: file not found: " + filePath + " (resolved: " + resolved + "). Check existence first with Glob/fd, or pass optional: true for convention files that may not exist.");
        }
        if (code === "EISDIR") {
          const skillPath = path.join(resolved, "SKILL.md");
          const hint = fs.existsSync(skillPath)
            ? " Did you mean " + skillPath + "?"
            : " If this is a skill directory, read its SKILL.md file instead.";
          throw new Error("Read: path is a directory: " + filePath + " (resolved: " + resolved + ")." + hint);
        }
        throw err;
      }

      // Detect if this is a binary file
      const isBinary = isBinaryContent(buffer);

      if (isBinary) {
        // Image files: budget-check, auto-scale if needed, and attach like readImage does
        if (imageMime) {
          const budgetBytes = resolveImageBudgetBytes(model, modelRegistry);
          const prepared = await prepareImagesForAttachment(buffer, imageMime, budgetBytes);
          const fileName = path.basename(resolved);
          if (!prepared || prepared.length === 0) {
            return formatImageTooLargeError(fileName, buffer.length, budgetBytes);
          }
          for (const part of prepared) images.push({ data: part.data, mimeType: part.mimeType });
          const note = formatImageAttachmentNote(fileName, prepared, buffer.length, budgetBytes);
          return "Read image file [" + prepared[0].mimeType + "] " + note;
        }
        // Other binary files: return a clear description instead of garbled bytes
        // Try to detect the actual type from magic bytes for a better message
        let detectedType = "binary";
        if (buffer.length >= 4) {
          if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) detectedType = "PDF";
          else if (buffer[0] === 0x50 && buffer[1] === 0x4b) detectedType = "ZIP/archive";
          else if (buffer[0] === 0x1f && buffer[1] === 0x8b) detectedType = "gzip";
          else if (buffer[0] === 0x42 && buffer[1] === 0x5a) detectedType = "bzip2";
          else if (buffer.toString("ascii", 0, 6) === "SQLite") detectedType = "SQLite database";
          else if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) detectedType = "ELF binary";
        }
        return "[Binary file: " + detectedType + ", " + Math.round(buffer.length / 1024) + "KB. Use bash to inspect: file " + filePath + "]";
      }

      // Text file: proceed as before
      const content = buffer.toString("utf-8");
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
        const reason = `write to ${filePath}`;
        const { approved } = await runGuardedConfirm(ctx, {
          source: "git-safety",
          tool: "write",
          reason,
          title: "⚠️ .git write detected",
          body: `${reason}\n\nThis can corrupt your repository. Allow?`,
        });
        if (!approved) throw new Error(gitGuardError(reason));
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
        const reason = `edit ${filePath}`;
        const { approved } = await runGuardedConfirm(ctx, {
          source: "git-safety",
          tool: "edit",
          reason,
          title: "⚠️ .git write detected",
          body: `${reason}\n\nThis can corrupt your repository. Allow?`,
        });
        if (!approved) throw new Error(gitGuardError(reason));
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

    rg: async ({ args, cwd: explicitCwd, follow = true }: { args: string; cwd?: string; follow?: boolean }) => {
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const parsedArgs = splitShellArgs(args);
      // --no-messages suppresses benign file-read errors (broken symlinks, permission
      // denied) while KEEPING genuine regex/pattern errors on stderr. Without it, a
      // traversal error on a no-match search gets returned as if it were a match.
      const withQuiet = parsedArgs.includes("--no-messages") ? parsedArgs : ["--no-messages", ...parsedArgs];
      const effectiveArgs = follow && !withQuiet.includes("--follow") && !withQuiet.includes("-L") ? ["--follow", ...withQuiet] : withQuiet;
      const result = await spawnAsync({
        cmd: "rg",
        args: effectiveArgs,
        cwd: dir,
        signal,
      });
      if (result.error) {
        throw new Error(`rg error: ${result.error.message}`);
      }
      // Never return stderr as content. With --no-messages, anything left on stderr is a
      // genuine pattern/syntax error — surface it only when there is no match output.
      const out = result.stdout || "";
      const err = (result.stderr || "").trim();
      if (!out && err) throw new Error(`rg error: ${err}`);
      return out;
    },

    fd: async ({ args, cwd: explicitCwd, follow = true }: { args: string; cwd?: string; follow?: boolean }) => {
      const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
      const parsedArgs = splitShellArgs(args);
      const effectiveArgs = follow && !parsedArgs.includes("--follow") && !parsedArgs.includes("-L") ? ["--follow", ...parsedArgs] : parsedArgs;
      const result = await spawnAsync({
        cmd: "fd",
        args: effectiveArgs,
        cwd: dir,
        signal,
      });
      if (result.error) {
        throw new Error(`fd error: ${result.error.message}`);
      }
      // Never return stderr as content (fd is quiet on benign traversal — it does not
      // error on broken symlinks). Surface a genuine error only when there is no output.
      const out = result.stdout || "";
      const err = (result.stderr || "").trim();
      if (!out && err) throw new Error(`fd error: ${err}`);
      return out;
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

    sleep: (ms: number): Promise<void> => {
      if (!signal) return new Promise<void>((resolve) => setTimeout(resolve, ms));
      return new Promise<void>((resolve) => {
        if (signal.aborted) { resolve(); return; }
        // Resolve early on abort instead of rejecting. The outer execute_code
        // runner already races the whole VM against the abort signal and returns
        // `Aborted` for the active turn. Rejecting here is redundant for normal
        // foreground aborts and dangerous for detached background promises
        // (e.g. $.monitor loops) because an interrupt can turn into an
        // unhandled rejection that crashes Bun.
        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, ms);
        signal.addEventListener("abort", onAbort, { once: true });
      });
    },

    // =====================================================================
    // Ticket management (mai CLI)
    // =====================================================================

    // Spread every public method off the mai callable so this namespace can
    // never drift. A hand-maintained allow-list here previously dropped
    // ticketLink/reviewLink when they were added to mai, making them invisible
    // to agents. Spreading copies the enumerable methods (ticket, start, close,
    // show, note, noteFile, ls, ticketLink, reviewLink) and excludes the
    // non-enumerable function internals (length, name), yielding the
    // non-callable namespace the declarations describe.
    mai: { ...mai },
    maiCall: mai,  // exact CLI argv: maiCall({ argv: ["ls"] })
    maiTicket: mai.ticket,  // backward compat

    // brave — spread methods off the callable so this namespace can't drift.
    brave: { ...brave },
    braveSearch: brave,  // callable: braveSearch({ query })
    braveCodeSearch: brave.codeSearch,  // backward compat

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
    hash: {
      edit: (hash as any).edit,
    },
    hashRead: hash,  // callable: hash({ path })
    hashEdit: (hash as any).edit,  // backward compat

    // context7 — defined below as namespaced callable
    context7: {
      docs: (context7 as any).docs,
    },
    context7Resolve: context7,  // callable: context7({ query, libraryName })
    context7Docs: (context7 as any).docs,  // backward compat

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
          const reason = `applyPatch targets ${hunk.path}`;
          const { approved } = await runGuardedConfirm(ctx, {
            source: "git-safety",
            tool: "applyPatch",
            reason,
            approvalSummary: `applyPatch ${hunk.path}`,
            title: "⚠️ .git write detected",
            body: `${reason}\n\nThis can corrupt your repository. Allow?`,
          });
          if (!approved) throw new Error(gitGuardError(reason));
        }
        if (hunk.type === "update" && hunk.move_path && isGitPath(hunk.move_path)) {
          if (isGitLockActive()) {
            const reason = `applyPatch move targets ${hunk.move_path}`;
            const { approved } = await runGuardedConfirm(ctx, {
              source: "git-safety",
              tool: "applyPatch",
              reason,
              approvalSummary: `applyPatch move ${hunk.move_path}`,
              title: "⚠️ .git write detected",
              body: `${reason}\n\nThis can corrupt your repository. Allow?`,
            });
            if (!approved) throw new Error(gitGuardError(reason));
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
    fff: {
      grep: (fff as any).grep,
      multiGrep: (fff as any).multiGrep,
    },
    fffFind: fff,  // callable: fff({ query })
    fffGrep: (fff as any).grep,  // backward compat
    fffMultiGrep: (fff as any).multiGrep,  // backward compat

    // tldr — defined below as namespaced callable
    tldr: {
      structure: (tldr as any).structure,
      calls: (tldr as any).calls,
      extract: (tldr as any).extract,
      dead: (tldr as any).dead,
      arch: (tldr as any).arch,
      impact: (tldr as any).impact,
      indexStatus: (tldr as any).indexStatus,
    },
    tldrSemanticSearch: tldr,  // callable: tldr({ query })
    tldrStructure: (tldr as any).structure,  // backward compat
    tldrCalls: (tldr as any).calls,
    tldrExtract: (tldr as any).extract,
    tldrDead: (tldr as any).dead,
    tldrArch: (tldr as any).arch,
    tldrImpact: (tldr as any).impact,
    tldrIndexStatus: (tldr as any).indexStatus,

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
      const budgetBytes = resolveImageBudgetBytes(model, modelRegistry);
      const prepared = await prepareImagesForAttachment(buffer, mimeType, budgetBytes);
      const fileName = path.basename(resolved);
      if (!prepared || prepared.length === 0) {
        return formatImageTooLargeError(fileName, buffer.length, budgetBytes);
      }
      for (const part of prepared) images.push({ data: part.data, mimeType: part.mimeType });
      return formatImageAttachmentNote(fileName, prepared, buffer.length, budgetBytes);
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
