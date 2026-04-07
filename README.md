# pi-extensions

Flat monorepo of extension packages for [pi](https://github.com/mariozechner/pi-coding-agent). 32 extensions, one package per concern.

## Layout

```
packages/shared          Shared helpers (model-utils, git-guards, sandbox-registry, etc.)
packages/*              One package per extension, plus prompt/theme packages
packages/prompt-templates/  Slash-command prompt templates
packages/lipgloss-theme/    TUI theme
```

Each package is independently installable, testable, and removable via `~/.pi/agent/settings.json` or project `.pi/settings.json`.

## Install

Install one package:

```bash
pi install ./packages/foresight
pi install ./packages/pi-mesh
```

Or use the workspace — run once after changing dependencies:

```bash
bun install
```

## Packages

### Core Tools

| Package | Description |
|---------|-------------|
| [code-mode](packages/code-mode/) | `execute_code` sandbox — write JS calling tools as typed async functions |
| [file-tools](packages/file-tools/) | `apply_patch` edits + `readImage` for image viewing |
| [hashline-tools](packages/hashline-tools/) | Verified file editing with hashline anchors (rejects on file change) |
| [fff](packages/fff/) | Fast file search via fff-bun subprocess (frecency-ranked) |
| [background-bash](packages/background-bash/) | Run long-lived bash commands without blocking the agent |
| [webfetch](packages/webfetch/) | Fetch URLs as text/markdown/HTML (max 5MB) |
| [context7](packages/context7/) | Up-to-date library docs via Context7 MCP |

### Agent Communication

| Package | Description |
|---------|-------------|
| [pi-mesh](packages/pi-mesh/) | P2P agent communication via Zenoh (peer discovery, direct messaging, channels) |
| [teams](packages/teams/) | Multi-agent delegation — spawn workers, assign tasks, collect results |

### Memory & Context

| Package | Description |
|---------|-------------|
| [foresight](packages/foresight/) | Semantic memory — persistent knowledge graph across sessions |
| [context](packages/context/) | TUI view showing loaded extensions, skills, context usage |
| [worktree-summaries](packages/worktree-summaries/) | Injects current worktree path into context for compaction survival |

### Model & Prompt

| Package | Description |
|---------|-------------|
| [model-shortcuts](packages/model-shortcuts/) | Slash commands for quick model switching (`/opus`, `/zai`, etc.) |
| [model-hints](packages/model-hints/) | Injects latest available models into system prompt |
| [default-prompt](packages/default-prompt/) | Default system prompt — always injected |
| [prompt-templates](packages/prompt-templates/) | Bundled slash-command templates (`/cmd.handoff`, `/cmd.wtf`, etc.) |

### Git & Safety

| Package | Description |
|---------|-------------|
| [git-safety](packages/git-safety/) | Blocks destructive git commands, protects `.git/` |
| [git-ai](packages/git-ai/) | Tracks AI-authored code via git-ai agent-v1 protocol |

### UI & Display

| Package | Description |
|---------|-------------|
| [powerline-footer](packages/powerline-footer/) | Powerline-style status bar + welcome overlay |
| [lipgloss-theme](packages/lipgloss-theme/) | Custom TUI theme |
| [core-edit-ui](packages/core-edit-ui/) | Shiki syntax-highlighted diffs for the edit tool |
| [core-read-ui](packages/core-read-ui/) | Collapsible UI + timing for the read tool |
| [notify](packages/notify/) | Desktop notification when agent finishes (OSC 777) |
| [session-tab-title](packages/session-tab-title/) | Terminal tab title shows session name |
| [image-links](packages/image-links/) | Clickable `file://` links for images (OSC 8 hyperlinks) |

### Session Control

| Package | Description |
|---------|-------------|
| [lock-mode](packages/lock-mode/) | `/lock` disables all write tools — read-only mode |
| [reload](packages/reload/) | `/reload-runtime` to hot-reload extensions |
| [fork-fixes](packages/fork-fixes/) | Extension-level fork patches (drops orphaned tool results) |

### Skills & Analysis

| Package | Description |
|---------|-------------|
| [skills](packages/skills/) | Skills package manager CLI wrapper |
| [nested-skills](packages/nested-skills/) | Discovers nested SKILL.md files pi's scanner missed |
| [tldr-code](packages/tldr-code/) | Semantic code search, call graphs, dead code detection via llm-tldr |

### Workflow

| Package | Description |
|---------|-------------|
| [defaults](packages/defaults/) | Sensible defaults — directory-aware read, AGENTS.md discovery, git rebase helper, auto naming |
| [cwd](packages/cwd/) | Change session base directory (`/cwd <path>`) |
| [code-review-guard](packages/code-review-guard/) | Injects code health prompt after code-reading tool results |
| [mid-mortem](packages/mid-mortem/) | Captures decisions/progress before compaction discards context |
