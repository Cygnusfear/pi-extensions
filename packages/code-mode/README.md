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
- **Persistent `$` store** — variables survive across calls (50MB cap, LRU eviction). No time limit.
- **Auto-persist** — top-level `const`, `let`, `var`, and `function` declarations are automatically copied to `$` at the end of each call
- **Session API** — `session.messages()`, `session.tokens()`, `session.save()`, `session.load()`, `session.squash()` for programmatic context management
- **Timeout control** — configurable per-call (default 120s, max 600s)
- **Errors don't kill your state** — `$` survives crashes. Pick up where you left off with `$.var`.
- **Context management** — two-phase squash with auto-continue, context usage warnings, output truncation at 200KB
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
$.__pin('importantData');   // protect from LRU eviction (survives even at 50MB cap)
$.__unpin('importantData'); // make evictable again
$.__status();               // show all variables, sizes, total memory
$.__keys();                 // list all variable names
$.__reset();                // clear all persistent state
```

Variables don't expire from time — only from memory pressure. When the 50MB cap is hit, least-recently-used unpinned variables are evicted first.

### Auto-persist

Top-level declarations are automatically copied to `$`:

```javascript
const config = await Read({ path: 'package.json' });
// Next call: $.config is available

function extractVersions(pkg) { return Object.keys(pkg.dependencies || {}); }
// Next call: $.extractVersions() is available
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
session.squash();                    // two-phase context compaction (see below)
```

### Context management — two-phase squash

When context fills up, model quality degrades. Use `session.squash()` — a two-phase compaction that lets you review before committing.

```javascript
// Phase 1 — build outline, stash for review (no compaction yet)
session.squash();
// $.preCompact = { outline, messageCount }

// Review and preserve thick context in $
$.ctx = `AUTH REFACTOR — mid-stream
Done: JWT signing works, login/logout updated
Gotcha: refreshTokens.token_hash — NOT token — wasted 20 min on this
Next: Write rotation logic at src/auth.ts:142`;

// Phase 2 — apply compaction + auto-continue
session.squash({ continue: "Squash done. Continue at src/auth.ts:142." });
// Agent automatically picks up where it left off
```

`$` and `session.save()` survive compaction. Write thick narrative context — gotchas, dead ends, line numbers — not shallow metadata.

## Available sandbox functions

All of these are available inside `execute_code` as typed async functions:

| Function | Description |
|----------|-------------|
| `Bash({ command, cwd?, timeout? })` | Execute shell commands (git-safety guards apply — shows confirm dialog for destructive git ops) |
| `Read({ path, offset?, limit? })` | Read file contents |
| `Write({ path, content })` | Write/create files |
| `Edit({ path, edits: [{oldText, newText}] })` | Precise text replacement |
| `Glob({ pattern, path? })` | Find files by glob |
| `rg({ args })` | Run ripgrep search |
| `fd({ args })` | Find files with fd |
| `WebFetch({ url, format?, timeout? })` | Fetch URL content |
| `sleep(ms)` | Pause execution |
| `man(name)` | Get help for any sandbox function |
| `readImage({ path })` | Read image files (png, jpg, gif, webp) |
| `mai({ args? })` | Run mai CLI commands |
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

### Passthrough wrappers

These call the registered tools directly from inside the sandbox:

`meshTell`, `meshAsk`, `meshPeers`, `meshView`, `meshChat`, `meshBroadcast`, `meshReply`, `meshJoinChannel`, `meshLeaveChannel`, `editorOpen`, `editorHighlight`, `editorReveal`, `editorState`, `gitAi`, `hotseatHandbookUpdate`, `hotseatHandbookRead`

## Escape hatch

If the sandbox restriction is too limiting for a specific task:

- `/escape_code_mode` — restores all tools for direct LLM access
- `/code_mode` — re-enables sandbox mode

The LLM can also toggle escape mode programmatically by setting `$.__escaped = true`.

## Execution model

Code runs in a **persistent** Node.js `vm.Context` — the context object (including `$`, console overrides, and timer bindings) is created once per session and reused for every `execute_code` call. Tool bindings are refreshed on each call (in case `cwd` changed), but state on `$` carries over.

The execution flow has three layers:

1. **Syntax pre-validation** — code is parsed before touching `$`. Syntax errors produce a clear message without affecting stored state.
2. **Fault-tolerant execution** — code runs in a try/catch. Errors are caught, partial output is preserved, and a recovery hint tells the agent which `$` variables survived.
3. **Context management** — after execution, if context usage is ≥30%, a footer shows the percentage and cost. At ≥40%, it warns the agent to distill and trim.

## Tool exclusivity

When code-mode is active, these tools are **sandbox-only** (blocked from direct LLM calls):

bash, read, write, edit, grep, find, ls, apply_patch, hash_read, hash_edit, web_search_brave, code_search_brave, context7_resolve, context7_docs, recall, memory_*, fff_*, WebFetch, get_current_time, tldr_*

These remain as **direct LLM tools**: execute_code, apply_patch, teams, context_*, start_supervision, init/run/log_experiment, editor_*, mesh_*, git-ai, hotseat_*, bash_bg_*

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
