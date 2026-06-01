---
name: frontpage
description: Use when chat output is getting dense — tables, comparisons, architecture, graphs, evolving findings. Compose an HTML frontpage via `frontpage_create` instead of typing raw HTML. Structured spec in, editorial page out. Mermaid / Chart.js / D3 / bespoke HTML all supported.
license: MIT
---

# Frontpage — whiteboarding via structured HTML

When chat becomes a wall of structured text, call `frontpage_create` with a spec. The extension composes the HTML. You stay in the argument, the palette, the annotations. You never type a CSS variable again.

**Proactive rendering.** If a table has 4+ rows, if you're drawing ASCII boxes, if the conversation is evolving toward a shared model — compose a frontpage. Brief chat summary, structured content in the page.

---

## The tools

- `frontpage_create({ spec })` — compose + write + mai artifact (does NOT auto-open)
- `frontpage_update({ slug, patch, note })` — patch sections, log note (does NOT auto-open)
- `frontpage_open({ slug })` — open in default browser (opens the tldraw canvas wrapper — see "v2" section below)
- `frontpage_read({ slug })` — **read hooman annotations** (stickies / arrows / drawings) with per-section + per-item attribution. The coordination loop — call this any time the hooman has been annotating

All four are thin wrappers. The composition work is in the spec; the reading work is interpreting the annotations.

**Open is opt-in.** `frontpage_create` and `frontpage_update` write the file silently. When the hooman should see it now, follow up with a separate `frontpage_open({ slug })` call. Don't also pass `{ open: true }` to create/update — that opens twice (two browser tabs, surprise tab spam). Pick one: explicit `frontpage_open` (preferred — your instinct controls timing) OR `{ open: true }` on create (single call, but you lose the chance to write quietly).

---

## The north star: visual journalism

Editorial infographic, not dashboard template. *New York Times* graphics desk, not Tailwind landing page. Amanda Cox's rules are the rules.

### The thesis is empathy

> "The effectiveness of visual elements has nothing to do with the use of space or typography but with **empathy**."

> "The mission is to create visualizations that readers can understand and which engage them emotionally."

That is the whole point. Ask: *what does the reader feel?* *What do they now see that they couldn't before?* If you cannot name the feeling, the page has no argument yet.

### The annotation layer is the argument

> "Words in a graphic should highlight the relevant pattern or an expert's interpretation, and not merely say 'Here is the data.'"

Use `label` fields on sections. Use `annotation-chart` annotations. Call out specific moments. Don't caption, interpret.

### Every choice must be a choice

If another model given the same prompt would produce substantially the same page, you failed. Pick `palette` and `register` with intent. Pick section labels with intent. Pick the thesis sentence with intent.

---

## Workflow

### 1. Intent (before you write the spec)

Answer these in a comment or out loud:

- **Reader** — who are they, what should they feel?
- **Argument** — the one-sentence thesis they take away
- **Register** — one of `nyt-editorial` · `working-newspaper` · `magazine-monograph`
- **Palette** — one of `crimson` · `navy` · `rust` · `teal` · `gold`

If any are vague, stop. The page will be vague.

### 2. Compose the spec

```ts
frontpage_create({
  spec: {
    slug: "auth-flow",
    title: "Authentication Flow",
    thesis: "Every expired token still costs us a DB round-trip — here's why, and where to fix it.",
    palette: "crimson",
    register: "nyt-editorial",
    sections: [
      { type: "lead", text: "Three points of friction. One of them is silent." },
      { type: "prose", body: "JWT validation starts at ..." },
      { type: "mermaid", label: "REQUEST PATH", source: "graph TD\n  A[Client] --> B{Valid JWT?}\n  ..." },
      { type: "kpi-grid", items: [
        { label: "Silent rejects", value: "43%", sub: "of expired tokens", accent: true },
        { label: "P99 latency", value: "820ms" },
      ]},
      { type: "callout", kind: "warning", body: "The <code>refresh</code> endpoint ..." },
      { type: "table", label: "FAILURE MODES",
        columns: [{key:"mode",title:"Mode"},{key:"rate",title:"Rate",align:"right",mono:true}],
        rows: [{mode:"Clock skew", rate:"12%"}, {mode:"Key rotation", rate:"4%"}] },
    ],
  },
});
```

### 3. Iterate

