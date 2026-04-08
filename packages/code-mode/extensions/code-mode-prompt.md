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

Regular `const`/`let` variables are local to each code block. Only `$` persists — with no time limit, only a 50MB memory cap.

Top-level `const`/`let`/`var` declarations (not inside functions/loops/if-blocks) are automatically persisted to `$` at the end of each call. So `const sm = await Read(...)` makes `$.sm` available in the next call.

Top-level `function` declarations are also auto-persisted. So `function helper() { ... }` makes `$.helper()` callable in subsequent calls.

### Memory Management

`$` variables persist indefinitely until total memory exceeds 50MB. When the cap is hit, least-recently-used unpinned variables are evicted first. You'll see:
```
⏳ $.bigData EVICTED to free memory (was 12.5MB, last used 30 turns ago). Use $.__pin('bigData') to protect.
```

- **Variables don't expire from time** — only from memory pressure
- **`$.__pin('name')`** — protect from eviction (pinned vars survive even at 50MB)
- **`$.__unpin('name')`** — make subject to memory eviction again
- **`$.__status()`** — show all variables, sizes, and total memory used
- **`$.__reset()`** — clear all persistent state
- **`$.__keys()`** — list all variable names

```typescript
{{CODE_MODE_DECLARATIONS}}```

### When to use `$`

Use `$` for any data you need across multiple code blocks:

- **Multi-step workflows**: reading files in one block, processing in another
- **Error recovery**: store progress so you can resume after a crash  
- **Caching**: avoid re-reading or re-computing expensive things
- **Accumulating results**: building up arrays/maps across iterations

Use `console.log()` for final output you want the user to see. You can do both in one line:
`$.data = await Read({...}); console.log($.data);` — store AND display.

**Don't** do this (re-reads every call, loses state on errors):
```
// Call 1
const files = await Glob({ pattern: '**/*.ts' });
const content = await Read({ path: files[0] });
console.log(content);  // gone after this call

// Call 2
const content2 = await Read({ path: files[0] });  // re-reading!
console.log(content2);
```

**Do** this instead (stores once, survives errors):
```
// Call 1
$.files = await Glob({ pattern: '**/*.ts' });
$.content = await Read({ path: $.files[0] });
console.log($.content);

// Call 2 — $.files and $.content still here, no re-reading
$.content2 = await Read({ path: $.files[1] });
console.log($.content, $.content2);
```

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

Your conversation context is finite. When it fills up, model quality degrades ("context rot"). You have tools to manage this.

**The lifecycle:** tag → work → squash → continue. Squash proactively during long sessions, not just at warning thresholds.

#### When to squash

Don't wait for warning emojis. Squash at natural boundaries:
- **Finished a research phase** — read 10 files, understood the architecture, ready to implement
- **Completed a milestone** — feature works, tests pass, about to start next feature
- **After a complex debugging session** — found root cause, fix applied, ready to move on
- **Context feels heavy** — you're re-reading old messages to remember what you decided

#### How to squash well

The LLM summary captures WHAT happened. It WILL MISS the why, the dead ends, the "almost worked" attempts, and the implicit understanding you've built. That's what `$` is for.

**Bad `$.ctx` — shallow metadata (loses everything that matters):**
```javascript
$.ctx = { goal: "fix auth", files: ["auth.ts"], progress: "50%" };
```

**Good `$.ctx` — thick narrative with gotchas:**
```javascript
$.ctx = `AUTH REFACTOR — mid-stream
Goal: Replace session cookies with JWT + refresh token rotation
Done: JWT signing works (HS256, secret from env.JWT_SECRET), login/logout endpoints updated
In progress: Refresh token rotation — store hashed tokens in DB, not plain text. See src/auth.ts:142
Gotchas:
  - refreshTokens table uses token_hash not token — wasted 20 min debugging this
  - Old session cookie middleware still runs on /health — DO NOT remove, load balancer needs it
  - User model has no .tokenVersion field yet — need migration before deploying
Dead ends: cookie approach (mobile clients can't do cookies), plain tokens in Redis (security rejected)
Next: Write refresh token rotation logic at src/auth.ts:142, then DB migration for tokenVersion`;
```

#### The two-phase squash

**Phase 1** — `session.squash()` builds an outline and stashes it in `$.preCompact`. No compaction happens yet.

**Phase 2** — You review what might be lost, write thick context to `$`, then `session.squash({ continue: "..." })` applies compaction and auto-continues with your message.

```javascript
// Phase 1 — generate outline
session.squash();

// Next turn: review and preserve
console.log($.preCompact.messageCount);  // how many messages will be summarized
// Write thick context NOW — this is your only chance
$.ctx = "AUTH REFACTOR mid-stream... (thick narrative with gotchas, dead ends, next steps)";

// Phase 2 — apply compaction + auto-continue
session.squash({ continue: "Squash done. Continue implementing refresh token rotation at src/auth.ts:142." });
```

The `continue` message is injected as a user message after compaction, so you automatically pick up where you left off. Write it like a handoff note to your future self.

#### Quick tools

**Tag bookmarks:** `contextTag({ name: "before-refactor" })`
**View history:** `contextLog({ limit: 30 })`
**Branch/squash segment:** `contextCheckout({ target: "before-refactor", message: "Refactor done. Next: write tests." })`

#### Warning thresholds

- 📊 ≥30%: tag your position, start being mindful
- 🙈 ≥40%: write thick `$` vars, prepare to squash
- 🚨 ≥70%: `session.squash()` now
- 💀 ≥90%: `session.squash()` IMMEDIATELY — you are about to lose context

Some tools are intentionally NOT in the sandbox — use direct tool calls for: teams, context_tag, context_log, context_checkout, editor_*, mesh_*, git-ai, apply_patch, experiments (init/run/log), hotseat_*, start_supervision.

Most passthrough tools are also available as sandbox functions (camelCase): meshTell, meshAsk, meshPeers, meshView, meshChat, meshBroadcast, meshReply, meshJoinChannel, meshLeaveChannel, editorOpen, editorHighlight, editorReveal, editorState, gitAi, hotseatHandbookUpdate, hotseatHandbookRead, highlander. These call the registered tools directly.

### Highlander — session history search 🔪

Search dead sessions, grep the current live session, or pass arbitrary entries for ad-hoc BM25.

```javascript
// Search across all sessions
const r1 = await highlander({ action: "search", query: "teams ghost worker" });

// Search the current live session (no session ID needed)
const r2 = await highlander({ action: "self", query: "highlander skull context" });

// Grep a specific session's entries
const r3 = await highlander({ action: "grep", session: "0fe1623e", query: "context window" });

// Read entries from any session by index
const r4 = await highlander({ action: "view", session: "0fe1623e", start: 720, end: 730 });

// Ad-hoc BM25 over arbitrary text — e.g. session.messages()
const msgs = session.messages();
const r5 = await highlander({ action: "grep", entries: msgs, query: "worker lifecycle" });
```

**Chainable results:** `search`, `self`, and `grep` return arrays of hit objects with methods:

```javascript
const hits = await highlander({ action: "self", query: "teams lifecycle" });
hits.rerank({ recency: { hours: 6 } }) // boost recent sessions
hits.limit(3)                         // keep top 3
hits.text()                           // raw formatted string
hits.json()                           // clean JSON (no methods)
// Drill down with explicit calls:
// highlander({ action: "view", session: hits[0].session, start: -5, end: 0 })
// highlander({ action: "grep", session: hits[0].session, query: "term" })
```
