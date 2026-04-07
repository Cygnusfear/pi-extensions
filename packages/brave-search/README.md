# brave-search

High-quality web search via Brave's LLM Context API — returns relevance-ranked chunks optimized for agent consumption.

## Features

- **LLM-optimized results** — Brave's LLM Context API returns smart chunks instead of raw snippets
- **Two search modes** — LLM Context (default, ranked chunks) and standard Web Search
- **Code-focused search** — dedicated tool for finding code examples and API docs
- **Configurable result count** — 1–20 results per query
- **Token budget control** — cap response size with `maxTokens`
- **Beautiful TUI rendering** — collapsible results with source summaries, expandable on demand

## Tools

| Tool | Description |
|------|-------------|
| `web_search_brave` | Web search via Brave's LLM Context API. Returns relevance-ranked smart chunks. Best for research, general questions, and up-to-date info. |
| `code_search_brave` | Code-focused search — optimized for finding code examples, API docs, and technical documentation. |

## Parameters

### web_search_brave

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | — | Search query |
| `numResults` | integer | 5 | Number of results (1–20) |
| `type` | enum | `llm_context` | `llm_context` (ranked chunks) or `web` (standard results) |
| `maxTokens` | integer | ~4000 | Token budget for LLM Context results (500–16000) |

### code_search_brave

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | — | Code/documentation search query |
| `numResults` | integer | 5 | Number of results (1–10) |

## Setup

1. Get a Brave Search API key at [api-dashboard.search.brave.com](https://api-dashboard.search.brave.com/)
2. Export it in your shell:

```bash
export BRAVE_API_KEY="your-key"
```

Pricing: $5 per 1,000 requests, $5 free credit per month.
