---
name: environment
description: Working in the pi-extensions environment — code-mode, persistence, memory, search, delegation, and context management. Read this first.
metadata:
  summary: "Orientation guide for agents working in pi-extensions. Code-mode paradigm, $ persistence, ouija session-history search, teams delegation, context hygiene."
  type: guide
  domains: [onboarding, tools]
  audience: worker
---

# The pi-extensions Environment

You're working in pi-extensions — a monorepo of 32 packages that extend the pi coding agent. This environment gives you tools most agents never see. Here's how to use them.

## The big idea: code-mode

You have one tool that matters: `execute_code`. Every file read, bash command, edit, grep — it all goes through code blocks. You write JavaScript, not tool calls.

```javascript
// Everything is one code block. Loop, branch, await — it's just code.
const files = await Glob({ pattern: '**/*.ts' });
for (const f of files) {
  const content = await Read({ path: f });
  if (content.includes('TODO')) console.log(f);
}
```

**Why this matters:** One code block does what used to take 11 turns. Read 5 files, decide, edit them all — one block. The LLM thinks less, does more.

## Your working memory: $

Variables on `$` survive between code blocks. Regular `const` doesn't.

```javascript
// Call 1
$.files = await Glob({ pattern: '**/*.ts' });
$.content = await Read({ path: $.files[0] });

// Call 2 — $.files and $.content are still there
$.content2 = await Read({ path: $.files[1] });
```

This matters most when something crashes. `$` survives errors. Pick up where you left off — don't re-read files, don't re-compute.

Pin what matters: `$.__pin('importantData')` protects it from memory eviction.

## Search your history: ouija 🔮

You can search every conversation you've ever had — including sessions that ended hours ago. BM25 ranked, no database.

```javascript
// What sessions talked about this topic?
const hits = await ouija({ action: "search", query: "teams ghost worker", limit: 5 });

// Search your own live session
const self = await ouija({ action: "self", query: "BM25 engine" });

// Read a dead session's entries
const ctx = await ouija({ action: "view", session: hits[0].session, start: -10, end: 0 });

// Browse sessions for a project
const sessions = await ouija({ action: "list", project: "trek", since: "2026-04-01" });
```

Chain results: `hits.rerank({ recency: { hours: 6 } }).limit(3).text()`

Or BM25-search any array of objects:
```javascript
const hits = await ouija(tickets, ouija.tickets, "ghost debris");
```

**When to use it:** Before starting work on a topic you think might have come up before. Someone may have already debugged it, decided against it, or left notes about it.

## Remember by searching session history: ouija 🔮

Ouija is the default way to remember what happened before. It searches raw session history, including compacted and dead sessions, so future agents can recover the actual conversation instead of relying on a curated summary.

```javascript
// Search prior sessions before starting work
const prior = await ouija({ action: "search", query: "authentication decision", limit: 5 });

// Search this session when the user says "as mentioned before"
const local = await ouija({ action: "self", query: "token_hash column" });

// Record durable decisions in mai, then make them easy to find later
await mai.note(ticketId, "ADR breadcrumb: auth uses sessions.token_hash, not token");
```

**When to use it:** Before starting work, when a topic may have come up before, or when you need a prior decision/gotcha. Put durable records in `mai`; use `ouija` to recover the raw trail later.

## Delegate work: teams

You can spawn other agents to work in parallel. Each gets its own git worktree and pi session.

```javascript
await teams({
  action: "delegate",
  tasks: [
    // Preferred: use a team template — the model-router picks the model
    { text: "Rewrite the README for the auth package", assignee: "docs-worker", template: "implementer" },
    { text: "Fix the type errors in src/api.ts", assignee: "fix-worker", template: "fix" }
  ]
});
```

**Use `template` instead of `model`** — it resolves through `~/.pi/agent/team-templates.json` so model picks stay current. Only pass `model: "..."` directly when you need to pin a specific model for a specific reason (the router never overrides explicit pins).

### Waiting for workers — `teams.on(...)`

