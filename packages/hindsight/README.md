# @pi-extensions/hindsight

Search and read past session JSONL logs — `mesh_view` for dead sessions.

## What it does

Agents lose context across sessions and compactions. Foresight captures curated memories, but misses the raw conversation — the arguments, debug trails, and "why did we do X" discussions that never became a memory node.

Hindsight lets you search across all your dead session logs with BM25 ranking, and read entries from any past session.

## Usage

### Search across sessions
```
hindsight({ action: "search", query: "highlander" })
```
Returns ranked sessions matching the query, with scores and previews.

### Read a past session
```
hindsight({ action: "view", session: "c1c2deee", start: -20, end: 0 })
```
Like `mesh_view` but the session doesn't need to be alive.

### List sessions
```
hindsight({ action: "list", project: "trek", limit: 10 })
```
Browse sessions by project, recency, etc.

## How it works

1. Reads session indexes from `~/.pi/agent/sessions/`
2. Builds an in-memory BM25 index over `allMessagesText`, `name`, `firstMessage`
3. Field weights: name 3x, firstMessage 2x, allMessagesText 1x
4. Index caches for 30 seconds
5. Entry reading reuses `shared/session-view` for projection

No database, no embeddings, no external deps. Pure TypeScript + BM25.
