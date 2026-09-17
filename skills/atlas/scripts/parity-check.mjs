#!/usr/bin/env node
/**
 * Parity gate for the vendored archify compiler.
 *
 * Two properties are checked, because the vendored tree is intentionally not
 * pristine any more:
 *
 * 1. COMPILER PARITY — rendering every vendored example spec has to produce the
 *    same compiled SVG as the pristine upstream checkout at the pinned commit.
 *    Hashing the SVG and not the whole document is deliberate: the viewer
 *    template is an upstream file we edit on purpose, and a hash over the whole
 *    page would turn every intentional viewer change into a false regression.
 *    The SVG is the compiler's output, and it must never drift.
 *
 * 2. RECORDED ARTEFACTS — the viewer template is generated from viewer/ sources,
 *    so its digest is recorded here. A change must be a deliberate, recorded,
 *    reviewed change (run with --record on a verified tree), never a silent one.
 *
 * Usage:
 *   node scripts/parity-check.mjs                       # verify against the manifest
 *   node scripts/parity-check.mjs --record              # (re)record from this tree
 *   node scripts/parity-check.mjs --upstream-root <dir> # also compare against a pristine upstream package dir
 *   node scripts/parity-check.mjs --json                # machine-readable receipt
 *
 * Exit code 0 means every spec compiled identically and every recorded artefact
 * digest matches; 1 means a mismatch, a failed render, or a missing manifest.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorRoot = path.join(skillRoot, 'vendor');
const packageDir = path.join(vendorRoot, 'archify');
const examplesDir = path.join(packageDir, 'examples');
const provenancePath = path.join(vendorRoot, 'PROVENANCE.json');

const TYPES = ['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle'];
const RECORDED_ARTIFACTS = [
  { id: 'viewer-template', file: path.join(packageDir, 'assets', 'template.html'), generatedBy: 'node vendor/scripts/generate-viewer.mjs' },
];
const MIN_SVG_BYTES = 5000;

const argv = process.argv.slice(2);
const optionValue = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1] ?? null;
};
const record = argv.includes('--record');
const asJson = argv.includes('--json');
const upstreamRoot = optionValue('--upstream-root');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function specTargets() {
  if (!fs.existsSync(examplesDir)) throw new Error(`No vendored examples at ${examplesDir}`);
  return fs.readdirSync(examplesDir).filter((name) => name.endsWith('.json')).sort().map((name) => {
    const type = name.replace(/\.json$/, '').split('.').pop();
    if (!TYPES.includes(type)) throw new Error(`Example ${name} does not end in a known type: ${TYPES.join(', ')}`);
    return { name, type, specPath: path.join(examplesDir, name) };
  });
}

/** The diagram SVG: the largest inline SVG in the delivered document. */
function diagramSvg(html, spec) {
  const blocks = html.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
  if (blocks.length === 0) throw new Error(`${spec}: no inline SVG in the rendered document`);
  const largest = blocks.reduce((a, b) => (b.length > a.length ? b : a));
  if (largest.length < MIN_SVG_BYTES) throw new Error(`${spec}: largest SVG is ${largest.length} bytes — that is page chrome, not a diagram`);
  return largest;
}