`teams.delegate(...)` returns after spawning, not after workers finish. Workers run in separate sessions. To wait for one, **do not sleep-poll** — subscribe to the worker's event stream with `teams.on()`.

Two patterns depending on how long you expect to wait.

---

#### Pattern A: In-turn await (preferred for < 30 min waits)

**`await` inside `execute_code`.** The agent stays "busy" in the tool call until the event fires. No supervisor management needed — the supervisor only fires when the agent goes idle between turns.

```javascript
// Spawn three workers — use templates so the model-router stays current
await teams.delegate([
  { text: "Implement feature A", assignee: "impl-a", template: "implementer" },
  { text: "Implement feature B", assignee: "impl-b", template: "implementer" },
  { text: "Review architecture", assignee: "review", template: "review" },
]);

// Race — first worker to complete wakes us up, still inside this block
const first = await Promise.race([
  teams.on("impl-a", "completed").preventDefault().timeout(15 * 60 * 1000),
  teams.on("impl-b", "completed").preventDefault().timeout(15 * 60 * 1000),
  teams.on("review", "completed").preventDefault().timeout(15 * 60 * 1000),
]);

console.log(`${first.worker.name} finished first:`, first.result.slice(0, 500));
// Agent is still in-turn — can immediately act on the result, merge, spawn next wave, etc.
```

**Why this is better than the background-wake pattern for short/medium waits:**
- No `supervise(false)` needed — agent never goes idle, supervisor never fires.
- No `console.wake` needed — result is inline, available immediately.
- Composable — `Promise.all`, `Promise.race`, `Promise.allSettled` all Just Work.
- Agent can act on the result immediately in the same block (merge, spawn reviewers, read results, etc.) without burning a turn boundary.

**When NOT to use it:** if you expect to wait 30+ minutes, blocking a tool call for that long is wasteful — context is "in flight" and the user can't interact with the agent. Use pattern B instead.

---

#### Pattern B: Background wake (for long waits or fire-and-forget)

**Arm a subscription, end the block, go idle.** Agent yields the turn. When the event fires, `console.wake()` triggers a fresh turn.

```javascript
await teams.delegate([
  { text: "Big refactor job", assignee: "refactor", template: "implementer" },
]);

// CRITICAL: turn off supervisor before going idle, otherwise it spams
// "[SUPERVISOR] continue, go" every few seconds, eating context.
await supervise(false);

// Arm the subscription — fires console.wake when the worker completes.
// Works even after this execute_code block returns.
teams.on("refactor", "completed")
  .preventDefault()
  .timeout(60 * 60 * 1000)
  .then(
    (e) => console.wake(`refactor done: ${e.result.slice(0, 500)}`),
    (err) => console.wake(`refactor timed out: ${err.message}`),
  );

console.log("Worker spawned, supervisor off, subscription armed. Going idle.");
// Block ends here. Agent goes idle. console.wake triggers a new turn later.
```

**`supervise(false)` is MANDATORY for pattern B.** Without it, the supervisor injects `[SUPERVISOR] continue, go` every few seconds while the agent is idle, burning context with empty turns. Turn it off before going idle, turn it back on when you resume working.

---

#### Other subscription shapes

```javascript
// Wait for ALL workers (pattern A style)
const [a, b, c] = await Promise.all([
  teams.on("impl-a", "completed").preventDefault().timeout(30 * 60 * 1000),
  teams.on("impl-b", "completed").preventDefault().timeout(30 * 60 * 1000),
  teams.on("review", "completed").preventDefault().timeout(30 * 60 * 1000),
]);

// Stream every comment/note from a worker as it arrives (not one-shot)
teams.on({ name: "oracle", type: "comment" })
  .preventDefault()
  .each(e => console.log("oracle note:", e.comment.slice(0, 200)));

// Wait on a regex match against worker note bodies
await teams.on({ name: "oracle", comment: /DONE:|FINAL:/ })
  .preventDefault()
  .timeout(300_000);
```

---

#### Quick reference: which pattern?

