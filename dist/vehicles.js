import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// Original reference-based models. Metres, +Z forward, +Y up.
const paint = color => new THREE.MeshPhysicalMaterial({color,metalness:.68,roughness:.24,clearcoat:1,clearcoatRoughness:.13});
const materials = {
  chrome:new THREE.MeshStandardMaterial({color:'#b6bdc1',metalness:.94,roughness:.2}),
  black:new THREE.MeshStandardMaterial({color:'#11161a',metalness:.45,roughness:.34}),
  rubber:new THREE.MeshStandardMaterial({color:'#121516',roughness:.88}),
  glass:new THREE.MeshPhysicalMaterial({color:'#16252e',metalness:.55,roughness:.09,clearcoat:1}),
  brake:new THREE.MeshStandardMaterial({color:'#687077',metalness:.88,roughness:.42}),
  red:new THREE.MeshStandardMaterial({color:'#b41f13',roughness:.4}),
  led:new THREE.MeshStandardMaterial({color:'#ebf6ff',emissive:'#d5e9ff',emissiveIntensity:2}),
  tail:new THREE.MeshStandardMaterial({color:'#a91813',emissive:'#f41e12',emissiveIntensity:.8}),
  amber:new THREE.MeshStandardMaterial({color:'#f4a843',emissive:'#d7771d',emissiveIntensity:.3}),
};
function add(g,geo,m,pos=[0,0,0]) {const o=new THREE.Mesh(geo,m);o.position.set(...pos);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
function rounded(g,size,pos,m,r=.045){return add(g,new RoundedBoxGeometry(...size,3,r),m,pos);}
function box(g,size,pos,m){return add(g,new THREE.BoxGeometry(...size),m,pos);}
function ring(g,r,t,pos,m,axis='z',arc=Math.PI*2){const o=add(g,new THREE.TorusGeometry(r,t,8,40,arc),m,pos);if(axis==='x')o.rotation.y=Math.PI/2;return o;}
function cylinder(g,r,h,pos,m,axis='x'){const o=add(g,new THREE.CylinderGeometry(r,r,h,40),m,pos);o.rotation[axis==='x'?'z':'x']=Math.PI/2;return o;}
function path(g,points,r,m){return add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(12,points.length*5),r,6,false),m);}
function panel(g,points,m){const geo=new THREE.BufferGeometry();let verts=[],uv=[];for(let i=1;i<points.length-1;i++){for(const index of [0,i,i+1]){verts.push(...points[index]);uv.push(index===0?0:1,index===i?0:1);}}geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const o=add(g,geo,m);o.material.side=THREE.DoubleSide;return o;}
function outline(g,points,r,m){path(g,[...points,points[0]],r,m);}
function text(g,string,w,h,pos,color='#d9e2e8',background=null){
  const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');
  if(background){ctx.fillStyle=background;ctx.fillRect(0,0,768,128);}ctx.fillStyle=color;ctx.font='600 74px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(string,384,67,730);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return add(g,new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,transparent:!background,roughness:.38,metalness:.3,side:THREE.DoubleSide}),pos);
}
// Rounded longitudinal sections give the body actual curves, not a stack of boxes.
function shell(g,sections,m,bottom=.46){
  const vertices=[],uv=[],indices=[];const n=12;
  sections.forEach(([z,w,top],i)=>{
    const ringPts=[[-w*.84,bottom],[-w,bottom+.1],[-w,top-.16],[-w*.94,top-.04],[-w*.7,top+.015],[-w*.32,top+.04],[w*.32,top+.04],[w*.7,top+.015],[w*.94,top-.04],[w,top-.16],[w,bottom+.1],[w*.84,bottom]];
    ringPts.forEach(([x,y],j)=>{vertices.push(x,y,z);uv.push(j/(n-1),i/(sections.length-1));});
    if(i)for(let j=0;j<n;j++){const a=(i-1)*n+j,b=(i-1)*n+(j+1)%n,c=i*n+j,d=i*n+(j+1)%n;indices.push(a,c,b,b,c,d);}
  });
  for(let i=1;i<n-1;i++){indices.push(0,i,i+1);const end=(sections.length-1)*n;indices.push(end,end+i+1,end+i);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return add(g,geo,m);
}
function audiBadge(g,x,y,z,scale=1){for(let i=0;i<4;i++)ring(g,.075*scale,.011*scale,[x+(i-1.5)*.112*scale,y,z],materials.chrome);}
function mercedesBadge(g,x,y,z,scale=1){ring(g,.15*scale,.013*scale,[x,y,z],materials.chrome);for(let i=0;i<3;i++){let a=Math.PI/2+i*2*Math.PI/3;path(g,[[x,y,z+.005],[x+Math.cos(a)*.135*scale,y+Math.sin(a)*.135*scale,z+.005]],.012*scale,materials.chrome);}}
function teslaBadge(g,x,y,z,scale=1){path(g,[[x-.12*scale,y+.07*scale,z],[x,y+.09*scale,z],[x+.12*scale,y+.07*scale,z]],.012*scale,materials.chrome);panel(g,[[x-.085*scale,y+.04*scale,z],[x+.085*scale,y+.04*scale,z],[x+.025*scale,y,z],[x,y-.14*scale,z],[x-.025*scale,y,z]],materials.chrome);}
function wheel(g,side,z,r=.43,style='audi'){
  const cx=side*1.025,cy=r+.035,outer=cx+side*.155;
  // Dark wheel wells, a rounded tyre, bead, ventilated disc and separate spokes.
  cylinder(g,r+.055,.025,[side*1.004,cy,z],materials.black);
  const tire=ring(g,r-.09,.105,[cx,cy,z],materials.rubber,'x');tire.scale.z=1.25;
  cylinder(g,r-.085,.21,[cx,cy,z],materials.black);
  ring(g,r-.105,.022,[outer,cy,z],materials.chrome,'x');
  cylinder(g,r-.145,.018,[cx+side*.09,cy,z],materials.brake);
  rounded(g,[.055,.18,.085],[cx+side*.115,cy+.03,z+.2],materials.red,.012);
  const count=style==='tesla'?10:5;
  for(let i=0;i<count;i++){
    const a=i*Math.PI*2/count;
    for(const branch of (style==='tesla'?[0]:[-.032,.032])){
      const spoke=rounded(g,[.035,.033,r-.13],[outer,cy+Math.sin(a)*(r-.13)*.51+Math.cos(a)*branch,z+Math.cos(a)*(r-.13)*.51-Math.sin(a)*branch],style==='tesla'?materials.black:materials.chrome,.012);spoke.rotation.x=-a;
    }
  }
  cylinder(g,.075,.025,[outer+side*.015,cy,z],materials.chrome);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;cylinder(g,.012,.03,[outer+side*.027,cy+Math.sin(a)*.045,z+Math.cos(a)*.045],materials.black);}
  // Subtle tyre sidewall ridges.
  ring(g,r-.028,.006,[outer-.012*side,cy,z],materials.rubber,'x');
}
function arch(g,side,z,r,m){
  const pts=[];for(let i=0;i<=30;i++){const a=i/30*Math.PI;pts.push([side*1.047,.035+r+Math.sin(a)*(r+.058),z+Math.cos(a)*(r+.058)]);}path(g,pts,.034,m);
}
function plate(g,front,z,title){text(g,title,.47,.105,[0,.61,z],'#18232b','#d9dfdb').rotation.y=front?0:Math.PI;}
function seam(g,side,points){path(g,points.map(([z,y,x=1.01])=>[x*side,y,z]),.007,materials.black);}
function mirror(g,side,y,z,m){rounded(g,[.19,.07,.07],[side*1.045,y-.04,z],materials.black,.02);rounded(g,[.24,.14,.28],[side*1.16,y,z],m,.05);rounded(g,[.19,.085,.012],[side*1.17,y,z-.141],materials.chrome,.018);}

