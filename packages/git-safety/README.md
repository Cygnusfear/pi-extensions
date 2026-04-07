# git-safety

Protects against destructive git commands and `.git` directory writes.

## Modes (via `/git-lock`)

| Mode | Behavior |
|------|----------|
| `block` | Hard-block all dangerous commands (default for workers) |
| `confirm` | Show confirm dialog (default for interactive) |
| `off` | No protection |

Regular git operations (add, commit, diff, push, branch, etc.) are **never blocked**.

## Also blocks

- `sed` (broken on macOS)
- Injects `GIT_EDITOR=true` for `git rebase --continue` to prevent hanging
- Process kill broadcasts in worker sessions
