# model-router

Resolves role names to concrete model IDs at call time, filtered by availability and health. No hardcoded model IDs in skills, prompts, or playbooks.

## Problem

Model IDs were hardcoded in ~10 playbook files, the default system prompt, and team templates. When a model gets rate-limited, a new version ships, or a provider goes down, every file needs manual editing. The `team-templates.json` array syntax was aspirational — the leader treated it as a string.

## How it works

**One source of truth:** `~/.pi/agent/team-templates.json` — each role has an ordered list of literal model IDs.

```json
{
  "review": {
    "model": [
      "anthropic/claude-opus-4-7",
      "openai-codex/gpt-5.5",
      "zai-coding/glm-5.1"
    ]
  }
}
```

**Resolution at call time:**
1. Load the role's ordered list from templates.
2. Filter by `getAvailable()` (API key configured).
3. Filter out models in the liveness store with unexpired TTL.
4. Walk in order; pick `count` entries, deduping by provider (DEI).
5. Return resolved + skipped lists.

The router **never** reorders. It **never** upgrades to "latest per family". The list is a hand-curated contract.

**Liveness store:** `~/.pi/agent/model-liveness.json` — workers mark models unhealthy on 429/auth errors. Entries auto-expire after 30 min (configurable TTL).

## Code-mode API

```javascript
// Resolve N models for a role
const result = await modelRouter.resolve({ role: "review", count: 3 });
// result.resolved = [{ id: "anthropic/claude-opus-4-7", provider: "anthropic", ... }, ...]
// result.skipped = [{ id: "openai-codex/gpt-5.4", skipReason: "no_api_key" }, ...]

// Mark a model unhealthy (e.g. after a 429)
await modelRouter.markUnhealthy({ id: "zai-coding/glm-5.1", reason: "rate_limited", ttlSeconds: 600 });

// Mark healthy again
await modelRouter.markHealthy("zai-coding/glm-5.1");

// Inspect current liveness state
await modelRouter.liveness();

// List all roles and their model lists
await modelRouter.roles();
```

## DEI (provider dedup)

By default, `resolve()` deduplicates by provider so you get distinct providers for review/oracle dispatch. Set `dedupProviders: false` to allow same-provider duplicates.

```javascript
// fix = ["zai-coding/glm-5.1", "openai-codex/gpt-5.4", "openai-codex/gpt-5.5", "anthropic/claude-opus-4-7"]
await modelRouter.resolve({ role: "fix", count: 3 });
// → glm-5.1, gpt-5.4, claude-opus-4-7  (5.5 skipped: same provider as 5.4)
```

## System prompt injection

On `before_agent_start`, the extension resolves all roles and injects a table into the system prompt:

```
## Model roles
- review → anthropic/claude-opus-4-7, openai-codex/gpt-5.5, zai-coding/glm-5.1
- fix → zai-coding/glm-5.1, openai-codex/gpt-5.4, anthropic/claude-opus-4-7
```

Agents see role names and currently-resolved IDs — never stale hardcoded versions.

## Rate-limit liveness (blocking)

Once a model hits a rate limit it is flagged unavailable until it provably works again:

- **Flag** — the extension's `message_end` hook flags any assistant error matching rate-limit/quota patterns (429, rate limit, insufficient_quota, usage/credit/plan limits). Repeat marks within 24h double the TTL (30 min base, 8h cap).
- **Block** — `resolve()` skips flagged models, and teams delegation refuses to spawn on a flagged model even with a literal pin. The system prompt lists flagged models and the hard rules.
- **Heal** — a successful assistant response for a flagged model clears the flag. The TTL is only a backstop.

```javascript
// Check a model before pinning it anywhere
await modelRouter.isAvailable("anthropic/claude-opus-5");
// → { id, available: false, reasons: ["unhealthy: rate_limited ... (expires ...)"] }

// Flag a model that just rate-limited on you — you owe the swarm that signal
await modelRouter.markUnhealthy({ id: "kimi-coding/k3", reason: "rate_limited" });
```

## Files

- `~/.pi/agent/team-templates.json` — role definitions (source of truth)
- `~/.pi/agent/model-liveness.json` — runtime health state (auto-managed)