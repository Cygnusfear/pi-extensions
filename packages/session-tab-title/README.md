# session-tab-title

Sets your terminal tab title to show what you're working on. No more guessing which tab is which.

```
π - Implement JWT auth - myproject
```

## How It Works

Listens for `session_start` (on resume/fork) and `agent_end` (covers first message in new sessions), then sets the terminal title via pi's `ui.setTitle` API.

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
