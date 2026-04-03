# Oracle #2 Research Report: Teams Worker Lifecycle Bugs

## Executive Summary

Five distinct root causes identified, three still active, two already partially mitigated. The core problem is that **worker lifecycle has three independent truth sources (process exit, ticket state, session content) with no canonical reconciliation order**. Each source can contradict the others, and the code checks them in a priority order that produces wrong answers for successful workers with partial failures.

---

## ROOT CAUSE #1: workerProducedMeaningfulOutput Priority Bug (ACTIVE — Primary False-Failure Cause)

**File:** `packages/teams/leader.ts`, function `workerProducedMeaningfulOutput()`

**The bug:** The function checks the `lastAssistantStopReason` BEFORE checking whether the worker actually produced useful work (tool calls, substantive text). The check order is:

1. If lastAssistantStopReason === "error"/"aborted" → return FALSE (not meaningful)
2. If hasToolCall → return TRUE
3. If hasSubstantiveText → return TRUE

**What goes wrong:** A worker that:
- Ran for hours
- Made 100+ tool calls
- Closed the ticket successfully
- Produced real output

...gets marked as FAILED if the **last** assistant message had `stopReason: "error"` (e.g., a single rate limit hit at the very end, after all work was done).

**Why this is the primary cause:** This exactly matches the reported symptoms: "exit code 0, long runtime, useful output, closed ticket, yet team-event says failed." The `workerProducedMeaningfulOutput` check overrides all other success indicators.

**In `handleWorkerExit`:**
```typescript
let isSuccess = worker.hasTools ? ticketClosed : ticketClosed || exitCode === 0;
if (isSuccess) {
  const outputCheck = workerProducedMeaningfulOutput(worker.sessionDir);
  if (!outputCheck.meaningful) { isSuccess = false; }  // ← overrides ticket+exitCode
}
```

**Fix:** Reverse the priority: if the worker DID produce tool calls or substantive output, a final provider error shouldn't retroactively erase that work. Check hasToolCall/hasSubstantiveText BEFORE lastAssistantStopReason.

**Compounding factor:** `print-mode.ts` also sets `exitCode = 1` when the last assistant message is an error. So the leader sees exit code 1 AND workerProducedMeaningfulOutput returns false. Double confirmation of failure, both based on the same misleading signal.

---

## ROOT CAUSE #2: Reload Loses Process Handles (ACTIVE — Ghost Worker Cause)

**File:** `packages/teams/leader.ts`, `restoreState()`

**The bug:** On /reload, `childProcesses.clear()` is called, wiping all `ChildProcess` handles. Restored "running" workers get activity monitors (polling via `ps`) but NO `child.on("exit")` callback.

**Consequences:**
1. **Exit detection is delayed** — instead of instant callback, relies on 5-second poll cycle
2. **Exit code is lost** — `exitCode` is not in `PersistedWorkerState`, so `worker.exitCode ?? 0` always yields 0 for restored workers whose process died between saves
3. **No stdin/stdout handles** — can't communicate with the worker process directly (mesh still works)

**Why workers become ghosts:** The workers' OS processes and mesh sidecar processes survive /reload. The leader can detect them via `ps` and mesh, but has no process handle. If the leader crashes completely (not just reload), workers receive SIGHUP and typically die — but if SIGHUP is somehow survived, they become true orphans with active mesh connections and no owner.

**Evidence:** The `deriveRestoredStatus` function handles dead-on-restore by returning "done" for non-freeform workers:
```typescript
if ((legacyStatus === "running" || legacyStatus === "spawning") && !isProcessAlive(saved.pid)) {
  return saved.freeform ? (...) : "done";
}
```
This masks real crashes as successes — a worker that crashed with exit code 1 during a reload window gets shown as "done" with no error report.

---

## ROOT CAUSE #3: Session JSONL Bloat (ACTIVE — Slow Session Cause)

**File:** `packages/teams/leader.ts`, `renderWidget()` → `saveState()`

