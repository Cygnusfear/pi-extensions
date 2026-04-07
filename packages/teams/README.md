# teams

Multi-agent delegation for pi. Spawn worker agents, assign tasks, monitor progress, collect results.

## Features

- **Worker spawning** — delegate tasks to separate agent sessions (fork, fresh, or resume mode)
- **Coordinator protocol** — leader reduces typed worker facts into canonical lifecycle state
- **Worktree isolation** — each worker gets its own git worktree by default
- **Templates** — preset worker configs (`review`, `oracle`, `fix`, `implementer`) from `~/.pi/agent/team-templates.json`
- **Mesh routing** — workers communicate with coordinator via mesh channels and direct tells

## Architecture docs

- [TEAMS_V2_ARCHITECTURE.md](./TEAMS_V2_ARCHITECTURE.md) — full architecture plan, identities, fact model, migration strategy
- [WORKER_LIFECYCLE.md](./WORKER_LIFECYCLE.md) — worker lifecycle states, session strategy, protocol details
