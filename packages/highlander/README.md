# @pi-extensions/highlander

**There can be only one.** 🔪

BM25 search across all pi session history. `mesh_view` for dead sessions.

## What it does

Agents forget everything between sessions. Foresight saves curated memories — but not the raw conversation: the debug trails, the rejected alternatives, the "why did we do X" that never made it into a memory node.

Highlander searches that raw history. BM25-ranked, across every session, every project.

## Actions

### search — find sessions by content
```javascript
const hits = await highlander({ action: "search", query: "teams ghost worker", limit: 5 });
```
BM25 across all sessions. Returns ranked hits with snippet context.

### self — search the current live session
```javascript
const hits = await highlander({ action: "self", query: "highlander skull context" });
```
Search your own conversation. No session ID needed.

### grep — find entries in a specific session
```javascript
const hits = await highlander({ action: "grep", session: "0fe1623e", query: "context window" });
```
Returns matching entry numbers for targeted drill-down.

Also accepts ad-hoc entries for BM25 over arbitrary text:
```javascript
const msgs = session.messages();
const hits = await highlander({ action: "grep", entries: msgs, query: "worker lifecycle" });
```

### view — read entries from any session
```javascript
const ctx = await highlander({ action: "view", session: "0fe1623e", start: 720, end: 730 });
```
Like `mesh_view` but the session doesn't need to be alive.

### list — browse sessions
```javascript
const sessions = await highlander({ action: "list", project: "trek", since: "2026-04-01", limit: 10 });
```

## Chainable results

`search`, `self`, and `grep` return arrays of hit objects with methods:

```javascript
const hits = await highlander({ action: "self", query: "teams lifecycle", limit: 5 });

// Browse results
console.log(hits);           // formatted text output
console.log(hits[0]);        // single hit with index, label, text, session

// Drill down
await hits[0].expand({ context: 5 });  // ±5 entries around this hit
await hits[0].expand({ context: 20 }); // wider context

// Format control
hits.text();                 // raw formatted string
hits.json();                 // clean JSON array (no methods)

// Cross-session: search results also have .grep()
const sessions = await highlander({ action: "search", query: "mesh reliability" });
await sessions[0].grep("tell timeout");  // grep inside that specific session
```

### Typical workflow

```javascript
// 1. Search — what sessions talked about this?
const sessions = await highlander({ action: "search", query: "fork mode decision" });

// 2. Grep — find the exact entries in the best match
const entries = await highlander({ action: "grep", session: sessions[0].session, query: "fork" });

// 3. Expand — read the full context around the key entry
const context = await entries[2].expand({ context: 10 });
console.log(context);
```

Or in one shot from the current session:
```javascript
const hits = await highlander({ action: "self", query: "architecture decision" });
console.log(await hits[0].expand({ context: 10 }));
```

## How it works

1. Reads `~/.pi/agent/sessions/*/.session-index.json` — already contains `allMessagesText`
2. Builds in-memory BM25 index (name 3×, firstMessage 2×, allMessagesText 1×)
3. Index caches for 30s
4. Entry reading reuses `shared/session-view` projection

No database. No embeddings. No external deps. Pure TypeScript + BM25.

Uses the same BM25 engine as [maitake](https://github.com/nicobailon/maitake)'s ticket search — ported to TypeScript in `shared/src/bm25.ts`.
