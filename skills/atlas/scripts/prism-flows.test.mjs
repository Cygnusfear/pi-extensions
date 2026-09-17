import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileScene} from '../vendor/archify/renderers/atlas/prism.mjs';
import {createPlayback,pointOnRoute} from '../vendor/atlas/prism-playback.js';
import {outlineFor,marksFor,SHAPE_TYPES,STORE_RINGS} from '../vendor/atlas/prism-shapes.js';
const spec=JSON.parse(fs.readFileSync(new URL('../examples/helpdesk.prism.architecture.json',import.meta.url)));
test('compiler preserves all authored flows and resolves every hop',()=>{const scene=compileScene(spec);assert.equal(scene.flows.length,4);assert.deepEqual(scene.flows.map(f=>f.steps.length),[12,8,2,2]);for(const flow of scene.flows)for(const step of flow.steps){assert.equal(scene.routes[step.route].from,step.from);assert.equal(scene.routes[step.route].to,step.to);}});
test('compiler rejects nonexistent and ambiguous hops',()=>{const invalid=structuredClone(spec);invalid.meta.plate.flows[0].steps[0].to='missing';assert.throws(()=>compileScene(invalid),/exactly one connection/);const duplicate=structuredClone(spec);duplicate.connections.push(duplicate.connections[0]);assert.throws(()=>compileScene(duplicate),/exactly one connection/);});
test('old specs have no invented flows',()=>{const old=structuredClone(spec);delete old.meta.plate.flows;assert.deepEqual(compileScene(old).flows,[]);});
test('every flow completes in order, pause is stable, restart clears completion',()=>{const flows=compileScene(spec).flows,p=createPlayback(flows,10);for(let f=0;f<flows.length;f++){p.choose(f);p.play();for(let s=0;s<flows[f].steps.length;s++){assert.equal(p.state.step,s);p.tick(10);}assert.equal(p.state.playing,false);assert.equal(p.state.finished,true);p.restart();p.play();p.tick(5);p.pause();p.tick(100);assert.equal(p.state.progress,0.5);}assert.equal(p.choose(-1),false);});
test('marker follows distance through elbows and degenerate segments',()=>{assert.deepEqual(pointOnRoute([{x:0,z:0},{x:0,z:0},{x:4,z:0},{x:4,z:4}],0.75),{x:4,z:2});assert.equal(pointOnRoute([],0),null);});

test('every schema type has its own silhouette inside its footprint', () => {
  const seen = new Map();
  for (const type of SHAPE_TYPES) {
    const outline = outlineFor(type, 4, 2);
    assert.ok(outline.length >= 4, type + ' needs a closed outline');
    for (const [u, v] of outline) assert.ok(Math.abs(u) <= 2.001 && Math.abs(v) <= 1.001, type + ' stays inside its footprint');
    let area = 0;
    for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length]; area += a[0] * b[1] - b[0] * a[1]; }
    assert.ok(area < 0, type + ' is wound clockwise for outward faces');
    // Two types may share a footprint (a client and a service are both rounded) as long as the
    // pair is distinguishable, which is what the approved vocabulary does through its symbols.
    seen.set(type, outline.map(([u, v]) => u.toFixed(3) + ',' + v.toFixed(3)).join(' ') + '|' + JSON.stringify(marksFor(type, 4, 2, 1)));
  }
  assert.equal(new Set(seen.values()).size, SHAPE_TYPES.length, 'every type is distinguishable');
  assert.ok(outlineFor('database', 4, 2).length > outlineFor('backend', 4, 2).length, 'a store is rounder than a service');
  assert.equal(outlineFor('external', 4, 2).length, 6);
  assert.equal(outlineFor('messagebus', 4, 2).length, 4);
  assert.deepEqual(STORE_RINGS, [0.3, 0.6]);
});

test('every type carries its approved top-face symbols inside the footprint', () => {
  for (const type of SHAPE_TYPES) {
    const marks = marksFor(type, 4, 2, 1);
    assert.ok(marks.length > 0, type + ' carries its approved symbols');
    for (const mark of marks) for (const [x, y, z] of mark) {
      assert.equal(y, 1.02, 'marks sit just above the top face');
      assert.ok(Math.abs(x) <= 2.001 && Math.abs(z) <= 1.001, type + ' marks stay on the footprint');
    }
  }
  assert.equal(marksFor('messagebus', 4, 2, 1).length, 3, 'a queue is divided into ordered cells');
  assert.ok(marksFor('database', 4, 2, 1).length >= 4, 'a store shows its barrel rings');
  assert.deepEqual(marksFor('cloud', 4, 2, 1), [], 'an unspecified type gets no invented symbol');
});

test('a connection between two zones walks the gutter, and authored via still wins', () => {
  const spec = {
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: 'Gutter', visual_preset: 'prism' },
    components: [
      { id: 'a', label: 'A', type: 'frontend', pos: [0, 0], footprint: [4, 2] },
      { id: 'b', label: 'B', type: 'backend', pos: [20, -1], footprint: [4, 2] },
    ],
    boundaries: [
      { kind: 'region', label: 'LEFT', wraps: ['a'], pad: 1 },
      { kind: 'region', label: 'RIGHT', wraps: ['b'], pad: 1 },
    ],
    connections: [{ from: 'a', to: 'b', label: 'call' }],
  };
  const scene = compileScene(spec);
  const [left, right] = scene.zones;
  const gutter = scene.routes[0].points;
  assert.equal(gutter.length, 4, 'a cross-zone route turns twice, in the open gutter');
  const centre = (left.x1 + right.x0) / 2;
  assert.equal(gutter[1].x, centre); assert.equal(gutter[2].x, centre);
  assert.ok(gutter[1].x > left.x1 && gutter[1].x < right.x0, 'the run is clear of both borders');
  assert.equal(gutter[1].z, gutter[0].z); assert.equal(gutter[2].z, gutter[3].z);
  const authored = structuredClone(spec);
  authored.connections[0].via = [[6, -3]];
  assert.ok(compileScene(authored).routes[0].points.some(point => point.x === 6 && point.z === -3), 'authored waypoints are kept');
  const blocked = structuredClone(spec);
  blocked.components.push({ id: 'd', label: 'D', type: 'external', pos: [12, 0], footprint: [4, 2] });
  blocked.boundaries.push({ kind: 'region', label: 'MIDDLE', wraps: ['d'], pad: 1 });
  assert.equal(compileScene(blocked).routes[0].points.length, 3, 'a third zone in the corridor falls back to the direct L');
});

test('no compiled route turns on a zone border', () => {
  const scene = compileScene(spec);
  assert.ok(scene.routes.length >= 8, 'the shipped plate still routes every connection');
  for (const route of scene.routes) {
    for (const point of route.points.slice(1, -1)) {
      for (const zone of scene.zones) {
        const nearX = Math.min(Math.abs(point.x - zone.x0), Math.abs(point.x - zone.x1));
        const nearZ = Math.min(Math.abs(point.z - zone.z0), Math.abs(point.z - zone.z1));
        const spansZ = point.z > zone.z0 - 0.05 && point.z < zone.z1 + 0.05;
        const spansX = point.x > zone.x0 - 0.05 && point.x < zone.x1 + 0.05;
        assert.ok(!(nearX < 0.05 && spansZ), 'elbow ' + point.x + ',' + point.z + ' rides the border of ' + zone.label);
        assert.ok(!(nearZ < 0.05 && spansX), 'elbow ' + point.x + ',' + point.z + ' rides the border of ' + zone.label);
      }
    }
  }
});
