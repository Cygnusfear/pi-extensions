// @code-mode-manual core | Core tools and process control

/**
 * SANDBOX FUNCTIONS — NAMING CONVENTIONS
 *
 * Core I/O tools accept both PascalCase and camelCase/lowercase:
 *   Bash()  or  bash()
 *   Read()  or  read()
 *   Write() or  write()
 *   Edit()  or  edit()
 *   Glob()  or  glob()
 *   Python() or python()
 *   WebFetch() or webFetch()
 *
 * Everything else is camelCase (bashBgStart, braveSearch, hashRead, etc.)
 * or lowercase for single-word tools (rg, fd, sleep, mai, recall, ouija, teams).
 *
 * RETURN SHAPES — READ THIS. Bash() and Python() return an OBJECT
 * { stdout, stderr, exitCode }. But rg(), fd(), fffFind/fffGrep/fffMultiGrep,
 * ouija(), mesh.tell() and the teams.* helpers return a STRING
 * (Glob returns string[]). On those, `result.stdout` is undefined — use the
 * value directly (result.trim(), result.split, template literals). The silent
 * trap is `(await rg(...)).stdout || "(none)"` → always "(none)". If you want
 * Bash-style streams from a search, call Bash({ command: "rg ..." }) instead.
 */

/**
 * Ouija — BM25 search across session JSONL logs. 🔮
 * Search dead sessions, grep the current live session, or pass arbitrary entries for ad-hoc BM25.
 */
declare function ouija(input: {
  /** Action: 'search'=BM25 across all sessions, 'grep'=find entries in one session, 'view'=read entries, 'list'=browse sessions, 'self'=search current live session */
  action: "search" | "view" | "grep" | "list" | "self";
  /** Search query (for search/grep/self) */
  query?: string;
  /** Session ID, partial ID, or 'self' (for view/grep). Omit to auto-detect current session. */
  session?: string;
  /** Filter by project path substring */
  project?: string;
  /** Only sessions after this date (ISO string) */
  since?: string;
  /** Entry window start (default -20). Negative=offset from end. */
  start?: number;
  /** Entry window end (default 0=last entry). */
  end?: number;
  /** Max results (default 10) */
  limit?: number;
  /** Ad-hoc entries for BM25 (action=grep only). Pass any {text}[] to search over. */
  entries?: Array<{ index?: number; label?: string; text: string }>;
}): Promise<string>;

/**
 * Execute a bash command in the current working directory.
 * Returns stdout, stderr, and exit code. Default timeout is 30 seconds.
 *
 * FOOTGUN: the execute_code block is synchronous from the TUI's perspective.
 * While this await is in flight the user sees a busy TUI. There is NO max
 * cap on `timeout` — `await Bash({ command, timeout: 3600 })` freezes the
 * TUI for an hour.
 *
 * RULE: if a command might take more than 30s, or might never exit
 * (dev servers, watchers, daemons), use `bashBgStart` instead. Do NOT
 * raise `timeout` past 60s without an explicit reason.
 *
 * See "Shell commands — DON'T freeze the TUI" in the default prompt for
 * the full decision matrix.
 *
 * RTK COMPACTION (auto): when the rtk CLI is installed and handles this command
 * (cargo / tsc / test / lint / git / search / ...), stdout is rtk's COMPACT view
 * (60-90% fewer tokens) and result.rtk is true. The full UNFILTERED output is
 * always reachable via result.raw() -> { stdout, stderr }: on a FAILURE rtk teed
 * the complete raw output; on success raw() returns the compact view. exitCode is
 * ALWAYS the real command's exit (rtk preserves it). Opt out globally with PI_RTK=0.
 * Commands rtk does not handle are unchanged (rtk:false, raw() === the raw output).
 */
declare function Bash(input: {
  /** Bash command to execute */
  command: string;
  /** Working directory override */
  cwd?: string;
  /** Timeout in seconds (default: 30). Raising this past ~60s freezes the TUI for the full duration; prefer bashBgStart for long commands. */
  timeout?: number;
}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
  /** True when rtk compacted this command's output (stdout = the compact view). */
  rtk?: boolean;
  /** Full UNFILTERED output. On failure rtk teed the complete raw; on success returns the compact view. exitCode is always the real exit. */
  raw?: () => { stdout: string; stderr: string };
}>;

/**
 * Terminal status reported by handle.wait / handle.timeout / handle.stop.
 *  - "exited"  → child exited on its own (read exitCode)
 *  - "stopped" → child was killed by a signal (read `signal`)
 *  - "timeout" → .timeout(ms) elapsed; job is still running, NOT killed
 *  - "aborted" → enclosing execute_code was aborted; job is still running
 */
type BashBgWaitStatus = "exited" | "stopped" | "timeout" | "aborted";

/** Stream label for line callbacks attached via handle.each(). */
type BashBgStream = "stdout" | "stderr";

type BashBgResult = {
  id: string;
  pid: number;
  command: string;
  cwd: string;
  logPath: string;
  status: BashBgWaitStatus;
  exitCode: number | null;
  signal?: string;
  runtimeMs: number;
};

/**
 * Thenable handle returned by bashBgStart(). Mirrors execa / teams.on:
 *  - sync return with properties (id, pid, cwd, logPath, status) ready immediately
 *  - chain setters (.each, .timeout) return `this`
 *  - `await handle` / `handle.then(cb)` resolves on child exit
 *
 * @example
 * // Wait for exit with deadline. .timeout is a chainable setter; the await
 * // (or .then) triggers the actual wait using the configured deadline.
 * const r = await bashBgStart({ command: "cargo check" }).timeout(120_000);
 *
 * // Fire-and-react: attach .then for completion without awaiting.
 * bashBgStart({ command: "cargo build" })
 *   .each(line => console.log(line))
 *   .then(result => console.wake(`done: ${result.exitCode}`));
 *
 * // Truly fire-and-forget — just don't await and don't attach .then.
 * const dev = bashBgStart({ command: "npm run dev" });
 * console.log(dev.id, dev.pid, dev.status);
 * await dev.stop();
 *
 * FOOTGUN: `await bashBgStart({ command: "npm run dev" })` blocks until the
 * dev server exits (never). Don't await long-running processes; attach
 * `.then(cb)` or just `.stop()` when done.
 */
interface BashBgHandle extends PromiseLike<BashBgResult> {
  readonly id: string;
  readonly pid: number;
  readonly command: string;
  readonly cwd: string;
  readonly logPath: string;
  /** Live job status string. "running" | "exited" | "stopped". */
  readonly status: "running" | "exited" | "stopped";
  /** Resolves once the child has spawned successfully; rejects on spawn error. */
  readonly started: Promise<void>;

  /** Stream stdout/stderr lines as they are written. Returns the handle (chainable). Late subscribers do NOT receive history; use .logs() to backfill. */
  each(callback: (line: string, stream: BashBgStream) => void): BashBgHandle;
  /** Set a deadline for the eventual await/.then. Reject-free; child is NOT killed on timeout (the wait just resolves early with status="timeout"). Last call wins; no-op after the wait has started. */
  timeout(ms: number): BashBgHandle;

  /** Explicit wait. Resolves (never rejects) with status="exited"/"stopped"/"timeout"/"aborted". */
  wait(opts?: { timeoutMs?: number }): Promise<BashBgResult>;
  /** Send a signal. Resolves with the eventual exit result. */
  stop(signal?: "SIGTERM" | "SIGKILL"): Promise<BashBgResult>;
  /** Read the persisted log file (paginated). */
  logs(opts?: { offset?: number; limit?: number }): Promise<{ text: string; offset: number; limit: number; nextOffset: number; totalLines: number; hasMore: boolean; status: string }>;

  /** Full sync snapshot of the current job state. */
  inspect(): { id: string; pid: number; status: string; command: string; cwd: string; startedAt: number; endedAt?: number; exitCode?: number | null; signal?: string };

  /** Detach all line-listeners attached via this handle. Does NOT kill the child. */
  unsubscribe(): void;
  /** Alias for unsubscribe. */
  cancel(): void;

