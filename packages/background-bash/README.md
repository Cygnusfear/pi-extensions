# @pi-extensions/background-bash

Run long-lived shell commands in the background without blocking the agent — start a dev server, run a test suite, or spin up a database, then check on it later while continuing other work.

The agent starts commands as **detached child processes** with log files on disk. Each job gets a unique ID (e.g. `bg-a3f2c1b7`). The agent can poll status, tail logs with offset/limit pagination, and stop jobs with configurable signals — all without waiting for the command to finish.

## Why background bash?

Without this, the agent has to wait for every command to complete before doing anything else. A 30-second test suite or a long-running dev server blocks the entire session. Background bash lets the agent fire-and-forget:

1. Start the dev server → get job ID instantly
2. Start the test suite → get job ID instantly
3. Check test results when ready → read logs
4. Continue editing code while servers run

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

### Start a background job

```typescript
// Via dedicated tool
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

### Check status

```typescript
const status = await bash_bg_status({ id: "bg-a3f2c1b7" });
// → { id: "bg-a3f2c1b7", status: "running", pid: 12345, runtime: "45s", cwd: "/path/to/project" }
```

### Read logs (paginated)

```typescript
// First page
const logs = await bash_bg_logs({ id: "bg-a3f2c1b7", limit: 50 });
// → { text: "1: Listening on port 3000\n2: ...", offset: 1, totalLines: 342, hasMore: true }

// Continue from where you left off
const more = await bash_bg_logs({ id: "bg-a3f2c1b7", offset: 51, limit: 50 });
```

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

- `@mariozechner/pi-coding-agent` — core extension API (`ExtensionAPI`, `truncateHead`, `formatSize`)
- `@sinclair/typebox` — parameter schema types

## Setup

No additional configuration required. Background bash tools are available immediately after installation.
 
 ### Sandbox functions (inside execute_code)
 
 These are also available as sandbox functions inside `execute_code`, using camelCase names:
 
 | Sandbox fn | Parameters | Description |
 |-----------|-----------|-------------|
 | `bashBgStart` | `{ command, cwd? }` | Start a background job, returns `{ id, pid, cwd, logPath, status }` |
 | `bashBgStatus` | `{ id }` | Get job status |
 | `bashBgLogs` | `{ id, offset?, limit? }` | Read paginated logs, returns `{ text, offset, nextOffset, totalLines, hasMore, status }` |
 | `bashBgStop` | `{ id, signal? }` | Stop a job |
 | `bashBgList` | *(none)* | List all jobs |
 
 ## Usage
