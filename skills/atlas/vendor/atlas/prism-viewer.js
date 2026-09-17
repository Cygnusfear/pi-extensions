import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createPlayback, pointOnRoute } from './prism-playback.js';
import { outlineFor, marksFor, STORE_RINGS, SEAM_COSINE } from './prism-shapes.js';

const data = window.ATLAS_SCENE;
if (!data?.nodes?.length) throw new Error('Prism needs at least one component');
const stage = document.getElementById('stage');
const canvas = document.getElementById('gl');
const labelHost = document.getElementById('labels');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const labels = new CSS2DRenderer({ element: labelHost });
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;
controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.minPolarAngle = 0.08;
controls.minZoom = 0.3;
controls.maxZoom = 8;
controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.screenSpacePanning = true;
const state = { theme: 'dark', selected: null, view: 'all', tab: 'does', projection: 'infra' };
const playback = createPlayback(data.flows || []);
const routeMeshes = [];
const palette = {
  dark: { paper: 0x0d3b6d, ink: 0xeef6ff, accent: 0x7ff0ff, warm: 0xffb15e },
  light: { paper: 0xf3f7fc, ink: 0x0c3a6b, accent: 0x0062a8, warm: 0x965100 },
};
const common = {
  uPaper: { value: new THREE.Color() }, uInk: { value: new THREE.Color() },
  uAccent: { value: new THREE.Color() }, uWarm: { value: new THREE.Color() },
  uSelected: { value: -1 }, uPixelRatio: { value: renderer.getPixelRatio() },
  uWorldPixel: { value: 0.05 }, uTraceNode: { value: -1 },
};
const output = '#include <colorspace_fragment>';
const sceneBounds = new THREE.Box3();
const pickMeshes = [];
const nodeLabels = [];
const routeLabels = [];
const zoneLabels = [];
const byId = new Map(data.nodes.map(n => [n.id, n]));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// The plane is authored in XY and rotated into XZ. Read world coordinates after modelMatrix.
const gridMaterial = new THREE.ShaderMaterial({
  uniforms: common,
  vertexShader: `varying vec2 vGround;
    void main() { vec4 world = modelMatrix * vec4(position, 1.0); vGround = world.xz;
      gl_Position = projectionMatrix * viewMatrix * world; }`,
  fragmentShader: `uniform vec3 uPaper, uInk; uniform float uPixelRatio;
    varying vec2 vGround;
    float grid(vec2 p) {
      vec2 derivative = max(fwidth(p), vec2(0.00001));
      vec2 distance = abs(fract(p - 0.5) - 0.5) / derivative;
      return 1.0 - smoothstep(0.0, 0.65 * uPixelRatio, min(distance.x, distance.y));
    }
    void main() {
      float fine = grid(vGround), major = grid(vGround / 5.0);
      gl_FragColor = vec4(mix(uPaper, uInk, max(fine * 0.025, major * 0.065)), 1.0);
      ${output}
    }`,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), gridMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.03;
scene.add(ground);

// Face UV is always 0..1. World-scale coordinates for hatching are a separate attribute.
const prismMaterial = new THREE.ShaderMaterial({
  uniforms: common,
  vertexShader: `attribute vec2 aFaceUv, aHatch; attribute float aFace, aIndex, aRemoved;
    varying vec2 vUv, vHatch; varying float vFace, vIndex, vRemoved;
    void main() { vUv=aFaceUv; vHatch=aHatch; vFace=aFace; vIndex=aIndex; vRemoved=aRemoved;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uPaper,uInk,uAccent; uniform float uSelected,uPixelRatio,uTraceNode;
    varying vec2 vUv,vHatch; varying float vFace,vIndex,vRemoved;
    void main() {
      vec2 edgeDistance=min(vUv,1.0-vUv)/max(fwidth(vUv),vec2(0.00001));
      float edge=1.0-smoothstep(0.55*uPixelRatio,1.1*uPixelRatio,min(edgeDistance.x,edgeDistance.y));
      float cycle=(vHatch.x+vHatch.y)*4.0;
      float stripe=abs(fract(cycle-0.5)-0.5)/max(fwidth(cycle),0.00001);
      float hatch=(1.0-smoothstep(0.0,0.65*uPixelRatio,stripe))*step(0.5,vFace);
      float selected=max(1.0-step(0.5,abs(vIndex-uSelected)),1.0-step(0.5,abs(vIndex-uTraceNode)));
      vec3 ink=mix(uInk,uAccent,selected);
      float amount=max(edge*0.92,hatch*0.22);
      vec3 color=mix(uPaper,ink,max(amount,selected*0.08));
      if(vRemoved>0.5) {
        float dash=step(0.38,fract((vHatch.x+vHatch.y)*2.0));
        if(edge*dash<0.1) discard;
        color=mix(uPaper,uInk,0.4);
      }
      gl_FragColor=vec4(color,1.0);
      ${output}
    }`,
});
const attributes = { position: [], aFaceUv: [], aHatch: [], aFace: [], aIndex: [], aRemoved: [] };
// Top caps and sides carry no per-quad edge highlight: the silhouette is stroked explicitly in
// the decoration pass, so a 40-segment cylinder does not render as a picket fence of seams.
function triangle(corners, index, removed) {
  for (const corner of corners) {
    attributes.position.push(...corner);
    attributes.aFaceUv.push(0.5, 0.5);
    attributes.aHatch.push(corner[0], corner[2]);
    attributes.aFace.push(0); attributes.aIndex.push(index); attributes.aRemoved.push(removed);
  }
}
function sideQuad(corners, hatches, index, removed) {
  for (const k of [0,1,2,0,2,3]) {
    attributes.position.push(...corners[k]);
    attributes.aFaceUv.push(0.5, 0.5);
    attributes.aHatch.push(hatches[k][0], hatches[k][1]);
    attributes.aFace.push(1); attributes.aIndex.push(index); attributes.aRemoved.push(removed);
  }
}
// SHAPE VOCABULARY — see prism-shapes.js: pure, unit-tested, shared by Flow and Infra.
data.nodes.forEach((n,index) => {
  const x=n.x, z=n.z, X=x+n.w, Z=z+n.d, h=Math.max(0.08,n.h), removed=n.state==='removed'?1:0;
  sceneBounds.expandByPoint(new THREE.Vector3(x,0,z));
  sceneBounds.expandByPoint(new THREE.Vector3(X,h,Z));
  const centreX = x + n.w / 2, centreZ = z + n.d / 2;
  const outline = outlineFor(n.type, n.w, n.d);
  const outlineWorld = outline.map(([u, v]) => [centreX + u, centreZ + v]);
  if (removed === 0) {
    for (let i = 1; i < outlineWorld.length - 1; i++) {
      triangle([[outlineWorld[0][0], h, outlineWorld[0][1]], [outlineWorld[i][0], h, outlineWorld[i][1]], [outlineWorld[i + 1][0], h, outlineWorld[i + 1][1]]], index, removed);
    }
    let travelled = 0;
    for (let i = 0; i < outlineWorld.length; i++) {
      const a = outlineWorld[i], b = outlineWorld[(i + 1) % outlineWorld.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      sideQuad([[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h, b[1]], [a[0], h, a[1]]],
        [[travelled, 0], [travelled + length, 0], [travelled + length, h], [travelled, h]], index, removed);
      travelled += length;
    }
    if (n.type === 'database') {
      for (const fraction of STORE_RINGS) {
        const y = h * fraction;
        for (let i = 1; i < outlineWorld.length - 1; i++) {
          triangle([[outlineWorld[0][0], y, outlineWorld[0][1]], [outlineWorld[i][0], y, outlineWorld[i][1]], [outlineWorld[i + 1][0], y, outlineWorld[i + 1][1]]], index, removed);
        }
      }
    }
  }
  const pick = new THREE.Mesh(new THREE.BoxGeometry(n.w,h,n.d),new THREE.MeshBasicMaterial({visible:false}));
  pick.position.set(x+n.w/2,h/2,z+n.d/2); pick.userData.id=n.id;
  pickMeshes.push(pick); scene.add(pick);
  const element=document.createElement('button'); element.className='plabel'+(removed?' gone':'');
  element.innerHTML='<b>'+escape(n.code)+'</b>'; element.title=n.name; element.dataset.node=n.id;
  element.addEventListener('pointerdown',event=>event.stopPropagation());
  element.addEventListener('click',()=>select(n.id));
  const object=new CSS2DObject(element); object.position.set(x+n.w/2,h+0.04,z+n.d/2);
  scene.add(object); nodeLabels.push({element,object,id:n.id});
});
const prismGeometry=new THREE.BufferGeometry();
for(const [name,values] of Object.entries(attributes)) prismGeometry.setAttribute(name,new THREE.Float32BufferAttribute(values,name==='position'?3:['aFaceUv','aHatch'].includes(name)?2:1));
scene.add(new THREE.Mesh(prismGeometry,prismMaterial));

// Route widths are screen pixels. The vertex shader expands each centreline in world units
// using the live orthographic pixel scale; distance remains continuous at every elbow.
const lineMaterial=new THREE.ShaderMaterial({
  uniforms:{...common,uTrace:{value:0}}, transparent:true, depthWrite:false, side:THREE.DoubleSide,
  vertexShader:`attribute vec3 aOffset; attribute float aDistance,aSide,aKind;
    uniform float uWorldPixel; varying float vDistance,vSide,vKind;
    void main(){vDistance=aDistance;vSide=aSide;vKind=aKind;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position+aOffset*uWorldPixel,1.0);}`,
  fragmentShader:`uniform vec3 uInk,uWarm,uAccent; uniform float uWorldPixel,uTrace; varying float vDistance,vSide,vKind;
    void main(){float opacity=1.0;
      if(vKind>2.5) opacity=0.34;
      float dash=1.0;
      if(vKind>1.5) dash=step(0.36,fract(vDistance/max(uWorldPixel*10.0,0.001)));
      float alpha=(1.0-smoothstep(0.65,1.0,abs(vSide)))*opacity*dash;
      if(alpha<0.01)discard;
      gl_FragColor=vec4(mix(vKind>0.5&&vKind<1.5?uWarm:uInk,uAccent,uTrace),alpha);
      ${output}
    }`,
});
function ribbon(groups, kind, width, arrow) {
  const a={position:[],aOffset:[],aDistance:[],aSide:[],aKind:[]};
  const vertex=(p,offset,d,side,k=kind)=>{a.position.push(p.x,p.y,p.z);a.aOffset.push(offset.x,offset.y,offset.z);a.aDistance.push(d);a.aSide.push(side);a.aKind.push(k);};
  let distance=0;
  for(const points of groups){
    for(let i=1;i<points.length;i++){
      const start=points[i-1],end=points[i],direction=end.clone().sub(start),length=direction.length();
      if(length<0.00001)continue;
      direction.divideScalar(length);
      const normal=new THREE.Vector3(-direction.z,0,direction.x).multiplyScalar(width/2);
      for(const [p,s,d] of [[start,1,distance],[start,-1,distance],[end,1,distance+length],[end,1,distance+length],[start,-1,distance],[end,-1,distance+length]]) vertex(p,normal.clone().multiplyScalar(s),d,s);
      distance+=length;
    }
    if(arrow&&points.length>1){
      const tip=points.at(-1),direction=tip.clone().sub(points.at(-2)).normalize();
      const normal=new THREE.Vector3(-direction.z,0,direction.x);
      for(const offset of [new THREE.Vector3(),direction.clone().multiplyScalar(-7).addScaledVector(normal,3),direction.clone().multiplyScalar(-7).addScaledVector(normal,-3)]) vertex(tip,offset,0,0,kind===1?1:0);
    }
  }
  const geometry=new THREE.BufferGeometry();
  for(const [name,values] of Object.entries(a)) geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,['position','aOffset'].includes(name)?3:1));
  const material=lineMaterial.clone();material.uniforms={...common,uTrace:{value:0}};
  const mesh=new THREE.Mesh(geometry,material); mesh.frustumCulled=false; scene.add(mesh);return mesh;
}
function line(points,kind,width=1.5,arrow=false){return ribbon([points],kind,width,arrow);}
// DECORATION — silhouette rims, seams where the outline actually turns, and the type marks.
// One mesh for every solid stroke in the scene and one for every dashed stroke: the marks cost
// two draw calls instead of one per hairline.
const solidStrokes = [], dashedStrokes = [];
data.nodes.forEach(n => {
  const removed = n.state === 'removed';
  const cx = n.x + n.w / 2, cz = n.z + n.d / 2, h = Math.max(0.08, n.h);
  const outline = outlineFor(n.type, n.w, n.d);
  const group = removed ? dashedStrokes : solidStrokes;
  const ring = y => [...outline, outline[0]].map(([u, value]) => new THREE.Vector3(cx + u, y, cz + value));
  group.push(ring(h), ring(0.002));
  for (let i = 0; i < outline.length; i++) {
    const previous = outline[(i - 1 + outline.length) % outline.length], point = outline[i], next = outline[(i + 1) % outline.length];
    const incoming = new THREE.Vector2(point[0] - previous[0], point[1] - previous[1]).normalize();
    const outgoing = new THREE.Vector2(next[0] - point[0], next[1] - point[1]).normalize();
    if (incoming.dot(outgoing) < SEAM_COSINE) group.push([new THREE.Vector3(cx + point[0], 0.002, cz + point[1]), new THREE.Vector3(cx + point[0], h, cz + point[1])]);
  }
  if (!removed) for (const mark of marksFor(n.type, n.w, n.d, h)) group.push(mark.map(([mx, my, mz]) => new THREE.Vector3(mx + cx, my, mz + cz)));
});
ribbon(solidStrokes, 0, 1.1);
ribbon(dashedStrokes, 2, 1.1);
function textLabel(text,position,className){
  const element=document.createElement('div');element.className=className;element.textContent=text;
  const object=new CSS2DObject(element);object.position.copy(position);scene.add(object);return {element,object};
}
for(const zone of data.zones){
  const ring=[[zone.x0,zone.z0],[zone.x1,zone.z0],[zone.x1,zone.z1],[zone.x0,zone.z1],[zone.x0,zone.z0]].map(([x,z])=>new THREE.Vector3(x,0.01,z));
  ring.forEach(p=>sceneBounds.expandByPoint(p)); line(ring,3,1.3);
  zoneLabels.push(textLabel(zone.label,new THREE.Vector3(zone.x0,0.1,zone.z0),'zlabel'));
}
for(const route of data.routes){
  const points=route.points.map(p=>new THREE.Vector3(p.x,0.025,p.z));
  points.forEach(p=>sceneBounds.expandByPoint(p));routeMeshes.push(line(points,route.variant,3.0,true));
  if(route.label){
    let longest=0,anchor=points[0];
    for(let i=1;i<points.length;i++){const length=points[i].distanceTo(points[i-1]);if(length>longest){longest=length;anchor=points[i].clone().add(points[i-1]).multiplyScalar(0.5);}}
    routeLabels.push({...textLabel(route.label,anchor.clone().setY(0.08),'elabel'),from:route.from,to:route.to});
  }
}