| Situation | Pattern | Supervisor |
|---|---|---|
| Short wait (< 10 min), need result immediately | **A** — `await` in-turn | Leave on (agent stays busy) |
| Multiple workers, race for first result | **A** — `Promise.race([teams.on(...), ...])` | Leave on |
| Long wait (30+ min), fire-and-forget | **B** — `.then(e => console.wake(...))` | **`supervise(false)` before going idle** |
| Babysitting (stream notes as they arrive) | **A** or **B** with `.each()` | Depends on whether you're blocking |

---

**Key rules:**
- `teams.on(name, type)` is **the** way to wait for a worker lifecycle event. Don't sleep-poll `teams.list()`.
- `console.wake()` is the canonical wake primitive for background wakes. Call it from inside `.then()` or `.each()` — it queues via `deliverAs: "followUp"` and works even when the agent is mid-turn.
- Chain `.preventDefault()` when you're handling the event yourself — avoids duplicate leader batch wakes.
- Chain `.timeout(ms)` on every subscription. Silent hangs are worse than a loud timeout.
- `supervise(false)` is only needed for pattern B (background wake). Pattern A (in-turn await) doesn't need it.
- Event types: `completed | turn_finished | warning | failed | stuck | comment | alive`.
- Filter shapes: `teams.on("name")` · `teams.on("name", "type")` · `teams.on({ name, type, comment: /regex/ })` · `teams.on({ predicate: e => ... })`.
- For the full orchestration loop (implement → review → gate → next), see the 90-building-with-teams playbook.

## Context management: don't let the window fill up

Your context window is finite. Watch the percentage in the footer:

- **≥30%** — tag your position: `session.tag("before-refactor")`
- **≥40%** — start writing thick `$` vars with gotchas and line numbers
- **≥70%** — squash now: `session.squash()`
- **≥90%** — squash immediately, no excuses

When you squash, write narrative context — not metadata. Bad: `{ progress: "50%" }`. Good: `"Migrated users table. Gotcha: sessions.token_hash — NOT token — line 47. Next: fix column name."`

## Code analysis: tldr

Structural code analysis without guessing:

```javascript
// Find functions by what they do
const results = await tldrSemanticSearch({ query: "authentication middleware", k: 5 });

// See the structure of a file
const structure = await tldrStructure({ path: "src/auth.ts" });

// Who calls this function?
const callers = await tldrImpact({ func: "validateToken", path: "src/" });

// Find dead code
const dead = await tldrDead({ path: "src/" });
```

## File search: fff

Faster than ripgrep for most searches, ranked by recency:

```javascript
// Find files by name (fuzzy)
const files = await fffFind({ query: "auth middleware" });

// Search content
const hits = await fffGrep({ query: "validateToken" });

// Multiple patterns at once
const hits = await fffMultiGrep({ patterns: ["validateToken", "validate_token"] });
```

## Shell commands: `Bash` vs `bashBgStart` — don't freeze the TUI

`execute_code` runs synchronously from the TUI's perspective. Every `await` you write can block the TUI until it resolves. `execute_code` has **no default timeout** — there's no rescue if your await never returns.

**The trap:** `bashBgStart` now returns a thenable handle. `await bashBgStart({ command: "npm run dev" })` looks like a normal `await Bash(...)` but waits for child exit forever. Dev servers never exit. TUI hangs until `/cancel`.

### Decision matrix

| Command kind | Tool | Pattern |
|---|---|---|
| Quick, <30s | `Bash` | `await Bash({ command })` |
| Medium, 30s–10min, exits | `bashBgStart` + deadline | `await bashBgStart({ command }).timeout(600_000)` |
| Long, eventually exits | `bashBgStart` + react | `bashBgStart({ command }).each(line=>…).then(r=>console.wake(…))` |
| Never exits (dev, watcher) | `bashBgStart` no await | `const dev = bashBgStart({ command });` … `await dev.stop()` |

### Do

