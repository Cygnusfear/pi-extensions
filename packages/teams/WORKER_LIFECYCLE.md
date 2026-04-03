# Teams v2 worker lifecycle

This document describes the target lifecycle model in the `teams-v2-cutover` branch.

The critical change from Teams v1 is this:

- workers do not speak ad-hoc mesh payloads anymore
- workers emit typed v2 envelopes
- the leader ingests worker facts into a reducer-first runtime store
- lifecycle truth comes from worker attempts plus reduced facts, not from ticket heuristics or widget state

---

## Core identities

Every worker run is identified by four layers:

- `teamId` — stable logical delegation batch
- `leaderEpoch` — current leader ownership instance; changes on reload / restart
- `workerId` — stable logical worker name
- `attemptId` — one concrete process attempt

This lets the system distinguish:
- same worker, new process attempt
- same team, new leader after reload
- stale events from an older attempt

---

## Runtime envelope

Workers are spawned with an explicit runtime envelope, including:

- `teamId`
- `leaderEpoch`
- `workerId`
- `attemptId`
- coordinator session id
- channel id
- lease path
- session mode

Session mode is explicit:

- `fresh`
- `fork`
- `resume`

In the cutover branch, normal delegated workers prefer a real `fork` session when the leader session manager can create one. Otherwise they fall back to `fresh`.

---

## State model

### Worker attempt
A worker attempt is one concrete spawned process.

It owns:
- pid
- session dir / session file
- session mode
- started / ended timestamps
- process exit data
- reduced lifecycle facts

### Worker record
A worker record owns:
- logical worker identity
- current attempt id
- all attempts for that worker
- reduced lifecycle state

### Team record
A team record owns:
- `teamId`
- `leaderEpoch`
- all worker records

The leader keeps this in the v2 runtime store.

---

## Fact model

Workers do not directly set lifecycle state.

The leader appends facts such as:
- `spawn_requested`
- `spawn_started`
- `worker_hello`
- `comment_posted`
- `finish_done`
- `finish_quit`
- `process_exit`
- `lease_stale`

The reducer maps those facts to lifecycle states.

---

## Lifecycle states

Current reducer lifecycle states:

- `created`
- `spawning`
- `running`
- `finishing`
- `done`
- `warning`
- `failed`
- `killed`
- `orphaned`
- `resumable`

Current reduced meaning:

| Reduced state | Meaning |
|---|---|
| `created` | worker record exists but no spawn fact yet |
| `spawning` | spawn started but worker has not said hello yet |
| `running` | worker has sent `worker.hello` |
| `done` | explicit `finish_done` fact |
| `warning` | explicit `finish_quit` fact |
| `failed` | process exited without a terminal success/quit fact |
| `orphaned` | lease went stale |

---

## Worker protocol

Workers currently emit typed v2 envelopes.

### Channel traffic
Over the team channel, workers emit:
- `worker.hello`
- `worker.comment`

### Direct leader traffic
Directly to the coordinator, workers emit:
- `worker.finish`

That means the old free-form payloads like `teams:init`, `teams:comment`, `teams:done` are no longer the primary runtime contract in the cutover branch.

---

## Session strategy

### Normal delegated worker
Preferred mode:
- `fork`

This uses a real branched session file when possible, preserving:
- the real parent branch point
- prior conversation context
- actual session lineage

### Fallback
If the current context cannot create a branched session:
- `fresh`

### Resume path
When a worker is resumed from an existing session:
- `resume`

---

## Leader responsibilities

The leader is responsible for:
- assigning `teamId` and `leaderEpoch`
- spawning workers with explicit session mode
- ingesting v2 envelopes into the runtime store
- appending attempt facts
- reducing the team state
- projecting reduced lifecycle into the current worker handle / widget layer

The leader is **not** supposed to treat mesh payloads as lifecycle truth directly.

---

## Ticket semantics

Tickets are still workflow artifacts, not lifecycle truth.

Important rules remain:
- `team_finish(done)` is authoritative success
- `team_finish(quit)` is authoritative warning-style terminal exit
- `session_shutdown` never mutates ticket outcome
- process exit alone is not success

---

## Reload / restore

On restore, the leader:
1. reloads persisted worker snapshot state
2. restores `v2TeamId` if present
3. rebuilds an in-memory v2 team record
4. seeds worker attempts from restored handles
5. continues ingesting new v2 facts from live mesh events and process exits

This is still in progress in the cutover branch, but the architecture direction is fixed.

---

## Current cutover status

As of the current branch state:

Implemented:
- typed v2 protocol
- reducer-first runtime store
- team channel id builder
- worker emits v2 hello/comment/finish
- leader ingests those envelopes
- leader records spawn / hello / comment / finish / exit facts
- leader persists `v2TeamId`
- spawn session mode is explicit and prefers real fork sessions

Still being migrated:
- remaining ad-hoc worker-handle lifecycle mutations
- full projection of widget/tool surfaces from v2 store only
- complete removal of legacy compatibility assumptions outside the cutover branch

---

## Practical rule of thumb

If you are changing lifecycle behavior in Teams v2:

1. add / emit a fact
2. reduce lifecycle from facts
3. project UI from reduced state
4. do not invent another side channel of truth
