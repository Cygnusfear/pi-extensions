# @pi-ext/reload

Surface pi's built-in reload as both a slash command (`/reload-runtime`) and an LLM-callable tool (`reload_runtime`).

## What it does

| Interface | Name | Mechanism |
|-----------|------|-----------|
| Slash command | `/reload-runtime` | `ctx.reload()` from `ExtensionCommandContext` — synonym for built-in `/reload`. |
| Tool | `reload_runtime` | `pi.reload()` from `ExtensionAPI`. Awaits completion; the next agent turn sees the new extension code. |

After an agent edits extension code mid-session, it calls `reload_runtime` and the new code is live on the next turn — no manual `/reload` needed.

## Host requirement

The tool path requires `pi-coding-agent` to expose `pi.reload()` on `ExtensionAPI`. If your build pre-dates that, the tool returns an `isError: true` result asking you to upgrade or type `/reload` manually. The slash command always works because `ExtensionCommandContext.reload()` is older.

## History

This tool went through three broken designs before the host was extended to support it:

- **v1** called `pi.sendUserMessage("/reload", { deliverAs: "followUp" })`. **Silent no-op** — `sendUserMessage` hardcodes `expandPromptTemplates: false` (see `agent-session.ts:1381`), so the slash dispatcher never sees the text. The tool returned a confident "Queued /reload" message while doing absolutely nothing.
- **v2** called `ctx.reload()` from tool `execute()`. **Runtime error** — tools receive `ExtensionContext`, not `ExtensionCommandContext`. The runtime intentionally separates the two; only command handlers and TUI input could trigger reload.
- **v3** fired a desktop notification asking the hooman to type `/reload`. **Honest but wrong** — reload should reload, not pester. The notification was a workaround dressed up as the answer.
- **v4** (current) waits for the host to expose `pi.reload()` on `ExtensionAPI` and calls it directly. The tool finally does what its name says.

## Setup

```json
{
  "pi": {
    "extensions": ["./packages/reload/extensions/reload.ts"]
  }
}
```

Then `/reload` once to pick up the extension itself.
