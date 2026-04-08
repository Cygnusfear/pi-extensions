# @pi-extensions/highlander

**There can be only one.** 🔪

BM25 search across all pi session history.

## Why

Agents forget between sessions. Foresight saves curated memories — not the raw conversation: the debug trails, the rejected alternatives, the "why did we do X" that never made it into a memory node.

Highlander searches that raw history across every session, every project.

## Actions

### search — find sessions by content
```javascript
const hits = await highlander({ action: "search", query: "teams ghost worker", limit: 5 });
```
BM25 across all sessions. Returns ranked hits with snippets.

### self — search the current live session
```javascript
const hits = await highlander({ action: "self", query: "highlander skull context" });
```
No session ID needed.

### grep — find entries in a specific session
```javascript
const hits = await highlander({ action: "grep", session: "0fe1623e", query: "context window" });
```
Returns matching entry numbers for drill-down.

Pass ad-hoc entries to BM25-search arbitrary text:
```javascript
const msgs = session.messages();
const hits = await highlander({ action: "grep", entries: msgs, query: "worker lifecycle" });
```

### view — read entries from any session
```javascript
const ctx = await highlander({ action: "view", session: "0fe1623e", start: 720, end: 730 });
```
Like `mesh_view` but works on dead sessions.

### list — browse sessions
```javascript
const sessions = await highlander({ action: "list", project: "trek", since: "2026-04-01", limit: 10 });
```

## Builder chain

`search`, `self`, and `grep` return arrays with builder methods:

```javascript
const hits = await highlander({ action: "self", query: "teams lifecycle", limit: 5 });

hits.rerank({ recency: { hours: 6 } })  // boost recent sessions
hits.limit(3)                            // keep top 3
hits.text()                              // formatted string
hits.json()                              // plain JSON array
```

## Drill-down

Explore hits with explicit calls:

```javascript
const hits = await highlander({ action: "search", query: "fork mode decision" });

// Find exact entries in the best match
const entries = await highlander({ action: "grep", session: hits[0].session, query: "fork" });

// Read context around a key entry
const ctx = await highlander({ action: "view", session: hits[0].session,
  start: entries[2].index - 10, end: entries[2].index + 10 });
```

## Pipe mode

BM25-search any array of objects:

```javascript
// Tickets with built-in shape
const hits = await highlander(tickets, highlander.tickets, "ghost debris");

// Custom fields with weights
const hits = await highlander(
  [{ x: "hello", y: "world" }, { x: "foo", y: "bar" }],
  { fields: { x: 3, y: 1 } },
  "hello"
);
```

Shapes: `highlander.tickets`, `.session`, `.code`, `.docs`, `.logs`, `.lines`.

Pipe results support the same builder chain.

## How it works

1. Reads `~/.pi/agent/sessions/*/.session-index.json` — contains `allMessagesText`
2. Builds in-memory BM25 index (name 3×, firstMessage 2×, allMessagesText 1×)
3. Caches index for 30s
4. Entry reading reuses `shared/session-view` projection

No database. No embeddings. No external deps. Pure TypeScript + BM25.

Same engine as [maitake](https://github.com/nicobailon/maitake)'s ticket search, ported to TypeScript in `shared/src/bm25.ts`.
