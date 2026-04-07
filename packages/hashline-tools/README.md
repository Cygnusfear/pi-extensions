# @pi-extensions/hashline-tools

File editing with cryptographic verification — every line gets a hash anchor, and edits are rejected if the file changed since you last read it.

This solves the race condition that plagues naive LLM editing: the agent reads a file, generates edits, but by the time the edit is applied, something else (a formatter, a parallel agent, the human) has modified the file. Without verification, edits silently overwrite unrelated changes. Hashline tools catch this every time.

## How it works

### hash_read

`hash_read` returns file content with every line prefixed as `LINENUM:HASH|CONTENT`:

```
1:af|import { Express } from 'express';
2:3b|import { createServer } from 'http';
3:c7|
4:d2|const app = Express();
5:e1|const server = createServer(app);
```

The hash is the first byte of SHA-1 of the **whitespace-normalized** line content. Two hex characters gives 256 possible values — collisions are possible at this scale, but the line number in the anchor makes practical collisions extremely unlikely.

### hash_edit

`hash_edit` applies edits referencing anchors from a previous `hash_read`. Three edit operations:

| Operation | Parameters | Description |
|-----------|-----------|-------------|
| `set_line` | `anchor, new_text` | Replace a single line |
| `replace_lines` | `start_anchor, end_anchor, new_text` | Replace a range of lines |
| `insert_after` | `anchor, text` | Insert lines after a reference line |

**If the hash doesn't match**, the edit is rejected with a clear error:

```
Error: set_line anchor mismatch at line 4: expected d2, got f8. Re-read the file and retry.
```

This forces the agent to re-read the file and regenerate edits based on the current content — never blindly overwriting.

## Usage

### Read with anchors

```typescript
const result = await hashRead({
  path: 'src/server.ts',
  startLine: 1,
  endLine: 10
});
// Returns:
// 1:af|import { Express } from 'express';
// 2:3b|import { createServer } from 'http';
// ...
```

### Edit a single line

```typescript
await hashEdit({
  path: 'src/server.ts',
  edits: [
    { set_line: { anchor: '4:d2', new_text: 'const app = Express({ strict: true });' } }
  ]
});
```

### Replace a range

```typescript
await hashEdit({
  path: 'src/server.ts',
  edits: [
    {
      replace_lines: {
        start_anchor: '1:af',
        end_anchor: '2:3b',
        new_text: 'import { Express, Router } from "express";'
      }
    }
  ]
});
```

### Insert after a line

```typescript
await hashEdit({
  path: 'src/server.ts',
  edits: [
    { insert_after: { anchor: '4:d2', text: 'app.use(Router());' } }
  ]
});
```

### Multiple edits in one call

```typescript
await hashEdit({
  path: 'src/server.ts',
  edits: [
    { set_line: { anchor: '4:d2', new_text: 'const app = Express();' } },
    { insert_after: { anchor: '5:e1', text: 'app.set("trust proxy", 1);' } },
    { set_line: { anchor: '10:a4', new_text: 'server.listen(8080);' } }
  ]
});
// → "Applied 3 edit(s) to src/server.ts."
```

## Verification details

### Hash computation

```typescript
function computeLineHash(line: string): string {
  const normalized = line.replace(/\s+/g, "");  // remove ALL whitespace
  const digest = crypto.createHash('sha1').update(normalized).digest();
  return digest.subarray(0, 1).toString('hex');  // first byte → 2 hex chars
}
```

Whitespace normalization means edits survive indentation changes — only the actual content tokens matter for verification.

### Escaping warnings

If the original lines contain escaped backticks (\`) but the replacement text has unescaped backticks (`), a warning is emitted. This catches a common mistake when editing inside template literals where the escaping semantics matter.

### Range validation

- Line numbers must be ≥ 1 and within the file's actual line count
- `replace_lines` end anchor must be ≥ start anchor
- Out-of-range anchors produce a clear error with the file's actual line count

### Diff output

On successful edits, `hash_edit` generates a unified diff (via the system `diff` command) and includes it in the result. The TUI renders this diff with Shiki syntax highlighting.

## When to use hashline tools vs apply_patch

- **hashline tools** — when you need **verified editing** (e.g. files that might change between read and edit). Best for single-file precision edits.
- **apply_patch** — when you're making **multi-file changes** or creating/renaming files. Uses context-based matching instead of hash verification.

Both can coexist — use `hash_read`/ `hash_edit` for safety-critical edits on active files, and `apply_patch` for batch operations.

## Files

| File | Purpose |
|------|---------|
| `extensions/hashline-tools.ts` | `hash_read` and `hash_edit` tool registration and implementation |

## Dependencies

- `@mariozechner/pi-coding-agent` — core extension API, TUI rendering
- `@pi-extensions/shared` — diff renderer, tool UI utils
- `@sinclair/typebox` — parameter schema types
- `crypto` (Node.js built-in) — SHA-1 hash computation

## Setup

No additional configuration required. Tools are available immediately after installation.
