# Prism example and flow playback

`helpdesk.prism.architecture.json` transcribes the user-supplied `system-atlas.html` reference. Its 12 narrated hops are preserved in Full support loop; Ask and answer, Escalate, and Human handoff are contiguous sections of that same sequence, not additional inferred paths. The reference chapter notes are preserved except the Ask note, shortened to the existing 140-character limit.

## Authoring

Add optional `meta.plate.flows`: an array of `{ id, label, steps }`. Each step has `from`, `to`, optional `title`, and optional `story`. It must match exactly one directed connection. If parallel connections share endpoints, provide `connection`, the zero-based connection index, to disambiguate. Missing or ambiguous routes fail compilation. No authored flows means disabled playback controls; connection order is never treated as a story.

Flow and Infra use the same geometry and route data. Projection changes retain selection, step and elapsed progress. Play resumes a paused step; playing a completed flow starts again. Step pauses and advances one hop. Restart pauses at the first hop. Playback stops at completion and pauses when the page becomes hidden. Reset view resets camera/selection only, not playback.

## Build and verify

The shipped runtime is bundled and works offline. Development needs Bun, Three.js 0.186.0 and Playwright. Three.js is MIT; its bundle retains the license notice. Compiler and unit tests run in Node.

From the skill directory:

```sh
node vendor/archify/renderers/architecture/render-architecture.mjs examples/helpdesk.prism.architecture.json /tmp/helpdesk-prism.html
node --test scripts/prism-flows.test.mjs
node scripts/parity-check.mjs
bun scripts/prism-playback-check.mjs /tmp/helpdesk-prism.html /tmp/atlas-check /absolute/path/to/playwright/index.mjs /absolute/path/to/chrome
```

To rebuild the runtime, use an external scratch directory with `three@0.186.0` installed. Copy `vendor/atlas/prism-{viewer,playback}.js` there, then run `bun build prism-viewer.js --minify --format=iife --outfile=/absolute/skill/path/vendor/atlas/prism-runtime.js`. Regenerate the HTML from the spec afterward; never patch an emitted page. Schema edits require `node vendor/archify/scripts/generate-validators.mjs`.

Browser verification writes a JSON receipt, Flow/Infra screenshots in both themes, a mobile screenshot and a PNG export. Inspect the images as well as the assertions. No pixel-perfect parity with the original SVG atlas is claimed.
