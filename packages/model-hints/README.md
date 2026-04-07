# model-hints

Keeps the system prompt honest about which models are actually available, so agents never hallucinate stale model IDs.

## Features

- **Auto-injects latest models** into the system prompt on every agent start
- **One entry per family** — shows the newest version for each model family (opus, sonnet, haiku, codex, gpt, glm-4.7, etc.)
- **Only available models** — uses `getAvailable()` so it only lists models with configured API keys
- **Sorted output** — provider-then-ID alphabetical order for readability

## How It Works

On `before_agent_start`, the extension:

1. Fetches all available models from the registry
2. Groups them by provider + family and finds the latest version of each
3. Appends a "Latest available models" section to the system prompt

The injected text looks like:

```markdown
## Latest available models
When delegating to workers or switching models, prefer these (newest per family):
- anthropic/claude-opus-4-6 (Claude Opus 4.6)
- anthropic/claude-sonnet-4-6 (Claude Sonnet 4.6)
- anthropic/claude-haiku-4-5 (Claude Haiku 4.5)
- openai-codex/gpt-5.4 (GPT-5.4)
```

This ensures that when an agent delegates to a worker or suggests a model switch, it uses current IDs instead of ones it was trained on.

## Setup

No setup required. Works automatically with any configured models.