```javascript
// Short, foreground
const r = await Bash({ command: "git rev-parse HEAD" });

// Bounded wait — releases at deadline with status: "timeout" if the child outlives it
const r = await bashBgStart({ command: "cargo build" }).timeout(600_000);

// Fire-and-react — block ends now, wake when done. supervise(false) is mandatory if you're going idle.
await supervise(false);
bashBgStart({ command: "./bounce.sh" })
  .each(line => console.log(line))
  .then(r => console.wake(`bounce done: exit=${r.exitCode}`));

// Dev server — no await, no .then
const dev = bashBgStart({ command: "npm run dev" });
// later: await dev.stop();
```

### Don't

```javascript
await Bash({ command: "cargo build", timeout: 3600 });   // 1-hour TUI freeze
await bashBgStart({ command: "npm run dev" });           // forever TUI freeze
await bashBgStart({ command: "./bounce.sh" });           // bounce-length TUI freeze
```

If you can't promise "definitely under 30s and definitely exits," default to `bashBgStart` with a `.timeout(ms)` or `.then(cb)`.

If the WHOLE block is long (cold build + deploy + bounce, multi-step monitoring), fire the whole `execute_code` async:

```json
{ "tool": "execute_code", "args": { "code": "...long pipeline...", "async": true } }
```

You get a jobId back instantly; the result delivers as a follow-up turn.

To inspect or kill an in-flight job, use the **direct tools** `execute_code_async_list` / `execute_code_async_kill` (they bypass the mutex). The sandbox-function equivalents `executeCodeAsyncList()` / `executeCodeAsyncKill(jobId)` are also exposed but only useful AFTER a job has delivered, since a fresh execute_code call would wait on the mutex.

Concurrent `execute_code` calls serialize on a per-session mutex — a sync call after an in-flight async one waits for it.

## The tool boundary

Some tools only work inside `execute_code` (Read, Write, Edit, Bash, Glob, etc). Others are direct LLM tools (teams, editor_*, mesh_*, git-ai). Most direct tools have sandbox wrappers with the same name in camelCase: `meshTell`, `editorOpen`, `gitAi`.

## Git safety

Destructive git commands (`push --force`, `reset --hard`, writing to `.git/`) are blocked in code-mode. The user has to run those manually. Don't try to work around it — ask them.

## Quick reference

| Want to... | Use |
|---|---|
| Read files | `Read({ path })` in execute_code |
| Short shell command | `Bash({ command })` — 30s default, NEVER raise timeout past ~60s |
| Long shell command | `bashBgStart({ command }).timeout(ms)` or `.each(cb).then(cb)` — never bare `await` for >30s |
| Long WHOLE block | `execute_code({ code, async: true })` — returns jobId, result delivered as follow-up turn |
| Inspect / kill an IN-FLIGHT async exec | direct tools `execute_code_async_list` and `execute_code_async_kill` — bypass the mutex |
| Inspect / kill AFTER an async exec delivered | sandbox fns `executeCodeAsyncList()` / `executeCodeAsyncKill(jobId)` — needs an execute_code call |
| Search session history | `ouija({ action: "search", query })` |
| Search prior context | `ouija({ action: "search", query })` |
| Record a learning | `mai.note(ticketId, "...")`, then find it later with `ouija` |
| Spawn a worker | `teams.delegate([{ text, assignee, model }])` |
| Wait for worker to finish | `teams.on(name, "completed").preventDefault().then(e => console.wake(...))` — no polling |
| Check worker status | `teams.list()` or `teams.view(name)` |
| Resume from background | `console.wake("message")` in execute_code — triggers a new turn |
| Control auto-continue | `supervise(true/false)` — turn off while waiting for workers |
| Analyze code structure | `tldrSemanticSearch({ query })` |
| Find files fast | `fffFind({ query })` |
| Check context usage | `session.tokens()` |
| Compact context | `session.squash()` |
| Open a file in editor | `editorOpen({ file })` — direct tool |
| Check who wrote code | `gitAi({ command: "blame", args: [file] })` — direct tool |
