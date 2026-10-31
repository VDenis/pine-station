import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, textureCompress, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { BoxGeometry, Matrix4, Vector3 } from 'three';
import { writeFile, stat } from 'node:fs/promises';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('dist/assets/pine-station.glb');
const root = doc.getRoot();
// Retain the station grounds. The presentation's 650 m landscape is unsuitable for tabletop AR.
for (const node of root.listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const matrix = new Matrix4().fromArray(node.getWorldMatrix());
  for (const prim of [...mesh.listPrimitives()]) {
    const positions = prim.getAttribute('POSITION');
    const indices = prim.getIndices()?.getArray() || Uint32Array.from({length:positions.getCount()}, (_,i)=>i);
    const keep=[]; const p=new Vector3(); const v=[];
    for(let i=0;i<positions.getCount();i++){
      positions.getElement(i,v);p.fromArray(v).applyMatrix4(matrix);
      keep[i]=Math.abs(p.x)<=36.5 && p.z>=-30 && p.z<=30 && p.y>=-.25 && p.y<=28;
    }
    const next=[];
    for(let i=0;i<indices.length;i+=3)if(keep[indices[i]]&&keep[indices[i+1]]&&keep[indices[i+2]])next.push(indices[i],indices[i+1],indices[i+2]);
    if(!next.length){mesh.removePrimitive(prim);prim.dispose();continue;}
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(next)).setBuffer(root.listBuffers()[0]));
    compactPrimitive(prim);
  }
  if(!mesh.listPrimitives().length)node.setMesh(null);
}
// A discrete base makes the asset a grounded architectural miniature.
const geo = new BoxGeometry(72,.24,59);geo.translate(0,-.12,0);
const prim=doc.createPrimitive();
for(const [name,semantic] of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']]){
 const a=geo.getAttribute(name);prim.setAttribute(semantic,doc.createAccessor().setType(a.itemSize===3?'VEC3':'VEC2').setArray(a.array).setBuffer(root.listBuffers()[0]));
}
prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(geo.index.array).setBuffer(root.listBuffers()[0]));
prim.setMaterial(doc.createMaterial('AR base').setBaseColorFactor([.10,.13,.14,1]).setRoughnessFactor(.7));
const base=doc.createNode('Miniature base').setMesh(doc.createMesh().addPrimitive(prim));root.listScenes()[0].listChildren()[0].addChild(base);
// Scene Viewer supports core metallic-roughness, unlit and texture transforms.
for(const ext of [...root.listExtensionsUsed()])if(!['KHR_materials_unlit','KHR_texture_transform'].includes(ext.extensionName))ext.dispose();
for(const node of root.listScenes()[0].listChildren())node.setScale([.0125,.0125,.0125]);
await MeshoptSimplifier.ready;
await doc.transform(prune(),dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.2,error:.008}),prune(),textureCompress({encoder:sharp,targetFormat:'png',resize:[512,512]}));
const output='dist/assets/pine-station-ar.glb';await io.write(output,doc);
const triangles=root.listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
const bytes=(await stat(output)).size;
if(bytes>10_000_000||triangles>100000)throw new Error(`AR budget exceeded: ${bytes} bytes / ${triangles} triangles`);
const report={bytes,triangles,materials:root.listMaterials().length,widthMetres:.9,extensions:root.listExtensionsUsed().map(e=>e.extensionName)};
await writeFile('dist/assets/ar-model-info.json',JSON.stringify(report,null,2)+'\n');console.log(report);
