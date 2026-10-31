import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Reflector } from './vendor/Reflector.js';
import { mergeGeometries, mergeVertices } from './vendor/BufferGeometryUtils.js';
import { createVehicles } from './vehicles.js';

const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#a69a97', .0035);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('scene').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(innerWidth < 700 ? 65 : 48, innerWidth / innerHeight, .1, 850);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .065;
controls.minDistance = 5; controls.maxDistance = 125; controls.maxPolarAngle = Math.PI / 2 - .025;
controls.target.set(0, 2, -3);
camera.position.set(53, 31, 59);
const model = new THREE.Group(); model.name = 'Pine Station'; scene.add(model);
let seed = 37;
function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
const materialCache = new Map();
const mat = (color, roughness = .7, metalness = 0) => {
  const key=`${color}/${roughness}/${metalness}`;
  if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return materialCache.get(key);
};
const M = {
  wood: mat('#825135'), woodLight: mat('#a87549'), woodDark: mat('#3f2a21'), stone: mat('#8d8580'),
  roof: mat('#303944', .78), edge: mat('#1f2527', .4, .55), cream: mat('#d8d2c4', .35, .25),
  red: mat('#be2c23', .34, .35), glass: new THREE.MeshPhysicalMaterial({ color:'#283c43', roughness:.11,metalness:.45,clearcoat:1 }),
  tire: mat('#181b1c', .85), chrome: mat('#a7afb0', .24, .9), asphalt: mat('#353c40', .3),
  green: mat('#18382e', .26, .6), silver: mat('#b2b5b4', .23, .7), white: mat('#ebe8de', .23, .45),
  grass: mat('#4c5140'), dirt: mat('#544a3c'), curb: mat('#a5a29a'), line: mat('#c8c3a7'), yellow: mat('#d1a552'),
  glow: new THREE.MeshStandardMaterial({color:'#ffdb92',emissive:'#ffb44d',emissiveIntensity:3.3}),
  window: new THREE.MeshStandardMaterial({color:'#946035',emissive:'#ffac4e',emissiveIntensity:.4,roughness:.22,metalness:.3}),
  headlight: new THREE.MeshStandardMaterial({color:'#ebf7ff',emissive:'#baddff',emissiveIntensity:2.2}),
  taillight: new THREE.MeshStandardMaterial({color:'#db251b',emissive:'#ff2108',emissiveIntensity:1.5}),
};
function mesh(geometry, material, x=0,y=0,z=0,parent=model) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(w,h,d,x,y,z,material,parent=model) { return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent); }
function cyl(r1,r2,h,x,y,z,material,parent=model,segments=12) { return mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material,x,y,z,parent); }
function sphere(r,x,y,z,material,parent=model) { return mesh(new THREE.SphereGeometry(r,12,8),material,x,y,z,parent); }
function beam(a,b,r,material,parent=model) {
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b); const o=cyl(r,r,av.distanceTo(bv),...av.clone().add(bv).multiplyScalar(.5).toArray(),material,parent,8);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize()); return o;
}
function tube(points,r,material,parent=model) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,6,false),material,0,0,0,parent); }
function label(text,width,height,x,y,z,color='#ffe5b5',bg=null,parent=model) {
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');
  if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);} ctx.fillStyle=color;ctx.font='600 96px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,132,990);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.MeshBasicMaterial({map:tex,transparent:!bg,side:THREE.DoubleSide}); return mesh(new THREE.PlaneGeometry(width,height),m,x,y,z,parent);
}
function noiseTexture(type) {
  const c=document.createElement('canvas'); c.width=c.height=512; const ctx=c.getContext('2d');
  ctx.fillStyle=type==='wood'?'#94623b':'#3c424a';ctx.fillRect(0,0,512,512);
  for(let i=0;i<3600;i++) {const a=rand();ctx.strokeStyle=`rgba(${a>.5?'255,224,175':'8,13,20'},${rand()*.16})`;ctx.lineWidth=rand()*2+.3;ctx.beginPath();const x=rand()*512,y=rand()*512;ctx.moveTo(x,y);ctx.lineTo(x+(type==='wood'?rand()*5:rand()*45),y+(type==='wood'?rand()*150:0));ctx.stroke();}
  if(type==='roof'){for(let y=0;y<512;y+=32){ctx.fillStyle='#171d2544';ctx.fillRect(0,y,512,2);for(let x=0;x<512;x+=64){ctx.fillRect(x+(y%64?32:0),y,2,32);}}}
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(type==='wood'?2:4,type==='wood'?1:3); t.anisotropy=4; return t;
}
M.wood.map=noiseTexture('wood'); M.wood.color.set('#d1b28d'); M.roof.map=noiseTexture('roof');M.roof.color.set('#b4b8bd');

