/**
 * ATLAS PLATE — spec to plate.
 *
 * The plate IS the atlas. This module does not draw: it compiles an archify architecture spec
 * into the data model the atlas viewer already renders (GROUPS, NODES, BOUNDS, EDGES, TRACE,
 * VIEWS, KEYROWS, INTRO) and injects it into the atlas template. The atlas owns the projection,
 * the camera fit, the legibility compensation, the chapter rail, the dossier panel and the
 * trace player, because that is the code that is known to read well.
 *
 * Additive spec surface read here:
 *   components[].footprint  [width, depth]  components[].elevation  extrusion height
 *   components[].dossier    { does, built, facts }   components[].state  removed
 *   boundaries[].wraps      zone membership, labels the zone on the plate
 *   connections[].via       authored waypoints   connections[].variant  dashed | emphasis
 *   meta.plate              { system, datum, elevation_label, revision, no, intro }
 *   meta.views              guided chapters (id, label, focus, note)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = path.join(__dirname, '..', '..', 'assets', 'atlas-plate.html');
const PAD = 1.2;

const asArray = (value) => (Array.isArray(value) ? value : []);
const num = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

/** Three letter callsign, from the spec if it carries one, otherwise from the id. */
function callsign(component) {
  const fromSublabel = String(component.sublabel || '').trim().split(/[\s\u00b7:]+/)[0];
  if (/^[A-Za-z0-9]{2,4}$/.test(fromSublabel)) return fromSublabel.toUpperCase();
  return String(component.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
}

function slug(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'zone';
}

/** Zones become the atlas band labels; a component belongs to the first zone that wraps it. */
function zonePlan(arch, components) {
  const boundaries = asArray(arch.boundaries);
  const groups = [];
  const owner = new Map();
  boundaries.forEach((boundary) => {
    const key = slug(boundary.label);
    const members = asArray(boundary.wraps).filter((id) => components.some((component) => component.id === id));
    if (members.length === 0) return;
    groups.push({ g: key, t: String(boundary.label).toUpperCase() });
    members.forEach((id) => { if (!owner.has(id)) owner.set(id, key); });
  });
  const fallback = new Map();
  components.forEach((component) => {
    if (owner.has(component.id)) return;
    const label = String(component.type || 'other').toUpperCase();
    const key = slug(label);
    if (!fallback.has(key)) fallback.set(key, { g: key, t: label });
    owner.set(component.id, key);
  });
  return { groups: groups.concat([...fallback.values()]), owner };
}

function zoneRect(boundary, components) {
  const members = asArray(boundary.wraps)
    .map((id) => components.find((component) => component.id === id))
    .filter(Boolean);
  if (members.length === 0) return null;
  const x0 = Math.min(...members.map((c) => num(asArray(c.pos)[0], 0))) - PAD;
  const y0 = Math.min(...members.map((c) => num(asArray(c.pos)[1], 0))) - PAD;
  const x1 = Math.max(...members.map((c) => num(asArray(c.pos)[0], 0) + num(asArray(c.footprint)[0], 2.4))) + PAD;
  const y1 = Math.max(...members.map((c) => num(asArray(c.pos)[1], 0) + num(asArray(c.footprint)[1], 1.6))) + PAD;
  return [Number(x0.toFixed(2)), Number(y0.toFixed(2)), Number((x1 - x0).toFixed(2)), Number((y1 - y0).toFixed(2))];
}

const KEY_GLYPHS = [
  ['<polygon points="4,8 12,4 20,8 12,12" style="fill:var(--paper);stroke:var(--ink)"/><polygon points="12,12 20,8 20,12 12,16" fill="url(#hA)" style="stroke:var(--ink)"/><polygon points="4,8 12,12 12,16 4,12" fill="url(#hB)" style="stroke:var(--ink)"/>', 'service'],
  ['<polygon points="4,6 12,2 20,6 12,10" style="fill:var(--paper);stroke:var(--ink)"/><polygon points="4,10 12,6 20,10 12,14" style="fill:var(--paper);stroke:var(--ink)"/>', 'store'],
  ['<polygon points="4,8 12,4 20,8 12,12" style="fill:none;stroke:var(--ink);stroke-dasharray:3 2"/>', 'removed'],
  ['<line x1="2" y1="8" x2="18" y2="8" style="stroke:var(--ink)"/><polygon points="14,4 20,8 14,12" style="fill:none;stroke:var(--ink)"/>', 'path'],
  ['<line x1="2" y1="8" x2="18" y2="8" style="stroke:var(--ink);stroke-dasharray:4 3"/><polygon points="14,4 20,8 14,12" style="fill:none;stroke:var(--ink)"/>', 'signal'],
  ['<line x1="2" y1="8" x2="18" y2="8" style="stroke:var(--warm)"/><polygon points="14,4 20,8 14,12" style="fill:none;stroke:var(--warm)"/>', 'human'],
];

function keyRows(plate) {
  const metric = plate.elevation_label || 'a stated metric';
  const labels = {
    service: 'Service — height is ' + metric,
    store: 'Store — a database or a directory',
    removed: 'Removed, kept as a footprint',
    path: 'Data path',
    signal: 'Signal, optional or indirect',
    human: 'The human — never through the model',
  };
  return KEY_GLYPHS.map(([glyph, key]) => [glyph, labels[key]]);
}

function introHtml(arch, plate, stats) {
  if (typeof plate.intro === 'string' && plate.intro.length > 0) return plate.intro;
  const sections = asArray(plate.intro_sections).map((section) =>
    '<div class="k">' + section.heading + '</div><p>' + section.body + '</p>').join('');
  return '<div class="k">Nothing selected</div><h2 class="pt">' + (plate.system || arch.meta.title || 'Atlas') +
    '</h2><p class="ps">' + stats.join(' \u00b7 ') + '</p>' + sections;
}

export function compilePlate(arch) {
  const components = asArray(arch.components);
  const plate = arch.meta && arch.meta.plate ? arch.meta.plate : {};
  const { groups, owner } = zonePlan(arch, components);

  const nodes = components.map((component) => {
    const dossier = component.dossier || {};
    const node = {
      id: component.id,
      code: callsign(component),
      g: owner.get(component.id),
      name: component.label,
      gx: num(asArray(component.pos)[0], 0),
      gy: num(asArray(component.pos)[1], 0),
      w: num(asArray(component.footprint)[0], 2.4),
      d: num(asArray(component.footprint)[1], 1.6),
      h: num(component.elevation, 0.8),
      does: dossier.does || '',
      built: dossier.built || '',
      facts: asArray(dossier.facts).map((pair) => [String(pair[0]), String(pair[1])]),
    };
    if (component.type === 'database') { node.kind = 'slab'; node.plates = Math.max(2, Math.min(5, Math.round(node.h * 3))); }
    if (component.state === 'removed') node.dash = true;
    return node;
  });

  const bounds = asArray(arch.boundaries).map((boundary) => {
    const rect = zoneRect(boundary, components);
    if (!rect) return null;
    const entry = { lab: String(boundary.label).toUpperCase(), rect, at: 'top' };
    if (boundary.kind === 'security-group') entry.gone = true;
    return entry;
  }).filter(Boolean);

  const edges = asArray(arch.connections).map((connection) => {
    const from = components.find((c) => c.id === connection.from);
    const to = components.find((c) => c.id === connection.to);
    const edge = { f: connection.from, t: connection.to };
    if (connection.label) edge.lab = connection.label;
    if (connection.variant === 'dashed') edge.k = 'd';
    if (connection.variant === 'emphasis') edge.k = 'w';
    if (Array.isArray(connection.via) && connection.via.length > 0) {
      edge.via = connection.via.map((point) => [num(point[0], 0), num(point[1], 0)]);
    } else if (from && to) {
      const dx = Math.abs(num(asArray(to.pos)[0], 0) - num(asArray(from.pos)[0], 0));
      const dy = Math.abs(num(asArray(to.pos)[1], 0) - num(asArray(from.pos)[1], 0));
      edge.o = dx >= dy ? 'xy' : 'yx';
    }
    return edge;
  });

  const trace = asArray(plate.trace).map((hop) => ({ f: hop.from, t: hop.to, n: hop.title || '', s: hop.story || '' }));
  const views = asArray(arch.meta && arch.meta.views).map((view) => ({
    id: view.id,
    lab: view.label,
    nodes: asArray(view.focus).length ? asArray(view.focus) : null,
    note: view.note || '',
  }));
  if (views.length === 0) {
    views.push({ id: 'all', lab: 'Whole plate', nodes: null, note: 'Everything on one plate. Height is ' + (plate.elevation_label || 'a stated metric') + '.' });
  }

  const removed = nodes.filter((node) => node.dash).length;
  const stats = [
    nodes.length + ' components',
    bounds.length + ' zones',
    edges.length + ' relationships',
    removed + ' removed',
  ];

  return {
    title: arch.meta.title || 'Atlas Plate',
    dataJs: [
      'var GROUPS=' + JSON.stringify(groups) + ';',
      'var NODES=' + JSON.stringify(nodes) + ';',
      'var BOUNDS=' + JSON.stringify(bounds) + ';',
      'var EDGES=' + JSON.stringify(edges) + ';',
      'var TRACE=' + JSON.stringify(trace) + ';',
      'var VIEWS=' + JSON.stringify(views) + ';',
      'var KEYROWS=' + JSON.stringify(keyRows(plate)) + ';',
      'function INTRO_HTML(){return ' + JSON.stringify(introHtml(arch, plate, stats)) + ';}',
    ].join('\n'),
    statsHtml: [
      { eyebrow: 'System', value: plate.system || arch.meta.title || 'Atlas', small: plate.revision || '' },
      { eyebrow: 'Components', value: String(nodes.length) },
      { eyebrow: 'Zones', value: String(bounds.length) },
      { eyebrow: 'Relationships', value: String(edges.length) },
    ].map((stat) => '  <div class="stat"><span class="eyebrow">' + stat.eyebrow + '</span><span class="v">' + stat.value +
      (stat.small ? '<small>' + stat.small + '</small>' : '') + '</span></div>').join('\n'),
    plateHtml: '    <div class="plate"><b>' + (plate.system || arch.meta.title || 'ATLAS') + '</b>' +
      (plate.no || 'Plate 01') + '<div class="sub">' +
      stats.join(' &middot; ') + '<br>' + (plate.datum || '') +
      (plate.revision ? '<br>' + plate.revision : '') + '</div></div>',
    stats,
  };
}

export function renderPlateDocument(arch, templatePath = DEFAULT_TEMPLATE) {
  const compiled = compilePlate(arch);
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace('<html lang="en">', '<html lang="en" data-atlas-plate="1">');
  html = html.replace('__ATLAS_TITLE__', compiled.title);
  html = html.replace('/*__ATLAS_DATA__*/', compiled.dataJs);
  html = html.replace('<!--__ATLAS_STATS__-->', compiled.statsHtml);
  html = html.replace('<!--__ATLAS_PLATE__-->', compiled.plateHtml);
  return { html, compiled };
}
