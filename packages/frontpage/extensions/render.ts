/**
 * Frontpage composer — pure function. Takes a spec, returns an HTML string.
 *
 * Keeps all rendering logic isolated from tool registration so it can be tested
 * without spinning up an extension context.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARTIALS = path.resolve(__dirname, "../partials");

// ---- Types ----

export type Palette = "crimson" | "navy" | "rust" | "teal" | "gold";
export type Register = "nyt-editorial" | "working-newspaper" | "magazine-monograph";

export interface FrontpageSpec {
  slug: string;
  title: string;
  thesis: string;
  palette: Palette;
  register: Register;
  description?: string;
  extra_head?: string;
  sections: SectionSpec[];
}

export type SectionSpec =
  | LeadSec | ProseSec | PullQuoteSec | CalloutSec
  | KpiGridSec | TableSec | TimelineSec | CardGridSec
  | MermaidSec | D3Sec | ChartJsSec | SvgSec
  | AnnotationChartSec | RawHtmlSec;

interface BaseSec { id?: string; label?: string; }

export interface LeadSec extends BaseSec { type: "lead"; text: string; }
export interface ProseSec extends BaseSec { type: "prose"; body: string; /* markdown or html */ format?: "markdown" | "html"; }
export interface PullQuoteSec extends BaseSec { type: "pull-quote"; text: string; attribution?: string; }
export interface CalloutSec extends BaseSec { type: "callout"; kind?: "warning" | "info" | "tip"; body: string; /* html */ }
export interface KpiGridSec extends BaseSec { type: "kpi-grid"; items: { label: string; value: string; sub?: string; accent?: boolean }[]; }
export interface TableSec extends BaseSec {
  type: "table";
  columns: { key: string; title: string; align?: "left" | "right" | "center"; mono?: boolean }[];
  rows: Record<string, string>[];
  notes?: string;
}
export interface TimelineSec extends BaseSec { type: "timeline"; entries: { phase: string; title: string; body: string }[]; }
export interface CardGridSec extends BaseSec { type: "card-grid"; cards: { title: string; body: string; depth?: "hero" | "default" | "recessed" }[]; }
export interface MermaidSec extends BaseSec { type: "mermaid"; source: string; fontSize?: number; initialZoom?: number; }
export interface D3Sec extends BaseSec { type: "d3"; script: string; data?: unknown; width?: number; height?: number; }
export interface ChartJsSec extends BaseSec { type: "chartjs"; config: unknown; height?: number; }
export interface SvgSec extends BaseSec { type: "svg"; markup: string; }
export interface AnnotationChartSec extends BaseSec {
  type: "annotation-chart";
  data: { x: number; y: number }[];
  annotations: { x: number; y: number; label: string; dx?: number; dy?: number }[];
  width?: number; height?: number;
}
export interface RawHtmlSec extends BaseSec { type: "raw_html"; html: string; }

// ---- Partial loader with dev-time cache ----

const cache = new Map<string, string>();
export function reloadPartials(): void { cache.clear(); }

function read(file: string): string {
  const abs = path.join(PARTIALS, file);
  const hit = cache.get(abs);
  if (hit !== undefined) return hit;
  const text = fs.readFileSync(abs, "utf8");
  cache.set(abs, text);
  return text;
}

