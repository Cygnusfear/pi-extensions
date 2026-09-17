# Upstream provenance — archify

`skills/atlas` vendors the archify diagram compiler. This file is the record of
exactly which upstream code is here, why it is here as a copy rather than as a
dependency, what was deliberately left out, and how to pull a newer upstream.

## Pinned source

| Field | Value |
|---|---|
| Project | archify — JSON-IR diagram renderers (architecture / workflow / sequence / dataflow / lifecycle) |
| Repository | https://github.com/tt-a1i/archify |
| Commit | `72c750bb070d95171dbb2244e5b62b1b7da69c12` (2026-09-17, "fix(deps): unstick the fast-uri override from a version that is itself vulnerable (#347)") |
| Version | `2.17.0-dev.1` (from `vendor/archify/package.json`) |
| License | MIT — `vendor/archify/LICENSE` and `vendor/archify/THIRD_PARTY_NOTICES.md`; upstream's repository-root copies are byte-identical to these, so only one copy of each is vendored |
| Vendored | 2026-09-17 by Lucianne Luna Godbole |
| Machine-readable record | `vendor/PROVENANCE.json` |

## Why a vendored copy and not a dependency

1. **We patch the compiler and the viewer, not just its input.** The atlas tier adds a
   visual preset, a projection stage in the architecture renderer, and viewer features
   (dossier panel, chapter rail, trace playback). Those live in upstream source files.
2. **A skill must work with zero install.** The vendored runtime has **no external
   imports** — verified by resolving every relative import in `bin/`, `renderers/`,
   `delta/`, `recipes/` and `migrations/` — so the skill runs from a clone with no
   `bun install`, no lockfile and no network.
3. **A pinned tree makes the patch set reviewable and pull-able.** Upstream moves
   quickly (347+ merged pull requests); the discipline below is what keeps a pull a
   rebase instead of a rewrite.

## What is vendored

| Path | Purpose |
|---|---|
| `vendor/archify/bin/` | CLI verbs: `render`, `deliver`, `validate`, `preview`, `compare`, `migrate`, `inspect`, `visual-check`, `guide`, `brands`, `examples`, `doctor`, `demo`, `check` |
| `vendor/archify/renderers/` | The five compilers, shared geometry, diagnostics, i18n, brand marks, generated validators |
| `vendor/archify/schemas/` | JSON Schemas per diagram type, plus `common.schema.json` |
| `vendor/archify/assets/template.html` | The self-contained viewer template (generated — see below) |
| `vendor/archify/scripts/` | `check-render-output.mjs` and `render-examples.mjs`, both invoked by the CLI at runtime |
| `vendor/archify/examples/*.json` | 14 example specs — the fixtures for the parity gate (rendered `.html` outputs are not vendored) |
| `vendor/archify/{references,migrations,brand-marks,recipes,delta}/` | Authoring contracts, schema migrations, brand catalog, scenario recipes, baseline comparison |
| `vendor/viewer/` | Viewer sources: `template.source.html` plus 13 fragment files that `scripts/generate-viewer.mjs` splices into the template. This is where viewer features are authored. |
| `vendor/scripts/generate-viewer.mjs` | Regenerates `vendor/archify/assets/template.html` from `vendor/viewer/` |

## What is deliberately not vendored

| Left out | Why |
|---|---|
| `archify/test/` (2 MB, 200+ suites) | Upstream's suite asserts site and release identity (`golden.mjs` compares README badges, GitHub Pages labels, docs), which this vendor does not ship — so most of the suite cannot run here. Behavioural parity is instead proven by `scripts/parity-check.mjs`, which renders every vendored example spec at `showcase` quality and compares SHA-256 against the recorded manifest. That gate covers our actual risk surface: the renderers and the viewer. |
| `docs/`, `scripts/build-{gallery,guide,start,readme-showcase}.mjs`, `scripts/copy-site-assets.mjs` | Builds upstream's documentation site, which is not part of this skill |
| `benchmarks/`, `experiments/`, `integrations/`, `generated/` | Upstream research and site assets |
| Repository-root documents (`README*`, `CHANGELOG`, `ROADMAP`, `DESIGN`, `PRODUCT`, `CONTRIBUTING`, `REVIEWING`, `SECURITY`) | Upstream project documentation; the authoring contract that matters for authors is vendored at `vendor/archify/SKILL.md` and `vendor/archify/references/` |
| `.github/` CI, issue templates, star history | Upstream repository automation |

Because `vendor/archify/package.json` is kept byte-identical to upstream, its `scripts`
entries that point at the non-vendored paths above (`../scripts/run-tests.mjs`,
`check-release-identity`, the `build:*` site builders) will not run here. That is
expected and deliberate; use the gate below instead.

## Verification

```bash
# 1. Every vendored example renders to the recorded hash.
node skills/atlas/scripts/parity-check.mjs

# 2. The viewer template still regenerates byte-identically from viewer/ sources.
node skills/atlas/vendor/scripts/generate-viewer.mjs --check

# 3. Drift against a pristine upstream checkout (any commit):
node skills/atlas/scripts/parity-check.mjs --upstream-root /path/to/archify-src/archify
```

The gate checks two different things, because the vendored tree is deliberately not
pristine:

* **Compiler parity.** `integrity.renderParity` records the SHA-256 of the *compiled SVG*
  per spec — not of the whole page. The viewer template is an upstream file we edit on
  purpose, so hashing the page would turn every intentional viewer change into a false
  regression. The SVG is the compiler's output and it must equal pristine upstream,
  always, including `--upstream-root` comparisons at any commit.
