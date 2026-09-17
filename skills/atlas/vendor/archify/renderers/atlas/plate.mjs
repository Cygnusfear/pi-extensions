/**
 * ATLAS PLATE COMPILER — the isometric register for architecture diagrams.
 *
 * Ours, not upstream. Invoked by renderers/architecture/render-architecture.mjs when a
 * spec asks for meta.visual_preset === "atlas", and the only place plate geometry is
 * computed.
 *
 * Rules this file obeys, because they are why a plate can be trusted:
 *
 * 1. Geometry is computed in plate space and projected ONCE. Nothing projects a
 *    finished SVG — that would discard the guarantees the validator proves.
 * 2. Text is never projected. Labels are drawn at projected anchors and stay
 *    screen-oriented, so they stay readable at any camera zoom.
 * 3. Draw order is painter order: zones, routes, prisms sorted by ground depth, then
 *    labels. Labels come last so no structure can occlude them.
 * 4. Label placement is solved, not guessed: candidates are swept along each route with
 *    lateral offsets and scored with the same rect-to-route metric the artifact gate
 *    measures, with a penalty for landing on a prism. Deterministic, so the plate is
 *    reproducible byte for byte.
 * 5. The emitted markup keeps upstream's contract: the same CSS class vocabulary
 *    (c-*, t-*, a-*), the same arrow markers, and the same data attributes
 *    (data-node-id, data-edge-from, data-edge-to) the viewer queries.
 *
 * Additive spec surface read here (all optional, all schema-validated):
 *   components[].footprint   [width, depth] on the ground plane, plate units
 *   components[].elevation   extrusion height; named by meta.plate.elevation_label
 *   components[].state       "active" (default) or "removed" (dashed ghost)
 *   components[].dossier     { does, built, facts: [[key, value], ...] }
 *   boundaries[].wraps       zone: the labelled ground rectangle around its members
 *   connections[].via        authored waypoints on the ground plane
 *   meta.plate               { system, datum, elevation_label, revision, no }
 */
import { esc, renderDefinitions, renderSemanticSigil, textUnits } from '../shared/utils.mjs';
import {
  animateAttr,
  focusEdgeAttrs,
  focusNodeAttrs,
  focusNodeTitle,
  svgAccessibleText,
  svgRootAttrs,
} from '../shared/cli.mjs';
import { arrowClassMap, componentFill, componentText, labelPoint, variantAccent } from '../shared/geometry.mjs';

/**
 * One projection authority. A plate is delivered inside archify document flow, where the
 * viewer renders the SVG at the reader width. A small viewBox therefore gets magnified,
 * which magnifies label type with it. So the plate is authored on a fixed canvas
 * (1360x720 by default, or meta.viewBox) and the geometry is scaled to fill it in a
 * measure pass, keeping label type at roughly its authored size on screen.
 */
const PROJECTION = { w: 30, h: 15, z: 14 };
const ISO_RATIO = { h: 0.5, z: 0.4667 };
const setProjection = (w) => {
  PROJECTION.w = w;
  PROJECTION.h = w * ISO_RATIO.h;
  PROJECTION.z = w * ISO_RATIO.z;
};
/** Default plate canvas: the aspect a delivered page can actually afford. */
/**
 * Default plate canvas. The width is a delivery constraint, not a taste: the artifact
 * checker models a 1440px viewport with a 930px reader column, so a canvas much wider
 * than that scales authored type below the 6px readability floor.
 */
const DEFAULT_CANVAS = [1240, 660];
const DEFAULT_FOOTPRINT = [2.4, 1.6];
const DEFAULT_ELEVATION = 0.8;
const CELL = [4, 3];
const PAD = 36;
const LABEL_HEIGHT = 14;
const HEAD_TRIM = 26;
const TAIL_TRIM = 16;
/** Minimum clearance the solver aims for, in projected pixels. The gate asks for 4. */
const CLEARANCE_TARGET = 8;
/** Reserved empty band at the top of the canvas for the plate title strip. */
const TITLE_BAND = 46;

const toNumber = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const asArray = (value) => (Array.isArray(value) ? value : []);
const iso = (x, y, z = 0) => [(x - y) * PROJECTION.w, (x + y) * PROJECTION.h - z * PROJECTION.z];
const round = (value) => Math.round(value * 100) / 100;
const pointsAttr = (points) => points.map(([x, y]) => round(x) + ',' + round(y)).join(' ');
const polylinePath = (points) => points.map(([x, y], index) => (index === 0 ? 'M' : 'L') + round(x) + ' ' + round(y)).join(' ');

