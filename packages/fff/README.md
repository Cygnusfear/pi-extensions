# @pi-extensions/fff

Frecency-ranked file search — find files by name and search file contents with results sorted by how recently and frequently you've accessed them, not just alphabetically.

Built on `@ff-labs/fff-bun`, a Rust-native fuzzy finder. Communicates with the native library through a **subprocess** to keep 10+ Rust worker threads and notify-rs file-watcher threads out of the pi process's address space.

## Why frecency matters

A naive search for `config` in a 10,000-file project returns every file with "config" in the name, sorted alphabetically. You get `node_modules/.cache/vite/config.ts` before `src/config.ts`.

Frecency ranking (frequency + recency) puts the files you actually work with at the top. Open `src/config.ts` a few times and it permanently floats above the noise. This saves the agent (and the human) from scanning through irrelevant results.

## Features

- **Fuzzy file search** — `fff_find` matches file names with fuzzy matching. Supports path prefixes (`src/`) and glob constraints (`*.{ts,tsx} !test/`).
- **Content search** — `fff_grep` searches file contents with frecency-ranked results. Default mode is plain text (bare identifiers only), with optional regex and fuzzy modes.
- **Multi-pattern search** — `fff_multi_grep` searches for multiple patterns (OR logic) in one call. Faster than sequential greps.
- **Subprocess isolation** — the native Rust library runs in a separate Bun process. Pi's main process stays clean.
- **Auto-shutdown** — the subprocess exits after 5 minutes of inactivity. Restarted automatically on next query.
- **Graceful fallback** — if the server can't start, tools return clear errors so agents fall back to `rg`/ `fd`.

## Tools

| Tool | Description |
|------|-------------|
| `fff_find` | Fuzzy file search by name with frecency ranking |
| `fff_grep` | Content search with frecency-ranked results |
| `fff_multi_grep` | Multi-pattern OR-logic content search |

### fff_find

Searches **file names**, not file contents. Keep queries short — 1-2 terms.

```typescript
// Basic search
const result = await fffFind({ query: 'config', cwd: '/project' });
// -> src/config.ts (best match)
// -> src/config/default.ts
// -> packages/shared/config.ts

// With path prefix and glob constraints
const result = await fffFind({
  query: 'src/ *.test.ts handler',
  maxResults: 10,
  cwd: '/project'
});
```

Multiple words narrow results (AND logic), not OR.

### fff_grep

Searches **file contents**. Use bare identifiers (e.g. `InProgressQuote`, `ActorAuth`), not code syntax.

Supports inline constraints in the query string:

```typescript
// Extension filter
await fffGrep({ query: '*.rs InProgressQuote', cwd: '/project' });

// Directory filter
await fffGrep({ query: 'src/ handleRequest', cwd: '/project' });

// Exclude directory
await fffGrep({ query: '!test/ InProgressQuote', cwd: '/project' });

// With context lines
await fffGrep({ query: 'handleRequest', context: 3, cwd: '/project' });

// Regex mode (when you truly need patterns)
await fffGrep({ query: 'handle(Request|Response)', mode: 'regex', cwd: '/project' });
```

Results are ranked by frecency — files you edit more often appear higher.

### fff_multi_grep

Search for multiple patterns at once (OR logic). Faster than sequential greps because it's a single pass through the index.

```typescript
// Find all naming variants of a concept
await fffMultiGrep({
  patterns: ['ActorAuth', 'actor_auth', 'ACTOR_AUTH'],
  constraints: '*.ts',
  cwd: '/project'
});
```

Patterns are escaped as literal text — no regex escaping needed.

## Subprocess architecture

### Why a subprocess?

The `@ff-labs/fff-bun` native library spawns 10+ Rust worker threads for parallel file scanning and a notify-rs file watcher thread for live reindexing. Loading this directly into pi's process would:

- Compete with pi's event loop for CPU time
- Make crash isolation impossible (a native crash takes down all of pi)
- Prevent clean shutdown of the watcher threads

The subprocess design isolates all of this.

### Communication protocol

The extension and server communicate over stdin/stdout using **JSON lines**:

```
-> {"id":1,"method":"init","params":{"basePath":"/project","aiMode":true}}
<- {"id":1,"ok":true}

-> {"id":2,"method":"search","params":{"query":"config","options":{"pageSize":20}}}
<- {"id":2,"ok":true,"value":{"items":[...],"totalMatched":42,"totalFiles":1200}}
```

### Lifecycle

1. **Lazy start** — the server process starts on first query (via `ensureInit()`)
2. **Project-aware** — if the cwd changes to a different project root, the old index is destroyed and a new one is initialized
3. **Idle shutdown** — the server auto-exits after 5 minutes of inactivity (reset on each query)
4. **Clean teardown** — `session_shutdown` kills the server process

### RPC implementation

Each request gets a unique numeric ID and a 10-second timeout. The client writes JSON to the server's stdin, then waits for a matching response ID on stdout. On timeout, the request resolves with `{ ok: false, error: "rpc timeout" }` rather than hanging.

## Output format

### File search results

```
-> src/config.ts (exact match)
3/12 matches shown
src/config.ts
src/config/default.ts
packages/shared/config.ts [M]
```

Git status badges (`[M]`, `[A]`, `[?]`) are shown for dirty files.

### Content search results

```
src/auth/actor.ts
23:export class ActorAuth {
24:  constructor(private token: string) {

src/routes/actor.ts
15:const auth = new ActorAuth(req.headers.authorization);

(7 total matches, showing first 4)
```

With context lines enabled:

```
src/auth/actor.ts
20-// Authentication middleware
21-@injectable()
22:export class ActorAuth {
23-  constructor(private token: string) {
24-    this.validate();
25-  }
26-
```

## Files

| File | Purpose |
|------|---------|
| `extensions/fff.ts` | Extension entry point, RPC client, tool registration, output formatting |
| `server/fff-server.ts` | Standalone Bun subprocess that loads `@ff-labs/fff-bun` via FFI |

## Dependencies

- `@ff-labs/fff-bun` — Rust-native fuzzy finder (loaded via FFI in the subprocess)
- `@earendil-works/pi-coding-agent` — core extension API
- `@earendil-works/pi-tui` — TUI rendering for tool call/result display
- `@sinclair/typebox` — parameter schema types
- `bun` runtime — required for FFI access to the native library

## Setup

Requires Bun runtime (for native FFI support). The native library (`libfff_c.dylib` / `libfff_c.so`) must be available to the subprocess. If the server can't start (missing native lib, wrong platform), tools gracefully degrade — they register but return clear errors directing agents to fall back to `rg`/ `fd`.
