# @pi-ext/cwd

Change the current session's base directory.

## Usage

```
/cwd                         # print current base + repo info
/cwd ~/Projects/trek         # absolute or home-relative
/cwd .worktrees/something    # relative to current base
```

## Behavior

- **Session-local.** Changing cwd affects **this session only**. Other open Pi
  sessions are untouched.
- **Agents inherit.** Workers spawned after `/cwd` use the new base
  automatically (`ctx.cwd` is updated across all extensions and built-in
  tools).
- **History preserved.** The current session is forked into the new cwd's
  session bucket and switched into. Your conversation survives the change.
- **Existing agents untouched.** Workers that were already running keep their
  original worktree/cwd. Only new spawns pick up the new base.

## How it works

Pi bakes cwd into the session at creation time. There's no mutable cwd field,
so the extension does the only safe thing:

1. Forks the current session into the target cwd via
   `SessionManager.forkFrom()`.
2. Calls `ctx.switchSession()` on the forked file, which tears down the
   current runtime and rebuilds it against the new cwd.
3. `process.chdir()` happens inside Pi's runtime apply step, so every
   cwd-bound service (tools, footer, teams) snaps to the new base.

This is the same machinery Pi uses for `/fork`, just parameterized on the
target directory.

## Limitations

- The current session must be persisted. In-memory sessions (rare in
  interactive mode) cannot be forked.
- Changing cwd always creates a new session file in the new cwd's bucket
  (`~/.pi/agent/sessions/<encoded-target-cwd>/`). Repeated `/cwd` calls
  chain these via `parentSession` — cheap, but visible in the session list.
