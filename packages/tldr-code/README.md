# tldr-code

Structural code analysis powered by [llm-tldr](https://github.com/parcadei/llm-tldr) — semantic search, call graphs, dead code detection, and architecture analysis.

## Features

- **Semantic code search** — find functions by what they do, not just their name (e.g. "validate JWT tokens" → `verify_access_token()`)
- **AST-powered structure** — list functions, classes, and imports via tree-sitter
- **Cross-file call graphs** — see who calls what across your entire codebase
- **Dead code detection** — find functions that are defined but never called
- **Architecture layer analysis** — detect entry/internal/leaf layers from call patterns
- **Impact analysis** — find all callers of any function (reverse call graph)
- **Auto-indexing** — builds the semantic index on first use if needed
- **Session status** — shows index status in the status bar on session start

## Tools

| Tool | Description |
|------|-------------|
| `tldr_semantic_search` | Search code by natural language description. Uses embeddings to match behavioral queries to function implementations. Auto-indexes on first use. |
| `tldr_structure` | Show code structure (functions, classes, imports) for a file or directory via tree-sitter AST parsing. |
| `tldr_calls` | Build a cross-file call graph — shows which functions call which other functions. |
| `tldr_extract` | Full single-file analysis — function signatures with line numbers, imports, classes, return types. |
| `tldr_dead` | Find unreachable (dead) functions — defined but never called within the analyzed directory. |
| `tldr_arch` | Detect architecture layers (entry, internal, leaf) from call patterns. |
| `tldr_impact` | Find all callers of a function — reverse call graph for impact analysis. |
| `tldr_index` | Build or rebuild the semantic search index. Required before `tldr_semantic_search`. |

## Tool Parameters

### tldr_semantic_search

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | — | Natural language description of the code to find |
| `path` | string | cwd | Project path to search in |
| `k` | integer | 5 | Number of results (1–20) |
| `expand` | boolean | false | Include call graph expansion (callers/callees) |

### tldr_structure

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | — | File or directory path |
| `lang` | enum | auto | Language override (rust, typescript, javascript, python, go, java, c, cpp, ruby) |

### tldr_calls

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | — | Directory to analyze |

### tldr_extract

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `file` | string | — | File path to analyze |

### tldr_dead

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | — | Directory to check |

### tldr_arch

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | — | Directory to analyze |

### tldr_impact

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `func` | string | — | Function name to trace |
| `path` | string | — | Directory to search in |

### tldr_index

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | cwd | Project root |
| `lang` | enum | auto | Language to index (rust, typescript, javascript, python, go, all) |

## Setup

Install [llm-tldr](https://github.com/parcadei/llm-tldr):

```bash
uv tool install llm-tldr
```

The semantic index builds automatically on first use. Language is auto-detected from project files (Cargo.toml → rust, tsconfig.json → typescript, etc.).
