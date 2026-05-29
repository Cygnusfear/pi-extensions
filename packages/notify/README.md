# notify

**Agent-driven** desktop notifications. The agent fires a notification deliberately when it wants the hooman's attention — a finished reply, a question, "blocked", "smoke-test ready" — instead of auto-pinging on every turn.

> Previous behavior auto-fired on every `agent_end`. In code-mode a single message spawns several agent turns, so the hooman got pinged on random mid-work completions. Now the agent owns the channel.

## Usage

Code-mode:

```js
await notify("auth landed — smoke-test when free");
await notify("blocked: need the staging DB password");
await notify({ title: "Gerard S.", subtitle: "review", body: "6-pass clean, PR is up" });
```

Slash command:

```
/notify <message>
```

Pass a string (becomes the body) or `{ title, subtitle, body }`. The title defaults to the agent's mesh identity ("Gerard Stargate Freedman" → "Gerard S.") so the hooman knows which pane pinged them.

## Transport

| Environment | Channel | Notes |
|-------------|---------|-------|
| **cmux** | `cmux notify` over the control socket | Targets THIS workspace (via `CMUX_WORKSPACE_ID`); supports title/subtitle/body; clicking the banner focuses the pane. The bundled `cmux` CLI is auto-located from `CMUX_SHELL_INTEGRATION_DIR`. |
| Ghostty / iTerm2 / WezTerm / rxvt | OSC 777 escape | Fallback when not inside cmux. title + body only. |
| Kitty / Terminal.app / Windows Terminal / Alacritty | — | OSC 777 unsupported; no notification. |

Detection: if `CMUX_SOCKET_PATH` is set and the `cmux` CLI is found, the socket path is used; otherwise it falls back to OSC 777. Zero native dependencies either way.

## When agents should fire it

Fire `notify()` when handing the conversation back to the hooman — a real reply, a question, a done/blocked/smoke-test signal. Do **not** fire it on mid-work tool turns; it pings the desktop, so only use it when you actually want their eyes.

## Installation

```bash
pi install npm:@pi-extensions/notify
```

Restart pi to activate.
