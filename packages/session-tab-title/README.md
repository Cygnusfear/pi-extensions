# session-tab-title

Sets your terminal workspace title to `<stage-icon> <agent-name> <ses-title> - <folder>` so terminal multiplexers (cmux, tmux, iTerm tabs) show at a glance which pane it is, who is driving it, AND what lifecycle stage the agent is in.

```
🧶 Gerard S. NPC - my-repo      ← planning (with the hooman)
🏭 Gerard S. NPC - my-repo      ← implementing
🕵️ Gerard S. NPC - my-repo      ← running review
🛬 Gerard S. NPC - my-repo      ← landing a 20.01 process
🚬 Gerard S. NPC - my-repo      ← landed, hooman should smoke-test
🚏 Gerard S. NPC - my-repo      ← parked, awaiting direction
```

Title parts:
- **`<agent-name>`** — the agent's mesh identity ("Gerard Stargate Freedman" → "Gerard S."), derived automatically.
- **`<ses-title>`** — the hooman's `/name` topic, OR a short codename the agent sets with `sessionTitle("WARPSTOP")` (≤12 chars) when no `/name` is given. The hooman's `/name` wins when both exist.
- The agent self-drives the **stage icon** via `status()`.

## Workflow

1. **You** set the topic: `/name NPC` — the title becomes `🧶 Gerard S. NPC - my-repo` (default planning; "Gerard S." is the agent's mesh identity, derived automatically). If you don't `/name` it, the agent may self-assign a codename: `await sessionTitle("WARPSTOP")`.
2. **The agent** moves the stage as work progresses, by calling `status()` from code-mode:
   ```js
   await status("implementing");  // 🏭 Gerard S. NPC - my-repo
   await status("review");        // 🕵️ Gerard S. NPC - my-repo
   await status("landing");       // 🛬 Gerard S. NPC - my-repo
   await status("parked");        // 🚏 Gerard S. NPC - my-repo  (done, awaiting direction)
   ```
3. **cmux** colors the tab from the emoji (color is a cmux-side concern; this extension only emits the icon + identity + title + folder).

You can also drive it manually: `/status implementing` and `/title WARPSTOP`.

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
| `status("smoketest")` | 🚬 | landed — hooman should smoke-test | yellow |
| `status("parked")` | 🚏 | doing nothing, awaiting direction | grey |
| `status("attention")` | 🚨 | needs hooman attention (urgent) | red |

Aliases: `plan`, `impl`/`implement`, `blocked-soon`, `reviewing`, `land`, `fix`/`bug`, `clean`/`cleanup`, `coord`, `deploy`, `smoke`/`test`, `idle`/`waiting`/`park`/`done`, `urgent`/`attn`/`alarm`/`help`.

**🧶 planning is not idle** — it means actively planning *with* the hooman. After finishing (e.g. post-landing), go to 🚏 `parked`, not back to 🧶.

## Session title (codename)

The `<ses-title>` slot is normally the hooman's `/name` topic. When the hooman hasn't named the session, the agent can set a short codename so the pane is identifiable:

```js
await sessionTitle("WARPSTOP");   // 🧶 Gerard S. WARPSTOP - my-repo
await sessionTitle("");           // clear it
```

- Max **12 chars** (clipped, with a note in the return).
- The hooman's `/name` **wins** whenever set — the codename shows only while there's no `/name`.
- Persists across reload (custom session entry), same as the stage.
- Manual: `/title WARPSTOP`.

## Persistence

The chosen stage AND the agent-set session codename are each saved as custom session entries, so `/reload` and resume restore them instead of snapping back to defaults.

## How It Works

pi core owns *when* the title refreshes (session rename via `/name`, reload, session switch) and would otherwise clobber the title with its default `π - <name> - <cwd>` format. This extension registers a **title formatter** via `ctx.ui.setTitleFormatter` so core asks the extension for the string on every refresh — race-free, no clobber, no flicker. Core supplies the live session name + cwd basename; the extension adds the stage icon and the agent identity and lays it out as `<icon> <agent-name> <ses-title> - <folder>`.

- `session_start` → restore the persisted stage (default 🧶 planning) + register the title formatter (which applies the title immediately) + subscribe to mesh stable-id changes (the identity "Gerard S." may resolve slightly after start; the title refreshes the moment it lands)
- `status(stage)` (code-mode) or `/status <stage>`, and `sessionTitle(name)` (code-mode) or `/title <name>` → set + persist + push an immediate `setTitle` for an instant update (core's later refreshes pick up the new state via the formatter)
- `agent_end` → re-render (covers the first message in a new session, where the name becomes available after the turn — core does not refresh on plain messages)

**Fallback:** when the running pi build lacks `setTitleFormatter` (older than the formatter-hook release), the extension falls back to re-rendering on the `/name` input event. The formatter path supersedes it when available.

The icon is the FIRST character of the title so it survives narrow-tab truncation.

## Compatibility

Requires a terminal that supports setting the window/tab title (most modern terminals do). Only activates when pi has a TUI (`hasUI` check). Tab coloring from the emoji is a cmux feature; other terminals just show the icon glyph.