function crossoverWindows(g,kind,body){
  const tesla=kind==='tesla';
  const levels=tesla?[[-1.95,.62,1.24],[-1.35,.77,1.62],[-.65,.79,1.76],[.12,.78,1.77],[.75,.77,1.57],[1.23,.88,1.22]]:[[-1.82,.78,1.35],[-1.22,.83,1.72],[-.55,.85,1.79],[.38,.84,1.76],[1.12,.94,1.28]];
  shell(g,levels,materials.glass,1.14);
  // Side glazing follows each roof section; the painted C-pillar remains visible.
  for(const side of [-1,1]){
    const pts=tesla?[[.963,1.225,1.1],[.787,1.565,.69],[.8,1.704,.11],[.811,1.694,-.66],[.79,1.565,-1.27],[.929,1.245,-1.7]]:[[.975,1.255,1.0],[.862,1.687,.34],[.872,1.715,-.55],[.854,1.645,-1.15],[.97,1.27,-1.57]];
    const points=pts.map(([x,y,z])=>[side*x,y,z]);panel(g,points,materials.glass);outline(g,points,.018,tesla?materials.chrome:materials.black);
    path(g,[[side*.96,1.23,tesla?1.15:1.06],[side*(tesla?.80:.86),tesla?1.61:1.73,tesla?.71:.37],[side*(tesla?.81:.87),tesla?1.78:1.8,tesla?.12:-.55]],.031,body);
    path(g,[[side*(tesla?.79:.85),tesla?1.66:1.73,tesla?-1.35:-1.2],[side*.96,1.23,tesla?-1.9:-1.76]],.045,body);
    path(g,[[side*.982,1.25,-.22],[side*(tesla?.815:.885),tesla?1.73:1.75,-.24]],.037,materials.black);
    if(!tesla)path(g,[[side*.98,1.27,-1.07],[side*.875,1.7,-1.02]],.022,materials.black);
    seam(g,side,[[.9,1.2],[.88,.68],[.76,.58],[-.2,.58],[-.26,1.22]]);
    seam(g,side,[[-.26,1.22],[-.23,.58],[-1.12,.58],[-1.35,.91],[-1.38,1.23]]);
    for(const z of [.05,-1.0])rounded(g,[.035,.035,.22],[side*1.026,1.16,z],tesla?materials.chrome:body,.014);
    mirror(g,side,1.37,.8,body);
    path(g,[[side*1.02,.58,-1.84],[side*1.045,.55,0],[side*1.01,.58,1.85]],.028,materials.black);
  }
  const wind=tesla?[[-.88,1.265,1.22],[.88,1.265,1.22],[.765,1.61,.69],[.77,1.76,.12],[-.77,1.76,.12],[-.765,1.61,.69]]:[[-.92,1.31,1.1],[.92,1.31,1.1],[.814,1.752,.38],[-.814,1.752,.38]];
  panel(g,wind,materials.glass);outline(g,wind,.018,materials.black);
  panel(g,tesla?[[-.75,1.765,.1],[.75,1.765,.1],[.76,1.755,-.64],[.735,1.62,-1.29],[-.735,1.62,-1.29],[-.76,1.755,-.64]]:[[-.76,1.8,.27],[.76,1.8,.27],[.79,1.805,-.6],[.77,1.74,-1.1],[-.77,1.74,-1.1],[-.79,1.805,-.6]],materials.glass);
  panel(g,tesla?[[-.71,1.6,-1.38],[.71,1.6,-1.38],[.59,1.29,-1.97],[-.59,1.29,-1.97]]:[[-.77,1.7,-1.24],[.77,1.7,-1.24],[.72,1.37,-1.8],[-.72,1.37,-1.8]],materials.glass);
  // Windscreen wipers.
  for(const x of [-.4,.38])path(g,[[x-.22,1.33,1.06],[x+.18,1.37,1.01]],.009,materials.black);
}

