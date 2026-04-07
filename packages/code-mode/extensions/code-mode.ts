/**
 * Code Mode extension for pi
 *
 * Provides a single `execute_code` tool that lets the LLM write JavaScript
 * calling available tools as typed async functions. More efficient than
 * direct tool calls for multi-step operations and complex logic.
 *
 * Inspired by: https://blog.cloudflare.com/code-mode/
 */

import type { ExtensionAPI, ToolRenderResultOptions, ToolDefinition } from "@mariozechner/pi-coding-agent";
import {
	keyHint,
	bashToolDefinition,
	readToolDefinition,
	writeToolDefinition,
	editToolDefinition,
	grepToolDefinition,
	findToolDefinition,
	lsToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import vm from "node:vm";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import TurndownService from "turndown";
import { isGitUnsafeBash, isGitPath, isProcessKillBroadcast } from "@pi-extensions/shared/git-guards";
// Eagerly start Shiki loading via relative path (must match require() in renderCall)
require("../../shared/src/tui-diff-renderer.ts");
import { safeJsonParse, safeResponseJson } from "@pi-extensions/shared/safe-json";
import { foresightRetain } from "@pi-extensions/shared/foresight-write";
import { fffFindAPI, fffGrepAPI, fffMultiGrepAPI } from "@pi-extensions/fff/api";
import { foresightRecall, foresightUnfold, foresightContext } from "@pi-extensions/shared/foresight-read";
import {
	tldrSemanticSearchAPI,
	tldrStructureAPI,
	tldrCallsAPI,
	tldrExtractAPI,
	tldrDeadAPI,
	tldrArchAPI,
	tldrImpactAPI,
	tldrIndexStatusAPI,
} from "@pi-extensions/tldr-code/api";

function isGitLockActive(): boolean {
	return process.env.PI_GIT_LOCK_MODE !== "off";
}

function gitGuardError(reason: string): string {
	return `🛡️ GIT SAFETY BLOCK: ${reason}. GUARD PROTOCOL: ASK FOR HOOMAN TO CONFIRM THIS ACTION FIRST WITH [OK]`;
}

function processKillGuardError(reason: string): string {
	return `🛡️ HARD-BLOCKED (process kill guard): ${reason}. This guard cannot be disabled.`;
}

/**
 * Split a shell-style argument string into an array, respecting quotes and escapes.
 * Prevents shell injection by avoiding `sh -c` for tools that take user-provided args.
 */
function splitShellArgs(input: string): string[] {
	const args: string[] = [];
	let current = "";
	let quote: "'" | '"' | null = null;
	let escape = false;

	for (const char of input) {
		if (escape) {
			current += char;
			escape = false;
			continue;
		}
		if (char === "\\" && quote !== "'") {
			escape = true;
			continue;
		}
		if (quote) {
			if (char === quote) {
				quote = null;
			} else {
				current += char;
			}
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char as "'" | '"';
			continue;
		}
		if (/\s/.test(char)) {
			if (current.length > 0) {
				args.push(current);
				current = "";
			}
			continue;
		}
		current += char;
	}
	if (current.length > 0) {
		args.push(current);
	}
	return args;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000; // 2 minutes overall
const MAX_EXECUTION_TIMEOUT_MS = 600_000; // 10 minutes hard cap
const SYNC_TIMEOUT_MS = 5_000; // 5s for parsing/setup
const SUBPROCESS_TIMEOUT_MS = 30_000; // 30s per subprocess
const MAX_OUTPUT_LENGTH = 200_000; // 200KB output cap
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB subprocess buffer

// =============================================================================
// TypeScript Declarations (injected into system prompt)
// =============================================================================

const CODE_MODE_DECLARATIONS = `
/**
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


// =====================================================================
// Persistent Store ($)
// =====================================================================

/**
 * Persistent store that survives across execute_code calls within a session.
 * Variables expire after ~10 turns of not being accessed.
 * Use $.__pin('name') to prevent expiry, $.__status() to inspect.
 */
declare const $: {
  [key: string]: unknown;
  /** Clear all persistent state */
  __reset(): string;
  /** Show all variables, sizes, and TTL remaining */
  __status(): string;
  /** Pin a variable so it never expires */
  __pin(name: string): string;
  /** Restore normal TTL behavior for a pinned variable */
  __unpin(name: string): string;
  /** List all variable names */
  __keys(): string[];
  /** Current turn number */
  __turn(): number;
};
`;

// =============================================================================
// System Prompt Addition
// =============================================================================

const CODE_MODE_SYSTEM_PROMPT = `
# Code Mode

You have an \`execute_code\` tool that runs JavaScript with typed async functions for calling tools.

\`execute_code\` is your **primary tool**. Almost all work goes through it. Direct tool calls (read, bash, edit, etc.) are disabled — use the equivalent functions inside code mode.

All functions are async — use \`await\`. Use \`console.log()\` to return output.
Only console output is returned to you. If you don't log anything, you get "(no output)".

## Persistent State: \`$\`

The \`$\` object persists across \`execute_code\` calls within a session. Use it for:
- Storing intermediate results that survive errors
- Resuming work after a failure without re-reading files
- Caching expensive computations across multiple code blocks

\`\`\`javascript
// Call 1 — gather data
$.files = await Glob({ pattern: '**/*.ts' });
$.results = [];
for (const f of $.files) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\\n').length });
}
// If an error occurs at file 30, $.files and $.results (with 30 entries) survive

// Call 2 — resume from where we left off
const remaining = $.files.slice($.results.length);
for (const f of remaining) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\\n').length });
}
\`\`\`

Regular \`const\`/\`let\` variables are local to each code block. Only \`$\` persists.

### \`$\` TTL (Time-To-Live)

Variables in \`$\` expire after ~10 turns of not being accessed. You'll see warnings:
\`\`\`
⏳ $.files expires in 2 turns (50 items, 3KB). Use $.__pin('files') or access it to keep.
⏳ $.oldData EXPIRED and was dropped (was 45KB)
\`\`\`

- **Reading or writing \`$.x\` resets its TTL** — active variables don't expire
- **\`$.__pin('name')\`** — never expire this variable
- **\`$.__unpin('name')\`** — restore normal TTL behavior
- **\`$.__status()\`** — show all variables, sizes, and TTL remaining
- **\`$.__reset()\`** — clear all persistent state
- **\`$.__keys()\`** — list all variable names

\`\`\`typescript
${CODE_MODE_DECLARATIONS}\`\`\`

### Example
\`\`\`javascript
// Find all TypeScript files with TODO comments
const result = await rg({ args: '-l "TODO" --glob "*.ts"' });
const files = result.trim().split("\\n").filter(Boolean);

for (const file of files) {
  const content = await Read({ path: file });
  const todos = content.split("\\n")
    .map((line, i) => ({ line: i + 1, text: line.trim() }))
    .filter(({ text }) => text.includes("TODO"));
  if (todos.length > 0) {
    console.log(\`\\n## \${file}\`);
    todos.forEach(t => console.log(\`  L\${t.line}: \${t.text}\`));
  }
}
\`\`\`

For tools not available in code mode (teams, context_tag, context_log, context_checkout, editor_*, mesh_*, etc.), use direct tool calls as normal.`;

// =============================================================================
// Sandbox Tool Implementations
// =============================================================================

function shellEsc(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

const FORESIGHT_BANK = process.env.FORESIGHT_BANK || process.env.HINDSIGHT_BANK || path.basename(process.cwd());

// =============================================================================
// Hashline Engine (shared logic from hashline-tools.ts)
// =============================================================================

type HashlineEdit =
	| { set_line: { anchor: string; new_text: string } }
	| { replace_lines: { start_anchor: string; end_anchor: string; new_text: string } }
	| { insert_after: { anchor: string; text: string } };

function computeLineHash(line: string): string {
	const normalized = (line.endsWith("\r") ? line.slice(0, -1) : line).replace(/\s+/g, "");
	return crypto.createHash("sha1").update(normalized).digest().subarray(0, 1).toString("hex");
}

function formatHashLines(content: string, startLine = 1, endLine?: number): string {
	const lines = content.split("\n");
	const startIdx = Math.max(0, startLine - 1);
	const endIdx = endLine === undefined ? lines.length - 1 : Math.min(lines.length - 1, endLine - 1);
	const out: string[] = [];
	for (let i = startIdx; i <= endIdx; i += 1) {
		const line = lines[i] ?? "";
		out.push(`${i + 1}:${computeLineHash(line)}|${line}`);
	}
	return out.join("\n");
}

function parseAnchor(anchor: string): { line: number; hash: string } {
	const m = /^(\d+):([0-9a-fA-F]+)$/.exec(anchor.trim());
	if (!m) throw new Error(`Invalid anchor '${anchor}'. Expected '<line>:<hash>'.`);
	const line = Number(m[1]);
	if (!Number.isInteger(line) || line < 1) throw new Error(`Invalid anchor '${anchor}': line must be >= 1.`);
	return { line, hash: m[2].toLowerCase() };
}

function assertAnchorMatches(fileLines: string[], ref: { line: number; hash: string }, which: string) {
	if (ref.line < 1 || ref.line > fileLines.length) {
		throw new Error(`${which} anchor line out of range: ${ref.line}. File has ${fileLines.length} line(s). Re-read the file.`);
	}
	const actual = computeLineHash(fileLines[ref.line - 1] ?? "");
	if (actual !== ref.hash) {
		throw new Error(`${which} anchor mismatch at line ${ref.line}: expected ${ref.hash}, got ${actual}. Re-read the file and retry.`);
	}
}

function applyHashEdits(original: string, edits: HashlineEdit[]): { updated: string; appliedEdits: number } {
	const hasTrailingNewline = original.endsWith("\n");
	const lines = original.split("\n");
	let applied = 0;

	for (const edit of edits) {
		if ("set_line" in edit) {
			const { line, hash } = parseAnchor(edit.set_line.anchor);
			assertAnchorMatches(lines, { line, hash }, "set_line");
			lines.splice(line - 1, 1, ...edit.set_line.new_text.split("\n"));
			applied += 1;
		} else if ("replace_lines" in edit) {
			const start = parseAnchor(edit.replace_lines.start_anchor);
			const end = parseAnchor(edit.replace_lines.end_anchor);
			if (end.line < start.line) throw new Error(`replace_lines invalid range: end ${end.line} < start ${start.line}.`);
			assertAnchorMatches(lines, start, "replace_lines(start)");
			assertAnchorMatches(lines, end, "replace_lines(end)");
			lines.splice(start.line - 1, end.line - start.line + 1, ...edit.replace_lines.new_text.split("\n"));
			applied += 1;
		} else if ("insert_after" in edit) {
			const { line, hash } = parseAnchor(edit.insert_after.anchor);
			assertAnchorMatches(lines, { line, hash }, "insert_after");
			lines.splice(line, 0, ...edit.insert_after.text.split("\n"));
			applied += 1;
		}
	}

	let updated = lines.join("\n");
	if (hasTrailingNewline && !updated.endsWith("\n")) updated += "\n";
	if (!hasTrailingNewline && updated.endsWith("\n")) updated = updated.slice(0, -1);
	return { updated, appliedEdits: applied };
}

// =============================================================================
// Patch Engine (shared logic from file-tools.ts)
// =============================================================================

type PatchUpdateChunk = {
	old_lines: string[];
	new_lines: string[];
	change_context?: string;
	is_end_of_file?: boolean;
};

type PatchHunk =
	| { type: "add"; path: string; contents: string }
	| { type: "delete"; path: string }
	| { type: "update"; path: string; move_path?: string; chunks: PatchUpdateChunk[] };

function parsePatchHeader(lines: string[], startIdx: number): { filePath: string; movePath?: string; nextIdx: number } | null {
	const line = lines[startIdx];
	if (line.startsWith("*** Add File:")) {
		const filePath = line.split(":", 2)[1]?.trim();
		return filePath ? { filePath, nextIdx: startIdx + 1 } : null;
	}
	if (line.startsWith("*** Delete File:")) {
		const filePath = line.split(":", 2)[1]?.trim();
		return filePath ? { filePath, nextIdx: startIdx + 1 } : null;
	}
	if (line.startsWith("*** Update File:")) {
		const filePath = line.split(":", 2)[1]?.trim();
		let movePath: string | undefined;
		let nextIdx = startIdx + 1;
		if (nextIdx < lines.length && lines[nextIdx].startsWith("*** Move to:")) {
			movePath = lines[nextIdx].split(":", 2)[1]?.trim();
			nextIdx += 1;
		}
		return filePath ? { filePath, movePath, nextIdx } : null;
	}
	return null;
}

function parseUpdateChunks(lines: string[], startIdx: number): { chunks: PatchUpdateChunk[]; nextIdx: number } {
	const chunks: PatchUpdateChunk[] = [];
	let i = startIdx;
	while (i < lines.length && !lines[i].startsWith("***")) {
		if (lines[i].startsWith("@@")) {
			const contextLine = lines[i].substring(2).trim();
			i += 1;
			const oldLines: string[] = [];
			const newLines: string[] = [];
			let isEndOfFile = false;
			while (i < lines.length && !lines[i].startsWith("@@") && !lines[i].startsWith("***")) {
				const cl = lines[i];
				if (cl === "*** End of File") { isEndOfFile = true; i += 1; break; }
				if (cl.startsWith(" ")) { const c = cl.substring(1); oldLines.push(c); newLines.push(c); }
				else if (cl.startsWith("-")) { oldLines.push(cl.substring(1)); }
				else if (cl.startsWith("+")) { newLines.push(cl.substring(1)); }
				i += 1;
			}
			chunks.push({ old_lines: oldLines, new_lines: newLines, change_context: contextLine || undefined, is_end_of_file: isEndOfFile || undefined });
		} else { i += 1; }
	}
	return { chunks, nextIdx: i };
}

function parseAddContent(lines: string[], startIdx: number): { content: string; nextIdx: number } {
	let content = "";
	let i = startIdx;
	while (i < lines.length && !lines[i].startsWith("***")) {
		if (lines[i].startsWith("+")) content += lines[i].substring(1) + "\n";
		i += 1;
	}
	if (content.endsWith("\n")) content = content.slice(0, -1);
	return { content, nextIdx: i };
}

function parsePatchText(patchText: string): PatchHunk[] {
	const cleaned = patchText.trim();
	// Strip heredoc wrapper if present
	const heredocMatch = cleaned.match(/^(?:cat\s+)?<<['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\1\s*$/);
	const text = heredocMatch ? heredocMatch[2] : cleaned;
	const lines = text.split("\n");

	const beginIdx = lines.findIndex((l) => l.trim() === "*** Begin Patch");
	const endIdx = lines.findIndex((l) => l.trim() === "*** End Patch");
	if (beginIdx === -1 || endIdx === -1 || beginIdx >= endIdx) {
		throw new Error("Invalid patch format: missing Begin/End markers");
	}

	const hunks: PatchHunk[] = [];
	let i = beginIdx + 1;
	while (i < endIdx) {
		const header = parsePatchHeader(lines, i);
		if (!header) { i += 1; continue; }
		if (lines[i].startsWith("*** Add File:")) {
			const { content, nextIdx } = parseAddContent(lines, header.nextIdx);
			hunks.push({ type: "add", path: header.filePath, contents: content });
			i = nextIdx;
		} else if (lines[i].startsWith("*** Delete File:")) {
			hunks.push({ type: "delete", path: header.filePath });
			i = header.nextIdx;
		} else if (lines[i].startsWith("*** Update File:")) {
			const { chunks, nextIdx } = parseUpdateChunks(lines, header.nextIdx);
			hunks.push({ type: "update", path: header.filePath, move_path: header.movePath, chunks });
			i = nextIdx;
		} else { i += 1; }
	}
	return hunks;
}

function patchNormalizeUnicode(value: string): string {
	return value
		.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
		.replace(/[\u201C\u201D\u201E\u201F]/g, '"')
		.replace(/[\u2010-\u2015]/g, "-")
		.replace(/\u2026/g, "...")
		.replace(/\u00A0/g, " ");
}

function patchSeekSequence(lines: string[], pattern: string[], startIndex: number, eof = false): number {
	if (pattern.length === 0) return -1;
	const comparators: Array<(a: string, b: string) => boolean> = [
		(a, b) => a === b,
		(a, b) => a.trimEnd() === b.trimEnd(),
		(a, b) => a.trim() === b.trim(),
		(a, b) => patchNormalizeUnicode(a.trim()) === patchNormalizeUnicode(b.trim()),
	];
	for (const compare of comparators) {
		if (eof) {
			const fromEnd = lines.length - pattern.length;
			if (fromEnd >= startIndex) {
				let ok = true;
				for (let j = 0; j < pattern.length; j++) { if (!compare(lines[fromEnd + j], pattern[j])) { ok = false; break; } }
				if (ok) return fromEnd;
			}
		}
		for (let i = startIndex; i <= lines.length - pattern.length; i++) {
			let ok = true;
			for (let j = 0; j < pattern.length; j++) { if (!compare(lines[i + j], pattern[j])) { ok = false; break; } }
			if (ok) return i;
		}
	}
	return -1;
}

function patchComputeReplacements(originalLines: string[], filePath: string, chunks: PatchUpdateChunk[]): Array<[number, number, string[]]> {
	const replacements: Array<[number, number, string[]]> = [];
	let lineIndex = 0;
	for (const chunk of chunks) {
		if (chunk.change_context) {
			const idx = patchSeekSequence(originalLines, [chunk.change_context], lineIndex);
			if (idx === -1) throw new Error(`Failed to find context '${chunk.change_context}' in ${filePath}`);
			lineIndex = idx + 1;
		}
		if (chunk.old_lines.length === 0) {
			const ins = originalLines.length > 0 && originalLines[originalLines.length - 1] === "" ? originalLines.length - 1 : originalLines.length;
			replacements.push([ins, 0, chunk.new_lines]);
			continue;
		}
		let pattern = chunk.old_lines;
		let newSlice = chunk.new_lines;
		let found = patchSeekSequence(originalLines, pattern, lineIndex, chunk.is_end_of_file);
		if (found === -1 && pattern.length > 0 && pattern[pattern.length - 1] === "") {
			pattern = pattern.slice(0, -1);
			if (newSlice.length > 0 && newSlice[newSlice.length - 1] === "") newSlice = newSlice.slice(0, -1);
			found = patchSeekSequence(originalLines, pattern, lineIndex, chunk.is_end_of_file);
		}
		if (found !== -1) {
			replacements.push([found, pattern.length, newSlice]);
			lineIndex = found + pattern.length;
			continue;
		}
		throw new Error(`Failed to find expected lines in ${filePath}:\n${chunk.old_lines.join("\n")}`);
	}
	replacements.sort((a, b) => a[0] - b[0]);
	return replacements;
}

function patchApplyReplacements(lines: string[], replacements: Array<[number, number, string[]]>): string[] {
	const result = [...lines];
	for (let i = replacements.length - 1; i >= 0; i--) {
		const [startIdx, oldLen, newSegment] = replacements[i];
		result.splice(startIdx, oldLen);
		for (let j = 0; j < newSegment.length; j++) result.splice(startIdx + j, 0, newSegment[j]);
	}
	return result;
}

function patchDeriveNewContent(filePath: string, chunks: PatchUpdateChunk[]): string {
	let originalContent: string;
	try { originalContent = fs.readFileSync(filePath, "utf-8"); }
	catch (error) { throw new Error(`Failed to read file ${filePath}: ${error}`); }
	let originalLines = originalContent.split("\n");
	if (originalLines.length > 0 && originalLines[originalLines.length - 1] === "") originalLines.pop();
	const replacements = patchComputeReplacements(originalLines, filePath, chunks);
	let newLines = patchApplyReplacements(originalLines, replacements);
	if (newLines.length === 0 || newLines[newLines.length - 1] !== "") newLines.push("");
	return newLines.join("\n");
}

// =============================================================================
// Sandbox Helpers
// =============================================================================

function resolvePath(filePath: string, cwd: string): string {
	if (path.isAbsolute(filePath)) return filePath;
	if (filePath.startsWith("~/")) return path.join(os.homedir(), filePath.slice(2));
	return path.resolve(cwd, filePath);
}

interface SpawnAsyncOptions {
	cmd: string;
	args: string[];
	cwd?: string;
	timeout?: number;
	env?: NodeJS.ProcessEnv;
}

interface SpawnAsyncResult {
	stdout: string;
	stderr: string;
	status: number | null;
	error?: Error;
}

/**
 * Kill a process and its entire process group.
 */
function killTree(pid: number): void {
	try {
		process.kill(-pid, "SIGKILL");
	} catch {
		try {
			process.kill(pid, "SIGKILL");
		} catch {
			// already dead
		}
	}
}

/**
 * Async spawn that doesn't block the event loop.
 * Uses AbortSignal.timeout for the deadline and settles immediately
 * when it fires — never waits for `close` after a kill.
 */
function spawnAsync({
	cmd,
	args,
	cwd: spawnCwd,
	timeout = SUBPROCESS_TIMEOUT_MS,
	env,
}: SpawnAsyncOptions): Promise<SpawnAsyncResult> {
	return new Promise((resolve) => {
		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];
		let stdoutLen = 0;
		let stderrLen = 0;
		let settled = false;

		const timeoutSignal = AbortSignal.timeout(timeout);

		const child = spawn(cmd, args, {
			cwd: spawnCwd,
			env,
			detached: true,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const onTimeout = () => {
			if (settled) return;
			settled = true;
			if (child.pid) killTree(child.pid);
			resolve({
				stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
				stderr: Buffer.concat(stderrChunks).toString("utf-8"),
				status: null,
				error: new Error(`Timed out after ${timeout}ms`),
			});
		};

		timeoutSignal.addEventListener("abort", onTimeout, { once: true });

		child.stdout!.on("data", (chunk: Buffer) => {
			stdoutLen += chunk.length;
			if (stdoutLen <= MAX_BUFFER) stdoutChunks.push(chunk);
		});

		child.stderr!.on("data", (chunk: Buffer) => {
			stderrLen += chunk.length;
			if (stderrLen <= MAX_BUFFER) stderrChunks.push(chunk);
		});

		child.on("error", (err) => {
			if (settled) return;
			settled = true;
			timeoutSignal.removeEventListener("abort", onTimeout);
			resolve({
				stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
				stderr: Buffer.concat(stderrChunks).toString("utf-8"),
				status: null,
				error: err,
			});
		});

		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			timeoutSignal.removeEventListener("abort", onTimeout);
			resolve({
				stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
				stderr: Buffer.concat(stderrChunks).toString("utf-8"),
				status: code,
			});
		});
	});
}

function createToolBindings(cwd: string) {
	const turndown = new TurndownService({
		headingStyle: "atx",
		hr: "---",
		bulletListMarker: "-",
		codeBlockStyle: "fenced",
		emDelimiter: "*",
	});
	turndown.remove(["script", "style", "meta", "link", "noscript"]);

	return {
		Bash: async ({ command, cwd: explicitCwd, timeout }: { command: string; cwd?: string; timeout?: number }) => {
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
						stderr: (result.stderr || "") + (result.stderr ? "\n" : "") + `[TIMEOUT] ${result.error.message}`,
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

		Read: async ({ path: filePath, cwd: explicitCwd, offset, limit }: { path: string; cwd?: string; offset?: number; limit?: number }) => {
			const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
			const resolved = resolvePath(filePath, base);
			const content = fs.readFileSync(resolved, "utf-8");
			if (!offset && !limit) return content;
			const lines = content.split("\n");
			const start = Math.max(0, (offset || 1) - 1);
			const end = limit ? start + limit : lines.length;
			return lines.slice(start, end).join("\n");
		},

		Write: async ({ path: filePath, cwd: explicitCwd, content }: { path: string; cwd?: string; content: string }) => {
			const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
			const resolved = resolvePath(filePath, base);
			if (isGitLockActive() && isGitPath(resolved)) throw new Error(gitGuardError(`write to ${filePath}`));
			const dir = path.dirname(resolved);
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(resolved, content, "utf-8");
		},

		Edit: async ({ path: filePath, cwd: explicitCwd, oldText, newText }: { path: string; cwd?: string; oldText: string; newText: string }) => {
			const base = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
			const resolved = resolvePath(filePath, base);
			if (isGitLockActive() && isGitPath(resolved)) throw new Error(gitGuardError(`edit ${filePath}`));
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

		WebFetch: async ({ url, format = "text", timeout = 30 }: { url: string; format?: string; timeout?: number }) => {
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
				throw new Error(`mai ticket failed: ${(createResult.stderr || createResult.stdout || "").trim()}`);
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

		memoryContext: async ({ task, maxNodes = 10, bank }: { task: string; maxNodes?: number; bank?: string }) => {
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
				factType: factType as any, oneLiner, summary, fullSynthesis, entityName, repo,
			});
			return JSON.stringify(result);
		},

		memoryUnfold: async ({ nodeId, depth = "full", bank }: { nodeId: string; depth?: string; bank?: string }) => {
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

		braveCodeSearch: async ({
			query,
			numResults = 5,
		}: {
			query: string;
			numResults?: number;
		}) => {
			const apiKey = process.env.BRAVE_API_KEY;
			if (!apiKey) throw new Error("BRAVE_API_KEY not set");

			const params = new URLSearchParams({ q: query, count: String(numResults) });
			const r = await fetch(
				`https://api.search.brave.com/res/v1/llm/context?${params}`,
				{
					headers: {
						Accept: "application/json",
						"Accept-Encoding": "identity",
						"X-Subscription-Token": apiKey,
					},
					signal: AbortSignal.timeout(15_000),
				},
			);

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
			if (isGitLockActive() && isGitPath(resolved)) throw new Error(gitGuardError(`hashEdit ${filePath}`));
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
			const json = await safeResponseJson<{ result?: { content?: Array<{ text?: string }> }; error?: { message?: string } }>(res);
			if (json.error) throw new Error(`Context7 error: ${json.error.message ?? JSON.stringify(json.error)}`);
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
			const json = await safeResponseJson<{ result?: { content?: Array<{ text?: string }> }; error?: { message?: string } }>(res);
			if (json.error) throw new Error(`Context7 error: ${json.error.message ?? JSON.stringify(json.error)}`);
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
				if (isGitLockActive() && isGitPath(hunk.path)) throw new Error(gitGuardError(`applyPatch targets ${hunk.path}`));
				if (hunk.type === "update" && hunk.move_path && isGitPath(hunk.move_path)) {
					if (isGitLockActive()) throw new Error(gitGuardError(`applyPatch move targets ${hunk.move_path}`));
				}
			}

			const results: string[] = [];

			for (const hunk of hunks) {
				const filePath = path.resolve(explicitCwd ? resolvePath(explicitCwd, cwd) : cwd, hunk.path);

				switch (hunk.type) {
					case "add": {
						const content = hunk.contents.length === 0 || hunk.contents.endsWith("\n")
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

		fffFind: async ({ query, maxResults, cwd: explicitCwd }: { query: string; maxResults?: number; cwd?: string }) => {
			const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
			const result = await fffFindAPI(query, { maxResults, cwd: dir });
			if (result.error) throw new Error(`fffFind error: ${result.error}`);
			return result.text;
		},

		fffGrep: async ({ query, mode, maxResults, context, cwd: explicitCwd }: { query: string; mode?: string; maxResults?: number; context?: number; cwd?: string }) => {
			const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
			const result = await fffGrepAPI(query, { mode, maxResults, context, cwd: dir });
			if (result.error) throw new Error(`fffGrep error: ${result.error}`);
			return result.text;
		},

		fffMultiGrep: async ({ patterns, constraints, maxResults, context, cwd: explicitCwd }: { patterns: string[]; constraints?: string; maxResults?: number; context?: number; cwd?: string }) => {
			const dir = explicitCwd ? resolvePath(explicitCwd, cwd) : cwd;
			const result = await fffMultiGrepAPI(patterns, { constraints, maxResults, context, cwd: dir });
			if (result.error) throw new Error(`fffMultiGrep error: ${result.error}`);
			return result.text;
		},

		// =====================================================================
		// Foresight subscriptions (stubs — no live pub/sub yet)
		// =====================================================================

		memorySubscribe: async ({ nodeId, entity, topic, subscriber }: { nodeId?: string; entity?: string; topic?: string; subscriber?: string }) => {
			const watching = nodeId ? `node:${nodeId.slice(0, 8)}…` : entity ? `entity:${entity}` : `topic:${topic}`;
			return JSON.stringify({ status: "acknowledged", subscriptionId: `stub-${Date.now()}`, watching, note: "Pub/sub not available with Foresight backend" });
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
		// man() — get detailed help for any sandbox function
		// =====================================================================

		man: async (name: string): Promise<string> => {
			return formatManPage(name);
		},

	};
}

// =============================================================================
// Persistent Store ($) with TTL
// =============================================================================

const DEFAULT_STORE_TTL = 10; // turns before untouched variable expires
const TTL_WARNING_THRESHOLD = 3; // warn when this many turns remain

interface StoreEntry {
	value: unknown;
	lastAccessTurn: number;
	ttl: number; // Infinity = pinned
}

function estimateSize(value: unknown): string {
	try {
		if (value === null || value === undefined) return "0B";
		if (Array.isArray(value)) {
			const json = JSON.stringify(value);
			const bytes = Buffer.byteLength(json, "utf-8");
			const items = value.length;
			if (bytes < 1024) return `${items} items, ${bytes}B`;
			if (bytes < 1024 * 1024) return `${items} items, ${Math.round(bytes / 1024)}KB`;
			return `${items} items, ${(bytes / (1024 * 1024)).toFixed(1)}MB`;
		}
		if (typeof value === "string") {
			const bytes = Buffer.byteLength(value, "utf-8");
			if (bytes < 1024) return `${bytes}B`;
			if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
			return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
		}
		if (typeof value === "object") {
			const json = JSON.stringify(value);
			const bytes = Buffer.byteLength(json, "utf-8");
			if (bytes < 1024) return `${bytes}B`;
			if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
			return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
		}
		return `${String(value).length}B`;
	} catch {
		return "?";
	}
}

function createPersistentStore() {
	const store = new Map<string, StoreEntry>();
	let currentTurn = 0;

	function processExpiry(): string[] {
		const warnings: string[] = [];
		const expired: string[] = [];

		for (const [key, entry] of store) {
			if (entry.ttl === Infinity) continue; // pinned
			const age = currentTurn - entry.lastAccessTurn;
			const remaining = entry.ttl - age;

			if (remaining <= 0) {
				expired.push(key);
				const size = estimateSize(entry.value);
				warnings.push(`\u23f3 $.${key} EXPIRED and was dropped (was ${size}, last used ${age} turns ago)`);
			} else if (remaining <= TTL_WARNING_THRESHOLD) {
				const size = estimateSize(entry.value);
				warnings.push(`\u23f3 $.${key} expires in ${remaining} turn(s) (${size}). Use $.__pin('${key}') or access it to keep.`);
			}
		}

		for (const key of expired) store.delete(key);
		return warnings;
	}

	function getStatus(): string {
		if (store.size === 0) return "$ is empty";
		const lines: string[] = [`$ store: ${store.size} variable(s), turn ${currentTurn}`];
		for (const [key, entry] of store) {
			const size = estimateSize(entry.value);
			const age = currentTurn - entry.lastAccessTurn;
			if (entry.ttl === Infinity) {
				lines.push(`  $.${key}: ${size} (pinned, last used ${age} turns ago)`);
			} else {
				const remaining = entry.ttl - age;
				lines.push(`  $.${key}: ${size} (${remaining} turns remaining, last used ${age} turns ago)`);
			}
		}
		return lines.join("\n");
	}

	// Proxy-based $ object — property access tracks metadata transparently
	const RESERVED = new Set(["__reset", "__status", "__pin", "__unpin", "__keys", "__turn"]);

	const proxy = new Proxy({} as Record<string, unknown>, {
		set(_target, prop: string, value) {
			if (RESERVED.has(prop)) return false; // can't overwrite builtins
			const existing = store.get(prop);
			const ttl = existing?.ttl === Infinity ? Infinity : DEFAULT_STORE_TTL;
			store.set(prop, { value, lastAccessTurn: currentTurn, ttl });
			return true;
		},
		get(_target, prop: string) {
			switch (prop) {
				case "__reset":
					return () => {
						store.clear();
						return "$ cleared";
					};
				case "__status":
					return () => getStatus();
				case "__pin":
					return (name: string) => {
						const entry = store.get(name);
						if (!entry) return `$.${name} not found`;
						entry.ttl = Infinity;
						entry.lastAccessTurn = currentTurn;
						return `$.${name} pinned (will not expire)`;
					};
				case "__unpin":
					return (name: string) => {
						const entry = store.get(name);
						if (!entry) return `$.${name} not found`;
						entry.ttl = DEFAULT_STORE_TTL;
						entry.lastAccessTurn = currentTurn;
						return `$.${name} unpinned (TTL: ${DEFAULT_STORE_TTL} turns)`;
					};
				case "__keys":
					return () => [...store.keys()];
				case "__turn":
					return () => currentTurn;
				// Support JSON.stringify($), for..in, Object.keys($)
				case Symbol.toPrimitive:
				case Symbol.toStringTag:
					return undefined;
				case "toJSON":
					return () => {
						const obj: Record<string, unknown> = {};
						for (const [k, e] of store) obj[k] = e.value;
						return obj;
					};
			}
			const entry = store.get(prop);
			if (entry) {
				// Touch: reset TTL on read
				entry.lastAccessTurn = currentTurn;
				return entry.value;
			}
			return undefined;
		},
		has(_target, prop: string) {
			return store.has(prop) || RESERVED.has(prop);
		},
		deleteProperty(_target, prop: string) {
			if (RESERVED.has(prop)) return false;
			store.delete(prop);
			return true;
		},
		ownKeys() {
			return [...store.keys()];
		},
		getOwnPropertyDescriptor(_target, prop: string) {
			if (store.has(prop)) {
				return { configurable: true, enumerable: true, writable: true, value: store.get(prop)!.value };
			}
			return undefined;
		},
	});

	return { proxy, store, processExpiry, getStatus, nextTurn: () => ++currentTurn };
}

// =============================================================================
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
}

function createSession(): PersistentSession {
	const store = createPersistentStore();
	const logs: string[] = [];

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
	return { context, store, logs };
}

let session: PersistentSession | null = null;

function getSession(): PersistentSession {
	if (!session) session = createSession();
	return session;
}

async function executeCode(
	code: string,
	cwd: string,
	signal?: AbortSignal,
	executionTimeoutMs: number = DEFAULT_EXECUTION_TIMEOUT_MS,
): Promise<{ output: string; error?: string; duration: number }> {
	const sess = getSession();

	// Advance turn and process expiry
	sess.store.nextTurn();
	const warnings = sess.store.processExpiry();

	// Clear logs for this execution
	sess.logs.length = 0;

	// --- Layer 1: Syntax pre-validation ---
	// Catch parse errors (Unexpected EOF, etc.) without touching the store
	const wrapped = `(async () => {\n${code}\n})()`;
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
	const bindings = createToolBindings(cwd);
	Object.assign(sess.context, bindings);

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
		const recoveryHint = storeInfo !== "$ is empty"
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

function buildOutput(warnings: string[], logs: string[]): string {
	const parts: string[] = [];
	if (warnings.length > 0) {
		parts.push(warnings.join("\n"));
		if (logs.length > 0) parts.push("---");
	}
	if (logs.length > 0) {
		parts.push(logs.join("\n"));
	}
	return parts.join("\n");
}

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

// =============================================================================
// Tool Exclusivity — tools that remain as direct LLM tools
// =============================================================================


// =============================================================================
// Tool Reference — auto-extracted from built-in tool definitions
// =============================================================================

/** Shape of what we extract from each tool definition for the sandbox */
interface SandboxToolRef {
	name: string;
	description: string;
	snippet: string;
	guidelines: string[];
	params: string; // formatted parameter docs
}

/** Map from sandbox function name -> tool reference */
const toolRefMap = new Map<string, SandboxToolRef>();

/** Cached reference text for system prompt injection */
let cachedToolReference = "";

/** Name mapping: sandbox function -> built-in tool definition name */
const SANDBOX_TO_TOOL_NAME: Record<string, string> = {
	Bash: "bash",
	Read: "read",
	Write: "write",
	Edit: "edit",
	Grep: "grep",
	Glob: "find",
	find: "find",
	fd: "find",
	ls: "ls",
};

function extractParamDocs(paramsDef: any): string {
	if (!paramsDef?.properties) return "";
	const lines: string[] = [];
	for (const [key, schema] of Object.entries(paramsDef.properties) as [string, any][]) {
		const desc = schema.description || "";
		const optional = schema.optional ? " (optional)" : "";
		if (desc) lines.push("  - " + key + optional + ": " + desc);
	}
	return lines.join("\n");
}

function buildToolRef(name: string, def: ToolDefinition): SandboxToolRef {
	return {
		name,
		description: def.description || "",
		snippet: (def as any).promptSnippet || "",
		guidelines: (def as any).promptGuidelines || [],
		params: extractParamDocs(def.parameters),
	};
}

function initBuiltinToolRefs(): void {
	const builtinDefs: [string, ToolDefinition][] = [
		["bash", bashToolDefinition],
		["read", readToolDefinition],
		["write", writeToolDefinition],
		["edit", editToolDefinition],
		["grep", grepToolDefinition],
		["find", findToolDefinition],
		["ls", lsToolDefinition],
	];

	for (const [name, def] of builtinDefs) {
		const ref = buildToolRef(name, def);
		toolRefMap.set(name, ref);
		for (const [sandbox, tool] of Object.entries(SANDBOX_TO_TOOL_NAME)) {
			if (tool === name) toolRefMap.set(sandbox, ref);
		}
	}
}

/** Pull descriptions from all registered tools (built-in + extensions) */
function extendWithAllTools(api: ExtensionAPI): void {
	const allTools = api.getAllTools();
	for (const tool of allTools) {
		if (toolRefMap.has(tool.name)) continue;
		if (tool.name === "execute_code") continue;
		const params = extractParamDocs(tool.parameters);
		toolRefMap.set(tool.name, {
			name: tool.name,
			description: tool.description || "",
			snippet: "",
			guidelines: [],
			params,
		});
	}
}

/** Rebuild the cached reference text from toolRefMap */
function rebuildCachedReference(): void {
	const sections: string[] = ["## Sandbox Function Reference (auto-extracted from tool definitions)"];
	for (const [name, ref] of toolRefMap) {
		if (SANDBOX_TO_TOOL_NAME[name]) continue;
		const lineArr: string[] = [];
		if (ref.snippet) lineArr.push("**" + name + "**: " + ref.snippet);
		else if (ref.description) lineArr.push("**" + name + "**: " + ref.description.split(".")[0] + ".");
		for (const g of ref.guidelines) lineArr.push("- " + g);
		if (lineArr.length) sections.push(lineArr.join("\n"));
	}
	cachedToolReference = sections.join("\n\n");
}

// Initialize built-in refs at load time
initBuiltinToolRefs();
rebuildCachedReference();


/** Format a full manual page for man() */
function formatManPage(name: string): string {
	const key = name.toLowerCase();
	const ref = toolRefMap.get(key) || toolRefMap.get(name);
	if (!ref) {
		const available = [...new Set([...toolRefMap.keys()].filter(k => !SANDBOX_TO_TOOL_NAME[k]))].join(", ");
		return "No manual entry for '" + name + "'. Available: " + available;
	}

	const lineArr: string[] = [];
	lineArr.push("## " + ref.name);
	if (ref.description) lineArr.push(ref.description);
	if (ref.snippet) lineArr.push("*" + ref.snippet + "*");
	if (ref.guidelines.length) {
		lineArr.push("");
		lineArr.push("Guidelines:");
		for (const g of ref.guidelines) lineArr.push("- " + g);
	}
	if (ref.params) {
		lineArr.push("");
		lineArr.push("Parameters:");
		lineArr.push(ref.params);
	}
	const sandboxNotes = SANDBOX_FN_NOTES[key];
	if (sandboxNotes) {
		lineArr.push("");
		lineArr.push("Sandbox notes:");
		lineArr.push(sandboxNotes);
	}
	return lineArr.join("\n");
}

/** Behavioral notes that differ between standalone tool and sandbox function */
const SANDBOX_FN_NOTES: Record<string, string> = {
	bash: "Timeouts do NOT throw. Returns { stdout, stderr, exitCode: -1, timedOut: true }. Check result.timedOut.",
};


const PASSTHROUGH_TOOLS = new Set([
	"execute_code",
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

	// Hard guard: if LLM somehow calls a code-mode-only tool directly, redirect it
	pi.on("tool_call", async (event) => {
		if (CODE_MODE_ONLY_TOOLS.has(event.toolName)) {
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
			"Available functions: Bash, Read, Write, Edit, Glob, rg, fd, WebFetch, sleep, man, " +
			"mai, maiTicket, recall, memoryContext, memoryCreate, memoryUnfold, memoryStatus, " +
			"memorySubscribe, memoryUnsubscribe, memoryCheckUpdates, " +
			"braveSearch, braveCodeSearch, getCurrentTime, hashRead, hashEdit, applyPatch, " +
			"context7Resolve, context7Docs, fffFind, fffGrep, fffMultiGrep, " +
			"tldrSemanticSearch, tldrStructure, tldrCalls, tldrExtract, tldrDead, tldrArch, tldrImpact, tldrIndexStatus. " +
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
				"Use $ to persist data across code blocks. Regular const/let die after each call.",
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
			const { output, error, duration } = await executeCode(params.code, ctx.cwd, signal, timeoutMs);

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
				text = text.slice(0, MAX_OUTPUT_LENGTH) + `\n\n[output truncated. Full output saved to: ${tempFile}]`;
			}

			const lineCount = text.split("\n").length;
			return {
				content: [{ type: "text" as const, text }],
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

			// Apply consistent bg to all lines (#313340 matches lipgloss toolSuccessBg)
			const CODE_BG = "\x1b[48;2;49;51;64m";
			const ANSI_RST = "\x1b[0m";
			const wrapBg = (line: string) =>
				CODE_BG + line.replace(/\x1b\[0m/g, ANSI_RST + CODE_BG) + ANSI_RST;

			let text = wrapBg(theme.fg("toolTitle", theme.bold("execute_code")));
			text += "\n" + wrapBg("") + "\n" + highlighted.map(wrapBg).join("\n");
			if (remaining > 0) {
				text += "\n" + wrapBg(theme.fg("muted", `... (${remaining} more lines)`));
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
					0, 0,
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
				const hint = theme.fg("muted", `... (${remaining} more lines,`) + ` ${keyHint("app.tools.expand", "to expand")})`;
				return new Text(`${header}\n\n${styled}\n${hint}`, 0, 0);
			}

			return new Text(`${header}\n\n${styled}`, 0, 0);
		},
	});

	// Inject code-mode declarations and instructions into system prompt
	pi.on("before_agent_start", async (event) => {
		return {
			systemPrompt: event.systemPrompt + "\n\n" + CODE_MODE_SYSTEM_PROMPT + "\n\n" + cachedToolReference,
		};
	});
}
