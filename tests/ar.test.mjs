import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import validator from 'gltf-validator';
import { sceneViewerIntent, arStatus } from '../dist/ar-utils.js';

test('Android link uses public project URL, Google app and a non-looping fallback',()=>{
 const page='https://vdenis.github.io/pine-station/ar.html?v=4';
 const intent=sceneViewerIntent('assets/pine-station-ar.glb?v=4',page);
 const [url,options]=intent.split('#Intent;');const params=new URL(url).searchParams;
 assert.equal(params.get('file'),'https://vdenis.github.io/pine-station/assets/pine-station-ar.glb?v=4');
 assert.equal(params.get('mode'),'ar_preferred');assert.equal(params.get('resizable'),'true');
 assert.match(options,/package=com.google.android.googlequicksearchbox;/);
 const fallback=decodeURIComponent(options.match(/S.browser_fallback_url=([^;]+)/)[1]);
 assert.equal(new URL(fallback).searchParams.get('ar-fallback'),'1');
 assert.throws(()=>sceneViewerIntent('/model.glb','http://example.com/ar.html'),/HTTPS/);
});
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
