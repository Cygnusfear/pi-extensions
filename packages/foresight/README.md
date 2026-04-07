# @pi-extensions/foresight

Semantic memory for pi sessions — store, search, and recall knowledge across sessions using the Foresight knowledge graph.

Foresight gives agents persistent memory. Decisions, learnings, and patterns survive session compaction, context trimming, and process restarts. The agent remembers what it learned yesterday.

## Features

- **Semantic search** — ranked recall by meaning, not just keywords
- **Four fact types** — world (knowledge), experience (learned from doing), opinion (decisions), observation (events)
- **Auto-context injection** — recent memories injected at session start
- **Semantic refresh** — relevant memories surfaced at turn 3 based on conversation content
- **Session ingest** — session files automatically processed on end/switch for knowledge extraction
- **Multi-bank support** — separate memory banks per repository, queryable cross-repo
- **Fire-and-forget writes** — memory creation never blocks the agent
- **Unfold/drill-down** — get full detail on any memory node
- **Health checking** — graceful degradation when Foresight binary is unavailable

## Fact Types

| Type | Icon | Use Case |
|------|------|----------|
| `world` | 🌍 | General knowledge, API docs, architecture facts |
| `experience` | 🔧 | Learnings from doing — what worked, what didn't |
| `opinion` | 💭 | Judgments, decisions, tradeoff choices |
| `observation` | 👁️ | Events, changes, things you noticed |

## Tools

| Tool | Description |
|------|-------------|
| `recall` | Search memory with semantic ranking. Filter by fact type, bank, min score. |
| `memory_unfold` | Drill into a specific memory node for full detail. Pass the full `node_id` from recall results. |
| `memory_context` | Get relevant memories for a task/topic. Use at the start of work to load background. |
| `memory_create` | Store a new memory. Fire-and-forget — never blocks the agent. |
| `memory_status` | Health check: backend status, bank info, total memory count. |
| `memory_subscribe` | Subscribe to a node/entity/topic for change notifications (stub). |
| `memory_unsubscribe` | Remove a subscription. |
| `memory_check_updates` | Check for subscription notifications (stub). |

## Commands

| Command | Description |
|---------|-------------|
| `/recall <query>` | Quick memory search from the TUI |
| `/memory-context <task>` | Get task-relevant memories |

## Usage

### Searching Memory

```ts
// Search for past decisions about authentication
await recall({
  query: "JWT token rotation strategy",
  factType: "opinion",  // optional: filter to decisions
  limit: 5
});
```

### Storing a Memory

```ts
// Record an important decision
await memory_create({
  factType: "opinion",
  oneLiner: "Use short-lived JWTs with refresh tokens",
  summary: "Decision: 15-minute access tokens with httpOnly refresh cookies. Rotate on every request.",
  fullSynthesis: "Full context including alternatives considered...",
  entityName: "auth-service"
});
```

### Getting Task Context

```ts
// Load relevant background before starting work
await memory_context({
  task: "Implement user authentication flow",
  maxNodes: 10
});
```

### Drilling into a Node

```ts
// Get full detail on a specific memory
await memory_unfold({
  nodeId: "fs:abc123...",  // full ID from recall results
  depth: "full"            // "summary" | "full" | "raw"
});
```

## How Auto-Context Works

1. **Session start** — the extension fetches the 15 most recent memories and injects them into the system prompt via `<recent_memories>` tags
2. **Turn 3** — after the agent has produced some output, a semantic refresh searches for memories relevant to the conversation so far
3. **Session end/switch** — the previous session file is ingested by Foresight for knowledge extraction

This means the agent always has relevant context without explicit tool calls.

## Memory Banks

Each repository gets its own memory bank (named after the repo folder). Override with the `FORESIGHT_BANK` env var.

Query a different repo's memories:

```ts
await recall({ query: "deployment strategy", bank: "other-project" });
```

## Setup

1. Install the [Foresight CLI](https://github.com/foresight) and ensure it's on your PATH
2. Set `MEMORY_DATABASE_URL` (preferred) or rely on Foresight's default database
3. Install the extension — it auto-creates the default bank on first use
4. The extension gracefully degrades if Foresight is unavailable

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FORESIGHT_BIN` | Path to the Foresight binary (default: `foresight`) |
| `FORESIGHT_BANK` | Default memory bank name (default: repo folder name) |
| `MEMORY_DATABASE_URL` | Database connection URL |

## Dependencies

- **Foresight CLI** — knowledge graph backend (must be on PATH)
- **@mariozechner/pi-ai** — string enum support
- **@pi-extensions/shared** — foresight read/write utilities
- **@mariozechner/pi-coding-agent** ≥ 0.65.0