// A procedural sky also supplies real environment reflections to the materials.
const skyMaterial = new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sunDir:{value:new THREE.Vector3(-.62,.13,-.77).normalize()}},vertexShader:`varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
varying vec3 vPosition; uniform vec3 sunDir;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.07+3.1;a*=.5;}return n;}
void main(){vec3 d=normalize(vPosition);float h=max(d.y,0.);vec3 col=mix(vec3(1.,.62,.37),vec3(.24,.35,.51),smoothstep(0.,.75,h));float s=max(dot(d,sunDir),0.);col+=vec3(1.,.5,.18)*pow(s,12.)*.5;col+=vec3(1.,.65,.25)*pow(s,130.)*.5;col+=vec3(3.5,2.3,1.2)*smoothstep(.9994,.99985,s);vec2 uv=d.xz/(max(d.y,.035)+.23);float n=fbm(uv*2.6);float cloud=smoothstep(.46,.65,n)*smoothstep(.01,.14,h)*(1.-smoothstep(.6,.95,h));vec3 cloudCol=mix(vec3(.36,.30,.38),vec3(1.,.65,.45),pow(s,4.)*.8);col=mix(col,cloudCol,cloud*.8);col=mix(vec3(.48,.46,.43),col,smoothstep(-.15,.02,d.y));gl_FragColor=vec4(col,1.);}`});
const sky = new THREE.Mesh(new THREE.SphereGeometry(420,48,32),skyMaterial);sky.frustumCulled=false;scene.add(sky);
const envScene=new THREE.Scene();envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),skyMaterial));
const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(envScene,.025,.1,100);scene.environment=env.texture;scene.environmentIntensity=.38;pmrem.dispose();
scene.add(new THREE.HemisphereLight('#c2d3ea','#644735',.95));
const sun=new THREE.DirectionalLight('#ffbd79',3.2);sun.position.set(-60,30,-75);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;sun.shadow.camera.near=1;sun.shadow.camera.far=220;sun.shadow.bias=-.0004;sun.shadow.normalBias=.08;scene.add(sun);