* **Recorded artefacts.** `integrity.recordedArtifacts` records the digest of the
  generated viewer template. Changing it requires `--record` on a verified tree, which
  makes an intentional viewer change a visible, reviewed act instead of a silent drift.

`--record` refuses to write a manifest from a tree that does not render cleanly.

## Runtime and generator dependencies

* **Runtime: none.** The compiler and viewer have no external imports and no bundler.
* **Generators are dev-time only** and are run inside `vendor/archify` with its own
  scratch `bun install`: `ajv` regenerates `renderers/shared/generated-validators.mjs`
  from `schemas/`, and `simple-icons` regenerates
  `renderers/shared/generated-brand-marks.mjs` from `brand-marks/catalog.json`. Never
  commit `node_modules`, and never make the shipped path depend on either package.
* **Node, not bun, runs the compiler.** Upstream documents `node >= 18` and the parity
  gate is defined in that runtime; the workspace itself remains bun-managed.

## Patch discipline

1. Prefer new files under our tier (`skills/atlas/renderers/`, `skills/atlas/viewer/`)
   over edits to vendored upstream files. A change that can be expressed as an additive
   module must be.
2. Every vendored upstream file we do touch is listed in **Touched upstream files**
   below, with the reason and the smallest possible hunk. That list is the pull
   conflict surface and must stay short.
3. Schema work is additive: optional fields only, never a redefinition of an existing
   field. Regenerate `renderers/shared/generated-validators.mjs` after a schema change.
4. Run the parity gate (and the viewer `--check` when `vendor/viewer/` changed) before
   every commit that touches the vendor tree.
5. Never post-process a validated artefact to restyle or re-project it, and never write
   a second validator. Both turn the quality receipt into decoration.

## Touched upstream files

These are the only vendored upstream files the atlas tier edits. Keep this table short:
every row is a conflict to resolve on the next pull.

| File | Edit |
|---|---|
| `archify/schemas/common.schema.json` | `$defs.visualPreset.enum` gains `atlas` (additive enum member) |
| `archify/renderers/shared/generated-validators.mjs` | regenerated from the schema above. Verified by normalising both copies: apart from the new enum member the regenerated file is byte-identical to the pinned one, so the vendored generated artefact was in sync with the vendored schemas. |
| `archify/renderers/shared/i18n.mjs` | four `viewer.preset.atlas*` keys, in both shipped locales (`en`, `zh-CN`) |
| `viewer/template.source.html` | the atlas register: light and dark token blocks, the preset control mark, the preset swatch, the menu option, and the `PRESETS` / `LABELS` entries |
| `archify/assets/template.html` | regenerated output of `node vendor/scripts/generate-viewer.mjs`; never hand-edited |
| `archify/scripts/check-render-output.mjs` | the plate profile: the four orthographic composition rules are replaced for `data-preset="atlas"` by three that hold in a projection (occlusion, route overlap, footprint separation), and the twenty `viewer.preset.atlas*` strings stay out of the 2D path entirely. Orthographic rules stay enforced for every other preset. |
| `archify/renderers/architecture/render-architecture.mjs` | a fourteen line dispatch: when `meta.visual_preset` is `atlas`, the plate compiler owns the render and the 2D layout never runs. |
| `archify/schemas/architecture.schema.json` | additive component fields `footprint`, `elevation`, `state`, `dossier`, and `meta.plate`. Existing specs are unaffected. |
| `archify/schemas/common.schema.json` | `$defs.visualPreset.enum` gains `atlas`; `$defs.plateFootprint` added. |

## Patches we own outright (no upstream file touched)

Our own modules live beside the vendor tree, not inside it, and are free to change.
This table lists them once they exist; the plate compiler is the first entry.

| Path | Responsibility |
|---|---|
| `archify/renderers/atlas/plate.mjs` | the plate compiler: isometric projection, prisms with hatch faces, zones from `boundaries.wraps`, ground-plane routing with projected arrowheads, a deterministic label solver, a fixed authoring canvas. Ours; upstream files are touched only to dispatch into it. |

## Atlas register palette — measured, not estimated

The type strokes double as text colours in this viewer (`.t-<type>`), so all seven are
held to 4.5:1 on their paper, not to the 3:1 a pure stroke would need.

Light theme, on paper `#ffffff`: frontend `#4f46e5` 6.3:1, backend `#1d4ed8` 6.7:1,
database `#1e3a8a` 10.4:1, cloud `#0369a1` 5.9:1, security `#5b21b6` 9.0:1,
messagebus `#0e7490` 5.4:1, external `#475569` 7.6:1; body text `#0b1b34` 17.2:1,
muted `#4a5878` 7.1:1, dim `#5f6c94` 5.2:1.

Dark theme, on navy `#0a1730`: frontend `#a5b4fc` 8.9:1, backend `#93c5fd` 9.9:1,
database `#a8b8d8` 8.9:1, cloud `#7dd3fc` 10.7:1, security `#c4b5fd` 9.7:1,
messagebus `#67e8f9` 12.3:1, external `#cbd5e1` 12.0:1; body text `#eaf1ff` 15.7:1,
muted `#a8b8d8` 8.9:1, dim `#93a4c6` 7.1:1.

The flow accent is `#4f46e5` (6.3:1 on paper), reserved for emphasis arcs so direction
stays the loudest thing on the plate while everything else is workhorse ink. The ramp is
produced by a generator that refuses to write the file if any pair misses its threshold,
so these numbers cannot drift silently. Re-measure before changing any value here.
