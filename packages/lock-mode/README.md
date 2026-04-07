# @pi-extensions/lock-mode

Read-only mode for pi sessions — let agents explore without any risk of modification.

## Why

Sometimes you want an agent to read code, search files, and answer questions — without touching anything. Maybe you're auditing a codebase, doing a code review, or letting a worker analyze your project. Lock mode disables all write tools instantly.

## Features

- **One-command lockdown** — `/lock` disables all write tools in one step
- **Full restoration** — `/unlock` restores the original tool set
- **No side effects** — doesn't modify files, config, or session state; just hides the tools

## What Gets Disabled

When locked, these tools are removed from the active tool set:

| Tool | Capability |
|------|-----------|
| `bash` / `bash_bg_start` / `bash_bg_stop` | Shell command execution |
| `write` | File creation/overwrite |
| `edit` | File editing |
| `apply_patch` | Patch application |
| `execute_code` | Code execution sandbox |
| `hash_edit` | Hashline-verified editing |
| `teams` | Worker delegation |
| `todos_oneshot` | Todo management |

Read-only tools remain available: `read`, `hash_read`, `grep`, `glob`, `find`, etc.

## Commands

| Command | Description |
|---------|-------------|
| `/lock` | Enter read-only mode — disables all write tools |
| `/unlock` | Exit read-only mode — restores original tools |

## Usage

```
# Lock the session — agent can only read and search
/lock

# ... agent explores the codebase ...

# Restore full capabilities
/unlock
```

## Setup

```json
{
  "extensions": ["@pi-extensions/lock-mode"]
}
```
