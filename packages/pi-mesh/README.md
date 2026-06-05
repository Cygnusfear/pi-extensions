# @pi-extensions/pi-mesh

Peer-to-peer mesh networking for pi sessions, powered by Zenoh.

Connect multiple pi coding sessions on the same machine or across a network so they can exchange messages, coordinate work, and share state — all without a central server.

## Features

- **Sidecar architecture** — one native Rust daemon per machine, shared by all sessions via Unix socket
- **Zero-configuration LAN** — mDNS scouting discovers peers automatically
- **Cross-machine routing** — Tailscale endpoint configuration for WAN mesh
- **Direct messaging** — `mesh_tell` with delivery receipts (delivered/visible)
- **Session viewing** — `mesh_view` reads recent entries from any live peer (uses ask/reply internally)
- **Channel pub/sub** — named channels for group communication with ambient batching
- **Identity system** — stable mesh identities decoupled from ephemeral connection IDs
- **Nickname claiming** — distributed tie-breaking with `claimedAt` timestamps
- **Busy-session awareness** — ambient chat batches for idle sessions, instant injection for active ones
- **Nerd font icons** — automatic detection of terminal capabilities

## Architecture

```
┌─────────────┐     Unix Socket     ┌──────────────────┐
│  pi session  │ ◄──────────────────► │   pi-mesh native  │
│  (Node.js)   │   ~/.pi/mesh.sock    │   (Rust sidecar)  │
└─────────────┘                       └────────┬─────────┘
                                               │
                                         Zenoh protocol
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                              ┌─────┴─────┐        ┌─────┴─────┐
                              │  Session  │        │  Session  │
                              │    B      │        │    C      │
                              └───────────┘        └───────────┘
```

The sidecar is a **singleton daemon** — the first pi session spawns it, all subsequent sessions connect to the existing instance. The sidecar stays alive until 60 seconds after the last client disconnects.

## How It Works

### Transport: Zenoh

[Zenoh](https://zenoh.io/) is the pub/sub transport underneath pi-mesh. It handles:

- **Peer discovery** via multicast scouting (mDNS)
- **Reliable pub/sub** with key expressions
- **Multi-transport**: UDP unicast, TCP, TLS, QUIC, WebSocket

The native Rust sidecar manages a single Zenoh session and multiplexes all client connections through it.

### Identity System

Each session has a layered identity:

| Layer | ID Type | Scope | Stability |
|-------|---------|-------|-----------|
| Zenoh Peer ID | `zid` | Machine | Shared across sessions |
| Client ID | `clientId` | Connection | Per-socket, ephemeral |
| Session ID | `sessionId` | pi session | Changes on resume/checkout |
| Mesh ID | `meshId` | Agent identity | Stable across reconnects |

The `meshId` is the routing identity — it persists in the session file and survives sidecar restarts, session compaction, and context checkouts.

### Delivery Receipts

Direct messages support two receipt phases:

1. **delivered** — the target session's extension received the message
2. **visible** — the target session surfaced it to the UI/session log

This makes messaging diagnosable: timeouts distinguish "peer unreachable" from "peer busy but received."

### Enriched receipts

Every `mesh_tell` receipt is **enriched** so the sender is never blind:

- `receiverBusy` — was the peer mid-turn when the message landed? A busy peer only surfaces a normal tell at the **end of its current turn**.
- `receiverDeafened` — the peer has `/mesh deafen` on and dropped the message.
- `view` — a **bounded** tail snapshot (last N meaningful entries) of what the peer was doing when the message landed. This is the "before" window the sender uses to decide: wait, follow up, or preempt. The snapshot rides the existing ack (no extra round-trip) and projects only the branch **tail**, so it stays O(window), not O(session-length).

### Interrupts (preempt a busy peer)

A normal tell to a busy peer waits for that peer's current turn to end. `mesh_interrupt` jumps the queue, at one of two levels:

| Level | Kills in-flight work? | When it lands | Use for |
|-------|----------------------|---------------|---------|
| `steer` (default) | No | After the peer's current tool batch, before its next LLM call | "wait, not this" corrections — the safe default |
| `abort` | **Yes (corrupt risk)** | Immediately — cancels the peer's in-flight tool via the agent abort signal, then delivers | Stop the peer **now** to prevent real damage (rare, nuclear) |

`abort` is not gated, but it is loud and documented as nuclear — a half-done git/publish/write on the peer can be left corrupt. Prefer `steer`. Both levels **respect `/mesh deafen`**: a deafened peer drops the interrupt and the receipt reports `receiverDeafened` so it is never silent.

## Tools

| Tool | Description |
|------|-------------|
| `mesh_peers` | List all visible pi sessions on the mesh |
| `mesh_tell` | Send a direct message. Returns an **enriched receipt**: the peer's busy/idle/deafened state + a snapshot of what it was doing when the message landed |
| `mesh_interrupt` | **Preempt** a busy peer's queue — `steer` (safe, default) or `abort` (nuclear). Respects deafen |
| `mesh_view` | Read recent session entries from another peer |
| `mesh_broadcast` | Broadcast to all peers on a topic |
| `mesh_join_channel` | Join a named channel |
| `mesh_leave_channel` | Leave a channel |
| `mesh_chat` | Post a message to a channel |

## Commands

| Command | Description |
|---------|-------------|
| `/mesh list` | Show all peers |
| `/mesh tell <peer> <msg>` | Direct message a peer |
| `/mesh view <peer>` | View a peer's recent session |
| `/mesh join <channel>` | Join a channel |
| `/mesh leave <channel>` | Leave a channel |
| `/mesh chat <channel> <msg>` | Post to a channel |
| `/mesh mute [on|off]` | Block outbound messages |
| `/mesh deafen [on|off]` | Silence inbound chat/tells |
| `/mesh status` | Show mute/deafen state |

## Building the Native Binary

The Rust sidecar must be compiled before use:

```bash
cd packages/pi-mesh/native
cargo build --release
```

This produces `target/release/pi-mesh` (or `pi-mesh.exe` on Windows). The TypeScript extension automatically resolves the binary path at startup.

### Requirements

- Rust 1.85+ (edition 2024)
- C compiler (for libc dependency)

## Configuration

Mesh behavior is configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_MESH_AMBIENT_CHAT_BATCH_MS` | `750` | Milliseconds to batch ambient channel messages |
| `HOME` | — | Socket path: `~/.pi/mesh.sock` |

### Mesh Config (Zenoh)

The mesh config object controls transport behavior:

```ts
interface MeshConfig {
  mode?: "peer" | "client" | "router";
  endpoints?: string[];       // Tailscale IPs for cross-machine
  scouting?: boolean;         // mDNS discovery (default: true)
  announceIntervalMs?: number; // Peer announcement frequency
}
```

## Setup

1. Build the native binary: `cd packages/pi-mesh/native && cargo build --release`
2. Install the extension in your pi config
3. Launch multiple pi sessions — they discover each other automatically via mDNS
4. Use `/mesh list` to see peers, `/mesh tell` to message them

For cross-machine mesh, configure endpoints with Tailscale IPs or other reachable addresses.

## Dependencies

- **zenoh** 1.7.2 — pub/sub transport protocol
- **tokio** — async runtime
- **@pi-extensions/shared** — session nickname and identity utilities
- **@sinclair/typebox** — tool parameter schemas
