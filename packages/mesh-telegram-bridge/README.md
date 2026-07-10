# mesh-telegram-bridge

Makes the hooman a **first-class, durable mesh peer** ("The Hooman") reachable from an
ordinary Telegram group. A standalone headless bun process — **not** a pi extension —
that talks to the same per-machine mesh sidecar (`~/.pi/mesh.sock`) every agent uses.

## What it does

- **mesh → Telegram**: an agent `mesh_tell`s The Hooman (or posts to the shared channel)
  → the message lands in the Telegram group tagged with the agent's nickname, e.g.
  `👤 Gerard S.  auth landed, smoke-test?`. Direct tells are acked (the sender's
  delivery receipt resolves), so agents get honest "delivered" feedback.
- **Telegram → mesh**: you **reply** to a tagged message → routed as a direct
  `mesh_tell` to *that specific agent*. A **plain** (non-reply) message → broadcast to
  the shared mesh channel.

## Design notes

- Identity is a **fixed durable mesh id** + nickname `The Hooman` (post-v1a durable-id
  routing) so agents keep reaching the same "you" across bridge restarts. `claimedAt: 0`
  means the bridge always keeps the nickname on a conflict.
- Reuses pi-mesh's pure protocol helpers as-is (`tell-protocol`, `types`) — including the
  `mesh:tell` **unwrap** that inbound tells require (the bug fixed in `3fb8fe0`).

## Config

Lives OUTSIDE the repo (holds the bot token — never committed):
`~/.config/mesh-telegram-bridge/config.env` (mode 600)

```
TELEGRAM_BOT_TOKEN=...        # from @BotFather
HOOMAN_MESH_ID=...            # fixed UUID (pinned once)
MESH_CHANNEL=hooman
HOOMAN_NICKNAME="The Hooman"
TELEGRAM_CHAT_ID=...          # auto-captured on first message, persisted here
```

## Run

```bash
bun run packages/mesh-telegram-bridge/src/index.ts
```

Always-on via launchd:

```bash
cp packages/mesh-telegram-bridge/launchd/*.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.piextensions.mesh-telegram-bridge.plist
```

The bot must have **privacy mode OFF** (or be a group admin) to read plain messages.