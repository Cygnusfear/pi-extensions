# git-ai integration

This repo uses [git-ai](https://usegitai.com) to track AI-authored code via the agent-v1 protocol.

The `git-ai` extension in `packages/git-ai/` hooks into every `edit` tool call and sends PreToolUse/PostToolUse checkpoints so lines are attributed to the correct agent, model, and session. It uses the mesh nickname as the agent name.

## Setup

Install git-ai:

```bash
# macOS
brew install git-ai
# or
curl -fsSL https://usegitai.com/install.sh | sh
```

The extension auto-detects the binary in `~/.local/bin/git-ai` or via `GIT_AI_BIN` env var.

## Usage

The `git-ai` tool provides three subcommands:

| Command | Description |
|---------|-------------|
| `blame` | AI attribution per line (who wrote what, which model) |
| `stats` | AI composition of a file or directory |
| `search` | Find AI-generated prompts in the codebase |

Attribution happens automatically on every edit — no manual steps needed.
