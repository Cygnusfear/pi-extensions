/**
 * Frontpage — compose editorial HTML frontpages from a structured spec.
 *
 * Registers three tools:
 *  - frontpage_create : { spec } -> writes HTML + creates mai artifact
 *  - frontpage_update : { slug, patch } -> edits HTML + logs mai note
 *  - frontpage_open   : { slug } -> OS open
 *
 * Storage:
 *  ~/.agent/frontpage/<slug>.html        — the page
 *  ~/.agent/frontpage/<slug>.meta.json   — spec + artifact ID sidecar (round-trip)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "@sinclair/typebox";
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { render, assignIds, reloadPartials, type FrontpageSpec, type SectionSpec } from "./render.js";

// ---- storage paths ----
const STORE_DIR = path.join(os.homedir(), ".agent", "frontpage");
function pagePath(slug: string): string { return path.join(STORE_DIR, `${slug}.html`); }
function metaPath(slug: string): string { return path.join(STORE_DIR, `${slug}.meta.json`); }

async function ensureStoreDir(): Promise<void> {
  await fsp.mkdir(STORE_DIR, { recursive: true });
}

interface Meta {
  slug: string;
  artifactId?: string;
  createdAt: number;
  updatedAt: number;
  spec: FrontpageSpec;
}

async function readMeta(slug: string): Promise<Meta | null> {
  try {
    const raw = await fsp.readFile(metaPath(slug), "utf8");
    return JSON.parse(raw) as Meta;
  } catch {
    return null;
  }
}

async function writeMeta(meta: Meta): Promise<void> {
  await fsp.writeFile(metaPath(meta.slug), JSON.stringify(meta, null, 2), "utf8");
}

// ---- mai shelling ----
function runMai(args: string[], opts: { input?: string } = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn("mai", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", (e) => { resolve({ stdout, stderr: stderr + String(e), code: -1 }); });
    proc.on("close", (code) => { resolve({ stdout, stderr, code: code ?? -1 }); });
    if (opts.input) { proc.stdin.write(opts.input); proc.stdin.end(); }
    else { proc.stdin.end(); }
  });
}

// Extract "Created <id>" from mai artifact create output.
function extractArtifactId(out: string): string | undefined {
  const m = out.match(/\b([a-z]+-[a-z0-9]+)\b/);
  return m?.[1];
}

async function createArtifact(spec: FrontpageSpec, htmlPath: string): Promise<string | undefined> {
  const desc = spec.description ?? spec.thesis.slice(0, 200);
  const { stdout, code } = await runMai([
    "artifact", spec.title,
    "--target", htmlPath,
    "-l", "frontpage",
    "-d", desc,
  ]);
  if (code !== 0) return undefined;
  return extractArtifactId(stdout);
}

async function addNote(artifactId: string, note: string): Promise<void> {
  await runMai(["add-note", artifactId, note]);
}

// ---- OS open ----
function osOpen(file: string): Promise<void> {
  return new Promise((resolve) => {
    const bin = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    const proc = spawn(bin, [file], { stdio: "ignore", detached: true });
    proc.on("error", () => resolve());
    proc.unref();
    resolve();
  });
}

// ---- Typebox schemas ----

const SectionCommon = {
  id: Type.Optional(Type.String({ description: "Stable section ID (auto-assigned if omitted)" })),
  label: Type.Optional(Type.String({ description: "Small-caps metadata label, e.g. 'MEASURING VOLATILITY'" })),
};

const LeadSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("lead"),
  text: Type.String(),
});
const ProseSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("prose"),
  body: Type.String({ description: "Markdown (default) or HTML if format=html" }),
  format: Type.Optional(Type.Union([Type.Literal("markdown"), Type.Literal("html")])),
});
const PullQuoteSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("pull-quote"),
  text: Type.String(),
  attribution: Type.Optional(Type.String()),
});
const CalloutSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("callout"),
  kind: Type.Optional(Type.Union([Type.Literal("warning"), Type.Literal("info"), Type.Literal("tip")])),
  body: Type.String({ description: "HTML allowed; <strong>, <code>, <a> recommended" }),
});
const KpiGridSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("kpi-grid"),
  items: Type.Array(Type.Object({
    label: Type.String(), value: Type.String(),
    sub: Type.Optional(Type.String()),
    accent: Type.Optional(Type.Boolean()),
  })),
});
const TableSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("table"),
  columns: Type.Array(Type.Object({
    key: Type.String(), title: Type.String(),
    align: Type.Optional(Type.Union([Type.Literal("left"), Type.Literal("right"), Type.Literal("center")])),
    mono: Type.Optional(Type.Boolean()),
  })),
  rows: Type.Array(Type.Record(Type.String(), Type.String())),
  notes: Type.Optional(Type.String()),
});
const TimelineSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("timeline"),
  entries: Type.Array(Type.Object({
    phase: Type.String(), title: Type.String(), body: Type.String(),
  })),
});
const CardGridSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("card-grid"),
  cards: Type.Array(Type.Object({
    title: Type.String(), body: Type.String(),
    depth: Type.Optional(Type.Union([Type.Literal("hero"), Type.Literal("default"), Type.Literal("recessed")])),
  })),
});
const MermaidSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("mermaid"),
  source: Type.String({ description: "Mermaid diagram source, e.g. 'graph TD\\n  A --> B'" }),
  fontSize: Type.Optional(Type.Number()),
  initialZoom: Type.Optional(Type.Number()),
});
const D3Schema = Type.Object({ ...SectionCommon,
  type: Type.Literal("d3"),
  script: Type.String({ description: "D3 body with access to: target (div), data, width, height" }),
  data: Type.Optional(Type.Unknown()),
  width: Type.Optional(Type.Number()),
  height: Type.Optional(Type.Number()),
});
const ChartJsSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("chartjs"),
  config: Type.Unknown({ description: "Chart.js config object {type, data, options}" }),
  height: Type.Optional(Type.Number()),
});
const SvgSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("svg"),
  markup: Type.String(),
});
const AnnotationChartSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("annotation-chart"),
  data: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number() })),
  annotations: Type.Array(Type.Object({
    x: Type.Number(), y: Type.Number(), label: Type.String(),
    dx: Type.Optional(Type.Number()), dy: Type.Optional(Type.Number()),
  })),
  width: Type.Optional(Type.Number()),
  height: Type.Optional(Type.Number()),
});
const RawHtmlSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("raw_html"),
  html: Type.String(),
});
const MarkdownTableSchema = Type.Object({ ...SectionCommon,
  type: Type.Literal("markdown_table"),
  body: Type.String({ description: "Raw markdown table text: | col | col |\\n|---|---|\\n| val | val |" }),
  notes: Type.Optional(Type.String()),
});

const SectionSchema = Type.Union([
  LeadSchema, ProseSchema, PullQuoteSchema, CalloutSchema,
  KpiGridSchema, TableSchema, MarkdownTableSchema, TimelineSchema, CardGridSchema,
  MermaidSchema, D3Schema, ChartJsSchema, SvgSchema,
  AnnotationChartSchema, RawHtmlSchema,
]);

const SpecSchema = Type.Object({
  slug: Type.String({ description: "kebab-case, used as filename" }),
  title: Type.String(),
  thesis: Type.String({ description: "The argument of the page in one sentence" }),
  palette: Type.Union([
    Type.Literal("crimson"), Type.Literal("navy"), Type.Literal("rust"),
    Type.Literal("teal"), Type.Literal("gold"),
  ]),
  register: Type.Union([
    Type.Literal("nyt-editorial"), Type.Literal("working-newspaper"), Type.Literal("magazine-monograph"),
  ]),
  description: Type.Optional(Type.String()),
  extra_head: Type.Optional(Type.String()),
  sections: Type.Array(SectionSchema),
});

const CreateParams = Type.Object({
  spec: SpecSchema,
  open: Type.Optional(Type.Boolean({ description: "Open the file after writing (default true)" })),
});

const PatchOp = Type.Union([
  Type.Object({ op: Type.Literal("replace_section"), section_id: Type.String(), new_section: SectionSchema }),
  Type.Object({ op: Type.Literal("append_section"), new_section: SectionSchema }),
  Type.Object({ op: Type.Literal("remove_section"), section_id: Type.String() }),
  Type.Object({ op: Type.Literal("update_meta"),
    title: Type.Optional(Type.String()),
    thesis: Type.Optional(Type.String()),
    palette: Type.Optional(Type.String()),
    register: Type.Optional(Type.String()),
  }),
]);

const UpdateParams = Type.Object({
  slug: Type.String(),
  patch: Type.Array(PatchOp),
  note: Type.String({ description: "Short summary of the change, logged to mai" }),
  open: Type.Optional(Type.Boolean()),
});

const OpenParams = Type.Object({ slug: Type.String() });

// ---- Extension entry ----

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "frontpage_create",
    label: "Frontpage · create",
    description:
      "Compose an editorial HTML frontpage from a structured spec. " +
      "Writes ~/.agent/frontpage/<slug>.html, creates a mai artifact labeled 'frontpage'. " +
      "Use for evolving structured output — tables, architecture, comparisons, diagrams.",
    promptSnippet: "Compose an editorial HTML frontpage from a spec (palette, register, sections).",
    promptGuidelines: [
      "Pick ONE palette + ONE register per page. Commit to the register. Do not mix.",
      "Write a thesis (the argument) as a full sentence — not 'here is the data'.",
      "Use Tier 1 sections by default. Use d3/chartjs/svg/raw_html only when Tier 1 cannot express the shape.",
      "Slug is kebab-case, short. Tell the user the file path after creating.",
    ],
    parameters: CreateParams,
    async execute(_id, params) {
      const spec = assignIds(params.spec as FrontpageSpec);
      await ensureStoreDir();
      const html = render(spec);
      const filePath = pagePath(spec.slug);
      await fsp.writeFile(filePath, html, "utf8");

      const existingMeta = await readMeta(spec.slug);
      let artifactId = existingMeta?.artifactId;
      if (!artifactId) {
        artifactId = await createArtifact(spec, filePath);
      } else {
        // Updating via create — log a note
        await addNote(artifactId, `Regenerated frontpage (${spec.sections.length} sections).`);
      }

      const now = Date.now();
      const meta: Meta = {
        slug: spec.slug,
        artifactId,
        createdAt: existingMeta?.createdAt ?? now,
        updatedAt: now,
        spec,
      };
      await writeMeta(meta);

      if (params.open !== false) void osOpen(filePath);

      return {
        content: [{
          type: "text",
          text: [
            `Frontpage written: ${filePath}`,
            artifactId ? `mai artifact: ${artifactId}` : "mai unavailable — no artifact recorded",
            `Sections: ${spec.sections.length}`,
            `Palette: ${spec.palette} · Register: ${spec.register}`,
          ].join("\n"),
        }],
        details: { slug: spec.slug, path: filePath, artifactId, sectionCount: spec.sections.length },
      };
    },
  });

  pi.registerTool({
    name: "frontpage_update",
    label: "Frontpage · update",
    description:
      "Edit an existing frontpage via a patch (replace/append/remove sections or update meta). " +
      "Rewrites the HTML and logs a note on the mai artifact.",
    promptSnippet: "Patch an existing frontpage — replace/append/remove sections without rewriting boilerplate.",
    promptGuidelines: [
      "Prefer update over create when structure is stable — keeps section IDs stable for round-trips.",
      "Always provide a short 'note' describing what changed — it becomes the artifact history.",
    ],
    parameters: UpdateParams,
    async execute(_id, params) {
      const meta = await readMeta(params.slug);
      if (!meta) {
        return {
          content: [{ type: "text", text: `No frontpage named '${params.slug}' found. Use frontpage_create first.` }],
          isError: true,
          details: {},
        };
      }

      const spec: FrontpageSpec = JSON.parse(JSON.stringify(meta.spec));
      const applied: string[] = [];
      const skipped: Array<{ op: string; reason: string; section_id?: string }> = [];

      for (const op of params.patch) {
        switch (op.op) {
          case "replace_section": {
            const i = spec.sections.findIndex(s => s.id === op.section_id);
            if (i >= 0) {
              spec.sections[i] = { ...(op.new_section as SectionSpec), id: op.section_id };
              applied.push(`replace ${op.section_id}`);
            } else {
              skipped.push({ op: "replace_section", section_id: op.section_id, reason: "section_id not found" });
            }
            break;
          }
          case "append_section":
            spec.sections.push(op.new_section as SectionSpec);
            applied.push(`append (${(op.new_section as SectionSpec).type})`);
            break;
          case "remove_section": {
            const before = spec.sections.length;
            spec.sections = spec.sections.filter(s => s.id !== op.section_id);
            if (spec.sections.length < before) {
              applied.push(`remove ${op.section_id}`);
            } else {
              skipped.push({ op: "remove_section", section_id: op.section_id, reason: "section_id not found" });
            }
            break;
          }
          case "update_meta": {
            const fields: string[] = [];
            if (op.title) { spec.title = op.title; fields.push("title"); }
            if (op.thesis) { spec.thesis = op.thesis; fields.push("thesis"); }
            if (op.palette) { spec.palette = op.palette as FrontpageSpec["palette"]; fields.push("palette"); }
            if (op.register) { spec.register = op.register as FrontpageSpec["register"]; fields.push("register"); }
            if (fields.length > 0) {
              applied.push(`update_meta (${fields.join(",")})`);
            } else {
              skipped.push({ op: "update_meta", reason: "no fields to update" });
            }
            break;
          }
        }
      }

      // If everything was skipped, do not write — tell the model what's there.
      if (applied.length === 0) {
        const availableIds = spec.sections.map(s => `${s.id} (${s.type})`).join(", ");
        return {
          content: [{
            type: "text",
            text: [
              `No ops applied to '${params.slug}'. ${skipped.length} op(s) skipped.`,
              ...skipped.map(s => `  - ${s.op}${s.section_id ? ` ${s.section_id}` : ""}: ${s.reason}`),
              `Available section IDs: ${availableIds}`,
            ].join("\n"),
          }],
          isError: true,
          details: { slug: params.slug, applied: 0, skipped, availableSectionIds: spec.sections.map(s => s.id) },
        };
      }

      const withIds = assignIds(spec);
      const html = render(withIds);
      const filePath = pagePath(withIds.slug);
      await fsp.writeFile(filePath, html, "utf8");
      const now = Date.now();
      await writeMeta({ ...meta, spec: withIds, updatedAt: now });

      if (meta.artifactId) await addNote(meta.artifactId, params.note);
      if (params.open) void osOpen(filePath);

      return {
        content: [{
          type: "text",
          text: [
            `Frontpage updated: ${filePath}`,
            meta.artifactId ? `mai note added to ${meta.artifactId}` : "mai artifact unknown — no note",
            `Ops applied: ${applied.length}/${params.patch.length}`,
            ...applied.map(a => `  ✓ ${a}`),
            ...(skipped.length > 0 ? [`Skipped: ${skipped.length}`, ...skipped.map(s => `  ✗ ${s.op}${s.section_id ? ` ${s.section_id}` : ""}: ${s.reason}`)] : []),
          ].join("\n"),
        }],
        details: { slug: withIds.slug, path: filePath, artifactId: meta.artifactId, applied: applied.length, skipped: skipped.length, sectionIds: withIds.sections.map(s => s.id) },
      };
    },
  });

  pi.registerTool({
    name: "frontpage_open",
    label: "Frontpage · open",
    description: "Open an existing frontpage in the default browser.",
    parameters: OpenParams,
    async execute(_id, params) {
      const filePath = pagePath(params.slug);
      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: `No frontpage at ${filePath}` }],
          isError: true,
          details: {},
        };
      }
      void osOpen(filePath);
      return {
        content: [{ type: "text", text: `Opening ${filePath}` }],
        details: { path: filePath },
      };
    },
  });

  // /frontpage-reload — dev helper to flush the partials cache
  pi.registerCommand("frontpage-reload", {
    description: "Reload frontpage partials from disk (dev).",
    handler: async (_args, ctx) => {
      reloadPartials();
      if (ctx.hasUI) ctx.ui.notify("Frontpage partials reloaded", "success");
    },
  });
}
