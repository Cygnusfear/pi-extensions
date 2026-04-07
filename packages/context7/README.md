# context7

Up-to-date library documentation injected directly into any prompt — no more guessing at API signatures.

## Features

- **Live docs on demand** — fetches current documentation and code examples from Context7's MCP server
- **Smart resolution** — resolves library names to Context7 IDs ranked by relevance
- **LLM-optimized** — returns content formatted for agent consumption, not human browsing
- **No local install** — calls Context7 over HTTP, no local MCP server needed

## Tools

| Tool | Description |
|------|-------------|
| `context7_resolve` | Resolve a library/package name to a Context7 library ID. Returns matches ranked by relevance. |
| `context7_docs` | Fetch documentation and code examples for a resolved library ID. |

## Usage

The agent automatically chains these two tools:

1. **Resolve** — finds the right library ID for a package name
2. **Fetch docs** — gets specific documentation for a topic

### Example

```
# "I need Express.js middleware docs"
→ context7_resolve(libraryName: "express", query: "middleware authentication")
← /expressjs/express (relevance: 0.95)

→ context7_docs(libraryId: "/expressjs/express", query: "authentication middleware")
← ## Authentication Middleware
   Express provides middleware for authentication...
   ```typescript
   app.use(passport.initialize());
   ```
```

## Tool Parameters

### context7_resolve

| Parameter | Type | Description |
|-----------|------|-------------|
| `libraryName` | string | Library or package name to search for |
| `query` | string | What you need the library for (ranks results by relevance) |

### context7_docs

| Parameter | Type | Description |
|-----------|------|-------------|
| `libraryId` | string | Context7 library ID (e.g. `/vercel/next.js`, `/mongodb/docs`) |
| `query` | string | Specific question or topic to get documentation for |

## Setup

Optional: set `CONTEXT7_API_KEY` for higher rate limits. Get a free key at [context7.com/dashboard](https://context7.com/dashboard).

```bash
export CONTEXT7_API_KEY="your-key"
```

Works without an API key using default rate limits.
