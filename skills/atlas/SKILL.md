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
| **Atlas tier** | in progress | the blueprint plate register, isometric projection, node dossiers, guided chapters and a narrated trace |

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

A `deliver` exit code of zero is the only acceptance: its receipt reports every
artefact check. A non-zero exit is never success and never "a warning".

## Before you commit anything touching this skill

```bash
node skills/atlas/scripts/parity-check.mjs                              # compiler still inert
node skills/atlas/vendor/scripts/generate-viewer.mjs --check            # viewer sources agree with the template
```

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