function makeAudi(){
  const g=new THREE.Group();g.name='Audi RS Q8 · silver';const body=paint('#a9afb3');
  shell(g,[[-2.45,.82,1.02],[-2.27,.99,1.21],[-1.5,1.035,1.29],[-.3,1.015,1.29],[.95,1.025,1.28],[1.65,1.02,1.23],[2.25,.96,1.12],[2.47,.83,1.04]],body);
  rounded(g,[1.98,.18,4.45],[0,.47,0],materials.black,.07);
  crossoverWindows(g,'audi',body);
  for(const s of [-1,1])for(const z of [-1.46,1.47]){wheel(g,s,z,.445,'audi');arch(g,s,z,.445,body);}
  const grille=[[-.57,.55,2.48],[.57,.55,2.48],[.75,.74,2.48],[.64,1.035,2.48],[-.64,1.035,2.48],[-.75,.74,2.48]];
  panel(g,grille,materials.black);outline(g,grille,.024,materials.chrome);
  // Honeycomb follows the six-sided grille silhouette.
  for(let y=.62;y<1.0;y+=.072)for(let x=-.62;x<.65;x+=.085){if(Math.abs(x)>.55&&y<.7)continue;const pts=[];for(let k=0;k<7;k++){const a=k*Math.PI/3;pts.push([x+Math.cos(a)*.043,y+Math.sin(a)*.036,2.492]);}path(g,pts,.006,materials.brake);}
  audiBadge(g,0,.94,2.525,1.1);rounded(g,[.09,.05,.02],[-.43,.83,2.516],materials.red,.005);text(g,'RS',.1,.055,[-.32,.83,2.522]);
  for(const s of [-1,1]){
    const lamp=[[s*.67,1.09,2.43],[s*.98,1.1,2.23],[s*.98,1.22,2.14],[s*.65,1.22,2.37]];
    panel(g,lamp,materials.black);path(g,[[s*.66,1.21,2.39],[s*.91,1.205,2.23],[s*.97,1.18,2.21]],.019,materials.led);
    for(let i=0;i<4;i++)path(g,[[s*(.72+i*.055),1.17,2.38-i*.035],[s*(.72+i*.055),1.12,2.38-i*.035]],.008,materials.led);
    rounded(g,[.32,.24,.075],[s*.84,.72,2.3],materials.black,.035);
    path(g,[[s*.63,1.23,1.1],[s*.59,1.24,1.65],[s*.48,1.14,2.18]],.008,body);
    rounded(g,[.34,.09,.07],[s*.8,.52,-2.43],materials.chrome,.025);
    path(g,[[s*.95,1.15,-2.23],[s*.7,1.17,-2.45],[s*.2,1.17,-2.48]],.03,materials.tail);
  }
  path(g,[[-.72,1.175,-2.48],[0,1.18,-2.49],[.72,1.175,-2.48]],.012,materials.tail);
  audiBadge(g,0,1.06,-2.49,.8);plate(g,true,2.51,'RS Q8');plate(g,false,-2.48,'RS Q8');
  rounded(g,[1.74,.065,.24],[0,1.42,-1.97],materials.black,.025);
  return g;
}

