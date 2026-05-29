# session-tab-title

Sets your terminal workspace title to `<stage-icon> <session-name>` so terminal multiplexers (cmux, tmux, iTerm tabs) show at a glance BOTH which session a pane is AND what lifecycle stage the agent is in.

```
🧶 fixer JWT-auth      ← planning (default)
🏭 fixer JWT-auth      ← implementing
🕵️ fixer JWT-auth      ← running review
🛬 fixer JWT-auth      ← landing a 20.01 process
```

You set the name (your mnemonic); the agent self-drives the icon.

## Workflow

1. **You** name the session: `/name fixer JWT-auth` — the title becomes `🧶 fixer JWT-auth` (default planning).
2. **The agent** moves the stage as work progresses, by calling `status()` from code-mode:
   ```js
   await status("implementing");  // 🏭 fixer JWT-auth
   await status("review");        // 🕵️ fixer JWT-auth
   await status("landing");       // 🛬 fixer JWT-auth
   ```
3. **cmux** colors the tab from the emoji (color is a cmux-side concern; this extension only emits the icon + name).

You can also drive it manually: `/status implementing`.

## Stages

| call | icon | stage | cmux color |
|------|------|-------|------------|
| `status("planning")` | 🧶 | planning (default) | none |
| `status("implementing")` | 🏭 | implementing | amber |
| `status("blocked")` | 🚦 | blocked, resolve soon | red |
| `status("blocked-long")` | ⛔ | blocked, long | charcoal |
| `status("review")` | 🕵️ | running review (6-pass etc) | teal |
| `status("landing")` | 🛬 | landing (a 20.01 process) | teal |
| `status("bugfix")` | 🪲 | fixing an already-landed bug | green |
| `status("cleaning")` | 🧼 | assigned cleaner role | green |
| `status("coordinator")` | 👩‍🚀 | coordinator | purple |
| `status("bhakti")` | 📡 | bhakti deploy manager | purple |

Aliases: `plan`, `impl`/`implement`, `blocked-soon`, `reviewing`, `land`, `fix`/`bug`, `clean`/`cleanup`, `coord`, `deploy`.

## Persistence

The chosen stage is saved as a custom session entry, so `/reload` and resume restore the stage instead of snapping back to planning.

## How It Works

- `session_start` → restore the persisted stage (default 🧶 planning), render the title
- `status(stage)` (code-mode) → set + persist + re-render
- `/status <stage>` (slash command) → same, for manual override
- `agent_end` → re-render (covers the first message in a new session, where the name becomes available after the turn)

The icon is the FIRST character of the title so it survives narrow-tab truncation.

## Compatibility

Requires a terminal that supports setting the window/tab title (most modern terminals do). Only activates when pi has a TUI (`hasUI` check). Tab coloring from the emoji is a cmux feature; other terminals just show the icon glyph.
