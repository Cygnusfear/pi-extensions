/**

/**
 * Ouija — BM25 search across session JSONL logs. 🔮
 * Search dead sessions, grep the current live session, or pass arbitrary entries for ad-hoc BM25.
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
 * Run mai (maitake) CLI commands.
 */
declare function mai(input: {
  /** Arguments to pass to mai CLI (default: "ls") */
  args?: string;
  /** Working directory override */
  cwd?: string;
}): Promise<{ stdout: string; exitCode: number }>;

/**
 * Create a mai ticket with Goal/AC/Verification template, optionally start it.
 */
declare function maiTicket(input: {
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

/**
 * Search Foresight semantic memory. Returns JSON string with ranked results.
 */
declare function recall(input: {
  query: string;
  limit?: number;
  factType?: "world" | "experience" | "opinion" | "observation";
  minScore?: number;
  bank?: string;
}): Promise<string>;

/**
 * Get relevant memories for a task/topic. Returns JSON string.
 */
declare function memoryContext(input: {
  task: string;
  maxNodes?: number;
  bank?: string;
}): Promise<string>;

/**
 * Create a new memory node in Foresight. Returns JSON string.
 */
declare function memoryCreate(input: {
  factType: "world" | "experience" | "opinion" | "observation";
  oneLiner: string;
  summary: string;
  fullSynthesis?: string;
  entityName?: string;
  repo?: string;
  bank?: string;
}): Promise<string>;

/**
 * Unfold a memory node for more detail. Returns JSON string.
 * Pass the full node ID from recall results, usually prefixed as "fs:...".
 * Do NOT truncate the ID.
 */
declare function memoryUnfold(input: {
  nodeId: string;
  depth?: "summary" | "full" | "raw";
  bank?: string;
}): Promise<string>;

/**
 * Get Foresight database status. Returns JSON string.
 */
declare function memoryStatus(): Promise<string>;

/**
 * Search the web via Brave Search API. Returns formatted text results.
 */
declare function braveSearch(input: {
  query: string;
  numResults?: number;
  type?: "llm_context" | "web";
}): Promise<string>;

/**
 * Search for code/docs via Brave Search. Returns formatted text results.
 */
declare function braveCodeSearch(input: {
  query: string;
  numResults?: number;
}): Promise<string>;

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
 * Read a file with hashline anchors (LINENUM:HASH|LINE per line).
 * Use with hashEdit for anchor-verified editing.
 */
declare function hashRead(input: {
  path: string;
  /** Working directory override */
  cwd?: string;
  startLine?: number;
  endLine?: number;
}): Promise<string>;

/**
 * Edit a file using hashline anchors for verification.
 * Rejects if file changed since last hashRead (hash mismatch).
 */
declare function hashEdit(input: {
  path: string;
  /** Working directory override */
  cwd?: string;
  edits: Array<
    | { set_line: { anchor: string; new_text: string } }
    | { replace_lines: { start_anchor: string; end_anchor: string; new_text: string } }
    | { insert_after: { anchor: string; text: string } }
  >;
}): Promise<{ appliedEdits: number; changed: boolean; summary: string }>;

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
 * Resolve a library name to a Context7 library ID.
 * Call this before context7Docs to get the right ID,
 * unless you already have one (like "/vercel/next.js").
 */
declare function context7Resolve(input: {
  /** What you need the library for (ranks results by relevance) */
  query: string;
  /** Library or package name to search for */
  libraryName: string;
}): Promise<string>;

/**
 * Fetch up-to-date documentation and code examples for a library from Context7.
 * Requires a Context7 library ID — use context7Resolve first if you don't have one.
 */
declare function context7Docs(input: {
  /** Context7 library ID (e.g. "/vercel/next.js", "/mongodb/docs") */
  libraryId: string;
  /** Specific question or topic to get documentation for */
  query: string;
}): Promise<string>;

/**
 * Fast fuzzy file search by name with frecency ranking.
 * Searches FILE NAMES, not file contents — use fffGrep for content search.
 */
declare function fffFind(input: {
  /** Fuzzy search query. Short — 1-2 terms. */
  query: string;
  /** Max results (default 20) */
  maxResults?: number;
  /** Working directory override */
  cwd?: string;
}): Promise<string>;

/**
 * Search file contents with frecency-ranked results.
 * Search for BARE IDENTIFIERS only, not code syntax or regex.
 */
declare function fffGrep(input: {
  /** Search text with optional constraint prefixes. */
  query: string;
  /** Search mode: 'plain' (default), 'regex', or 'fuzzy' */
  mode?: string;
  /** Max matching lines (default 30) */
  maxResults?: number;
  /** Context lines before/after each match (default 0) */
  context?: number;
  /** Working directory override */
  cwd?: string;
}): Promise<string>;

/**
 * Search file contents for lines matching ANY of multiple patterns (OR logic).
 * Patterns are literal text — no escaping needed.
 */
declare function fffMultiGrep(input: {
  /** Patterns to search for (OR logic). Include all naming variants. */
  patterns: string[];
  /** File constraints: '*.rs', 'src/', '!test/'. Separate with spaces. */
  constraints?: string;
  /** Max matching lines (default 30) */
  maxResults?: number;
  /** Context lines before/after each match (default 0) */
  context?: number;
  /** Working directory override */
  cwd?: string;
}): Promise<string>;

/**
 * Subscribe to a memory node, entity, or topic.
 * You'll be notified when new related nodes are created.
 */
declare function memorySubscribe(input: {
  /** Node UUID to watch */
  nodeId?: string;
  /** Entity name to watch */
  entity?: string;
  /** Topic/search query to watch */
  topic?: string;
  /** Subscriber identifier */
  subscriber?: string;
}): Promise<string>;

/**
 * Remove a memory subscription.
 */
declare function memoryUnsubscribe(input: {
  /** Subscription ID to remove */
  subscriptionId: string;
}): Promise<string>;

/**
 * Check for new notifications from memory subscriptions.
 */
declare function memoryCheckUpdates(input?: {
  /** Subscriber identifier (defaults to all) */
  subscriber?: string;
}): Promise<string>;

// =====================================================================
// TLDR Code Analysis (semantic search, call graphs, structure)
// =====================================================================

/**
 * Search code by natural language description.
 * Finds functions/types by what they DO using embedding similarity.
 * Returns ranked results with file paths and optional call graph info.
 */
declare function tldrSemanticSearch(input: {
  /** Natural language description of the code to find */
  query: string;
  /** Project path (default: cwd) */
  path?: string;
  /** Number of results (default: 5) */
  k?: number;
  /** Include call graph expansion */
  expand?: boolean;
}): Promise<Array<{
  name: string;
  file: string;
  score: number;
  calls?: string[];
  called_by?: string[];
}>>;

/**
 * Show code structure (functions, classes, imports) for a file or directory.
 * Uses tree-sitter AST parsing.
 */
declare function tldrStructure(input: {
  /** File or directory path */
  path: string;
  /** Language (auto-detected if omitted) */
  lang?: string;
}): Promise<{
  files: Array<{
    path: string;
    functions?: string[];
    classes?: string[];
    imports?: Array<{ module: string }>;
  }>;
}>;

/**
 * Build cross-file call graph for a directory.
 * Shows which functions call which other functions.
 */
declare function tldrCalls(input: {
  /** Directory to analyze */
  path: string;
}): Promise<{
  edges: Array<{
    from_file: string;
    from_func: string;
    to_file: string;
    to_func: string;
  }>;
}>;

/**
 * Extract full analysis of a single file — signatures, imports, classes with line numbers.
 */
declare function tldrExtract(input: {
  /** File path */
  file: string;
}): Promise<{
  file_path: string;
  language: string;
  imports?: Array<{ module: string }>;
  functions?: Array<{ name: string; line_number: number; signature: string }>;
  classes?: Array<{ name: string; line_number: number }>;
}>;

/**
 * Find unreachable (dead) functions in a directory.
 */
declare function tldrDead(input: {
  /** Directory to check */
  path: string;
}): Promise<{
  dead_functions: Array<{ file: string; function: string }>;
}>;

/**
 * Detect architecture layers from call patterns in a directory.
 */
declare function tldrArch(input: {
  /** Directory to analyze */
  path: string;
}): Promise<{
  entry_layer: Array<{ file: string; function: string }>;
  internal_layer?: Array<{ file: string; function: string }>;
  leaf_layer?: Array<{ file: string; function: string }>;
}>;

/**
 * Find all callers of a function (reverse call graph).
 */
declare function tldrImpact(input: {
  /** Function name */
  func: string;
  /** Directory to search in */
  path: string;
}): Promise<{
  callers: Array<{ file: string; function: string }>;
}>;

/**
 * Check the tldr semantic index status for a project.
 */
declare function tldrIndexStatus(input?: {
  /** Project path (default: cwd) */
  path?: string;
}): Promise<{
  indexed: boolean;
  unitCount: number;
  model: string | null;
  languages: string[];
}>;

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
