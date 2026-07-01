# Teams v2 architecture plan

Status: draft planning doc for `pe-0umh`

## Why this exists

Teams v1 accumulated real fixes for lifecycle correctness:
- explicit `team_finish`
- `warning` terminal state
- session bloat reduction
- lease-based coordinator liveness
- attempt-aware crash reporting

But the human wants two deeper problems solved at the architecture level:

1. workers should not need raw peer discovery to find their coordinator
2. session-to-session / coordinator-to-worker messaging must be reliable, explicit, and diagnosable

This doc defines the target architecture before any rewrite.

---

## Non-negotiables

These are contract requirements, not optional design preferences.

### Worker lifecycle
- explicit terminal state is authoritative
- `team_finish(done)` = success
- `team_finish(quit)` = intentional non-success
- ambiguous exit after real work = `warning`
- startup / provider / init failure = `failed`
- `session_shutdown` never mutates ticket outcome
- diagnostics must preserve per-attempt truth

### Coordination
- workers do not use `mesh_peers` in the normal path
- workers do not invent transport envelopes ad hoc
- reload must not create duplicate leader ownership or ghost workers
- the leader is the only lifecycle reducer

### Session model
- worker session mode is explicit: `fresh`, `fork`, or `resume`
- session mode is persisted and never re-guessed heuristically
- `fork` is preferred for normal delegated work

### Messaging
- transport receipt and agent processing are separate states
- direct tells must be diagnosable as: sent, delivered, visible, handled
- busy sessions must support show-now / process-later semantics

---

## The core design shift

Mesh is a transport.

It is **not** the user-facing protocol.

Teams v2 should be a protocol-driven orchestration system that happens to use mesh underneath.

That means:
- no worker sees raw peer discovery in the normal path
- no worker decides between `mesh_tell` and `mesh_ask`
- no lifecycle state is derived from widget snapshots, tickets, or mesh payloads directly

Instead:
- the coordinator injects a runtime envelope at spawn time
- workers use only `team_*` tools
- the leader reduces typed facts into canonical worker state

---

## Identities

We need stable identities with explicit epochs.

```ts
type TeamId = string

type LeaderEpoch = string

type WorkerId = string

type AttemptId = string
```

### Meaning
- `teamId`: stable logical team run
- `leaderEpoch`: specific leader ownership instance; changes on reload / restart
- `workerId`: stable logical worker
- `attemptId`: one process attempt for one worker

This lets us distinguish:
- same worker, new attempt
- same team, new leader
- stale leader vs current leader

---

## Runtime envelope injected at spawn

Every worker is born with a fully specified runtime envelope.

```ts
type WorkerRuntimeEnvelope = {
  protocolVersion: 1
  teamId: TeamId
  leaderEpoch: LeaderEpoch
  workerId: WorkerId
  attemptId: AttemptId
  coordinatorSessionId: string
  coordinatorRoute: {
    kind: 'direct-session'
    sessionId: string
  }
  leasePath: string
  sessionMode:
    | { kind: 'fresh' }
    | { kind: 'fork'; parentSessionFile: string; parentLeafId: string }
    | { kind: 'resume'; sessionFile: string }
}
```

### Consequences
- workers never discover the coordinator dynamically
- workers never need the peer list for normal operation
- reload and recovery have explicit reattachment metadata

---

## Session strategy

### Default modes
- normal delegated workers: `fork`
- isolated utility workers: `fresh`
- retry / recovery attempts: `resume`

### Why `fork`
It is stronger than prompt-summary injection because it preserves:
- the real branch point
- the real message history
- prior tool evidence and decisions
- less prompt drift

### Rule
The session mode is part of worker state and attempt state. It is not recomputed from current circumstances.

---

## Source-of-truth boundaries

| Component | Responsibility |
|---|---|
| worker session file | local execution truth |
| leader runtime store | canonical orchestration truth |
| mesh | transient transport only |
| mai ticket | workflow artifact only |
| widget | projection only |
| worktree | filesystem isolation only |

This means:
- mesh messages are facts, not state
- tickets are not lifecycle truth
- widget snapshots are never lifecycle truth
- `session_shutdown` is never ticket outcome logic

---

## Attempts are first-class

```ts
type WorkerAttempt = {
  attemptId: AttemptId
  workerId: WorkerId
  leaderEpoch: LeaderEpoch
  pid?: number
  sessionDir: string
  sessionFile?: string
  startedAt: number
  endedAt?: number
  exitCode?: number | null
  spawnError?: string
  facts: WorkerFact[]
}
```

```ts
type WorkerRecord = {
  workerId: WorkerId
  desiredState: 'running' | 'stopped'
  currentAttemptId?: AttemptId
  attempts: WorkerAttempt[]
  lifecycle: WorkerLifecycleState
}
```

No respawn is allowed to overwrite the previous attempt’s evidence.

---

## Worker fact model

