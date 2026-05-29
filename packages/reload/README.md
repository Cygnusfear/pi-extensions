# @pi-ext/reload

Expose pi's built-in `/reload` as a tool agents can call themselves.

## Why

pi already has a built-in `/reload` slash command that hot-reloads extensions, skills, prompts, and themes. But it's only callable from the TUI — when an agent edits an extension mid-session, the human has to manually `/reload` for the agent to see the change.

This extension wraps `/reload` in a `reload_runtime` tool so the agent can trigger it themselves.

## What it adds

| Interface | Name | Description |
|-----------|------|-------------|
| Tool | `reload_runtime` | Queue pi's built-in `/reload` as a follow-up; reloads after the current turn completes. |

No new slash commands — the built-in `/reload` is the only command, and this extension does not shadow it.

## How it works

The tool calls `pi.sendUserMessage("/reload", { deliverAs: "followUp" })`. The interactive mode's slash-command dispatcher recognizes `/reload`, waits for the current turn to finish, and runs the reload. The agent's next turn sees the new extension surface.

## Setup

Add the extension to your pi config:

```json
{
  "pi": {
    "extensions": ["./packages/reload/extensions/reload.ts"]
  }
}
```

Then `/reload` once to pick up this extension itself.