// Grounds, surrounding road and wet tarmac.
box(650,1,650,0,-.7,0,M.grass).name='Forest floor';
box(72,.22,59,0,-.13,0,M.asphalt).name='Station asphalt';
box(500,.09,10,0,-.03,37,M.asphalt);
for(const x of [-1,1])box(500,.012,.1,0,.03,37+x*.16,M.yellow);
for(let x=-245;x<250;x+=7){box(3.5,.012,.13,x,.035,32.8,M.line);box(3.5,.012,.13,x,.035,41.2,M.line);}
const wetGround=new Reflector(new THREE.PlaneGeometry(71.8,58.8),{textureWidth:Math.min(innerWidth,1536),textureHeight:Math.min(innerHeight,1024),clipBias:.003,color:0x60686b});
wetGround.rotation.x=-Math.PI/2;wetGround.position.y=.005;wetGround.name='Wet reflections';
wetGround.material.vertexShader=wetGround.material.vertexShader.replace('void main()', 'varying vec2 vGround; void main()').replace('vUv = textureMatrix * vec4( position, 1.0 );','vUv = textureMatrix * vec4( position, 1.0 ); vGround = position.xy;');
wetGround.material.fragmentShader=`uniform vec3 color;uniform sampler2D tDiffuse;varying vec4 vUv;varying vec2 vGround;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){vec2 uv=vUv.xy/vUv.w;float n=noise(vGround*19.);vec2 j=vec2(n-.5,noise(vGround*21.)-.5)*.001;vec3 r=texture2D(tDiffuse,uv+j).rgb*.4;r+=texture2D(tDiffuse,uv+j+vec2(.0015,.003)).rgb*.3;r+=texture2D(tDiffuse,uv+j-vec2(.0015,.003)).rgb*.3;float puddle=smoothstep(.25,.8,noise(vGround*.7));vec3 base=vec3(.045,.056,.065)*(0.8+n*.4);gl_FragColor=vec4(mix(base,r,.23+puddle*.16),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`; scene.add(wetGround);
const shadow=mesh(new THREE.PlaneGeometry(72,59),new THREE.ShadowMaterial({opacity:.3}),0,.025,0,scene);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
const collisions=[];
function obstacle(x,z,w,d){collisions.push({x,z,w:w/2+.35,d:d/2+.35});}
function curb(x,z,w,d){box(w,.18,d,x,.09,z,M.curb);}
curb(0,-29,72,.32);curb(-35.8,0,.32,58);curb(35.8,0,.32,58);
for(let x=-31;x<34;x+=6){box(.12,.014,5.5,x,.045,-22,M.line);}
for(let z=5;z<23;z+=6){box(6,.014,.12,28,.045,z,M.line);}
box(6,.014,.12,28,.045,23,M.line);
// Delicate paving seams add scale without overpowering the reflection.
for(let i=0;i<40;i++){let x=rand()*65-32,z=rand()*54-27;box(rand()*3+.3,.006,.015,x,.032,z,mat('#202b30'));}

