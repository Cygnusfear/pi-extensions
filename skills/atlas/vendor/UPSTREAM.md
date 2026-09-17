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

The recorded hashes in `vendor/PROVENANCE.json#integrity.renderParity` were produced
by `parity-check.mjs --record` on a tree whose output matched the pristine upstream
checkout exactly — ten of ten specs identical across all five diagram types. Re-record
only when a deliberate change to rendering is intended, and say so in the commit.

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

None yet. The atlas tier is currently additive only; this table gains a row the moment
that stops being true.

## Pull procedure

```bash
git clone https://github.com/tt-a1i/archify && cd archify
git checkout <new-commit>          # note: git rev-parse HEAD and package.json version
```

1. Re-run the gate of the *existing* vendored tree before pulling, so a failure is
   attributable (`parity-check.mjs --upstream-root` against the old commit).
2. Diff upstream between the pinned commit and the new one, scoped to the vendored
   paths: `git diff <old>..<new> -- archify/bin archify/renderers archify/schemas
   archify/assets archify/references archify/migrations archify/brand-marks
   archify/recipes archify/delta archify/scripts viewer scripts/generate-viewer.mjs`.
3. Re-copy those paths into `vendor/`, then re-apply every row of **Touched upstream
   files**.
4. Re-run the gate with `--upstream-root` pointing at the new checkout, then
   `--record` to update `vendor/PROVENANCE.json`, and add the new commit and version
   to the table at the top of this file.
5. Commit the pull as its own commit, separate from any atlas-tier work.
