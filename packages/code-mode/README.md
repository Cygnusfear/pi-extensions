# @pi-extensions/code-mode

Execute JavaScript as your primary interface to every tool — multi-step operations, loops, parallel I/O, and complex logic in a single code block instead of dozens of individual tool calls.

This is **not** a sandbox escape or eval hack. Code-mode replaces one-tool-per-turn with a persistent Node.js VM where every registered tool becomes a typed async function. The `$` store survives across calls. Session management and context hygiene are built in. It's the biggest productivity gain in the pi stack.

Inspired by [Cloudflare's code mode](https://blog.cloudflare.com/code-mode/).

## Why code-mode matters

Without code-mode, every file read, grep, bash command, or edit is a separate LLM turn. Refactoring a function across 5 files = 5 reads + 1 think + 5 edits = **11 turns**. With code-mode, all of that happens in **one** `execute_code` call — the agent writes a loop, reads all files, decides what to change, and writes them all.

- **Fewer turns** = lower cost, lower latency, better coherence
- **Persistent state** means errors don't lose progress — `$` survives crashes
- **Parallel I/O** — fire `await Promise.all([Read(...), Bash(...), WebFetch(...)])` in a single block
- **Typed declarations** — every function has full TypeScript signatures, so the LLM knows the exact API

## Features

- **Single `execute_code` tool** — replaces 30+ individual tool registrations with one entry point
- **Persistent `$` store** — variables survive across calls for the whole session. No time limit, no eviction — nothing is silently dropped. JSON-serializable vars also survive `reload_runtime` / pi restart-with-resume via a session-scoped disk snapshot (promises/functions are recreated, not restored).
- **Auto-persist** — top-level `const`, `let`, `var`, and `function` declarations are automatically copied to `$` at the end of each call
- **Session API** — `session.messages()`, `session.tokens()`, `session.save()`, `session.load()`, `session.squash()` for programmatic context management
- **Timeout control** — configurable per-call (default 120s, max 600s)
- **Errors don't kill your state** — `$` survives crashes. Pick up where you left off with `$.var`.
- **Context management** — two-phase squash with auto-continue, context usage warnings, output truncation at 200KB
- **Background self-wake** — `console.wake()` lets background promises trigger new agent turns (worker monitoring, file watching, etc.)
- **Passthrough tools** — mesh, editor, git-ai, handbook, teams, context, experiments all remain as direct LLM tools
- **Escape hatch** — `/escape_code_mode` restores all tools for the session; `/code_mode` re-enables sandbox
- **Shiki syntax highlighting** — code preview in TUI uses the same highlighter as the core editor
- **Tool exclusivity** — sandbox-only tools (bash, read, write, edit, grep, etc.) can't be called directly by the LLM
- **Git safety** — destructive git commands and `.git` writes ask for confirmation first

## The `$` persistent store

The `$` object is a Proxy-backed store that persists across `execute_code` calls within a session. It is the agent's working memory.

### Basic usage

```javascript
// Call 1 — gather data
$.files = await Glob({ pattern: '**/*.ts' });
$.results = [];
for (const f of $.files) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\n').length });
}
// If an error occurs at file 30, $.files and $.results (with 30 entries) survive

// Call 2 — resume from where we left off
const remaining = $.files.slice($.results.length);
for (const f of remaining) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\n').length });
}
```

### Memory management

```javascript
$.__reset();                // clear all persistent state
delete $.importantData;     // drop a single variable
// $.__pin / $.__unpin still exist but are no-ops now — the store never evicts
$.__status();               // show all variables, sizes, total memory
$.__keys();                 // list all variable names
$.__reset();                // clear all persistent state
```

Variables never expire and are never evicted — the store holds everything for the session until you `delete $.name` or `$.__reset()`. The data agents keep here is tiny, so there is no cap. (`$.__pin`/`$.__unpin` remain as no-ops for backward compatibility.)

### Auto-persist

Top-level declarations are automatically persisted and hydrated as bare names:

```javascript
const config = await Read({ path: 'package.json' });
// Next call: config is available directly (no $.config needed)

const { stdout: hash } = await Bash({ command: 'git rev-parse HEAD' });
// Next call: hash is available directly

function extractVersions(pkg) { return Object.keys(pkg.dependencies || {}); }
// Next call: extractVersions() is available directly
```

### Async across calls

Promises stashed on `$` survive across calls (the VM context persists, so pending promises keep running). Note: promises do NOT survive a reload/resume — only JSON-serializable `$` vars are snapshotted to disk — so re-fire pending async work after a reload:

```javascript
// Call 1 — fire slow calls, don't await
$.search = braveSearch({ query: 'node vm performance', numResults: 3 });
$.history = ouija({ action: 'search', query: 'architecture decisions', limit: 5 });
const files = await Glob({ pattern: '**/*.ts' });

// Call 2 — pick up results (instant if already resolved)
const [search, history] = await Promise.allSettled([$.search, $.history]);
```

## Async execute_code — long work without freezing the TUI

By default `execute_code` is synchronous from the agent's perspective: the tool call returns when the code finishes, and the agent's turn waits. For long-running work that would otherwise block the TUI for minutes (cold builds, deploys, monitoring), pass `async: true` to return a jobId immediately and have the result delivered as a follow-up turn.

```js
// LLM-side tool call
{ tool: "execute_code", args: { code: "<long work>", async: true } }
```

What you get back instantly:

```text
🚀 async execute_code started — jobId=exec-a3f2c1
first line: const r = await Bash({ command: "cargo build --release" })

Result will arrive as a follow-up turn when done. Manage via
executeCodeAsyncList() / executeCodeAsyncKill("exec-a3f2c1"). Next
execute_code call will wait for this one to finish.
```

When the bg work finishes, a follow-up turn fires with:

```text
[async execute_code exec-a3f2c1 completed · 2.3s]

<output>
```

Errors deliver the same shape with `failed` instead of `completed`.

### When to use it

Use `async: true` whenever the code might run longer than ~30s. Cold cargo builds, deploys, multi-step bounces, monitors that watch a peer. The TUI stays interactive — the user can type, scroll, switch buffers — while the work runs in the background.

Use the default sync mode for everything else. Reads, edits, quick greps, single shell commands. The follow-up-turn cost only pays for itself when the work would otherwise stall the TUI for a meaningful time.

### Concurrency: per-session mutex

Every `execute_code` call (sync or async) serializes on a single per-session mutex. The CodeModeSession shares one `vm.Context` — concurrent `runInContext` calls would race on the `$` store and on injected globals. The mutex prevents that.

Practical consequence: if you fire async job A, then call execute_code B (sync or async), B waits for A to finish before it starts. The agent's turn for B is blocked until A is done. This is intentional — it makes the shared state honest.

### Managing pending jobs

Two **direct tools** are available for inspecting and cancelling async jobs while they're in flight:

```json
{ "tool": "execute_code_async_list", "args": {} }
// → { jobs: [{ jobId: "exec-a3f2c1", codePreview: "const r = await Bash(...)", runtimeMs: 12450 }] }

{ "tool": "execute_code_async_kill", "args": { "jobId": "exec-a3f2c1" } }
// → { killed: true, jobId: "exec-a3f2c1" }
```

These bypass the per-session mutex so they work even while async work is still running. **Always prefer the direct tools for in-flight management** — they're the only way to actually catch a runaway async job.

The sandbox functions `executeCodeAsyncList()` and `executeCodeAsyncKill(jobId)` are also exposed for use AFTER an async job has delivered its follow-up (e.g. cleanup logic in a reaction-turn execute_code). They have the same semantics but require entering an execute_code block, which waits on the mutex — so they're not useful for in-flight management.

A killed job still delivers a follow-up turn (showing the abort error) so the agent learns the kill landed.

### Footgun and how to avoid it

The agent's turn ENDS after the async tool returns. If the agent calls more tools or generates more text after the async-execute_code returns, those happen in the same turn. The result follow-up arrives in a LATER turn, possibly while the agent is reacting to a new user message. Treat the follow-up like any other interrupting event — it's a fresh turn with the result tagged by jobId.

If you want to wait for the async result in the same turn, don't use async — just use the default sync mode. The async opt-in is specifically for "I want to start this work and let the TUI stay responsive."

### Auto-promote: sync execute_code becomes async at 60s

Default sync `execute_code` has a TUI-freeze safety net. If the sync call is still running 60 seconds in, the tool **auto-promotes** to async: returns a "still running" stub, the bg work keeps going, the result delivers as a follow-up turn tagged `[async execute_code <jobId> ... auto-promoted from sync]`.

| When | What happens |
|---|---|
| Sync call finishes in <60s | Normal inline return — zero behavior change |
| Sync call still running at 60s | Auto-promote: stub returned, bg work continues, follow-up later |
| Explicit `async: true` | Returns jobId at t=0, no 60s wait |

The threshold is configurable via `PI_CODE_MODE_PROMOTE_MS` env var (positive integer milliseconds). Default is 60_000.

**This is a safety net, not a substitute for explicit `async: true`.** If you know the work is heavy (cold build, long deploy), pass `async: true` from the start so the agent gets the jobId at t=0 and the TUI is freed immediately. The auto-promote catches the case where the agent forgot.

Auto-promoted jobs are first-class async jobs: `execute_code_async_list` shows them, `execute_code_async_kill` aborts them, the per-session mutex serializes them like any other async work.

## Background self-wake: `console.wake()`

`console.log()` only writes to the current block output — gone when the block returns. Background promises that fire minutes later would normally write into the void.

`console.wake(message)` fixes this. It queues a user message that **triggers a new agent turn** after the current block finishes. The agent literally wakes itself up — even from a background promise that fires minutes later.

### How it works

- **One wake per block** — subsequent calls are silently ignored (idempotent)
- **Agent idle** → triggers a turn immediately
- **Agent busy** → queued and delivered when the agent finishes its current turn
- Uses the same `triggerTurn` mechanism that pi-mesh (inbound tells) and teams (worker events) use internally

### Pattern: worker monitoring

Fire a polling loop into the background, wake yourself when the worker finishes:

```javascript
// Fire-and-forget monitor — polls every 4 minutes, wakes agent on completion
$.workerMonitor = (async () => {
  for (let i = 0; i < 30; i++) {
    await sleep(240000); // 4 minutes

    try {
      const view = await meshView({ sessionId: 'component-finisher', start: -1, end: 0, timeoutMs: 5000 });
      const text = typeof view === 'string' ? view : JSON.stringify(view);

      if (text.includes('DONE') || text.includes('team_finish') || text.includes('Marked')) {
        console.wake('Worker FINISHED! Latest: ' + text.substring(0, 500));
        return;
      }

      if (text.includes('stuck') || text.includes('idle')) {
        console.wake('Worker STUCK/IDLE! Latest: ' + text.substring(0, 500));
        return;
      }
      // Still working — keep monitoring silently
    } catch(e) {
      console.wake('Worker monitor error (possibly dead): ' + e.message);
      return;
    }
  }
  console.wake('Worker monitor timed out after 2 hours — check manually.');
})();

console.log('Monitor started — will wake me when the worker finishes, stalls, or dies.');
```

### Pattern: file watching

```javascript
$.logWatcher = (async () => {
  let lastSize = 0;
  for (let i = 0; i < 60; i++) {
    await sleep(30000); // 30 seconds
    const result = await Bash({ command: 'wc -c /tmp/build.log' });
    const size = parseInt(result.stdout);
    if (size < lastSize) {
      console.wake('Build log was truncated — build likely restarted.');
      return;
    }
    const content = await Bash({ command: 'tail -5 /tmp/build.log' });
    if (content.stdout.includes('BUILD FAILED')) {
      console.wake('Build FAILED! Last 5 lines: ' + content.stdout);
      return;
    }
    if (content.stdout.includes('BUILD SUCCESS')) {
      console.wake('Build succeeded! Output: ' + content.stdout);
      return;
    }
    lastSize = size;
  }
  console.wake('Log watcher timed out after 30 minutes.');
})();
console.log('Watching build log...');
```

## Session API

The `session` object provides programmatic access to conversation context:

```javascript
const msgs = session.messages();     // all conversation messages
const usage = session.tokens();      // { tokens, contextWindow }
const tags = session.tags();         // all tags/milestones
const id = session.id();             // session ID
const name = session.name();         // session name (nullable)

session.tag("before-refactor");      // bookmark current position

session.save("ctx", { goal: "...", decisions: [...] });  // survives reload
const ctx = session.load("ctx");     // restore

session.entries();                   // all session entries (messages, tags, compactions, custom)
session.preCompact();                // build outline for review (no compaction)
session.pin(["id5", "id12"]);        // pin messages verbatim into $.pinned
session.squash();                    // compact — $ (including $.pinned, $.ctx) survives
```

### Context management — three-phase squash

When context fills up, model quality degrades. Squash proactively. You have two preservation modes — use both when they apply.

1. **Pin by reference (default).** Pick messages from the outline by ID. They land in `$.pinned` verbatim. Zero output-token cost.
2. **Narrative synthesis (when needed).** Write a thick `$.ctx` string for things reference can't express — dead ends, synthesized takeaways, next-step instructions.

```javascript
// Phase 1 — review what's about to be lost
session.preCompact();
// $.preCompact = { outline: "[id123 · user] ...", messageCount: 42 }

// Phase 2a — REFERENCE: pin specific messages by ID (no rewrite)
session.pin(["id5", "id12", "id18"]);
// $.pinned = [{ id, role, content, timestamp }, ...]  survives squash

// Phase 2b — NARRATIVE: synthesize only the delta pins can't carry
$.ctx = `AUTH REFACTOR — mid-stream
Gotcha: refreshTokens.token_hash — NOT token — wasted 20 min on this
Dead end: tried session-based approach, FK violations; back to JWT.
Next: Write rotation logic at src/auth.ts:142`;

// Phase 3 — apply compaction + auto-continue
session.squash({ continue: "Squash done. Continue at src/auth.ts:142. Pinned refs in $.pinned." });
```

`$` (including `$.pinned`, `$.ctx`) and `session.save()` all survive compaction. Pin first — it's verbatim and free. Use narrative only for the delta.

## Available sandbox functions

All of these are available inside `execute_code` as typed async functions:

| Function | Description |
|----------|-------------|
| `Bash({ command, cwd?, timeout? })` | Execute shell commands (git-safety guards apply — shows confirm dialog for destructive git ops) |
| `Read({ path, offset?, limit?, optional? })` | Read file contents; missing files throw `Read: file not found` unless `optional: true` returns `null`; directories throw a clear `Read: path is a directory` error |
| `Write({ path, content })` | Write/create files |
| `Edit({ path, edits: [{oldText, newText}] })` | Precise text replacement |
| `Glob({ pattern, path? })` | Find files by glob |
| `rg({ args })` | Run ripgrep search |
| `fd({ args })` | Find files with fd |
| `WebFetch({ url, format?, timeout? })` | Fetch URL content |
| `sleep(ms)` | Pause execution |
| `man(name)` | Get help for any sandbox function |
| `readImage({ path })` | Read image files (png, jpg, gif, webp) |
| `maiCall({ args? })` | Run mai CLI commands (raw passthrough) |
| `mai.ticket/start/close/show/note/ls` | Structured WORK operations (tickets, open→closed) |
| `mai.constraint/artifact/rules/supersede` | KNOWLEDGE constraint (born active) · RECORD artifact (born closed) · rules query · retire rule |
| `mai.ticketLink(ticketId)` | Create a short Maiboard ticket link |
| `mai.reviewLink({ commits, ... })` | Create a short Maiboard review handoff link backed by `~/.maitake/review-handoffs/<token>.json` |
| `maiTicket({...})` | Create tickets |
| `ouija({...})` | Search prior session history and dead conversations |
| `recall({...})` | Search semantic memory for explicit memory queries |
| `memoryCreate({...})` | Create memory nodes |
| `memoryUnfold({...})` | Expand memory nodes |
| `memoryContext({...})` | Get contextual memories |
| `braveSearch({...})` | Web search via Brave |
| `braveCodeSearch({...})` | Code search via Brave |
| `getCurrentTime(format?)` | Get current date/time |
| `hashRead({ path, startLine?, endLine? })` | Read file with hashline anchors |
| `hashEdit({ path, edits })` | Edit with hashline verification |
| `applyPatch({ patchText })` | Apply patch-format edits |
| `context7Resolve({...})` | Resolve library names |
| `context7Docs({...})` | Fetch library docs |
| `fffFind({ query, maxResults?, cwd? })` | Fuzzy file search |
| `fffGrep({ query, mode?, maxResults?, context?, cwd? })` | Content search |
| `fffMultiGrep({ patterns, constraints?, maxResults?, context?, cwd? })` | Multi-pattern search |
| `tldrSemanticSearch({...})` | Semantic code search |
| `tldrStructure({ path })` | Show code structure |
| `tldrCalls({ path })` | Build call graph |
| `tldrExtract({ file })` | Extract file analysis |
| `tldrDead({ path })` | Find dead functions |
| `tldrArch({ path })` | Detect architecture layers |
| `tldrImpact({ func, path })` | Find all callers |

## Maiboard ticket links

Use `mai.ticketLink(...)` when you want to give the Hooman a clickable link to one mai ticket.

```javascript
const ticket = await mai.ticketLink("gso-x6nv04u5");
console.log("Ticket link:", ticket.terminalLink);
```

Return fields:

| Field | Meaning |
|-------|---------|
| `terminalLink` | `http://127.0.0.1:39287/ticket/<ticketId>` — preferred for terminal output because Ghostty opens normal HTTP links reliably |
| `vscodeLink` | `vscode://pi0.maiboard/ticket/<ticketId>` — raw VS Code URI fallback |
| `link` | `mai://ticket/<ticketId>` — shorter human-facing form |
| `ticket` | The validated ticket id |

## Maiboard review handoff links

Use `mai.reviewLink(...)` when committed work is ready for the Hooman to review in Maiboard. The helper writes the full payload to disk and returns short links that do not break when the chat harness wraps long lines.

```javascript
const review = await mai.reviewLink({
  worktree: process.cwd(),
  commits: [
    "ac67fc335c43cb7772d45a0e52118eb02a16e320",
    "3b551e3043dfff2b49e1bdf50630448969fc7e01",
    "e307b16aa9153ce130464d25656be49be88e96a0",
  ],
  branch: "fix/gso-u6cp13cv-lifecycle",
  ticket: "pv-...",
});

console.log("Review link:", review.terminalLink);
```

Commit order matters. Pass `commits` oldest-to-newest, matching the order the reviewer should read. The helper stores:

```text
~/.maitake/review-handoffs/<token>.json
```

Return fields:

| Field | Meaning |
|-------|---------|
| `terminalLink` | `http://127.0.0.1:39287/review/<token>` — preferred for terminal output because Ghostty opens normal HTTP links reliably |
| `vscodeLink` | `vscode://pi0.maiboard/review/<token>` — raw VS Code URI fallback |
| `link` | `mai://review/<token>` — shorter human-facing form |
| `file` | Payload path under `~/.maitake/review-handoffs/` |
| `payload` | Versioned payload containing worktree, base/head, ordered commits, branch, ticket, worker, and session metadata |

### Console extensions

| Function | Description |
|----------|-------------|
| `console.log(...args)` | Write to current block output (gone when block returns) |
| `console.wake(...args)` | Queue a message that triggers a new agent turn — works from background promises |

### Passthrough wrappers

These call the registered tools directly from inside the sandbox:

`meshTell`, `meshAsk`, `meshPeers`, `meshView`, `meshChat`, `meshBroadcast`, `meshJoinChannel`, `meshLeaveChannel`, `editorOpen`, `editorHighlight`, `editorReveal`, `editorState`, `gitAi`, `hotseatHandbookUpdate`, `hotseatHandbookRead`

## Escape hatch

If the sandbox restriction is too limiting for a specific task:

- `/escape_code_mode` — restores all tools for direct LLM access
- `/code_mode` — re-enables sandbox mode

The LLM can also toggle escape mode programmatically by setting `$.__escaped = true`.

## Execution model

Code runs in a **persistent** Node.js `vm.Context` — the context object (including `$`, console overrides, and timer bindings) is created once per session and reused for every `execute_code` call. Tool bindings are refreshed on each call (in case `cwd` changed), but state on `$` carries over.

The execution flow has five layers:

1. **AST-based auto-persist extraction** — the user's code is parsed with acorn. Top-level `const`/`let`/`var` and `function` declarations are collected (handles all destructuring patterns). A suffix is generated to copy each name to `$` after execution.
2. **Syntax pre-validation** — the wrapped code (user code + auto-persist suffix) is parsed with `acorn`. Genuine syntax errors are caught at this compile phase and produce a clear message without affecting stored state. (Note: Bun's `vm.Script` lazy-compiles and does **not** surface syntax errors at construction, so acorn — not `vm.Script` — is the actual validator.)
3. **Hydration** — all variables in the `$` store are injected as bare context globals, so `const x = ...` from a previous call is available as bare `x` without the `$.` prefix. Tool bindings and builtins (`$`, `console`, `session`) are protected from shadowing.
4. **Fault-tolerant execution** — code runs in a try/catch. Runtime errors (including a runtime `SyntaxError` from `JSON.parse()`/`new RegExp()` on bad data — distinct from a code syntax error) are caught, partial output is preserved, the throwing line is located, and a recovery hint tells the agent which `$` variables survived.
5. **Context management** — after execution, if context usage is ≥50%, a footer shows the percentage and cost. At ≥70%, it warns the agent to distill and trim; ≥80% urges a squash.

## Tool exclusivity

When code-mode is active, these tools are **sandbox-only** (blocked from direct LLM calls):

bash, read, write, edit, grep, find, ls, apply_patch, hash_read, hash_edit, web_search_brave, code_search_brave, context7_resolve, context7_docs, recall, memory_*, fff_*, WebFetch, get_current_time, tldr_*

These remain as **direct LLM tools**: execute_code, context_*, start_supervision, init/run/log_experiment, editor_*, mesh_*, git-ai, hotseat_*

**Available in both direct tools AND sandbox:** bash_bg_* (as `bashBgStart`, etc.)

**Sandbox-only (moved from direct):** teams, apply_patch

## Files

| File | Purpose |
|------|---------|
| `extensions/code-mode.ts` | Extension entry point, VM engine, tool registration, session hooks |
| `extensions/code-mode-prompt.md` | System prompt injected into the LLM when code-mode is active |
| `extensions/code-mode-declarations.md` | Full TypeScript declarations for all sandbox functions |
| `src/sandbox-tools.ts` | Creates the tool binding functions injected into the VM context |
| `src/persistent-store.ts` | `$` store implementation — Proxy-backed, no eviction, auto-persist, session-scoped disk snapshot (reload-durable) |
| `src/patch-parser.ts` | `apply_patch` parser and applier (used inside sandbox) |
| `src/hashline.ts` | Hashline anchor computation (used inside sandbox) |
| `src/shell-utils.ts` | Shell argument splitting and escaping utilities |
| `src/tool-reference.ts` | Builds cached tool reference text for the system prompt |
| `src/types.ts` | Shared type definitions |

## Dependencies

- `@earendil-works/pi-coding-agent` — core extension API
- `@earendil-works/pi-tui` — TUI rendering for code previews
- `@sinclair/typebox` — parameter schema types
- `@pi-extensions/shared` — diff renderer (Shiki), sandbox registry, tool UI utils

## Setup

Code-mode is typically installed via pi's extension system. No additional configuration is required — it activates automatically on session start and injects its system prompt and tool declarations.
