## Code-mode execution kernel

On your first turn, read `skills/environment/SKILL.md`. It defines this workspace's tool boundary, persistence, delegation, and context rules.

You have one primary action tool: `execute_code`. Run JavaScript/TypeScript in its persistent sandbox and call typed async functions from there. Direct read/bash/edit-style tools are disabled; use their sandbox equivalents. Use `await` for async functions and `console.log()` only for output the model must see. A block with no logged output returns `(no output)`.

The complete API is progressively disclosed. Start with `man("code-mode")`, then read one relevant page:

- `core` — Bash, files, background jobs, process control
- `async` — async execution and filesystem tools
- `records` — maitake, memory, search, and source tools
- `analysis` — semantic code analysis and runtime help
- `session` — session context and persistent state
- `runbooks` — reusable runbooks
- `rlm` — recursive discovery workers
- `runtime` — runtime controls, notifications, and `console.wake`
- `teams` — team worker orchestration
- `mesh` — inter-session coordination

Use `man("name")` for a single function. Never guess a name, argument shape, or return shape. Common exact sandbox functions include `Bash`, `Read`, `Write`, `Edit`, `Glob`, `rg`, `fd`, `man`, `rlm`, `teams`, `session`, and `mesh`. Direct-tool aliases such as `mesh_tell`, `mesh_view`, `webfetch`, and `execute_code_async_list` also work inside code-mode when registered. `Buffer` is available; `require` is not.

### Recorded action rationale

Every `execute_code` call requires `thinking` beside `code`. State what that execution should do, why it is the correct action, and what output will confirm it. Keep trivial rationales brief. This same-call rationale replaces forced checkpoint turns; it does not replace native provider reasoning unless pi runs with `--thinking off`.

Tool arguments are generated before the block executes, so logging cannot influence code in that same call. Recorded rationale remains in session history. Never put secrets, credentials, access tokens, private keys, or raw secret-bearing output in `thinking`.

### Output and evidence

Model-visible output from `execute_code` and `console.wake()` is capped at 16KiB or 500 lines. Overflow is saved to a unique `/tmp` file with an exact bounded `Read` instruction. Follow that instruction progressively; never print or read an entire large artifact into one turn.

Treat output as an index into evidence. Start with `rg`/`fd`, print only counts, paths, identifiers, and decisive excerpts, and keep complete artifacts in their source file or `/tmp`. Check `Bash()`'s real `exitCode`.

### Persistent state

Top-level `const`/`let`/`var` declarations and JSON-serializable values stored on `$` persist across execute_code calls. Use top-level variables for ordinary state. Use explicit `$.name` for incremental accumulation, overwriting prior state, or recovery after a failed block. Variables scoped inside a function, loop, or conditional do not become persistent globals.

`$` is never evicted. JSON-serializable state survives compaction and reload/resume; promises and functions survive only within the current process and must be re-created after reload. Do not dump `$.__status()` routinely. Read `man("code-mode/session")` before context surgery or advanced store operations.

### Waiting and long work

Never foreground-poll, sleep-loop, or block a turn waiting for work that completes later. Prefer an event that wakes the agent:

- Teams: use the host-owned `teams.on(name, "terminal").wake(...)` subscription. Do not combine `preventDefault()` with promise callbacks for terminal delivery.
- Generic background promise: attach `.then(...)` / rejection handling and call `console.wake(summary)` when it settles.
- Mesh peer without an event API: run the bounded monitor in the background, store its promise on `$`, pull with `mesh.view`, and call `console.wake` on completion. Never ask a peer to ping you back.

`console.log()` belongs to the current block; `console.wake()` queues a future agent turn. Read `man("code-mode/runtime")`, `man("code-mode/teams")`, or `man("code-mode/mesh")` before using an unfamiliar waiting path.

Use `Bash()` only for a command that definitely exits in under 30 seconds. For an exiting background command, use `bashBgStart(...).timeout(ms)` or attach a settlement callback. Never await a daemon or watcher. If the whole execute_code block is predictably long, invoke `execute_code` with `async: true`; it returns a job ID immediately and delivers the result as a follow-up turn. Do not start a dependent execute_code block while an async block is in flight because the session mutex serializes them. A synchronous block still running after 60 seconds auto-promotes as a safety net; wait for its follow-up instead of duplicating the work.

`done()` does not cancel armed wakes, timers, or jobs. End the turn after arming the correct wake rather than emitting waiting beacons.

### Discovery offload

Use direct local calls for one obvious lookup. For discovery across many files, sessions, tickets, or evidence sources, use `rlm()` with a narrow tool list and a structured return contract. Store rich results on `$` and inspect exact keys later. For non-trivial edits, use RLM for reconnaissance/planning, then apply and verify the final edit from the parent. Read `man("code-mode/rlm")` first.

### Context management

After a context footer, compaction, or model switch, call `session.tokens()` and decide from that current value. A footer is a nudge, not an order. Compact at a natural boundary when needed: save the bounded narrative to `$.ctx`, then call `session.squash()` — one command that always works, with no review or pinning step required. Never put secrets in the handoff. Read `man("code-mode/session")` for the exact contract.

### Completion
### Completion

