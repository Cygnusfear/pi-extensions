# @pi-extensions/file-tools

Patch-based file editing and image viewing — the two file operations the LLM needs that don't fit inside the code-mode sandbox.

`apply_patch` is a direct-call tool (not sandboxed) that applies multi-file edits using a human-readable diff format. `readImage` (exposed from code-mode's sandbox) lets the LLM see images by embedding them as attachments in the tool result.

## apply_patch

A file-oriented diff format designed to be easy for LLMs to generate and safe to apply. Supports creating, updating, deleting, and moving files in a single operation.

### Format

```
*** Begin Patch
[ one or more file sections ]
*** End Patch
```

Each file section starts with one of three headers:

| Header | Action |
|--------|--------|
| `*** Add File: <path>` | Create a new file. All following lines are `+`-prefixed content. |
| `*** Delete File: <path>` | Remove an existing file. Nothing follows. |
| `*** Update File: <path>` | Patch an existing file in place. Optionally followed by `*** Move to: <new-path>`. |

### Example: full workflow

```
*** Begin Patch
*** Add File: src/utils/logger.ts
+export const log = (msg: string) => console.log(`[LOG] ${msg}`);
+
+export const warn = (msg: string) => console.warn(`[WARN] ${msg}`);
*** Update File: src/app.ts
*** Move to: src/main.ts
@@ import express from 'express';
-import express from 'express';
+import { express } from './framework';
@@ const port = 3000;
-const port = 3000;
+const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
*** Delete File: src/legacy.ts
*** End Patch
```

### How updates work

Update hunks use `@@` context lines followed by `-` (remove) and `+` (add) lines:

- **Context lines** (space-prefixed): used to locate where in the file the change goes. The matcher tries multiple strategies: exact match, trimmed match, and Unicode-normalized match.
- **Remove lines** (`-`-prefixed): lines that should be replaced
- **Add lines** (`+`-prefixed): replacement content

If the old lines can't be found in the file, the patch is **rejected** with a clear error showing what was expected. This prevents silent overwrites.

### Fuzzy matching

The patch applier tries progressively relaxed matching when exact matches fail:

1. **Exact** — character-for-character match
2. **Trimmed trailing whitespace** — ignores trailing spaces/tabs
3. **Trimmed** — ignores leading and trailing whitespace
4. **Unicode-normalized** — converts smart quotes, em dashes, non-breaking spaces to ASCII equivalents before comparing

### Heredoc support

Patches can be wrapped in heredoc syntax for readability in code blocks:

```typescript
const patch = `<<PATCH
*** Begin Patch
*** Add File: hello.txt
+Hello world
*** End Patch
PATCH`;
```

### Move/rename

`*** Update File` can include `*** Move to: <new-path>` to rename a file while editing it. The old file is deleted after the new one is written.

### Output

On success, `apply_patch` returns:

- A summary line per file: `A path`, `D path`, `M path`
- A unified diff for each changed file (used by the TUI for rendering)

### Integration with code-mode

`apply_patch` is registered as a **direct LLM tool** (not sandbox-only). This means it appears as a top-level tool call alongside `execute_code`. The sandbox also exposes `applyPatch()` as a convenience function that wraps the same logic.

## readImage

Reads image files (png, jpg, gif, webp) and includes them as attachments in the tool result, so the LLM can actually see the image.

This is particularly useful for:
- Inspecting screenshots of UI changes
- Reviewing generated diagrams
- Debugging visual rendering issues

```typescript
const result = await readImage({ path: 'screenshots/homepage.png' });
// Image data is included in the tool result as an attachment
```

Inside the code-mode sandbox, `readImage()` stashes the base64-encoded image data, which is then extracted and included in the `execute_code` result content as image blocks alongside the text output.

## Files

| File | Purpose |
|------|---------|
| `extensions/file-tools.ts` | `apply_patch` tool registration, patch parser, and applier |

## Dependencies

- `@mariozechner/pi-coding-agent` — core extension API
- `@pi-extensions/shared` — `tool-ui-utils` (diff rendering, timing)
- `diff` (npm) — unified diff generation
- `@sinclair/typebox` — parameter schema types

## Setup

No additional configuration required. Tools are available immediately after installation.
