# default-prompt

Additive system prompt layering — loads a global default prompt and an optional repo-local overlay into every agent turn.

## Features

- **Bundled global prompt** — ships with `prompts/default.md` containing pi's core instructions (guard protocols, communication rules, coding standards)
- **Repo-local overlay** — drop a `.prompts/default.md` in your repo root to add project-specific instructions
- **Both layers are additive** — they append to the base system prompt, never replace it
- **Frontmatter stripping** — YAML frontmatter is automatically removed before injection
- **Hot-reload with caching** — files are stat-checked on each turn; only re-read when mtime changes

## Agent review links

The bundled prompt tells agents to create short Maiboard review handoff links when they finish committed work. Agents should call `mai.reviewLink(...)` from code-mode, pass commits oldest-to-newest, and print `review.vscodeLink` or `review.link` instead of a long commit list.

The full review payload is stored at:

```text
~/.maitake/review-handoffs/<token>.json
```

This keeps chat output short enough for harnesses that wrap long lines, while preserving the exact worktree and ordered commit set for Maiboard.

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
