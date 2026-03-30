# Worker Lifecycle: From Spawn to Completion

This document describes the full lifecycle of a worker agent in the pi teams extension, covering all state transitions and ticket interactions.

## Overview

A **worker** is a headless pi agent process spawned by the **leader** (the interactive pi session). Each worker is assigned a ticket, works autonomously in its own worktree, and communicates progress through ticket notes. The leader polls workers and reacts to state changes.

## Lifecycle Phases

### 1. Delegation (Leader Side)

When the leader's `teams` tool receives a `delegate` action:

1. **Create ticket** — `mai ticket <task> -d <task> -l team -a <workerName>`
2. **Start ticket** — `mai start <ticketId>` (moves ticket to `in_progress`)
3. **Resolve repo root** — `git rev-parse --git-common-dir` to find the real repo toplevel (prevents nested worktrees when the coordinator is itself in a worktree)
4. **Create worktree** (if `useWorktree: true`) — `git worktree add <toplevel>/.worktrees/teams/<workerName> -b teams/<workerName>/<ticketId> <baseRef>` where `baseRef` defaults to `HEAD` but can be set explicitly by the coordinator to a branch name, SHA, or tag
5. **Spawn process** — `pi --non-interactive --session-dir <sessionDir> -p <prompt>`

> **Why `baseRef` matters:** When the coordinator is working in a worktree (e.g., `.worktrees/cleanroom` on branch `cleanroom`), `ctx.cwd` still points to wherever `pi` was launched — typically the repo root on `main`. Without an explicit `baseRef`, workers branch from `main` instead of the coordinator's working branch. Their changes then can't be merged back. Always pass `baseRef` when coordinating from inside a worktree.

The worker process receives its assignment via environment variables:
- `PI_TEAMS_WORKER=1` — identifies the process as a worker
- `PI_TEAMS_TICKET_ID=<ticketId>` — the assigned ticket
- `PI_TEAMS_WORKER_NAME=<name>` — the worker's name
- `PI_TEAMS_LEADER_SESSION=<path>` — path to leader's session file
- `PI_TEAMS_HAS_TOOLS=1` — (optional) gives the worker the teams tool for sub-delegation

### 2. Worker Initialization

On startup (`index.ts`), the extension detects `PI_TEAMS_WORKER=1` and calls `runWorker()` instead of the leader setup. This:

1. Registers a **`team_comment`** tool so the LLM can post notes to its ticket via `mai add-note <ticketId> <message>`
2. Registers worker lifecycle hooks (`agent_start`, `turn_start`, `tool_call`, `tool_result`, `turn_end`, `agent_end`) that append **heartbeat entries** to the worker session file
3. Starts a periodic heartbeat tick (default 5s, env `PI_TEAMS_WORKER_HEARTBEAT_MS`) to keep liveness explicit even during long model waits
4. Registers an **`agent_end`** hook that auto-closes the ticket for normal workers: `mai add-note <ticketId> "DONE: Task completed."` then `mai close <ticketId>`
5. For worker-leaders (`hasTools: true`), ticket close is deferred until `session_shutdown` so the process stays alive until sub-workers finish

#### Worker-Leaders (hasTools)

If the worker was spawned with `hasTools: true` (env `PI_TEAMS_HAS_TOOLS=1`), it also registers as a leader after the normal worker setup. This means it gets:

- The `teams` tool for delegating sub-workers
- Its own `TeamLeader` instance for managing sub-workers
- `session_start`/`session_shutdown` hooks for sub-worker lifecycle

