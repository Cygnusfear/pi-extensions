# notify

Desktop notifications when the agent finishes. Get pinged the moment pi is waiting for input — no more tab-checking.

Uses OSC 777 escape sequences — zero dependencies, no native binaries.

## How It Works

Listens for the `agent_end` event, extracts the last assistant message text, and sends it as a desktop notification via OSC 777:

1. Agent finishes responding
2. Extension extracts the last assistant text (plain markdown, stripped of formatting)
3. Sends `ESC]777;notify;π;<message>BEL` to the terminal
4. Terminal displays a native desktop notification

## Installation

```bash
pi install npm:@pi-extensions/notify
```

Restart pi to activate.

## Compatibility

| Terminal | Support | Notes |
|----------|---------|-------|
| **Ghostty** | ✅ | Full support |
| **iTerm2** | ✅ | Full support |
| **WezTerm** | ✅ | Full support |
| **rxvt-unicode** | ✅ | Full support |
| Kitty | ❌ | Uses OSC 99 instead |
| Terminal.app | ❌ | No OSC 777 support |
| Windows Terminal | ❌ | No OSC 777 support |
| Alacritty | ❌ | No OSC 777 support |

## Notification Content

- **Title:** `π`
- **Body:** Last assistant message text, trimmed to 200 characters. Falls back to "Ready for input" if no text is available.
