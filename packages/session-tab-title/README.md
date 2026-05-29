# session-tab-title

Sets your terminal tab title to show what you're working on AND whether pi is currently busy or idle. No more guessing which tab is which, or which agent is still working.

```
🏭 π - Implement JWT auth - myproject    ← turn in progress
🛬 π - Implement JWT auth - myproject    ← idle, ready for input
```

Visible in any terminal multiplexer that shows per-pane titles — cmux, tmux, iTerm tabs, etc. The icon is the first character so it survives narrow-tab truncation.

## How It Works

Listens for three pi events and sets the terminal title via `ui.setTitle`:

| Event | Icon | When |
|---|---|---|
| `session_start` (resume/fork) | 🛬 idle | Session resumed or forked — agent isn't working yet |
| `agent_start` | 🏭 busy | Turn in progress |
| `agent_end` | 🛬 idle | Turn finished — ready for input |

Priority for the display name:
1. Explicit session name set via `/name`
2. First user message text (truncated to 60 characters)

## Installation

```bash
pi install npm:@pi-extensions/session-tab-title
```

Restart pi to activate.

## Compatibility

Requires a terminal that supports setting the window title (most modern terminals do). Only activates when pi has a TUI (`hasUI` check).