The reducer consumes facts.

```ts
type WorkerFact =
  | { type: 'spawn_requested'; at: number }
  | { type: 'spawn_started'; at: number; pid?: number }
  | { type: 'session_detected'; at: number; sessionFile: string }
  | { type: 'worker_hello'; at: number }
  | { type: 'comment_posted'; at: number; text: string }
  | { type: 'finish_done'; at: number; summary: string }
  | { type: 'finish_quit'; at: number; summary: string }
  | { type: 'process_exit'; at: number; exitCode: number | null }
  | { type: 'lease_stale'; at: number }
  | { type: 'leader_shutdown'; at: number }
  | { type: 'resume_attached'; at: number }
```

The worker lifecycle is reduced from these facts only.

---

## Lifecycle states

```ts
type WorkerLifecycleState =
  | 'created'
  | 'spawning'
  | 'running'
  | 'finishing'
  | 'done'
  | 'warning'
  | 'failed'
  | 'killed'
  | 'orphaned'
  | 'resumable'
```

### Rules
- only the leader reducer emits lifecycle transitions
- mesh listeners, session readers, and ticket adapters only emit raw facts
- result classification never depends primarily on “produced output” heuristics

---

## Mesh v2 protocol

Mesh needs explicit envelopes and receipt states.

```ts
type TeamEnvelope = {
  version: 1
  teamId: TeamId
  leaderEpoch: LeaderEpoch
  workerId?: WorkerId
  attemptId?: AttemptId
  from: 'leader' | 'worker'
  to: 'leader' | 'worker'
  seq: number
  correlationId?: string
  requiresAck?: boolean
  sentAt: number
  type:
    | 'worker.hello'
    | 'worker.comment'
    | 'worker.finish'
    | 'worker.heartbeat'
    | 'leader.ack'
    | 'leader.cancel'
    | 'leader.resume'
    | 'leader.shutdown'
  payload: unknown
}
```

### Explicit semantics per message type
Every protocol message must define:
- delivery mode: fire-and-forget vs request/reply
- ack requirement
- timeout
- retry behavior
- idempotency key
- ordering guarantee expectations

---

## Direct mesh reliability requirements

This is needed for both Teams and general session-to-session usage.

### Delivery states
For direct tells, we need to distinguish:
- `sent`: sender submitted to local mesh runtime
- `delivered`: target session extension received it
- `visible`: target session surfaced it to UI/session log
- `handled`: app-level acknowledgment, optional

### Busy-session behavior
We need a first-class delivery mode equivalent to:
- show now
- do not interrupt current run
- process on next safe turn

Current `followUp` is insufficient because it hides delivery behind long tool-heavy runs.

---

## Teams worker-facing tool surface

Workers should only use:
- `team_comment`
- `team_finish`
- `team_request_help` (optional)

Normal workers should never need:
- `mesh_peers`
- raw `mesh_tell`
- raw `mesh_ask`

Mesh should be internal to the runtime envelope and protocol adapter.

---

## Storage model

### Persisted
- team record
- leader epoch
- worker records
- attempt records
- stable routing metadata
- selected session mode

### Volatile
- widget-only timestamps
- transient display summaries
- current tool labels
- last rendered activity strings

This preserves fast restore and avoids state spam.

---

## Reload behavior

Reload means:
1. new leader epoch
2. old listeners unsubscribed exactly once
3. persisted team state reloaded
4. active workers reconcile against current epoch
5. orphan / resumable / dead classification computed from facts, not guessed

Workers should be able to distinguish:
- stale leader, wait briefly
- new leader epoch, reattach
- no valid leader lease, self-terminate or enter orphan handling

---

## Migration strategy

Recommended path: greenfield kernel plus compatibility shell.

### Phase 1
Build a new kernel under a separate namespace:
- protocol
- runtime store
- reducer
- spawn/runtime envelope
- worker tool adapter

### Phase 2
Adapt current surfaces:
- `teams` tool API
- widget
- ticket bridge
- worktree management

### Phase 3
Run v1 and v2 behind a feature flag.

### Phase 4
Stress/fault test both, then migrate default.

---

## Test matrix

Minimum fault matrix for implementation:
- parallel spawn under provider quota failures
- leader reload mid-run
- stale lease / coordinator death
- orphan adoption / resumable recovery
- duplicate delivery
- out-of-order delivery
- missing ack
- session file appears late
- first attempt contains real stderr, retry attempt empty
- forked session correctness
- busy session receives direct tell and surfaces it immediately

---

## Immediate short-term fix guidance

Even before Teams v2, mesh should change direct tell semantics for busy sessions so they are visible immediately instead of disappearing behind `followUp`-only delivery.

That short-term fix does not replace the need for:
- protocol envelopes
- receipt states
- ack/retry semantics
- coordinator-addressable workers

It only removes the worst visible failure mode while the bigger rewrite is planned.
