# @pi-ext/reload

Hot-reload extensions, skills, prompts, and themes without restarting pi.

## Why

Developing extensions usually means restarting pi every time you change code. The reload extension lets you pick up changes to extensions, skills, prompts, and themes mid-session — saving round-trips during development.

## Features

- **Full runtime reload** — reloads extensions, skills, prompts, and themes in one action
- **Dual interface** — available as both a slash command and a tool (agents can trigger reloads)
- **Non-destructive** — reloads state without losing conversation history

## Commands & Tools

| Interface | Name | Description |
|-----------|------|-------------|
| Command | `/reload-runtime` | Reload all extension runtime components |
| Tool | `reload_runtime` | Same as above, callable by agents |

## Usage

### Interactive

```
/reload-runtime
```

### From an agent

The agent can call the `reload_runtime` tool directly, which reloads after the current turn completes.

## Setup

```json
{
  "extensions": ["@pi-ext/reload"]
}
```
