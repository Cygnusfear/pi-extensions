# Teams worker lifecycle

This is the operational contract for delegated and persistent Teams workers. The complete storage and reducer design is in [TEAMS_V2_ARCHITECTURE.md](./TEAMS_V2_ARCHITECTURE.md).

## Identity and attempts

A logical worker owns a stable `workerId`. Every process incarnation owns a fresh `attemptId`; retries and persistent resumes do not reuse the prior attempt. The display name can be reused and is not identity.

The coordinator injects the worker's complete identity separately from its mesh route:

```text
PI_TEAMS_COORDINATOR_SESSION_ID  canonical Pi session identity
PI_TEAMS_TEAM_ID                 team identity
PI_TEAMS_WORKER_ID               logical worker identity
PI_TEAMS_WORKER_INSTANCE_ID      attempt identity
PI_TEAMS_LEADER_EPOCH            runtime epoch
PI_TEAMS_COORDINATOR_ID          mesh delivery route only
```

## Spawn

Delegation proceeds in this order:

1. verify that the coordinator session is persisted and has an assistant message;
2. append `team_created` if needed;
3. append `spawn_requested` with the fixed attempt identity and session/worktree inputs;
4. request and execute worktree creation through the durable effect ledger;
5. spawn the worker process;
6. append `process_started` with PID and process-birth evidence;
7. expose the runtime handle and begin activity monitoring.

A storage append failure puts the runtime in `storage_degraded`. The process refuses later lifecycle writes and releases no dependent effect or application acknowledgement. `--no-session` delegation is rejected before step 3.

## Adoption

`teams.adopt` attaches one existing Pi JSONL as an always-persistent logical worker. It follows the same session-native lifecycle with a distinct `adopt` session mode:

1. require a persisted coordinator session with an assistant message;
2. resolve `{ kind: "id", id }` or `{ kind: "file", path }` to one canonical `.jsonl` file;
3. parse the complete JSONL and header and require the stored absolute cwd to exist;
4. reject the current coordinator session, a live mesh peer with the same session or durable mesh identity, an ambiguous ID, malformed input, or a live activation lease;
5. derive the stable logical `workerId` from the coordinator session ID and source session ID;
6. append `spawn_requested` with `sessionMode.kind = "adopt"`, the exact source path, source session ID, and execution cwd;
7. acquire the activation lease for the exact source JSONL before spawning;
8. run `pi --session <exact-source-file>` from the header cwd, omitting `--model` unless the caller supplied an override;
9. append `process_started` with PID and process-birth evidence.

Teams never copies, forks, moves, deletes, repairs, or directly rewrites the source JSONL. Pi itself appends normal resumed conversation entries to that exact file. Adoption creates no worktree; stdout/stderr logs go under the coordinator's `.pi/sessions/teams-workers/adopt-...` directory. The activation lease is disposable liveness fencing, never lifecycle truth. A startup failure releases any acquired lease while retaining the persistent logical route for a later retry.

## Running

A worker announces its durable mesh identity with `worker.hello`; that route can reconnect without becoming lifecycle truth. Comments and phase events are live telemetry.

Repeated inactivity warnings are canonical `stuck` facts. Each cooldown uses its own persisted cooldown index, deterministic event ID, wake, and branch-local delivery acknowledgement.

PID checks combine liveness with process birth. A reused PID is treated as the original attempt's death, not as a living worker.

## Declared finish

`team_finish(status="done"|"quit", summary=...)` is authoritative. A worker must not close its own ticket.

Before the tool can report success, the worker:

1. requires its own persisted Pi session and an assistant message;
2. writes `teams-worker-finish-pending-v1` with the complete attempt identity;
3. sends a deterministic `worker.finish` event and retries it if necessary;
4. waits for `leader.ack` with phase `persisted`;
5. writes `teams-worker-finish-completed-v1` locally;
6. posts the `DONE:` or `QUIT:` mai note as a secondary human record.

The leader sends the persistence acknowledgement only after the declaration fact is in the coordinator session. Exact retries are re-acknowledged without changing state. A conflicting declaration produces a protocol violation and does not replace the first declaration.

## Process exit and assessment

Process exit is always recorded independently from declaration:

