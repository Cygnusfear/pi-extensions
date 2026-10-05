# @pi-extensions/frontpage

Compose editorial HTML frontpages from a structured spec — and use them as a **coordination surface** via annotations the hooman draws straight onto the rendered page.

## Two surfaces

| Surface | Purpose | Tools |
|---------|---------|-------|
| **Page composition** | Agent writes a structured spec → rendered HTML page | `frontpage_create`, `frontpage_update`, `frontpage_open` |
| **Annotation read-back** | Hooman drops stickies / arrows / drawings on the page → agent reads them with section-and-item attribution | `frontpage_read` |

See `skills/frontpage/SKILL.md` for the agent-facing guide (compose patterns, palettes, registers, anti-patterns, **the annotation workflow**).

## Architecture

The rendered document is the page. tldraw supplies an annotation layer over it and never re-renders the content: HTML owns layout and native scrolling, including on a phone.

```
┌─────────────────────────────────────────────────────────────────┐
│ extensions/frontpage.ts                                          │
│   - Registers the tools                                          │
│   - Spawns server-process/server.ts as a Bun subprocess          │
│   - Kills subprocess on session_shutdown                         │
└─────────────────────────────────────────────────────────────────┘
                              │ spawn bun
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ server-process/server.ts  (Hono on 127.0.0.1:39288)              │
│   GET  /                                  ← current pages        │
│   GET  /page/:slug                        ← the document, with   │
│                                             the annotation layer │
│   GET  /page/:slug/embed                  ← the document alone   │
│   GET  /api/page/:slug/state              ← combined for agent   │
│   GET  /api/page/:slug/tldraw   ↔ PUT     ← annotations          │
│   GET  /api/page/:slug/layout   ↔ PUT     ← section + item bounds│
│   GET  /api/page/:slug/history  ↔ POST    ← versions             │
│   POST /api/page/:slug/restore            ← restore a version    │
│   POST /api/page/:slug/decision           ← answer a question    │
│   GET  /api/page/:slug/events             ← live updates (SSE)   │
│   GET  /client/bundle.{js,css}?v=<id>     ← immutable client     │
└─────────────────────────────────────────────────────────────────┘
        ▲                                            ▲
        │ user opens URL                             │ frontpage_read
        ▼                                            │
┌─────────────────────┐                ┌──────────────────────────┐
│ Browser tab          │                │ Agent runtime            │
│  - the document, at  │                │  - frontpage_read calls  │
│    top level         │                │    /api/page/:slug/state │
│  - transparent       │                │  - Receives shapes ALREADY│
│    annotation layer  │                │    mapped to section+item │
│    over it, camera   │                │    via server-side math   │
│    locked            │                └──────────────────────────┘
└─────────────────────┘
```

### The client is one immutable pair

`scripts/build-client.ts` hashes the built JS and CSS together and publishes a
`dist-client/release-id` marker after both are written. The server reads the pair
once at startup, holds those bytes, and serves them only under the matching
`?v=<id>`. A request for any other version is a 404, so a half-published build is
never served and a cached page keeps the client it was built against.

### Why a subprocess instead of in-extension Hono?

The compiled pi binary loads extensions via jiti with a closed list of `virtualModules` — only typebox and pi framework packages resolve. `hono`, `react`, `tldraw` cannot be imported from extension code in the compiled binary. The subprocess has its own module resolution (it's a normal Bun script) and imports anything it needs.

## Storage

```
~/.agent/frontpage/
  <slug>.html              ← rendered page
  <slug>.meta.json         ← spec + mai artifact id
  <slug>.tldraw.json       ← annotations (created on first edit)
  <slug>.layout.json       ← per-section + per-item bounds (measured in the browser)
  <slug>.history.jsonl     ← one line per version, including the HTML at that time
  <slug>.lifecycle.json    ← current / superseded / archived state
  <slug>.canvas.png        ← annotation image, invalidated on every annotation write
  <slug>.restore-intent.json ← only while a restore is in progress
```

`.tldraw.json`, `.layout.json` and `.canvas.png` are derived — safe to delete to reset annotations. `history.jsonl` and `lifecycle.json` are the record of what a page said and whether it is still current; deleting those loses the trail.

Every writer for one page is serialised through a single queue, and every file is
replaced through a unique temporary file and a rename, so two requests for the
same document cannot interleave or leave a half-written file.

### Which pages are listed

The index lists the working set and nothing else: a page that is not current is
one deliberate click away, keeps its own tombstone, and refuses writes. An
artifact that cannot be read as an ordinary page — metadata that will not parse,
metadata with no content, a filename that cannot be a page address — is named on
the index with the reason instead of being dropped.

### mai artifacts are evidence, not assumptions

`frontpage_create`/`frontpage_update` record durable history via the `mai` CLI.
mai stores notes in git notes refs, so the artifact is only created when the
session cwd is inside a git repo. When that call cannot run (mai missing,
cwd outside a repo, non-zero exit), the page is still written and the tool
result says `mai artifact NOT recorded` with the exit code and captured
stderr — never a guessed cause. Start pi inside a repo, or set
`FRONTPAGE_MAI_CWD=/path/to/repo`, to record artifacts.

## Export

**Export HTML** in the page controls writes one file that opens with no network:
the rendered content, charts rasterised, diagrams and the current annotations as
an inline SVG layer, and the raw annotation records kept in the file as inert
JSON. Live controls, scripts and form submission are removed; decisions render
read-only. Resources that cannot be inlined fail the export with a message rather
than producing a file that is quietly missing content.

## Reconciliation

```bash
bun run scripts/reconcile.ts [--store <dir>] [--apply]
```

Reports every artifact that needs attention. A document that still carries its
own spec but no page is re-rendered from that spec by the same function that
produced the original, and an existing page is never overwritten. Anything else
— lost metadata, an unusable name — is reported and left alone, because the
honest answer there is a decision, not a reconstruction.

## Scripts

```bash
bun run build-client    # rebuild dist-client/bundle.{js,css} + release-id
bunx --bun tsc --noEmit # typecheck client, server and tests
bun test                # tests for the server, the client and the renderer
bun run scripts/reconcile.ts   # store reconciliation report (dry run)
```

The client bundle (tldraw + react, ~2MB minified) ships in `dist-client/` so installs don't have to build. The extension auto-builds on first boot when the bundle or its release marker is missing.

## Mermaid lint

Every `mermaid` section is linted on write. Findings surface back in the tool result. See `extensions/mermaid-lint.ts` for the rules. SOFT — never blocks the write.

## Byline

Every page renders a byline derived from the stable agent nickname. First creator becomes `byline`; subsequent editors get appended to `contributors`. Manual override in the spec is honoured.
