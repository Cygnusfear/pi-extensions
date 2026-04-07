# @pi-extensions/defaults

The default pi experience — AGENTS.md discovery, session naming, terminal titles, notifications, theme selection, and project initialization.

## Why

Pi works out of the box, but every project has conventions, and every developer has preferences. This extension bundle provides the quality-of-life features that make pi feel like a native part of your workflow rather than a generic chatbot.

## Features

### AGENTS.md Discovery

Pi's built-in context loading walks **up** from `cwd` to find `AGENTS.md` files. This extension fills the gap by discovering `AGENTS.md` files in **subdirectories** — when the agent reads a file, any `AGENTS.md` between `cwd` and that file's directory is automatically loaded and injected into the tool result.

- Walks from `cwd` to the target file's directory
- Skips already-loaded files (session-aware, deduplicates across reads)
- Respects `agentsIgnorePaths` configuration
- Notifies the UI when new context is loaded

### Session Naming

Sessions get auto-named after the first user message using a lightweight title generator:

- Uses `google/gemini-2.5-flash-lite` for fast, cheap title generation
- Preserves the user's language and technical terms
- Max 50 characters, truncated at word boundaries
- Fallback to first N characters of the user message if the model is unavailable

### Terminal Title

Sets the terminal window/tab title to reflect the current state:

| State | Title format |
|-------|-------------|
| Idle | `π: project-name` |
| Thinking | `π: project-name (thinking...)` |
| Tool call | `π: project-name (tool_name)` |
| Shutdown | `Terminal` |

Shows breadcrumbs for nested directories: `π: monorepo > packages/core` (truncated to 2 levels max).

### Notifications

Emits desktop notification events on agent state changes:

- **`ask_user`** — plays attention sound when agent needs input
- **Agent end** — plays default sound with loop/tool count summary
- Error tracking across turns

The actual OSC sequences and sound playback are handled by the presenter extension.

### Theme Selector

Interactive theme picker with live preview:

- Lists all available themes (built-in and custom)
- Previews each theme as you browse
- Restores original theme on cancel

### Project Init (`/project:init`)

Interactive wizard for initializing new projects:

- Scans catalog directories for skills and packages
- Calls scout for recommendations based on your stack
- Lets you select which skills/packages to install
- Optionally generates an `AGENTS.md` for the project

### Additional Commands

| Command | Description |
|---------|-------------|
| `/ad-name` | Set or auto-generate session name |
| `/ad-name auto` | Force-regenerate session name |
| `/theme` | Interactive theme selector with preview |
| `/project:init` | Initialize project with skills, packages, and AGENTS.md |
| `/defaults:settings` | Configure catalog directories, scan depth, ignore paths |
| `/system-prompt` | View the assembled system prompt with skill breakdown |

## Tools

| Tool | Description |
|------|-------------|
| `get_current_time` | Get current date/time with timezone, day of week, unix timestamp, and formatted output |

### `get_current_time` Parameters

```typescript
{
  format?: "iso8601" | "unix" | "date" | "time" | string
}
```

Returns structured details: `formatted`, `date`, `time`, `timezone`, `day_of_week`, `unix`.

## Configuration

Edit via `/defaults:settings` or directly in `~/.pi/extensions/defaults.json`:

```json
{
  "catalog": ["~/pi-skills", "~/pi-packages"],
  "catalogDepth": 3,
  "agentsIgnorePaths": ["node_modules", ".git", "dist"]
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `catalog` | `[]` | Directories to scan for skills and packages |
| `catalogDepth` | `3` | Maximum depth when scanning catalog directories |
| `agentsIgnorePaths` | `[]` | Glob patterns to skip during AGENTS.md discovery |

## Setup

```json
{
  "extensions": ["@pi-extensions/defaults"]
}
```

This extension loads as the base experience. Other extensions layer on top.