// Timber lodge, with a tiled pitched roof and an illuminated paw sign.
const cafe=new THREE.Group();cafe.name='Timber café';cafe.position.set(14,0,-15);model.add(cafe);obstacle(14,-15,18,12);
box(20,.3,15,0,.15,1,M.curb,cafe);
box(18,4.7,12,0,2.65,0,M.wood,cafe);
for(let x=-8.8;x<9;x+=.45)box(.035,4.5,12.05,x,2.65,0,M.woodDark,cafe);
box(18.2,.7,12.2,0,.65,0,M.stone,cafe);
const gableShape=new THREE.Shape();gableShape.moveTo(-9,4.9);gableShape.lineTo(9,4.9);gableShape.lineTo(0,9.1);gableShape.closePath();
const gable=mesh(new THREE.ExtrudeGeometry(gableShape,{depth:12,bevelEnabled:false}),M.wood,0,0,-6,cafe);
for(let x=-8.5;x<=8.5;x+=.43){let h=4.2*(1-Math.abs(x)/9);box(.045,h,.06,x,4.9+h/2,6.05,M.woodDark,cafe);}
const angle=Math.atan2(4.7,10),slope=Math.hypot(10,4.7);
for(const sign of [-1,1]){
  const roof=box(slope,.22,14.4,sign*5,7.05,0,M.roof,cafe);roof.rotation.z=-sign*angle;
  beam([0,9.45,7.3],[sign*10,4.75,7.3],.14,M.woodLight,cafe);
  beam([0,9.45,-7.3],[sign*10,4.75,-7.3],.14,M.woodDark,cafe);
  box(.2,.3,14.6,sign*10,4.78,0,M.edge,cafe);
}
box(.24,.23,14.9,0,9.48,0,M.edge,cafe);
// A shallow veranda roof spans the front.
const porchRoof=box(20.2,.18,3.5,0,4.65,7.05,M.roof,cafe);porchRoof.rotation.x=.16;
box(20.2,.25,.24,0,4.35,8.8,M.woodDark,cafe);
for(const x of [-8.6,-4.4,4.4,8.6]){
  box(.8,1.35,.8,x,.95,8,M.stone,cafe);box(.24,3.1,.24,x,3.05,8,M.woodLight,cafe);
  beam([x,3.65,8],[x+(x>0?-.9:.9),4.28,8],.09,M.woodDark,cafe);
  for(let y=.45;y<1.6;y+=.3)for(let j=0;j<2;j++)box(.37,.23,.04,x-.2+j*.4+(y% .6>.3?.03:0),y,8.42,mat(j?'#918a7f':'#736f67'),cafe);
}
for(const x of [-6.2,-2.2,2.2,6.2]){
  box(3.5,2.9,.1,x,2.3,6.07,M.woodDark,cafe);
  box(3.2,2.65,.08,x,2.3,6.15,M.window,cafe);
  box(.09,2.8,.16,x,2.3,6.25,M.woodDark,cafe);
  box(3.3,.1,.16,x,2.85,6.25,M.woodDark,cafe);
  box(3.7,.12,.35,x,.9,6.25,M.woodLight,cafe);
  // Small interior silhouettes behind the glass.
  box(2.7,.05,.1,x,1.5,6.21,M.woodDark,cafe);
  for(let n=0;n<5;n++)box(.12,.3+rand()*.25,.06,x-1.05+n*.5,1.72,6.22,M.woodLight,cafe);
}
box(1.55,3.25,.2,0,1.95,6.32,M.woodDark,cafe);box(1.28,2.9,.06,0,1.95,6.44,M.window,cafe);box(.07,2.9,.1,0,1.95,6.49,M.woodDark,cafe);box(.05,.38,.09,.4,1.7,6.53,M.chrome,cafe);
label('P I N E   &   P A W',5.2,.52,0,4.05,6.3,'#ffe2a0',null,cafe);
function paw(x,y,z,scale,parent){
  const pad=sphere(.48*scale,x,y,z,M.glow,parent);pad.scale.set(1.25,.95,.15);
  for(const [dx,dy,a] of [[-.7,.57,-.4],[-.28,.93,-.2],[.28,.93,.2],[.7,.57,.4]]){const toe=sphere(.24*scale,x+dx*scale,y+dy*scale,z,M.glow,parent);toe.scale.set(.85,1.3,.3);toe.rotation.z=-a;}
}
paw(0,6.85,6.17,1.35,cafe);
box(1.5,5,1.45,5.5,7.1,-2.8,M.stone,cafe);box(1.8,.22,1.75,5.5,9.62,-2.8,M.edge,cafe);
for(let y=5;y<9.5;y+=.36)for(let i=0;i<3;i++)box(.43,.29,.03,4.99+i*.51,y,-2.06,mat(i%2?'#b5a693':'#7f7d74'),cafe);
function light(x,y,z,power=20,distance=8,parent=model){const l=new THREE.PointLight('#ffba65',power,distance,2);l.position.set(x,y,z);parent.add(l);return l;}
function lantern(x,y,z,parent=model){box(.22,.42,.22,x,y,z,M.glow,parent);box(.36,.09,.36,x,y+.25,z,M.edge,parent);cyl(.03,.03,.5,x,y,z,M.edge,parent);}
for(const x of [-8.6,-4.4,4.4,8.6]){lantern(x,3.8,8.15,cafe);light(x,3.65,7.8,18,6,cafe);}
for(const x of [-6,6]){cyl(.65,.5,.85,x,.72,8,M.woodDark,cafe);for(let i=0;i<9;i++){const a=i*2.4;const flower=sphere(.25,x+Math.cos(a)*.45,1.25+rand()*.25,8+Math.sin(a)*.4,mat(i%2?'#d4a951':'#799254'),cafe);}}
function bench(x,z,rotation=0,parent=model){const b=new THREE.Group();b.position.set(x,.3,z);b.rotation.y=rotation;parent.add(b);for(const q of [-.65,.65]){box(.09,.65,.6,q,.32,0,M.edge,b);box(.08,1.1,.08,q,.65,-.24,M.edge,b);}for(let i=0;i<4;i++)box(1.65,.07,.1,0,.65,-.2+i*.13,M.woodLight,b);for(let i=0;i<3;i++)box(1.65,.14,.07,0,.88+i*.18,-.27,M.woodLight,b);}
bench(-3.2,8.1,0,cafe);bench(3.2,8.1,0,cafe);

