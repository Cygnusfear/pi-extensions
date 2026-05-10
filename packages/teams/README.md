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
      template: "implementer"  // model resolved via model-router from team-templates.json
    },
    {
      text: "Write integration tests for the payment service",
      assignee: "test-worker",
      template: "implementer"
    }
  ],
  useWorktree: true,
  baseRef: "main"
});

// You can still pin a specific model to override the role's resolution:
//   { ..., model: "anthropic/claude-sonnet-4-7" }
// The router never overrides explicit pins.
```

Each task creates:
1. A **mai instruction ticket** with the task description, tagged `team,agent-instruction`
2. A **pi session** running as a separate process
3. A **git worktree** (when `useWorktree: true`) branched from `baseRef`
4. A **mesh channel** for leader↔worker communication

Teams-created tickets are worker assignment records, not result artifacts. A review worker's assignment ticket is tagged `agent-instruction`; the review worker creates a separate `mai review` ticket tagged `review` for the actual review output. The same separation applies to oracle, research, and audit workers: the instruction ticket follows Teams lifecycle, while the produced artifact stays available for downstream use.

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
- **Long markdown/code-heavy worker notes should be file-backed** (write a file, then use `team_comment { filePath }`)
- **Committed worker results should include a Maiboard review handoff link**. Use `mai.reviewLink({ commits, ticket, branch, worktree })` with commits ordered oldest-to-newest, then include `review.vscodeLink` or `review.link` in the worker's final `team_finish` summary.
- **Startup failure** = `failed`
- Workers **never** close tickets themselves — the coordinator owns ticket lifecycle
- Workers **never** guess the coordinator's identity — it's injected at spawn time

### Review handoff links for completed work

When a worker commits changes that need review, create a short Maiboard link before `team_finish(done)`. Use code-mode to create the link, then include it in the direct `team_finish` tool summary. Do not paste a long commit list as the only review handoff.

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
  worker: "auth-worker",
});

console.log("Review link:", review.vscodeLink);
```

The link is short because the full payload lives in `~/.maitake/review-handoffs/<token>.json`. Maiboard resolves the token, opens the right worktree, and loads the exact ordered commit set.

## Session Strategies

| Mode | Description | Use Case |
|------|-------------|----------|
| `fork` | Copy of coordinator's session history | Default for delegated work — preserves context |
| `fresh` | Clean session with only the task prompt | Isolated utility tasks |
| `resume` | Reattach to an existing session file | Retry/recovery after crash |

## Templates

Templates define reusable worker profiles stored in `~/.pi/agent/team-templates.json`. Each template's `model` can be a single ID or an ordered preference list — the model-router walks the list, filters by availability and health, and picks the first match (deduping providers for DEI).

```json
{
  "review": {
    "model": [
      "anthropic/claude-opus-4-7",
      "openai-codex/gpt-5.5",
      "zai-coding/glm-5.1"
    ],
    "worktree": false,
    "prompt": "You are a code reviewer. Follow the 6-pass review skill.",
    "freeform": false
  },
  "oracle": {
    "model": "anthropic/claude-opus-4-7",
    "worktree": false,
    "prompt": "You are a research oracle. Answer questions with deep analysis.",
    "freeform": false
  },
  "fix": {
    "model": [
      "zai-coding/glm-5.1",
      "openai-codex/gpt-5.4",
      "anthropic/claude-opus-4-7"
    ],
    "worktree": true,
    "prompt": "You are a fix agent. Fix all issues found in the code review.",
    "freeform": false
  }
}
```

The router never reorders — your literal sequence is the contract. See `packages/model-router/README.md` for the full algorithm and the `modelRouter` code-mode API.

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

## Event Subscriptions — `teams.on(...)`

Coordinators wait for worker lifecycle events using `teams.on(...)`, a typed, thenable subscription over the leader's `PollEvent` stream. **No polling, no `sleep()`, no bespoke wake machinery** — it rides the same event pipeline the leader uses for notifyLLM.

### Basic usage

```javascript
// One-shot await — resolves on the first match, auto-unsubscribes
const event = await teams.on("fixer", "completed").timeout(600_000);
console.log("fixer done:", event.result);

// Background wake — fire a coordinator turn when the event arrives,
// even after the enclosing execute_code block has returned
teams.on("fixer", "completed")
  .preventDefault()
  .then(e => console.wake(`fixer done: ${e.result.slice(0, 500)}`));

// Streaming — react to every matching event until unsubscribed
const sub = teams.on({ name: "oracle", type: "comment" }).each(e => {
  console.log("oracle note:", e.comment.slice(0, 200));
});
// later: sub.unsubscribe();

// Race — whichever worker finishes first wins
const first = await Promise.race([
  teams.on("impl", "completed").preventDefault(),
  teams.on("review", "completed").preventDefault(),
]);
```

### Filter shapes

| Form | Matches |
|------|---------|
| `teams.on("fixer")` | Any event from worker `"fixer"` |
| `teams.on("fixer", "completed")` | Only `completed` events from `"fixer"` |
| `teams.on({ name: "oracle", type: "comment" })` | Every comment from `"oracle"` |
| `teams.on({ name: "oracle", comment: /DONE:/ })` | Comment events whose body matches the regex |
| `teams.on({ name: "oracle", comment: "DONE:" })` | Comment events whose body contains the substring |
| `teams.on({ predicate: e => ... })` | Full predicate escape hatch |
| `teams.on({})` | Every event from every worker |

