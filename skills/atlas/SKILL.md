---
name: atlas
description: Author and compile system atlases — system architecture, workflows, request lifecycles, data pipelines and state machines — as self-contained, validated HTML plates with pan/zoom, themes and export. Use when the user asks for a system map, architecture diagram, sequence or request trace, ETL/lineage picture, state machine, or to convert Mermaid into a polished interactive page.
metadata:
  type: procedure
  domains: [visualisation, architecture, documentation]
  audience: any
---

# Atlas

A system atlas is a standalone HTML plate that shows a system's parts, how they talk,
and what each part actually is — compiled from a typed JSON spec, validated before it
is trusted, and explorable afterwards.

Two layers are in this skill:

| Layer | State | What it is |
|---|---|---|
| **Compiler** (`vendor/`) | vendored, inert | archify 2.17, MIT, pinned at `72c750b` — five diagram types, schema and geometry validation, a `showcase` quality gate, a self-contained viewer with pan/zoom, themes, presets and export |
| **Atlas tier** | landed | the blueprint plate register and its prism plate: a typed shape vocabulary, authored flows with playback, Flow and Infra projections, node dossiers and export |

`vendor/UPSTREAM.md` is the provenance and pull contract. Read it before changing
anything under `vendor/`.

## Authoring a diagram with the vendored compiler

Upstream's own authoring contract is vendored and authoritative — read
`vendor/archify/SKILL.md` first, then one schema and one example; do not work from this
summary alone.

```bash
cd skills/atlas
node vendor/archify/bin/archify.mjs guide "<scenario>" --json         # pick a diagram type
node vendor/archify/bin/archify.mjs validate <type> <spec.json> --quality showcase --json
node vendor/archify/bin/archify.mjs deliver  <type> <spec.json> <out.html> --quality showcase --json
```

`deliver` is the acceptance path for the SVG registers — architecture, workflow, sequence,
lifecycle, dataflow — and for the atlas plate. There, an exit code of zero is the only
acceptance: its receipt reports every artefact check, and a non-zero exit is never success
and never "a warning".

**The prism register is render-only.** Its plate is a WebGL scene, not an SVG, so the
artefact checker — which requires exactly one diagram SVG — rejects it at
`artifact/single-svg`. That diagnostic is expected for a prism spec and is not a defect in
it. Compile and verify a prism plate on its own path:

```bash
node vendor/archify/renderers/architecture/render-architecture.mjs <spec.json> <out.html> --json   # {"ok":true,"prism":true,…}
bun scripts/prism-browser-check.mjs   <out.html> <dir> <playwright-module> <chrome>                 # geometry, themes, export, mobile
bun scripts/prism-playback-check.mjs  <out.html> <dir> <playwright-module> <chrome>                 # authored flows, projections, controls
```

## Before you commit anything touching this skill

```bash
node skills/atlas/scripts/parity-check.mjs                              # compiler still inert
node skills/atlas/vendor/scripts/generate-viewer.mjs --check            # viewer sources agree with the template
bun  skills/atlas/scripts/prism-flows.test.mjs                          # shape vocabulary and routing
```

Anything touching the prism plate additionally runs `prism-browser-check.mjs` and, when a
spec authors flows, `prism-playback-check.mjs` — see the render-only note above.

## Rules that do not bend

1. **No post-processing of finished artefacts.** Restyling or re-projecting the emitted
   SVG throws away the guarantees the validator just proved — label collisions,
   legibility, routing — and turns the receipt into decoration. Presentation changes go
   into the compiler and the viewer sources, upstream of validation.
2. **No second validator and no second viewer.** One schema authority, one viewer
   runtime, one quality gate.
3. **Schema changes are additive.** Optional fields only; existing specs must keep
   rendering byte-identically.
4. **Upstream files stay pristine where possible.** New behaviour lands in our tier as
   new modules; anything else is a row in `vendor/UPSTREAM.md`.

## The prism register: shapes, spacing and routing

A spec with `meta.visual_preset: "prism"` renders the interactive plate. Its geometry is
type-keyed: one silhouette is projected flat in Flow and raised in Infra, so the two views
cannot disagree about what a component *is*.

| `component.type` | Silhouette | Top-face symbol |
|---|---|---|
| `frontend` | rounded footprint | window frame — header strip, dots, nav |
| `backend` | rounded footprint | service chevrons |
| `database` | cylinder | barrel rings and a store mark |
| `messagebus` | bar | three dividers — ordered work |
| `external` | hexagon | arrow leaving the boundary |
| anything else (`cloud`, `security`, …) | plain footprint | none — no invented symbol |

Four rules hold this together, and the checks enforce them:

1. **The footprint is the outer bound.** A silhouette cuts corners, it never grows, so hit
   testing, camera fit and label anchors stay inside the authored rectangle.
2. **Spacing is authored, so keep it on the grid.** Positions and footprints are plain
   numbers; zone rectangles are derived from their members plus `PAD` (1.2). Leave 2 units
   of padding inside a zone, 3 between sibling zones, and reserve the title band at `z0`.
3. **Routes walk gutters, not borders.** Two components in different zones with no `via`
   turn twice in the open corridor between those zones; a third zone in the corridor falls
   back to the direct L; authored `via` always wins. An elbow never lands on a zone border.
4. **Removed components stay visible as footprints** — dashed outline, no volume.

The vocabulary is `vendor/atlas/prism-shapes.js`: pure geometry, no renderer, unit tested.
`prism-viewer.js` renders it; `prism.mjs` compiles the scene and routes it. Change a shape
there and in its test, never in an emitted page.