function makeTesla(){
  const g=new THREE.Group();g.name='Tesla Model X · pearl white';const body=paint('#e6e6e1');
  shell(g,[[-2.48,.72,.97],[-2.27,.98,1.19],[-1.62,1.02,1.29],[-.55,1.01,1.28],[.65,1.0,1.26],[1.44,1.0,1.18],[2.06,.93,1.05],[2.48,.75,.94]],body,.43);
  rounded(g,[1.88,.13,4.35],[0,.46,0],materials.black,.06);crossoverWindows(g,'tesla',body);
  for(const s of [-1,1])for(const z of [-1.47,1.46]){wheel(g,s,z,.43,'tesla');arch(g,s,z,.43,body);}
  for(const s of [-1,1]){
    const lamp=[[s*.49,1.06,2.37],[s*.87,1.1,2.1],[s*.92,1.02,2.12],[s*.59,.98,2.37]];
    panel(g,lamp,materials.black);path(g,[[s*.52,1.057,2.39],[s*.81,1.09,2.19],[s*.89,1.05,2.14]],.016,materials.led);
    rounded(g,[.17,.04,.04],[s*.79,.68,2.21],materials.led,.012);
    path(g,[[s*.63,1.245,1.07],[s*.57,1.22,1.5],[s*.38,1.09,2.11]],.007,materials.chrome);
    path(g,[[s*.97,1.1,-2.2],[s*.74,1.14,-2.42],[s*.3,1.14,-2.46]],.029,materials.tail);
    path(g,[[s*.93,1.04,-2.23],[s*.72,1.065,-2.43]],.012,materials.tail);
  }
  rounded(g,[1.3,.13,.07],[0,.61,2.43],materials.black,.045);
  teslaBadge(g,0,1.045,2.45,.7);teslaBadge(g,0,1.23,-2.41,.6);
  path(g,[[-.77,1.045,-2.45],[0,1.06,-2.49],[.77,1.045,-2.45]],.015,materials.chrome);
  rounded(g,[1.65,.06,.2],[0,1.31,-2.02],body,.025);text(g,'M O D E L   X',.46,.07,[.52,.85,-2.46]).rotation.y=Math.PI;
  plate(g,true,2.47,'MODEL X');plate(g,false,-2.49,'MODEL X');
  // Charging cable from the rear-left charge port to the reference bay.
  return g;
}

