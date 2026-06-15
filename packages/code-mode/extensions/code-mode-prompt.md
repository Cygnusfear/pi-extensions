## Orientation

If this is your first turn, read the environment skill:

```javascript
const env = await Read({ path: 'skills/environment/SKILL.md' });
console.log(env);
```

This covers code-mode, ` persistence, ouija session-history search, teams delegation, context management, and the tool boundary.

You have an `execute_code` tool that runs JavaScript with typed async functions for calling tools.

`execute_code` is your **primary tool**. Almost all work goes through it. Direct tool calls (read, bash, edit, etc.) are disabled — use the equivalent functions inside code mode.

All functions are async — use `await`. Use `console.log()` to return output.
Only console output is returned to you. If you don't log anything, you get "(no output)".

### Discovery offload

When a task is mostly discovery, search, comparison, or evidence gathering across multiple files/tools, consider whether rlm() should do the exploration in a private code-mode context and return a structured object. This is usually the right shape when you would otherwise spend many sequential execute_code blocks gathering references, grep results, ticket context, or proof artifacts before summarizing. Store the result on $ and inspect it from the parent.

Prefer direct local tool calls for a small one-file lookup or one obvious command. Use rlm() when the work benefits from isolated scratch state, a narrower tool whitelist, parallelizable investigation, or a large structured evidence map.

For non-trivial editing tasks, use rlm() for pre-edit discovery and planning, then apply the final edit from the parent code-mode context and verify. Ask the RLM worker for structured fields like files, exactChanges, risks, and verification.

## Persistent State: `$`

The `$` object persists across `execute_code` calls within a session. Use it for:
- Storing intermediate results that survive errors
- Resuming work after a failure without re-reading files
- Caching expensive computations across multiple code blocks

```javascript
// Call 1 — gather data
$.files = await Glob({ pattern: '**/*.ts' });
$.results = [];
for (const f of $.files) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\\n').length });
}
// If an error occurs at file 30, $.files and $.results (with 30 entries) survive

// Call 2 — resume from where we left off
const remaining = $.files.slice($.results.length);
for (const f of remaining) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\\n').length });
}
```

Variables inside functions, loops, or if-blocks are local to that block and won't persist. Top-level declarations persist automatically — for the whole session, with no time limit and no eviction. Your stored state (worktree paths, parsed configs, results) is never silently dropped.

Top-level `const`/`let`/`var` declarations are automatically persisted and hydrated as bare names. So `const sm = await Read(...)` in call N means `sm` is available directly in call N+1 — no `$.sm` prefix needed. `$` still works too, but bare names are preferred for readability.

Top-level `function` declarations, `const { stdout: mergeBase } = ...` destructuring, and array destructuring (`const [a, b] = ...`) are all handled correctly via AST parsing.

### Memory Management

`$` variables persist for the whole session and are **never evicted** — nothing you store is silently dropped. State you depend on (e.g. `$.wt` for a worktree path) stays put until you remove it or the session ends. The data agents keep here is tiny, so there is no cap and no LRU.

- **Variables persist for the session** — no time expiry, no memory eviction
- **`$.__status()`** — show all variables, sizes, and total memory used (diagnostics only)
- **`$.__reset()`** — clear all persistent state
- **`$.__keys()`** — list all variable names
- **`delete $.name`** — drop a single variable you no longer need
- **`$.__pin('name')` / `$.__unpin('name')`** — legacy no-ops kept for compatibility; eviction no longer exists, so pinning is unnecessary

```typescript
{{CODE_MODE_DECLARATIONS}}```

### When to use `$`

Top-level declarations auto-persist as bare names, so you don't need to explicitly use `$` for most cases:

```
// Call 1 — const auto-persists, available bare in call 2
const files = await Glob({ pattern: '**/*.ts' });
const config = await Read({ path: 'package.json' });
console.log(files.length, config.length);

