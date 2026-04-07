# brave-search

Web and code search via Brave's search API.

## Setup

Set `BRAVE_API_KEY` in your shell environment before starting pi:

```bash
export BRAVE_API_KEY="your-key"
```

Or use a repo-local `.env.local`:

```bash
source .env.local
```

## Tools

| Tool | Description |
|------|-------------|
| `web_search_brave` | Web search via Brave's LLM Context API |
| `code_search_brave` | Search for code examples, API docs, technical documentation |