function makeMercedes(){
  const g=new THREE.Group();g.name='Mercedes-Benz G-Class · forest green';const body=paint('#173e32');
  rounded(g,[1.94,.67,4.5],[0,.94,-.02],body,.075);rounded(g,[1.98,.17,4.55],[0,.53,-.02],materials.black,.045);
  rounded(g,[1.78,.77,2.83],[0,1.55,-.55],body,.04);rounded(g,[1.86,.075,2.94],[0,1.97,-.55],body,.03);
  rounded(g,[1.82,.16,1.25],[0,1.35,1.53],body,.045);
  for(const s of [-1,1]){
    for(const z of [-1.4,1.4]){wheel(g,s,z,.44,'mercedes');arch(g,s,z,.44,body);rounded(g,[.22,.13,1.13],[s*.98,1.02,z],body,.035);}
    rounded(g,[.035,.56,.85],[s*.908,1.58,.2],materials.glass,.025);
    rounded(g,[.035,.56,.77],[s*.908,1.58,-.7],materials.glass,.022);
    rounded(g,[.035,.56,.52],[s*.908,1.58,-1.43],materials.glass,.022);
    rounded(g,[.035,.055,3.7],[s*.985,1.08,-.05],materials.black,.014);
    path(g,[[s*.999,1.1,-1.87],[s*.999,1.1,1.8]],.009,materials.chrome);
    rounded(g,[.26,.085,2.42],[s*1.05,.43,-.05],materials.chrome,.025);
    for(const z of [-.18,-1.03]){rounded(g,[.065,.06,.23],[s*.956,1.22,z],materials.black,.012);seam(g,s,[[z+.38,1.93,.935],[z+.38,.65,.985],[z-.45,.65,.985],[z-.45,1.92,.935]]);}
    for(const z of [.6,-.28])for(const y of [.86,1.26])rounded(g,[.085,.075,.15],[s*.985,y,z],body,.012);
    mirror(g,s,1.43,.69,body);
    rounded(g,[.19,.085,.18],[s*.77,1.49,1.95],materials.amber,.025);
    rounded(g,[.34,.14,.08],[s*.7,.74,-2.3],materials.tail,.025);
    for(const z of [-.84,-1.08]){const exhaust=cylinder(g,.065,.25,[s*1.1,.36,z],materials.chrome);cylinder(g,.048,.26,[s*1.11,.36,z],materials.black);}
    path(g,[[s*.82,2.04,-1.85],[s*.82,2.04,.79]],.026,materials.black);
  }
  rounded(g,[1.61,.59,.03],[0,1.6,.886],materials.glass,.025);
  box(g,[.035,.62,.04],[0,1.6,.908],body);
  rounded(g,[1.54,.55,.04],[0,1.58,-1.99],materials.glass,.025);
  for(const x of [-.39,.36])path(g,[[x-.2,1.34,.93],[x+.16,1.37,.94]],.011,materials.black);
  rounded(g,[1.06,.45,.07],[0,1.13,2.27],materials.black,.045);
  for(let x=-.44;x<.46;x+=.11)rounded(g,[.026,.36,.03],[x,1.13,2.315],materials.chrome,.01);
  mercedesBadge(g,0,1.15,2.35,1.1);
  for(const s of [-1,1]){cylinder(g,.22,.06,[s*.72,1.15,2.28],materials.black,'z');ring(g,.17,.018,[s*.72,1.15,2.325],materials.led);cylinder(g,.12,.063,[s*.72,1.15,2.3],materials.glass,'z');rounded(g,[.55,.21,.09],[s*.66,.7,2.3],materials.black,.025);}
  rounded(g,[1.97,.2,.24],[0,.56,2.27],body,.04);plate(g,true,2.402,'G 63');
  // Exposed rear spare wheel with a painted hard cover.
  cylinder(g,.48,.24,[0,1.18,-2.42],materials.rubber,'z');cylinder(g,.43,.26,[0,1.18,-2.44],body,'z');ring(g,.43,.025,[0,1.18,-2.579],materials.chrome);
  mercedesBadge(g,0,1.18,-2.583,.9);text(g,'AMG',.25,.08,[-.65,1.02,-2.29]).rotation.y=Math.PI;plate(g,false,-2.3,'G 63');
  return g;
}

export function createVehicles(parent,obstacle){
  const definitions=[{id:'audi',name:'Audi RS Q8',factory:makeAudi,x:-18,z:5,rotation:.12},{id:'tesla',name:'Tesla Model X',factory:makeTesla,x:26,z:13.5,rotation:-Math.PI/2},{id:'mercedes',name:'Mercedes-Benz G-Class',factory:makeMercedes,x:8,z:10,rotation:-.5}];
  return definitions.map(d=>{const group=d.factory();group.position.set(d.x,.04,d.z);group.rotation.y=d.rotation;group.userData={vehicle:d.id,displayName:d.name,source:'Original geometry reconstructed from user reference'};parent.add(group);const s=Math.abs(Math.sin(d.rotation)),c=Math.abs(Math.cos(d.rotation));obstacle(d.x,d.z,2.4*c+5.2*s,5.2*c+2.4*s);return {...d,group};});
}
