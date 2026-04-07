# @pi-ext/cwd

Change the session's working directory mid-conversation — with history preservation and tab completion.

## Why

Pi sessions are tied to a working directory. Without this extension, changing directories means starting a new session and losing context. `/cwd` lets you switch projects mid-session by forking the conversation into the new directory's session bucket.

## Features

- **Directory switching** — change the session base to any absolute or relative path
- **Path expansion** — supports home directory (`~`), relative paths, and absolute paths
- **Tab completion** — suggests directories as you type, with home path abbreviation
- **Session forking** — conversation history is preserved when switching directories
- **Git awareness** — displays repository root information alongside the base path
- **Validation** — rejects non-existent paths and non-directories with clear error messages

## Usage

```
# Show current base directory and git repo info
/cwd

# Switch to a different project
/cwd ~/other-project

# Switch to a subdirectory (relative to current base)
/cwd .worktrees/feature-branch

# Tab-complete a path
/cwd ~/pro<TAB>
```

## How It Works

1. Validates the target path exists and is a directory
2. Forks the current session file into the new directory's session bucket via `SessionManager.forkFrom()`
3. Switches to the forked session — conversation history is preserved
4. Displays the new base directory and git repo info

Worker sessions inherit the new base directory automatically. Other pi sessions are unaffected.

## Command

| Command | Description |
|---------|-------------|
| `/cwd` | Show current base directory and git repo info |
| `/cwd <path>` | Change session base to the specified directory |

## Setup

```json
{
  "extensions": ["@pi-ext/cwd"]
}
```
