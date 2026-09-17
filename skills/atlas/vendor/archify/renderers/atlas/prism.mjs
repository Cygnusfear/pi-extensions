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
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function port(node, toward) {
  const x = node.x + node.w / 2, z = node.z + node.d / 2;
  const dx = toward.x - x, dz = toward.z - z;
  const scale = Math.min(dx ? node.w / (2 * Math.abs(dx)) : Infinity, dz ? node.d / (2 * Math.abs(dz)) : Infinity);
  return Number.isFinite(scale) ? { x: x + dx * scale, z: z + dz * scale } : { x, z };
}

function callsign(component) {
  const fromSublabel = String(component.sublabel || '').trim().split(/[\s\u00b7:]+/)[0];
  if (/^[A-Za-z0-9]{2,4}$/.test(fromSublabel)) return fromSublabel.toUpperCase();
  return String(component.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
}

const KEY_GLYPHS = [
  ['<rect x="4" y="4" width="16" height="10" rx="2" style="fill:none;stroke:var(--ink)"/><line x1="4" y1="7.5" x2="20" y2="7.5" style="stroke:var(--ink)"/>', 'Client — a window frame you can see through'],
  ['<rect x="4" y="4" width="16" height="10" rx="3" style="fill:var(--paper);stroke:var(--ink)"/><polyline points="8,7 6.4,9 8,11" style="fill:none;stroke:var(--ink)"/><polyline points="16,7 17.6,9 16,11" style="fill:none;stroke:var(--ink)"/>', 'Service — height is {metric}'],
  ['<ellipse cx="12" cy="5.6" rx="7" ry="2.4" style="fill:var(--paper);stroke:var(--ink)"/><line x1="5" y1="5.6" x2="5" y2="12.4" style="stroke:var(--ink)"/><line x1="19" y1="5.6" x2="19" y2="12.4" style="stroke:var(--ink)"/><path d="M5 12.4a7 2.4 0 0 0 14 0" style="fill:none;stroke:var(--ink)"/>', 'Store — a database or a directory'],
  ['<rect x="5" y="5.5" width="14" height="7" style="fill:var(--paper);stroke:var(--ink)"/><line x1="9.7" y1="5.5" x2="9.7" y2="12.5" style="stroke:var(--ink)"/><line x1="14.3" y1="5.5" x2="14.3" y2="12.5" style="stroke:var(--ink)"/>', 'Queue — ordered work, first in first out'],
  ['<polygon points="9,4.5 15,4.5 19,9 15,13.5 9,13.5 5,9" style="fill:var(--paper);stroke:var(--ink)"/><polyline points="9.5,11 14,6.5 10.5,6.5" style="fill:none;stroke:var(--ink)"/><polyline points="14,6.5 14,10" style="fill:none;stroke:var(--ink)"/>', 'External — outside the system boundary'],
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

  // Zone rectangles. Members that carry no boundary are simply not in any zone, so a component
  // may belong to at most one — the first boundary that wraps it wins, as before.
  const zones = [];
  const zoneOf = new Map();
  asArray(arch.boundaries).forEach((boundary) => {
    const members = asArray(boundary.wraps).map((id) => byId.get(id)).filter(Boolean);
    if (members.length === 0) return;
    zones.push({
      label: String(boundary.label).toUpperCase(),
      x0: Math.min(...members.map((node) => node.x)) - PAD,
      z0: Math.min(...members.map((node) => node.z)) - PAD,
      x1: Math.max(...members.map((node) => node.x + node.w)) + PAD,
      z1: Math.max(...members.map((node) => node.z + node.d)) + PAD,
    });
    asArray(boundary.wraps).forEach((id) => { if (!zoneOf.has(id)) zoneOf.set(id, zones.length - 1); });
  });
  // A gutter corridor is usable only when no third zone sits inside it.
  const corridorFree = (axis, value, low, high, fromZone, toZone) => zones.every((zone, index) => {
    if (index === zoneOf.get(fromZone) || index === zoneOf.get(toZone)) return true;
    const span = axis === 'x' ? [zone.x0, zone.x1] : [zone.z0, zone.z1];
    const crossing = axis === 'x' ? [zone.z0, zone.z1] : [zone.x0, zone.x1];
    return value < span[0] || value > span[1] || high < crossing[0] || low > crossing[1];
  });

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
      const direct = dx >= dz
        ? [start, { x: end.x, z: start.z }, end]
        : [start, { x: start.x, z: end.z }, end];
      // Two components in different zones walk the open gutter between those zones instead of
      // turning on a border stroke. Side-by-side zones use the vertical corridor, stacked zones
      // the horizontal one; anything else keeps the direct L.
      const fromZone = zoneOf.get(connection.from), toZone = zoneOf.get(connection.to);
      const a = fromZone === undefined ? null : zones[fromZone];
      const b = toZone === undefined ? null : zones[toZone];
      const sideBySide = a && b && fromZone !== toZone && (b.x0 >= a.x1 || a.x0 >= b.x1) && Math.min(a.z1, b.z1) > Math.max(a.z0, b.z0);
      const stacked = a && b && fromZone !== toZone && !sideBySide && (b.z0 >= a.z1 || a.z0 >= b.z1) && Math.min(a.x1, b.x1) > Math.max(a.x0, b.x0);
      if (sideBySide) {
        const gutter = b.x0 >= a.x1 ? (a.x1 + b.x0) / 2 : (b.x1 + a.x0) / 2;
        points = corridorFree('x', gutter, Math.min(start.z, end.z), Math.max(start.z, end.z), connection.from, connection.to)
          ? [start, { x: gutter, z: start.z }, { x: gutter, z: end.z }, end]
          : direct;
      } else if (stacked) {
        const gutter = b.z0 >= a.z1 ? (a.z1 + b.z0) / 2 : (b.z1 + a.z0) / 2;
        points = corridorFree('z', gutter, Math.min(start.x, end.x), Math.max(start.x, end.x), connection.from, connection.to)
          ? [start, { x: start.x, z: gutter }, { x: end.x, z: gutter }, end]
          : direct;
      } else {
        points = direct;
      }
    }
    points = points.filter((point, index) => index === 0 || point.x !== points[index - 1].x || point.z !== points[index - 1].z);
    const inside = (node, p) => p.x > node.x && p.x < node.x + node.w && p.z > node.z && p.z < node.z + node.d;
    while (points.length > 2 && inside(from, points[1])) points.splice(1, 1);
    while (points.length > 2 && inside(to, points.at(-2))) points.splice(-2, 1);
    if (points.length > 1) {
      points[0] = port(from, points[1]);
      points[points.length - 1] = port(to, points.at(-2));
    }
    return {
      from: connection.from,
      to: connection.to,
      label: connection.label || '',
      variant: variantCode(connection.variant),
      points,
    };
  }).filter(Boolean);



  const views = [{ id: 'all', label: 'Whole plate', nodes: null }];
  asArray(arch.meta && arch.meta.views).forEach((view) => {
    views.push({ id: view.id, label: view.label, nodes: asArray(view.focus).length ? asArray(view.focus) : null });
  });

  const flowIds = new Set();
  const flows = asArray(plate.flows).map((flow) => {
    if (flowIds.has(flow.id)) throw new Error('Duplicate flow id: ' + flow.id);
    flowIds.add(flow.id);
    return { id: flow.id, label: flow.label, steps: asArray(flow.steps).map((hop) => {
      const matches = routes.map((route, index) => ({ route, index })).filter(({ route, index }) =>
        route.from === hop.from && route.to === hop.to && (hop.connection === undefined || hop.connection === index));
      if (matches.length !== 1) throw new Error('Flow ' + flow.id + ': hop ' + hop.from + ' -> ' + hop.to + ' needs exactly one connection (found ' + matches.length + ')');
      return { from: hop.from, to: hop.to, route: matches[0].index, title: hop.title || matches[0].route.label, story: hop.story || '' };
    }) };
  });

  const stats = [
    nodes.length + ' components',
    zones.length + ' zones',
    routes.length + ' relationships',
    nodes.filter((node) => node.state === 'removed').length + ' removed',
  ];
  const introHtml = '<div class="k">Nothing selected</div><h2 class="pt">' + escape(plate.system || arch.meta.title || 'Atlas') +
    '</h2><p class="ps">' + stats.join(' \u00b7 ') + '</p>' +
    '<div class="k">Read it</div><p>' + escape(plate.datum || '') + '</p>';

  return {
    title: arch.meta.title || 'Atlas Plate',
    nodes,
    routes,
    zones,
    views,
    flows,
    introHtml,
    stats,
    keyRows: KEY_GLYPHS.map(([glyph, text]) => [glyph, text.replace('{metric}', plate.elevation_label || 'a stated metric')]),
    statsHtml: [
      { eyebrow: 'System', value: plate.system || arch.meta.title || 'Atlas', small: plate.revision || '' },
      { eyebrow: 'Components', value: String(nodes.length) },
      { eyebrow: 'Zones', value: String(zones.length) },
      { eyebrow: 'Relationships', value: String(routes.length) },
    ].map((stat) => '  <div class="stat"><span class="eyebrow">' + stat.eyebrow + '</span><span class="v">' + escape(stat.value) +
      (stat.small ? '<small>' + escape(stat.small) + '</small>' : '') + '</span></div>').join('\n'),
    plateHtml: '    <div class="plate"><b>' + escape(plate.system || arch.meta.title || 'ATLAS') + '</b>' + escape(plate.no || 'Plate 01') +
      '<div class="sub">' + stats.join(' &middot; ') + '<br>' + escape(plate.datum || '') + '</div></div>',
    keyHtml: '    <div class="key"><b>Key</b>' + KEY_GLYPHS.map(([glyph, text]) =>
      '      <div><svg viewBox="0 0 24 16">' + glyph + '</svg>' + escape(text.replace('{metric}', plate.elevation_label || 'a stated metric')) + '</div>').join('\n') + '</div>',
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
  inject('__ATLAS_TITLE__', escape(compiled.title));
  inject('<!--__ATLAS_STATS__-->', compiled.statsHtml);
  inject('<!--__ATLAS_PLATE__-->', compiled.plateHtml);
  inject('<!--__ATLAS_KEY__-->', compiled.keyHtml);
  inject('<!--__PRISM_SCRIPT__-->', '<script>window.ATLAS_SCENE=' + JSON.stringify(compiled).replace(/</g, '\\u003c') + ';' + String.fromCharCode(10) + runtime + '</' + 'script>');
  return { html, compiled };
}
