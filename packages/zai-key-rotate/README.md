# zai-key-rotate

Automatic API key rotation for ZAI providers. Swaps between multiple API keys on rate limit.

## Features

- **Auto-rotate on rate limit** — detects 429/rate-limit errors and swaps to the next key automatically
- **Manual swap** — `/zai-keys swap` to cycle to the next key
- **Key management** — add, remove, and view keys with redacted display
- **Persists across restarts** — config stored in `~/.pi/agent/zai-keys.json`

## Commands

| Command | Description |
|---------|-------------|
| `/zai-keys` | Show current keys and status |
| `/zai-keys swap` | Manually swap to the next key |
| `/zai-keys keys` | Same as above (show keys) |
| `/zai-keys auto-on` | Enable auto-rotation on rate limit |
| `/zai-keys auto-off` | Disable auto-rotation |
| `/zai-keys add <key>` | Add a new API key |
| `/zai-keys remove <#>` | Remove a key by number |

## How It Works

On startup, the extension overrides the `zai-coding` and `zai` providers with the currently active API key using `pi.registerProvider()`. This replaces the default `ZAI_API_KEY` env var lookup.

When a rate-limit error is detected on a ZAI model, the extension automatically swaps to the next key — the next request uses the new key.

**Important — /login overrides rotation:** pi's auth resolution is `stored /login credential > configured > env var`. If you have ever run `/login` for a ZAI provider, that stored key owns the provider and rotating `ZAI_API_KEY` has no effect. The extension warns when it detects this; `/logout` from the provider to let rotation drive the key.

Works alongside `/zai` from model-shortcuts for model switching.
