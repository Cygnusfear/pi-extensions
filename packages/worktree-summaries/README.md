# @pi-extensions/worktree-summaries

Survive context compaction without losing your worktree directory.

When pi compacts or summarizes a conversation, the current working directory context can be lost. This extension ensures the worktree path persists through compaction, `/compact` commands, and tree summaries.

## Features

- **Compaction survival** — worktree directory injected as a conversation message so summarizers include it
- **`/compact` awareness** — automatically appends the worktree line to manual compact commands
- **Tree summary injection** — adds the worktree path to `session_before_tree` custom instructions
- **Deduplication** — won't inject the same path twice in a row

## How It Works

The extension hooks into three pi lifecycle events:

1. **`before_agent_start`** — injects the worktree directory as a hidden conversation message. This ensures that when auto-compaction summarizes the conversation, the worktree path is visible in the messages being summarized and gets carried forward.

2. **`input`** — intercepts `/compact` commands and appends the worktree line to the compact instructions, so manual compaction also preserves the directory.

3. **`session_before_tree`** — adds the worktree path to the custom instructions used during tree summarization, ensuring the summary includes it.

The injected line takes this form:

```
Current worktree directory: /path/to/repo/.worktrees/my-feature
```

## Why This Matters

When working in a git worktree:

- The agent needs to know its exact filesystem location
- Context compaction summarizes and discards old messages
- Without this extension, the worktree path would be lost after compaction
- The agent might fall back to the repo root, breaking worktree-isolated workflows

## Setup

Install the extension — no configuration needed. It auto-detects the worktree directory via `git rev-parse --show-toplevel` and falls back to `cwd` if not in a git repo.

## Dependencies

- **@earendil-works/pi-coding-agent** ≥ 0.65.0
