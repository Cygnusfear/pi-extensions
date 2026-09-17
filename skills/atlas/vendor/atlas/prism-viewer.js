/**
 * PRISM VIEWER — the interactive 3D register.
 *
 * Three.js draws the scene; every label is DOM, positioned by CSS2D, so type stays crisp,
 * selectable and crisp-typed at any zoom. Nothing here is lit: the look is entirely authored
 * in shaders, which is what makes a blueprint plate possible — crisp ink edges from screen
 * derivatives, a hatched relief on the sides, paper on the tops, and a ground grid that fades
 * with depth.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

const SCENE = window.ATLAS_SCENE;
if (!SCENE) throw new Error('atlas scene data missing');

const THEMES = {
  dark: { paper: 0x0d3b6d, paperDeep: 0x08294d, ink: 0xeef6ff, grid: 0x9fc4ee, gridMajor: 0xd8ecff, accent: 0x7ff0ff, warm: 0xffb15e, muted: 0x9fc0e8 },
  light: { paper: 0xf3f7fc, paperDeep: 0xe7eef8, ink: 0x0c3a6b, grid: 0x9ab6d8, gridMajor: 0x6c92bf, accent: 0x0a84ff, warm: 0xc26a00, muted: 0x5b7ba6 },
};
const TYPE_ORDER = ['frontend', 'backend', 'database', 'cloud', 'security', 'messagebus', 'external'];
const TYPE_TINT = {
  dark: { frontend: 0x8fb4ff, backend: 0x8fd8c4, database: 0xb9a8ff, cloud: 0xffd08f, security: 0xff9ab0, messagebus: 0xffb98f, external: 0xc9d8ea },
  light: { frontend: 0x2f5fd0, backend: 0x1f8a6d, database: 0x6a4fd0, cloud: 0xb06a00, security: 0xc03a5a, messagebus: 0xc26000, external: 0x5b7ba6 },
};

const state = {
  theme: 'dark',
  selected: null,
  view: 'all',
  running: false,
};

const stage = document.querySelector('.stage') || document.getElementById('stage');
if (!stage) throw new Error('prism viewer: no stage element');
const canvas = document.getElementById('gl');
const labelHost = document.getElementById('labels');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const labelRenderer = new CSS2DRenderer({ element: labelHost });
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -1000, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.7;
controls.minZoom = 0.25;
controls.maxZoom = 8;
controls.screenSpacePanning = false;

const gridMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    uPaper: { value: new THREE.Color(THEMES.dark.paper) },
    uDeep: { value: new THREE.Color(THEMES.dark.paperDeep) },
    uGrid: { value: new THREE.Color(THEMES.dark.grid) },
    uMajor: { value: new THREE.Color(THEMES.dark.gridMajor) },
    uFade: { value: 900.0 },
  },
  vertexShader: [
    'varying vec2 vXZ;',
    'varying float vDepth;',
    'void main() {',
    '  vXZ = position.xz;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vDepth = -mv.z;',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n'),
  fragmentShader: [
    'uniform vec3 uPaper; uniform vec3 uDeep; uniform vec3 uGrid; uniform vec3 uMajor; uniform float uFade;',
    'varying vec2 vXZ; varying float vDepth;',
    'float lineMask(float coord, float width) {',
    '  float d = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);',
    '  return 1.0 - smoothstep(0.0, width, d);',
    '}',
    'void main() {',
    '  float minor = max(lineMask(vXZ.x, 1.0), lineMask(vXZ.y, 1.0));',
    '  float major = max(lineMask(vXZ.x / 5.0, 1.2), lineMask(vXZ.y / 5.0, 1.2));',
    '  vec3 color = mix(uPaper, uDeep, clamp(vDepth / uFade, 0.0, 1.0));',
    '  color = mix(color, uGrid, minor * 0.35);',
    '  color = mix(color, uMajor, major * 0.55);',
    '  float fade = 1.0 - smoothstep(uFade * 0.35, uFade, vDepth);',
    '  gl_FragColor = vec4(color, 0.25 + 0.75 * fade);',
    '}',
  ].join('\n'),
});

const groundSize = 4200;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize, 1, 1), gridMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
scene.add(ground);

/** ---------------------------------------------------------------- prisms */
const prismMaterial = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uPaper: { value: new THREE.Color(THEMES.dark.paper) },
    uInk: { value: new THREE.Color(THEMES.dark.ink) },
    uMuted: { value: new THREE.Color(THEMES.dark.muted) },
    uAccent: { value: new THREE.Color(THEMES.dark.accent) },
    uTint: { value: TYPE_ORDER.map((type) => new THREE.Color(THEMES.dark[type] ? THEMES.dark[type] : THEMES.dark.muted)) },
    uTints: { value: TYPE_ORDER.map((type) => new THREE.Color(TYPE_TINT.dark[type] || 0xffffff)) },
    uStripe: { value: 3.4 },
    uFade: { value: 900.0 },
    uSelected: { value: -1.0 },
  },
  vertexShader: [
    'attribute vec2 aUv; attribute float aFace; attribute float aType; attribute float aFlags; attribute float aIndex;',
    'varying vec2 vUv; varying float vFace; varying float vType; varying float vFlags; varying float vIndex; varying float vDepth;',
    'void main() {',
    '  vUv = aUv; vFace = aFace; vType = aType; vFlags = aFlags; vIndex = aIndex;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vDepth = -mv.z;',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n'),
  fragmentShader: [
    'uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uMuted; uniform vec3 uAccent;',
    'uniform vec3 uTint[7]; uniform vec3 uTints[7]; uniform float uStripe; uniform float uFade; uniform float uSelected;',
    'varying vec2 vUv; varying float vFace; varying float vType; varying float vFlags; varying float vIndex; varying float vDepth;',
    'float edge(vec2 uv, vec2 scale) {',
    '  vec2 d = min(uv, 1.0 - uv) * scale;',
    '  vec2 w = fwidth(uv) * scale;',
    '  vec2 m = smoothstep(vec2(0.0), 1.4 * w, d);',
    '  return 1.0 - min(m.x, m.y);',
    '}',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }',
    'void main() {',
    '  int typeIndex = int(clamp(vType, 0.0, 6.0));',
    '  vec3 tint = uTints[typeIndex];',
    '  vec3 ink = mix(uInk, tint, 0.45);',
    '  bool removed = mod(vFlags, 2.0) >= 1.0;',
    '  float dashCut = removed ? step(0.55, fract(vUv.x * 0.45)) : 1.0;',
    '  vec3 color = uPaper;',
    '  float alpha = 1.0;',
    '  if (vFace > 0.5) {',
    '    float stripe = abs(fract((vUv.x * uStripe + vUv.y * uStripe) * 0.5) - 0.5) * 2.0;',
    '    float hatching = 1.0 - smoothstep(0.0, 1.6 * fwidth(stripe), stripe);',
    '    color = mix(uPaper, ink, 0.18 + 0.55 * hatching * (removed ? 0.5 : 1.0) * dashCut);',
    '    color = mix(color, ink, 0.22 * smoothstep(1.0, 0.0, vUv.y));',
    '    float border = edge(vUv, vec2(1.0, 1.0));',
    '    color = mix(color, ink, border * (removed ? 0.75 : 1.0) * dashCut);',
    '  } else {',
    '    float tintFill = 0.3;',
    '    color = mix(uPaper, tint, tintFill);',
    '    float micro = 1.0 - smoothstep(0.0, 1.4 * fwidth(vUv.y * 40.0), abs(fract(vUv.y * 40.0) - 0.5) * 2.0);',
    '    color = mix(color, ink, micro * 0.06);',
    '    color = mix(color, ink, edge(vUv, vec2(1.0, 1.0)) * 0.9);',
    '  }',
    '  float selected = step(abs(vIndex - uSelected), 0.5);',
    '  color = mix(color, uAccent, selected * 0.28);',
    '  color = mix(color, uPaper, clamp(vDepth / uFade, 0.0, 0.35));',
    '  color += (hash(vUv * 380.0) - 0.5) * 0.012;',
    '  gl_FragColor = vec4(color, alpha);',
    '}',
  ].join('\n'),
});

const ribbonMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: {
    uInk: { value: new THREE.Color(THEMES.dark.ink) },
    uMuted: { value: new THREE.Color(THEMES.dark.muted) },
    uAccent: { value: new THREE.Color(THEMES.dark.accent) },
    uWarm: { value: new THREE.Color(THEMES.dark.warm) },
    uPaper: { value: new THREE.Color(THEMES.dark.paper) },
    uFade: { value: 900.0 },
    uWidth: { value: 1.0 },
  },
  vertexShader: [
    'attribute float aDist; attribute float aSide; attribute float aVariant; attribute float aEnd;',
    'varying float vDist; varying float vSide; varying float vVariant; varying float vEnd; varying float vDepth;',
    'void main() {',
    '  vDist = aDist; vSide = aSide; vVariant = aVariant; vEnd = aEnd;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vDepth = -mv.z;',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n'),
  fragmentShader: [
    'uniform vec3 uInk; uniform vec3 uMuted; uniform vec3 uAccent; uniform vec3 uWarm; uniform vec3 uPaper; uniform float uFade; uniform float uWidth;',
    'varying float vDist; varying float vSide; varying float vVariant; varying float vEnd; varying float vDepth;',
    'void main() {',
    '  vec3 color = uInk;',
    '  if (vVariant > 1.5) color = uAccent;',
    '  else if (vVariant > 0.5) color = uMuted;',
    '  float across = abs(vSide);',
    '  float core = 1.0 - smoothstep(0.35, 1.0, across);',
    '  float solid = 1.0;',
    '  if (vEnd > 0.5 && vVariant > 0.5) solid = step(0.45, fract(vDist * 0.09));',
    '  float alpha = core * solid;',
    '  vec3 outColor = mix(uPaper, color, 1.0);',
    '  outColor = mix(outColor, uPaper, clamp(vDepth / uFade, 0.0, 0.8));',
    '  if (alpha < 0.02) discard;',
    '  gl_FragColor = vec4(outColor, alpha);',
    '}',
  ].join('\n'),
});

const zoneMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: {
    uInk: { value: new THREE.Color(THEMES.dark.muted) },
    uPaper: { value: new THREE.Color(THEMES.dark.paper) },
    uFade: { value: 900.0 },
  },
  vertexShader: ribbonMaterial.vertexShader,
  fragmentShader: [
    'uniform vec3 uInk; uniform vec3 uPaper; uniform float uFade;',
    'varying float vDist; varying float vSide; varying float vVariant; varying float vEnd; varying float vDepth;',
    'void main() {',
    '  float across = abs(vSide);',
    '  float core = 1.0 - smoothstep(0.25, 1.0, across);',
    '  float dash = step(0.35, fract(vDist * 0.05));',
    '  float alpha = core * dash * 0.85;',
    '  if (alpha < 0.02) discard;',
    '  vec3 color = mix(uPaper, uInk, 0.85);',
    '  gl_FragColor = vec4(color, alpha);',
    '}',
  ].join('\n'),
});

/** A ribbon strip along a polyline on the ground plane, with the attributes the shaders want. */
function ribbonGeometry(points, { width, variant, closed, lift }) {
  const positions = [];
  const uvs = [];
  const dists = [];
  const sides = [];
  const variants = [];
  const ends = [];
  const list = closed ? [...points, points[0]] : points;
  let travelled = 0;
  for (let index = 0; index < list.length - 1; index += 1) {
    const a = list[index];
    const b = list[index + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz) || 1;
    const nx = -dz / length;
    const nz = dx / length;
    const quad = [
      [a.x + nx * width / 2, a.z + nz * width / 2, a.x - nx * width / 2, a.z - nz * width / 2],
      [b.x + nx * width / 2, b.z + nz * width / 2, b.x - nx * width / 2, b.z - nz * width / 2],
    ];
    const ys = list.map((point) => (point.y === undefined ? lift : point.y));
    const ya = ys[index];
    const yb = ys[index + 1];
    const corners = [
      [quad[0][0], ya, quad[0][1], 0, -1],
      [quad[0][2], ya, quad[0][3], travelled, 1],
      [quad[1][0], yb, quad[1][1], 0, -1],
      [quad[1][2], yb, quad[1][3], travelled + length, 1],
    ];
    const order = [0, 1, 2, 2, 1, 3];
    for (const corner of order) {
      const [x, y, z, distance, side] = corners[corner];
      positions.push(x, y, z);
      uvs.push(distance, side);
      dists.push(distance);
      sides.push(side);
      variants.push(variant);
      ends.push(index === 0 || index === list.length - 2 ? 1 : 0);
    }
    travelled += length;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aDist', new THREE.Float32BufferAttribute(dists, 1));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  geometry.setAttribute('aVariant', new THREE.Float32BufferAttribute(variants, 1));
  geometry.setAttribute('aEnd', new THREE.Float32BufferAttribute(ends, 1));
  return geometry;
}

/** Extruded footprints, merged into one geometry: top face plus four sides. */
function buildPrisms(nodes) {
  const positions = [];
  const uvs = [];
  const faces = [];
  const types = [];
  const flags = [];
  const indexes = [];
  const pickMeshes = [];
  const bounds = new THREE.Box3();
  const typeIndex = (type) => Math.max(0, TYPE_ORDER.indexOf(type));

  nodes.forEach((node, index) => {
    const x0 = node.x;
    const z0 = node.z;
    const x1 = node.x + node.w;
    const z1 = node.z + node.d;
    const h = Math.max(0.15, node.h);
    const tint = typeIndex(node.type);
    const removed = node.state === 'removed' ? 1 : 0;
    bounds.expandByPoint(new THREE.Vector3(x0, h, z0));
    bounds.expandByPoint(new THREE.Vector3(x1, 0, z1));
    const push = (px, py, pz, u, v, face) => {
      positions.push(px, py, pz);
      uvs.push(u, v);
      faces.push(face);
      types.push(tint);
      flags.push(removed);
      indexes.push(index);
    };
    // top face
    push(x0, h, z0, 0, 0, 0); push(x0, h, z1, 0, 1, 0); push(x1, h, z1, 1, 1, 0);
    push(x0, h, z0, 0, 0, 0); push(x1, h, z1, 1, 1, 0); push(x1, h, z0, 1, 0, 0);
    // four sides, uv.x in world units so hatch density is independent of size
    const perimeter = [
      [[x0, z0], [x1, z0]],
      [[x1, z0], [x1, z1]],
      [[x1, z1], [x0, z1]],
      [[x0, z1], [x0, z0]],
    ];
    let travelled = 0;
    for (const [a, b] of perimeter) {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      push(a[0], 0, a[1], travelled, 0, 1); push(b[0], 0, b[1], travelled + length, 0, 1); push(b[0], h, b[1], travelled + length, h, 1);
      push(a[0], 0, a[1], travelled, 0, 1); push(b[0], h, b[1], travelled + length, h, 1); push(a[0], h, a[1], travelled, h, 1);
      travelled += length;
    }
    const pick = new THREE.Mesh(new THREE.BoxGeometry(node.w, h, node.d), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(x0 + node.w / 2, h / 2, z0 + node.d / 2);
    pick.userData.nodeId = node.id;
    pickMeshes.push(pick);
    scene.add(pick);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aUv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aFace', new THREE.Float32BufferAttribute(faces, 1));
  geometry.setAttribute('aType', new THREE.Float32BufferAttribute(types, 1));
  geometry.setAttribute('aFlags', new THREE.Float32BufferAttribute(flags, 1));
  geometry.setAttribute('aIndex', new THREE.Float32BufferAttribute(indexes, 1));
  const mesh = new THREE.Mesh(geometry, prismMaterial);
  scene.add(mesh);
  return { bounds, pickMeshes };
}

/** ---------------------------------------------------------------- labels */
const labelObjects = [];
function addLabel(node) {
  const element = document.createElement('div');
  element.className = 'plabel' + (node.state === 'removed' ? ' gone' : '');
  element.innerHTML = '<b>' + node.code + '</b><span>' + node.name + '</span>';
  element.addEventListener('pointerdown', (event) => { event.stopPropagation(); select(node.id); });
  const object = new CSS2DObject(element);
  object.position.set(node.x + node.w / 2, Math.max(0.15, node.h) + 0.22, node.z + node.d / 2);
  scene.add(object);
  labelObjects.push({ id: node.id, element, object });
}

function addPlainLabel(position, html, className) {
  const element = document.createElement('div');
  element.className = className;
  element.innerHTML = html;
  const object = new CSS2DObject(element);
  object.position.copy(position);
  scene.add(object);
  return object;
}

/** ---------------------------------------------------------------- build */
const prismInfo = buildPrisms(SCENE.nodes);
const prismBounds = prismInfo.bounds;
SCENE.nodes.forEach(addLabel);

for (const zone of SCENE.zones) {
  const ring = [
    new THREE.Vector3(zone.x0, 0.02, zone.z0),
    new THREE.Vector3(zone.x1, 0.02, zone.z0),
    new THREE.Vector3(zone.x1, 0.02, zone.z1),
    new THREE.Vector3(zone.x0, 0.02, zone.z1),
  ];
  scene.add(new THREE.Mesh(ribbonGeometry(ring, { width: 0.22, variant: 2, closed: true, lift: 0.02 }), zoneMaterial));
  addPlainLabel(new THREE.Vector3(zone.x0, 0.3, zone.z0), zone.label, 'zlabel');
}

for (const route of SCENE.routes) {
  if (route.points.length < 2) continue;
  const points = route.points.map((point) => new THREE.Vector3(point.x, 0.05, point.z));
  scene.add(new THREE.Mesh(ribbonGeometry(points, { width: 0.28, variant: route.variant, lift: 0.06 }), ribbonMaterial));
  const tip = points[points.length - 1];
  const previous = points[points.length - 2];
  const direction = new THREE.Vector3().subVectors(tip, previous).normalize();
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  const arrow = new THREE.BufferGeometry();
  const head = 0.85;
  const wide = 0.55;
  const base = tip.clone().addScaledVector(direction, -head);
  const vertices = [
    tip.x, tip.y, tip.z,
    base.x + side.x * wide, base.y, base.z + side.z * wide,
    base.x - side.x * wide, base.y, base.z - side.z * wide,
  ];
  arrow.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  arrow.setAttribute('aDist', new THREE.Float32BufferAttribute([0, 0, 0], 1));
  arrow.setAttribute('aSide', new THREE.Float32BufferAttribute([0, 0.6, 0.6], 1));
  arrow.setAttribute('aVariant', new THREE.Float32BufferAttribute([route.variant, route.variant, route.variant], 1));
  arrow.setAttribute('aEnd', new THREE.Float32BufferAttribute([0, 0, 0], 1));
  const arrowMesh = new THREE.Mesh(arrow, ribbonMaterial);
  if (!route.hideArrow) scene.add(arrowMesh);
  if (route.label) {
    const mid = points[Math.floor(points.length / 2)];
    addPlainLabel(mid.clone().setY(0.35), route.label, 'elabel');
  }
}

/** ---------------------------------------------------------------- camera */
const center = prismBounds.getCenter(new THREE.Vector3());
const size = prismBounds.getSize(new THREE.Vector3());
const framing = Math.max(size.x, size.z * 2.2, 24);

const VIEW_DIRECTION = new THREE.Vector3(1, 0.86, 1).normalize();

/**
 * Framing is measured, never estimated: the camera is aimed, the box corners are projected
 * into camera space, and the frustum is sized from the widest and tallest extents seen there.
 * That makes the fit correct at any camera angle, including after the reader orbits the plate.
 */
function ndcExtent(box) {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  let maxX = 0.0001;
  let maxY = 0.0001;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        maxX = Math.max(maxX, Math.abs(point.x));
        maxY = Math.max(maxY, Math.abs(point.y));
      }
    }
  }
  return Math.max(maxX, maxY);
}

/**
 * Framing by measurement, twice: project the box through the camera, then scale the frustum
 * until the box fills the stage. This cannot be wrong about foreshortening, because it reads
 * the projection the GPU will actually use.
 */
function fitHalfToBox(box, padding) {
  const aspect = Math.max(0.35, stage.clientWidth / Math.max(1, stage.clientHeight));
  let half = Math.max(2, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.6);
  for (let pass = 0; pass < 3; pass += 1) {
    camera.top = half; camera.bottom = -half; camera.right = half * aspect; camera.left = -half * aspect;
    const extent = ndcExtent(box);
    half = half * extent * padding;
  }
  return half;
}

function aimCamera(target) {
  camera.position.copy(target).addScaledVector(VIEW_DIRECTION, 600);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld();
}

let fitHalf = 24;

function fitCamera(padding = 1.02) {
  camera.near = 1;
  camera.far = 8000;
  aimCamera(center);
  const half = fitHalfToBox(prismBounds, padding);
  fitHalf = half;
  camera.top = half;
  camera.bottom = -half;
  camera.right = half * (stage.clientWidth / Math.max(1, stage.clientHeight));
  camera.left = -camera.right;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

function resize() {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(width, height, false);
  renderer.domElement.style.width = width + "px";
  renderer.domElement.style.height = height + "px";
  labelRenderer.setSize(width, height);
  fitCamera();
}
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(resize);

/** ---------------------------------------------------------------- chrome */
const side = document.getElementById('side') || document.createElement('nav');
const chapters = document.getElementById('chapters');
const panelBody = document.getElementById('pb');

function nodeById(id) {
  return SCENE.nodes.find((node) => node.id === id);
}

function buildIndex() {
  const groups = new Map();
  for (const node of SCENE.nodes) {
    const key = node.group || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  }
  side.innerHTML = '';
  for (const [key, nodes] of groups) {
    const head = document.createElement('div');
    head.className = 'gh';
    head.innerHTML = '<span>' + key.toUpperCase() + '</span><span>' + nodes.length + '</span>';
    side.appendChild(head);
    for (const node of nodes) {
      const button = document.createElement('button');
      button.className = 'row' + (node.state === 'removed' ? ' ghost' : '');
      button.innerHTML = '<span class="cd">' + node.code + '</span><span class="nm">' + node.name + '</span>';
      button.addEventListener('click', () => select(node.id));
      side.appendChild(button);
    }
  }
}

function buildChapters() {
  chapters.innerHTML = '<span class="lbl">Views</span>';
  for (const view of SCENE.views) {
    const button = document.createElement('button');
    button.className = 'ch';
    button.textContent = view.label;
    button.setAttribute('aria-pressed', String(view.id === state.view));
    button.addEventListener('click', () => setView(view.id));
    chapters.appendChild(button);
  }
}

function showGeneralPanel() {
  panelBody.innerHTML = SCENE.introHtml;
}

function select(id) {
  state.selected = id;
  prismMaterial.uniforms.uSelected.value = id ? SCENE.nodes.findIndex((node) => node.id === id) : -1;
  labelObjects.forEach((entry) => entry.element.classList.toggle('on', entry.id === id));
  document.querySelectorAll('.side .row').forEach((row) => row.classList.remove('on'));
  const node = nodeById(id);
  if (!node) { showGeneralPanel(); return; }
  const facts = node.facts.map((pair) => '<dt>' + pair[0] + '</dt><dd>' + pair[1] + '</dd>').join('');
  panelBody.innerHTML = '<div class="k">' + (node.group || 'component') + '</div><h2 class="pt">' + node.name +
    '</h2><p class="ps">' + node.code + ' \u00b7 ' + node.type + (node.state === 'removed' ? ' \u00b7 removed' : '') + '</p>' +
    '<div class="k">What it does</div><p>' + node.does + '</p>' +
    '<div class="k">How it is built</div><p>' + node.built + '</p>' +
    (facts ? '<div class="k">Facts</div><dl class="facts">' + facts + '</dl>' : '');
}

function tweenCamera(targetCenter, targetHalf) {
  const start = { x: controls.target.x, z: controls.target.z, half: camera.top };
  const startedAt = performance.now();
  const duration = 420;
  state.running = true;
  const step = () => {
    const t = Math.min(1, (performance.now() - startedAt) / duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = start.x + (targetCenter.x - start.x) * eased;
    const z = start.z + (targetCenter.z - start.z) * eased;
    const half = start.half + (targetHalf - start.half) * eased;
    const aspect = Math.max(0.35, stage.clientWidth / Math.max(1, stage.clientHeight));
    camera.top = half; camera.bottom = -half; camera.right = half * aspect; camera.left = -half * aspect;
    camera.updateProjectionMatrix();
    controls.target.set(x, 0, z);
    controls.update();
    if (t < 1) requestAnimationFrame(step); else state.running = false;
  };
  requestAnimationFrame(step);
}

function setView(id) {
  state.view = id;
  document.querySelectorAll('.chapters .ch').forEach((button) => button.setAttribute('aria-pressed', String(button.textContent === (SCENE.views.find((view) => view.id === id) || {}).label)));
  const view = SCENE.views.find((entry) => entry.id === id);
  if (!view || !view.nodes || view.nodes.length === 0) {
    tweenCamera(center, (framing / 2) * 1.18);
    return;
  }
  const box = new THREE.Box3();
  for (const nodeId of view.nodes) {
    const node = nodeById(nodeId);
    if (!node) continue;
    box.expandByPoint(new THREE.Vector3(node.x, 0, node.z));
    box.expandByPoint(new THREE.Vector3(node.x + node.w, node.h, node.z + node.d));
  }
  if (box.isEmpty()) return;
  const boxCenter = box.getCenter(new THREE.Vector3());
  const boxSize = box.getSize(new THREE.Vector3());
  aimCamera(boxCenter);
  tweenCamera(boxCenter, fitHalfToBox(box, 1.06));
}

buildIndex();
buildChapters();
showGeneralPanel();

/** ---------------------------------------------------------------- interaction */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(prismInfo.pickMeshes, false)[0];
  renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
});
renderer.domElement.addEventListener('click', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(prismInfo.pickMeshes, false)[0];
  select(hit ? hit.object.userData.nodeId : null);
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { select(null); setView('all'); }
});

