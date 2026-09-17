#!/usr/bin/env node
/**
 * Parity gate for the vendored archify compiler.
 *
 * The vendor step must be provably inert: rendering every vendored example spec
 * with the vendored compiler has to produce byte-identical output to the output
 * recorded from the pristine upstream checkout. Any edit we make to vendored
 * files or to the atlas tier is expected to keep this gate green, so the gate —
 * not a vendored copy of upstream's site-facing test suite — is the regression
 * proof for our patch set (see vendor/UPSTREAM.md).
 *
 * Usage:
 *   node scripts/parity-check.mjs                 # verify against the recorded manifest
 *   node scripts/parity-check.mjs --record        # (re)record the manifest from this tree
 *   node scripts/parity-check.mjs --upstream-root <dir>
 *                                                 # also render with a pristine upstream
 *                                                 # package dir and compare against it
 *   node scripts/parity-check.mjs --json          # machine-readable receipt
 *
 * Exit code 0 means every spec rendered identically; 1 means a mismatch, a failed
 * render, or a missing manifest.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorRoot = path.join(skillRoot, 'vendor');
const compiler = path.join(vendorRoot, 'archify', 'bin', 'archify.mjs');
const examplesDir = path.join(vendorRoot, 'archify', 'examples');
const provenancePath = path.join(vendorRoot, 'PROVENANCE.json');

const TYPES = ['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle'];
const argv = process.argv.slice(2);
const optionValue = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1] ?? null;
};
const record = argv.includes('--record');
const asJson = argv.includes('--json');
const upstreamRoot = optionValue('--upstream-root');

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Vendored example specs, addressed as <name>.<type>.json. */
function specTargets() {
  if (!fs.existsSync(examplesDir)) throw new Error(`No vendored examples at ${examplesDir}`);
  return fs.readdirSync(examplesDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const type = name.replace(/\.json$/, '').split('.').pop();
      if (!TYPES.includes(type)) throw new Error(`Example ${name} does not end in a known type: ${TYPES.join(', ')}`);
      return { name, type, specPath: path.join(examplesDir, name) };
    });
}

/** Render one spec with a given archify package directory; returns { ok, sha256 } or { ok: false, reason }. */
function render(packageDir, { name, type, specPath }, outDir) {
  const outPath = path.join(outDir, `${name.replace(/\.json$/, '')}.html`);
  const result = spawnSync(process.execPath, [
    path.join(packageDir, 'bin', 'archify.mjs'),
    'render', type, specPath, outPath, '--quality', 'showcase',
  ], { encoding: 'utf8', cwd: packageDir });
  if (result.status !== 0 || !fs.existsSync(outPath)) {
    const detail = (result.stderr || result.stdout || `exit ${result.status}`).trim().split('\n').slice(-2).join(' ');
    return { ok: false, reason: detail || 'no output written' };
  }
  return { ok: true, sha256: sha256(outPath) };
}

function main() {
  const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
  const recorded = new Map((provenance.integrity?.renderParity ?? []).map((entry) => [entry.spec, entry.sha256]));
  const targets = specTargets();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-parity-'));
  const entries = [];
  const failures = [];

  for (const target of targets) {
    const vendored = render(path.join(vendorRoot, 'archify'), target, workDir);
    if (!vendored.ok) {
      failures.push({ spec: target.name, check: 'render', detail: vendored.reason });
      continue;
    }
    const expected = recorded.get(target.name);
    if (!record && !expected) {
      failures.push({ spec: target.name, check: 'manifest', detail: 'no recorded hash; run with --record on a verified tree' });
    } else if (!record && expected !== vendored.sha256) {
      failures.push({ spec: target.name, check: 'manifest', detail: `recorded ${expected.slice(0, 12)} but rendered ${vendored.sha256.slice(0, 12)}` });
    }
    let upstream = null;
    if (upstreamRoot) {
      const pristineDir = fs.mkdtempSync(path.join(workDir, 'upstream-'));
      const pristine = render(upstreamRoot, target, pristineDir);
      if (!pristine.ok) {
        failures.push({ spec: target.name, check: 'upstream', detail: pristine.reason });
      } else if (pristine.sha256 !== vendored.sha256) {
        failures.push({ spec: target.name, check: 'upstream', detail: `upstream ${pristine.sha256.slice(0, 12)} vs vendored ${vendored.sha256.slice(0, 12)}` });
      } else {
        upstream = pristine.sha256;
      }
    }
    entries.push({ spec: target.name, type: target.type, sha256: vendored.sha256, ...(upstream ? { upstream } : {}) });
  }

  if (record) {
    if (upstreamRoot) throw new Error('--record and --upstream-root are mutually exclusive: record from a verified tree, then gate against upstream separately.');
    if (failures.length > 0) throw new Error(`Refusing to record: ${failures.length} of ${targets.length} specs did not render. A manifest may only be recorded from a tree that renders cleanly.`);
    provenance.integrity = { ...(provenance.integrity ?? {}), renderParity: entries, recordedAt: new Date().toISOString() };
    fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
  }
  fs.rmSync(workDir, { recursive: true, force: true });

  const receipt = {
    check: 'atlas-parity',
    mode: record ? 'record' : 'verify',
    upstreamRoot: upstreamRoot ?? null,
    specs: entries.length,
    failures,
    status: failures.length === 0 ? 'pass' : 'fail',
    entries,
  };
  if (asJson) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    for (const entry of entries) console.log(`  ${record ? 'recorded' : 'identical'}  ${entry.spec}  ${entry.sha256.slice(0, 12)}${upstreamRoot ? '  (upstream agrees)' : ''}`);
    for (const failure of failures) console.log(`  ${failure.check.toUpperCase()}  ${failure.spec}: ${failure.detail}`);
    console.log(`${receipt.status === 'pass' ? 'PASS' : 'FAIL'} — ${entries.length} specs, ${failures.length} failures${record ? ', manifest updated' : ''}`);
  }
  process.exit(receipt.status === 'pass' ? 0 : 1);
}

main();
