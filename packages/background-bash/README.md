# @pi-extensions/background-bash

Run long-lived shell commands in the background without blocking the agent — start a dev server, run a test suite, or spin up a database, then check on it later while continuing other work.

The agent starts commands as **detached child processes** with log files on disk. Each job gets a unique ID (e.g. `bg-a3f2c1b7`). The agent can poll status, tail logs with offset/limit pagination, and stop jobs with configurable signals — all without waiting for the command to finish.

## Why background bash?

Without this, the agent has to wait for every command to complete before doing anything else. A 30-second test suite or a long-running dev server blocks the entire session. Background bash lets the agent fire-and-forget:

1. Start the dev server → get job ID instantly
2. Start the test suite → get job ID instantly
3. Check test results when ready → read logs
4. Continue editing code while servers run

## When to use what (sandbox / code-mode)

| Command kind | Tool | Pattern |
|---|---|---|
| Quick, < 30s, exits | `Bash` | `await Bash({ command })` (30s default cap) |
| Medium, 30s–10min, exits | `bashBgStart` + deadline | `await bashBgStart({ command }).timeout(600_000)` |
| Long, eventually exits | `bashBgStart` + react | `bashBgStart({ command }).each(cb).then(r => console.wake(...))` |
| Never exits (dev, watcher, daemon) | `bashBgStart` no await | `const dev = bashBgStart({ command });` ... `await dev.stop()` |
| The WHOLE block is heavy (cold build + deploy + bounce) | `execute_code({ async: true })` | Returns jobId instantly; result delivers as a follow-up turn. TUI stays interactive. |

**Rules:**
- `execute_code` has no default timeout. `await Bash({ ..., timeout: 3600 })` freezes the TUI for an hour. `await bashBgStart({ command: "npm run dev" })` freezes the TUI forever (handle is thenable, waits for child exit, dev server never exits). If a command might run longer than 30s or might never exit, use `bashBgStart` with `.timeout(ms)` or `.then(cb)` — never a bare await.
- If the WHOLE block is long (cold cargo build + spacetime publish + bounce), the right shape isn't `bashBgStart` per command — it's `execute_code({ async: true })` for the whole block. The tool returns instantly; the work runs in the background; the result delivers as a follow-up turn. Inspect or kill in-flight async jobs with the direct tools `execute_code_async_list` / `execute_code_async_kill`.

## Features

- **Detached processes** — commands run via `spawn("sh", ["-c", cmd], { detached: true })` so they survive even if the agent crashes
- **Fire-and-forget** — `bash_bg_start` returns immediately with a job ID and PID
- **Log file persistence** — stdout/stderr are written to temp files on disk, not held in memory
- **Paginated log reading** — `bash_bg_logs` supports offset/limit for reading large outputs (default 200 lines, max 2000)
- **Process group signaling** — stop sends signals to the process group (`kill(-pid, signal)`) so child processes are cleaned up too
- **Foreground fallback** — the unified `bash` tool supports both foreground (`action="run"`) and background modes in a single tool
- **Status polling** — real-time process alive checks via `process.kill(pid, 0)`
- **Smart output formatting** — foreground output is truncated intelligently (by lines and bytes), with full output saved to a temp file when truncated

## Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `bash` | `command, timeout?, action?, background?, id?, signal?, cwd?` | Unified bash tool — foreground run or background lifecycle management |
| `bash_bg_start` | `command, cwd?` | Start a command in the background, returns job ID |
| `bash_bg_status` | `id` | Get status of a background job (running/exited/stopped) |
| `bash_bg_logs` | `id, offset?, limit?` | Read logs from a background job (paginated) |
| `bash_bg_stop` | `id, signal?` | Stop a background job (SIGTERM or SIGKILL) |
| `bash_bg_list` | *(none)* | List all background jobs in this session |

## Usage

> **Note:** Examples below use snake_case tool names (`bash_bg_start`). Inside `execute_code`, use camelCase (`bashBgStart`).

### Start a background job (direct tool — for the LLM tool surface)

```typescript
const result = await bash_bg_start({
  command: "npm run dev",
  cwd: "/path/to/project"
});
// → { id: "bg-a3f2c1b7", pid: 12345, status: "running", logPath: "/tmp/pi-bg-bg-a3f2c1b7.log" }
```

```typescript
// Via unified bash tool
const result = await bash({
  command: "cargo test --no-run",
  background: true,
  cwd: "/path/to/project"
});
```

### Sandbox: `bashBgStart` returns a thenable handle

Inside `execute_code`, `bashBgStart` returns a **`BashBgHandle`** synchronously. Properties (`id`, `pid`, `cwd`, `logPath`, `status`) are populated immediately as live getters. The handle is **thenable** — `await handle` / `.then(cb)` resolves on child exit (or timeout / abort). Chain setters `.each` and `.timeout` return `this` so the fluent API composes.

```typescript
// Wait for exit with a deadline. .timeout is a chainable setter; the await
// triggers the actual wait. Resolves with status: "exited" | "stopped" |
// "timeout" | "aborted". Never rejects.
const result = await bashBgStart({ command: "cargo check ..." }).timeout(300_000);
if (result.status === "exited" && result.exitCode === 0) { /* green */ }

// Fire-and-react: attach .then for completion without awaiting. This is
// the canonical long-running shape.
bashBgStart({ command: "cargo build" })
  .each((line, stream) => console.log(`[${stream}]`, line))
  .then(result => console.wake(`done: exit=${result.exitCode}`));

// Truly fire-and-forget for a long-lived process — just don't await.
const dev = bashBgStart({ command: "npm run dev" });
console.log("dev pid:", dev.pid, "status:", dev.status);
// ...later
await dev.stop();
```

