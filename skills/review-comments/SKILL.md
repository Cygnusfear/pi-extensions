---
name: review-comments
description: Use when working with // @mai: inline review comments — creating, resolving, listing, or checking drift of code review markers backed by mai tickets.
metadata:
  type: procedure
  domains: [review, code-quality]
  audience: worker
---

# Review Comments — // @mai: Inline Code Annotations

## Purpose

`// @mai:` comments are inline code review markers backed by mai tickets. They persist across sessions, track resolution history, and are protected from accidental deletion.

## The Marker

```
// @mai: [pe-xxxx] description of the issue
```

- Written by the human in VS Code (or by pi-diff-review visual review)
- On save, VS Code extension auto-creates a mai ticket and writes the ID back
- Open comments show yellow decorations, resolved show green

## Lifecycle

```
1. Human writes: // @mai: fix this off-by-one
2. VS Code extension auto-creates mai ticket on save → // @mai: [pe-3k7m] fix this off-by-one
3. Agent sees the comment when working on the file
4. Agent fixes the issue
5. Agent resolves: mai add-note pe-3k7m "Fixed: ..." && mai close pe-3k7m
6. Agent removes the // @mai: line from code (safe — ticket exists in mai)
```

## Cross-References

You can link @mai: comments to other tickets using mai's ID syntax:

```rust
//! @mai: [gso-l976] this isn't working, related to [[gso-82n3]] for context
```

- `[[gso-82n3]]` — wiki-style cross-reference (mai native)
- `[gso-82n3]` — single bracket also detected as cross-ref
- On ticket creation, `mai dep <id> <ref-id>` is called automatically
- `mai refs gso-82n3` finds all tickets/comments linking to it
- `mai check` validates all refs resolve

## Multiline Blocks

```rust
// @mai: TODO:
// 1. Connect to SpacetimeDB via SDK
// 2. Subscribe to NPC-related tables
// 3. Bootstrap brain state from subscription snapshot
```

Continuation lines (same comment prefix) are collected into a single block.
The full block text goes into the ticket. Decorations highlight the whole block.

## Agent Behavioral Rules

### Before editing a file

1. Scan the file for `// @mai:` comments: `rg '//\s*@mai:' <file>`
2. Read open comments — understand what the human flagged
3. Consider addressing the comment as part of your edit

### When addressing a // @mai: comment

1. Fix the issue the comment describes
2. Add a resolution note: `mai add-note <ticket-id> "Fixed: <what you did and why>"`
3. Close the ticket: `mai close <ticket-id>`
4. Remove the `// @mai:` line from the code

### If blocked by the guard

If you see a tool error like "Blocked: unresolved review comment [pe-xxxx]", it means you tried to remove a `// @mai:` line without resolving the ticket. You MUST:

1. Add a note: `mai add-note pe-xxxx "explanation"`
2. Close the ticket: `mai close pe-xxxx`
3. Then retry the edit — it will succeed now

### Never

- Ignore `// @mai:` comments when editing the same file
- Delete a `// @mai:` line without resolving the ticket first
- Close a ticket without explaining what was fixed

## Commands Reference

| Command | What | Mai equivalent |
|---------|------|---------------|
| `review list` | Show open review comments | `mai ls -k review` |
| `review show <id>` | Show full thread | `mai show <id>` |
| `review resolve <id>` | Resolve with note | `mai add-note <id> "fix" && mai close <id>` |
| `review check` | Detect drift | `rg '//\s*@mai:' --line-number` + check ticket status |

## Drift Detection

If a `// @mai:` line disappears without the ticket being closed, that's drift. The pi extension guard (`mai-review-guard.ts`) blocks agent edits that would cause drift. The git pre-commit hook catches manual deletion.

## Tags

All review tickets use: `review, hooman, inline-comment`
Diff-review tickets add: `diff-review`
