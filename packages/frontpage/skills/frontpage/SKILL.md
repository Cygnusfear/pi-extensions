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
- `frontpage_open({ slug })` — open in default browser

All three are thin wrappers. The work is in the spec.

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

## Credits

- Visual-journalism target: *The New York Times* graphics desk (Amanda Cox, Steve Duenes, *The Upshot*)
- Rendering patterns adapted from `nicobailon/visual-explainer` (MIT)
- Craft discipline adapted from `Dammyjay93/interface-design` (MIT) and `anthropics/claude-code frontend-design` (MIT)