#### Footgun

`await bashBgStart({ command: "npm run dev" })` **blocks until the dev server exits**, which is never. `await` on a thenable means "wait for it to resolve"; the handle resolves on child exit. Don't `await` long-running processes — attach `.then(cb)` for completion, or just call `.stop()` when you're done.

#### Backward-compat note

`bashBgStart` was previously `async` resolving to `{ id, pid, cwd, logPath, status }`. It is now **synchronous** and returns a thenable Handle that exposes those same fields as own properties / live getters. Destructure-style usage keeps working:

- `const { id, pid } = await bashBgStart(...)` — **changes semantics**. The await now waits for child exit and resolves to `BashBgResult` (which still has `{ id, pid }`). For fast-exiting commands, behaves the same. For never-exiting commands, hangs (see footgun above). Recommended migration: drop the await.
- `job.status === "running"` — works on either the handle (live string getter) or on the resolved BashBgResult (final status).

`bashBgStatus` / `bashBgLogs` / `bashBgStop` / `bashBgList` are unchanged and still accept either `{ id }` or the handle directly.

### Check status

```typescript
const status = await bash_bg_status({ id: "bg-a3f2c1b7" });
// → { id: "bg-a3f2c1b7", status: "running", pid: 12345, runtime: "45s", cwd: "/path/to/project" }
```

```typescript
// Sandbox helpers also accept the job object returned by bashBgStart()
const job = await bashBgStart({ command: "npm run dev" });
const status = await bashBgStatus(job);
const logs = await bashBgLogs({ id: job, limit: 50 });
await bashBgStop({ id: job, signal: "SIGTERM" });
```

### Read logs (paginated)

```typescript
// First page
const logs = await bash_bg_logs({ id: "bg-a3f2c1b7", limit: 50 });
// → { text: "1: Listening on port 3000\n2: ...", offset: 1, totalLines: 342, hasMore: true }

// Continue from where you left off
const more = await bash_bg_logs({ id: "bg-a3f2c1b7", offset: 51, limit: 50 });
```

Log pages default to 50 lines, accept at most 250, and cap returned log text at
8KiB independently of any outer tool-result cap. The result reports
`truncated`, `clippedLines`, `responseBytes`, and `logPath`; when a line is
clipped, inspect the durable `logPath` deliberately rather than dumping the
complete log into the agent turn.

### Stop a job

```typescript
// Graceful stop
await bash_bg_stop({ id: "bg-a3f2c1b7", signal: "SIGTERM" });

// Force kill
await bash_bg_stop({ id: "bg-a3f2c1b7", signal: "SIGKILL" });
```

### Foreground execution (via unified tool)

```typescript
const result = await bash({
  command: "npm test",
  timeout: 60,
  cwd: "/path/to/project"
});
// Waits for completion, returns stdout+stderr
```

### List all jobs

```typescript
const jobs = await bash_bg_list();
// → sorted by start time (newest first)
```

## Architecture

### BackgroundBashManager

The core class manages all jobs in two maps:

- `jobs: Map<string, BackgroundBashJob>` — job metadata (id, command, pid, status, timestamps)
- `children: Map<string, ChildProcess>` — active child process references

Jobs are spawned as detached processes with stdout/stderr redirected to log files. The manager listens for `exit` events to update status automatically.

### Process lifecycle

1. `start()` validates the command and working directory, creates the log file, spawns the process, and returns the job
2. `refreshJob()` checks if a "running" job is actually still alive via `process.kill(pid, 0)`
3. `stop()` sends the configured signal to the **process group** (`-pid`), ensuring child processes are also signaled
4. Exit events update status to "exited" (clean exit) or "stopped" (killed by signal)

### Output formatting

Foreground output uses `truncateHead()` from the core agent library — it truncates by both line count and byte size, and saves the full output to a temp file when truncated.

## Log format

Each log line is prefixed with its line number:

```
1: > my-project@1.0.0 dev
2: > vite
3:
4: VITE v5.0.0 ready in 234ms
5:
6: ➜ Local: http://localhost:5173/
```

## Job ID format

IDs are randomly generated: `bg-` + 8 hex characters (e.g. `bg-a3f2c1b7`).

## Dependencies

- `@earendil-works/pi-coding-agent` — core extension API (`ExtensionAPI`, `truncateHead`, `formatSize`)
- `@sinclair/typebox` — parameter schema types

## Setup

No additional configuration required. Background bash tools are available immediately after installation.
 
 ### Sandbox functions (inside execute_code)
 
 These are also available as sandbox functions inside `execute_code`, using camelCase names:
 
 | Sandbox fn | Parameters | Description |
 |-----------|-----------|-------------|
| `bashBgStart` | `{ command, cwd? }` | Start a background job. Returns a **thenable `BashBgHandle`** SYNCHRONOUSLY. `await handle` / `.then(cb)` resolves on child exit. Chain `.each(line => ...)` / `.timeout(ms)` (both return `this`). `{ id, pid, cwd, logPath, status }` available as own getters. Footgun: don't await dev servers — they don't exit. |
| `bashBgStatus` | `jobId` or `{ id }` | Get job status |
| `bashBgLogs` | `{ id: jobIdOrJob, offset?, limit? }` | Read a byte-bounded, paginated log preview; returns `{ text, offset, nextOffset, totalLines, hasMore, status, logPath, responseBytes, truncated, clippedLines }` |
| `bashBgStop` | `{ id: jobIdOrJob, signal? }` | Stop a job |
| `bashBgList` | *(none)* | List all jobs |
 
 ## Usage