- Update via `frontpage_update` with `replace_section` / `append_section` / `remove_section`.
- Provide a short `note` — it lands on the mai artifact history.
- Section IDs are stable (`s1`, `s2`, ...) unless you set your own.

---

## Section types

### Tier 1 — structured fast path (use these first)

| Type | Use for |
|------|---------|
| `lead` | Opening sentence, editorial voice |
| `prose` | Body text, markdown supported (headings, bold, italic, code, links, lists) |
| `pull-quote` | A single emphatic sentence, optional `attribution` |
| `callout` | Warning / info / tip boxes |
| `kpi-grid` | Hero metrics with labels + optional `sub` + `accent` |
| `table` | Data tables with column alignment + mono flag |
| `timeline` | Phased progressions (phase / title / body) |
| `card-grid` | Parallel items; `depth: hero|default|recessed` |
| `mermaid` | Flowcharts, sequence, ER, state, mind maps, class, C4 (via graph TD + subgraph) |
| `annotation-chart` | Time series + annotations (the NYT "annotation layer is argument" pattern) |

### Tier 2 — bespoke with infra provided

- `d3` — `{ script, data, width, height }`. Your script has `target`, `data`, `width`, `height`, and `d3` in scope. Append an `<svg>` to `target` — the extension wires zoom/pan automatically if you do.
- `chartjs` — `{ config, height }`. Standard Chart.js config object.
- `svg` — `{ markup }`. Static SVG with zoom/pan.

### Tier 3 — escape hatch

- `raw_html` — `{ html }`. Drops in as-is. Use when the page genuinely needs something unorthodox. Cox: *"having the nerve to put something unorthodox on the page."*

`extra_head` on the spec lets you load a custom `<link>` or `<script src>` when a Tier 2/3 section needs it.

---

## Mermaid — direction and break-points

- Prefer `flowchart TD` / `graph TD` (top-down). Use `LR` only for linear 3–4 node flows.
- Line breaks inside quoted labels: `<br/>`. Never `\n` (renders literally).
- State diagrams: transition label parser is strict. If you need colons / parens / HTML entities, use `flowchart TD` with quoted edge labels `|"label"|`.
- Never define `.node` as a page-level class. Mermaid uses it internally. Use card-grid with sections instead.
- For 15+ nodes: split into simple overview (mermaid) + detail card-grid.

### Mermaid lint — automatic at write time

`frontpage_create` and `frontpage_update` lint every mermaid section after writing and surface findings in the tool result:

```
Mermaid lint: 1 error(s), 0 warning(s) — page written, fix and re-run frontpage_update.
  ERROR [s3] mermaid/literal-newline-in-label (line 4): Found \n inside a quoted label...
```

Findings are SOFT — the page is still written (you can inspect it) and the agent sees the findings in the same turn. Read the finding, follow up with `frontpage_update` to fix. Rules covered: `mermaid/empty`, `mermaid/literal-newline-in-label`, `mermaid/bracket-balance`, `mermaid/quote-balance`, `mermaid/node-class-redefinition`, `mermaid/missing-direction`, `mermaid/too-many-nodes`, `mermaid/state-strict-label`. Structured findings are also in `details.mermaidFindings`.

---

## The five tests (run before `frontpage_update` is your last move)

1. **Empathy** — does the page land? Can the reader name what they feel?
2. **Swap** — if you swapped palette + register, would the page feel meaningfully different? If no, you defaulted on the content too.
3. **Squint** — blur your eyes. Still see hierarchy? Nothing jumping harsh?
4. **Signature** — can you point to 3 elements that show your direction?
5. **Annotation** — does every chart have words that name the pattern, not just label the axis?

Any fail → iterate.

---

## Anti-patterns (AI slop)

- Emoji icons leading section labels (🏗️ ⚙️) — use small-caps `label` fields instead
- Every section at equal visual weight — vary `depth` on card-grid, use `accent` on KPIs
- Raw Tailwind purple accents in `raw_html` — use the palette spot (`var(--spot)`) only
- Dashboards pretending to be infographics — pick one or the other
- Gradient text on headings — never

If a developer sees the page and immediately thinks "AI made this," you defaulted. Regenerate on a white ground with ONE palette spot and sharper labels.

---

## Notes

- Storage is automatic: `~/.agent/frontpage/<slug>.html` + `<slug>.meta.json` sidecar.
- mai artifact is created with label `frontpage`; `mai ls -k artifact -l frontpage` lists them.
- `/frontpage-reload` flushes the partials cache during extension development.
- Slide deck mode is out of scope for this skill — `mai` ticket it separately if you want a slide renderer.

