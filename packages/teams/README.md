# @pi-extensions/teams

Multi-agent orchestration for pi — spawn worker agents, delegate tasks, and coordinate complex work across parallel sessions.

The coordinator (your main pi session) creates tickets, spawns workers as separate pi processes, and manages their lifecycle end-to-end. Workers report back via mesh channels and ticket comments.

## Features

- **Task delegation** — spawn one or many workers from a single `teams` tool call
- **Git worktree isolation** — each worker gets its own branch and filesystem (default)
- **Template system** — predefined worker profiles (review, oracle, fix, implementer) from `~/.pi/agent/team-templates.json`
- **Per-worker model selection** — assign different LLMs to different workers
- **Persistent workers** — keep workers alive for interactive sessions, tag-teaming, and monitoring
- **Sub-delegation** — workers can spawn their own sub-workers when given `hasTools: true`
- **Lifecycle management** — explicit terminal states via `team_finish` (done/quit)
- **Mesh-based communication** — workers coordinate with the leader via dedicated channels
- **Lease-based liveness** — coordinator health is tracked; workers detect stale leaders
- **Ticket integration** — automatic ticket creation with task descriptions, progress tracking via `team_comment`
- **Session strategy** — fork (default), fresh, or resume modes for worker sessions
- **Runtime widget** — real-time worker status display in the TUI
- **V2 protocol** — typed fact model with canonical state reduction (see [TEAMS_V2_ARCHITECTURE.md](./TEAMS_V2_ARCHITECTURE.md))

## How Delegation Works

```ts
// In your main pi session, use the teams tool:
await teams({
  action: "delegate",
  tasks: [
    {
      text: "Implement the user authentication module with JWT tokens",
      assignee: "auth-worker",
      model: "anthropic/claude-sonnet-4-6"
    },
    {
      text: "Write integration tests for the payment service",
      assignee: "test-worker",
      model: "openai-codex/gpt-5.4"
    }
  ],
  useWorktree: true,
  baseRef: "main"
});
```

Each task creates:
1. A **mai ticket** with the task description
2. A **pi session** running as a separate process
3. A **git worktree** (when `useWorktree: true`) branched from `baseRef`
4. A **mesh channel** for leader↔worker communication

## Worker Lifecycle

Workers follow a strict lifecycle with explicit terminal states:

```
created → spawning → running → finishing → done
                                          → warning (ambiguous exit)
                                → killed
                                → failed (startup/init error)
                                → orphaned (leader died)
                                → resumable (recoverable)
```

See [WORKER_LIFECYCLE.md](./WORKER_LIFECYCLE.md) for full details.

### Key lifecycle rules

- **`team_finish(done)`** = authoritative success signal from the worker
- **`team_finish(quit)`** = intentional non-success
- **Ambiguous exit** after real work = `warning` (not done)
- **Startup failure** = `failed`
- Workers **never** close tickets themselves — the coordinator owns ticket lifecycle
- Workers **never** guess the coordinator's identity — it's injected at spawn time

## Session Strategies

| Mode | Description | Use Case |
|------|-------------|----------|
| `fork` | Copy of coordinator's session history | Default for delegated work — preserves context |
| `fresh` | Clean session with only the task prompt | Isolated utility tasks |
| `resume` | Reattach to an existing session file | Retry/recovery after crash |

## Templates

Templates define reusable worker profiles stored in `~/.pi/agent/team-templates.json`:

```json
{
  "review": {
    "model": "openai-codex/gpt-5.4",
    "worktree": false,
    "prompt": "You are a code reviewer. Follow the 6-pass review skill.",
    "freeform": false
  },
  "oracle": {
    "model": "anthropic/claude-opus-4-6",
    "worktree": false,
    "prompt": "You are a research oracle. Answer questions with deep analysis.",
    "freeform": false
  },
  "fix": {
    "model": "anthropic/claude-sonnet-4-6",
    "worktree": true,
    "prompt": "You are a fix agent. Fix all issues found in the code review.",
    "freeform": false
  }
}
```

Use templates when delegating:

```ts
await teams({
  action: "delegate",
  tasks: [
    { text: "Review src/auth.ts for security issues", template: "review" },
    { text: "Fix the auth issues found", template: "fix" },
    { text: "Research best practices for JWT rotation", template: "oracle" }
  ]
});
```

Explicit parameters (`model`, `useWorktree`) override template values.

## Worktree Isolation

When `useWorktree: true` (default), each worker operates in its own git worktree:

```
repo/
├── .worktrees/
│   ├── auth-worker-fe-1bn6/   ← worker's isolated branch
│   └── test-worker-fe-1bn7/   ← worker's isolated branch
├── .pi/sessions/teams-workers/
│   ├── team-auth-worker-fe-1bn6-.../  ← session files (repo root)
│   └── team-test-worker-fe-1bn7-.../
└── src/
```

Session files are always stored under the **repo root** (`.pi/sessions/teams-workers/`), not inside worktrees, so worktree cleanup never destroys session data.

When working from a worktree yourself, pass `baseRef` with your branch name so workers branch from the right commit.

## Tools

| Tool | Description |
|------|-------------|
| `teams` | Main orchestration tool (delegate, list, kill, tell, view) |
| `team_comment` | Post progress updates to the ticket (worker-side) |
| `team_finish` | Declare terminal state: `done` or `quit` (worker-side) |

## Teams Actions

| Action | Description |
|--------|-------------|
| `delegate` | Spawn workers with tasks |
| `list` | Show all active workers with status, model, ticket, and activity |
| `kill` | Kill a specific worker by name |
| `kill_all` | Kill all active workers |
| `tell` | Send a message to a specific worker |
| `tell_all` | Broadcast a message to all workers |
| `view` | Read recent session entries from a worker |

## Mesh Routing

Workers communicate with the coordinator via a dedicated mesh channel (not raw peer discovery). The coordinator's mesh ID is injected at spawn time, and workers use `team_comment` / `team_finish` tools — they never touch raw `mesh_tell` or `mesh_ask` directly.

The V2 protocol adds typed envelopes with `teamId`, `leaderEpoch`, and `workerId` for reliable, diagnosable coordination.

## V2 Architecture

The V2 rewrite introduces:

- **Protocol-driven design** — mesh is transport, not the user-facing API
- **Fact-based state reduction** — lifecycle derived from typed facts, not snapshots
- **Explicit epochs** — leader, worker, and attempt identities with version tracking
- **Receipt states** — sent → delivered → visible → handled
- **First-class attempts** — crash/retry history preserved per worker

See [TEAMS_V2_ARCHITECTURE.md](./TEAMS_V2_ARCHITECTURE.md) for the full design document.

## Setup

1. Install `@pi-extensions/pi-mesh` (mesh dependency)
2. Install `@pi-extensions/teams`
3. Ensure `mai` is available for ticket management
4. Delegate tasks from any pi session

## Dependencies

- **@pi-extensions/pi-mesh** — mesh transport for coordinator↔worker communication
- **@pi-extensions/shared** — shared utilities
- **@mariozechner/pi-coding-agent** ≥ 0.65.0
- **@mariozechner/pi-tui** — runtime widget rendering
- **mai CLI** — ticket management
