# @pi-extensions/ouija

**There can be only one.** 🔮

BM25 search across all pi session history.

## Why

Agents forget between sessions. Foresight saves curated memories — not the raw conversation: the debug trails, the rejected alternatives, the "why did we do X" that never made it into a memory node.

Ouija searches that raw history. Every session. Every project.

## Actions

### search — find sessions by content
```javascript
const hits = await ouija({ action: "search", query: "teams ghost worker", limit: 5 });
```
Search across all sessions. Ranked by relevance, with text snippets.

### self — search the current live session
```javascript
const hits = await ouija({ action: "self", query: "ouija skull context" });
```
Search your own conversation. No session ID needed.

### grep — find entries in a specific session
```javascript
const hits = await ouija({ action: "grep", session: "0fe1623e", query: "context window" });
```
Get matching entry numbers so you can drill down.

You can also search any array of text on the fly:
```javascript
const msgs = session.messages();
const hits = await ouija({ action: "grep", entries: msgs, query: "worker lifecycle" });
```

### view — read entries from any session
```javascript
const ctx = await ouija({ action: "view", session: "0fe1623e", start: 720, end: 730 });
```
Like `mesh_view` but works on dead sessions.

### list — browse sessions
```javascript
const sessions = await ouija({ action: "list", project: "trek", since: "2026-04-01", limit: 10 });
```

## Builder chain

`search`, `self`, and `grep` return arrays you can chain:

```javascript
const hits = await ouija({ action: "self", query: "teams lifecycle", limit: 5 });

hits.rerank({ recency: { hours: 6 } })  // boost recent sessions
hits.limit(3)                            // keep top 3
hits.text()                              // formatted string
hits.json()                              // plain JSON array
```

## Drill-down

Explore hits with a second call:

```javascript
const hits = await ouija({ action: "search", query: "fork mode decision" });

// Find exact entries in the best match
const entries = await ouija({ action: "grep", session: hits[0].session, query: "fork" });

// Read context around a key entry
const ctx = await ouija({ action: "view", session: hits[0].session,
  start: entries[2].index - 10, end: entries[2].index + 10 });
```

## Pipe mode

BM25-search any array of objects:

```javascript
// Tickets with built-in shape
const hits = await ouija(tickets, ouija.tickets, "ghost debris");

// Custom fields with weights
const hits = await ouija(
  [{ x: "hello", y: "world" }, { x: "foo", y: "bar" }],
  { fields: { x: 3, y: 1 } },
  "hello"
);
```

Shapes: `ouija.tickets`, `.session`, `.code`, `.docs`, `.logs`, `.lines`.

Pipe results support the same builder chain.

## How it works

1. Reads `~/.pi/agent/sessions/*/.session-index.json` — contains `allMessagesText`
2. Builds in-memory BM25 index (name 3×, firstMessage 2×, allMessagesText 1×)
3. Caches index for 30s
4. Entry reading reuses `shared/session-view` projection

No database. No embeddings. No external deps. Pure TypeScript + BM25.

Same engine as [maitake](https://github.com/nicobailon/maitake)'s ticket search, ported to TypeScript in `shared/src/bm25.ts`.