### Event types

```ts
type PollEvent =
  | { type: "completed"; worker: WorkerHandle; result: string }
  | { type: "turn_finished"; worker: WorkerHandle; result: string }
  | { type: "warning"; worker: WorkerHandle; reason: string }
  | { type: "failed"; worker: WorkerHandle; reason: string }
  | { type: "stuck"; worker: WorkerHandle; idleSeconds: number }
  | { type: "comment"; worker: WorkerHandle; comment: string }
  | { type: "alive"; worker: WorkerHandle };
```

### DOM-style chain API

`teams.on(...)` returns a `TeamsSubscription` that is thenable and chainable. It mirrors the DOM Event API:

| Method | Effect |
|--------|--------|
| `.each(cb)` | Streaming listener — fires on every matching event until unsubscribed |
| `.timeout(ms)` | Reject the promise if no matching event arrives within `ms` |
| `.preventDefault()` | Pre-register `preventDefault()` on every match — suppresses the leader's default batch notifyLLM so you don't get a duplicate team-event wake on top of your handler |
| `.stopPropagation()` | Pre-register `stopPropagation()` on every match — stops later subscription listeners from seeing the event |
| `.unsubscribe()` / `.cancel()` | Manually stop receiving events (idempotent) |
| `.then(onFulfilled, onRejected)` | Thenable — `await sub` resolves on the first match |

The resolved event exposes the same DOM methods on the wrapped event:

```ts
interface TeamsEvent extends PollEvent {
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;  // alias
  readonly defaultPrevented: boolean;
  readonly propagationStopped: boolean;
}
```

These must be called **synchronously** inside a handler callback (`.each` or the `.then` onFulfilled). Calling `preventDefault()` on an awaited value is a no-op — by the time your code resumes, the leader's dispatch loop has already decided whether to run the default action. Use the chain shortcut `.preventDefault()` for the "I'm awaiting and I want the default suppressed" case.

### Why `.preventDefault()`?

Without it, the leader's existing `notifyLLM` batch pipeline also fires on worker events, giving you a duplicate team-event wake on top of your own handler. That's usually not what you want if you're explicitly calling `console.wake()` yourself. Chaining `.preventDefault()` tells the leader "I'm handling this one, skip your default action." Exactly DOM semantics.

If you want BOTH your handler and the leader's batch notify to fire, simply omit `.preventDefault()`.

### Background wake pattern — the replacement for sleep-polling

```javascript
// Spawn workers — use templates so the model-router stays current
await teams.delegate([
  { text: "Implement the feature", assignee: "impl", template: "implementer" },
  { text: "Review the implementation", assignee: "review", template: "review" },
]);

await supervise(false); // don't burn context while idle

// Arm background subscriptions — coordinator goes idle, wakes when workers finish
teams.on("impl", "completed")
  .preventDefault()
  .timeout(30 * 60 * 1000)
  .then(
    e => console.wake(`impl done: ${e.result.slice(0, 500)}`),
    err => console.wake(`impl failed/timed out: ${err.message}`),
  );

teams.on("review", "completed")
  .preventDefault()
  .timeout(30 * 60 * 1000)
  .then(
    e => console.wake(`review done: ${e.result.slice(0, 500)}`),
    err => console.wake(`review failed/timed out: ${err.message}`),
  );

console.log("Workers spawned, subscriptions armed. Going idle.");
// Block returns here. Agent goes idle. Leader fires events as workers finish.
// Each .then() fires → console.wake() triggers a new coordinator turn.
```

### Rules

- **Always chain `.timeout(ms)`**. Silent hangs are worse than loud failures.
- **Chain `.preventDefault()`** if you're using `console.wake()` yourself — avoids duplicate leader batch wakes.
- **Use `console.wake()` inside `.then()` / `.each()` callbacks** to trigger a coordinator turn from a background event. `console.wake` is the single canonical wake primitive — do not reinvent it per-subscription.
- **Terminal state short-circuit**: if the target worker is already in the requested terminal state when you subscribe, the subscription resolves immediately via a synthesized event from the current `WorkerHandle`. No hangs.
- **Listener errors are isolated** — one throwing `.each()` callback cannot break the event pipeline for other subscribers.
- **Auto-unsubscribe** on first match (one-shot), timeout, or abort. Adding `.each()` switches to streaming mode, which keeps the subscription alive until `.unsubscribe()`.
- **Dispatch is DOM-compliant**: listeners are snapshotted before iteration, so a listener added mid-dispatch does NOT see the current event (only future ones). A listener that unsubscribes another listener mid-dispatch correctly blocks it from firing.

### Implementation

- [`packages/teams/subscription.ts`](./subscription.ts) — `TeamsSubscription` class, `wrapPollEvent`, `buildPredicate`
- [`packages/teams/leader.ts`](./leader.ts) — `subscribeToEvents` fan-out in `notifyLLM` with DOM-style dispatch loop (snapshot + still-registered check)
- [`packages/teams/test/subscription.test.ts`](./test/subscription.test.ts) — 40 unit tests
- [`packages/teams/test/subscription.round2.test.ts`](./test/subscription.round2.test.ts) — 24 adversarial tests (iteration safety, race conditions, fan-out integrity)

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
