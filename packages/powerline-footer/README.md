<p>
  <img src="banner.png" alt="pi-powerline-footer" width="1100">
</p>

# pi-powerline-footer

Powerline-style status bar for [pi](https://github.com/badlogic/pi-mono) — beautiful, responsive, and packed with information. Inspired by [Powerlevel10k](https://github.com/romkatv/powerlevel10k) and [oh-my-pi](https://github.com/can1357/oh-my-pi).

<img width="1261" height="817" alt="Screenshot" src="https://github.com/user-attachments/assets/4cc43320-3fb8-4503-b857-69dffa7028f2" />

## Installation

```bash
pi install npm:@pi-extensions/powerline-footer
```

Restart pi to activate.

## Features

- **20 segments** — model, thinking, git, tokens, cost, context, time, session, ZMX session, hostname, and more
- **6 presets** — from minimal to full nerd dashboard, one command to switch
- **10 separator styles** — powerline arrows, slashes, dots, chevrons, stars, and plain ASCII
- **Responsive layout** — segments overflow to a secondary row on narrow terminals
- **Welcome overlay** — branded splash with model info, keyboard tips, and recent sessions
- **Working vibes** — AI-generated themed loading messages (e.g. `/vibe star trek`)
- **Rainbow thinking** — high/xhigh thinking levels shimmer with a rainbow gradient
- **Zero git stampedes** — uses pi's built-in `FooterDataProvider` for branch info, no subprocess spawning
- **Incremental usage stats** — O(1) per render, processes only new session events
- **Theme overrides** — per-preset color schemes plus user-level `theme.json`

## Quick Start

Activates automatically. Toggle and configure with:

```
/powerline              # toggle on/off
/powerline default      # switch preset
/powerline nerd         # maximum detail
/powerline minimal      # just the essentials
```

## Presets

| Preset | Segments | Style |
|--------|----------|-------|
| `default` | session, ZMX session, path, context, model, thinking | Dot separators, basename path |
| `minimal` | path, git, context | Slash separators, muted colors |
| `compact` | model, session, ZMX session, git, cost, context | Thin powerline, tight layout |
| `full` | pi, hostname, ZMX session, model, thinking, path, git, tokens, cost, context, time, extensions | Full powerline, every stat |
| `nerd` | Everything — 16+ segments with cache read/write, thinking, extensions | Vibrant colors, Nerd Font icons |
| `ascii` | model, path, git, tokens, cost, context | Plain ASCII, safe for any terminal |

## Segments

| ID | Display | Description |
|----|---------|-------------|
| `pi` | π / 🅿️ | Pi icon/branding |
| `model` | ◈ claude-sonnet-4-6 | Current model name |
| `thinking` | 🧠 med | Live thinking level (off/min/low/med/high/xhigh) |
| `path` | 📁 powerline-footer | Working directory (basename, abbreviated, or full) |
| `git` | ⎇ main +2 *1 | Branch name with staged/unstaged/untracked counts |
| `token_in` | in: 45.2k | Input tokens used |
| `token_out` | out: 12.3k | Output tokens used |
| `token_total` | ⊛ 57.5k | Total tokens |
| `cache_read` | cache in: 38.1k | Cache read tokens |
| `cache_write` | cache out: 2.1k | Cache write tokens |
| `cost` | $0.42 | Session cost (shows `sub` for subscription users) |
| `context_pct` | ◫ 42.3%/200k ⚡ | Context usage with auto-compact indicator |
| `context_total` | ◫ 200k | Context window size |
| `time_spent` | ⟳ 15m32s | Session elapsed time |
| `time` | ⟳ 14:32 | Current clock time |
| `session` | id abc12345 | Session name or ID prefix |
| `zmx_session` | zmx Ghostty-window-14 | `$ZMX_SESSION` value, hidden when unset |
| `hostname` | host macbook | Machine hostname |
| `subagents` | AG | Subagent count (reserved) |
| `extension_statuses` | MCP: 6 servers | Compact extension status messages |

### Segment Options

Each preset can fine-tune segments via `segmentOptions`:

```typescript
{
  model: { showThinkingLevel: boolean },       // show thinking in model segment
  path: { mode: "basename"|"abbreviated"|"full", maxLength: number },
  git: { showBranch, showStaged, showUnstaged, showUntracked },
  time: { format: "12h"|"24h", showSeconds: boolean }
}
```

## Separators

| Style | Characters | Best for |
|-------|-----------|----------|
| `powerline` | ▓▒ │ ╲ ╱ | Full preset, Nerd Font users |
| `powerline-thin` | │ ╲ ╱ | Compact, clean look |
| `slash` | / | Minimal preset |
| `pipe` | | | Classic terminal |
| `dot` | · | Default preset, subtle |
| `chevron` | › ‹ | Modern, lightweight |
| `star` | ✦ | Decorative |
| `block` | █ | Heavy, high contrast |
| `none` | (space) | Bare minimum |
| `ascii` | > < | Fallback for basic terminals |

## Thinking Level Display

| Level | Display | Effect |
|-------|---------|--------|
| off | 🧠 off | Gray |
| minimal | 🧠 min | Purple-gray |
| low | 🧠 low | Blue |
| medium | 🧠 med | Teal |
| high | 🧠 high | 🌈 Rainbow shimmer |
| xhigh | 🧠 ultrathink | 🌈 Rainbow shimmer |

## Working Vibes

Transform boring "Working..." messages into themed phrases:

```
/vibe star trek        → "Running diagnostics...", "Engaging warp drive..."
/vibe pirate           → "Hoisting the sails...", "Charting course..."
/vibe zen              → "Breathing deeply...", "Finding balance..."
/vibe noir             → "Following the trail...", "Checking the angles..."
/vibe off              → Disable (back to "Working...")
```

Two modes:
- **generate** — on-demand AI generation, contextual to your task (~$0.000015/msg)
- **file** — pre-generated vibes file, instant and offline

```
/vibe generate mafia 200    # Pre-generate 200 vibes
/vibe mode file             # Switch to file mode
```

Configure in `~/.pi/agent/settings.json`:

```json
{
  "workingVibe": "star trek",
  "workingVibeMode": "generate",
  "workingVibeModel": "anthropic/claude-haiku-4-5",
  "workingVibeRefreshInterval": 30
}
```

## Theming

### Color Resolution

1. User overrides in `theme.json` (highest priority)
2. Preset color scheme
3. Default colors

### Semantic Colors

| Name | Default | Description |
|------|---------|-------------|
| `pi` | accent | Pi icon |
| `nickname` | #ff9d00 | Mesh nickname |
| `model` | dim | Model name |
| `path` | success | Directory path |
| `git` / `gitClean` | dim | Clean git branch |
| `gitDirty` | warning | Dirty git branch |
| `thinking` | muted | Thinking level |
| `context` | dim | Context usage (normal) |
| `contextWarn` | warning | Context >70% |
| `contextError` | error | Context >90% |
| `cost` | text | Cost display |
| `tokens` | muted | Token counts |
| `separator` | dim | Segment separators |
| `border` | borderMuted | Editor borders |

### Custom Theme Override

Create `~/.pi/agent/extensions/powerline-footer/theme.json`:

```json
{
  "colors": {
    "pi": "#ff5500",
    "model": "accent",
    "path": "#00afaf"
  }
}
```

Accepts theme color names (`accent`, `muted`, `dim`, etc.) or hex values (`#ff5500`).

### Nerd Font Support

Auto-detected for iTerm2, WezTerm, Kitty, Ghostty, and Alacritty. Force with environment variables:

```bash
POWERLINE_NERD_FONTS=1    # Force Nerd Fonts
POWERLINE_NERD_FONTS=0    # Force ASCII fallback
```

## Architecture

- **Incremental stats** — usage cache tracks position in session events, only processes new entries. Survives context checkouts via full recomputation.
- **Responsive layout** — segments fit top bar first, overflow to secondary row. Cached per render cycle (50ms TTL) for consistency between editor and widget.
- **Git status** — delegated to pi's `FooterDataProvider`, no subprocess spawning. Reactively re-renders on branch change.
- **Welcome overlay** — rendered as centered overlay on startup with gradient logo, model info, and keyboard shortcuts. Auto-dismisses after 30s.
