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
 * Execute a bash command in the current working directory.
 * Returns stdout, stderr, and exit code.
 */
declare function Bash(input: {
  /** Bash command to execute */
  command: string;
  /** Working directory override */
  cwd?: string;
  /** Timeout in seconds (default: 30) */
  timeout?: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut?: boolean }>;

/**
 * Start a bash command in the background and return immediately with a job ID.
 * Use bashBgStatus/bashBgLogs/bashBgStop to manage it.
 */
declare function bashBgStart(input: {
  /** Bash command to run in the background */
  command: string;
  /** Working directory (default: current cwd) */
  cwd?: string;
}): Promise<{ id: string; pid: number; cwd: string; logPath: string; status: string }>;

/**
 * Get the status of a background bash job.
 */
declare function bashBgStatus(input: {
  /** Background job ID */
  id: string;
}): Promise<{ id: string; pid: number; status: string; command: string; cwd: string; startedAt: number; endedAt?: number; exitCode?: number | null; signal?: string }>;

/**
 * Read logs from a background bash job.
 */
declare function bashBgLogs(input: {
  /** Background job ID */
  id: string;
  /** 1-indexed log line to start from (default: 1) */
  offset?: number;
  /** Maximum lines to return (default: 200, max: 2000) */
  limit?: number;
}): Promise<{ text: string; offset: number; limit: number; nextOffset: number; totalLines: number; hasMore: boolean; status: string }>;

/**
 * Stop a background bash job.
 */
declare function bashBgStop(input: {
  /** Background job ID */
  id: string;
  /** Signal to send. Defaults to SIGTERM. */
  signal?: "SIGTERM" | "SIGKILL";
}): Promise<{ id: string; pid: number; status: string; exitCode?: number | null; signal?: string }>;

/**
 * List all background bash jobs started in this session.
 */
declare function bashBgList(): Promise<Array<{ id: string; pid: number; status: string; command: string; cwd: string; startedAt: number; endedAt?: number; exitCode?: number | null }>>;

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
}): Promise<string>;

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
 * Returns the raw rg output as a string.
 */
declare function rg(input: {
  /** Arguments to pass to rg (e.g., '-n "pattern" src/') */
  args: string;
  /** Working directory override */
  cwd?: string;
}): Promise<string>;

/**
 * Find files with fd.
 * Returns the raw fd output as a string.
 */