const flowDot=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:palette.dark.accent,depthTest:false,depthWrite:false}));
flowDot.visible=false;flowDot.renderOrder=20;flowDot.userData.excludeFit=true;scene.add(flowDot);

// Exactly the atlas ground projection: each ground axis rises one unit per two horizontally.
const direction=new THREE.Vector3(1,Math.sqrt(2/3),1).normalize();
function fit(box=sceneBounds){
  const center=box.getCenter(new THREE.Vector3());
  controls.minPolarAngle=state.projection==='flow'?0.000001:0.08;
  controls.enableRotate=state.projection==='infra';
  controls.target.copy(center); camera.position.copy(center).addScaledVector(state.projection==='flow'?new THREE.Vector3(0,1,0.000001):direction,100);
  camera.zoom=1; camera.lookAt(center); camera.updateMatrixWorld();
  const projected=new THREE.Box3(),point=new THREE.Vector3();
  if(box===sceneBounds){
    for(const child of scene.children){
      if(child===ground||!child.geometry||child.userData.excludeFit)continue;
      const positions=child.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        point.fromBufferAttribute(positions,i).applyMatrix4(child.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
        projected.expandByPoint(point);
      }
    }
  }else{
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projected.expandByPoint(point.set(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  }
  const offset=projected.getCenter(new THREE.Vector3()).setZ(0).applyQuaternion(camera.quaternion);
  controls.target.add(offset);camera.position.add(offset);camera.updateMatrixWorld();
  const halfX=(projected.max.x-projected.min.x)/2,halfY=(projected.max.y-projected.min.y)/2;
  const width=stage.clientWidth,height=stage.clientHeight,margin=36;
  const worldPixel=Math.max(2*halfX/Math.max(1,width-2*margin),2*halfY/Math.max(1,height-2*margin));
  camera.left=-width*worldPixel/2;camera.right=-camera.left;camera.top=height*worldPixel/2;camera.bottom=-camera.top;
  camera.updateProjectionMatrix();controls.update();render();
}
function activeBounds(){
  const view=data.views.find(v=>v.id===state.view);if(!view?.nodes?.length)return sceneBounds;
  const box=new THREE.Box3();for(const id of view.nodes){const n=byId.get(id);if(n){box.expandByPoint(new THREE.Vector3(n.x,0,n.z));box.expandByPoint(new THREE.Vector3(n.x+n.w,n.h,n.z+n.d));}}
  return box.isEmpty()?sceneBounds:box;
}
function resize(){
  const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);labels.setSize(width,height);fit(activeBounds());
}
function setView(id){state.view=id;document.querySelectorAll('.ch').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));fit(activeBounds());}
const side=document.getElementById('side'),panel=document.getElementById('pb');
for(const group of new Set(data.nodes.map(n=>n.group))){
  const nodes=data.nodes.filter(n=>n.group===group),heading=document.createElement('div');heading.className='gh';
  heading.innerHTML='<span>'+escape(group)+'</span><span>'+nodes.length+'</span>';side.append(heading);
  for(const n of nodes){const button=document.createElement('button');button.className='row'+(n.state==='removed'?' ghost':'');button.dataset.node=n.id;
    button.innerHTML='<span class="cd">'+escape(n.code)+'</span><span class="nm">'+escape(n.name)+'</span>';button.addEventListener('click',()=>{select(n.id);side.classList.remove('open');});side.append(button);}
}
const chapters=document.getElementById('chapters');
chapters.innerHTML='<span class="lbl">Views</span>';
for(const view of data.views){const button=document.createElement('button');button.className='ch';button.dataset.view=view.id;button.textContent=view.label;button.setAttribute('aria-pressed',String(view.id==='all'));button.addEventListener('click',()=>setView(view.id));chapters.append(button);}
function showPanel(){
  const n=byId.get(state.selected);
  document.getElementById('selected-heading').textContent=n?n.code+' · '+n.name:'System overview';
  if(!n){panel.innerHTML=data.introHtml;return;}
  const content=state.tab==='does'?n.does:n.built;
  panel.innerHTML='<div class="k">'+escape(n.group)+'</div><h2 class="pt">'+escape(n.name)+'</h2><p class="ps">'+escape(n.code)+' · '+escape(n.type)+'</p><div class="k">'+(state.tab==='does'?'What it does':'How it is built')+'</div><p>'+escape(content)+'</p><dl class="facts">'+n.facts.map(([key,value])=>'<dt>'+escape(key)+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>';
  const connections=data.routes.filter(r=>r.from===n.id||r.to===n.id);
  panel.innerHTML+='<div class="k">Connections</div><div class="cxs">'+connections.map(r=>'<div class="cx"><span class="cxa">'+escape(byId.get(r.from).code)+'</span><span>→</span><span class="cxa">'+escape(byId.get(r.to).code)+'</span><span class="cxl">'+escape(r.label)+'</span></div>').join('')+'</div>';
}
function select(id){state.selected=id;common.uSelected.value=data.nodes.findIndex(n=>n.id===id);document.querySelectorAll('[data-node]').forEach(e=>e.classList.toggle('on',e.dataset.node===id));showPanel();render();}
for(const tab of ['does','built'])document.getElementById('t'+tab).addEventListener('click',()=>{state.tab=tab;for(const other of ['does','built'])document.getElementById('t'+other).setAttribute('aria-selected',String(tab===other));showPanel();});
for(const id of ['reset','mreset'])document.getElementById(id).addEventListener('click',()=>{select(null);setView('all');});
document.getElementById('export').addEventListener('click',()=>{
  render();
  const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;
  const context=image.getContext('2d');context.drawImage(canvas,0,0);
  const rect=stage.getBoundingClientRect(),scale=image.width/rect.width;context.scale(scale,scale);
  for(const element of labelHost.children){
    const style=getComputedStyle(element),r=element.getBoundingClientRect();
    if(style.display==='none'||style.visibility==='hidden'||r.right<rect.left||r.left>rect.right||r.bottom<rect.top||r.top>rect.bottom)continue;
    context.fillStyle=style.backgroundColor;context.fillRect(r.left-rect.left,r.top-rect.top,r.width,r.height);
    const textStyle=getComputedStyle(element.querySelector('b')||element);
    context.font=textStyle.font;context.fillStyle=style.color;context.textAlign='center';context.textBaseline='middle';
    context.fillText(element.textContent,r.left-rect.left+r.width/2,r.top-rect.top+r.height/2);
  }
  image.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='atlas-prism.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
});
for(const id of ['theme','mtheme'])document.getElementById(id).addEventListener('click',()=>applyTheme(state.theme==='dark'?'light':'dark'));
document.getElementById('menuBtn').addEventListener('click',()=>side.classList.add('open'));
document.getElementById('sideClose').addEventListener('click',()=>side.classList.remove('open'));
document.getElementById('grab').addEventListener('click',()=>document.getElementById('mid').classList.toggle('expanded'));
window.addEventListener('keydown',event=>{if(event.key==='Escape'){select(null);setView('all');side.classList.remove('open');}});
const raycaster=new THREE.Raycaster();let down=null;
canvas.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};});
canvas.addEventListener('click',event=>{
  if(!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>4)return;
  const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera);
  select(raycaster.intersectObjects(pickMeshes)[0]?.object.userData.id??null);
});
function applyTheme(theme){
  state.theme=theme;const p=palette[theme];for(const name of ['Paper','Ink','Accent','Warm'])common['u'+name].value.setHex(p[name.toLowerCase()]);
  renderer.setClearColor(p.paper);document.documentElement.dataset.theme=theme;document.getElementById('theme').textContent=theme==='dark'?'Light':'Dark';render();
}
function render(){
  common.uWorldPixel.value=(camera.top-camera.bottom)/(Math.max(1,stage.clientHeight)*camera.zoom);
  flowDot.scale.setScalar(common.uWorldPixel.value*4);
  flowDot.material.color.copy(common.uAccent.value);
  renderer.render(scene,camera);labels.render(scene,camera);
  const used=[];
  for(const {element} of nodeLabels){const r=element.getBoundingClientRect();used.push(r);}
  const overlap=(a,b)=>a.left<b.right+6&&a.right>b.left-6&&a.top<b.bottom+4&&a.bottom>b.top-4;
  for(const entry of zoneLabels){
    entry.element.style.visibility='visible';const r=entry.element.getBoundingClientRect();
    if(used.some(b=>overlap(r,b)))entry.element.style.visibility='hidden';else used.push(r);
  }
  for(const entry of routeLabels){
    const show=state.projection==='flow'||camera.zoom>=1.35||entry.from===state.selected||entry.to===state.selected;
    entry.element.style.visibility=show?'visible':'hidden';
    if(show){const r=entry.element.getBoundingClientRect();if(used.some(b=>overlap(r,b)))entry.element.style.visibility='hidden';else used.push(r);}
  }
  document.getElementById('zoomnote').classList.toggle('show',camera.zoom<1.35&&!state.selected);
}
let frame=0,lastTime=null;
const flowSelect=document.getElementById('flow-select'),playButton=document.getElementById('play');
for(const [index,flow] of (data.flows||[]).entries()){
  const option=document.createElement('option');option.value=index;option.textContent=flow.label;flowSelect.append(option);
}
function updatePlayback(){
  const hop=playback.current(),p=playback.state;
  playButton.textContent=p.playing?'Pause':'Play';playButton.setAttribute('aria-pressed',String(p.playing));
  const status=document.getElementById('flow-status');
  status.textContent=hop?`${p.step+1} / ${data.flows[p.flow].steps.length} · ${hop.title}${p.finished?' · Complete':''}`:'No authored flows';
  document.getElementById('flow-story').textContent=hop?.story||'';
  common.uTraceNode.value=hop?data.nodes.findIndex(n=>n.id===hop.to):-1;
  routeMeshes.forEach((mesh,index)=>{mesh.material.uniforms.uTrace.value=hop?.route===index?1:0;});
  flowDot.visible=!!hop;
  if(hop){const position=pointOnRoute(data.routes[hop.route].points,p.progress);flowDot.position.set(position.x,0.09,position.z);}
  render();
}
function stopFrame(){cancelAnimationFrame(frame);frame=0;lastTime=null;}
function animate(time){
  frame=0;
  if(lastTime!==null)playback.tick(time-lastTime);
  lastTime=time;updatePlayback();
  if(playback.state.playing)frame=requestAnimationFrame(animate);else lastTime=null;
}
flowSelect.addEventListener('change',()=>{stopFrame();playback.choose(Number(flowSelect.value));updatePlayback();});
playButton.addEventListener('click',()=>{
  if(playback.state.playing){playback.pause();stopFrame();}else{playback.play();lastTime=null;frame=requestAnimationFrame(animate);}
  updatePlayback();
});
document.getElementById('step').addEventListener('click',()=>{stopFrame();playback.step();updatePlayback();});
document.getElementById('restart-flow').addEventListener('click',()=>{stopFrame();playback.restart();updatePlayback();});
for(const button of document.querySelectorAll('[data-projection]'))button.addEventListener('click',()=>{
  state.projection=button.dataset.projection;
  document.querySelectorAll('[data-projection]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.projection===state.projection)));
  document.getElementById('projection-note').textContent=state.projection==='flow'?'Atlas · Flow / top view':'Atlas · 2:1 dimetric';
  fit(activeBounds());
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){playback.pause();stopFrame();updatePlayback();}});
for(const id of ['flow-select','play','step','restart-flow'])document.getElementById(id).disabled=!data.flows?.length;
controls.addEventListener('change',render);
new ResizeObserver(resize).observe(stage);
showPanel();applyTheme('dark');resize();updatePlayback();
window.AtlasPrism={renderer,scene,camera,controls,state,sceneBounds,prismMaterial,gridMaterial,render,playback,routeMeshes,flowDot};
