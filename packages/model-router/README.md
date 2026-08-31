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
      "openai-codex/gpt-5.6-terra",
      "kimi-coding/k3"
    ]
  },
  "rlm": {
    "model": [
      "deepseek/deepseek-v4-flash",
      "anthropic/claude-haiku-4-5"
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

## Role consumers

- Teams consumes the full template: model list, worktree policy, prompt, and freeform flag.
- RLM consumes the ordered `rlm.model` list when the caller omits `RlmOptions.model`. DeepSeek Flash is the cheap first line for reconnaissance and repository scouting. A concrete `model` option is a deliberate override for reasoning-heavy work.
- If the `rlm` role has no healthy available candidate, RLM fails closed. It never inherits the parent agent's frontier model.

**Liveness store:** `~/.pi/agent/model-liveness.json` — workers mark models unhealthy on 429/auth errors. Entries auto-expire after 30 min (configurable TTL).

## Code-mode API

```javascript
// Resolve N models for a role
const result = await modelRouter.resolve({ role: "review", count: 2 });
// result.resolved = [{ id: "openai-codex/gpt-5.6-terra", provider: "openai-codex", ... }, ...]
// result.skipped = [{ id: "kimi-coding/k3", skipReason: "no_api_key" }, ...]

// Mark a model unhealthy (e.g. after a 429)
await modelRouter.markUnhealthy({ id: "zai-coding/glm-5.1", reason: "rate_limited", ttlSeconds: 600 });

// Mark healthy again
await modelRouter.markHealthy("zai-coding/glm-5.1");

// Inspect current liveness state
await modelRouter.liveness();

// List all roles and their model lists
await modelRouter.roles();
```

## Agent self-serve model switching (`model.current` / `model.switch`)

The `model` namespace (pe-dvdys6os) lets the agent inspect and switch **its own** model from code-mode. It is deliberately separate from the two neighbouring mechanisms:

| Mechanism | Scope | Authority |
| --- | --- | --- |
| `model.current` / `model.switch` (this) | the calling agent's own model | local self-serve, conservative admission |
| `modelRouter` (above) | role → concrete model resolution + fleet health policy | advisory; never mutates the host model |
| `mesh-model-control` | remote harness control of a session's model | Hooman-authorized only — not conflated with local self-switch |

### `model.current()`

Ground truth about the model the host is running **right now**, read live at invocation time (not the per-call snapshot captured when `execute_code` began — after a same-block `model.switch`, the snapshot is stale, the live read is not):

```javascript
const cur = await model.current();
// → { provider, modelId, contextWindow, tokens, contextUnknown }
// contextWindow: from the model registry (usage fallback); null when unknown
// tokens:        live context tokens; null when unknown (e.g. right after
//                compaction, before the next assistant response)
// contextUnknown: true exactly when tokens === null — never treat null as 0
```

Calling `model()` directly is shorthand for `model.current()`.

### `model.switch({ target })`

`target` is an **exact `"provider/model"` string only** — trimmed, split on the first `/`, resolved via `modelRegistry.find(provider, modelId)`. No fuzzy matching, no aliases, no family magic; a bare model id is `not_found`. Identity is case-sensitive (`provider ===`, `id ===` — host semantics): a case-variant live model is a *different* model, so switching to the exact target performs a real switch rather than reporting a no-op, and a case-variant entry in `getAvailable()` does not authorize the target.

Checks run in order; the first failure returns a discriminated refusal — never a fake success:

1. **Host capability** — `ctx.setModel` missing → throws (host too old); this is infrastructure, not a refusal.
2. **Resolution** — target not in the registry → `{ ok: false, code: "not_found" }`.
3. **Idempotence** — target already IS the live model → `{ ok: true, noop: true, from, to }`; `setModel` is NOT called, nothing is persisted.
4. **Auth** — `modelRegistry.hasConfiguredAuth(model)` or `getAvailable()` membership, else `{ ok: false, code: "unavailable" }`.
5. **Health** — model-router liveness (`checkModelHealth`); flagged → `{ ok: false, code: "unhealthy", reason, expires }`. This is pi-extensions policy, separate from core auth.
6. **Context-window admission** (conservative, extension-only — see matrix below).
7. **Serialization** — all switches in the session queue on one promise chain; usage is re-read inside the chain, immediately before the mutation, so concurrent switches can never interleave admission with another switch's mutation.
8. **Mutation** — `await pi.setModel(model)`. Resolves false → `{ ok: false, code: "auth_failed" }`.

Success:

```javascript
const r = await model.switch({ target: "openai-codex/gpt-5.5" });
// → { ok: true, from, to,
//     effective: "next-turn",        // NEVER mid-turn — see timing below
//     persisted: true,               // model_change appended + default saved
//     event: "model_select",
//     admission: "known" | "unknown-nonshrinking",
//     usage, reserveTokens: 16384 }
```

### Admission matrix

`reserve = 16384` — the documented pi-agent core default. **Assumption:** the configured reserve is NOT exposed through ExtensionContext, so this conservative extension-only policy hard-codes the default; an exact check needs a core admission/settings seam (pe-na057klm). `limit = target.contextWindow - reserve`.

| Situation | Result |
| --- | --- |
| target window invalid/zero/missing | `invalid_window` |
| `tokens` known and `tokens > limit` | `needs_compaction` (carries `tokens` + `limit`) |
| `tokens` known and `tokens <= limit` | allowed, `admission: "known"` |
| `tokens === null` and target window ≥ current window | allowed, `admission: "unknown-nonshrinking"` |
| `tokens === null` and shrinking (or current window unverifiable) | `context_unknown` |

Unknown tokens are never treated as zero: after a compaction the only honest moves are non-shrinking ones.

### Timing (next-turn semantics)

From the pe-na057klm source research (pi-agent): `pi.setModel` mutates `Agent.state` immediately, appends a `model_change` entry, saves the default, and awaits `model_select`. The agent loop's `prepareNextTurn` refreshes `config.model` after `turn_end`, so the **next** provider request in the same run uses the target. The current assistant turn and every sibling tool call stay on the old model. A switch requested mid-turn is therefore safe — it can never rewrite the in-flight request — but its effect is always `effective: "next-turn"`.

## DEI (provider dedup)

By default, `resolve()` deduplicates by provider so you get distinct providers for review/oracle dispatch. Set `dedupProviders: false` to allow same-provider duplicates.

```javascript
// implementer = ["kimi-coding/k3", "openai-codex/gpt-5.6-terra"]
await modelRouter.resolve({ role: "implementer", count: 2 });
// → k3, gpt-5.6-terra
```

## System prompt injection

On `before_agent_start`, the extension resolves all roles and injects a table into the system prompt:

```
## Model roles
- review → openai-codex/gpt-5.6-terra, kimi-coding/k3
- fix → openai-codex/gpt-5.6-luna
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
- `src/router.ts` / package export `@pi-extensions/model-router/router` — shared runtime resolver used by extensions such as RLM
- `~/.pi/agent/model-liveness.json` — runtime health state (auto-managed)