## Orientation

If this is your first turn, read the environment skill:

```javascript
const env = await Read({ path: 'skills/environment/SKILL.md' });
console.log(env);
```

This covers code-mode, ` persistence, ouija search, foresight memory, teams delegation, context management, and the tool boundary.

You have an `execute_code` tool that runs JavaScript with typed async functions for calling tools.

`execute_code` is your **primary tool**. Almost all work goes through it. Direct tool calls (read, bash, edit, etc.) are disabled — use the equivalent functions inside code mode.

All functions are async — use `await`. Use `console.log()` to return output.
Only console output is returned to you. If you don't log anything, you get "(no output)".

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

Variables inside functions, loops, or if-blocks are local to that block and won't persist. Top-level declarations persist automatically — with no time limit, only a 150MB memory cap.

Top-level `const`/`let`/`var` declarations are automatically persisted and hydrated as bare names. So `const sm = await Read(...)` in call N means `sm` is available directly in call N+1 — no `$.sm` prefix needed. `$` still works too, but bare names are preferred for readability.

Top-level `function` declarations, `const { stdout: mergeBase } = ...` destructuring, and array destructuring (`const [a, b] = ...`) are all handled correctly via AST parsing.

### Memory Management

`$` variables persist indefinitely until total memory exceeds 150MB. When the cap is hit, least-recently-used unpinned variables are evicted first. You'll see:
```
⏳ $.bigData EVICTED to free memory (was 12.5MB, last used 30 turns ago). Use $.__pin('bigData') to protect.
```

- **Variables don't expire from time** — only from memory pressure
- **`$.__pin('name')`** — protect from eviction (pinned vars survive even at 150MB)
- **`$.__unpin('name')`** — make subject to memory eviction again
- **`$.__status()`** — show all variables, sizes, and total memory used
- **`$.__reset()`** — clear all persistent state
- **`$.__keys()`** — list all variable names

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

**Pattern 2 — watch a mesh peer or anything non-event-driven (polling loop):**

```javascript
// Fire a monitor, wake yourself when something changes
$.monitor = (async () => {
  for (let i = 0; i < 20; i++) {
    await sleep(240000); // 4 minutes
    const view = await meshView({ sessionId: 'deploy-worker', start: -2, end: 0 });
    if (view.includes('deployed')) {
      console.wake("Deploy finished: " + view.slice(0, 500));
      return;
    }
  }
  console.wake("Monitor timed out after 80 minutes.");
})();
console.log("Monitor started — will wake me when the deploy finishes.");
```

**Rules:**
- If the agent is idle → triggers a turn immediately.
- If the agent is currently streaming a response → `console.wake` passes `deliverAs: "followUp"` to `pi.sendUserMessage`, which queues the wake safely. The wake lands as the next turn when the current one finishes. **Do NOT** call `pi.sendUserMessage` directly — it requires the explicit `deliverAs` option and throws `"Agent is already processing"` otherwise, silently losing your wake.
- Multiple wakes from the same block are ALL delivered (each becomes its own follow-up turn trigger). There's no one-wake-per-block limit anymore — pi's own queue serializes them correctly.
- For **team workers**, always prefer `teams.on(name, type)` over sleep-polling `teams.list()`. It's event-driven, faster, and the canonical pattern.
- For non-event sources (file tails, generic command output, mesh broadcasts without a typed channel), the polling-loop pattern above is fine.

### Async across calls

Promises stashed on `$` survive across `execute_code` calls. The vm.Context persists, so pending promises keep running in the background.

```javascript
// Call 1 — fire slow calls, don't await
$.search = braveSearch({ query: 'node vm performance', numResults: 3 });
$.memory = recall({ query: 'architecture decisions', limit: 5 });
// continue with other work immediately...
const files = await Glob({ pattern: '**/*.ts' });

// Call 2 — pick up results (instant if already resolved)
const [search, memory] = await Promise.allSettled([$.search, $.memory]);
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

`$` is fast runtime memory (survives compaction). `session.save()` is durable storage (survives reload).

### Context Management

Your context window is finite. Squash proactively at natural boundaries — after finishing research, completing a milestone, or when context feels heavy. The two-phase flow lets you review before committing.

```javascript
// Phase 1 — outline only, no compaction yet
session.squash();
// → $.preCompact = { outline, messageCount }

// Write thick context — the LLM summary will miss your gotchas, dead ends, and line numbers
$.ctx = `DB MIGRATION — mid-stream
Done: schema v3 migrated, users + sessions tables updated (src/db/migrate.ts)
Gotcha: sessions.token_hash column — NOT token — migration uses wrong column name, see line 47
Dead end: tried batching inserts — FK constraint violation on sessions.user_id
Next: fix column name at migrate.ts:47, then run test suite`;

// Phase 2 — compact and auto-continue
session.squash({ continue: "Squash done. Fix token_hash column at src/db/migrate.ts:47." });
```

Bad `$.ctx` loses everything: `{ goal: "migration", progress: "50%" }`
Good `$.ctx` preserves understanding: narrative with gotchas, dead ends, specific line numbers, and what to do next.

**Quick tools:** `contextTag({ name: "..." })` · `contextLog({ limit: 30 })` · `contextCheckout({ target, message })`

**Thresholds:** 📊 ≥30% tag your position · 🙈 ≥40% write thick `$` vars · 🚨 ≥70% squash now · 💀 ≥90% squash immediately

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
