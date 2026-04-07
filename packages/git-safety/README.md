# @pi-extensions/git-safety

Protect your repository from destructive git commands and accidental `.git` corruption — with three configurable modes.

## Why

AI agents love running `git push --force`, `rm -rf .git`, and editing internal git objects. One hallucinated command can nuke your repo history. This extension sits between the agent and the shell, blocking dangerous operations before they execute.

## Features

- **Three protection modes** — `block`, `confirm`, and `off` — controlled via `/git-lock`
- **Destructive git command detection** — blocks force-pushes, hard resets, branch deletions, and more
- **`.git` directory write protection** — prevents write, edit, and patch operations targeting paths inside `.git/`
- **`sed` blocker** — always blocked (broken on macOS); steers agents toward safe alternatives
- **Process kill broadcast guard** — always-on, unconfigurable protection against broadcasting `SIGKILL` to user sessions
- **`GIT_EDITOR` injection** — automatically sets `GIT_EDITOR=true` on `git rebase --continue` to prevent editor hangs
- **Worker-aware defaults** — workers default to `block` mode; interactive sessions default to `confirm`

## Modes

| Mode | Behavior |
|------|----------|
| `block` | Hard-blocks all destructive git commands and `.git` writes. No dialog. |
| `confirm` | Shows a confirmation dialog for destructive operations. User can approve or deny. |
| `off` | No git protection. Only `sed` blocking and process kill guard remain active. |

## What Gets Blocked

### Destructive git commands (mode-dependent)

- `git push --force`, `git push -f`
- `git reset --hard`
- `git clean`
- `git branch -D`, `git branch --delete`
- `git checkout -- .` / `git restore --staged .`
- Any command matched by `isGitUnsafeBash()` from `@pi-extensions/shared`

### `.git` path writes (mode-dependent)

- `write` tool targeting paths inside `.git/`
- `edit` tool targeting paths inside `.git/`
- `apply_patch` with file headers inside `.git/`

### Always blocked (all modes)

- `sed` with in-place or substitution flags
- Process kill broadcast commands (e.g., `pkill`, `killall` targeting user sessions)

## What's Always Allowed

Standard git operations are **never** blocked:

- `git add`, `git commit`, `git diff`, `git status`
- `git push` (without force flags)
- `git branch` (without `-D`)
- `git log`, `git show`, `git blame`
- `git stash`, `git tag`

## Commands

| Command | Description |
|---------|-------------|
| `/git-lock` | Toggle mode: `confirm → off → block → confirm` |
| `/git-lock block` | Set hard-block mode |
| `/git-lock confirm` | Set confirmation mode (interactive) |
| `/git-lock off` | Disable git protection |

## Setup

Add to your `pi.json` extensions list:

```json
{
  "extensions": ["@pi-extensions/git-safety"]
}
```

Requires `@pi-extensions/shared` as a dependency (provides `isGitUnsafeBash`, `isGitPath`, `isProcessKillBroadcast` guards).
