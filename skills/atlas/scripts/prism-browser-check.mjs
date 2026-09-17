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
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(pathToFileURL(path.resolve(pagePath)).href);
  await page.waitForFunction(() => window.AtlasPrism);
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
  assert.ok(geometry.extent < 1 && geometry.extent > 0.75, 'actual geometry fills frame without clipping');
  assert.ok(Math.abs(geometry.slope-0.5)<0.001, '2:1 ground projection');
  assert.ok(geometry.canvasMatches && geometry.panelBeside); assert.equal(geometry.labels, geometry.nodes);
  results.push(geometry);
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
  await page.locator('.row').first().click();
  assert.ok(await page.evaluate(()=>window.AtlasPrism.state.selected));
  await page.locator('#tbuilt').click(); assert.equal(await page.locator('#tbuilt').getAttribute('aria-selected'),'true');
  const stage=await page.locator('#stage').boundingBox();
  await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);await page.mouse.wheel(0,-400);
  await page.waitForFunction(()=>window.AtlasPrism.camera.zoom>1.35);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.AtlasPrism.camera.zoom),1);
  assert.equal(await page.evaluate(()=>window.AtlasPrism.state.selected),null);
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();
  const download=await downloadPromise;await download.saveAs(path.join(outputDir,'export.png'));assert.equal(await download.failure(),null);
  for(const view of await page.locator('.ch').all()){await view.click();assert.equal(await view.getAttribute('aria-pressed'),'true');}
  await page.locator('#reset').click();
  await page.setViewportSize({width:390,height:844});await settle();
  await page.locator('#menuBtn').click();await page.locator('.row').first().click();
  assert.ok(!await page.locator('#side').evaluate(e=>e.classList.contains('open')));
  await page.screenshot({path:path.join(outputDir,'mobile.png'),scale:'css'});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({ok:true,results,checks:['layout','geometry fit','2:1 projection','DPR2','label count','contrast','themes','selection','tabs','wheel zoom','reset','PNG download','views','mobile index'],errors}));
} finally { await browser.close(); }