// Six-pump fuel court with a red fascia and recessed ceiling lights.
const canopy=new THREE.Group();canopy.name='Fuel station';canopy.position.set(-14,0,-1);model.add(canopy);
box(24,.75,17,0,5.8,0,M.cream,canopy);box(24.08,.2,17.08,0,5.58,0,M.red,canopy);box(24.3,.13,17.3,0,6.21,0,M.chrome,canopy);
box(23.5,.04,16.5,0,6.3,0,mat('#939794'),canopy);
for(const x of [-8,0,8])for(const z of [-4,4]){
  box(.55,5.4,.55,x,2.7,z,M.cream,canopy);obstacle(x-14,z-1,1,1);
  box(1.7,.19,4.3,x,.095,z,M.curb,canopy);
  for(const side of [-1,1]){
    const pz=z+side*1.3;box(.85,1.75,.55,x,1.05,pz,M.cream,canopy);box(.87,.22,.57,x,1.85,pz,M.red,canopy);
    box(.63,.58,.02,x,1.37,pz+.29,M.edge,canopy);label('98  /  95',.57,.14,x,1.51,pz+.306,'#b8e7db','#18252a',canopy);
    box(.52,.22,.02,x,1.16,pz+.31,mat('#181f23'),canopy);label('PINE',.55,.17,x,1.84,pz+.3,'#fff6df',null,canopy);
    tube([[x+.44,1.6,pz],[x+.72,1.35,pz],[x+.77,.35,pz],[x+.5,.3,pz],[x+.49,1.12,pz]],.035,M.tire,canopy);
    box(.08,.28,.1,x+.49,1.2,pz,M.edge,canopy);
  }
}
for(let x=-9;x<=9;x+=6)for(const z of [-5,0,5]){box(.75,.04,.55,x,5.39,z,M.glow,canopy);}
for(const x of [-8,8])light(x,4.85,1,75,14,canopy);
label('P I N E',4.3,.48,7,5.82,8.52,'#423e35',null,canopy);

// EV charging bays.
function charger(x,z){const g=new THREE.Group();g.name='EV charger';g.position.set(x,0,z);g.rotation.y=-Math.PI/2;model.add(g);obstacle(x,z,1.3,.9);
  box(1.4,.18,1.05,0,.09,0,M.curb,g);
  box(.96,2.6,.58,0,1.48,0,M.cream,g);box(.77,1.8,.61,0,1.45,0,M.red,g);box(.54,1.5,.64,0,1.5,0,M.edge,g);
  box(.36,1.15,.66,0,1.53,0,mat('#344341'),g);label('ϟ',.45,.36,0,2.55,.302,'#c12c26',null,g);
  tube([[.45,2.1,.05],[.75,1.7,.1],[.72,.35,.2],[.4,.28,.42],[.34,1.2,.35]],.04,M.tire,g);box(.1,.23,.12,.34,1.2,.35,M.edge,g);
}
for(const z of [7.5,13.5,19.5])charger(31,z);
label('E L E C T R I C',3.6,.4,33,3,13.5,'#cbe4cb').rotation.y=-Math.PI/2;

// Recognisable vehicles reconstructed from the supplied reference.
const vehicles=createVehicles(model,obstacle);
tube([[30.7,1.2,13.5],[30.1,.35,13.5],[29.1,.25,14.2],[28.25,1.12,14.45]],.035,M.tire);

