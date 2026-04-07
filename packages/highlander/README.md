# @pi-extensions/highlander

**There can be only one.** 🔪

BM25 search across all pi session history. `mesh_view` for dead sessions.

## What it does

Agents forget everything between sessions. Foresight saves curated memories — but not the raw conversation: the debug trails, the rejected alternatives, the "why did we do X" that never made it into a memory node.

Highlander searches that raw history. BM25-ranked, across every session, every project.

## Actions

### search — find sessions by content
```javascript
highlander({ action: "search", query: "teams ghost worker", limit: 5 })
```
BM25 across all sessions. Returns ranked hits with snippet context and drill-down hints.

### self — search the current live session
```javascript
highlander({ action: "self", query: "highlander skull context" })
```
Grep the session you're in right now. No session ID needed.

### grep — find entries in a specific session
```javascript
highlander({ action: "grep", session: "0fe1623e", query: "context window" })
```
Returns matching entry numbers for targeted `view` calls.

Also accepts ad-hoc entries for BM25 over arbitrary text:
```javascript
const msgs = session.messages();
highlander({ action: "grep", entries: msgs, query: "worker lifecycle" })
```

### view — read entries from any session
```javascript
highlander({ action: "view", session: "0fe1623e", start: 720, end: 730 })
```
Like `mesh_view` but the session doesn't need to be alive.

### list — browse sessions
```javascript
highlander({ action: "list", project: "trek", since: "2026-04-01", limit: 10 })
```

## How it works

1. Reads `~/.pi/agent/sessions/*/.session-index.json` — already contains `allMessagesText`
2. Builds in-memory BM25 index (name 3×, firstMessage 2×, allMessagesText 1×)
3. Index caches for 30s
4. Entry reading reuses `shared/session-view` projection

No database. No embeddings. No external deps. Pure TypeScript + BM25.

Uses the same BM25 engine as [maitake](https://github.com/maitake)'s ticket search — ported to TypeScript in `shared/src/bm25.ts`.