## Byline — who wrote the page

Every page renders a byline beneath the thesis showing **author**, **contributors** (later editors), and **date**. Auto-derived from the stable agent nickname (e.g. `Gerard Stargate Freedman`) so the hooman always knows who wrote any given frontpage — no manual attribution required.

| Behaviour | When |
|-----------|------|
| `byline` auto-set | First `frontpage_create` for a slug |
| `byline` sticky | Subsequent updates never overwrite the original author |
| `contributors` appended | A different agent edits a page; nickname appended once, deduped |
| `byline_date` refreshed | Every create/update (ISO-8601) |

You can override any field explicitly in the spec — useful for pseudonyms or shared authorship:

```ts
frontpage_create({
  spec: {
    slug: "...",
    title: "...",
    thesis: "...",
    palette: "navy",
    register: "nyt-editorial",
    byline: "Pi Squad",                // overrides auto-detected nickname
    contributors: ["Alex", "Reviewer X"],
    sections: [...],
  },
});
```

If pi-mesh is not loaded (no stable agent identity available), the byline is omitted entirely and the page renders exactly as before — backwards compatible.

---

## v2 — tldraw canvas wrapper

Every frontpage you open via `frontpage_open` now opens inside a **tldraw canvas** served by a small Hono server on `127.0.0.1:39288`. The page renders as a single embedded shape on the canvas; the hooman draws stickies, arrows, and text *on top of it* as the coordination layer.

```
hooman ──draws sticky─▶ tldraw canvas ──saves─▶ ~/.agent/frontpage/<slug>.tldraw.json
                                                       │
                                                       ▼
agent ◀── frontpage_read({slug}) ◀── /api/page/<slug>/state ◀── server reads JSON
```

No comment boxes, no Q&A widgets — tldraw stickies ARE the comments and questions. Arrows ARE the "this relates to that". Approve/disagree/redo is conveyed visually.

### The new tool: `frontpage_read`

```ts
frontpage_read({ slug: "auth-flow" })
```

Returns every sticky / text / arrow / drawing on the canvas, **already mapped to the specific section AND item it overlaps**. The agent does not do spatial math — the server does, using bounds the iframe shim posts after every layout settle.

Sample output:

```
Annotations on 'banter-into-system-log' (4):
  → s11 "PRODUCTION ENGINEER ANALYSIS"
    • note [yellow]: "this isn't surgical, fix it" › item#6 <ve-card depth-default> "6. Surgical smell ..."
    • text [black]: "maybe it smells yes"
  → s2 "BLAST RADIUS"
    • note [yellow]: "maybe some substrate changes ok" › item#5 <kpi-item> "SUBSTRATE CHANGES None pure FE wiring"
  → s13 "RECOMMENDED NEXT STEP"
    • text [black]: "👍"
  → arrows (1)
    • arrow: s11 "PRODUCTION ENGINEER ANALYSIS"  →  s11 › item#6 <ve-card> "6. Surgical smell ..."
```

### How to read it

| Annotation type | What it means in hooman-shorthand |
|---|---|
| 🟡 sticky **note** with text | A comment / question / pushback on the section or item it overlaps |
| 📝 plain **text** | Quick reaction. "👍" = approval. "❌" = nope. Emoji = strong tonal signal |
| ➡️ **arrow** | "this relates to that" — read endpoint A's section/item AND endpoint B's section/item |
| ✏️ **draw** (lines) | Free-hand emphasis. Treat the centroid as a "look here" pointer |

**Item attribution is the gold.** When a sticky has `› item#N <tag> "text"`, the hooman is targeting that specific card / kpi-item / paragraph. Don't generalise to the whole section if the item is named.

**Items without attribution** (`refersToItem: null`) — the sticky is somewhere inside the section bounds but didn't land on a specific item. Treat as section-level commentary.

**Arrows are the strongest signal.** When the hooman draws a connection, take it literally: they're saying *A and B are linked*. If A is a sticky-note saying "WTF" and B is a specific card, the WTF is about that card.

### The annotation workflow

When the hooman has been annotating, the loop is:

