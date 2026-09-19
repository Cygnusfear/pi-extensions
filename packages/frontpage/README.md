# @pi-extensions/frontpage

Compose editorial HTML frontpages from a structured spec — and use them as a **coordination surface** via an embedded tldraw canvas the hooman annotates.

## Two surfaces

| Surface | Purpose | Tools |
|---------|---------|-------|
| **Page composition** | Agent writes a structured spec → rendered HTML page | `frontpage_create`, `frontpage_update`, `frontpage_open` |
| **Annotation read-back** | Hooman drops stickies / arrows / drawings on the page in a tldraw canvas → agent reads them with section-and-item attribution | `frontpage_read` |

See `skills/frontpage/SKILL.md` for the agent-facing guide (compose patterns, palettes, registers, anti-patterns, **the annotation workflow**).

## Architecture (v2)

```
┌─────────────────────────────────────────────────────────────────┐
│ extensions/frontpage.ts                                          │
│   - Registers 4 tools                                            │
│   - Spawns server-process/server.ts as a Bun subprocess          │
│   - Kills subprocess on session_shutdown                         │
└─────────────────────────────────────────────────────────────────┘
                              │ spawn bun
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ server-process/server.ts  (Hono on 127.0.0.1:39288)              │
│   GET  /                                  ← index of all pages    │
│   GET  /page/:slug                        ← tldraw shell HTML     │
│   GET  /page/:slug/embed                  ← frontpage HTML + shim │
│   GET  /api/page/:slug/state              ← combined for agent    │
│   GET  /api/page/:slug/tldraw   ↔ PUT     ← canvas state          │
│   GET  /api/page/:slug/layout   ↔ PUT     ← section + item bounds │
│   GET  /client/bundle.{js,css}            ← bundled tldraw client │
└─────────────────────────────────────────────────────────────────┘
        ▲                                            ▲
        │ user opens URL                             │ frontpage_read
        ▼                                            │
┌─────────────────────┐                ┌──────────────────────────┐
│ Browser tab          │                │ Agent runtime            │
│  - React + tldraw    │                │  - frontpage_read calls  │
│  - Custom shape:     │                │    /api/page/:slug/state │
│    iframe → /embed   │                │  - Receives shapes ALREADY│
│  - Layout shim posts │                │    mapped to section+item │
│    section + item    │                │    via server-side math   │
│    bounds            │                └──────────────────────────┘
└─────────────────────┘
```

### Why a subprocess instead of in-extension Hono?

The compiled pi binary loads extensions via jiti with a closed list of `virtualModules` — only typebox and pi framework packages resolve. `hono`, `react`, `tldraw` cannot be imported from extension code in the compiled binary. The subprocess has its own module resolution (it's a normal Bun script) and imports anything it needs.

## Storage

```
~/.agent/frontpage/
  <slug>.html              ← rendered page
  <slug>.meta.json         ← spec + mai artifact id
  <slug>.tldraw.json       ← canvas state (created on first edit)
  <slug>.layout.json       ← per-section + per-item bounds (posted by browser shim on layout settle)
```

`.tldraw.json` and `.layout.json` are derived — safe to delete to reset annotations.

### mai artifacts are evidence, not assumptions

`frontpage_create`/`frontpage_update` record durable history via the `mai` CLI.
mai stores notes in git notes refs, so the artifact is only created when the
session cwd is inside a git repo. When that call cannot run (mai missing,
cwd outside a repo, non-zero exit), the page is still written and the tool
result says `mai artifact NOT recorded` with the exit code and captured
stderr — never a guessed cause. Start pi inside a repo, or set
`FRONTPAGE_MAI_CWD=/path/to/repo`, to record artifacts.

## Scripts

```bash
bun run build-client    # rebuild dist-client/bundle.{js,css}
bun test scripts/       # run validation tests
```

The client bundle (tldraw + react, ~2MB minified) ships in `dist-client/` so installs don't have to build. The extension auto-builds on first boot when the bundle is missing.

## Mermaid lint

Every `mermaid` section is linted on write. Findings surface back in the tool result. See `extensions/mermaid-lint.ts` for the rules. SOFT — never blocks the write.

## Byline

Every page renders a byline derived from the stable agent nickname. First creator becomes `byline`; subsequent editors get appended to `contributors`. Manual override in the spec is honoured.
