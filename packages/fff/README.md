# fff

Fast file finder using [`fff-bun`](https://github.com/ff-labs/fff-bun) via a subprocess.

Keeps the Rust worker threads and file-watcher threads out of pi's address space by running the native fff server as a separate process. The subprocess auto-exits after 5 minutes of inactivity.

Falls back gracefully — if the server can't start, tools register but return clear errors so agents fall back to `rg`/`fd`.

## Tools

| Tool | Description |
|------|-------------|
| `fff_find` | Fuzzy file search by name with frecency ranking |
| `fff_grep` | Content search with frecency-ranked results |
| `fff_multi_grep` | Multi-pattern OR-logic content search |