/** Render one spec with a given archify package directory. */
function render(target, outDir, packageRoot) {
  const outPath = path.join(outDir, `${target.name.replace(/\.json$/, '')}.html`);
  const result = spawnSync(process.execPath, [
    path.join(packageRoot, 'bin', 'archify.mjs'),
    'render', target.type, target.specPath, outPath, '--quality', 'showcase',
  ], { encoding: 'utf8', cwd: packageRoot });
  if (result.status !== 0 || !fs.existsSync(outPath)) {
    const detail = (result.stderr || result.stdout || `exit ${result.status}`).trim().split('\n').slice(-2).join(' ');
    return { ok: false, reason: detail || 'no output written' };
  }
  try {
    return { ok: true, sha256: sha256(diagramSvg(fs.readFileSync(outPath, 'utf8'), target.name)) };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

function main() {
  const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
  const recorded = new Map((provenance.integrity?.renderParity ?? []).map((entry) => [entry.spec, entry.svgSha256]));
  const recordedArtifacts = new Map((provenance.integrity?.recordedArtifacts ?? []).map((entry) => [entry.id, entry.sha256]));
  const targets = specTargets();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-parity-'));
  const entries = [];
  const failures = [];

  for (const target of targets) {
    const vendored = render(target, workDir, packageDir);
    if (!vendored.ok) {
      failures.push({ spec: target.name, check: 'render', detail: vendored.reason });
      continue;
    }
    const expected = recorded.get(target.name);
    if (!record && !expected) failures.push({ spec: target.name, check: 'manifest', detail: 'no recorded hash; run --record on a verified tree' });
    else if (!record && expected !== vendored.sha256) failures.push({ spec: target.name, check: 'manifest', detail: `recorded ${expected.slice(0, 12)} but compiled ${vendored.sha256.slice(0, 12)}` });

    let upstream = null;
    if (upstreamRoot) {
      const pristine = render(target, fs.mkdtempSync(path.join(workDir, 'upstream-')), upstreamRoot);
      if (!pristine.ok) failures.push({ spec: target.name, check: 'upstream', detail: pristine.reason });
      else if (pristine.sha256 !== vendored.sha256) failures.push({ spec: target.name, check: 'upstream', detail: `upstream ${pristine.sha256.slice(0, 12)} vs vendored ${vendored.sha256.slice(0, 12)}` });
      else upstream = pristine.sha256;
    }
    entries.push({ spec: target.name, type: target.type, svgSha256: vendored.sha256, ...(upstream ? { upstreamSvgSha256: upstream } : {}) });
  }

  const artifacts = RECORDED_ARTIFACTS.map((artifact) => ({ ...artifact, sha256: fs.existsSync(artifact.file) ? sha256(fs.readFileSync(artifact.file)) : null }));
  for (const artifact of artifacts) {
    if (artifact.sha256 === null) {
      failures.push({ spec: artifact.id, check: 'artifact', detail: `missing ${artifact.file}` });
      continue;
    }
    const expected = recordedArtifacts.get(artifact.id);
    if (!record && expected && expected !== artifact.sha256) {
      failures.push({ spec: artifact.id, check: 'artifact', detail: 'digest changed: if this edit is intended, re-record with --record and note the reason in vendor/UPSTREAM.md' });
    } else if (!record && !expected) {
      failures.push({ spec: artifact.id, check: 'artifact', detail: 'no recorded digest; run --record on a verified tree' });
    }
  }

  if (record) {
    if (upstreamRoot) throw new Error('--record and --upstream-root are mutually exclusive: record from a verified tree, then gate against upstream separately.');
    if (failures.length > 0) throw new Error(`Refusing to record: ${failures.length} of ${targets.length + artifacts.length} checks failed. A manifest may only be recorded from a tree that renders cleanly.`);
    provenance.integrity = {
      ...(provenance.integrity ?? {}),
      renderParity: entries,
      recordedArtifacts: artifacts.map(({ id, file, sha256: digest, generatedBy }) => ({ id, path: path.relative(vendorRoot, file), sha256: digest, generatedBy })),
      recordedAt: new Date().toISOString(),
    };
    fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
  }
  fs.rmSync(workDir, { recursive: true, force: true });

  const receipt = {
    check: 'atlas-parity',
    mode: record ? 'record' : 'verify',
    upstreamRoot: upstreamRoot ?? null,
    specs: entries.length,
    artifacts: artifacts.length,
    failures,
    status: failures.length === 0 ? 'pass' : 'fail',
    entries,
  };
  if (asJson) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    for (const entry of entries) console.log(`  ${record ? 'recorded' : 'identical'}  ${entry.spec}  svg ${entry.svgSha256.slice(0, 12)}${upstreamRoot ? '  (upstream agrees)' : ''}`);
    for (const artifact of artifacts) console.log(`  artifact   ${artifact.id}  ${artifact.sha256 ? artifact.sha256.slice(0, 12) : 'missing'}`);
    for (const failure of failures) console.log(`  ${failure.check.toUpperCase()}  ${failure.spec}: ${failure.detail}`);
    console.log(`${receipt.status === 'pass' ? 'PASS' : 'FAIL'} — ${entries.length} specs, ${artifacts.length} artifacts, ${failures.length} failures${record ? ', manifest updated' : ''}`);
  }
  process.exit(receipt.status === 'pass' ? 0 : 1);
}

main();
