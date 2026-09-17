#!/usr/bin/env bun
// Run with an absolute Playwright module path and a rendered prism page. No fixture framework.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [pagePath, outputDir, playwrightPath, chromePath] = process.argv.slice(2);
if (!chromePath) throw new Error('Usage: bun scripts/prism-browser-check.mjs PAGE OUTPUT_DIR PLAYWRIGHT_MODULE CHROME');
const { chromium } = await import(pathToFileURL(path.resolve(playwrightPath)).href);
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [], results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  // SwiftShader on a loaded machine can take a minute to boot a 0.6MB scene: fail with the step
  // that stalled rather than a bare timeout.
  page.setDefaultTimeout(90000);
  const step = name => process.stdout.write('  step ' + name + '\n');
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  step('goto');
  await page.goto(pathToFileURL(path.resolve(pagePath)).href);
  step('boot');
  await page.waitForFunction(() => window.AtlasPrism);
  step('geometry');
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await settle();
  const geometry = await page.evaluate(() => {
    const A = window.AtlasPrism, stage = document.getElementById('stage'), r = stage.getBoundingClientRect();
    const canvas = A.renderer.domElement.getBoundingClientRect(), panel = document.querySelector('.panel').getBoundingClientRect();
    const point = A.sceneBounds.min.clone(); let extent = 0;
    for (const child of A.scene.children) {
      if (!child.geometry || child.material === A.gridMaterial) continue;
      const vertices = child.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        point.fromBufferAttribute(vertices, i).applyMatrix4(child.matrixWorld).project(A.camera);
        extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
      }
    }
    const origin = point.set(0, 0, 0).project(A.camera).clone(), axis = point.set(1, 0, 0).project(A.camera);
    return { extent, slope: Math.abs((axis.y-origin.y)*r.height/((axis.x-origin.x)*r.width)), canvasMatches: canvas.width===r.width && canvas.height===r.height, panelBeside: panel.x>=r.right-1 && Math.abs(panel.y-r.y)<1, labels: document.querySelectorAll('.plabel').length, nodes: window.ATLAS_SCENE.nodes.length, calls: A.renderer.info.render.calls };
  });
  const shapes = await page.evaluate(() => {
    const A = window.AtlasPrism, scene = window.ATLAS_SCENE;
    const prism = A.scene.children.find(child => child.geometry && child.geometry.attributes.aIndex);
    const index = prism.geometry.attributes.aIndex, position = prism.geometry.attributes.position;
    let outside = 0;
    const perNode = new Map();
    for (let i = 0; i < index.count; i++) {
      const node = scene.nodes[Math.round(index.getX(i))];
      const u = Math.abs(position.getX(i) - (node.x + node.w / 2)), v = Math.abs(position.getZ(i) - (node.z + node.d / 2));
      if (u > node.w / 2 + 0.01 || v > node.d / 2 + 0.01) outside++;
      perNode.set(node.type, Math.max(perNode.get(node.type) || 0, u / (node.w / 2) + v / (node.d / 2)));
    }
    let onBorder = 0;
    for (const route of scene.routes) for (const point of route.points.slice(1, -1)) for (const zone of scene.zones) {
      const nearX = Math.min(Math.abs(point.x - zone.x0), Math.abs(point.x - zone.x1));
      const nearZ = Math.min(Math.abs(point.z - zone.z0), Math.abs(point.z - zone.z1));
      if (nearX < 0.05 && point.z > zone.z0 - 0.05 && point.z < zone.z1 + 0.05) onBorder++;
      if (nearZ < 0.05 && point.x > zone.x0 - 0.05 && point.x < zone.x1 + 0.05) onBorder++;
    }
    return { outside, onBorder, silhouettes: new Set([...perNode.values()].map(value => value.toFixed(2))).size, zones: scene.zones.length, routes: scene.routes.length };
  });
  assert.equal(shapes.outside, 0, 'every silhouette stays inside its authored footprint');
  assert.equal(shapes.onBorder, 0, 'no route turns on a zone border');
  assert.ok(shapes.silhouettes > 1 && shapes.routes > 0 && shapes.zones > 0, 'typed silhouettes and routing are present');
  results.push(shapes);
  assert.ok(Math.abs(geometry.slope-0.5)<0.001, '2:1 ground projection');
  assert.ok(geometry.canvasMatches && geometry.panelBeside); assert.equal(geometry.labels, geometry.nodes);
  results.push(geometry);
  step('themes');
  for (const theme of ['dark', 'light']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#theme').click();
    await settle();
    const contrast = await page.evaluate(() => {
      const css=getComputedStyle(document.documentElement);
      const lum=hex=>{const c=hex.trim().replace('#','');return [0,2,4].map(i=>parseInt(c.substring(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);};
      const paper=lum(css.getPropertyValue('--paper'));
      return ['--ink','--ink2','--hot','--warm'].map(key=>{const ink=lum(css.getPropertyValue(key));return (Math.max(ink,paper)+0.05)/(Math.min(ink,paper)+0.05);});
    });
    assert.ok(contrast.every(value=>value>=4.5), 'label contrast'); results.push({theme,contrast});
    await page.screenshot({path:path.join(outputDir,theme+'.png'),scale:'css'});
  }
  step('panel');
  await page.locator('.row').first().click();
  assert.ok(await page.evaluate(()=>window.AtlasPrism.state.selected));
  await page.locator('#tbuilt').click(); assert.equal(await page.locator('#tbuilt').getAttribute('aria-selected'),'true');
  step('zoom');
  const stage=await page.locator('#stage').boundingBox();
  await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);
  // One wheel event is a fixed OrbitControls step (x1.23), so wheel until the zoom-in state is
  // reached rather than assuming a magnitude.
  for(let spin=0;spin<4&&await page.evaluate(()=>window.AtlasPrism.camera.zoom<=1.35);spin++){await page.mouse.wheel(0,-400);await page.waitForTimeout(120);}
  assert.ok(await page.evaluate(()=>window.AtlasPrism.camera.zoom>1.35),'wheel zooms in');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.AtlasPrism.camera.zoom),1);
  assert.equal(await page.evaluate(()=>window.AtlasPrism.state.selected),null);
  step('export');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();
  const download=await downloadPromise;await download.saveAs(path.join(outputDir,'export.png'));assert.equal(await download.failure(),null);
  for(const view of await page.locator('.ch').all()){await view.click();assert.equal(await view.getAttribute('aria-pressed'),'true');}
  await page.locator('#reset').click();
  step('mobile');
  await page.setViewportSize({width:390,height:844});await settle();
  await page.locator('#menuBtn').click();await page.locator('.row').first().click();
  assert.ok(!await page.locator('#side').evaluate(e=>e.classList.contains('open')));
  await page.screenshot({path:path.join(outputDir,'mobile.png'),scale:'css'});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({ok:true,results,checks:['layout','geometry fit','2:1 projection','DPR2','label count','contrast','themes','selection','tabs','wheel zoom','reset','PNG download','views','mobile index'],errors}));
} finally { await browser.close(); }
