# core-edit-ui

Syntax-highlighted diffs for pi's edit tool. Replaces the plain-text diff renderer with Shiki-powered syntax coloring, background tints, and word-level change highlighting.

## How It Works

Overrides the built-in `edit` tool's `renderResult` method. Execution is delegated unchanged to the stock tool — only the visual output is different.

- **Syntax coloring** — Shiki highlights code by language (detected from file path)
- **Background tints** — green for added lines, red for removed lines
- **Word-level diffs** — inline highlighting shows exactly which words changed within a line
- **Collapse/expand** — long diffs collapse to 30 lines with a `ctrl+o` expand hint

## Installation

```bash
pi install npm:@pi-ext/core-edit-ui
```

Restart pi to activate.

## Compatibility

Requires pi ≥ 0.63.1 (upstream commit `1ba899f6`) which honors extension tool definitions over built-in ones for rendering.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@pi-extensions/shared` | Shared Shiki diff renderer (`tui-diff-renderer.ts`) |
| `shiki` | Syntax highlighting engine (transitive) |

## How It Fails Gracefully

If Shiki hasn't finished loading or rendering fails, falls back to the built-in plain-text renderer. No errors shown to the user.
