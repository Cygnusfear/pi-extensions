# webfetch

Fetch any URL and return the content as text, markdown, or HTML — directly in the agent's context.

## Features

- **Three output formats** — text (stripped HTML), markdown (converted via Turndown), or raw HTML
- **Smart content handling** — auto-detects markdown responses, converts HTML, strips scripts/styles
- **5MB limit** — enforces maximum response size with graceful truncation and temp file fallback
- **Configurable timeout** — default 30s, max 120s
- **Cloudflare bypass** — retries with a minimal user-agent on 403 + CF challenge responses
- **Beautiful TUI rendering** — shows fetch status with content type and truncation warnings

## Tool

| Tool | Description |
|------|-------------|
| `webfetch` | Fetch a URL and return content as text, markdown, or HTML (max 5MB). |

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | — | The URL to fetch (must start with `http://` or `https://`) |
| `format` | enum | `markdown` | Output format: `text`, `markdown`, or `html` |
| `timeout` | integer | 30 | Timeout in seconds (max 120) |

## Truncation Behavior

Large responses are automatically truncated to pi's default limits. When truncated:
- The agent receives the head of the content
- The full output is saved to a temp file path shown in the truncation notice

## Setup

No setup required. The `turndown` dependency is bundled.
