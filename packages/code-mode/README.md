# code-mode

Provides a single `execute_code` tool that lets the LLM write JavaScript calling available tools as typed async functions.

More efficient than direct tool calls for multi-step operations, complex logic, loops, and chaining tool calls. The sandbox provides persistent state (`$`), typed declarations for all tools, and configurable execution timeouts.

Inspired by [Cloudflare's code mode](https://blog.cloudflare.com/code-mode/).

## Features

- **Typed async functions** — all pi tools available as declared async functions
- **Persistent `$` store** — variables survive across `execute_code` calls (50MB cap, LRU eviction)
- **Auto-persist** — top-level `const`/`let`/`var`/function declarations auto-saved to `$`
- **Session API** — programmatic access to messages, tokens, tags, context trimming
- **Timeout control** — configurable per-call (default 120s, max 600s)
- **Context hygiene** — built-in output truncation and context usage warnings
- **Passthrough tools** — mesh, editor, git-ai, handbook all callable from sandbox

## Files

- `extensions/code-mode.ts` — extension entry point and VM execution engine
- `extensions/code-mode-prompt.md` — system prompt injected when code-mode is active
- `extensions/code-mode-declarations.md` — TypeScript declarations for all sandbox functions
- `src/sandbox-tools.ts` — tool binding creation
- `src/persistent-store.ts` — `$` store implementation
- `src/tool-reference.ts` — cached tool reference builder
