# core-edit-ui

Overrides the built-in `edit` tool's result renderer with Shiki syntax-highlighted diffs.

Upstream's edit tool produces a unified diff in plain text. This extension replaces the renderer with syntax-colored code, background tints for add/remove lines, and inline word-level change highlighting.

Works because upstream 0.63.1 honors extension tool definitions over built-in ones for rendering.

## Dependencies

- `@pi-extensions/shared` — Shiki diff renderer