/** Plate-space placement: explicit pos wins, then col/row cells, then declaration order. */
function groundPlacement(component, index, plate) {
  const footprint = asArray(component.footprint);
  const width = toNumber(footprint[0], DEFAULT_FOOTPRINT[0]);
  const depth = toNumber(footprint[1], DEFAULT_FOOTPRINT[1]);
  const pos = asArray(component.pos);
  let gx = toNumber(pos[0], NaN);
  let gy = toNumber(pos[1], NaN);
  if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
    const col = Number.isInteger(component.col) ? component.col : index % plate.cols;
    const row = Number.isInteger(component.row) ? component.row : Math.floor(index / plate.cols);
    gx = col * CELL[0];
    gy = row * CELL[1];
  }
  return { gx, gy, w: width, d: depth, h: Math.max(0, toNumber(component.elevation, DEFAULT_ELEVATION)) };
}

/** Ground footprint corners and the same footprint lifted to the top face. */
function prism(unit) {
  const { gx, gy, w, d, h } = unit;
  return {
    ground: [iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)],
    top: [iso(gx, gy, h), iso(gx + w, gy, h), iso(gx + w, gy + d, h), iso(gx, gy + d, h)],
  };
}

/** Bounding box over points. Fails loudly rather than emitting a NaN viewBox. */
function boundingBox(points) {
  const finite = points.filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
  if (finite.length === 0) throw new Error('atlas plate: no finite geometry to lay out');
  const xs = finite.map((point) => point[0]);
  const ys = finite.map((point) => point[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function hatchPatterns(types) {
  return [
    '      <defs>',
    ...types.map((type, index) =>
      '        <pattern id="atlas-hatch-' + index + '" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="4.6" stroke="var(--' + (type || 'external') + '-stroke)" stroke-width="0.8" stroke-opacity="0.55"/>' +
      '</pattern>'),
    '      </defs>',
  ].join('\n');
}

/** Ground grid: one hairline per plate unit, heavier every fifth. */
function groundGrid(bounds) {
  const lines = [];
  const x0 = Math.floor(bounds.minX / PROJECTION.w) - 1;
  const x1 = Math.ceil(bounds.maxX / PROJECTION.w) + 1;
  const y0 = Math.floor(bounds.minY / PROJECTION.h) - 1;
  const y1 = Math.ceil(bounds.maxY / PROJECTION.h) + 1;
  for (let i = x0; i <= x1; i += 1) {
    const major = i % 5 === 0;
    lines.push('        <line x1="' + round(i * PROJECTION.w) + '" y1="' + round(y0 * PROJECTION.h) + '" x2="' + round(i * PROJECTION.w) + '" y2="' + round(y1 * PROJECTION.h) + '" class="c-grid" stroke-opacity="' + (major ? '0.9' : '0.4') + '"/>');
  }
  for (let i = y0; i <= y1; i += 1) {
    const major = i % 5 === 0;
    lines.push('        <line x1="' + round(x0 * PROJECTION.w) + '" y1="' + round(i * PROJECTION.h) + '" x2="' + round(x1 * PROJECTION.w) + '" y2="' + round(i * PROJECTION.h) + '" class="c-grid" stroke-opacity="' + (major ? '0.9' : '0.4') + '"/>');
  }
  return lines.join('\n');
}

function zoneRectangle(boundary, units) {
  const members = asArray(boundary.wraps).map((id) => units.get(id)).filter(Boolean);
  if (members.length === 0) return null;
  const pad = toNumber(boundary.pad, 1);
  const minX = Math.min(...members.map((unit) => unit.gx)) - pad;
  const minY = Math.min(...members.map((unit) => unit.gy)) - pad;
  const maxX = Math.max(...members.map((unit) => unit.gx + unit.w)) + pad;
  const maxY = Math.max(...members.map((unit) => unit.gy + unit.d)) + pad;
  return {
    corners: [iso(minX, minY), iso(maxX, minY), iso(maxX, maxY), iso(minX, maxY)],
    label: boundary.label,
    kind: boundary.kind || 'region',
  };
}

/** Route on the ground plane, then projected. Authored waypoints win; else one elbow. */
function routePoints(connection, units) {
  const from = units.get(connection.from);
  const to = units.get(connection.to);
  if (!from || !to) return null;
  const start = [from.gx + from.w / 2, from.gy + from.d / 2];
  const end = [to.gx + to.w / 2, to.gy + to.d / 2];
  const via = asArray(connection.via).filter((point) => asArray(point).length === 2);
  const ground = via.length > 0
    ? [start, ...via.map((point) => [toNumber(point[0], start[0]), toNumber(point[1], start[1])]), end]
    : [start, [end[0], start[1]], end];
  return ground.map(([x, y]) => iso(x, y));
}

/** Trim a polyline at both ends so arrowheads and prisms do not collide. */
function trimPolyline(points, headTrim, tailTrim) {
  const out = points.map((point) => [...point]);
  const shrink = (list, amount, fromEnd) => {
    let remaining = amount;
    while (remaining > 0 && list.length > 1) {
      const a = fromEnd ? list[list.length - 2] : list[0];
      const b = fromEnd ? list[list.length - 1] : list[1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy) || 1;
      if (length <= remaining) {
        remaining -= length;
        if (fromEnd) list.pop();
        else list.shift();
      } else {
        const point = [a[0] + (dx / length) * remaining, a[1] + (dy / length) * remaining];
        if (fromEnd) list[list.length - 1] = point;
        else list[0] = point;
        remaining = 0;
      }
    }
  };
  shrink(out, tailTrim, false);
  shrink(out, headTrim, true);
  return out;
}

function pointToSegmentDistance(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared));
  return Math.hypot(point[0] - (a[0] + t * dx), point[1] - (a[1] + t * dy));
}

function pointToRectDistance(point, rect) {
  const dx = Math.max(rect.x - point[0], 0, point[0] - (rect.x + rect.width));
  const dy = Math.max(rect.y - point[1], 0, point[1] - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

function segmentsCross(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Distance from a label rect to a route; zero when the route crosses the rect. */
function rectToRouteDistance(rect, points) {
  const corners = [[rect.x, rect.y], [rect.x + rect.width, rect.y], [rect.x + rect.width, rect.y + rect.height], [rect.x, rect.y + rect.height]];
  let best = Infinity;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    for (let corner = 0; corner < 4; corner += 1) {
      if (segmentsCross(a, b, corners[corner], corners[(corner + 1) % 4])) return 0;
    }
    best = Math.min(best, pointToRectDistance(a, rect), pointToRectDistance(b, rect));
    for (const corner of corners) best = Math.min(best, pointToSegmentDistance(corner, a, b));
  }
  return best;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function polylineLengths(points) {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
  }
  return cumulative;
}

function polylineAt(points, fraction) {
  const cumulative = polylineLengths(points);
  const total = cumulative[cumulative.length - 1] || 1;
  const target = Math.max(0, Math.min(1, fraction)) * total;
  for (let index = 1; index < points.length; index += 1) {
    if (target <= cumulative[index]) {
      const span = cumulative[index] - cumulative[index - 1] || 1;
      const t = (target - cumulative[index - 1]) / span;
      const a = points[index - 1];
      const b = points[index];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return {
        point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        tangent: [(b[0] - a[0]) / length, (b[1] - a[1]) / length],
      };
    }
  }
  const last = points[points.length - 1];
  return { point: [...last], tangent: [1, 0] };
}

/**
 * Label placement is the plate's own responsibility. Candidates sweep along the route
 * at several fractions with lateral offsets on both sides; each candidate is scored by
 * its worst clearance to every OTHER route (the metric the gate measures) minus a
 * penalty for landing over a prism, which would hide the text behind a structure.
 */
const LABEL_FRACTIONS = Array.from({ length: 19 }, (_, index) => 0.05 + index * 0.05);
const LABEL_OFFSETS = [[0, 0], [0, 10], [0, -10], [0, 16], [0, -16], [0, 22], [0, -22], [0, 30], [0, -30], [0, 40], [0, -40], [14, 0], [-14, 0], [24, 0], [-24, 0]];
/** Cost of landing a label over a prism. Soft, so route clearance still decides. */
const PRISM_HIDDEN_PENALTY = 8;

function solveLabelAnchor(connection, ownIndex, routes, points, prisms) {
  const width = Math.max(30, textUnits(connection.label) * 4.8 + 10);
  const others = routes.filter((route, index) => route && index !== ownIndex);
  const fallback = labelPoint(connection, points);
  if (others.length === 0) return fallback;
  let best = null;
  for (const fraction of LABEL_FRACTIONS) {
    const { point, tangent } = polylineAt(points, fraction);
    const normal = [-tangent[1], tangent[0]];
    for (const [along, lateral] of LABEL_OFFSETS) {
      const anchor = [
        point[0] + tangent[0] * along + normal[0] * lateral,
        point[1] + tangent[1] * along + normal[1] * lateral,
      ];
      const rect = { x: anchor[0] - width / 2, y: anchor[1] - 10, width, height: LABEL_HEIGHT };
      let clearance = Infinity;
      for (const route of others) clearance = Math.min(clearance, rectToRouteDistance(rect, route));
      let hidden = false;
      for (const prismRect of prisms) {
        if (rectsOverlap(rect, prismRect)) { hidden = true; break; }
      }
      const score = (hidden ? clearance - PRISM_HIDDEN_PENALTY : clearance) * 1000 + lateral;
      if (best === null || score > best.score) best = { score, anchor };
      if (!hidden && clearance >= CLEARANCE_TARGET) return anchor;
    }
  }
  return best.anchor;
}

function renderZone(zone, index, offset) {
  const shift = (point) => [point[0] + offset.x, point[1] + offset.y];
  const corners = zone.corners.map(shift);
  const [anchor] = corners;
  const label = zone.label
    ? [
      '        <g data-graph-role="structural-frame-label" data-composition-frame-id="' + index + '" data-composition-frame-kind="' + esc(zone.kind) + '" data-composition-frame-label="' + esc(zone.label) + '">',
      '          <rect data-graph-role="structural-frame-label-mask" x="' + round(anchor[0] + 6) + '" y="' + round(anchor[1] - 15) + '" width="' + round(textUnits(zone.label) * 5.2 + 12) + '" height="15" class="c-mask"/>',
      '          <text data-boundary-label="" x="' + round(anchor[0] + 12) + '" y="' + round(anchor[1] - 3) + '" class="t-cloud" font-size="9" font-weight="600">' + esc(zone.label) + '</text>',
      '        </g>',
    ].join('\n')
    : '';
  return [
    '        <polygon data-graph-role="structural-frame" data-composition-frame-kind="' + esc(zone.kind) + '" data-composition-frame-id="' + index + '" points="' + pointsAttr(corners) + '" class="c-region" stroke-width="1"/>',
    label,
  ].join('\n');
}

function renderRoute(connection, index, shifted, meta) {
  const [cls, marker] = arrowClassMap[connection.variant || 'default'] || arrowClassMap.default;
  const strokeWidth = connection.width || (connection.variant === 'emphasis' ? 1.8 : 1.3);
  return '        <path ' + focusEdgeAttrs(connection.from, connection.to, connection.label, index, connection.id) +
    ' d="' + polylinePath(shifted) + '" class="' + cls + '"' + animateAttr(meta, 'edge', index) +
    ' stroke-width="' + strokeWidth + '" marker-end="url(#' + marker + ')"/>';
}

function renderRouteLabel(connection, index, anchor, shifted) {
  if (!connection.label) return '';
  const [lx, ly] = anchor;
  const width = Math.max(30, textUnits(connection.label) * 4.8 + 10);
  const attrs = focusEdgeAttrs(connection.from, connection.to, connection.label, index, connection.id);
  return [
    '        <g data-detail="context" ' + attrs + '>',
    '          <rect x="' + round(lx - width / 2) + '" y="' + round(ly - 10) + '" width="' + round(width) + '" height="' + LABEL_HEIGHT + '" rx="2" class="c-mask"/>',
    '          <text x="' + round(lx) + '" y="' + round(ly) + '" class="' + variantAccent(connection.variant) + '" font-size="8.5" text-anchor="middle">' + esc(connection.label) + '</text>',
    '        </g>',
  ].join('\n');
}

function renderPrism(component, unit, hatchId, offset, meta) {
  const { ground, top } = prism(unit);
  const shift = (point) => round(point[0] + offset.x) + ',' + round(point[1] + offset.y);
  const type = component.type || 'external';
  const fill = componentFill[type] || 'c-external';
  const accent = componentText[type] || 't-muted';
  const removed = component.state === 'removed';
  const [a, b, c, d] = ground;
  const [a0, b0, c0, d0] = top;
  const cx = (a0[0] + c0[0]) / 2 + offset.x;
  const labelY = (a0[1] + c0[1]) / 2 + offset.y;
  const hasSub = component.sublabel != null && component.sublabel !== '';
  const dashed = removed ? ' stroke-dasharray="3 2"' : '';
  const stroke = 'var(--' + type + '-stroke)';
  const faces = [
    '          <polygon points="' + [a, b, c, d].map(shift).join(' ') + '" fill="url(#' + hatchId + ')" fill-opacity="0.10" stroke="' + stroke + '" stroke-width="1"' + dashed + '/>',
    '          <polygon points="' + [d, c, c0, d0].map(shift).join(' ') + '" fill="url(#' + hatchId + ')" fill-opacity="0.22" stroke="' + stroke + '" stroke-width="1"' + dashed + '/>',
    '          <polygon points="' + [b, c, c0, b0].map(shift).join(' ') + '" fill="url(#' + hatchId + ')" fill-opacity="0.34" stroke="' + stroke + '" stroke-width="1"' + dashed + '/>',
    '          <polygon points="' + [a0, b0, c0, d0].map(shift).join(' ') + '" class="' + fill + '" fill-opacity="' + (removed ? '0.35' : '1') + '" stroke="' + stroke + '" stroke-width="' + (removed ? '1' : '1.4') + '"' + dashed + '/>',
  ];
  const text = [
    '          <text data-node-label="" x="' + round(cx) + '" y="' + round(labelY + (hasSub ? -1 : 3)) + '" class="t-primary" font-size="11" font-weight="600" text-anchor="middle"' + (removed ? ' opacity="0.75"' : '') + '>' + esc(component.label) + '</text>',
    hasSub ? '          <text data-detail="context" x="' + round(cx) + '" y="' + round(labelY + 12) + '" class="t-muted" font-size="8.5" text-anchor="middle">' + esc(component.sublabel) + '</text>' : '',
    component.tag ? '          <text data-detail="fine" x="' + round(cx) + '" y="' + round(labelY + 24) + '" class="' + accent + '" font-size="8" text-anchor="middle">' + esc(component.tag) + '</text>' : '',
  ].filter(Boolean).join('\n');
  const sigil = renderSemanticSigil(type, { x: a0[0] + offset.x + 6, y: a0[1] + offset.y + 7 });
  const passport = { kind: type, sublabel: component.sublabel, tag: component.tag, context: removed ? 'removed' : 'active' };
  return [
    '        <g ' + focusNodeAttrs(component.id, component.label, passport, meta.locale) + '>',
    focusNodeTitle(component.label, passport),
    faces.join('\n'),
    sigil,
    text,
    '        </g>',
  ].filter(Boolean).join('\n');
}

/** Bounding box of a prism's silhouette, used to keep labels off structures. */
function prismRect(unit, offset) {
  const { ground, top } = prism(unit);
  const all = [...ground, ...top].map((point) => [point[0] + offset.x, point[1] + offset.y]);
  const xs = all.map((point) => point[0]);
  const ys = all.map((point) => point[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function renderPlateMeta(plate) {
  const lines = [plate.system, plate.datum, plate.revision, plate.no].filter((line) => typeof line === 'string' && line.length > 0);
  if (lines.length === 0) return '';
  const x = PAD - 22;
  const y = 14;
  const widest = Math.max(...lines.map((line) => textUnits(line) * 5.4));
  return [
    '      <g data-detail="context" data-atlas-title="">',
    '        <rect x="' + round(x) + '" y="' + round(y) + '" width="' + round(widest + 26) + '" height="' + (16 + lines.length * 13) + '" class="c-mask" stroke="var(--panel-border)" stroke-width="1"/>',
    ...lines.map((line, index) => '<text x="' + round(x + 13) + '" y="' + round(y + 19 + index * 13) + '" class="' + (index === 0 ? 't-primary' : 't-muted') + '" font-size="' + (index === 0 ? '10' : '8.5') + '"' + (index === 0 ? ' font-weight="600" letter-spacing="0.1em"' : '') + '>' + esc(line) + '</text>'),
    '      </g>',
  ].join('\n');
}

/** Compile an architecture spec into a plate SVG. */
export function renderPlate(arch) {
  const components = asArray(arch.components);
  const plate = arch.meta?.plate || {};
  const types = [...new Set(components.map((component) => component.type).filter(Boolean))];
  const hatchFor = new Map(types.map((type, index) => [type, 'atlas-hatch-' + index]));

  const units = new Map();
  components.forEach((component, index) => {
    units.set(component.id, groundPlacement(component, index, { cols: arch.layout?.cols || 4 }));
  });

  // Measure pass at unit projection, then scale. One projection authority, two passes:
  // the second pass is the one the plate is actually drawn with.
  setProjection(1);
  const unitZones = asArray(arch.boundaries).map((boundary) => zoneRectangle(boundary, units)).filter(Boolean);
  const unitBounds = boundingBox([
    ...[...units.values()].flatMap((unit) => [...prism(unit).ground, ...prism(unit).top]),
    ...unitZones.map((zone) => zone.corners),
  ]);
  const canvas = Array.isArray(arch.meta?.viewBox) && arch.meta.viewBox.length === 2 ? arch.meta.viewBox : DEFAULT_CANVAS;
  const usableWidth = Math.max(200, canvas[0] - PAD * 2);
  const usableHeight = Math.max(120, canvas[1] - PAD * 2 - TITLE_BAND);
  const naturalWidth = Math.max(1, unitBounds.maxX - unitBounds.minX);
  const naturalHeight = Math.max(1, unitBounds.maxY - unitBounds.minY);
  setProjection(Math.min(usableWidth / naturalWidth, usableHeight / naturalHeight));

  const zones = asArray(arch.boundaries).map((boundary) => zoneRectangle(boundary, units)).filter(Boolean);
  const bounds = boundingBox([
    ...[...units.values()].flatMap((unit) => [...prism(unit).ground, ...prism(unit).top]),
    ...zones.map((zone) => zone.corners),
  ]);
  const offset = {
    x: PAD + (usableWidth - (bounds.maxX - bounds.minX)) / 2 - bounds.minX,
    y: PAD + TITLE_BAND + (usableHeight - (bounds.maxY - bounds.minY)) / 2 - bounds.minY,
  };
  // The plate frame is one margin plus a reserved title band. The band is not decoration:
  // the artifact gate rejects any annotation rect that a route crosses, so the title strip
  // needs guaranteed empty space, and the key lives in the viewer legend where it costs no
  // canvas height at all.
  const width = Math.round(canvas[0]);
  const height = Math.round(canvas[1]);

  const projectedRoutes = asArray(arch.connections).map((connection) => {
    const ground = routePoints(connection, units);
    if (!ground) return null;
    return trimPolyline(ground, HEAD_TRIM, TAIL_TRIM).map(([x, y]) => [x + offset.x, y + offset.y]);
  });
  const prismRects = [...units.values()].map((unit) => prismRect(unit, offset));
  const painterOrder = components
    .map((component) => ({ component, unit: units.get(component.id) }))
    .sort((left, right) => (left.unit.gx + left.unit.gy) - (right.unit.gx + right.unit.gy));

  const labelAnchors = asArray(arch.connections).map((connection, index) =>
    (connection.label && projectedRoutes[index]
      ? solveLabelAnchor(connection, index, projectedRoutes, projectedRoutes[index], prismRects)
      : null));

  return [
    '      <svg viewBox="0 0 ' + width + ' ' + height + '" ' + svgRootAttrs(arch.meta) + '>',
    svgAccessibleText(arch.meta, 'architecture'),
    renderDefinitions(),
    hatchPatterns(types),
    '        <rect width="100%" height="100%" class="c-mask"/>',
    '        <g data-graph-role="plate-ground">',
    groundGrid({ minX: bounds.minX + offset.x, maxX: bounds.maxX + offset.x, minY: bounds.minY + offset.y, maxY: bounds.maxY + offset.y }),
    '        </g>',
    '        <g data-graph-role="plate-zones">',
    zones.map((zone, index) => renderZone(zone, index, offset)).join('\n'),
    '        </g>',
    '        <g data-graph-role="plate-routes">',
    asArray(arch.connections).map((connection, index) => (projectedRoutes[index] ? renderRoute(connection, index, projectedRoutes[index], arch.meta) : '')).filter(Boolean).join('\n'),
    '        </g>',
    '        <g data-graph-role="plate-structures">',
    painterOrder.map(({ component, unit }) => renderPrism(component, unit, hatchFor.get(component.type) || 'atlas-hatch-0', offset, arch.meta)).join('\n'),
    '        </g>',
    '        <g data-graph-role="plate-labels">',
    asArray(arch.connections).map((connection, index) => (connection.label && projectedRoutes[index] ? renderRouteLabel(connection, index, labelAnchors[index], projectedRoutes[index]) : '')).filter(Boolean).join('\n'),
    '        </g>',
    '        <!-- Legend -->',
    '        <g data-graph-role="plate-annotations">',
    renderPlateMeta(plate),
    '        </g>',
    '      </svg>',
  ].filter((part) => part !== '').join('\n');
}
