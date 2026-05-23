
import { render, assignIds, type FrontpageSpec } from "../extensions/render.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const spec: FrontpageSpec = {
  slug: "frontpage-extension-smoketest",
  title: "Frontpage as Extension",
  thesis: "Move the chrome into the tool; keep the craft in the model. Six-to-one on ingestion, three-to-one on output.",
  palette: "navy",
  register: "nyt-editorial",
  // Exercise the byline path: original author + later editor + ISO date.
  byline: "Gerard Stargate Freedman",
  contributors: ["Vera Rubin"],
  byline_date: "2026-05-23T12:34:56Z",
  sections: [
    { type: "lead", text: "Every frontpage today pays a boilerplate tax. This one doesn't." },
    { type: "prose", label: "WHY", body: [
      "Today's workflow asks the model to re-type ~3,600 tokens of CSS, a 370-line Mermaid zoom/pan controller, and a dozen scaffolding divs — *every page*.",
      "The extension writes those bytes. The model writes the thesis, the annotation strings, and the diagram sources.",
      "Result: **6x faster** on ingestion (no reference files to read), **3x faster** on output (no chrome to emit).",
    ].join("\n\n") },
    { type: "kpi-grid", label: "MEASURING THE TAX", items: [
      { label: "Input tokens / page (before)", value: "28,400", sub: "SKILL + references + templates" },
      { label: "Input tokens / page (after)", value: "4,100", sub: "schema + trimmed skill", accent: true },
      { label: "Output tokens / page (before)", value: "9,200", sub: "HTML emitted char-by-char" },
      { label: "Output tokens / page (after)", value: "3,100", sub: "structured spec JSON", accent: true },
    ] },
    { type: "mermaid", label: "RENDER PIPELINE", source: [
      "graph TD",
      "    A[Spec JSON<br/>from model] --> B{Section<br/>type?}",
      "    B -->|lead / prose / pull-quote| C[Simple HTML]",
      "    B -->|kpi / table / cards| D[Composed rows]",
      "    B -->|mermaid / d3 / chartjs| E[Wrapped + JS fragment]",
      "    B -->|raw_html| F[Passthrough]",
      '    C & D & E & F --> G[shell.html<br/>fills CSS + JS]',
      "    G --> H[Write file]",
      "    H --> I[mai artifact]",
      "    H --> J[Browser open]",
    ].join("\n") },
    { type: "table", label: "SECTION TYPES", columns: [
      { key: "name", title: "Section" },
      { key: "tier", title: "Tier", align: "center", mono: true },
      { key: "use", title: "Use for" },
      { key: "out", title: "Tokens", align: "right", mono: true },
    ], rows: [
      { name: "<code>lead</code>", tier: "1", use: "Opening sentence, editorial voice", out: "~20" },
      { name: "<code>prose</code>", tier: "1", use: "Body markdown", out: "varies" },
      { name: "<code>kpi-grid</code>", tier: "1", use: "Hero metrics", out: "~40 / item" },
      { name: "<code>table</code>", tier: "1", use: "Dense data with alignment", out: "~20 / row" },
      { name: "<code>mermaid</code>", tier: "1", use: "Graphs, flowcharts, ER, state", out: "just the source" },
      { name: "<code>d3</code>", tier: "2", use: "Bespoke charts (streamgraph, sankey)", out: "script body only" },
      { name: "<code>chartjs</code>", tier: "2", use: "Standard chart config", out: "just the config" },
      { name: "<code>raw_html</code>", tier: "3", use: "When nothing else fits", out: "unbounded" },
    ] },
    { type: "callout", kind: "tip", body: "<strong>Use the fast path.</strong> Tier 1 covers 90% of frontpages. Reach for Tier 2 only when the shape is genuinely bespoke. Tier 3 is the nerve-check — only when the content demands something unorthodox." },
    { type: "d3", label: "D3 CUSTOM: RESIDUAL BOILERPLATE",
      data: [
        { week: 1, before: 100, after: 100 },
        { week: 2, before: 100, after: 42 },
        { week: 3, before: 100, after: 38 },
        { week: 4, before: 100, after: 35 },
      ],
      width: 760, height: 320,
      script: [
        "const svg = d3.select(target).append('svg')",
        "  .attr('viewBox', '0 0 760 320').attr('width', '100%').attr('height', 320).style('display', 'block');",
        "const M = { top: 20, right: 24, bottom: 32, left: 40 };",
        "const x = d3.scaleLinear().domain([1, 4]).range([M.left, 760 - M.right]);",
        "const y = d3.scaleLinear().domain([0, 110]).range([320 - M.bottom, M.top]);",
        "svg.append('g').attr('transform', 'translate(0,' + (320 - M.bottom) + ')')",
        "  .call(d3.axisBottom(x).ticks(4).tickFormat(d => 'Week ' + d))",
        "  .call(g => g.selectAll('.tick text').attr('fill', 'var(--text-dim)'))",
        "  .call(g => g.select('.domain').attr('stroke', 'var(--rule-bright)'));",
        "svg.append('g').attr('transform', 'translate(' + M.left + ',0)')",
        "  .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))",
        "  .call(g => g.select('.domain').remove())",
        "  .call(g => g.selectAll('.tick line').attr('stroke', 'var(--rule)').attr('x2', 760 - M.left - M.right))",
        "  .call(g => g.selectAll('.tick text').attr('fill', 'var(--text-dim)'));",
        "const lineBefore = d3.line().x(d => x(d.week)).y(d => y(d.before)).curve(d3.curveMonotoneX);",
        "const lineAfter  = d3.line().x(d => x(d.week)).y(d => y(d.after )).curve(d3.curveMonotoneX);",
        "svg.append('path').datum(data).attr('fill','none').attr('stroke','#9ca3af').attr('stroke-width',1.6).attr('d', lineBefore);",
        "svg.append('path').datum(data).attr('fill','none').attr('stroke','var(--spot)').attr('stroke-width',2.2).attr('d', lineAfter);",
        "svg.append('text').attr('x', x(4) + 4).attr('y', y(35)).attr('font-family', 'var(--font-mono)').attr('font-size', 11).attr('fill', 'var(--ink)').text('with extension');",
        "svg.append('text').attr('x', x(4) + 4).attr('y', y(100)).attr('font-family', 'var(--font-mono)').attr('font-size', 11).attr('fill', '#6b7280').text('baseline');",
      ].join("\n"),
    },
    { type: "pull-quote", text: "The page scaffolding is not the argument. The argument is the argument.", attribution: "On frontpage craft" },
    { type: "card-grid", label: "TRADE-OFFS", cards: [
      { title: "What speeds up", body: "Tier 1 pages read a 2k-token skill, emit a 3k-token spec. Boilerplate vanishes.", depth: "hero" },
      { title: "What stays the same", body: "Palette, register, thesis, annotation strings — the craft decisions still live in the model." },
      { title: "What to watch", body: "Bespoke pages that lean on Tier 3 don't speed up as much. But they're the rare case.", depth: "recessed" },
    ] },
  ],
};

const withIds = assignIds(spec);
const html = render(withIds);
const outDir = path.join(os.homedir(), ".agent", "frontpage");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, withIds.slug + ".html");
fs.writeFileSync(outPath, html, "utf8");
console.log("WROTE:", outPath);
console.log("bytes:", html.length, "tokens est:", Math.round(html.length / 4));

// ---- Byline regression checks ----
assert.match(html, /<p class="byline">/, "byline block must render");
assert.match(html, /<span class="byline-author">Gerard Stargate Freedman<\/span>/, "author span must render");
assert.match(html, /edits by Vera Rubin/, "contributors must render");
assert.match(html, /<time class="byline-date" datetime="2026-05-23T12:34:56Z">/, "date must render with datetime attr");

// And: no-byline pages must render no byline element.
const bareHtml = render({
  slug: "bare-no-byline",
  title: "Bare",
  thesis: "Spec without byline must render no byline element.",
  palette: "navy",
  register: "nyt-editorial",
  sections: [{ type: "lead", text: "x" }],
});
assert.doesNotMatch(bareHtml, /<p class="byline">/, "no byline data → no byline element");
console.log("byline checks: OK");