const themeButton = document.getElementById('theme') || document.getElementById('btn-theme');
if (themeButton) themeButton.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
const exportButton = document.getElementById('export') || document.getElementById('btn-export');
if (exportButton) exportButton.addEventListener('click', () => {
  render();
  const link = document.createElement('a');
  link.download = 'atlas-plate.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
});

/** ---------------------------------------------------------------- theme + loop */
function applyTheme(theme) {
  state.theme = theme;
  const palette = THEMES[theme];
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  gridMaterial.uniforms.uPaper.value.setHex(palette.paper);
  gridMaterial.uniforms.uDeep.value.setHex(palette.paperDeep);
  gridMaterial.uniforms.uGrid.value.setHex(palette.grid);
  gridMaterial.uniforms.uMajor.value.setHex(palette.gridMajor);
  prismMaterial.uniforms.uPaper.value.setHex(palette.paper);
  prismMaterial.uniforms.uInk.value.setHex(palette.ink);
  prismMaterial.uniforms.uMuted.value.setHex(palette.muted);
  prismMaterial.uniforms.uAccent.value.setHex(palette.accent);
  prismMaterial.uniforms.uTints.value = TYPE_ORDER.map((type) => new THREE.Color(TYPE_TINT[theme][type]));
  ribbonMaterial.uniforms.uInk.value.setHex(palette.ink);
  ribbonMaterial.uniforms.uMuted.value.setHex(palette.muted);
  ribbonMaterial.uniforms.uAccent.value.setHex(palette.accent);
  ribbonMaterial.uniforms.uWarm.value.setHex(palette.warm);
  ribbonMaterial.uniforms.uPaper.value.setHex(palette.paper);
  zoneMaterial.uniforms.uInk.value.setHex(palette.muted);
  zoneMaterial.uniforms.uPaper.value.setHex(palette.paper);
  if (themeButton) themeButton.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

function updateLabelScale() {
  const ratio = Math.max(0.6, Math.min(6, fitHalf / Math.max(0.001, camera.top)));
  labelHost.style.setProperty("--lk", String(Math.round(ratio * 100) / 100));
  document.body.classList.toggle("zoomed-out", ratio < 1.35);
}

function render() {
  updateLabelScale();
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
// A small handle for lookdev and for the headless checks: what the viewer thinks it is drawing.
window.AtlasPrism = { renderer, scene, camera, controls, state, prismBounds, prismMaterial, ribbonMaterial, gridMaterial };
renderer.setAnimationLoop(render);
applyTheme('dark');
setView('all');
