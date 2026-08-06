# kimi-key-rotate

Automatic API key rotation for the Kimi For Coding provider. Swaps between multiple API keys on rate limit.

## Features

- **Auto-rotate on rate limit** — detects 429/rate-limit errors and swaps to the next key automatically
- **Manual swap** — `/kimi-keys swap` (or the `/kimi-swap` alias) to cycle to the next key
- **Key management** — add, remove, and view keys with redacted display
- **Persists across restarts** — config stored in `~/.pi/agent/kimi-keys.json`

## Commands

| Command | Description |
|---------|-------------|
| `/kimi-keys` | Show current keys and status |
| `/kimi-keys swap` | Manually swap to the next key |
| `/kimi-swap` | Alias for `/kimi-keys swap` |
| `/kimi-keys keys` | Same as above (show keys) |
| `/kimi-keys auto-on` | Enable auto-rotation on rate limit |
| `/kimi-keys auto-off` | Disable auto-rotation |
| `/kimi-keys add <key>` | Add a new API key |
| `/kimi-keys remove <#>` | Remove a key by number |

## How It Works

On startup, the extension sets the `KIMI_API_KEY` environment variable to the currently active key. The `kimi-coding` provider reads `KIMI_API_KEY` on every request, so mutating it replaces the default env var lookup. You can also seed the key list with `KIMI_API_KEY_1` and `KIMI_API_KEY_2`.

When a rate-limit error is detected on a `kimi-coding` model, the extension automatically swaps to the next key — the next request uses the new key. Kimi reports quota exhaustion as **403** (not 429), so 403/forbidden errors also trigger auto-swap.

**Important — /login overrides rotation:** pi's auth resolution is `stored /login credential > configured > env var`. If you have ever run `/login` for kimi-coding, that stored key owns the provider and rotating `KIMI_API_KEY` has no effect. The extension warns when it detects this; `/logout` from kimi-coding to let rotation drive the key.

Works alongside `/kimi` from model-shortcuts for model switching.
