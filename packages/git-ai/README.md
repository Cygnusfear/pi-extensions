# @pi-extensions/git-ai

AI code attribution for every edit — know exactly which agent, model, and session wrote each line.

## Why

When multiple AI agents work on the same codebase, tracking authorship becomes impossible. `git blame` shows a human committer, not the actual model that generated the code. This extension integrates with [git-ai](https://usegitai.com) to record attribution at the tool-call level using the `agent-v1` checkpoint protocol.

## Features

- **Automatic attribution** — sends PreToolUse/PostToolUse checkpoints to git-ai on every edit tool call
- **Agent-v1 protocol** — full transcript with agent name (mesh nickname), model ID, conversation ID, and file paths
- **Session transcript parsing** — extracts user messages, assistant responses, thinking blocks, and tool calls from pi's JSONL session files
- **Blame, stats, search tools** — query git-ai attribution data from within pi
- **Local hook preservation** — git-ai's bundled hooks dispatch repo-local `.git/hooks` hooks first, so tools like lefthook, husky, and format checks still run when pi sets `core.hooksPath`

## How It Works

1. On every `edit`, `write`, `apply_patch`, or `hash_edit` tool call, the extension fires a **PreToolUse** checkpoint to git-ai (marks state before edit).
2. After the tool completes, a **PostToolUse** checkpoint records the full conversation transcript and edited file paths.
3. For commits spawned inside pi, the extension points `core.hooksPath` at its bundled hooks via environment-only Git config. Those bundled hooks first run executable repo-local hooks from `.git/hooks/<hook-name>`, then run git-ai behavior.
4. git-ai uses checkpoint and trailer data to attribute lines to the correct agent, model, and session in `git blame` output.

### agent-v1 Payload

- `type`: `"human"` (PreToolUse) or `"ai_agent"` (PostToolUse)
- `agent_name`: mesh nickname (defaults to `"pi"`)
- `model`: `provider/model-id` extracted from session transcript
- `conversation_id`: pi session ID
- `repo_working_dir`: git repo root
- `edited_filepaths`: list of affected files
- `transcript`: full conversation with user, assistant, thinking, and tool_use messages

## Tools

| Tool | Description |
|------|-------------|
| `git-ai` | Run git-ai commands: `blame`, `stats`, `search` |

### Parameters

```typescript
{
  command: "blame" | "stats" | "search",
  args?: string[]  // e.g. ["path/to/file.ts", "--json", "--lines", "10-20"]
}
```

### Examples

```
// Blame — see AI attribution per line
git-ai blame src/app.ts

// Stats — see AI composition percentage
git-ai stats

// Search — find prompts that produced specific code
git-ai search "authentication middleware"
```

## Setup

1. Install [git-ai](https://usegitai.com):
   ```bash
   curl -fsSL https://usegitai.com/install.sh | bash
   ```

2. Add to your `pi.json` extensions:
   ```json
   {
     "extensions": ["@pi-extensions/git-ai"]
   }
   ```

The extension auto-detects the git-ai binary at `~/.local/bin/git-ai`, `~/.git-ai/bin/git-ai`, or via `GIT_AI_BIN` env var. If git-ai is not found, the extension silently disables itself.
