# skills

Install, manage, and update pi skills from any git source — directly from the chat.

## Features

- **Full lifecycle management** — install, check, update, list, and remove skills
- **Git-backed** — skills are installed from git repos via the `skills` CLI
- **Auto-update notifications** — checks for available updates on session start and shows a status bar indicator
- **Automatic reload** — sessions reload automatically after install/update/remove
- **Global install support** — install skills globally with `--global`

## Commands

| Command | Description |
|---------|-------------|
| `/skills:install [source] [--skill name] [--global]` | Install skills from a git repo. Defaults to the configured `PI_SKILLS_SOURCE`. |
| `/skills:check` | Check for available skill updates. |
| `/skills:update` | Update all installed skills to their latest versions. |
| `/skills:list [--global]` | List all installed skills with metadata. |
| `/skills:remove <name...> / --all` | Remove one or more skills, or all at once. |

## Examples

```
/skills:install https://github.com/user/agent-skills.git
/skills:install --global --skill rust-review
/skills:check
/skills:update
/skills:list
/skills:remove rust-review
/skills:remove --all
```

## Update Notifications

On session start, the extension automatically checks:
1. Whether installed skills have updates available (via `skills check`)
2. Whether this package itself is behind its upstream

If updates are found, a `⬆ updates available` indicator appears in the status bar.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PI_SKILLS_SOURCE` | Default git repo URL for `/skills:install` | `https://github.com/user/agent-skills.git` |

## Setup

Requires the `skills` CLI to be available (`bunx skills`). Install with:

```bash
bun add -g skills
```
