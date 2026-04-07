# model-hints

Injects "latest available models" into the system prompt so agents don't pick stale pinned model IDs.

Queries the model registry, finds the latest version per family (e.g. latest Claude Opus, latest GPT), and injects the list at `before_agent_start`.
