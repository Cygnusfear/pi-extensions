---
name: environment
description: Working in the pi-extensions environment — code-mode, persistence, memory, search, delegation, and context management. Read this first.
metadata:
  summary: "Orientation guide for agents working in pi-extensions. Code-mode paradigm, $ persistence, ouija search, foresight memory, teams delegation, context hygiene."
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
```

Chain results: `hits.rerank({ recency: { hours: 6 } }).limit(3).text()`

Or BM25-search any array of objects:
```javascript
const hits = await ouija(tickets, ouija.tickets, "ghost debris");
```

**When to use it:** Before starting work on a topic you think might have come up before. Someone may have already debugged it, decided against it, or left notes about it.

## Remember across sessions: foresight

Foresight is your long-term memory. Decisions, learnings, gotchas — they survive session restarts.

```javascript
// Search what you've learned
const memories = await recall({ query: "authentication decision", limit: 5 });

// Store something important
await memoryCreate({
  factType: "experience",
  oneLiner: "Bun VM crashes on async closures from execute_code",
  summary: "Bun's vm.runInContext panics when async host closures are called. Use sync methods only, or route through the sandbox fn."
});

// Get relevant context at the start of a task
const ctx = await memoryContext({ task: "implementing JWT auth" });
```

**When to use it:** Anytime you learn something non-obvious. Failed approaches, surprising constraints, "the column is token_hash not token." Future you will thank you.

## Delegate work: teams

You can spawn other agents to work in parallel. Each gets its own git worktree and pi session.

```javascript
await teams({
  action: "delegate",
  tasks: [
    { text: "Rewrite the README for the auth package", assignee: "docs-worker", model: "zai/glm-5-turbo" },
    { text: "Fix the type errors in src/api.ts", assignee: "fix-worker", model: "anthropic/claude-sonnet-4-6" }
  ]
});
```

Workers report back via mesh channels. You get notified when they finish or fail.

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

## The tool boundary

Some tools only work inside `execute_code` (Read, Write, Edit, Bash, Glob, etc). Others are direct LLM tools (teams, editor_*, mesh_*, git-ai). Most direct tools have sandbox wrappers with the same name in camelCase: `meshTell`, `editorOpen`, `gitAi`.

## Git safety

Destructive git commands (`push --force`, `reset --hard`, writing to `.git/`) are blocked in code-mode. The user has to run those manually. Don't try to work around it — ask them.

## Quick reference

| Want to... | Use |
|---|---|
| Read files | `Read({ path })` in execute_code |
| Search session history | `ouija({ action: "search", query })` |
| Search long-term memory | `recall({ query })` |
| Store a learning | `memoryCreate({ factType, oneLiner, summary })` |
| Spawn a worker | `teams({ action: "delegate", tasks })` — direct tool |
| Analyze code structure | `tldrSemanticSearch({ query })` |
| Find files fast | `fffFind({ query })` |
| Check context usage | `session.tokens()` |
| Compact context | `session.squash()` |
| Open a file in editor | `editorOpen({ file })` — direct tool |
| Check who wrote code | `gitAi({ command: "blame", args: [file] })` — direct tool |
