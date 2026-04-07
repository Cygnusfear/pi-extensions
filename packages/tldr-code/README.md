# tldr-code

Wraps [llm-tldr](https://github.com/parcadei/llm-tldr) to provide structural code analysis, semantic search, and call graph tracing.

## Features

- **Semantic search** — natural language → code (embedding similarity)
- **Call graph** — cross-file who-calls-what analysis
- **Structure extraction** — functions, classes, imports per file (tree-sitter)
- **Dead code detection** — find unreachable functions
- **Architecture layers** — entry/internal/leaf layer detection
- **Impact analysis** — reverse call graph for a function

## Setup

Requires llm-tldr installed:

```bash
uv tool install llm-tldr
```

Auto-indexes the project on first use if no index exists.