- declaration before exit: the declaration is already actionable; exit later unlocks cleanup;
- exit before declaration: the leader waits a bounded settle window and checks the worker's persisted pending finish;
- clean exit (code zero, no signal) without finish: the attempt becomes a provisional `missing_finish` warning;
- non-zero or signaled exit without finish: the attempt receives `assessment_crash` and is failed;
- startup failure before a process start is durable: the attempt receives `assessment_startup_failure`;
- coordinator kill: `assessment_killed` and process termination are recorded separately.

The durable `process_exited` code or signal determines crash classification. Ticket state, notes, and output enrich diagnostics only; they never manufacture `done` or `quit`.

If a valid declaration is recovered after a provisional assessment, its outcome wins and one deterministic `outcome_corrected` event explains the correction.

## Persistent workers

A persistent worker that declares done and whose process exits becomes `resumable`. A persistent clean exit without `team_finish` remains a `missing_finish` warning for that attempt while the logical worker route remains separately resumable; resumability never changes the attempt outcome to success or a benign terminal event. Sending it a new message:

1. preserves the stable logical `workerId`;
2. creates a new `attemptId` and `spawn_requested` fact;
3. resumes the existing worker Pi session;
4. records a new process birth and `process_started` fact.

The completed prior attempt remains in history. Declaration, exit, assessment, stuck, and cleanup state never bleed into the new attempt.

For an adopted member, step 3 resumes the exact source JSONL at its original path. The persisted execution cwd restores the source header cwd after coordinator restart. `teams.tell(name, message)` reacquires the activation lease before spawning and changes the attempt mode from initial `adopt` to ordinary `resume`; `workerId` and Pi mesh identity remain stable.

## Cleanup and ticket effects

Cleanup begins only after process death. The settled outcome chooses preservation:

- declared done: auto-commit and preserve deliverable branch;
- declared quit or ambiguous missing finish: preserve evidence according to cleanup policy;
- crash/startup failure: retain canonical history even when the runtime handle is removed;
- coordinator kill: terminate, close the coordinator-owned ticket, and clean through durable effects.

Worktree creation, process termination, ticket close, and cleanup use deterministic effect IDs with request-before-execution and completion-after-execution facts. Startup reconciliation resumes incomplete effects. Cleanup Git commits carry `Teams-Effect-Id` trailers.

## Restore

Restore scans all coordinator session entries in physical append order and folds the v4 facts once. It reconstructs running and resumable handles, verifies PID birth, imports pending worker finish records when necessary, reconciles incomplete effects, and leaves dead ambiguous attempts explicit.

It does not restore outcome from:

- worker/ticket snapshots;
- old terminal notification sets;
- exit code zero;
- the active branch alone;
- mesh reachability;
- ticket closure.

Roster eviction affects only the live widget/list. Attempt history and undelivered lifecycle events remain.

Restore reconstructs adopted bindings from coordinator `spawn_requested` facts, including their exact source path and execution cwd. It does not discover relationships by scanning or copying source sessions. A restored adopted member can resume only through the same pre-spawn activation lease fencing.

## Delivery

Every actionable event is rendered with a durable event marker. The event remains pending until that marker is present in the final successful provider request and the terminal assistant result is successful. Failed/aborted provider turns do not acknowledge it. Branch rewind can expose it again on that branch.

## Shutdown and forks

`session_shutdown` releases only runtime resources. It does not kill workers and does not create an outcome.

Forks and cloned/branched sessions use a new coordinator session identity. Copied parent lifecycle facts and legacy snapshots cannot become child truth. A child coordinator therefore cannot inherit authority over a parent coordinator's adopted-session relationship or clean its source file.

Shutdown does not release an adopted session's process activation lease while that process remains live. The lease is released on process exit or kill; stale dead-owner leases remain stealable by the existing fencing protocol.

## Public inspection

```ts
await teams.list();
await teams.view("worker");
await teams.view({ attemptId: "..." });
await teams.history({ name: "worker" });
await teams.history({ status: "warning", start: -20 });
```

Subscriptions bind to a concrete attempt. Creating a same-name worker later cannot satisfy a subscription for an older attempt, and an older retained terminal event cannot satisfy a new future binding.
