# Convention: model references in docs

When you mention an AI model in documentation, prompts, or skills, choose the right shape for the audience and the time-sensitivity of the message.

## TL;DR

| Doc kind | Use |
|---|---|
| Prescriptive rule ("use X for reviews") | **Role name** (`template: "review"`) — never a model ID |
| API example showing how to call `teams.delegate` | **Template form first**, model-pin as override note |
| Family/version description (e.g. "Opus is the high-cost option") | Family label (`claude-opus`), not a specific version |
| Test fixture | Literal model ID is fine — tests pin behavior |
| Default-describing README ("the powerline-footer uses X by default") | Literal ID, but mark it as "current default" |
| Family pattern table (e.g. `model-utils.ts` regexes) | Literal patterns — that's the source of truth |

## The rule

**Don't encode a specific model version into a piece of documentation that won't be re-read every time the model lineup changes.**

Models rotate roughly monthly. A skill rule that says `openai-codex/gpt-5.4` rots within weeks. A `team-templates.json` entry that says the same thing is fine — it's machine-readable and centrally managed.

## How to phrase prescriptive rules

**Wrong:**
> Use `openai-codex/gpt-5.4` for code reviews.

**Right:**
> Use the `review` team template for code reviews. The model-router resolves the concrete model from `~/.pi/agent/team-templates.json` so review quality stays current.

If you genuinely need a specific model (you tested it, you know the others fail), say so explicitly:

> Use the `review` team template. Pin `model: "openai-codex/gpt-5.4"` if your reviewer must produce TypeScript-aware output — we've found other models miss `unknown` vs `any` distinctions.

The override exists; document the *reason*, not just the pin.

## How to phrase API examples

Show the role-based form first:

```javascript
// Preferred — model-router resolves from team-templates.json
await teams.delegate([{ text: "...", template: "review" }]);

// Override — pin a specific model when you have a reason
await teams.delegate([{ text: "...", model: "anthropic/claude-opus-4-7" }]);
```

## Adding a new role

If you find yourself wanting to mention a specific model in a skill, ask: should this be a new role in `team-templates.json`?

Examples that became roles:
- `scribe` — long-lived doc-maintenance worker
- `oracle` — research/synthesis
- `investigate` — long-running diagnostic worker

If yes, add the role and reference it. If no — if it's a one-off override — document the *reason* alongside the pin.

## What lives where

```
~/.pi/agent/models.json          ← what models exist (provider registry)
~/.pi/agent/team-templates.json  ← role → ordered preference list (source of truth)
~/.pi/agent/model-liveness.json  ← runtime health (auto-managed, TTL'd)
```

The model-router (`packages/model-router`) is the only place that combines these three.

## Audit yourself

Before committing a doc that mentions a model ID, check:

1. Is this prescriptive or descriptive? Prescriptive → role.
2. If prescriptive, is the role I want defined in `team-templates.json`? If not, add it.
3. If descriptive (default, example, test), is the audience going to misread it as prescriptive? If yes, label it ("current default" / "example only").
4. Will this rot in 30 days? If yes, you're encoding the wrong thing.

## Why this matters

Before this convention, model IDs were hardcoded in ~10 playbook files plus the default system prompt. When a new version shipped, every file needed manual editing. The model-router collapses that into one config file plus a runtime liveness layer. The convention exists to keep it that way.