// Landscape islands, rail fencing, lamps and a tiny roadside marker.
function planter(x,z,w=5,d=2){box(w,.28,d,x,.14,z,M.curb);box(w-.22,.3,d-.22,x,.16,z,M.dirt);for(let i=0;i<w*2;i++){const px=x+(rand()-.5)*(w-.4),pz=z+(rand()-.5)*(d-.3);sphere(.32+rand()*.22,px,.4,pz,mat(['#55613d','#6c7342','#4b5940'][i%3]));}obstacle(x,z,w,d);}
planter(-30,21,8,2.8);planter(23,-26,12,2);planter(33,-13,2.7,13);planter(-31,-22,5,4);planter(3,24,7,2.5);
function fence(x1,z1,x2,z2){const d=Math.hypot(x2-x1,z2-z1),count=Math.ceil(d/3);for(let i=0;i<=count;i++){const t=i/count,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;box(.22,1.25,.22,x,.7,z,M.woodDark);box(.28,.1,.28,x,1.37,z,M.woodLight);}for(const y of [.58,1.05])beam([x1,y,z1],[x2,y,z2],.065,M.woodLight);}
fence(-35,26,-10,26);fence(8,26,35,26);fence(35,26,35,-25);fence(-35,-28,34,-28);
for(const [x,z] of [[-32,24],[4,24],[32,24],[33,-23],[-31,-24]]){
  cyl(.11,.15,4.9,x,2.45,z,M.edge);box(.5,.07,.5,x,4.6,z,M.edge);sphere(.21,x,4.77,z,M.glow);cyl(.4,.1,.25,x,5.02,z,M.edge);light(x,4.6,z,38,12);
}
box(1.5,1.6,.7,3,1,24,M.woodDark);paw(3,.9,24.37,.6,model);
// Forest geometry is merged by material to keep navigation smooth.
const treeBuckets=[[],[],[],[]];const treeMats=[mat('#293d32'),mat('#344a36'),mat('#45553a'),M.woodDark];
function addTree(x,z,height,width){
  const trunk=new THREE.CylinderGeometry(.11*height/8,.24*height/8,height*.7,7);trunk.translate(x,height*.35,z);treeBuckets[3].push(trunk);
  for(let j=0;j<6;j++){const y=height*(.28+j*.115);const radius=width*(1-j*.135);const geo=new THREE.ConeGeometry(radius,height*.39,9);geo.rotateY(rand()*Math.PI);geo.translate(x,y+height*.13,z);treeBuckets[j%3].push(geo);}
}
for(let i=0;i<230;i++){
  const x=rand()*250-125,z=rand()*220-150;
  if(z>28&&z<48||x>-39&&x<39&&z>-33&&z<51)continue;
  addTree(x,z,7+rand()*15,2+rand()*2.6);
}
for(const [x,z] of [[-32,-23],[-27,-27],[-34,-14],[31,-25],[34,-5],[29,-30],[3,-28]])addTree(x,z,11+rand()*5,2.6);
for(let i=0;i<4;i++){const merged=mergeGeometries(treeBuckets[i]);const forest=mesh(merged,treeMats[i]);forest.name=['Pine branches dark','Pine branches medium','Pine branches light','Pine trunks'][i];}
// Irregular ridgelines rather than repeated conical mountains.
for(let layer=0;layer<3;layer++){
  const geo=new THREE.PlaneGeometry(650,150,110,20);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getZ(i);const ridge=25+14*Math.sin(x*.012+layer*2)+8*Math.sin(x*.032+layer)+4*Math.sin(x*.073);const taper=Math.sin((z+75)/150*Math.PI);pos.setY(i,Math.max(-1,ridge*Math.pow(Math.max(0,taper),.6)+(rand()-.5)*2));}geo.computeVertexNormals();
  const mountain=mesh(geo,mat(['#656e6b','#71777b','#8b8588'][layer]),0,-2,-165-layer*65);mountain.name='Mountain ridge';mountain.castShadow=false;
}

// Batch static objects by material, retaining café / car / canopy groups.
function batchGroup(group){
  for(const child of [...group.children])if(child.isGroup)batchGroup(child);
  const buckets=new Map();
  for(const child of [...group.children]){
    if(!child.isMesh||Array.isArray(child.material))continue;
    const key=child.material.uuid+'-'+child.castShadow;
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child);
  }
  for(const objects of buckets.values()){
    if(objects.length<2)continue;
    const geometries=objects.map(o=>{o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrix);});
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!geometry)continue;
    const compactGeometry=mergeVertices(geometry,1e-5);geometry.dispose();
    const merged=new THREE.Mesh(compactGeometry,objects[0].material);merged.name=group.name+' details';merged.castShadow=objects[0].castShadow;merged.receiveShadow=true;
    for(const o of objects){group.remove(o);o.geometry.dispose();}group.add(merged);
  }
}
batchGroup(model);

