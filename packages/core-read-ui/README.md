# core-read-ui

Collapsible read output with timing metadata for pi's built-in `read` tool.

## How It Works

Overrides the built-in `read` tool's renderer. Execution is delegated to the stock tool — only the display is different.

- **Timing header** — shows when the read started, ended, and how long it took (e.g. `14:32:01 → 14:32:01 (8ms)`)
- **Collapse/expand** — outputs longer than 40 lines collapse with a `ctrl+o` expand hint
- **Clean layout** — no redundant framing, just the file content with a subtle timing line

## Installation

```bash
pi install npm:@pi-extensions/core-read-ui
```

Restart pi to activate.

## Compatibility

Requires pi ≥ 0.63.1 (extension tool override support).

## Dependencies

| Package | Purpose |
|---------|---------|
| `@pi-extensions/shared` | Shared UI utilities (`tool-ui-utils.ts` — timing formatting, collapse logic) |
