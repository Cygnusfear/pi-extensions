# @pi-extensions/maestri-bridge

Signed, deterministic round-trip between Maestri-connected Pi terminals. Provides the
`maestri_ask` tool and the inbound bridge handlers for received asks and verified replies.

Canonical source moved here from the loose global `~/.pi/agent/extensions/` copy.

## What it does

- **`maestri_ask(target, prompt)`** — asks an idle, directly connected bridge-enabled Pi
  peer. The prompt is delivered through `maestri ask`; the peer's verified answer returns
  asynchronously via the signed inbound channel as a normal incoming Pi message.
- **Inbound ask handling** — a target owning an exclusive completion boundary rejects busy
  requests, replies over the signed channel on `agent_settled` (ask-back), and defers
  reply delivery until the settled handler has unwound.
- **Replay / capacity safety** — bounded replay cache, outbound request TTL, inbound work
  limit, and signed (HMAC) envelopes with clock-skew tolerance.

## Guarantee: `maestri_ask` NEVER blocks the caller session

`maestri ask` types the prompt into the target PTY immediately, then **blocks** waiting for
completion detection. Pi runs as agentType `custom`, which never fires completion detection,
so awaiting the CLI used to hold the caller's session open for up to 10 minutes — the exact
"tool frozen my session" failure. The `execute` handler therefore submits the transport as a
**bounded detached exec** (20s) and returns at once. The verified reply is delivered later
through the signed inbound channel (`deliverDeferredReplies` → `pi.sendUserMessage`, followUp).

- A killed-at-bound transport has still typed the prompt (ask-back on the target flows
  regardless), so the reply window is kept.
- A real non-zero CLI exit (target vanished / CLI error) drops the pending outbound id and
  delivers an asynchronous failure notice to the caller.

## API version note

This extension targets the **installed pi 0.80.10** coding-agent API (`streamingBehavior`,
`agent_settled`). The monorepo's root `devDependencies` still pin
`@earendil-works/pi-coding-agent` to 0.74.1, so the repo-native `tsc` check reports false
version-skew for this package. The authoritative typecheck is against the 0.80.10 runtime
types (passes clean); it should be re-confirmed whenever the workspace coding-agent pin is
bumped to match the installed binary.

## Layout

- `extension/maestri-bridge.ts` — tool + handler wiring.
- `extension/maestri-bridge/protocol.ts` — signed envelope protocol (HMAC, TTLs, parse).
```