// Interaction: smooth viewpoints and a first-person walking camera with collisions.
const views=[{p:[53,31,59],t:[0,2,-3]},{p:[-27,2.5,22],t:[-9,3,-2]},{p:[15,2.3,5],t:[14,4,-10]},{p:[18,2.4,25],t:[29,1.8,11]}];
let transition=null,walking=false,yaw=0,pitch=0,keys={},touchStart=null,toastTimer;
const isTouch=matchMedia('(pointer:coarse)').matches;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800);}
function setView(i){setMode(false);const view=views[i];transition={from:camera.position.clone(),target:controls.target.clone(),to:new THREE.Vector3(...view.p),look:new THREE.Vector3(...view.t),start:performance.now()};document.querySelectorAll('.view').forEach((el,j)=>el.classList.toggle('active',i===j));}
function setMode(walk){
  document.body.classList.remove('vehicle-focus');$('vehicle-info').hidden=true;
  walking=walk;transition=null;keys={};document.body.classList.toggle('walking',walk);$('orbit-mode').classList.toggle('selected',!walk);$('walk-mode').classList.toggle('selected',walk);$('crosshair').hidden=!walk;$('walk-hint').hidden=!walk;$('mobile-move').hidden=!(walk&&isTouch);controls.enabled=!walk;
  if(walk){camera.position.set(3,1.72,19);yaw=0;pitch=-.02;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);$('help').innerHTML='<span class="mouse-icon">⌨</span><span>W A S D — движение<small>Shift — быстрее · Esc — отпустить мышь</small></span>';if(isTouch)$('walk-hint').innerHTML='Тяните по экрану, чтобы осмотреться<br><small>Стрелки слева — движение</small>';}
  else{if(document.pointerLockElement)document.exitPointerLock();camera.rotation.order='XYZ';controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(12));controls.update();$('help').innerHTML='<span class="mouse-icon">↔</span><span>Тяните, чтобы осмотреться<small>Колесо — масштаб · Правая кнопка — сдвиг</small></span>';}
}
document.querySelectorAll('.view').forEach(el=>el.addEventListener('click',()=>setView(Number(el.dataset.view))));
$('walk-mode').onclick=()=>{if(!walking)setMode(true);};$('orbit-mode').onclick=()=>{if(walking)setView(0);};$('reset').onclick=()=>setView(0);
controls.addEventListener('start',()=>{transition=null;});
renderer.domElement.addEventListener('click',async()=>{if(walking&&!isTouch&&!document.pointerLockElement){try{await renderer.domElement.requestPointerLock();}catch{toast('Удерживайте кнопку мыши, чтобы осмотреться.');}}});
document.addEventListener('pointerlockchange',()=>{$('walk-hint').hidden=!walking||!!document.pointerLockElement;});
let dragging=false;
renderer.domElement.addEventListener('pointerdown',e=>{if(walking){dragging=true;touchStart=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointerup',()=>{dragging=false;touchStart=null;});
document.addEventListener('pointermove',e=>{if(!walking)return;if(document.pointerLockElement){yaw-=e.movementX*.002;pitch-=e.movementY*.002;}else if(dragging&&touchStart){yaw-=(e.clientX-touchStart[0])*.004;pitch-=(e.clientY-touchStart[1])*.004;touchStart=[e.clientX,e.clientY];}pitch=Math.max(-1.35,Math.min(1.35,pitch));});
document.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||$('reference-modal').open)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&walking)e.preventDefault();keys[e.code]=true;if(!walking&&['Digit1','Digit2','Digit3','Digit4'].includes(e.code))setView(Number(e.code.slice(-1))-1);});
document.addEventListener('keyup',e=>{keys[e.code]=false;});window.addEventListener('blur',()=>{keys={};dragging=false;});
document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();keys[b.dataset.move]=true;b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>{keys[b.dataset.move]=false;};});
const blocked=(x,z)=>x< -34.5||x>34.5||z< -27||z>30||collisions.some(b=>Math.abs(x-b.x)<b.w&&Math.abs(z-b.z)<b.d);
$('settings').onclick=()=>{$('vehicle-panel').hidden=true;$('light-panel').hidden=!$('light-panel').hidden;};$('close-settings').onclick=()=>{$('light-panel').hidden=true;};
$('reference').onclick=()=>{if(document.pointerLockElement)document.exitPointerLock();keys={};$('reference-modal').showModal();};$('close-reference').onclick=()=>$('reference-modal').close();$('reference-modal').onclick=e=>{if(e.target===$('reference-modal'))$('reference-modal').close();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Полный экран недоступен в этом окне браузера.');}};
$('reflections').onchange=e=>{wetGround.visible=e.target.checked;};
$('vehicles').onclick=()=>{$('light-panel').hidden=true;$('vehicle-panel').hidden=!$('vehicle-panel').hidden;};
$('close-vehicles').onclick=()=>{$('vehicle-panel').hidden=true;};
document.querySelectorAll('[data-vehicle]').forEach(button=>button.onclick=()=>{
  const vehicle=vehicles.find(v=>v.id===button.dataset.vehicle);setMode(false);document.body.classList.add('vehicle-focus');
  vehicle.group.updateWorldMatrix(true,false);
  const to=vehicle.group.localToWorld(new THREE.Vector3(-5,2.75,6.4));
  const look=vehicle.group.localToWorld(new THREE.Vector3(0,1.0,0));
  transition={from:camera.position.clone(),target:controls.target.clone(),to,look,start:performance.now()};
  $('vehicle-name').textContent=vehicle.name;$('vehicle-info').hidden=false;$('vehicle-panel').hidden=true;
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
});
$('vehicle-back').onclick=()=>setView(0);

$('light').oninput=e=>{const v=Number(e.target.value)/100;skyMaterial.uniforms.sunDir.value.set(-.62,.02+v*.48,-.77).normalize();sun.position.y=7+v*80;sun.intensity=1.1+v*5;renderer.toneMappingExposure=.75+v*.8;sun.color.setHSL(.055+v*.04,.6,.7);$('light-label').textContent=v<.15?'Сумерки':v<.55?'Закат':'Золотой час';};
$('export').onclick=async()=>{
  const b=$('export');b.disabled=true;toast('Подготавливаю 3D-модель…');
  try{const {GLTFExporter}=await import('./vendor/GLTFExporter.js');await new Promise(r=>setTimeout(r,50));
    const data=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true,maxTextureSize:1024});
    const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='pine-station.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Модель GLB готова. Файл скачивается.');
  }catch(e){console.error(e);toast('Не удалось скачать модель. Попробуйте ещё раз.');}finally{b.disabled=false;}
};
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?65:48;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let previous=performance.now(),frames=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.04);previous=now;
  if(transition){const t=Math.min((now-transition.start)/1500,1),ease=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.target,transition.look,ease);if(t===1)transition=null;}
  if(walking&&!$('reference-modal').open){camera.rotation.set(pitch,yaw,0);const f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),s=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);const speed=(keys.ShiftLeft||keys.ShiftRight?8:3.7)*dt/Math.max(1,Math.hypot(f,s));const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;if(!blocked(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(!blocked(camera.position.x,camera.position.z+dz))camera.position.z+=dz;camera.position.y=1.72;}
  else if(!walking)controls.update();
  renderer.render(scene,camera);
  if(++frames===3){$('loader').style.opacity='0';setTimeout(()=>$('loader').remove(),850);}
}
// Expose a small read-only inspection surface for verifying the scene.
window.pineStation={scene,camera,renderer,model,get walking(){return walking;},get collisions(){return collisions;}};
requestAnimationFrame(animate);