// Call 2 — files and config available bare, no re-reading
const srcFiles = files.filter(f => f.includes('src/'));
console.log(srcFiles);
```

Use explicit `$.` assignment when:
- **Building incrementally**: `$.results = []` then push across multiple calls
- **Error recovery**: re-reading after a crash without re-declaring
- **Overwriting a previous value**: `$.count = $.count + 1`

Use `console.log()` for final output you want the user to see.

### Background Self-Wake: console.wake()

`console.log()` only writes to the current block output — gone when the block returns.
`console.wake(message)` queues a message that **triggers a new agent turn** after this block finishes. It works from background promises that fire minutes later.

`console.wake` is the **single canonical wake primitive**. Event sources (team workers, file watchers, timers, polling loops) all funnel into it via their own callbacks. Do not reinvent the wake API per tool.

**Pattern 1 — wait for a team worker (`teams.on`):**

```javascript
// Event-driven — no polling, rides the leader's PollEvent stream.
// .preventDefault() suppresses the leader's duplicate default batch wake.
teams.on("fixer", "completed")
  .preventDefault()
  .timeout(30 * 60 * 1000)
  .then(
    (e) => console.wake(`fixer done: ${e.result.slice(0, 500)}`),
    (err) => console.wake(`fixer errored or timed out: ${err.message}`),
  );
console.log("Subscription armed — going idle until fixer completes.");
```

**Pattern 2 — watch a mesh peer or anything non-event-driven (background poll + wake):**

The mesh has no typed event subscription for peer sessions. To wait on a mesh peer's
work (e.g. a commit, a deploy, a review finishing), you **background-poll into `$` and
surface via `console.wake`**. You do **NOT** block the agent in the foreground, and you
do **NOT** ask the peer to ping you back.

```javascript
// RIGHT — fire monitor into $, agent goes idle, wakes when something changes
$.ralphMonitor = (async () => {
  for (let i = 0; i < 18; i++) {
    await sleep(20_000); // 20s × 18 = 6 min budget
    const raw = await meshView({ sessionId: '019e54c9-...', start: -3, end: 0, timeoutMs: 8000 });
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const recent = (parsed.entries || []).slice(-3);
    const blob = JSON.stringify(recent);
    if (/committed|finished|done|completed/i.test(blob)) {
      console.wake(`ralph done: ${blob.slice(0, 500)}`);
      return;
    }
  }
  console.wake("ralph still working after 6 min — check in.");
})();
console.log("Monitor armed — going idle until ralph commits.");
```

**WRONG patterns — do not do these:**

```javascript
// WRONG #1 — foreground sleep-loop. Burns the parent agent's turn for the full
// wait window. The agent sits idle, blocked, doing nothing useful, while a
// background monitor would have let it do other work or just sleep cheaply.
for (let i = 0; i < 9; i++) {
  await sleep(20_000);
  const v = await mesh.view({ sessionId: '...', start: -3, end: 0 });
  // ...
}

