#!/usr/bin/env bun
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [html,out,playwright,chrome]=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(path.resolve(playwright)).href);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],results=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.setDefaultTimeout(8000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(pathToFileURL(path.resolve(html)).href);
  await page.waitForFunction(()=>window.AtlasPrism);
  const snapshot=()=>page.evaluate(()=>{const A=window.AtlasPrism;return {...A.playback.state,projection:A.state.projection,selected:A.state.selected,dot:A.flowDot.position.toArray(),trace:A.routeMeshes.map(m=>m.material.uniforms.uTrace.value),camera:A.camera.position.toArray(),target:A.controls.target.toArray()};});
  const flows=await page.evaluate(()=>window.ATLAS_SCENE.flows);
  assert.ok(flows.length>0);
  for(let f=0;f<flows.length;f++){
    await page.locator('#flow-select').selectOption(String(f));
    await page.locator('#restart-flow').click();
    for(let s=0;s<flows[f].steps.length;s++){
      const state=await snapshot();assert.equal(state.step,s);assert.equal(state.trace[flows[f].steps[s].route],1);assert.equal(state.trace.filter(Boolean).length,1);
      assert.match(await page.locator('#flow-status').textContent(),new RegExp(`${s+1} / ${flows[f].steps.length}`));
      await page.locator('#step').click();
    }
    assert.equal((await snapshot()).finished,true);
    await page.locator('#restart-flow').click();
    await page.locator('#play').click();
    await page.waitForFunction(()=>window.AtlasPrism.playback.state.progress>0.05);
    await page.locator('#play').click();
    const paused=await snapshot();await page.waitForTimeout(120);assert.deepEqual((await snapshot()).dot,paused.dot);assert.equal((await snapshot()).progress,paused.progress);
    await page.locator('.row').first().click();const selected=(await snapshot()).selected;
    for(const projection of ['flow','infra']){
      await page.locator(`[data-projection="${projection}"]`).click();
      const after=await snapshot();assert.equal(after.projection,projection);assert.equal(after.selected,selected);assert.equal(after.step,paused.step);assert.equal(after.progress,paused.progress);
      if(projection==='flow'){const dx=after.camera[0]-after.target[0],dy=after.camera[1]-after.target[1],dz=after.camera[2]-after.target[2];assert.ok(Math.hypot(dx,dz)/dy<0.001);}
    }
    await page.locator('#play').click();await page.waitForFunction(()=>window.AtlasPrism.playback.state.step>0);
    await page.locator('#play').click();results.push({flow:flows[f].id,steps:flows[f].steps.length,stepAndPlayback:true});
  }
  await page.locator('#flow-select').selectOption('0');await page.locator('#restart-flow').click();
  for(const projection of ['infra','flow']){
    await page.locator(`[data-projection="${projection}"]`).click();
    for(const theme of ['dark','light']){
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#theme').click();
      await page.screenshot({path:path.join(out,projection+'-'+theme+'.png')});
    }
  }
  // Finishing the final hop automatically stops instead of wrapping or leaving a timer running.
  await page.evaluate(()=>{const A=window.AtlasPrism;A.playback.play();A.playback.tick(1e6);});
  await page.locator('[data-projection="infra"]').click();assert.equal((await snapshot()).finished,true);assert.equal((await snapshot()).playing,false);
  await page.locator('#restart-flow').click();await page.locator('#play').click();
  const running=(await snapshot());await page.locator('[data-projection="flow"]').click();assert.equal((await snapshot()).playing,true);assert.equal((await snapshot()).flow,running.flow);
  await page.locator('#play').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();await (await downloadPromise).saveAs(path.join(out,'export.png'));
  await page.setViewportSize({width:390,height:844});await page.locator('#restart-flow').click();await page.locator('#step').click();assert.equal((await snapshot()).step,1);
  await page.screenshot({path:path.join(out,'mobile.png')});
  assert.equal(errors.length,0,errors.join('\n'));
  const receipt={ok:true,results,errors,checks:['all authored steps','route highlighting','moving marker','pause/resume','automatic advance','completion','restart','projection while paused and playing','selection retention','themes','export','mobile controls']};
  await writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}finally{await browser.close();}
