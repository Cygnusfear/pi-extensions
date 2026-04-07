# fork-fixes

Bundled fork fixes that can be done purely as extensions, replacing patches that previously required modifying pi core.

## Fixes

- **Orphaned tool results** — drops `tool_results` whose `tool_use` is on another branch (after a session fork, stale tool calls from the parent branch are silently discarded)
