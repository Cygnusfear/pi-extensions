# @pi-extensions/highlander

**There can be only one.** 🔪

Search and read past session JSONL logs — `mesh_view` for dead sessions.

## Why

Agents lose context across sessions and compactions. Foresight captures curated memories, but misses the raw conversation — the arguments, debug trails, and "why did we do X" discussions that never became a memory node.

Highlander lets you search across all your dead session logs with BM25 ranking, grep within sessions for exact entry numbers, and read entries from any past session.

## Usage

### Search across sessions
```
highlander({ action: "search", query: "highlander" })
```
Returns ranked sessions with snippet context showing WHERE the query matched.

### Find entries within a session
```
highlander({ action: "grep", session: "0fe1623e", query: "context window" })
```
Find exact entry numbers matching a query within a specific session.

### Read a past session
```
highlander({ action: "view", session: "0fe1623e", start: -20, end: 0 })
```
Like `mesh_view` but the session doesn't need to be alive. Entries are numbered for drill-down.

### List sessions
```
highlander({ action: "list", project: "trek", limit: 10 })
```
Browse sessions by project, recency, etc.

## How it works

1. Reads session indexes from `~/.pi/agent/sessions/`
2. Builds an in-memory BM25 index over `allMessagesText`, `name`, `firstMessage`
3. Field weights: name 3x, firstMessage 2x, allMessagesText 1x
4. Index caches for 30 seconds
5. Entry reading reuses `shared/session-view` for projection

No database, no embeddings, no external deps. Pure TypeScript + BM25.