function fill(tpl: string, vars: Record<string, string | number | undefined>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_m, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Tiny, SAFE markdown subset — paragraphs, bold, italic, code, links, lists, headings.
// Full-fat markdown is out of scope; prose sections with format=html pass through.
function markdown(input: string): string {
  let s = input.trim();
  // code blocks
  s = s.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre><code>${escapeHtml(code.trim())}</code></pre>`);
  // inline code
  s = s.replace(/`([^`\n]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`);
  // headings
  s = s.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  s = s.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  // bold/italic
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // lists (grouped)
  s = s.replace(/(^|\n)((?:- .+\n?)+)/g, (_m, pre, block) => {
    const items = block.trim().split(/\n/).map((l: string) => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `${pre}<ul>${items}</ul>`;
  });
  // paragraphs — split on blank lines, wrap anything that isn't already a block
  const blocks = s.split(/\n\s*\n/);
  return blocks.map(b => {
    const t = b.trim();
    if (!t) return "";
    if (/^<(h\d|ul|ol|pre|blockquote|table|section|div|p)\b/.test(t)) return t;
    return `<p>${t}</p>`;
  }).join("\n");
}

// ---- Section rendering ----

interface RenderCtx {
  palette: Palette;
  register: Register;
  // carries JS fragments we append into the single bottom <script type="module">
  scripts: string[];
  // which libs the page will need
  needs: { mermaid: boolean; d3: boolean; chartjs: boolean; zoomPan: boolean; };
  // section index counter for stagger animation
  i: number;
}

function labelBlock(label?: string): string {
  return label ? `  <span class="section-label">${escapeHtml(label)}</span>\n` : "";
}

function renderSection(sec: SectionSpec, ctx: RenderCtx): string {
  const id = sec.id ?? `s${ctx.i}`;
  const i = ctx.i++;
  const lbl = labelBlock(sec.label);
  switch (sec.type) {
    case "lead":
      return fill(read("sections/lead.html"), { id, i, text: escapeHtml(sec.text) });
    case "prose": {
      const html = sec.format === "html" ? sec.body : markdown(sec.body);
      return fill(read("sections/prose.html"), { id, i, label_block: lbl, html });
    }
    case "pull-quote": {
      const cite = sec.attribution ? `<cite>${escapeHtml(sec.attribution)}</cite>` : "";
      return fill(read("sections/pull-quote.html"), { id, i, text: escapeHtml(sec.text), cite_block: cite });
    }
    case "callout":
      return fill(read("sections/callout.html"), { id, i, kind: sec.kind ?? "info", body: sec.body });
    case "kpi-grid": {
      const tpl = read("sections/kpi-item.html");
      const items = sec.items.map(it => fill(tpl, {
        label: escapeHtml(it.label),
        value: escapeHtml(it.value),
        accent_class: it.accent ? " accent" : "",
        sub_block: it.sub ? `      <div class="kpi-sub">${escapeHtml(it.sub)}</div>\n` : "",
      })).join("");
      return fill(read("sections/kpi-grid.html"), { id, i, label_block: lbl, items });
    }
    case "table": {
      const ths = sec.columns.map(c =>
        `<th class="${c.align ? "align-" + c.align : ""}">${escapeHtml(c.title)}</th>`
      ).join("");
      const rows = sec.rows.map(r => {
        const tds = sec.columns.map(c => {
          const cls = [c.mono ? "mono" : "", c.align ? "align-" + c.align : ""].filter(Boolean).join(" ");
          return `<td class="${cls}">${r[c.key] ?? ""}</td>`;
        }).join("");
        return `        <tr>${tds}</tr>`;
      }).join("\n");
      const notesBlock = sec.notes ? `    <div class="notes">${sec.notes}</div>\n` : "";
      return fill(read("sections/table.html"), { id, i, label_block: lbl, ths, rows, notes_block: notesBlock });
    }
    case "timeline": {
      const tpl = read("sections/timeline-entry.html");
      const entries = sec.entries.map(e => fill(tpl, {
        phase: escapeHtml(e.phase),
        title: escapeHtml(e.title),
        body: e.body,
      })).join("");
      return fill(read("sections/timeline.html"), { id, i, label_block: lbl, entries });
    }
    case "card-grid": {
      const tpl = read("sections/card.html");
      const cards = sec.cards.map(c => fill(tpl, {
        title: escapeHtml(c.title),
        body: c.body,
        depth: c.depth ?? "default",
      })).join("");
      return fill(read("sections/card-grid.html"), { id, i, label_block: lbl, cards });
    }
    case "mermaid": {
      ctx.needs.mermaid = true;
      ctx.needs.zoomPan = true;
      return fill(read("sections/mermaid.html"), {
        id, i, label_block: lbl,
        source: sec.source,
        fontSize: sec.fontSize ?? 16,
        initialZoom: sec.initialZoom ?? 1,
      });
    }
    case "d3": {
      ctx.needs.d3 = true;
      ctx.needs.zoomPan = true;
      const width = sec.width ?? 900;
      const height = sec.height ?? 480;
      const html = fill(read("sections/d3.html"), {
        id, i, label_block: lbl,
        width, height,
        data_json: JSON.stringify(sec.data ?? null),
      });
      ctx.scripts.push(fill(read("js/d3.frag.js"), { id, width, height, script: sec.script }));
      return html;
    }
    case "chartjs": {
      ctx.needs.chartjs = true;
      const height = sec.height ?? 360;
      const html = fill(read("sections/chartjs.html"), {
        id, i, label_block: lbl,
        height,
        config_json: JSON.stringify(sec.config ?? {}),
      });
      ctx.scripts.push(fill(read("js/chartjs.frag.js"), { id }));
      return html;
    }
    case "svg": {
      ctx.needs.zoomPan = true;
      const html = fill(read("sections/svg.html"), { id, i, label_block: lbl, markup: sec.markup });
      ctx.scripts.push(fill(read("js/svg.frag.js"), { id }));
      return html;
    }
    case "annotation-chart": {
      ctx.needs.d3 = true;
      const width = sec.width ?? 900;
      const height = sec.height ?? 420;
      const html = fill(read("sections/annotation-chart.html"), {
        id, i, label_block: lbl,
        width, height,
        payload_json: JSON.stringify({ data: sec.data, annotations: sec.annotations }),
      });
      ctx.scripts.push(fill(read("js/annotation-chart.frag.js"), { id, width, height }));
      return html;
    }
    case "raw_html":
      return fill(read("sections/raw-html.html"), { id, i, html: sec.html });
  }
}

// ---- Top-level composition ----

interface FontsManifest { [register: string]: string[]; }

function fontsLink(register: Register): string {
  const manifest = JSON.parse(read("css/registers/_fonts.json")) as FontsManifest;
  const families = manifest[register] ?? [];
  if (families.length === 0) return "";
  const q = families.map(f => `family=${f}`).join("&");
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?${q}&display=swap" rel="stylesheet">`;
}

function mermaidTheme(palette: Palette): Record<string, string> {
  const themes = JSON.parse(read("css/palettes/_mermaid-themes.json")) as Record<string, Record<string, string>>;
  return themes[palette] ?? {};
}

export function render(spec: FrontpageSpec): string {
  const ctx: RenderCtx = {
    palette: spec.palette,
    register: spec.register,
    scripts: [],
    needs: { mermaid: false, d3: false, chartjs: false, zoomPan: false },
    i: 1,
  };

  const sections = spec.sections.map(s => renderSection(s, ctx)).join("\n");

  const imports: string[] = [];
  if (ctx.needs.d3) imports.push(`import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';`);
  if (ctx.needs.chartjs) imports.push(`import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4/auto/+esm';`);
  let mermaidPrelude = "";
  if (ctx.needs.mermaid) {
    imports.push(`import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';`);
    imports.push(`import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs';`);
    const theme = mermaidTheme(spec.palette);
    const registerFontFamily: Record<Register, string> = {
      "nyt-editorial": "'IBM Plex Sans', system-ui, sans-serif",
      "working-newspaper": "'IBM Plex Sans', system-ui, sans-serif",
      "magazine-monograph": "'DM Sans', system-ui, sans-serif",
    };
    const themeVars = { fontFamily: registerFontFamily[spec.register], fontSize: "16px", ...theme };
    mermaidPrelude = `
mermaid.registerLayoutLoaders(elkLayouts);
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  look: 'classic',
  layout: 'elk',
  themeVariables: ${JSON.stringify(themeVars)},
});
`;
    // Put mermaid fragment FIRST so it renders before other scripts that might query canvas.
    ctx.scripts.unshift(read("js/mermaid.frag.js"));
  }

  // Inline the zoom-pan helper if needed (rather than a separate file)
  let zoomPanInline = "";
  if (ctx.needs.zoomPan) {
    const zp = read("js/zoom-pan.js");
    // Strip the 'export' keyword so it becomes a local function.
    zoomPanInline = zp.replace(/^export\s+function\s+/m, "function ");
  }

  const scriptBody = [
    ...imports,
    zoomPanInline,
    mermaidPrelude,
    ...ctx.scripts,
  ].join("\n");

  const scripts = scriptBody.trim()
    ? `<script type="module">\n${scriptBody}\n</script>`
    : "";

  return fill(read("shell.html"), {
    title: escapeHtml(spec.title),
    thesis: escapeHtml(spec.thesis),
    fonts: fontsLink(spec.register),
    base_css: read("css/base.css"),
    palette_css: read(`css/palettes/${spec.palette}.css`),
    register_css: read(`css/registers/${spec.register}.css`),
    extra_head: spec.extra_head ?? "",
    sections,
    scripts,
  });
}

// Assign IDs to sections that don't have one, preserving existing IDs for round-trip safety.
export function assignIds(spec: FrontpageSpec): FrontpageSpec {
  const used = new Set(spec.sections.map(s => s.id).filter(Boolean) as string[]);
  let counter = 1;
  const next = () => {
    while (used.has(`s${counter}`)) counter++;
    const id = `s${counter}`;
    used.add(id);
    return id;
  };
  return {
    ...spec,
    sections: spec.sections.map(s => s.id ? s : { ...s, id: next() }),
  };
}