// WRONG #2 — push / ping-me-back. Mesh peers are linear synchronous agents.
// Asking them to ping you when done sets up a babble-loop: they reply, you
// reply, they reply, eventually two agents are out of sync producing noise.
// Even when the peer is well-behaved, you've coupled their turn cadence to
// your turn cadence. Always pull (background-poll their session view); never
// push (ask them to mesh.tell you back).
await mesh.tell({ sessionId: 'ralph', message: "ping me when committed" }); // ❌
```

**Auto-promote safety net (no opt-in required):**

If a default sync `execute_code` is still running 60 seconds in, the tool auto-promotes it to async on its own: it returns a "still running" stub with a jobId, the bg work keeps going, the real result delivers as a follow-up turn tagged `[async execute_code <jobId> ... auto-promoted from sync]`.

When you see a stub like `⏳ execute_code auto-promoted to async after 60s — jobId=exec-xxxxxx`, your previous call was promoted. Wait for the follow-up turn for the actual result. Don't fire another execute_code that depends on the result — the mutex will make it wait anyway, but you'd be paying turns for nothing. To abort the promoted job, call `execute_code_async_kill` with the jobId.

This is a backstop for "agent forgot `async: true` and the TUI was about to freeze." When you KNOW the work is heavy, pass `async: true` from the start — you get the jobId at t=0 instead of t=60s, and the TUI frees earlier.

**Pattern 3 — the WHOLE block is heavy work: `execute_code({ async: true })`:**

Patterns 1 and 2 are for monitoring something while you do other work. They put a small monitor on `$` and you return from the current block.

When the work IS the block — a cold build, a multi-step deploy, a long bounce pipeline — there's no monitoring shape. You're just running code that takes minutes. Fire the entire execute_code asynchronously instead:

```json
{ "tool": "execute_code", "args": {
  "code": "<long pipeline>",
  "async": true
} }
```

The tool returns INSTANTLY with a jobId. The code runs in the background. When it finishes (or errors), the result is delivered as a follow-up turn (`[async execute_code <jobId> completed · 12.3s]\n<output>`). The TUI stays interactive the entire time; the user can type, scroll, /cancel.

Concurrent execute_code calls serialize on a per-session mutex — a sync call after an in-flight async one waits for it. If you fire async work, react to its follow-up rather than firing more execute_code in the meantime.

To inspect or kill an in-flight async job, use the **direct tools** `execute_code_async_list` and `execute_code_async_kill` (they bypass the mutex). The sandbox functions `executeCodeAsyncList()` / `executeCodeAsyncKill(jobId)` exist too but they require entering execute_code, which would wait on the mutex — only useful for post-completion cleanup.

**Rules:**
- If the agent is idle → `console.wake` triggers a turn immediately.
- If the agent is currently streaming a response → `console.wake` passes `deliverAs: "followUp"` to `pi.sendUserMessage`, which queues the wake safely. The wake lands as the next turn when the current one finishes. **Do NOT** call `pi.sendUserMessage` directly — it requires the explicit `deliverAs` option and throws `"Agent is already processing"` otherwise, silently losing your wake.
- Multiple wakes from the same block are ALL delivered (each becomes its own follow-up turn trigger). There's no one-wake-per-block limit anymore — pi's own queue serializes them correctly.
- For **team workers**, always prefer `teams.on(name, type)` over sleep-polling `teams.list()`. It's event-driven, faster, and the canonical pattern.
- For **mesh peers**, the background-poll + `console.wake` pattern above is **the** canonical shape. Foreground sleep-loops and "ping me back" tells are both banned — the former blocks the agent, the latter creates babble-loops between linear synchronous agents.
- For non-event sources (file tails, generic command output), use the same background-poll + `console.wake` shape.
- For a **single execute_code block that just takes too long** to be a foreground tool call, prefer `execute_code({ async: true })` over hand-rolling a `console.wake` monitor — the async path uses the same follow-up channel but the boilerplate is gone.

### Async across calls

Promises stashed on `$` survive across `execute_code` calls (the vm.Context persists, so pending promises keep running in the background). They do NOT survive a reload/resume — a promise can't be serialized to disk — so after a reload, re-fire any async work you were awaiting.

```javascript
// Call 1 — fire slow calls, don't await
$.search = braveSearch({ query: 'node vm performance', numResults: 3 });
$.history = ouija({ action: 'search', query: 'architecture decisions', limit: 5 });
// continue with other work immediately...
const files = await Glob({ pattern: '**/*.ts' });

// Call 2 — pick up results (instant if already resolved)
const [search, history] = await Promise.allSettled([$.search, $.history]);
```

This enables parallel I/O across calls — fire multiple slow operations, do other work, collect results later.

### Example
```javascript
// Find all TypeScript files with TODO comments
const result = await rg({ args: '-l "TODO" --glob "*.ts"' });
const files = result.trim().split("\\n").filter(Boolean);

for (const file of files) {
  const content = await Read({ path: file });
  const todos = content.split("\\n")
    .map((line, i) => ({ line: i + 1, text: line.trim() }))
    .filter(({ text }) => text.includes("TODO"));
  if (todos.length > 0) {
    console.log(`\\n## \${file}`);
    todos.forEach(t => console.log(`  L\${t.line}: \${t.text}`));
  }
}
```

### Session management

The `session` object gives you programmatic access to your conversation context:

```javascript
// Inspect your context
const msgs = session.messages();       // all conversation messages
const usage = session.tokens();        // { tokens, contextWindow }
const tags = session.tags();           // all tags/milestones

// Manage context
session.tag("before-refactor");        // bookmark current position

