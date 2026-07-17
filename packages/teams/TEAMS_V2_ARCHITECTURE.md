# Teams session-native lifecycle architecture

Teams derives orchestration state from the coordinator's Pi session. This document describes the production v4 kernel.

## Canonical store

The coordinator Pi session JSONL is the only lifecycle store.

- `teams-lifecycle-fact-v4` entries contain session-global lifecycle facts.
- `teams-lifecycle-ack-v1` entries record branch-local notification delivery.
- `teams-lifecycle-migration-v1` records the one-time legacy import.
- Runtime handles, widgets, mesh routes, ticket fields, and worker-session records are projections or transport evidence. They are never lifecycle authority.
- Teams does not maintain a SQLite database, sidecar journal, snapshot checkpoint, or writer lock.

A session must be persisted and must already contain an assistant message before Teams can append lifecycle truth. Delegation in `--no-session` mode, or during Pi's pre-first-assistant buffering window, is refused before any process or worktree side effect.

## Identities

An attempt is identified by the tuple:

```text
(coordinatorSessionId, teamId, workerId, attemptId)
```

- `coordinatorSessionId` scopes facts to one Pi session.
- `teamId` is deterministic for that coordinator session.
- `workerId` is the stable logical worker identity.
- `attemptId` identifies one process incarnation. Every spawn, retry, and persistent resume gets a new attempt.
- A worker's display name is presentation only. It is never an idempotency key.
- `leaderEpoch` identifies a runtime incarnation, not lifecycle truth. A new epoch adopts the session facts.

PID liveness is checked with the recorded process birth observation. A live, reused PID is not accepted as the original worker.

## Fact stream

The authoritative entry type is `teams-lifecycle-fact-v4`. Facts include the full attempt identity, a deterministic `eventId`, a kind, authoritative `payload`, and optional `diagnostics`.

Important kinds are:

- team and spawn: `team_created`, `spawn_requested`, `process_started`
- liveness: `process_exited`, `stuck`
- declarations: `declaration_done`, `declaration_quit`
- assessments: `assessment_missing_finish`, `assessment_startup_failure`, `assessment_crash`, `assessment_killed`
- integrity: `protocol_violation`, `outcome_corrected`
- cleanup/effects: `cleanup_requested`, `cleanup_completed`, `cleanup_failed`, `effect_requested`, `effect_completed`, `effect_failed`

`team_finish(done|quit)` is the only declared task outcome. Process exit is an independent liveness fact. Exit code zero, ticket state, a note, or ordinary session shutdown cannot fabricate a successful declaration. A clean exit without a declaration is `missing_finish`; a non-zero or signaled exit without a declaration is `assessment_crash`. Attempt outcome and logical route are orthogonal: a persistent `missing_finish` attempt stays a warning even when its logical worker route is resumable.

The first valid declaration for an attempt is immutable. An exact retry is idempotent. A different declaration, or a reused event ID with a different authoritative identity, produces a protocol violation and cannot overwrite the first declaration.

## Deterministic identity

All fact conflicts and effect IDs use canonical JSON:

- object keys are sorted recursively;
- only finite JSON values are accepted;
- `occurredAt`, `sourceLeaderEpoch`, Pi entry IDs, and `diagnostics` are excluded from logical identity;
- the authoritative tuple is schema, attempt identity, kind, and payload;
- SHA-256 IDs use the `teams:event:v4:` or `teams:effect:v1:` namespace.

Consequently, a retry with reordered keys, a different observation time, or different diagnostics remains an exact duplicate. Changing authoritative payload does not.

## Reducer and runtime projection

`reduceLifecycleFacts` is a pure physical-order fold. Restore calls `SessionManager.getEntries()` once and folds facts from every leaf. It never restores canonical state from only the selected branch.

`LifecycleRuntimeStore` holds the resulting in-memory projection. Successful appends are folded incrementally; the normal-turn path does not rescan all lifecycle facts. The projection contains:

- logical workers and their current attempt;
- every historical attempt;
- actionable lifecycle events;
- effect request/completion state;
- integrity violations.

Roster cleanup only removes runtime presentation handles. `teams.history`, attempt views, and pending lifecycle notifications remain available from the projection.

## Worker finish protocol

A worker cannot report completion only over transport.