1. **Read.** Call `frontpage_read({ slug })` for the page they were on.
2. **Synthesise.** For each annotation, name what the hooman is communicating. Don't paraphrase the sticky text back at them — interpret the move.
3. **Act.** Three options per annotation:
   - **Patch the page** via `frontpage_update` (most common). E.g. sticky says "this isn't surgical" on card #6 → `replace_section` for s11 with the surgical-smell card sharpened or removed.
   - **Update meta** (title / thesis / palette) if the sticky targets the overall argument.
   - **No-op and tell them why** if the sticky is a thumbs-up / acknowledgement — confirm and move on.
4. **Tell the hooman what you did**, referencing the sticky text and the section. They'll see the page update on next browser refresh.

Do NOT delete the hooman's stickies as part of the patch. They're their notes. They'll clear them themselves.

### When to read

- **Always**, when the hooman says they "added notes" / "annotated" / "drew on the page" / "added a sticky" / similar.
- **Always**, when the hooman names a slug and asks "what did I write?" / "what's on the page?" / "what am I asking?"
- **Always**, after you ship a frontpage update and they say "look again" or similar.
- **Proactively** at the start of a turn if there's a frontpage you authored recently AND the hooman just made a comment — they might have annotated.

### When NOT to read

- The page hasn't been opened in the browser yet (no layout bounds posted → mapping will be coarse / section-only).
- You just wrote the page in the same turn — they haven't seen it yet, no annotations exist.
- The hooman is asking about a slug you can't identify — ask which page.

---

## Lifecycle — keeping the v2 surface working

The server lives in a **bun subprocess** the extension spawns on session start. State of the world:

| Component | Where | What it does |
|-----------|-------|--------------|
| Extension factory | `extensions/frontpage.ts` | Spawns subprocess; registers tools; killed by `session_shutdown` |
| Server subprocess | `server-process/server.ts` | Hono on `127.0.0.1:39288`. Survives `/reload-runtime` (only dies on full pi quit) |
| Client bundle | `dist-client/bundle.js` | Pre-built React + tldraw bundle. Rebuilt on first boot if missing |
| Storage | `~/.agent/frontpage/<slug>.*` | `.html` + `.meta.json` + `.tldraw.json` + `.layout.json` |

### Healthchecks

If `frontpage_read` returns "server not running" or a tool returns a transport error:

```bash
curl -s http://127.0.0.1:39288/healthz
# Expected: {"ok":true,"version":2,"port":39288,"pid":<N>}
```

If no response: spawn the server manually for diagnosis (don't leave it running — the extension will own its lifecycle):

```bash
cd packages/frontpage && bun run server-process/server.ts
```

If `Bun.serve` errors out / EADDRINUSE that won't release: another pi process owns the port. That's fine — both processes write to the same store dir; the surviving server sees writes from both.

### Rebuilding the client

Only needed if you edit `client/tldraw-shell.tsx`. The extension auto-builds on first boot when `dist-client/bundle.js` is missing, but does NOT auto-rebuild on source change — that's a manual step:

```bash
cd packages/frontpage && bun run build-client
```

Browser tabs need a hard refresh (Cmd+Shift+R) to pick up the new bundle.

### Storage layout per slug

```
~/.agent/frontpage/<slug>.html          ← rendered page (still source of truth for content)
~/.agent/frontpage/<slug>.meta.json     ← spec + artifact id (used by frontpage_update)
~/.agent/frontpage/<slug>.tldraw.json   ← canvas state — every sticky/arrow/draw the hooman placed
~/.agent/frontpage/<slug>.layout.json   ← per-section + per-item bounds (posted by browser shim)
```

The `.tldraw.json` and `.layout.json` files are **derived** — safe to delete to reset the canvas for a slug. Don't delete `.meta.json` (loses the artifact id linkage).

### Cross-pi-process behavior

When two pi sessions are running, the second pi's extension boot detects the port is taken and noops on spawning. Both extensions write to the same store dir, so:

- `frontpage_create` from session A is visible to `frontpage_read` from session B.
- Hooman annotations from a tab opened by session A are visible to session B's agent.
- If pi A exits, pi B's extension does NOT spawn a server (still detects peer ownership) until session_start fires again. Quick fix: `/reload-runtime` in session B re-probes.

---

## Credits

- Visual-journalism target: *The New York Times* graphics desk (Amanda Cox, Steve Duenes, *The Upshot*)
- Rendering patterns adapted from `nicobailon/visual-explainer` (MIT)
- Craft discipline adapted from `Dammyjay93/interface-design` (MIT) and `anthropics/claude-code frontend-design` (MIT)
