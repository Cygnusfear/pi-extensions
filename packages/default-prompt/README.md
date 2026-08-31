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