declare function fd(input: {
  /** Arguments to pass to fd (e.g., '-e ts src/') */
  args: string;
  /** Working directory override */
  cwd?: string;
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

/**
 * mai — maitake CLI integration.
 *
 * Callable: `mai({ args: "ls" })` runs any mai command raw.
 * Namespaced methods mirror the mai CLI 1:1 for common operations.
 *
 * @example
 * // Raw passthrough
 * await mai({ args: "ls" });
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
  /** Run any mai command raw. */
  (input?: { args?: string; cwd?: string }): Promise<{ stdout: string; exitCode: number }>;

  /** Create a structured ticket with Goal/AC/Verification template. */
  ticket(input: {
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

  /** List tickets (mai ls). */
  ls(opts?: { cwd?: string }): Promise<{ stdout: string; exitCode: number }>;
};

/** @deprecated Use `mai.ticket()` instead. */
declare const maiTicket: typeof mai.ticket;

/**
 * memory — Foresight semantic memory. Callable as recall, plus namespaced methods.
 *
 * @example
 * // Search memory (recall)
 * const results = await memory({ query: "architecture decisions" });
 * // Same as recall()
 * const results2 = await recall({ query: "architecture decisions" });
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
  /** Search memory — same as recall(). */
  (input: {
    query: string;
    limit?: number;
    factType?: "world" | "experience" | "opinion" | "observation";
    minScore?: number;
    bank?: string;
  }): Promise<string>;

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

  /** Get Foresight database status. */
  status(): Promise<string>;

  /** Subscribe to a memory node, entity, or topic. */
  subscribe(input: { nodeId?: string; entity?: string; topic?: string; subscriber?: string }): Promise<string>;

  /** Remove a memory subscription. */
  unsubscribe(input: { subscriptionId: string }): Promise<string>;

  /** Check for new notifications from memory subscriptions. */
  checkUpdates(input?: { subscriber?: string }): Promise<string>;
};

/** @deprecated Use `memory()` instead. */
declare const recall: typeof memory;

/** @deprecated Use `memory.context()` instead. */
declare const memoryContext: typeof memory.context;

/** @deprecated Use `memory.create()` instead. */
declare const memoryCreate: typeof memory.create;

/** @deprecated Use `memory.unfold()` instead. */
declare const memoryUnfold: typeof memory.unfold;

/** @deprecated Use `memory.status()` instead. */
declare const memoryStatus: typeof memory.status;

/** @deprecated Use `memory.subscribe()` instead. */
declare const memorySubscribe: typeof memory.subscribe;

/** @deprecated Use `memory.unsubscribe()` instead. */
declare const memoryUnsubscribe: typeof memory.unsubscribe;

/** @deprecated Use `memory.checkUpdates()` instead. */
declare const memoryCheckUpdates: typeof memory.checkUpdates;

/**
 * brave — web/code search via Brave API. Callable as search, plus codeSearch.
 *
 * @example
 * const results = await brave({ query: "rust async patterns" });
 * const codeResults = await brave.codeSearch({ query: "tokio spawn" });
 */
declare const brave: {
  /** Search the web. */
  (input: { query: string; numResults?: number; type?: "llm_context" | "web" }): Promise<string>;

  /** Search for code/docs specifically. */
  codeSearch(input: { query: string; numResults?: number }): Promise<string>;
};

/** @deprecated Use `brave()` instead. */
declare const braveSearch: typeof brave;

/** @deprecated Use `brave.codeSearch()` instead. */
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

/**
 * hash — hashline tools for anchor-verified file reading/editing.
 *
 * @example
 * const content = await hash({ path: "src/main.ts" });
 * await hash.edit({ path: "src/main.ts", edits: [...] });
 */
declare const hash: {
  /** Read a file with hashline anchors. */
  (input: { path: string; cwd?: string; startLine?: number; endLine?: number }): Promise<string>;

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

/** @deprecated Use `hash()` instead. */
declare const hashRead: typeof hash;

/** @deprecated Use `hash.edit()` instead. */
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

/**
 * context7 — up-to-date library docs. Callable as resolve, plus docs.
 *
 * @example
 * const id = await context7({ query: "auth", libraryName: "next.js" });
 * const docs = await context7.docs({ libraryId: id, query: "middleware" });
 */
declare const context7: {
  /** Resolve a library name to a Context7 library ID. */
  (input: { query: string; libraryName: string }): Promise<string>;

  /** Fetch documentation for a resolved library. */
  docs(input: { libraryId: string; query: string }): Promise<string>;
};

/** @deprecated Use `context7()` instead. */
declare const context7Resolve: typeof context7;

/** @deprecated Use `context7.docs()` instead. */
declare const context7Docs: typeof context7.docs;

/**
 * fff — fast file finder. Callable as find, plus grep/multiGrep.
 *
 * @example
 * const files = await fff({ query: "auth" });
 * const matches = await fff.grep({ query: "useAuth" });
 * const multi = await fff.multiGrep({ patterns: ["useAuth", "AuthContext"] });
 */
declare const fff: {
  /** Fuzzy file search by name. */
  (input: { query: string; maxResults?: number; cwd?: string }): Promise<string>;

  /** Search file contents. */
  grep(input: { query: string; mode?: string; maxResults?: number; context?: number; cwd?: string }): Promise<string>;

  /** Search for lines matching ANY of multiple patterns (OR logic). */
  multiGrep(input: { patterns: string[]; constraints?: string; maxResults?: number; context?: number; cwd?: string }): Promise<string>;
};

/** @deprecated Use `fff()` instead. */
declare const fffFind: typeof fff;

/** @deprecated Use `fff.grep()` instead. */
declare const fffGrep: typeof fff.grep;

/** @deprecated Use `fff.multiGrep()` instead. */
declare const fffMultiGrep: typeof fff.multiGrep;

// =====================================================================
// TLDR Code Analysis (semantic search, call graphs, structure)
// =====================================================================

/**
 * tldr — code analysis via semantic search, call graphs, structure.
 *
 * @example
 * const results = await tldr({ query: "authentication middleware" });
 * const struct = await tldr.structure({ path: "src/" });
 * const calls = await tldr.calls({ path: "src/" });
 * const dead = await tldr.dead({ path: "src/" });
 */
declare const tldr: {
  /** Semantic code search — find by what it DOES. */
  (input: {
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

/** @deprecated Use `tldr()` instead. */
declare const tldrSemanticSearch: typeof tldr;

/** @deprecated Use `tldr.structure()` instead. */
declare const tldrStructure: typeof tldr.structure;

/** @deprecated Use `tldr.calls()` instead. */
declare const tldrCalls: typeof tldr.calls;

/** @deprecated Use `tldr.extract()` instead. */
declare const tldrExtract: typeof tldr.extract;

/** @deprecated Use `tldr.dead()` instead. */
declare const tldrDead: typeof tldr.dead;

/** @deprecated Use `tldr.arch()` instead. */
declare const tldrArch: typeof tldr.arch;

/** @deprecated Use `tldr.impact()` instead. */
declare const tldrImpact: typeof tldr.impact;

/** @deprecated Use `tldr.indexStatus()` instead. */
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
  /** Get current token usage stats */
  tokens(): { tokens: number; contextWindow: number } | null;
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
   *  Does NOT compact. Use this to review what will be lost before calling session.squash(). */
  preCompact(): void;

  /**
   * Compact the session immediately. Old messages are replaced by a summary.
   * $ and session.save() survive compaction.
   * Pass { continue: "..." } to auto-continue after compaction — the message is
   * injected as a user message so the agent picks up where it left off.
   */
  squash(options?: { continue?: string }): void;
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
 * Variables persist indefinitely until total memory exceeds 150MB — then LRU unpinned vars are evicted.
 * Promises stashed on $ survive across calls — fire async work, pick up results later.
 * Use $.__pin('name') to protect from memory eviction, $.__status() to inspect.
 */
declare const $: {
  [key: string]: unknown;
  /** Clear all persistent state */
  __reset(): string;
  /** Show all variables, sizes, and total memory used */
  __status(): string;
  /** Pin a variable so it survives memory eviction */
  __pin(name: string): string;
  /** Make a pinned variable subject to memory eviction again */
  __unpin(name: string): string;
  /** List all variable names */
  __keys(): string[];
  /** Current turn number */
  __turn(): number;
};


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
 * Only ONE wake per execute_code block. Subsequent calls are silently ignored.
 *
 * Use cases:
 * - Background monitoring: fire a polling promise onto $, wake yourself when something changes
 * - Worker watching: poll a teams worker every few minutes, wake when it completes
 * - File watching: tail a log file, wake when a pattern appears
 *
 * @example
 * // Fire-and-forget monitor that wakes the agent when done
 * $.monitor = (async () => {
 *   for (let i = 0; i < 20; i++) {
 *     await sleep(240000); // 4 minutes
 *     const status = await meshView({ sessionId: 'my-worker', start: -2, end: 0 });
 *     if (status.includes('completed')) {
 *       console.wake("Worker finished! Check results.");
 *       return;
 *     }
 *   }
 *   console.wake("Monitor timed out — worker never completed.");
 * })();
 * console.log("Monitor started — will wake me when the worker finishes.");
 */
declare namespace console {
  function wake(...args: unknown[]): void;
}

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
 * // Subscribe to worker events — no polling, no hard sleeps
 * // One-shot await: block until fixer completes (or errors)
 * const event = await teams.on("fixer", "completed").timeout(600_000);
 * console.log("fixer done:", event.result);
 *
 * // Background wake — fire a coordinator turn when the event arrives, even
 * // after this execute_code block has returned. Use console.wake() from
 * // inside the callback. console.wake is the single canonical wake primitive.
 * //
 * // Chain .preventDefault() so the leader's default batch wake doesn't also
 * // fire on top of your console.wake — DOM-style "I'm handling this event."
 * teams.on("fixer", "completed")
 *   .preventDefault()
 *   .each(e => console.wake(`fixer done: ${e.result.slice(0, 500)}`));
 *
 * // Awaited form with a custom wake message
 * teams.on("oracle", "completed")
 *   .preventDefault()
 *   .then(e => console.wake(`oracle finished: ${e.result.slice(0, 500)}`));
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
declare const teams: {
  /** Raw action dispatch — backward compat. Prefer specific methods below. */
  (params: {
    action?: "delegate" | "list" | "kill" | "kill_all" | "tell" | "tell_all" | "view" | "runtime";
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
   * via .each(), .wake(), .timeout(), .unsubscribe().
   *
   * Event types: "completed" | "turn_finished" | "warning" | "failed" | "stuck" | "comment" | "alive"
   *
   * - One-shot form: awaiting the subscription resolves on the first matching event
   *   and auto-unsubscribes.
   * - Streaming form: .each(cb) keeps firing until .unsubscribe() is called.
   * - Background wake: .wake(msg?) triggers a coordinator turn when the event fires,
   *   works from background promises after the execute_code block has returned.
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

type TeamsEventType = "completed" | "turn_finished" | "warning" | "failed" | "stuck" | "comment" | "alive";

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
  | { type: "turn_finished"; worker: TeamsWorkerHandle; result: string }
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
 * Must be called SYNCHRONOUSLY inside a handler callback (.each / .wake message
 * builder). Calling preventDefault() on an awaited value is a no-op — by the
 * time your code resumes, the dispatch loop has already decided.
 *
 * For "I'm awaiting and I want the default suppressed" use the chain shortcut:
 *   teams.on(...).preventDefault().then(e => ...)
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
 * DOM-style chain shortcuts — `.preventDefault()` / `.stopPropagation()` —
 * pre-register a handler that calls the corresponding method on every matched
 * event. Useful when you're handling the event via `.each()` / `.then()` +
 * `console.wake()` and want to suppress the leader's default batch wake on top.
 *
 * Wake semantics: there is NO `.wake()` method on the subscription. To trigger
 * a coordinator turn from a background event, call `console.wake(msg)` from
 * inside your `.each()` / `.then()` callback — `console.wake` is the single
 * canonical wake primitive. Do not reinvent it per tool.
 */
interface TeamsSubscription extends PromiseLike<TeamsPollEvent> {
  /**
   * Streaming callback. Fires on every matching event until unsubscribed.
   * To trigger a coordinator turn from the callback, use `console.wake()` —
   * it is the single canonical wake primitive and works from background
   * promises that settle after the enclosing execute_code block has returned.
   */
  each(callback: (event: TeamsPollEvent) => void): this;

  /** Reject with a timeout error if no matching event arrives within ms. */
  timeout(ms: number): this;

  /**
   * Pre-register preventDefault() on every matched event. Suppresses the
   * leader's default notifyLLM batch wake, so you won't get a duplicate
   * team-event turn trigger on top of your .each/.wake/.then handler.
   *
   * Equivalent to `.each(e => e.preventDefault())` but chainable with .wake/.then.
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

/**
 * mesh — inter-session communication. Callable as peers(), plus tell/view/broadcast/chat.
 *
 * @example
 * const peers = await mesh();                        // list peers
 * const entries = await mesh.view({ sessionId: "worker-1" });
 * await mesh.tell({ sessionId: "fixer", message: "check auth.ts" });
 * await mesh.broadcast({ topic: "status", message: "deploying" });
 * await mesh.chat({ channelId: "team-abc", message: "update" });
 */
declare const mesh: {
  /** List all visible pi sessions. */
  (): Promise<string>;

  /** Send a direct message to another session. */
  tell(params: { sessionId: string; message: unknown; waitFor?: string; timeoutMs?: number }): Promise<string>;

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
