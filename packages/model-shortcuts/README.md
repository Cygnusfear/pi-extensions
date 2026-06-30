# model-shortcuts

Instant model switching with slash commands. Zero maintenance — always resolves to the latest version dynamically.

## Features

- **10 slash commands** for one-key model switching across Anthropic, OpenAI Codex, ZAI, and Kimi providers
- **Dynamic resolution** — always picks the highest-versioned model from the registry (no stale IDs)
- **Intelligent filtering** — skips pinned/dated models, aliases, and thinking variants when selecting "latest"
- **Graceful fallbacks** — notifies if no matching model is found or if the API key is missing

## Commands

| Command   | Provider     | Resolves                 | Example Output      |
| --------- | ------------ | ------------------------ | ------------------- |
| `/opus`   | Anthropic    | Latest `claude-opus-*`   | `claude-opus-4-7`   |
| `/sonnet` | Anthropic    | Latest `claude-sonnet-*` | `claude-sonnet-4-7` |
| `/haiku`  | Anthropic    | Latest `claude-haiku-*`  | `claude-haiku-4-7`  |
| `/codex`  | OpenAI Codex | Latest `gpt-*-codex`     | `gpt-5.5x`          |
| `/gpt`    | OpenAI Codex | Latest `gpt-5.*`         | `gpt-5.5`           |
| `/zai`    | ZAI          | latest `glm-5.x`         | `glm-5.2`           |
| `/zturbo` | ZAI          | `glm-5-turbo`            | `glm-5-turbo`       |
| `/z5v`    | ZAI          | `glm-5v*`                | `glm-5v-turbo`      |
| `/z47`    | ZAI          | `glm-4.7`                | `glm-4.7`           |
| `/kimi`   | Kimi Coding  | `k2p*`                   | `k2p6`              |

## How Dynamic Resolution Works

When you type `/sonnet`, the extension:

1. Scans all models in the registry via `ctx.modelRegistry.getAll()`
2. Filters to the provider (`anthropic`) and matches the family regex (`claude-sonnet-`)
3. Extracts version numbers from model IDs (e.g. `claude-sonnet-4-6` → 4.6)
4. Skips non-versioned models (dated pins like `claude-sonnet-20250514`, `-latest` aliases, `-thinking` variants)
5. Picks the highest version and switches to it

This means when `claude-sonnet-4-7` drops, `/sonnet` resolves to it automatically — no config changes needed.

## Setup

No setup required. Just type a slash command in any pi session.
