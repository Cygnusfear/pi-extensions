# @pi-extensions/git-safety

Protect your repository from destructive git commands and accidental `.git` corruption — with three configurable modes.

## Why

AI agents love running `git push --force`, `rm -rf .git`, and editing internal git objects. One hallucinated command can nuke your repo history. This extension sits between the agent and the shell, blocking dangerous operations before they execute.

## Features

- **Three protection modes** — `block`, `confirm`, and `off` — controlled via `/git-lock`
- **Destructive git command detection** — blocks force-pushes, hard resets, branch deletions, and more
- **`.git` directory write protection** — prevents write, edit, and patch operations targeting paths inside `.git/`
- **Code-mode integration** — same interactive confirm dialogs work inside `execute_code` blocks
- **Desktop notification on popup open** — when a confirm dialog opens, a desktop notification fires *immediately* so the hooman is pulled to the pane even if they are in another tab
- **Code-mode awareness via `pending-interactions` registry** — code-mode's auto-promote detects an open confirm dialog and emits a 🚦 stub (within ~3s, not 60s) telling the agent the popup is the reason it is stuck, so the agent can call `notify()` for additional context
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
- `hashEdit` tool targeting paths inside `.git/`
- `apply_patch` with file headers inside `.git/`

### Code-mode integration

All guards also work inside `execute_code` blocks. When a sandbox function (`Bash`, `Write`, `Edit`, `hashEdit`, `applyPatch`) triggers a git-safety guard:

- **`confirm` mode**: Shows the same interactive confirmation dialog. If approved, logs `✅ Hooman approved <reason> [OK]`. If denied, blocks with error.
- **`block` mode / workers**: Hard-blocks immediately with `❌ BLOCKED: <reason> 🛡️ GUARD PROTOCOL: HOOMAN MUST CONFIRM WITH [OK]`.
- **`off` mode**: No protection.

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

Requires `@pi-extensions/shared` as a dependency (provides `isGitUnsafeBash`, `isGitPath`, `isProcessKillBroadcast` guards, plus the `pending-interactions` registry and `desktop-notify` primitive used to surface confirm popups).

## How the blocked-confirm signal reaches the agent

When a destructive operation is detected in `confirm` mode:

1. **`beginConfirm(...)`** is called on the shared `@pi-extensions/shared/pending-interactions` registry, marking a blocking dialog as open.
2. **`fireNotification(...)`** from `@pi-extensions/shared/desktop-notify` immediately pings the hooman's desktop (cmux native banner where available, OSC 777 fallback otherwise) — independent of any agent action.
3. **`await ctx.ui.confirm(...)`** blocks waiting for the hooman.
4. While that is pending, code-mode polls the registry. Within ~3s of any pending confirm, code-mode promotes the in-flight `execute_code` to async and emits a 🚦 stub naming the pending dialog and instructing the agent to call `notify()` and set `status("attention")`.
5. **`endConfirm(handle)`** runs in a `finally` block so the registry is cleaned up regardless of approve / deny / abort.

This decoupling means any future extension that opens a blocking UI dialog can call `beginConfirm`/`endConfirm` + `fireNotification` and inherit the same agent-side awareness for free.
