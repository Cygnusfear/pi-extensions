# git-ai

Tracks AI-authored code via git-ai's agent-v1 protocol. Uses mesh nickname as agent name.

On every `edit` tool call, sends PreToolUse/PostToolUse checkpoints to git-ai so lines are attributed to the correct agent, model, and session.

Also provides a `git-ai` tool for blame/stats/search from within pi.

## Setup

Requires git-ai installed: [usegitai.com](https://usegitai.com)

The extension auto-detects the binary in `~/.local/bin/git-ai` or via `GIT_AI_BIN` env var.

## Tool commands

| Command | Description |
|---------|-------------|
| `blame` | AI attribution per line |
| `stats` | AI composition percentage |
| `search` | Find AI-generated prompts |