**Constraints for worker-leaders:**
- Sub-workers always share the parent's working directory (`useWorktree` is forced to `false`). Nested worktrees off a worktree cause git confusion.
- Worker-leaders wait for all sub-workers to finish before the session is allowed to shut down.
- Cleanup cascades: once a worker-leader is actually shutting down, its `session_shutdown` fires `leader.killAll()`, killing any still-running sub-workers.
- Worker-leaders do NOT get the `/team` command (they're non-interactive).

### 3. Worker Execution

The worker receives a system prompt instructing it to:
1. Read its ticket (`mai show <ticketId>`)
2. Do the work described
3. Comment progress (`mai add-note <ticketId> "progress..."`)
4. Close on completion (`mai add-note <ticketId> "DONE: <summary>"` + `mai close <ticketId>`)
5. Report blockers (`mai add-note <ticketId> "BLOCKED: <reason>"`)

### 4. Leader Monitoring

The leader uses the **activity monitor loop** (default 5s, env `PI_TEAMS_ACTIVITY_POLL_MS`) to sample worker process trees, poll `mai --json show`, and read session-file heartbeat/output timestamps.

For each non-terminal worker, the activity loop:

1. Polls `mai --json show <ticketId>` to read durable ticket status and new notes
2. Samples process tree activity (`ps`) to detect active child commands (e.g., `cargo`, `rustc`, `npm test`)
3. Tracks latest worker heartbeat/output timestamp from the worker session file (heartbeat entries + normal session output)
4. Evaluates stuck state using a dual condition:
   - no worker heartbeat/output activity for `PI_TEAMS_STUCK_THRESHOLD_MS`
   - and no active child process activity for the same window
5. Emits `stuck` warnings with cooldown `PI_TEAMS_STUCK_WARNING_COOLDOWN_MS`

### 5. State Transitions

Workers have the following statuses:

```
spawning → running → done
                  → failed
                  → killed
```

| Current    | Condition                          | Next      |
|------------|-------------------------------------|-----------|
| `spawning` | Process alive, ticket open          | `running` |
| `running`  | Ticket closed/done                  | `done`    |
| `running`  | Process dead + exit code 0 and ticket closed | `done`    |
| `running`  | Process dead + non-zero exit        | `failed`  |
| `running`  | `kill` action from leader           | `killed`  |
| `running`  | No heartbeat **and** no child-process activity for configured timeout | emits `stuck` event (stays `running`) |

Terminal states (`done`, `failed`, `killed`) are absorbing — no further transitions occur.

**Special case: process exits but ticket still open.** The leader closes the ticket on the worker's behalf, then marks the worker `done` (exit code 0) or `failed` (non-zero).

### 6. Poll Events

Each monitoring cycle can emit these events:

| Event       | Trigger                                  | Leader Action                        |
|-------------|------------------------------------------|--------------------------------------|
| `completed` | Ticket transitions to closed/done        | Notifies LLM, cleans up worker       |
| `failed`    | Process dies unexpectedly                | Notifies LLM, cleans up worker       |
| `comment`   | New ticket notes since last seen         | Forwards to LLM (if `showComments`)  |
| `stuck`     | No note/session heartbeat **and** no active child process for > `STUCK_THRESHOLD_MS` | Warns LLM (display-only, no auto turn trigger) |
| `alive`     | Worker is healthy                        | (informational only)                 |

On `completed` or `failed`, the leader also sends a `sendUserMessage` follow-up to reactivate the agent for orchestration.

### 7. Cleanup

When a worker reaches a terminal state, `cleanupWorker()` runs:

1. **Kill process** — SIGTERM, then SIGKILL after 5s if still alive
2. **Remove worktree** — `git worktree remove <path> --force` + `git branch -D <branch>`
3. **Remove session directory** — unless `PI_TEAMS_KEEP_WORKER_SESSIONS=1`

### 8. Session Shutdown

On `session_shutdown`, the leader stops activity monitors and kills all remaining workers (`killAll`), triggering full cleanup for each.

## Ticket Interaction Summary

| Actor   | Operation                             | When                          |
|---------|---------------------------------------|-------------------------------|
| Leader  | `mai ticket ... --type <type> -l team[,role-tags] -a <name>` | Delegation (type based on template: review/oracle/investigate → artifact, others → task) |
| Leader  | `mai start <id>`                       | Delegation                    |
| Worker  | `mai show <id>`                        | On startup (reads assignment) |
| Worker  | `mai add-note <id> "progress"`         | During execution              |
| Worker  | `mai add-note <id> "DONE: ..."`        | On completion                 |
| Worker  | `mai close <id>`                       | On completion                 |
| Leader  | `mai --json show <id>`                 | On ticket change and worker exit reconciliation |
| Leader  | `mai close <id>`                       | If worker dies without closing |

## Sequence Diagram

```
Leader                          Worker Process              Ticket System
  │                                                              │
  ├─ mai ticket + mai start ───────────────────────────────────►│ status: in_progress
  ├─ spawn pi --non-interactive ──►│                             │
  │                                │                             │
  │                                ├─ mai show ─────────────────►│ (read assignment)
  │                                ├─ (does work)                │
  │                                ├─ mai add-note "progress" ──►│ (note added)
  │                                │                             │
  ├─ ticket watch: mai --json show ──────────────────────────►│ (reads notes)
  ├─ (emits comment event to LLM) │                             │
  │                                │                             │
  │                                ├─ mai add-note "DONE:..." ──►│ (note added)
  │                                ├─ mai close ────────────────►│ status: closed
  │                                ├─ (process exits)            │
  │                                                              │
  ├─ worker exit: mai --json show ────────────────────────────►│ (sees closed)
  ├─ (emits completed event)       │                             │
  ├─ cleanup (worktree, session)   │                             │
  │                                                              │
```
