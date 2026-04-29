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
- **Persistent `$` store** — variables survive across calls (150MB cap, LRU eviction). No time limit.
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
$.__pin('importantData');   // protect from LRU eviction (survives even at 150MB cap)
$.__unpin('importantData'); // make evictable again
$.__status();               // show all variables, sizes, total memory
$.__keys();                 // list all variable names
$.__reset();                // clear all persistent state
```

Variables don't expire from time — only from memory pressure. When the 150MB cap is hit, least-recently-used unpinned variables are evicted first.

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

Promises stashed on `$` survive across calls. The VM context persists, so pending promises keep running:

```javascript
// Call 1 — fire slow calls, don't await
$.search = braveSearch({ query: 'node vm performance', numResults: 3 });
$.memory = recall({ query: 'architecture decisions', limit: 5 });
const files = await Glob({ pattern: '**/*.ts' });

// Call 2 — pick up results (instant if already resolved)
const [search, memory] = await Promise.allSettled([$.search, $.memory]);
```

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
| `mai.ticket/start/close/show/note/ls` | Structured mai operations |
| `maiTicket({...})` | Create tickets |
| `recall({...})` | Search Foresight memory |
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
2. **Syntax pre-validation** — the wrapped code (user code + auto-persist suffix) is validated with `vm.Script`. Syntax errors produce a clear message without affecting stored state.
3. **Hydration** — all variables in the `$` store are injected as bare context globals, so `const x = ...` from a previous call is available as bare `x` without the `$.` prefix. Tool bindings and builtins (`$`, `console`, `session`) are protected from shadowing.
4. **Fault-tolerant execution** — code runs in a try/catch. Errors are caught, partial output is preserved, and a recovery hint tells the agent which `$` variables survived.
5. **Context management** — after execution, if context usage is ≥30%, a footer shows the percentage and cost. At ≥40%, it warns the agent to distill and trim.

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
| `src/persistent-store.ts` | `$` store implementation — Proxy-backed, LRU eviction, auto-persist |
| `src/patch-parser.ts` | `apply_patch` parser and applier (used inside sandbox) |
| `src/hashline.ts` | Hashline anchor computation (used inside sandbox) |
| `src/shell-utils.ts` | Shell argument splitting and escaping utilities |
| `src/tool-reference.ts` | Builds cached tool reference text for the system prompt |
| `src/types.ts` | Shared type definitions |

## Dependencies

- `@mariozechner/pi-coding-agent` — core extension API
- `@mariozechner/pi-tui` — TUI rendering for code previews
- `@sinclair/typebox` — parameter schema types
- `@pi-extensions/shared` — diff renderer (Shiki), sandbox registry, tool UI utils

## Setup

Code-mode is typically installed via pi's extension system. No additional configuration is required — it activates automatically on session start and injects its system prompt and tool declarations.