  /** Thenable protocol — `await handle` resolves on child exit. */
  then<TResult1 = BashBgResult, TResult2 = never>(
    onfulfilled?: ((value: BashBgResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
}

/**
 * Start a bash command in the background. Returns a thenable BashBgHandle
 * synchronously.
 *
 * @example
 * // Bounded wait — TUI is busy but guaranteed to release at the deadline.
 * const r = await bashBgStart({ command: "cargo check" }).timeout(120_000);
 *
 * // Fire-and-react — TUI free immediately, agent woken on exit.
 * await supervise(false);
 * bashBgStart({...}).each(cb).then(r => console.wake(`done`));
 *
 * // Truly fire-and-forget dev server — no await, no .then.
 * const dev = bashBgStart({ command: "npm run dev" });
 * await dev.stop();
 *
 * FOOTGUN — READ THIS: the handle is thenable. `await bashBgStart(...)`
 * waits for child exit. For `npm run dev` and friends, child exit is
 * NEVER, and the execute_code block hangs forever (execute_code has no
 * default timeout). This freezes the TUI until the user /cancels.
 *
 * The syntax `await bashBgStart(...)` looks identical to `await Bash(...)`
 * but behaves completely differently — Bash returns when its child exits or
 * times out; bashBgStart's handle resolves when its child exits. If the
 * child never exits, the await never returns.
 *
 * RULE: never await a bashBgStart handle without either `.timeout(ms)` or
 * a guarantee the child exits soon. For long or never-exiting commands,
 * attach `.then(cb) + console.wake(...)` and return from the block.
 *
 * See "Shell commands — DON'T freeze the TUI" in the default prompt for
 * the full decision matrix.
 */
declare function bashBgStart(input: {
  /** Bash command to run in the background */
  command: string;
  /** Working directory (default: current cwd) */
  cwd?: string;
}): BashBgHandle;

type BackgroundJobRef = string | { id: string } | { id: { id: string } };

/**
 * Get the status of a background bash job.
 */
declare function bashBgStatus(input: BackgroundJobRef): Promise<{ id: string; pid: number; status: string; command: string; cwd: string; startedAt: number; endedAt?: number; exitCode?: number | null; signal?: string }>;

/**
 * Read logs from a background bash job.
 */
declare function bashBgLogs(input: {
  /** Background job ID or a job object returned by bashBgStart */
  id: BackgroundJobRef;
  /** 1-indexed log line to start from (default: 1) */
  offset?: number;
  /** Maximum lines to return (default: 50, max: 250). Log text is also capped at 8KiB. */
  limit?: number;
}): Promise<{
  text: string;
  offset: number;
  limit: number;
  nextOffset: number;
  totalLines: number;
  hasMore: boolean;
  status: string;
  /** Durable source for deliberate full-log inspection. */
  logPath: string;
  /** UTF-8 bytes in text after the 8KiB page budget. */
  responseBytes: number;
  /** True only when the page's byte budget shortened it. */
  truncated: boolean;
  /** Number of returned lines whose content was clipped. */
  clippedLines: number;
}>;

/**
 * Stop a background bash job.
 */
declare function bashBgStop(input: {
  /** Background job ID or a job object returned by bashBgStart */
  id: BackgroundJobRef;
  /** Signal to send. Defaults to SIGTERM. */
  signal?: "SIGTERM" | "SIGKILL";
}): Promise<{ id: string; pid: number; status: string; exitCode?: number | null; signal?: string }>;

/**
 * List all background bash jobs started in this session.
 */
declare function bashBgList(): Promise<Array<{ id: string; pid: number; status: string; command: string; cwd: string; startedAt: number; endedAt?: number; exitCode?: number | null }>>;

// @code-mode-manual async | Async execution and filesystem tools

// =====================================================================
// Async execute_code job management
// =====================================================================
//
// When the host fires `execute_code({ thinking: "Run the long pipeline and verify completion output.", code: "<long pipeline>", async: true })`, the tool
// returns immediately with a jobId. The result is delivered later as a
// follow-up turn (same channel as console.wake). These two primitives
// let an agent inspect or kill the pending jobs from inside any execute_code
// block. Concurrent execute_code calls serialize on a single per-session
// mutex — a subsequent execute_code waits for the in-flight async one.
//
// Auto-promote: even without `async: true`, a default sync execute_code
// auto-promotes to async if it's still running after 60s (configurable via
// PI_CODE_MODE_PROMOTE_MS env var). The tool returns a "still running" stub;
// the bg work keeps going and delivers via follow-up turn. Auto-promoted
// jobs are first-class — list/kill apply to them too.

/**
 * List async execute_code jobs that have not yet delivered their result.
 *
 * Each entry is { jobId, codePreview, runtimeMs }. `runtimeMs` is wall-clock
 * time since the job started. Returns an empty array if nothing is pending.
 */
declare function executeCodeAsyncList(): Array<{ jobId: string; codePreview: string; runtimeMs: number }>;

/**
 * Abort a pending async execute_code job. Returns true if a job with the given
 * jobId was found and signalled, false if no such job exists.
 *
 * The bg work catches the abort, builds an error result, and still delivers
 * the follow-up turn so the agent learns the kill landed. Use this for
 * runaway infinite-loop async blocks.
 *
 * IMPORTANT: this sandbox version is fine when you're inspecting/cleaning up
 * AFTER an async job has delivered its follow-up. To inspect or kill an
 * IN-FLIGHT async job (mutex would block any new execute_code call), use the
 * direct tools instead: `execute_code_async_list` and `execute_code_async_kill`.
 * They bypass the mutex.
 */
declare function executeCodeAsyncKill(jobId: string): boolean;

/**
 * Execute Python code in a subprocess.
 * Writes code to a temp file and runs `python3` on it — no shell quoting issues.
 * Returns stdout, stderr, and exit code.
 */
declare function Python(input: {
  /** Python code to execute */
  code: string;
  /** Working directory override */
  cwd?: string;
  /** Timeout in seconds (default: 30) */
  timeout?: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut?: boolean }>;

/**
 * Read the contents of a file.
 * Returns the file text. Supports line-based offset and limit.
 * Missing files throw a clear Read: file not found error by default.
 * Use optional: true only for convention files that may not exist.
 * Directory paths throw a clear error; skill directories suggest SKILL.md.
 */
declare function Read(input: {
  /** Path to the file (relative to cwd or absolute) */
  path: string;
  /** Working directory override */
  cwd?: string;
  /** Line number to start reading from (1-indexed) */
  offset?: number;
  /** Maximum number of lines to read */
  limit?: number;
  /** Return null instead of throwing when the file does not exist. */
  optional?: boolean;
}): Promise<string | null>;

/**
 * Write content to a file.
 * Creates parent directories if needed. Overwrites if file exists.
 */
declare function Write(input: {
  /** Path to the file (relative to cwd or absolute) */
  path: string;
  /** Working directory override */
  cwd?: string;
  /** Content to write */
  content: string;
}): Promise<void>;

/**
 * Edit a file by replacing exact text.
 * The oldText must match exactly (including whitespace).
 * Returns whether the match was found.
 */
declare function Edit(input: {
  /** Path to the file (relative to cwd or absolute) */
  path: string;
  /** Working directory override */
  cwd?: string;
  /** Exact text to find */
  oldText: string;
  /** Replacement text */
  newText: string;
}): Promise<{ matched: boolean }>;

/**
 * Find files by glob pattern.
 * Returns an array of matching file paths (relative to search dir).
 */
declare function Glob(input: {
  /** Glob pattern (e.g., "**/*.ts", "src/**/*.test.js") */
  pattern: string;
  /** Directory to search in (default: cwd) */
  path?: string;
}): Promise<string[]>;

/**
 * Run ripgrep search. Patterns are regex by default; use -F for literal.
 * Returns the raw rg output as a STRING — NOT a { stdout, stderr, exitCode } object
 * like Bash(). Use it directly (.trim()/.split()); .stdout is undefined. Empty
 * string = no matches; a genuine pattern error (bad regex) throws.
 */
declare function rg(input: {
  /** Arguments to pass to rg (e.g., '-n "pattern" src/') */
  args: string;
  /** Working directory override */
  cwd?: string;
  /** Follow symlinks. Defaults to true. Set false for native ripgrep no-follow behavior. */
  follow?: boolean;
}): Promise<string>;

/**
 * Find files with fd.
 * Returns the raw fd output as a STRING — NOT a { stdout, ... } object like Bash().
 * Use it directly; .stdout is undefined. Empty string = no matches.
 */
declare function fd(input: {
  /** Arguments to pass to fd (e.g., '-e ts src/') */
  args: string;
  /** Working directory override */
  cwd?: string;
  /** Follow symlinks. Defaults to true. Set false for native fd no-follow behavior. */
  follow?: boolean;
}): Promise<string>;

/**
 * Fetch a URL and return its content as text, markdown, or html.
 */
declare function WebFetch(input: {
  /** URL to fetch (must start with http:// or https://) */
  url: string;
  /** Return format: "text", "markdown", or "html" (default: "text") */
  format?: "text" | "markdown" | "html";
  /** Timeout in seconds (default: 30, max: 120) */
  timeout?: number;
}): Promise<string>;

/** Pause execution for the given number of milliseconds. */
declare function sleep(ms: number): Promise<void>;

// @code-mode-manual records | Maitake, memory, search, and source tools

/**
 * Run a mai CLI command.
 *
 * Use `argv` for every new call. Each element is passed to the mai process
 * unchanged: whitespace, newlines, backslashes, quotes, and shell-shaped text
 * remain part of that single argument. No shell expansion occurs.
 *
 * @example
 * const body = await Read({ path: "/tmp/epic-body.md" });
 * await maiCall({
 *   argv: ["-C", "../gso-prod", "edit", "gp-umo8jj80", "-d", body],
 * });
 */
declare function maiCall(input?:
  | {
      argv?: readonly string[];
      /** @deprecated Use argv. String command text cannot safely carry dynamic values. */
      args?: never;
      cwd?: string;
    }
  | {
      /** @deprecated Use argv. String command text cannot safely carry dynamic values. */
      args: string;
      argv?: never;
      cwd?: string;
    }
): Promise<{ stdout: string; exitCode: number }>;

/**
 * mai — maitake CLI integration. Methods for common operations.
 * For exact CLI argument transport, use maiCall({ argv: ["ls"] }).
 *
 * Notes carry an epistemic CLASS. Pick the right creator:
 *   WORK      mai.ticket()     open → closed   shows in mai.ls() (the work queue)
 *   RECORD    mai.artifact()   born closed     a delivered output (ADR/research/post-mortem)
 *   KNOWLEDGE mai.constraint() active → superseded   a durable rule, shows in mai.rules()
 * Never file a rule or a record as a ticket — it makes mai.ls() lie. Question before
 * every create: is this a rule, a delivered output, or work to do?
 *
 * @example
 * // Raw passthrough
 * await maiCall({ argv: ["ls"] });
 *
 * // Create a structured ticket with Goal/AC/Verification
 * const t = await mai.ticket({
 *   title: "Fix auth bug",
 *   description: "JWT validation fails on expired tokens",
 *   tags: "team,auth",
 *   goal: "All expired tokens return 401",
 *   acceptanceCriteria: ["Unit test for expired token", "Integration test"],
 *   verification: ["Manual test with expired token", "CI passes"],
 * });
 *
 * // Lifecycle
 * await mai.start(t.id);
 * await mai.note(t.id, "progress: middleware wired up");
 * const ticket = await mai.show(t.id);  // parsed JSON
 * await mai.close(t.id);
 */
declare const mai: {
  /** Create a structured ticket with Goal/AC/Verification template.
   *  By default the new ticket has status=open (backlog). Pass start: true to
   *  also run `mai start <id>` (status=in_progress) when you're picking it up
   *  immediately. */
  ticket(input: {
    title: string;
    description: string;
    tags: string;
    type?: string;
    priority?: number;
    goal?: string;
    acceptanceCriteria?: string[];
    verification?: string[];
    /** Default false. Pass true to also start the ticket on creation. */
    start?: boolean;
    cwd?: string;
  }): Promise<{ id: string; started: boolean; message: string }>;

  /** Start a ticket (mai start <id>). */
  start(id: string, opts?: { cwd?: string }): Promise<{ ok: boolean }>;

  /** Close a ticket (mai close <id>). */
  close(id: string, opts?: { cwd?: string }): Promise<{ ok: boolean }>;

  /** Show a ticket (mai --json show <id>). Returns parsed JSON. */
  show(id: string, opts?: { cwd?: string }): Promise<unknown>;

  /** Add an inline note to a ticket. */
  note(id: string, text: string, opts?: { cwd?: string }): Promise<{ ok: boolean }>;

  /** Add a note from a file. */
  noteFile(id: string, filePath: string, opts?: { cwd?: string }): Promise<{ ok: boolean }>;

  /** List the work queue (mai ls) — open WORK only; excludes rules + records. */
  ls(opts?: { cwd?: string }): Promise<{ stdout: string; exitCode: number }>;

  /** Create a KNOWLEDGE constraint — a durable rule, born active, never in mai.ls(). Retire with mai.supersede(), not mai.close(). */
  constraint(title: string, opts?: { body?: string; tags?: string; target?: string; cwd?: string }): Promise<{ id: string }>;

  /** Create a RECORD artifact — a delivered output (ADR / research / post-mortem / review writeup), born closed, not work. */
  artifact(title: string, opts?: { body?: string; tags?: string; cwd?: string }): Promise<{ id: string }>;

  /** List the active KNOWLEDGE base (mai rules) — constraints + warnings. */
  rules(opts?: { cwd?: string }): Promise<{ stdout: string; exitCode: number }>;

  /** Retire a KNOWLEDGE rule (active → superseded). mai.close() is rejected on rules. */
  supersede(id: string, by?: string, opts?: { cwd?: string }): Promise<{ ok: boolean }>;

  /** Change a note's KIND, preserving ID + history (repairs mis-filed notes). Aligns status to the new class (RECORD→closed, KNOWLEDGE→active, WORK→open). */
  reclass(id: string, kind: string, opts?: { cwd?: string }): Promise<{ ok: boolean }>;

  /** Create a short Maiboard ticket link. */
  ticketLink(input: string | { ticket: string }): Promise<{
    ticket: string;
    /** Human-facing short link. */
    link: string;
    /** VS Code-native short link handled by Maiboard. */
    vscodeLink: string;
    /** Local HTTP link for terminals such as Ghostty. Opens Maiboard through the extension's localhost link server. */
    terminalLink: string;
  }>;

  /**
   * Create a short Maiboard review handoff link.
   * Writes ~/.maitake/review-handoffs/<token>.json and returns short links.
   * commits must be ordered oldest-to-newest, matching the order you want reviewed.
   */
  reviewLink(input: {
    /** Worktree/repo path. Defaults to cwd. */
    worktree?: string;
    /** Optional explicit base commit. Defaults to first commit's parent when available. */
    base?: string;
    /** Optional explicit head commit. Defaults to the last commit. */
    head?: string;
    /** Commits to review, ordered oldest-to-newest. */
    commits: string[];
    branch?: string;
    ticket?: string;
    worker?: string;
    session?: string;
    token?: string;
    cwd?: string;
  }): Promise<{
    token: string;
    /** Human-facing short link. */
    link: string;
    /** VS Code-native short link handled by Maiboard. */
    vscodeLink: string;
    /** Local HTTP link for terminals such as Ghostty. Opens Maiboard through the extension's localhost link server. */
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
  }>;
};

/** @deprecated Use `mai.ticket()` instead. */
declare const maiTicket: typeof mai.ticket;

/** Search memory — use this for recall queries. */
declare function recall(input: {
  query: string;
  limit?: number;
  factType?: "world" | "experience" | "opinion" | "observation";
  minScore?: number;
  bank?: string;
}): Promise<string>;

/**
 * memory — semantic memory helpers for explicit context/create/unfold operations.
 * Prefer ouija/session-history search for remembering prior conversations; use recall() only for semantic-memory queries.
 *
 * @example
 * // Search memory
 * const results = await recall({ query: "architecture decisions" });
 * // Context for a task
 * const ctx = await memory.context({ task: "refactor auth" });
 * // Create a memory
 * await memory.create({ factType: "experience", oneLiner: "...", summary: "..." });
 * // Unfold for detail
 * await memory.unfold({ nodeId: "fs:abc123" });
 * // Status
 * await memory.status();
 * // Subscribe to updates
 * await memory.subscribe({ entity: "auth" });
 */
declare const memory: {
  /** Get relevant memories for a task/topic. */
  context(input: { task: string; maxNodes?: number; bank?: string }): Promise<string>;

  /** Create a new memory node. */
  create(input: {
    factType: "world" | "experience" | "opinion" | "observation";
    oneLiner: string;
    summary: string;
    fullSynthesis?: string;
    entityName?: string;
    repo?: string;
    bank?: string;
  }): Promise<string>;

  /** Unfold a memory node for more detail. Pass full node ID (e.g. "fs:..."). */
  unfold(input: { nodeId: string; depth?: "summary" | "full" | "raw"; bank?: string }): Promise<string>;

  /** Get semantic memory backend status. */
  status(): Promise<string>;

  /** Subscribe to a memory node, entity, or topic. */
  subscribe(input: { nodeId?: string; entity?: string; topic?: string; subscriber?: string }): Promise<string>;

  /** Remove a memory subscription. */
  unsubscribe(input: { subscriptionId: string }): Promise<string>;

  /** Check for new notifications from memory subscriptions. */
  checkUpdates(input?: { subscriber?: string }): Promise<string>;
};

/** recall is the primary way to search memory. memory object holds methods only. */

/** @deprecated Use memory.context() */
declare const memoryContext: typeof memory.context;
/** @deprecated Use memory.create() */
declare const memoryCreate: typeof memory.create;
/** @deprecated Use memory.unfold() */
declare const memoryUnfold: typeof memory.unfold;
/** @deprecated Use memory.status() */
declare const memoryStatus: typeof memory.status;
/** @deprecated Use memory.subscribe() */
declare const memorySubscribe: typeof memory.subscribe;
/** @deprecated Use memory.unsubscribe() */
declare const memoryUnsubscribe: typeof memory.unsubscribe;
/** @deprecated Use memory.checkUpdates() */
declare const memoryCheckUpdates: typeof memory.checkUpdates;

/** Search the web via Brave API. */
declare function braveSearch(input: { query: string; numResults?: number; type?: "llm_context" | "web" }): Promise<string>;

/**
 * brave — web/code search. Methods only. Use braveSearch() for web search.
 *
 * @example
 * const results = await braveSearch({ query: "rust async patterns" });
 * const codeResults = await brave.codeSearch({ query: "tokio spawn" });
 */
declare const brave: {
  /** Search for code/docs specifically. */
  codeSearch(input: { query: string; numResults?: number }): Promise<string>;
};

declare const braveCodeSearch: typeof brave.codeSearch;

/**
 * Get the current date and time.
 */
declare function getCurrentTime(format?: string): Promise<{
  formatted: string;
  date: string;
  time: string;
  timezone: string;
  day_of_week: string;
  unix: number;
}>;

/** Read a file with hashline anchors. */
declare function hashRead(input: { path: string; cwd?: string; startLine?: number; endLine?: number }): Promise<string>;

/**
 * hash — hashline tools. Methods only. Use hashRead() for reading.
 *
 * @example
 * const content = await hashRead({ path: "src/main.ts" });
 * await hash.edit({ path: "src/main.ts", edits: [...] });
 */
declare const hash: {

  /** Edit using hashline anchors. Rejects if file changed since last read. */
  edit(input: {
    path: string;
    cwd?: string;
    edits: Array<
      | { set_line: { anchor: string; new_text: string } }
      | { replace_lines: { start_anchor: string; end_anchor: string; new_text: string } }
      | { insert_after: { anchor: string; text: string } }
    >;
  }): Promise<{ appliedEdits: number; changed: boolean; summary: string }>;
};

declare const hashEdit: typeof hash.edit;

/**
 * Apply a patch in pi's stripped-down diff format.
 * Supports Add File, Delete File, Update File with context-based matching.
 */
declare function applyPatch(input: {
  patchText: string;
  /** Working directory override */
  cwd?: string;
}): Promise<string>;

/** Resolve a library name to a Context7 library ID. */
declare function context7Resolve(input: { query: string; libraryName: string }): Promise<string>;

/**
 * context7 — up-to-date library docs. Methods only. Use context7Resolve() to resolve IDs.
 *
 * @example
 * const id = await context7Resolve({ query: "auth", libraryName: "next.js" });
 * const docs = await context7.docs({ libraryId: id, query: "middleware" });
 */
declare const context7: {
  /** Fetch documentation for a resolved library. */
  docs(input: { libraryId: string; query: string }): Promise<string>;
};

declare const context7Docs: typeof context7.docs;

/** Fuzzy file search by name. */
declare function fffFind(input: { query: string; maxResults?: number; cwd?: string }): Promise<string>;

/**
 * fff — fast file finder. Methods only. Use fffFind() for file search.
 *
 * @example
 * const files = await fffFind({ query: "auth" });
 * const matches = await fff.grep({ query: "useAuth" });
 * const multi = await fff.multiGrep({ patterns: ["useAuth", "AuthContext"] });
 */
declare const fff: {
  /** Search file contents. */
  grep(input: { query: string; mode?: string; maxResults?: number; context?: number; cwd?: string }): Promise<string>;

  /** Search for lines matching ANY of multiple patterns (OR logic). */
  multiGrep(input: { patterns: string[]; constraints?: string; maxResults?: number; context?: number; cwd?: string }): Promise<string>;
};

declare const fffGrep: typeof fff.grep;
declare const fffMultiGrep: typeof fff.multiGrep;

// @code-mode-manual analysis | Semantic code analysis and runtime help

// =====================================================================
// TLDR Code Analysis (semantic search, call graphs, structure)
// =====================================================================

/** Semantic code search — find by what it DOES. */
declare function tldrSemanticSearch(input: {
  query: string;
  path?: string;
  k?: number;
  expand?: boolean;
}): Promise<Array<{
  name: string;
  file: string;
  score: number;
  calls?: string[];
  called_by?: string[];
}>>;

/**
 * tldr — code analysis. Methods only. Use tldrSemanticSearch() for search.
 *
 * @example
 * const results = await tldrSemanticSearch({ query: "authentication middleware" });
 * const struct = await tldr.structure({ path: "src/" });
 * const calls = await tldr.calls({ path: "src/" });
 * const dead = await tldr.dead({ path: "src/" });
 */
declare const tldr: {
  /** Show code structure (functions, classes, imports). Uses tree-sitter. */
  structure(input: { path: string; lang?: string }): Promise<{
    files: Array<{
      path: string;
      functions?: string[];
      classes?: string[];
      imports?: Array<{ module: string }>;
    }>;
  }>;

  /** Build cross-file call graph. */
  calls(input: { path: string }): Promise<{
    edges: Array<{
      from_file: string;
      from_func: string;
      to_file: string;
      to_func: string;
    }>;
  }>;

  /** Extract full analysis of a single file. */
  extract(input: { file: string }): Promise<{
    file_path: string;
    language: string;
    imports?: Array<{ module: string }>;
    functions?: Array<{ name: string; line_number: number; signature: string }>;
    classes?: Array<{ name: string; line_number: number }>;
  }>;

  /** Find unreachable (dead) functions. */
  dead(input: { path: string }): Promise<{
    dead_functions: Array<{ file: string; function: string }>;
  }>;

  /** Detect architecture layers. */
  arch(input: { path: string }): Promise<{
    entry_layer: Array<{ file: string; function: string }>;
    internal_layer?: Array<{ file: string; function: string }>;
    leaf_layer?: Array<{ file: string; function: string }>;
  }>;

  /** Find all callers of a function (reverse call graph). */
  impact(input: { func: string; path: string }): Promise<{
    callers: Array<{ file: string; function: string }>;
  }>;

  /** Check semantic index status. */
  indexStatus(input?: { path?: string }): Promise<{
    indexed: boolean;
    unitCount: number;
    model: string | null;
    languages: string[];
  }>;
};

declare const tldrStructure: typeof tldr.structure;
declare const tldrCalls: typeof tldr.calls;
declare const tldrExtract: typeof tldr.extract;
declare const tldrDead: typeof tldr.dead;
declare const tldrArch: typeof tldr.arch;
declare const tldrImpact: typeof tldr.impact;
declare const tldrIndexStatus: typeof tldr.indexStatus;

/**
 * Get detailed help for a sandbox function — description, guidelines, parameters.
 * Usage: console.log(await man('Read')) or console.log(await man('bash'))
 */
declare function man(name: string): Promise<string>;

/**
 * Read an image file and include it in the tool result so the LLM can see it.
 * Supports png, jpg, gif, webp. Returns a confirmation string.
 * The image is sent as an attachment alongside the text output.
 */
declare function readImage(input: {
  /** Path to the image file */
  path: string;
  /** Working directory override */
  cwd?: string;
}): Promise<string>;


// @code-mode-manual session | Session, context, and persistent state

// =====================================================================
// Session API (read/manage conversation context)
// =====================================================================

/**
 * Programmatic access to your conversation session.
 * Read messages, manage tags, compact history, persist data across reloads.
 */
declare const session: {
  /** Get conversation messages (filtered to message entries only) */
  messages(): Array<{ id: string; role: string; content: string; timestamp: string }>;
  /**
   * Get the current live context reading. Run this immediately after a compaction
   * or model switch; never act on a percentage reported by an earlier footer.
   * Returns null only when the host cannot provide a live reading.
   */
  tokens(): { tokens: number; contextWindow: number; percent?: number } | null;
  /** Get all tags/labels in the session */
  tags(): Array<{ id: string; targetId: string; label: string; timestamp: string }>;
  /** Tag the current position (like context_tag) */
  tag(name: string): string;
  /** Get session ID */
  id(): string;
  /** Get session name */
  name(): string | null;
  /** Get all session entries (messages, tags, compactions, custom) */
  entries(): Array<{
    id: string; type: string; timestamp: string;
    role?: string; label?: string; summary?: string;
    customType?: string; data?: unknown;
  }>;
  /** Save structured data to the session file (survives reload) */
  save(key: string, data: unknown): string;
  /** Load previously saved data from the session file */
  load(key: string): unknown;

  /** Build an outline of the current session and stash it in $.preCompact for review.
   *  Does NOT compact. Outline lines are prefixed with entry IDs so you can pin specific
   *  messages by id before calling session.squash(). */
  preCompact(): void;

  /** Pin specific messages by ID into $.pinned for verbatim preservation across squash.
   *  Prefer this over re-typing a narrative into $.ctx — zero output-token cost.
   *  Pass IDs from $.preCompact.outline or session.messages(). Unknown IDs are skipped.
   *  Pinned entries merge into $.pinned (dedup by id, preserves order-of-pin).
   *  Returns a short status string. */
  pin(ids: string[]): string;

  /**
   * Compact the session immediately. Old messages are replaced by a summary.
   * $ and session.save() survive compaction. A non-empty $.ctx is the designated
   * narrative handoff: it is frozen and injected before the first continuation
   * after compaction. It is capped at 16KiB UTF-8 and rejects rather than silently
   * truncating. $.pinned, arbitrary $ values, and session.save() records are not
   * implicitly injected. Never put secrets in $.ctx.
   * Pass { continue: "..." } for a short post-handoff instruction, or
   * { handoff: { text: "..." } } to explicitly override $.ctx.
   */
  squash(options?: { continue?: string; handoff?: { text: string } }): void;
};

// =====================================================================
// Context Management (vendored from pi-context)
// =====================================================================

/**
 * Create a named tag/bookmark in the conversation history.
 * Use before risky changes, at task boundaries, and at stable milestones.
 * Tags are the "table of contents" of your session — name them descriptively.
 * Always available — no /acm needed.
 */
declare function contextTag(input: {
  /** Tag name — use descriptive kebab-case like 'auth-jwt-start', 'db-migration-done' */
  name: string;
  /** Optional: target entry ID or existing tag name. Defaults to current HEAD. */
  target?: string;
}): string;

/**
 * View conversation history as a structured graph with context dashboard.
 * Shows tags, summaries, user messages, and tool calls with a usage HUD.
 * Use to orient yourself, find tag IDs for checkout, or check context health.
 */
declare function contextLog(input?: {
  /** Max visible entries (default 50) */
  limit?: number;
  /** Show all messages including internal tool calls (default false) */
  verbose?: boolean;
}): string;

/**
 * Navigate to a different point in conversation history.
 * Creates a branch with a summary of what you're leaving behind.
 * Use backupTag to save the current state for later retrieval.
 * Navigation completes after the current turn.
 */
declare function contextCheckout(input: {
  /** Where to jump to — tag name, entry ID, or 'root' */
  target: string;
  /** Carryover summary for the new branch. Include: [Status] + [Reason] + [Important Changes] + [Next Step] */
  message: string;
  /** Optional: tag name for backing up current state before checkout */
  backupTag?: string;
}): string;

// =====================================================================
// Persistent Store ($)
// =====================================================================

/**
 * Persistent store that survives across execute_code calls within a session.
 * Variables persist for the WHOLE session — no time expiry and NO eviction. State you
 * depend on (e.g. $.wt) is never silently dropped; clear it yourself with delete $.x
 * or $.__reset() when done. The data kept here is tiny, so there is no memory cap.
 * JSON-serializable vars ALSO survive a reload_runtime / pi restart-with-resume: the
 * store snapshots them to a session-scoped disk file and hydrates them back when it is
 * rebuilt (the singleton is module-level and would otherwise come back empty).
 * Promises stashed on $ survive across calls — fire async work, pick up results later —
 * but a promise/function can't be serialized, so it is recreated (not restored) after a
 * reload; re-fire pending async work post-reload.
 */
declare const $: {
  [key: string]: unknown;
  /** Clear all persistent state */
  __reset(): string;
  /** Show all variables, sizes, and total memory used (diagnostics only — nothing is evicted) */
  __status(): string;
  /** Legacy no-op: the store no longer evicts, so pinning is unnecessary (kept for compatibility) */
  __pin(name: string): string;
  /** Legacy no-op: the store no longer evicts (kept for compatibility) */
  __unpin(name: string): string;
  /** List all variable names */
  __keys(): string[];
  /** Current turn number */
  __turn(): number;
};


// @code-mode-manual runbooks | Reusable runbooks

// =====================================================================
// Runbooks (saved reusable code_mode scripts)
// =====================================================================

/**
 * runbook — reusable code_mode scripts. Callable as save, plus list/load/run/delete.
 *
 * @example
 * await runbook({ name: "lint", description: "Run linter", code: "..." });
 * const books = await runbook.list();
 * await runbook.load({ name: "lint" });
 * await runbook.run({ name: "lint", args: { fix: true } });
 * await runbook.delete({ name: "lint" });
 */
declare const runbook: {
  /** Save a runbook. */
  (input: { name: string; description: string; code: string }): Promise<string>;

  /** List all available runbooks. */
  list(): Promise<Array<{ name: string; description: string; file: string }>>;

  /** Load a runbook's code. */
  load(input: { name: string }): Promise<{ name: string; code: string; raw: string }>;

  /** Run a saved runbook in the current VM context. */
  run(input: { name: string; args?: Record<string, unknown> }): Promise<unknown>;

  /** Delete a saved runbook. */
  delete(input: { name: string }): Promise<string>;
};

/** @deprecated Use `runbook()` instead. */
declare const runbookSave: typeof runbook;

/** @deprecated Use `runbook.list()` instead. */
declare const runbookList: typeof runbook.list;

/** @deprecated Use `runbook.load()` instead. */
declare const runbookLoad: typeof runbook.load;

/** @deprecated Use `runbook.run()` instead. */
declare const runbookRun: typeof runbook.run;

/** @deprecated Use `runbook.delete()` instead. */
declare const runbookDelete: typeof runbook.delete;


// @code-mode-manual rlm | Recursive discovery worker

// =====================================================================
// RLM — recursive code-mode primitive
// =====================================================================

export interface RlmOptions {
  task: string;
  tools: string[];
  /** Deliberate concrete-model override. When omitted, the central cheap `rlm` role is resolved at call time. */
  model?: string;

  /** Provider-native thinking level; explicit level overrides the agent-loop setting. */
  reasoning?: "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  /** Optional human-readable worker identity. Used for progress snapshots and git-ai attribution. */
  identity?: string | { name?: string; email?: string };
  maxIterations?: number;
  /** Input-token ceiling: once reached, every tool result directs the worker to return its best partial result. */
  maxInputTokens?: number;
  maxDepth?: number;
  /** Optional runtime schema guard: rlm.return() result must contain every listed top-level key. */
  requiredKeys?: string[];
  systemPrompt?: string;
  signal?: AbortSignal;
}

export type RlmResult = Record<string, unknown> & {
  __rlm_usage?: { input: number; output: number; model: string; identity?: string };
};

export type RlmStatus = "pending" | "running" | "resolved" | "failed" | "cancelled" | "timeout";
export type RlmEventType = "start" | "step" | "tool" | "return" | "error" | "settled";

export interface RlmIdentity {
  name: string;
  email: string;
}

export interface RlmToolCallSummary {
  name: string;
  arguments?: unknown;
  timestamp: number;
}

export interface RlmSnapshot {
  status: RlmStatus;
  identity: RlmIdentity;
  model?: string;
  iteration: number;
  maxIterations?: number;
  usage: { input: number; output: number };
  turns?: number;
  lastAssistantSummary?: string;
  lastToolCall?: RlmToolCallSummary;
  toolHistory: RlmToolCallSummary[];
  startedAt: number;
  updatedAt: number;
  error?: string;
}

export interface RlmEvent {
  type: RlmEventType;
  snapshot: RlmSnapshot;
}

export type RlmEventCallback = (event: RlmEvent) => void;

export interface RlmHandle<T = RlmResult> extends PromiseLike<T> {
  timeout(ms: number): this;
  inspect(): RlmSnapshot;
  on(type: RlmEventType, callback: RlmEventCallback): this;
  unsubscribe(): void;
}

/**
 * rlm runs a small in-process LLM loop with a private code-mode $ store and a caller-chosen tool whitelist.
 * When model is omitted, rlm resolves the centrally configured `rlm` role, whose first line is a cheap
 * reconnaissance model. Set model only as a deliberate override for reasoning-heavy work; rlm never inherits
 * the parent session's frontier model. The sub-agent must finish by calling rlm.return({...}).

 * Optional reasoning selects a provider-native thinking level. Explicit RLM reasoning overrides the agent-loop level. If neither is set, Z.AI reasoning-format models receive low because current GLM models reject disabled thinking.
 * Every RLM also receives `man` as a read-only documentation capability, even when it is not listed in tools.
 * Its initial prompt contains only declarations for the allowed surface; detailed and runtime-registered schemas
 * are resolved on demand with `man("name")` or `man("code-mode/<topic>")`. Documentation visibility never
 * grants an executable capability outside the caller's whitelist, and nested RLMs use the same policy.
 * The returned value can be a large JSON-cloneable
 * object, so callers can keep rich ref-graphs cheaply on their own $ store. Canonical caller pattern:
 *
 *   $.rlm = $.rlm ?? {};
 *   $.rlm.buddy = await rlm({ task: "search ouija for X", tools: ["ouija"] });
 *   // Later: $.rlm.buddy.sessions[sessionId].content
 *
 * Use rlm proactively for discovery, search, comparison, and evidence-map tasks that would otherwise take
 * many parent execute_code blocks. Good fits: mapping where a symbol is defined/used/tested, comparing
 * docs against implementation, scanning tickets/sessions, collecting TODO clusters, or summarizing proof
 * artifacts. Ask the sub-agent for structured keys like { files, refs, tests, notes } and store the result
 * on $ for later drill-down.
 *
 * Prefer direct parent tool calls for a tiny one-file lookup or a single obvious command. For non-trivial edits,
 * use rlm before editing to build a structured plan/evidence map, then apply the final patch from the parent.
 * rlm is strongest as an isolated discovery/planning worker with a narrow tools list and a structured return.
 * Treat $ as a 50MB-capable transport for structured data, not only a scratchpad. Store the object and
 * drill into exact keys later instead of forcing a prose summary through the context window.
 *
 * Implementation workers can be run wake-safely without blocking the harness:
 *
 *   const h = rlm({ task, tools, identity: "slice-2" }).timeout(600_000);
 *   h.on("step", e => console.log("rlm", e.snapshot.iteration, e.snapshot.lastAssistantSummary));
 *   h.then(
 *     r => console.wake("rlm done: " + JSON.stringify(r).slice(0, 500)),
 *     e => console.wake("rlm failed: " + e.message),
 *   );
 *   console.log("RLM armed — inspect later with h.inspect(); do not sleep-poll.");
 */
declare const rlm: ((opts: RlmOptions) => RlmHandle) & {
  return(value: Record<string, unknown>): never;
};

// @code-mode-manual runtime | Runtime controls and notifications

// =====================================================================
// Console Extensions
// =====================================================================

/**
 * Queue a message that triggers a new agent turn after this execute_code block returns.
 *
 * Unlike console.log() which only writes to the current block's output (gone when the block
 * finishes), console.wake() sends a message that wakes the agent up — even from a background
 * promise that fires minutes later.
 *
 * Every wake goes through with deliverAs: "followUp" — safe whether the agent is idle or
 * currently streaming a response. Pi queues them in order so multiple wakes from multiple
 * background callbacks all land as sequential follow-up turn triggers.
 *
 * Use cases:
 * - Background monitoring: fire a polling promise onto $, wake yourself when something changes
 * - Worker watching: prefer typed events like teams.on(...); do not foreground sleep-poll
 * - File watching: tail a log file, wake when a pattern appears
 *
 * @example
 * // Fire-and-forget monitor that wakes the agent when done. Do NOT await this promise;
 * // stashing it on $ lets this execute_code block return so the harness is not blocked.
 * // For a teams worker, prefer the typed event instead of any polling:
 * teams.on("my-worker", "terminal").timeout(30 * 60 * 1000).wake(e => `worker ${e.type}`);
 * // Generic case: ONE bounded condition-poll inside a background promise is fine
 * // (it costs no provider turns); re-issuing status checks across turns is not.
 * $.monitor = (async () => {
 *   for (let i = 0; i < 20; i++) {
 *     await sleep(60000); // short bounded waits inside ONE promise only
 *     const status = await mesh.view({ sessionId: 'my-worker', start: -2, end: 0 });
 *     if (status.includes('completed')) {
 *       console.wake("Worker finished! Check results.");
 *       return;
 *     }
 *   }
 *   console.wake("Monitor timed out — worker never completed.");
 * })();
 * console.log("Monitor armed — I will be woken. I can call done() now; the wake survives it.");
 */
declare namespace console {
  function wake(...args: unknown[]): void;
}

/**
 * Dual-name aliases — direct-tool names work inside execute_code under their EXACT
 * names: mesh_tell, mesh_view, mesh_inbox, mesh_peers, mesh_chat, mesh_interrupt,
 * mesh_broadcast, mesh_join_channel, mesh_leave_channel, webfetch (= WebFetch),
 * execute_code_async_list (= executeCodeAsyncList), execute_code_async_kill
 * (= executeCodeAsyncKill). The mesh.* namespace and these aliases are the SAME
 * implementations — one capability, one name.
 *
 * Buffer (Node's binary helper) is available globally. require() is NOT — every
 * capability is pre-injected; never write import/require in the sandbox.
 */
declare const Buffer: typeof import("node:buffer").Buffer;

/**
 * Subset of Node.js process object - env vars, cwd, platform info.
 */
declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  platform: string;
  pid: number;
};

/**
 * Toggle auto-continue supervisor. When enabled, sends "[SUPERVISOR] continue, go"
 * when the agent goes idle — no LLM steering, just auto-wake.
 */
declare function supervise(enabled: boolean): Promise<string>;

/**
 * Set your workspace stage icon — the cmux tab lifecycle indicator the hooman
 * triages panes by. Call it the MOMENT your phase changes (first action of the
 * new phase). Valid stages: planning, implementing, blocked, blocked-long,
 * review, landing, bugfix, cleaning, coordinator, bhakti, smoketest, parked,
 * attention. Accepts the stage string or { stage }.
 */
declare function status(stage: string): Promise<string>;

/**
 * Fire a desktop notification that pulls the hooman to THIS pane. Use whenever
 * you need their eyes: a question, a blocking decision, or a done/blocked/
 * smoke-test hand-back — they are almost certainly looking at another tab.
 * Pass a string, or { title, subtitle, body } for full control.
 */
declare function notify(
  message: string | { title?: string; subtitle?: string; body?: string },
): Promise<string>;

/**
 * Set a short session codename (the ses-title slot, max 12 chars) so the pane is
 * identifiable while planning, before the hooman /names it. The hooman's /name
 * overrides it whenever set. Pass an empty string to clear.
 */
declare function sessionTitle(title: string): Promise<string>;

// @code-mode-manual teams | Team worker orchestration

/**
 * Coordinate a team of worker agents.
 *
 * @example
 * // Delegate with auto-created ticket
 * await teams.delegate([{ text: "Fix the bug", assignee: "fixer" }]);
 *
 * // Delegate with pre-created ticket from mai.ticket()
 * const ticket = await mai.ticket({ title: "Auth middleware", description: "Add JWT validation", tags: "team" });
 * await teams.delegate([{ text: "See ticket", ticketId: ticket.id, assignee: "auth" }]);
 *
 * // List, view, kill
 * await teams.list();
 * await teams.view("fixer");
 * await teams.kill("fixer");
 * await teams.tell("fixer", "check src/auth.ts");
 *
 * // Raw action dispatch (backward compat)
 * await teams({ action: "delegate", tasks: [...] });
 *
 * // Attach one inactive exact Pi JSONL as a persistent member.
 * // Omit model to preserve the source session's normal model behavior.
 * await teams.adopt({
 *   session: { kind: "id", id: "01J..." },
 *   as: "researcher",
 *   message: "Continue from the existing context.",
 * });
 *
 * // Subscribe to worker events — no polling, no hard sleeps
 * // One-shot await: block until fixer completes (or errors)
 * const event = await teams.on("fixer", "completed").timeout(600_000);
 * console.log("fixer done:", event.result);
 *
 * // Background wake — host-owned and synchronous with Teams event dispatch.
 * // Use "terminal" so success, quit, crash, and freeform completion all wake.
 * teams.on("fixer", "terminal")
 *   .timeout(30 * 60 * 1000)
 *   .wake(e => `fixer ${e.type}`);
 *
 * // Never combine .preventDefault() with .then/.each plus console.wake()
 * // for a Teams terminal event.
 *
 * // Streaming: react to every matching event until unsubscribed
 * const sub = teams.on({ name: "oracle", type: "comment" }).each(e => {
 *   console.log("oracle note:", e.comment.slice(0, 200));
 * });
 * // later: sub.unsubscribe();
 *
 * // Comment/note body regex
 * await teams.on({ name: "oracle", comment: /DONE:|FINAL:/ }).timeout(300_000);
 *
 * // Full predicate escape hatch
 * await teams.on({ predicate: e => e.type === "stuck" && e.idleSeconds > 300 });
 *
 * // Parallel race — whichever finishes first wins
 * const first = await Promise.race([
 *   teams.on("fixer", "completed"),
 *   teams.on("oracle", "completed"),
 * ]);
 */
type TeamsAdoptSession =
  | { kind: "id"; id: string }
  | { kind: "file"; path: string };

interface TeamsAdoptOptions {
  /** Exact persisted Pi session to attach. It must be inactive, well-formed, unambiguous, and unleased. */
  session: TeamsAdoptSession;
  /** Stable team-member display name; logical identity is derived independently. */
  as: string;
  /** Message sent on the first adopted activation. */
  message: string;
  /** Optional existing assignment ticket. Omit to create an adopted-session instruction ticket. */
  ticketId?: string;
  /** Explicit model override. Omit to preserve the source session's normal model behavior. */
  model?: string;
  /** Give the adopted member Teams delegation tools. */
  hasTools?: boolean;
}

declare const teams: {
  /** Raw action dispatch — backward compat. Prefer specific methods below. */
  (params: {
    action?: "delegate" | "adopt" | "list" | "kill" | "kill_all" | "tell" | "tell_all" | "view" | "runtime" | "history";
    adoption?: TeamsAdoptOptions;
    tasks?: Array<{
      text: string;
      ticketId?: string;
      assignee?: string;
      model?: string;
      template?: string;
      hasTools?: boolean;
      persistent?: boolean;
    }>;
    name?: string;
    names?: string[];
    message?: string;
    start?: number;
    end?: number;
    useWorktree?: boolean;
    baseRef?: string;
  }): Promise<string>;

  /** Spawn workers with tasks. Each task can have ticketId, assignee, model, etc. */
  delegate(tasks: Array<Record<string, unknown>>, opts?: Record<string, unknown>): Promise<string>;

  /**
   * Attach an inactive exact existing Pi JSONL as a persistent team member.
   * Teams preserves the source path and header cwd, rejects current/live/ambiguous/
   * malformed/leased sources, and later resumes it through teams.tell().
   */
  adopt(options: TeamsAdoptOptions): Promise<string>;

  /** Show all active workers and their status. */
  list(): Promise<string>;

  /** Kill a specific worker by name. */
  kill(name: string): Promise<string>;

  /** Kill all workers. */
  killAll(): Promise<string>;

  /** Send a message to a specific worker. */
  tell(name: string, message: string): Promise<string>;

  /** Send a message to all workers. */
  tellAll(message: string): Promise<string>;

  /** Read recent session entries for a worker. */
  view(name: string, opts?: { start?: number; end?: number }): Promise<string>;

  /** Show runtime info. */
  runtime(): Promise<string>;

  /**
   * Subscribe to the leader's PollEvent stream. Returns a TeamsSubscription that is
   * thenable (so `await teams.on(...)` resolves on the next match) and chainable
   * via .each(), .timeout(), .unsubscribe().
   *
   * Event types: "completed" | "warning" | "failed" | "stuck" | "comment" | "alive"
   *
   * - One-shot form: awaiting the subscription resolves on the first matching event
   *   and auto-unsubscribes.
   * - Streaming form: .each(cb) keeps firing until .unsubscribe() is called.
   * - Terminal state short-circuit: if the target worker is already in the requested
   *   terminal state at subscribe time, the subscription resolves immediately from
   *   the current WorkerHandle rather than hanging forever.
   */
  on(name: string): TeamsSubscription;
  on(name: string, type: TeamsEventType): TeamsSubscription;
  on(name: string, type: TeamsEventType, callback: (event: TeamsPollEvent) => void): TeamsSubscription;
  on(filter: TeamsEventFilter): TeamsSubscription;
  on(filter: TeamsEventFilter, callback: (event: TeamsPollEvent) => void): TeamsSubscription;
};

type TeamsEventType = "completed" | "warning" | "failed" | "stuck" | "comment" | "alive" | "terminal";

interface TeamsEventFilter {
  name?: string;
  type?: TeamsEventType;
  /** Only meaningful for comment events. String → substring, RegExp → test(). */
  comment?: string | RegExp;
  /** Full custom predicate — runs after all other filters. */
  predicate?: (event: TeamsPollEvent) => boolean;
  /** Default true. If false, skip synthesizing an immediate event for workers
   *  already in a terminal state matching the filter. */
  matchCurrent?: boolean;
}

interface TeamsWorkerHandle {
  name: string;
  ticketId: string;
  status: string;
  nickname?: string;
  pid: number;
  lastNote?: string;
  [key: string]: unknown;
}

type TeamsPollEventBase =
  | { type: "completed"; worker: TeamsWorkerHandle; result: string }
  | { type: "warning"; worker: TeamsWorkerHandle; reason: string }
  | { type: "failed"; worker: TeamsWorkerHandle; reason: string }
  | { type: "stuck"; worker: TeamsWorkerHandle; idleSeconds: number }
  | { type: "comment"; worker: TeamsWorkerHandle; comment: string }
  | { type: "alive"; worker: TeamsWorkerHandle };

/**
 * DOM-style wrapped event dispatched to subscription listeners. Mirrors the
 * browser Event API:
 *
 *   - preventDefault()        — suppress the leader's default notifyLLM batch
 *                               (no duplicate coordinator wake from leader side)
 *   - stopPropagation()       — stop later subscription listeners from seeing
 *                               this event in the same dispatch pass
 *   - stopImmediatePropagation() — alias (subscriptions dispatch in a single pass)
 *   - defaultPrevented        — read-only flag, true if any handler preventDefault'd
 *   - propagationStopped      — read-only flag, true if any handler stopPropagation'd
 *
 * Must be called SYNCHRONOUSLY inside a handler callback. Calling preventDefault()
 * on an awaited value is a no-op — by the
 * time your code resumes, the dispatch loop has already decided.
 *
 * Use the host-owned `.wake(...)` chain for background terminal wakes. Use
 * `.preventDefault()` only when the current in-turn handler owns the replacement
 * action synchronously.
 */
type TeamsPollEvent = TeamsPollEventBase & {
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
  readonly defaultPrevented: boolean;
  readonly propagationStopped: boolean;
};

/**
 * Subscription returned by teams.on(). Thenable + chainable.
 * Auto-unsubscribes after the first match UNLESS .each() has been attached
 * (then it keeps streaming until .unsubscribe()).
 *
 * Chain `.wake(...)` for every background Teams terminal wake. It sends the
 * coordinator follow-up from host dispatch and suppresses the duplicate default
 * batch automatically. Use `await teams.on(...)` when the current turn needs the
 * result inline.
 *
 * Never combine `.preventDefault()` with `.then(...)` or `.each(...)` plus
 * `console.wake()` for a Teams terminal event. That suppresses the host wake and
 * depends on a later sandbox Promise callback.
 */
interface TeamsSubscription extends PromiseLike<TeamsPollEvent> {
  /**
   * Streaming callback. Fires on every matching event until unsubscribed.
   * Use `.wake(...)` for a background coordinator turn instead of calling
   * `console.wake()` from this callback.
   */
  each(callback: (event: TeamsPollEvent) => void): this;

  /**
   * Send a host-owned coordinator wake during event dispatch. Automatically
   * suppresses the duplicate default batch wake.
   */
  wake(message?: string | ((event: TeamsPollEvent) => string)): this;

  /** Reject with a timeout error if no matching event arrives within ms. */
  timeout(ms: number): this;

  /**
   * Pre-register preventDefault() on every matched event. Use this only when
   * the current in-turn handler owns the replacement action synchronously.
   * For a background Teams terminal wake, use .wake() instead.
   */
  preventDefault(): this;

  /**
   * Pre-register stopPropagation() on every matched event. Prevents later
   * subscription listeners from seeing the event in the same dispatch pass.
   *
   * Equivalent to `.each(e => e.stopPropagation())`.
   */
  stopPropagation(): this;

  /** Manually stop receiving events. Idempotent. */
  unsubscribe(): void;

  /** Alias for unsubscribe. */
  cancel(): void;
}

// @code-mode-manual mesh | Mesh coordination

/**
 * mesh — inter-session communication. Callable as peers(), plus tell/view/interrupt/broadcast/chat.
 *
 * @example
 * const peers = await mesh();                        // list peers
 * const entries = await mesh.view({ sessionId: "worker-1" });
 * // tell returns an ENRICHED receipt: ack.receiverBusy + ack.view (a snapshot of
 * // what the peer was doing when your message landed) — so you can decide to wait.
 * const r = await mesh.tell({ sessionId: "fixer", message: "check auth.ts" });
 * // interrupt a BUSY peer's queue: 'steer' (default, safe) lands at its next
 * // reasoning boundary; 'abort' (NUCLEAR) cancels its in-flight work. Prefer steer.
 * await mesh.interrupt({ sessionId: "fixer", message: "wait — not that file", level: "steer" });
 * await mesh.broadcast({ topic: "status", message: "deploying" });
 * await mesh.chat({ channelId: "team-abc", message: "update" });
 */
declare const mesh: {
  /** List all visible pi sessions. */
  (): Promise<string>;

  /** Send a direct message to another session. By default waits for a delivery
   *  receipt. The receipt is ENRICHED: ack.receiverBusy (was the peer mid-turn?),
   *  ack.receiverDeafened, and ack.view (a bounded snapshot of the peer's recent
   *  activity when your message landed). A busy peer only surfaces your message at
   *  the end of its current turn — use mesh.interrupt to jump that queue.
   *  When the Hooman Telegram bridge is available, use its configured durable
   *  Hooman ID from the mesh-telegram-bridge skill as sessionId and send a completed
   *  bridge-visible file path as { image: "/absolute/render.png", text: "Here it is." }
   *  to make a Telegram photo. `text` becomes an ordinary Telegram message sent before
   *  the attachment, not the media caption. `file`, `attachment`, and `path` are aliases;
   *  known image extensions become photos, while other files become documents. This is not
   *  a URL/blob/base64 or a private path from a remote worker; send one attachment per tell.
   *  For Telegram speech, use `{ text: "visible technical message", voice: "spoken companion" }`: `text` remains lossless on screen; `voice` is a separately authored oral summary. Keep opaque IDs, hashes, URLs, paths, commands, and tables in `text`; in `voice`, describe their role rather than pronouncing them. If `voice` is absent, the bridge makes a safe speech fallback.
   *  A Mesh delivery receipt confirms bridge receipt only, not Telegram upload or Hooman visibility. */
  tell(params: { sessionId: string; message: unknown; waitFor?: string; timeoutMs?: number }): Promise<string>;

  /** PREEMPT a busy peer's queue. level 'steer' (DEFAULT, SAFE): your message lands
   *  at the peer's next reasoning boundary WITHOUT killing in-flight work — prefer
   *  this for 'wait, not this' corrections. level 'abort' (NUCLEAR): cancels the
   *  peer's in-flight tool/build/git/publish and can leave half-done work corrupt —
   *  use only when stopping the peer right now prevents real damage. Respects /mesh
   *  deafen (a deafened peer drops it; the receipt reports receiverDeafened). Returns
   *  the same enriched receipt as tell. */
  interrupt(params: { sessionId: string; message: unknown; level?: "steer" | "abort"; timeoutMs?: number }): Promise<string>;

  /** Read recent entries from another session. */
  view(params: { sessionId: string; start?: number; end?: number; timeoutMs?: number }): Promise<string>;

  /** Broadcast to all peers on a topic. */
  broadcast(params: { topic: string; message: unknown }): Promise<string>;

  /** Post a message to a mesh channel. */
  chat(params: { channelId: string; message: unknown }): Promise<string>;

  /** Join a named channel. */
  joinChannel(params: { channelId: string }): Promise<string>;

  /** Leave a channel. */
  leaveChannel(params: { channelId: string }): Promise<string>;
};

/** @deprecated Use `mesh()` instead. */
declare const meshPeers: typeof mesh;

/** @deprecated Use `mesh.tell()` instead. */
declare const meshTell: typeof mesh.tell;

/** @deprecated Use `mesh.view()` instead. */
declare const meshView: typeof mesh.view;

/** @deprecated Use `mesh.interrupt()` instead. */
declare const meshInterrupt: typeof mesh.interrupt;

/** @deprecated Use `mesh.broadcast()` instead. */
declare const meshBroadcast: typeof mesh.broadcast;

/** @deprecated Use `mesh.chat()` instead. */
declare const meshChat: typeof mesh.chat;

/** @deprecated Use `mesh.joinChannel()` instead. */
declare const meshJoinChannel: typeof mesh.joinChannel;

/** @deprecated Use `mesh.leaveChannel()` instead. */
declare const meshLeaveChannel: typeof mesh.leaveChannel;

/**
 * Get discovered skill paths. Returns root directories and actual skill directories.
 */
declare function getSkillPaths(): Promise<{
  /** Root skill directories (e.g. ~/.pi/agent/skills/, ./skills/) */
  roots: string[];
  /** Actual skill directories where SKILL.md files are located */
  skills: string[];
}>;
