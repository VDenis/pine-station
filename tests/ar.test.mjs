import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import validator from 'gltf-validator';
import { arStatus } from '../dist/ar-utils.js';

test('AR session states come from detail.status',()=>{assert.equal(arStatus({detail:{status:'session-started'}}),'session-started');assert.equal(arStatus({detail:{status:'failed'}}),'failed');});
test('AR asset validates and fits mobile size, geometry, bounds and extension budgets',async()=>{
 const bytes=await readFile('dist/assets/pine-station-ar.glb');assert.ok(bytes.length<10_000_000);
 const result=await validator.validateBytes(bytes);assert.equal(result.issues.numErrors,0);assert.equal(result.issues.numWarnings,0);
 const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);const root=doc.getRoot();
 const bounds=getBounds(root.listScenes()[0]);const width=bounds.max[0]-bounds.min[0];assert.ok(width>.85&&width<.95,`width ${width}`);assert.ok(bounds.min[1]>-.01);
 const triangles=root.listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+p.getIndices().getCount()/3,0);assert.ok(triangles<100000);
 assert.ok(root.listExtensionsUsed().every(e=>['KHR_materials_unlit','KHR_texture_transform'].includes(e.extensionName)));
 for(const car of ['Tesla','Audi','Mercedes'])assert.ok(root.listNodes().some(n=>n.getName().includes(car)),car);
});

test('one shared AR control launches synchronously on Android and iOS',async()=>{
 const {runInNewContext}=await import('node:vm');
 const code=(await readFile('dist/ar.js','utf8')).replace(/^import .*;\n/,'');
 async function boot(ua){
   const elements=new Map();const get=id=>{
     if(!elements.has(id))elements.set(id,{textContent:'',hidden:true,disabled:false,style:{},loaded:true,canActivateAR:true,events:{},getAttribute:()=> 'assets/pine-station-ar.glb?v=6',addEventListener(type,fn){(this.events[type]??=[]).push(fn);},querySelectorAll:()=>[]});
     return elements.get(id);
   };
   let requests=0;get('mv').activateAR=()=>{requests++;return Promise.resolve();};
   const window={addEventListener(){}};window.self=window;window.top=window;
   const location=new URL('https://vdenis.github.io/pine-station/ar.html?v=6');
   const document={getElementById:get,addEventListener(){},visibilityState:'visible'};
   const navigator={userAgent:ua,platform:'',maxTouchPoints:0,xr:{isSessionSupported:async()=>true}};
   runInNewContext(code,{document,navigator,window,location,isSecureContext:true,URL,URLSearchParams,customElements:{whenDefined:()=>Promise.resolve(),get:()=>true},setTimeout(){},setInterval(){},clearInterval(){},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},arStatus,console});
   await Promise.resolve();await Promise.resolve();
   return {get,requests:()=>requests};
 }
 const android=await boot('Android Chrome/140');
 assert.equal(android.get('start-ar').disabled,false);
 assert.equal(android.get('start-ar').textContent,'Посмотреть в AR');
 android.get('start-ar').events.click[0]();assert.equal(android.requests(),1);
 android.get('start-ar').disabled=true;android.get('start-ar').events.click[0]();assert.equal(android.requests(),1);
 assert.equal(android.get('start-ar').href,undefined);
 const ios=await boot('iPhone Safari');assert.equal(ios.get('start-ar').textContent,'Посмотреть в AR');
 ios.get('start-ar').events.click[0]();assert.equal(ios.requests(),1);
 const desktop=await boot('Macintosh Safari');assert.equal(desktop.get('start-ar').disabled,true);
});

test('page has one AR launch button and no native Google launch routes',async()=>{
 const html=await readFile('dist/ar.html','utf8');const js=await readFile('dist/ar.js','utf8');const utils=await readFile('dist/ar-utils.js','utf8');
 assert.equal((html.match(/<button[^>]*id="start-ar"/g)||[]).length,1);
 assert.match(html,/<span slot="ar-button" hidden aria-hidden="true"><\/span>/);
 assert.match(html,/ar-modes="webxr quick-look"/);
 assert.doesNotMatch(html+js+utils,/intent:\/\/|sceneViewerIntent|scene-viewer|ar-test|id="webxr"|pine-ar-native/);
});
