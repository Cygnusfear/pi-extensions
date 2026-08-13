# @pi-extensions/maestri-bridge

Signed, bounded request/reply transport between Maestri-connected Pi terminals, with exact terminal-to-conversation continuity across Maestri restarts.

## Continuity guarantee

Maestri gives each terminal a stable `MAESTRI_TERMINAL_ID`. The bridge maps that UUID to Pi's authoritative **absolute JSONL session file**:

```text
~/.pi/agent/maestri-sessions/<terminal-uuid> -> /absolute/path/to/session.jsonl
```

The mapping is a per-terminal symlink, published atomically. A concrete file—not a session ID—is the durable identity because Pi session IDs are resolved within the current project directory. Consequently, a protected terminal resumes the same conversation even if its startup directory changes.

### Launch ownership

Users continue to launch the normal Maestri Pi preset. Installation patches its command to `~/.pi/agent/bin/pi-maestri`; no special command is required day to day.

The wrapper applies this ownership matrix. It parses Pi built-in flags with their value arity, so a selector-shaped model name, prompt, or export path remains data:

| Launch shape | Behavior |
|---|---|
| No persistent selector, valid pin | Open the exact pinned file with `pi --session <absolute-file>` |
| No persistent selector, no pin yet | Bootstrap a deterministic session ID from the terminal UUID; `session_start` publishes its concrete file |
| `--session`, `--session-id`, `--continue`/`-c`, `--resume`/`-r`, or `--fork` | Do not inject the old pin; let Pi select, then adopt `getSessionFile()` on `session_start` |
| `--no-session` | Intentionally ephemeral; do not record a pin |
| Manual bare `pi` inside Maestri | Warn that the process is unprotected and never create, replace, or steal the terminal's pin |

In-process `/new`, `/resume`, `/fork`, and `/clone` all produce a Pi `session_start`; the extension atomically advances the terminal pin to the resulting authoritative file. Pi's deliberate `/restart` re-exposes wrapper ownership only at the re-exec boundary. Descendant processes do not inherit pin authority.

A legacy ID-only map, missing target, empty file, malformed path, map replacement during validation, or untrusted mapping **fails loudly before Pi starts** (exit 78). The wrapper never lets Pi silently create a replacement conversation at a missing path.

### Provenance and recovery

Every managed `session_start` also appends a version-2 `session-pinned` custom entry containing the terminal UUID, session ID, concrete file, launch mode, and timestamp. Recovery binds evidence to the JSONL file that physically contains it and validates:

- Pi session header and payload session IDs agree;
- the v2 nominated file equals the containing file;
- terminal UUID and session ID are valid;
- timestamp is canonical ISO-8601 and within the future-skew bound.

Version-1 ID-only provenance can be migrated because its containing JSONL supplies the missing concrete-file identity. Regex scans and unbound payload paths are not trusted. Recovery exits non-zero while any legacy pin lacks provenance-valid containing-file evidence; such a terminal must be resolved before restart.

## Installation and restart drill

```sh
# Install the wrapper.
packages/maestri-bridge/bin/maestri-pin-install --install

# Recover/migrate pins from strict in-session provenance.
packages/maestri-bridge/bin/maestri-pin-install --recover

# Inspect every live Maestri terminal. Non-pinned rows make this exit non-zero.
packages/maestri-bridge/bin/maestri-pin-install --harvest

# Quit Maestri first: it autosaves and could overwrite live config edits.
# Then patch presets plus every persisted terminal command and resumeCommand.
packages/maestri-bridge/bin/maestri-pin-install --patch

# Verify persisted launch ownership and pin coverage.
packages/maestri-bridge/bin/maestri-pin-install --audit
```

Unknown installer arguments fail with exit 64; misspelled recovery or patch phases are never silent no-ops. Malformed persisted JSON is reported as `BLOCKED` by audit/status rather than crashing.

`--patch` refuses to run while Maestri is active. It preflights every configuration file before mutation, makes timestamped backups, stages and fsyncs the full plan, then applies it transactionally with rollback on failure, and performs a postcondition audit. A normal persisted terminal is protected when `command` names the exact installed absolute wrapper target, its concrete pin is valid, and either `resumeCommand` names that wrapper or Maestri has consumed `resumeCommand` after a successful restore and persisted the terminal as `running`. The latter state is reported explicitly as `resume=missing(command-fallback)`; missing resume commands in restored or unknown states remain blocked. A bare `pi-maestri` command remains blocked until patching normalizes it. `--no-session` terminals are reported as intentionally ephemeral.

Inside Pi, `/maestri-bridge` reports the bridge state, terminal UUID, process ownership mode, concrete pin state, live session file, pin/live match, and persisted launch-command state.

Agent-directory precedence is consistent everywhere:

1. `PI_MAESTRI_BRIDGE_HOME/.pi/agent` (test/isolation seam)
2. `PI_CODING_AGENT_DIR`
3. `~/.pi/agent`

## Request/reply bridge

- **`maestri_ask(target, prompt)`** sends a signed request to an idle directly connected Pi peer and returns its verified final answer.
- HMAC envelopes use canonical payloads, bounded TTLs, clock-skew checks, replay admission, and bounded outbound tracking.
- A target that owns another completion boundary rejects the request rather than interleaving work.
- Accepted requests reserve reply capacity at admission. Replies run FIFO and are never silently dropped.
- Detached transports are bounded to four active and sixteen queued commitments. Courtesy busy/saturation rejections are droppable and never queue beyond that global bound.
- `maestri ask` types into the peer PTY and then waits for completion detection unavailable to custom agents. The extension therefore uses bounded detached submission: kill-at-bound means submitted; a real non-zero exit is a transport failure.
- Verified replies arriving during unrelated work wait for the next `agent_settled`. Failed injection is audited and retried, up to three attempts.
- Injection bypass requires both the exact registered text and `event.source === "extension"`; an interactive lookalike cannot consume it.

## Development

```sh
cd packages/maestri-bridge
bun test
bunx tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext \
  --allowImportingTsExtensions --skipLibCheck extension/maestri-bridge.ts
sh -n bin/pi-maestri
```

This package targets Pi coding-agent `>=0.80.10` (`agent_settled`, session lifecycle events, and `ctx.sessionManager.getSessionFile()`).

## Layout

- `extension/maestri-bridge.ts` — tool, bridge handlers, session lifecycle, and `/maestri-bridge` status.
- `extension/maestri-bridge/protocol.ts` — signed wire protocol.
- `extension/maestri-bridge/bridge-state.ts` — bounded replay, outbound, and detached transport state.
- `extension/maestri-bridge/session-pinning.ts` — concrete-file pin store and process ownership.
- `extension/maestri-bridge/maestri-config.ts` — conservative Maestri command parsing, rewriting, and audit.
- `extension/maestri-bridge/maestri-list.ts` — connected-terminal parser.
- `bin/pi-maestri` — transparent protected launcher.
- `bin/maestri-pin-install` — install, recovery, harvest, patch, and audit CLI.
- `test/` — Bun unit, subprocess, race, and boundary tests.
