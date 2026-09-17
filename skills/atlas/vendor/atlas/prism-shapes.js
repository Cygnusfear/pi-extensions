/**
 * PRISM SHAPE VOCABULARY — one silhouette per schema component type.
 *
 * Pure geometry: no renderer, no THREE, no DOM, so the vocabulary can be unit tested and the
 * viewer stays a renderer. Outlines are emitted in world units, centred on the node, as a
 * CLOCKWISE loop when (u, v) is drawn with v up — the winding the prism pass needs for outward
 * faces. Heights and offsets are the caller's business.
 *
 * The authored footprint is always the outer bound: a silhouette may cut corners, never grow.
 */

const CORNER_RADIUS = 0.34;
const CORNER_STEPS = 6;
const CIRCLE_STEPS = 40;

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area;
}

export const SHAPE_TYPES = ['frontend', 'backend', 'database', 'messagebus', 'external'];

export function outlineFor(type, w, d) {
  const hw = w / 2, hd = d / 2, points = [];
  if (type === 'database') {
    for (let i = 0; i < CIRCLE_STEPS; i++) {
      const angle = (i / CIRCLE_STEPS) * Math.PI * 2;
      points.push([Math.cos(angle) * hw, Math.sin(angle) * hd]);
    }
  } else if (type === 'external') {
    points.push([-hw * 0.58, -hd], [hw * 0.58, -hd], [hw, 0], [hw * 0.58, hd], [-hw * 0.58, hd], [-hw, 0]);
  } else if (type === 'messagebus') {
    points.push([-hw, -hd * 0.62], [hw, -hd * 0.62], [hw, hd * 0.62], [-hw, hd * 0.62]);
  } else {
    const radius = Math.min(hw, hd) * CORNER_RADIUS;
    const corners = [
      [hw - radius, -hd + radius, -Math.PI / 2],
      [hw - radius, hd - radius, 0],
      [-hw + radius, hd - radius, Math.PI / 2],
      [-hw + radius, -hd + radius, Math.PI],
    ];
    for (const [cu, cv, start] of corners) {
      for (let s = 0; s <= CORNER_STEPS; s++) {
        const angle = start + (s / CORNER_STEPS) * (Math.PI / 2);
        points.push([cu + Math.cos(angle) * radius, cv + Math.sin(angle) * radius]);
      }
    }
  }
  return signedArea(points) > 0 ? points.reverse() : points;
}

/** Top-face marks, in world coordinates at the given elevation: the approved symbols only. */
export function marksFor(type, w, d, height) {
  const hw = w / 2, hd = d / 2, y = height + 0.02, out = [];
  const arc = (uRadius, vRadius, cu, cv, from, to) => {
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const angle = from + (i / 24) * (to - from);
      points.push([cu + Math.cos(angle) * uRadius, cv + Math.sin(angle) * vRadius]);
    }
    return points;
  };
  const at = points => points.map(([u, v]) => [u * hw, y, v * hd]);
  if (type === 'frontend') {
    out.push([[-0.82, 0.46], [0.82, 0.46]]);
    const dot = 0.018 * hd / hw;
    for (const cu of [-0.72, -0.58, -0.44]) out.push(arc(dot, 0.018, cu, 0.72, 0, Math.PI * 2));
    out.push([[-0.62, 0.11], [-0.28, -0.18], [-0.62, -0.46]]);
    out.push([[0.02, -0.46], [0.45, -0.46]]);
  } else if (type === 'backend') {
    out.push([[-0.35, 0.43], [-0.6, 0], [-0.35, -0.43]]);
    out.push([[0.35, 0.43], [0.6, 0], [0.35, -0.43]]);
  } else if (type === 'database') {
    out.push(arc(0.545, 0.194, 0, 0.333, 0, Math.PI * 2));
    out.push([[-0.545, 0.333], [-0.545, -0.333]]);
    out.push([[0.545, 0.333], [0.545, -0.333]]);
    out.push(arc(0.545, 0.194, 0, -0.333, Math.PI, Math.PI * 2));
  } else if (type === 'messagebus') {
    for (const cu of [-0.5, 0, 0.5]) out.push([[cu, -0.86], [cu, 0.86]]);
  } else if (type === 'external') {
    out.push([[-0.4, -0.3], [0.4, 0.3], [0.05, 0.3]]);
    out.push([[0.4, 0.3], [0.4, -0.05]]);
  }
  return out.map(at);
}

/** Ring heights of a store barrel, as fractions of its elevation. */
export const STORE_RINGS = [0.3, 0.6];

/** A silhouette vertex is a sharp corner when the turn exceeds this, and gets a vertical seam. */
export const SEAM_COSINE = Math.cos(0.44);