1. The worker verifies its Pi session is persisted and contains an assistant message.
2. It appends `teams-worker-finish-pending-v1` to its own session with the full canonical attempt identity and deterministic event ID.
3. It sends `worker.finish` over mesh and retries the same event until the leader answers.
4. The leader validates the attempt and event ID, appends the coordinator fact, then sends `leader.ack(..., "persisted")`.
5. Only after that acknowledgement does the worker append its local completion record and let `team_finish` return successfully.

If the acknowledgement is lost, the same declaration is resent and re-acknowledged idempotently. If the leader is unavailable and the worker exits, restore reads the recorded worker session and imports the pending declaration. When a provisional missing-finish assessment already exists, the leader appends one deterministic `outcome_corrected` event.

## Delivery outbox

Actionable facts form a durable notification outbox. Each rendered event carries `[teams-event:<eventId>]`.

- Pending events are actionable projection events minus acknowledgements visible on the active branch.
- One delivery contains at most 20 events and 12,000 characters.
- Background events trigger a supported follow-up turn; `before_agent_start` repairs missed wakes.
- Rewinding before an acknowledgement makes the event pending on that branch again without changing canonical truth.

A delivery acknowledgement is appended only after correlation proves that the marker reached the terminal successful provider request:

1. `context` observes candidate markers.
2. `before_provider_request` records the actual request payload markers and an ordinal.
3. `after_provider_response` records HTTP status.
4. assistant `message_end` records the paired stop reason.
5. `agent_end` acknowledges only `delivered batch ∩ markers in the last successful terminal request`.

429-only runs, network failures, streaming errors, aborted runs, and markers stripped before the final request are not acknowledged. A later successful request can acknowledge only the markers it actually contains.

## Durable effects

Effects are allowed only after their deterministic request fact has been appended. Completion or failure is also appended. Startup reconciliation finds requested-without-completion effects and executes the same effect ID again.

The ledger covers worktree creation, cleanup, ticket close, and process termination. Cleanup commits include a `Teams-Effect-Id` trailer so a restart after the Git commit but before the completion fact can reconcile without creating a duplicate commit.

Cleanup eligibility begins at `process_exited`. The settled declaration or assessment selects preservation policy; it does not decide whether the process is dead. Protocol-violating attempts are blocked from unsafe effects.

## Sessions, branches, and forks

Lifecycle facts are session-global within one coordinator session tree. Delivery acknowledgements are branch-local.

Forked, cloned/branched, and cross-directory child sessions have a new session ID and a header `parentSession`. Copied parent facts are ignored because their coordinator session identity differs. Legacy migration is also skipped in a child session, so a child cannot reinterpret copied parent snapshots as its own state.

`session_shutdown` releases timers, subscriptions, mesh listeners, and other runtime resources only. It does not kill workers or mutate task outcome.

## Legacy migration

On the first eligible restore, Teams scans every physical session entry and unions all legacy `teams-leader-state` snapshots, including embedded v2 reducer attempts. It imports explicit declarations, process evidence, and historical attempts. Dead attempts without an explicit declaration become conservative legacy-ambiguous warnings; they never become done.

The import uses deterministic v4 fact IDs and appends one migration marker. Subsequent restores do not migrate again. Parent-derived child sessions skip migration entirely.

Historical snapshot entries remain in append-only session history but have no runtime authority after import.

## Public history and subscriptions

- `teams.list()` shows the current logical roster.
- `teams.view(name)` addresses the current attempt for a display name.
- `teams.view({ attemptId })` reads an exact historical attempt; `teams.view(name)` resolves the logical worker’s current attempt.
- `teams.history({ name?, attemptId?, status?, start?, end? })` queries canonical attempt history.
- `teams.on(...)` binds a name subscription to the current attempt at creation, or to the first future matching attempt. It never replays an older same-name attempt into a new binding.

Terminal subscription replay comes from reducer history, not a volatile notification ledger.

## Complexity and performance

- restore: `O(total session entries + accepted lifecycle facts)`
- incremental fact append/fold: amortized `O(1)`
- branch acknowledgement scan: `O(active branch depth)`
- delivery construction: bounded by pending actionable events and delivery caps
- persisted storage: one normalized fact per transition; no growing whole-state snapshots

The test suite includes 1,000-attempt/20,000-fact restore and 10,000-entry branch scans to protect these shapes.