// Persist data across reloads (writes to session file)
session.save("ctx", { goal: "...", decisions: [...] });
const ctx = session.load("ctx");       // restore after reload
```

`$` survives both compaction AND reload/resume: every JSON-serializable var is snapshotted to a session-scoped file and hydrated back when the store is rebuilt, so worktree paths, parsed configs, and results stay put for the whole session. The one limit: promises/functions can't be serialized, so they persist across `execute_code` calls in-process but are recreated (not restored) after a reload — re-fire them if you need them post-reload. `session.save()` remains available for explicit, structured durable records.

### Context Management

Your context window is finite. Squash proactively at natural boundaries — after finishing research, completing a milestone, or when context feels heavy. The three-phase flow lets you review what's about to be lost, preserve what matters, and then compact.

**Two preservation modes — use both when they apply:**

1. **Pin by reference (default, zero output-token cost).** Pick messages from the outline by ID and drop them into `$.pinned` verbatim. No paraphrasing.
2. **Narrative synthesis (only when you need to compress).** Write a thick `$.ctx` string — gotchas, dead ends, line numbers. Use when 40 messages collapse to one takeaway.

```javascript
// Phase 1 — review what's about to be lost
session.preCompact();
// → $.preCompact = { outline: "[id123 · user] ...", messageCount: 42 }

// Phase 2a — REFERENCE: pin specific messages by ID (verbatim, no rewrite)
session.pin(["id5", "id12", "id18"]);
// → $.pinned = [{ id, role, content, timestamp }, ...]  survives squash

// Phase 2b — NARRATIVE: synthesize only what reference can't express
$.ctx = `DB MIGRATION — mid-stream
Gotcha: sessions.token_hash column — NOT token — migration uses wrong column name, see line 47
Dead end: tried batching inserts — FK constraint violation on sessions.user_id
Next: fix column name at migrate.ts:47, then run test suite`;

// Phase 3 — compact and auto-continue
session.squash({ continue: "Squash done. Fix token_hash column at migrate.ts:47. Pinned refs in $.pinned." });
```

**Rule of thumb:** pin first (cheap, verbatim), narrative only for the delta your pins can't carry.

Bad `$.ctx` loses everything: `{ goal: "migration", progress: "50%" }`
Good `$.ctx` preserves understanding: narrative with gotchas, dead ends, specific line numbers, and what to do next.

**Quick tools:** `contextTag({ name: "..." })` · `contextLog({ limit: 30 })` · `contextCheckout({ target, message })`

**Thresholds:** 📊 ≥50% tag your position · 🙈 ≥70% write thick `$` vars · 🚨 ≥80% squash now · 💀 ≥90% squash immediately

### Ouija — session history search 🔮

Search all pi session history — including dead sessions. BM25 ranked.

```javascript
// Search across all sessions
const r1 = await ouija({ action: "search", query: "teams ghost worker" });

// Search your own live session
const r2 = await ouija({ action: "self", query: "ouija skull context" });

// Find entries in a specific session
const r3 = await ouija({ action: "grep", session: "0fe1623e", query: "context window" });

// Read entries from any session (dead or alive)
const r4 = await ouija({ action: "view", session: "0fe1623e", start: 720, end: 730 });

// Browse sessions for a project
const r5 = await ouija({ action: "list", project: "trek", since: "2026-04-01", limit: 10 });

// Search any array of text on the fly
const msgs = session.messages();
const r6 = await ouija({ action: "grep", entries: msgs, query: "worker lifecycle" });
```

**Builder chain:** `search`, `self`, and `grep` return arrays you can chain:

```javascript
const hits = await ouija({ action: "self", query: "teams lifecycle" });
hits.rerank({ recency: { hours: 6 } }) // boost recent
hits.limit(3)                            // top 3
hits.text()                              // formatted string
hits.json()                              // plain JSON
// Drill down:
// ouija({ action: "view", session: hits[0].session, start: -5, end: 0 })
// ouija({ action: "grep", session: hits[0].session, query: "term" })
```

**Pipe mode:** Pass an array first → BM25 any data. Pass an object first → session mode.

```javascript
const hits = await ouija(tickets, ouija.tickets, "ghost debris");
const hits = await ouija(messages, ouija.session, "architecture decision");
const hits = await ouija(data, { fields: { title: 3, body: 1 } }, "query");
// Shapes: ouija.tickets, .session, .code, .docs, .logs, .lines
```
