# foresight

Foresight semantic memory — persistent knowledge graph for pi sessions.

Uses the Foresight CLI for all memory operations. Supports fact types: `world`, `experience`, `opinion`, `observation`.

## Tools

| Tool | Description |
|------|-------------|
| `recall` | Search semantic memory with ranking and salience |
| `memory_context` | Get relevant memories for a task |
| `memory_create` | Create a new memory node |
| `memory_unfold` | Unfold a memory node for more detail |
| `memory_status` | Check Foresight database health |
| `memory_subscribe` | Subscribe to a memory node, entity, or topic |
| `memory_unsubscribe` | Remove a subscription |
| `memory_check_updates` | Check for subscription notifications |

## Setup

Requires Foresight binary installed and `MEMORY_DATABASE_URL` env var configured.