**The bug:** `saveState()` appends a FULL `LeaderStateSnapshot` to the session JSONL every time `renderWidget()` is called. `renderWidget()` is called from every activity poll cycle (every 5s per worker), every spawn, status change, ticket change — 19 call sites total.

**Impact math:** 5 workers × 10 minutes each × (60s/5s) = 600 state snapshots. Each snapshot encodes all worker handles. For a 2-hour session with 10 workers: thousands of multi-KB entries.

**Causes:** Slow session open, slow restoreState, large session files.

**Fix:** Throttle saveState with a minimum interval (e.g., 10s) and/or dirty-flag to only save on actual state transitions.

---

## ROOT CAUSE #4: Double Close Race in Worker (MITIGATED but messy)

**File:** `packages/teams/worker.ts`

For normal workers, `closeTicket()` can be called from TWO paths:
1. `agent_end` handler (after 120s grace period)
2. `session_shutdown` handler (`autoCloseOnSessionShutdown=true`)

The `ticketClosed` boolean guard prevents double-execution, but the 120s grace period creates a window where the process is alive but idle. If the coordinator kills the worker during grace, `closeTicket` never runs → ticket stays open → leader treats as failure (for hasTools workers) or relies on workerProducedMeaningfulOutput (which may also fail due to Root Cause #1).

**Partially mitigated by:** handleWorkerExit's fallback ticket close for workers that die without closing.

---

## ROOT CAUSE #5: Exit Code Not Persisted (ACTIVE — Reload Misclassification)

**File:** `packages/teams/types.ts` (`PersistedWorkerState`)

`exitCode` is in `WorkerHandle` but NOT in `PersistedWorkerState`. On restore, activity monitor uses `worker.exitCode ?? 0`, always assuming clean exit. A crashed worker looks successful after reload.

**Fix:** Add `exitCode?: number | null` to `PersistedWorkerState`.

---

## What's Already Fixed (Verified from Git History)

| Fix | Commit | Status |
|-----|--------|--------|
| Auto-respawn for startup death | d34a0f7+ | Working |
| Dead-on-arrival detection | b1af70b | Working |
| Crash report before cleanup | 0c9bcf5 | Working |
| Sessions survive worktree cleanup | spawner.ts | Working |
| Sessions always kept for post-mortem | 1430ec5 | Working |
| Mesh comment dedup | 1223783 | Working |
| Freeform workers don't auto-close | b7acf6b | Working |

---

## Proposed Canonical Lifecycle Model

The current model conflates three independent facts. Proposed hierarchy (most authoritative first):

1. **Did the worker produce real work?** (tool calls, file changes, ticket notes with "DONE:")
   - If yes → success, regardless of final provider error or exit code
2. **Is the ticket closed with a DONE note?**
   - If yes → success, even if exit code is non-zero
3. **Exit code**
   - Only used as tiebreaker when work output and ticket state are ambiguous
4. **Last provider error**
   - Only marks failure if NO work was produced AND ticket wasn't closed

**For reload/restore:**
- Persist exit code in snapshot
- If process is dead on restore: use persisted exit code, not assumed 0
- Re-read ticket state for all restored workers before declaring status

**For ghost workers:**
- On coordinator shutdown: send mesh "coordinator-goodbye" to all workers
- Workers receiving this should exit cleanly
- Add a "zombie sweep" for PIDs from restored workers no longer in mesh

---

## Contradictions and Dead Ends

1. **"Exit code 0 but failed" resolved:** workerProducedMeaningfulOutput is the culprit, not the exit code path. Session-content validation overrides correct exit code determination.

2. **Ghost workers vs. orphan workers:** Different issues. Ghosts (reload, detectable via ps) vs. orphans (coordinator death, may survive indefinitely).

3. **Session bloat NOT caused by team-events:** Bloat comes from saveState snapshots on every poll cycle, not from batched team-events.

4. **Grace period is NOT the main bug:** 120s grace exists for good reason. The bug is that killing during grace + Root Cause #1 produces false failures.

5. **hasTools workers stricter check:** `isSuccess = ticketClosed` vs. `ticketClosed || exitCode === 0` for normal workers. Intentional but can surprise.
