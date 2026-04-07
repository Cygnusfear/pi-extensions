# hashline-tools

Stable, verifiable file editing using hashline anchors.

Each line gets a hash anchor (`LINENUM:HASH|CONTENT`). Edits are verified against the current hash — if the file changed since last read, the edit is rejected. Prevents silent overwrites when the file has been modified between read and edit.

## Tools

| Tool | Description |
|------|-------------|
| `hash_read` | Read a file with hashline anchors |
| `hash_edit` | Edit using hashline anchors (verified, rejects on mismatch) |
