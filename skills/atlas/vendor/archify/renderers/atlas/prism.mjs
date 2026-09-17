/**
 * PRISM PLATE — spec to interactive 3D plate.
 *
 * One geometry authority (this file) feeding a second register: the atlas SVG plate stays the
 * document you print, and this one is the scene you orbit. Both read the same spec fields, so a
 * system is described once.
 *
 * The scene model is deliberately tiny: ground positions and footprints, extrusion heights,
 * ground-plane route polylines, zone rectangles, labels. Anything the viewer needs beyond that
 * it derives — the shaders do the look, CSS does the type.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, '..', '..', 'assets', 'prism-plate.html');
const RUNTIME = path.join(__dirname, '..', '..', '..', 'atlas', 'prism-runtime.js');
const PAD = 1.2;

const asArray = (value) => (Array.isArray(value) ? value : []);
const num = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

function callsign(component) {
  const fromSublabel = String(component.sublabel || '').trim().split(/[\s\u00b7:]+/)[0];
  if (/^[A-Za-z0-9]{2,4}$/.test(fromSublabel)) return fromSublabel.toUpperCase();
  return String(component.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
}

const KEY_GLYPHS = [
  ['<polygon points="4,8 12,4 20,8 12,12" style="fill:var(--paper);stroke:var(--ink)"/><polygon points="12,12 20,8 20,12 12,16" fill="url(#hA)" style="stroke:var(--ink)"/><polygon points="4,8 12,12 12,16 4,12" fill="url(#hB)" style="stroke:var(--ink)"/>', 'Service — height is {metric}'],
  ['<polygon points="4,6 12,2 20,6 12,10" style="fill:var(--paper);stroke:var(--ink)"/><polygon points="4,10 12,6 20,10 12,14" style="fill:var(--paper);stroke:var(--ink)"/>', 'Store — a database or a directory'],
  ['<polygon points="4,8 12,4 20,8 12,12" style="fill:none;stroke:var(--ink);stroke-dasharray:3 2"/>', 'Removed, kept as a footprint'],
  ['<line x1="2" y1="8" x2="18" y2="8" style="stroke:var(--ink)"/><polygon points="14,4 20,8 14,12" style="fill:none;stroke:var(--ink)"/>', 'Data path'],
  ['<line x1="2" y1="8" x2="18" y2="8" style="stroke:var(--ink);stroke-dasharray:4 3"/><polygon points="14,4 20,8 14,12" style="fill:none;stroke:var(--ink)"/>', 'Signal, optional or indirect'],
  ['<line x1="2" y1="8" x2="18" y2="8" style="stroke:var(--warm)"/><polygon points="14,4 20,8 14,12" style="fill:none;stroke:var(--warm)"/>', 'The human — never through the model'],
];

const variantCode = (variant) => (variant === 'emphasis' ? 1 : variant === 'dashed' ? 2 : 0);

export function compileScene(arch) {
  const components = asArray(arch.components);
  const plate = arch.meta && arch.meta.plate ? arch.meta.plate : {};

  const owner = new Map();
  asArray(arch.boundaries).forEach((boundary) => {
    asArray(boundary.wraps).forEach((id) => { if (!owner.has(id)) owner.set(id, String(boundary.label)); });
  });

  const nodes = components.map((component) => {
    const footprint = asArray(component.footprint);
    const position = asArray(component.pos);
    const dossier = component.dossier || {};
    return {
      id: component.id,
      code: callsign(component),
      name: component.label,
      type: component.type || 'external',
      group: owner.get(component.id) || String(component.type || 'other'),
      state: component.state === 'removed' ? 'removed' : 'active',
      x: num(position[0], 0),
      z: num(position[1], 0),
      w: num(footprint[0], 2.4),
      d: num(footprint[1], 1.6),
      h: num(component.elevation, 0.8),
      does: dossier.does || '',
      built: dossier.built || '',
      facts: asArray(dossier.facts).map((pair) => [String(pair[0]), String(pair[1])]),
    };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const centreOf = (node) => ({ x: node.x + node.w / 2, z: node.z + node.d / 2 });

  const routes = asArray(arch.connections).map((connection) => {
    const from = byId.get(connection.from);
    const to = byId.get(connection.to);
    if (!from || !to) return null;
    const start = centreOf(from);
    const end = centreOf(to);
    const via = asArray(connection.via).filter((point) => asArray(point).length === 2);
    let points;
    if (via.length > 0) {
      points = [start, ...via.map((point) => ({ x: num(point[0], start.x), z: num(point[1], start.z) })), end];
    } else {
      const dx = Math.abs(end.x - start.x);
      const dz = Math.abs(end.z - start.z);
      points = dx >= dz
        ? [start, { x: end.x, z: start.z }, end]
        : [start, { x: start.x, z: end.z }, end];
    }
    return {
      from: connection.from,
      to: connection.to,
      label: connection.label || '',
      variant: variantCode(connection.variant),
      points,
    };
  }).filter(Boolean);

  const zones = asArray(arch.boundaries).map((boundary) => {
    const members = asArray(boundary.wraps).map((id) => byId.get(id)).filter(Boolean);
    if (members.length === 0) return null;
    return {
      label: String(boundary.label).toUpperCase(),
      x0: Math.min(...members.map((node) => node.x)) - PAD,
      z0: Math.min(...members.map((node) => node.z)) - PAD,
      x1: Math.max(...members.map((node) => node.x + node.w)) + PAD,
      z1: Math.max(...members.map((node) => node.z + node.d)) + PAD,
    };
  }).filter(Boolean);

  const views = [{ id: 'all', label: 'Whole plate', nodes: null }];
  asArray(arch.meta && arch.meta.views).forEach((view) => {
    views.push({ id: view.id, label: view.label, nodes: asArray(view.focus).length ? asArray(view.focus) : null });
  });

  const stats = [
    nodes.length + ' components',
    zones.length + ' zones',
    routes.length + ' relationships',
    nodes.filter((node) => node.state === 'removed').length + ' removed',
  ];
  const introHtml = '<div class="k">Nothing selected</div><h2 class="pt">' + (plate.system || arch.meta.title || 'Atlas') +
    '</h2><p class="ps">' + stats.join(' \u00b7 ') + '</p>' +
    '<div class="k">Read it</div><p>' + (plate.datum || '') + '</p>';

  return {
    title: arch.meta.title || 'Atlas Plate',
    nodes,
    routes,
    zones,
    views,
    introHtml,
    stats,
    keyRows: KEY_GLYPHS.map(([glyph, text]) => [glyph, text.replace('{metric}', plate.elevation_label || 'a stated metric')]),
    statsHtml: [
      { eyebrow: 'System', value: plate.system || arch.meta.title || 'Atlas', small: plate.revision || '' },
      { eyebrow: 'Components', value: String(nodes.length) },
      { eyebrow: 'Zones', value: String(zones.length) },
      { eyebrow: 'Relationships', value: String(routes.length) },
    ].map((stat) => '  <div class="stat"><span class="eyebrow">' + stat.eyebrow + '</span><span class="v">' + stat.value +
      (stat.small ? '<small>' + stat.small + '</small>' : '') + '</span></div>').join('\n'),
    plateHtml: '    <div class="plate"><b>' + (plate.system || arch.meta.title || 'ATLAS') + '</b>' + (plate.no || 'Plate 01') +
      '<div class="sub">' + stats.join(' &middot; ') + '<br>' + (plate.datum || '') + '</div></div>',
    keyHtml: '    <div class="key"><b>Key</b>' + KEY_GLYPHS.map(([glyph, text]) =>
      '      <div><svg viewBox="0 0 24 16">' + glyph + '</svg>' + text.replace('{metric}', plate.elevation_label || 'a stated metric') + '</div>').join('\n') + '</div>',
  };
}

export function renderPrismDocument(arch, templatePath = TEMPLATE, runtimePath = RUNTIME) {
  const compiled = compileScene(arch);
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  let html = fs.readFileSync(templatePath, 'utf8');
  // Function replacements, not string replacements: a minified bundle is full of dollar
  // sequences, and String.replace would read those as insertion patterns and corrupt the page.
  const inject = (marker, value) => {
    const hits = html.split(marker).length - 1;
    if (hits !== 1) throw new Error('prism template is missing ' + marker + ' (found ' + hits + ')');
    html = html.replace(marker, () => value);
  };
  inject('__ATLAS_TITLE__', compiled.title);
  inject('<!--__ATLAS_STATS__-->', compiled.statsHtml);
  inject('<!--__ATLAS_PLATE__-->', compiled.plateHtml);
  inject('<!--__ATLAS_KEY__-->', compiled.keyHtml);
  inject('<!--__PRISM_SCRIPT__-->', '<script>window.ATLAS_SCENE=' + JSON.stringify(compiled).replace(/</g, '\\u003c') + ';' + String.fromCharCode(10) + runtime + '</' + 'script>');
  return { html, compiled };
}
