# @pi-ext/restart

Surface a full pi restart as both a slash command (`/restart-runtime`) and an LLM-callable tool (`restart_runtime`).

The heavier sibling of [`@pi-ext/reload`](../reload). Where `/reload` re-reads extensions/skills/prompts **in-process**, `/restart` re-execs pi as a **fresh process** resuming the current session — clearing memoized state a reload can't (stale package-export maps, cached code-mode tool bindings, anything pinned at module load).

## What it does

| Interface | Name | Mechanism |
|-----------|------|-----------|
| Slash command | `/restart-runtime` | `ctx.restart()` from `ExtensionCommandContext`. |
| Tool | `restart_runtime` | `pi.restart()` from `ExtensionAPI`. Re-execs the process; the session resumes fresh. |

Use it when an in-process reload isn't enough — a host/runtime change, a stale module-export map, or memoized tool bindings that only a full process restart clears — or for a clean-process smoke test.

## Host requirement

Both surfaces require `pi-coding-agent` to expose `restart()` on `ExtensionAPI` (`pi.restart()`) and `ExtensionCommandContext` (`ctx.restart()`), analogous to `reload()`. Until a build ships that primitive, both degrade gracefully: the tool returns an `isError: true` result asking you to upgrade, and the slash command notifies the same. This mirrors how `@pi-ext/reload` was written before the host exposed `pi.reload()`.

## Reload vs restart

| | `/reload` | `/restart` |
|---|-----------|-----------|
| Process | Same Node process | Fresh process (re-exec) |
| Picks up | extensions, skills, prompts, themes, keybindings | everything reload does **plus** module-level caches, package-export maps, code-mode tool bindings |
| Session | Continues | Resumed after re-exec |
| Cost | Fast | Full restart |

Reach for `/reload` first; use `/restart` only when a reload demonstrably isn't enough.

## Setup

```json
{
  "pi": {
    "extensions": ["./packages/restart/extensions/restart.ts"]
  }
}
```

Then `/reload` once to pick up the extension itself; the `restart_runtime` tool and `/restart-runtime` command are live on the next turn.
