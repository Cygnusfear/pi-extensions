# default-prompt

Additive system prompt layering — loads a global default prompt and an optional repo-local overlay into every agent turn.

## Features

- **Bundled global prompt** — ships with `prompts/default.md` containing pi's core instructions (guard protocols, communication rules, coding standards)
- **Repo-local overlay** — drop a `.prompts/default.md` in your repo root to add project-specific instructions
- **Both layers are additive** — they append to the base system prompt, never replace it
- **Frontmatter stripping** — YAML frontmatter is automatically removed before injection
- **Hot-reload with caching** — files are stat-checked on each turn; only re-read when mtime changes
- **Recorded action rationale** — the bundled prompt requires concise, secret-free `execute_code.thinking` rationale in the same action call without forcing extra provider generations

## Agent review links

The bundled prompt tells agents to create short Maiboard review handoff links when they finish committed work. Agents should call `mai.reviewLink(...)` from code-mode, pass commits oldest-to-newest, and print `review.terminalLink` in terminal output instead of a long commit list.

The full review payload is stored at:

```text
~/.maitake/review-handoffs/<token>.json
```

This keeps chat output short enough for harnesses that wrap long lines, while preserving the exact worktree and ordered commit set for Maiboard.

The same prompt also tells agents to use short Maiboard ticket links, preferably `ticket.terminalLink` (`http://127.0.0.1:39287/ticket/<ticketId>`) in terminal output, when they mention a specific mai ticket the Hooman may want to open.

## Contract compliance checker

`extensions/prompt-compliance.ts` classifies the agent's message to the Hooman against the paragraphs of `prompts/default.md` and steers a warning back when the message looks like it violates one.

- **Detection** — every contract paragraph becomes a rule ID (`P07`) registered in `src/compliance-registry.ts` as either checkable (with the phrasing that describes a violation) or out of scope (with the reason a message alone cannot decide it). A paragraph with no entry, or an entry with no paragraph, fails the test suite, so a rule cannot go silently unchecked.
- **What counts as the agent's message** — assistant text in the turn, plus words published through `explain`, `notify`, and the mesh writes (`mesh_tell`, `mesh_chat`, `mesh_broadcast`, `mesh_interrupt`, including the bridge's `{ subject, body }` form). A turn that ends on a tool call is judged from the last words it contains, stopping at the Hooman's message that opened the turn. Prose written *inside* an `execute_code` script is out of reach: that argument is a program, not a message.
- **Classifier** — `openrouter/perplexity/pplx-decider-v1.1-27b`, one bool question per checkable rule, probability threshold 0.9 by default. Measured: ~$0.0002 per check, ~1.2 s, no output tokens.
- **Warning** — `pi.sendMessage(..., { deliverAs: "steer" })`, so the agent sees `⚠️ … P06 — NEVER TALK ABOUT AN UNVERIFIED CONTEXT WINDOW…` at its next reasoning step and corrects itself. No tool call is blocked and no turn is forced.
- **Rate limiting** — one warning per turn, a 12-turn cooldown per rule, and a 40-warning session budget: a checker that nags is a quota leak.
- **Fail-open** — a build without a classifier API, a provider error, or a contract that no longer matches the registry leaves the checker silent. It never fails a turn.

The extension host is probed structurally for `classify`, because this package's pinned pi types predate classifier models.

### Commands

| Command | Effect |
|---|---|
| `/compliance` | status: enabled, threshold, rules loaded, warnings so far |
| `/compliance on` / `off` | enable or silence it — off makes zero classifier calls |
| `/compliance threshold 0.9` | move the verdict threshold |
| `/compliance audit` | what fired in this session |
| `/compliance report [days]` | hit report per model, plus never-fired rules |
| `/compliance calibrate` | re-measure recall and false positives against the fixture set |

### Hit tracking

Every completed check appends one observation — models, rule IDs that fired, cost, never message text — to `~/.pi/agent/compliance/observations.jsonl` (redirect with `PI_COMPLIANCE_STATE_DIR`). A daily report is written once per day to `~/.pi/agent/compliance/report-<date>.md` and announced in the session.

The report answers which rules fire often, on which model, and which rules no message has tripped. A never-fired rule is a candidate to **re-read, not to delete**: it may be doing its job by preventing the behaviour it names. The report states that where the numbers appear.

### Calibration

`src/compliance-fixtures.ts` holds the calibration set, run with `/compliance calibrate`. Last measured against the shipped pack: **6/6 planted violations caught, 0/3 clean messages flagged**, ~$0.0017 per run. Fixtures name rules by contract text, never by ordinal ID — inserting a paragraph in the contract renumbers every paragraph after it.

## Prompt Layer Order

```
1. Base system prompt (from pi core)
2. Bundled default.md (from this package)
3. .prompts/default.md (from repo root, if present)
```

## Adding Repo-Specific Instructions

Create `.prompts/default.md` in your repository root:

```markdown
---
description: Project-specific instructions for my-app
---

## Code Style

- Use strict TypeScript with no `any`
- All functions must have JSDoc comments
- prefer `const` over `let`

## Architecture

- All state lives in stores/ — never mutate props
- API calls go through services/api.ts
```

This overlay is automatically picked up and injected on every agent turn.

## Setup

No setup required. The bundled prompt loads automatically. Repo overlays are opt-in via `.prompts/default.md`.

## Progressive disclosure

The bundled `prompts/default.md` is the compact always-on safety and operating spine. Detailed procedures live once in `prompts/default-manual.md` and are served locally by `prompt_manual`. Start with `prompt_manual({ topic: "index" })`, then request one bounded topic. The tool never calls a provider or remote service.

A context footer is only a cue to check current state. Run `session.tokens()` after a footer, compaction, or model switch; never act on a percentage from an earlier turn.
