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

Some tools are intentionally NOT in the sandbox — use direct tool calls for: teams, context_tag, context_log, context_checkout, editor_*, mesh_*, git-ai, apply_patch, experiments (init/run/log), hotseat_*, start_supervision.