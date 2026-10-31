import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// Original reference-based models. Metres, +Z forward, +Y up.
const paint = color => new THREE.MeshPhysicalMaterial({ color, metalness: .6, roughness: .18, clearcoat: 1, clearcoatRoughness: .07, envMapIntensity: 1.1 });
const materials = {
  chrome: new THREE.MeshStandardMaterial({ color: '#c9cfd4', metalness: 1, roughness: .13, envMapIntensity: 1.3 }),
  machined: new THREE.MeshStandardMaterial({ color: '#b6bcc2', metalness: .95, roughness: .22, envMapIntensity: 1.15 }),
  graphite: new THREE.MeshStandardMaterial({ color: '#3a3f43', metalness: .75, roughness: .3, envMapIntensity: .9 }),
  black: new THREE.MeshStandardMaterial({ color: '#14181b', metalness: .35, roughness: .45 }),
  satin: new THREE.MeshStandardMaterial({ color: '#1d2225', metalness: .4, roughness: .58 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#0f1110', roughness: .96 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#0f1d26', metalness: .35, roughness: .06, clearcoat: 1, envMapIntensity: 1.25 }),
  brake: new THREE.MeshStandardMaterial({ color: '#8b939a', metalness: .95, roughness: .3, envMapIntensity: 1.05 }),
  brakeDark: new THREE.MeshStandardMaterial({ color: '#33383d', metalness: .8, roughness: .5 }),
  red: new THREE.MeshStandardMaterial({ color: '#b41f13', roughness: .38, metalness: .15 }),
  led: new THREE.MeshStandardMaterial({ color: '#eef7ff', emissive: '#dcecff', emissiveIntensity: 2.4 }),
  tail: new THREE.MeshStandardMaterial({ color: '#a91813', emissive: '#f41e12', emissiveIntensity: .95 }),
  amber: new THREE.MeshStandardMaterial({ color: '#f4a843', emissive: '#d7771d', emissiveIntensity: .38 }),
};
function add(g, geo, m, pos = [0, 0, 0]) { const o = new THREE.Mesh(geo, m); o.position.set(...pos); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
function rounded(g, size, pos, m, r = .045) { return add(g, new RoundedBoxGeometry(...size, 3, r), m, pos); }
function box(g, size, pos, m) { return add(g, new THREE.BoxGeometry(...size), m, pos); }
function ring(g, r, t, pos, m, axis = 'z', arc = Math.PI * 2) { const o = add(g, new THREE.TorusGeometry(r, t, 10, 48, arc), m, pos); if (axis === 'x') o.rotation.y = Math.PI / 2; return o; }
function cylinder(g, r, h, pos, m, axis = 'x') { const o = add(g, new THREE.CylinderGeometry(r, r, h, 44), m, pos); o.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2; return o; }
// Tapered strut between two points — spokes, hinges, brackets.
function strut(g, p1, p2, r1, r2, m, seg = 10) {
  const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2);
  const o = add(g, new THREE.CylinderGeometry(r1, r2, a.distanceTo(b), seg), m);
  o.position.copy(a).add(b).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return o;
}
function path(g, points, r, m) { return add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), Math.max(12, points.length * 5), r, 8, false), m); }
function panel(g, points, m) { const geo = new THREE.BufferGeometry(); let verts = [], uv = []; for (let i = 1; i < points.length - 1; i++) { for (const index of [0, i, i + 1]) { verts.push(...points[index]); uv.push(index === 0 ? 0 : 1, index === i ? 0 : 1); } } geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals(); const o = add(g, geo, m); o.material.side = THREE.DoubleSide; return o; }
function outline(g, points, r, m) { path(g, [...points, points[0]], r, m); }
function text(g, string, w, h, pos, color = '#d9e2e8', background = null) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 128; const ctx = c.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, 768, 128); } ctx.fillStyle = color; ctx.font = '700 74px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(string, 384, 67, 730);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return add(g, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: !background, roughness: .38, metalness: .3, side: THREE.DoubleSide }), pos);
}
// Rounded longitudinal sections give the body actual curves, not a stack of boxes.
function shell(g, sections, m, bottom = .46) {
  const vertices = [], uv = [], indices = []; const n = 12;
  sections.forEach(([z, w, top], i) => {
    const ringPts = [[-w * .84, bottom], [-w, bottom + .1], [-w, top - .16], [-w * .94, top - .04], [-w * .7, top + .015], [-w * .32, top + .04], [w * .32, top + .04], [w * .7, top + .015], [w * .94, top - .04], [w, top - .16], [w, bottom + .1], [w * .84, bottom]];
    ringPts.forEach(([x, y], j) => { vertices.push(x, y, z); uv.push(j / (n - 1), i / (sections.length - 1)); });
    if (i) for (let j = 0; j < n; j++) { const a = (i - 1) * n + j, b = (i - 1) * n + (j + 1) % n, c = i * n + j, d = i * n + (j + 1) % n; indices.push(a, c, b, b, c, d); }
  });
  for (let i = 1; i < n - 1; i++) { indices.push(0, i, i + 1); const end = (sections.length - 1) * n; indices.push(end, end + i + 1, end + i); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals(); return add(g, geo, m);
}
// Spline-subdivide the section list so highlights run smoothly along the roofline.
function refine(sections, sub = 2) {
  const curve = new THREE.CatmullRomCurve3(sections.map(s => new THREE.Vector3(s[0], s[1], s[2])));
  const out = []; const n = (sections.length - 1) * sub;
  for (let i = 0; i <= n; i++) { const p = curve.getPoint(i / n); out.push([p.x, p.y, p.z]); }
  return out;
}
function audiBadge(g, x, y, z, scale = 1) { for (let i = 0; i < 4; i++) ring(g, .075 * scale, .011 * scale, [x + (i - 1.5) * .112 * scale, y, z], materials.chrome); }
function mercedesBadge(g, x, y, z, scale = 1) { ring(g, .15 * scale, .013 * scale, [x, y, z], materials.chrome); for (let i = 0; i < 3; i++) { let a = Math.PI / 2 + i * 2 * Math.PI / 3; path(g, [[x, y, z + .005], [x + Math.cos(a) * .135 * scale, y + Math.sin(a) * .135 * scale, z + .005]], .012 * scale, materials.chrome); } }
function teslaBadge(g, x, y, z, scale = 1) { path(g, [[x - .12 * scale, y + .07 * scale, z], [x, y + .09 * scale, z], [x + .12 * scale, y + .07 * scale, z]], .012 * scale, materials.chrome); panel(g, [[x - .085 * scale, y + .04 * scale, z], [x + .085 * scale, y + .04 * scale, z], [x + .025 * scale, y, z], [x, y - .14 * scale, z], [x - .025 * scale, y, z]], materials.chrome); }
// Round projector lens inside a lamp housing.
function projector(g, x, y, z, r = .042) {
  ring(g, r, .011, [x, y, z], materials.chrome);
  cylinder(g, r - .005, .022, [x, y, z + .002], materials.black, 'z');
  cylinder(g, r * .45, .026, [x, y, z + .005], materials.led, 'z');
}
// Painted brake caliper riding just ahead of top-dead-centre.
function caliper(g, side, z, r, label, cx, dx) {
  const cy = r + .035, a = .85, rad = r - .145;
  const m = new THREE.MeshStandardMaterial({ color: '#c1221a', roughness: .3, metalness: .2 });
  const c = rounded(g, [.08, .13, .18], [dx + side * .012, cy + Math.sin(a) * rad, z + Math.cos(a) * rad], m, .028); c.rotation.x = -a;
  const t = text(g, label, .075, .028, [dx + side * .055, cy + Math.sin(a) * rad, z + Math.cos(a) * rad], '#f3ede4');
  t.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
}
function wheel(g, side, z, r = .43, style = 'audi') {
  const cy = r + .035, cx = side * 1.03;
  const spec = {
    tesla: { w: .285, count: 10, twin: 0, twist: .26, hubW: .02, rimW: .032, mat: materials.graphite, cap: materials.graphite },
    audi: { w: .29, count: 5, twin: .03, twist: .1, hubW: .026, rimW: .017, mat: materials.machined, cap: materials.graphite },
    mercedes: { w: .305, count: 5, twin: .026, twist: .04, hubW: .024, rimW: .016, mat: materials.black, cap: materials.chrome },
  }[style];
  const hw = spec.w / 2, rimR = r - .085, lip = r - .082;
  // Open-ended barrel: side wall only, so the disc and caliper stay visible.
  const barrel = add(g, new THREE.CylinderGeometry(rimR, rimR, spec.w * .85, 44, 1, true), materials.black);
  barrel.rotation.z = Math.PI / 2; barrel.position.set(cx - side * .01, cy, z);
  // Deep shadow drum closing the wheel inboard of the brakes.
  cylinder(g, rimR - .004, .022, [cx - side * (hw * .55 + .02), cy, z], materials.black);
  // Tyre — lathed cross-section: flat tread, rounded shoulders, beaded sidewalls.
  const profile = [[lip, -hw + .052], [r - .044, -hw + .012], [r - .012, -hw + .058], [r, -hw + .1], [r, hw - .1], [r - .012, hw - .058], [r - .044, hw - .012], [lip, hw - .052]].map(p => new THREE.Vector2(p[0], p[1]));
  const tire = add(g, new THREE.LatheGeometry(profile, 64), materials.rubber); tire.rotation.z = Math.PI / 2; tire.position.set(cx, cy, z);
  ring(g, lip + .004, .011, [cx + side * (hw - .045), cy, z], materials.brakeDark, 'x');
  ring(g, rimR, .013, [cx + side * (hw - .012), cy, z], style === 'tesla' ? materials.graphite : materials.machined, 'x');
  for (let i = 0; i < spec.count; i++) {
    const a = i * Math.PI * 2 / spec.count;
    for (const off of (spec.twin ? [-spec.twin, spec.twin] : [0])) {
      const aR = a + spec.twist + (off ? Math.sign(off) * .055 : 0);
      strut(g, [cx + side * hw * .5, cy + Math.sin(a) * .1, z + Math.cos(a) * .1],
        [cx + side * hw * .08, cy + Math.sin(aR) * (rimR - .018), z + Math.cos(aR) * (rimR - .018)],
        spec.rimW, spec.hubW, spec.mat);
    }
  }
  cylinder(g, .06, .026, [cx + side * hw * .52, cy, z], spec.cap);
  ring(g, .061, .008, [cx + side * (hw * .52 + .015), cy, z], materials.chrome, 'x');
  // Ventilated disc with hat and groove, sitting outboard of the drum.
  const dx = cx + side * hw * .05;
  cylinder(g, r - .135, .026, [dx, cy, z], materials.brake);
  cylinder(g, .055, .03, [dx - side * .014, cy, z], materials.brakeDark);
  ring(g, (r - .135) * .68, .005, [dx, cy, z], materials.brakeDark, 'x');
  caliper(g, side, z, r, { tesla: 'T', audi: 'RS', mercedes: 'AMG' }[style], cx, dx);
}
function arch(g, side, z, r, m) {
  const pts = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI; pts.push([side * 1.047, .035 + r + Math.sin(a) * (r + .058), z + Math.cos(a) * (r + .058)]); } path(g, pts, .034, m);
}
// EU-style plate: blue band with a ring of stars.
function plate(g, front, z, title) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 140; const x = c.getContext('2d');
  x.fillStyle = '#eef1ee'; x.fillRect(0, 0, 640, 140);
  x.fillStyle = '#14318f'; x.fillRect(10, 8, 86, 124);
  x.fillStyle = '#f7c500';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.arc(53 + Math.cos(a) * 26, 70 + Math.sin(a) * 26, 4.5, 0, 7); x.fill(); }
  x.fillStyle = '#12181d'; x.font = '700 86px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(title, 378, 74, 420);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const o = add(g, new THREE.PlaneGeometry(.5, .11), new THREE.MeshStandardMaterial({ map, roughness: .4, metalness: .1 }));
  o.position.set(0, .61, z); if (!front) o.rotation.y = Math.PI; return o;
}
function seam(g, side, points) { path(g, points.map(([z, y, x = 1.01]) => [x * side, y, z]), .007, materials.black); }
function mirror(g, side, y, z, m) { rounded(g, [.19, .07, .07], [side * 1.045, y - .04, z], materials.black, .02); rounded(g, [.24, .14, .28], [side * 1.16, y, z], m, .05); rounded(g, [.19, .085, .012], [side * 1.17, y, z - .141], materials.chrome, .018); }
// Soft ambient-occlusion pool that grounds the car on the asphalt.
function groundShadow(g, len, wid) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 24, 128, 128, 124);
  gr.addColorStop(0, 'rgba(6,8,9,.7)'); gr.addColorStop(.5, 'rgba(6,8,9,.38)'); gr.addColorStop(1, 'rgba(6,8,9,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const o = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  o.rotation.x = -Math.PI / 2; o.position.y = .012; o.renderOrder = 1; g.add(o); return o;
}
// Merge a finished group into one mesh per material — fewer draw calls, lighter GLB.
function bake(g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const byMat = new Map();
  g.traverse(o => {
    if (!o.isMesh) return;
    // RoundedBox is non-indexed while primitives are indexed — normalise before merging.
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(inv.clone().multiply(o.matrixWorld));
    (byMat.get(o.material) || byMat.set(o.material, []).get(o.material)).push(geo);
  });
  for (const child of [...g.children]) g.remove(child);
  for (const [m, list] of byMat) {
    const merged = mergeGeometries(list, false);
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = mesh.receiveShadow = !m.isMeshBasicMaterial; // the AO pool stays unlit and shadow-free
    g.add(mesh);
  }
  return g;
}

function crossoverWindows(g, kind, body) {
  const tesla = kind === 'tesla';
  const levels = tesla ? [[-1.95, .62, 1.24], [-1.35, .77, 1.62], [-.65, .79, 1.76], [.12, .78, 1.77], [.75, .77, 1.57], [1.23, .88, 1.22]] : [[-1.82, .78, 1.35], [-1.22, .83, 1.72], [-.55, .85, 1.79], [.38, .84, 1.76], [1.12, .94, 1.28]];
  shell(g, levels, materials.glass, 1.14);
  for (const side of [-1, 1]) {
    const pts = tesla ? [[.963, 1.225, 1.1], [.787, 1.565, .69], [.8, 1.704, .11], [.811, 1.694, -.66], [.79, 1.565, -1.27], [.929, 1.245, -1.7]] : [[.975, 1.255, 1.0], [.862, 1.687, .34], [.872, 1.715, -.55], [.854, 1.645, -1.15], [.97, 1.27, -1.57]];
    const points = pts.map(([x, y, z]) => [side * x, y, z]); panel(g, points, materials.glass); outline(g, points, .018, tesla ? materials.chrome : materials.black);
    path(g, [[side * .96, 1.23, tesla ? 1.15 : 1.06], [side * (tesla ? .80 : .86), tesla ? 1.61 : 1.73, tesla ? .71 : .37], [side * (tesla ? .81 : .87), tesla ? 1.78 : 1.8, tesla ? .12 : -.55]], .031, body);
    path(g, [[side * (tesla ? .79 : .85), tesla ? 1.66 : 1.73, tesla ? -1.35 : -1.2], [side * .96, 1.23, tesla ? -1.9 : -1.76]], .045, body);
    path(g, [[side * .982, 1.25, -.22], [side * (tesla ? .815 : .885), tesla ? 1.73 : 1.75, -.24]], .037, materials.black);
    if (!tesla) path(g, [[side * .98, 1.27, -1.07], [side * .875, 1.7, -1.02]], .022, materials.black);
    seam(g, side, [[.9, 1.2], [.88, .68], [.76, .58], [-.2, .58], [-.26, 1.22]]);
    seam(g, side, [[-.26, 1.22], [-.23, .58], [-1.12, .58], [-1.35, .91], [-1.38, 1.23]]);
    // Flush door pods with a dark pull-slot (Tesla) or body-tone handles (Audi).
    for (const z of [.05, -1.0]) rounded(g, [.03, .028, .19], [side * 1.028, 1.16, z], tesla ? body : materials.chrome, .011);
    if (tesla) for (const z of [.05, -1.0]) path(g, [[side * 1.042, 1.155, z - .075], [side * 1.042, 1.155, z + .075]], .006, materials.black);
    mirror(g, side, 1.37, .8, body);
    path(g, [[side * 1.02, .58, -1.84], [side * 1.045, .55, 0], [side * 1.01, .58, 1.85]], .028, materials.black);
  }
  const wind = tesla ? [[-.88, 1.265, 1.22], [.88, 1.265, 1.22], [.765, 1.61, .69], [.77, 1.76, .12], [-.77, 1.76, .12], [-.765, 1.61, .69]] : [[-.92, 1.31, 1.1], [.92, 1.31, 1.1], [.814, 1.752, .38], [-.814, 1.752, .38]];
  panel(g, wind, materials.glass); outline(g, wind, .018, materials.black);
  panel(g, tesla ? [[-.75, 1.765, .1], [.75, 1.765, .1], [.76, 1.755, -.64], [.735, 1.62, -1.29], [-.735, 1.62, -1.29], [-.76, 1.755, -.64]] : [[-.76, 1.8, .27], [.76, 1.8, .27], [.79, 1.805, -.6], [.77, 1.74, -1.1], [-.77, 1.74, -1.1], [-.79, 1.805, -.6]], materials.glass);
  panel(g, tesla ? [[-.71, 1.6, -1.38], [.71, 1.6, -1.38], [.59, 1.29, -1.97], [-.59, 1.29, -1.97]] : [[-.77, 1.7, -1.24], [.77, 1.7, -1.24], [.72, 1.37, -1.8], [-.72, 1.37, -1.8]], materials.glass);
  for (const x of [-.4, .38]) path(g, [[x - .22, 1.33, 1.06], [x + .18, 1.37, 1.01]], .009, materials.black);
}

function makeAudi() {
  const g = new THREE.Group(); g.name = 'Audi RS Q8 · silver'; const body = paint('#a9afb3');
  shell(g, refine([[-2.45, .82, 1.02], [-2.27, .99, 1.21], [-1.5, 1.035, 1.29], [-.3, 1.015, 1.29], [.95, 1.025, 1.28], [1.65, 1.02, 1.23], [2.25, .96, 1.12], [2.47, .83, 1.04]]), body);
  rounded(g, [1.98, .18, 4.45], [0, .47, 0], materials.black, .07);
  crossoverWindows(g, 'audi', body);
  // Aluminium roof rails on feet.
  for (const s of [-1, 1]) {
    path(g, [[s * .56, 1.325, -1.3], [s * .56, 1.34, -.2], [s * .56, 1.325, 1.2]], .019, materials.satin);
    for (const zz of [-1.2, -.15, 1.1]) rounded(g, [.05, .045, .075], [s * .56, 1.3, zz], materials.black, .014);
  }
  for (const s of [-1, 1]) for (const z of [-1.46, 1.47]) { wheel(g, s, z, .445, 'audi'); arch(g, s, z, .445, body); }
  const grille = [[-.57, .55, 2.48], [.57, .55, 2.48], [.75, .74, 2.48], [.64, 1.035, 2.48], [-.64, 1.035, 2.48], [-.75, .74, 2.48]];
  panel(g, grille, materials.black); outline(g, grille, .024, materials.chrome);
  for (let y = .62; y < 1.0; y += .072) for (let x = -.62; x < .65; x += .085) { if (Math.abs(x) > .55 && y < .7) continue; const pts = []; for (let k = 0; k < 7; k++) { const a = k * Math.PI / 3; pts.push([x + Math.cos(a) * .043, y + Math.sin(a) * .036, 2.492]); } path(g, pts, .006, materials.brake); }
  audiBadge(g, 0, .94, 2.525, 1.1); rounded(g, [.09, .05, .02], [-.43, .83, 2.516], materials.red, .005); text(g, 'RS', .1, .055, [-.32, .83, 2.522]);
  for (const s of [-1, 1]) {
    const lamp = [[s * .67, 1.09, 2.43], [s * .98, 1.1, 2.23], [s * .98, 1.22, 2.14], [s * .65, 1.22, 2.37]];
    panel(g, lamp, materials.black); path(g, [[s * .66, 1.21, 2.39], [s * .91, 1.205, 2.23], [s * .97, 1.18, 2.21]], .019, materials.led);
    for (let i = 0; i < 4; i++) path(g, [[s * (.72 + i * .055), 1.17, 2.38 - i * .035], [s * (.72 + i * .055), 1.12, 2.38 - i * .035]], .008, materials.led);
    projector(g, s * .76, 1.155, 2.325, .046); projector(g, s * .885, 1.16, 2.25, .04);
    rounded(g, [.32, .24, .075], [s * .84, .72, 2.3], materials.black, .035);
    path(g, [[s * .63, 1.23, 1.1], [s * .59, 1.24, 1.65], [s * .48, 1.14, 2.18]], .008, body);
    path(g, [[s * .95, 1.15, -2.23], [s * .7, 1.17, -2.45], [s * .2, 1.17, -2.48]], .03, materials.tail);
    // Large oval RS exhaust finishers, pair per side.
    for (const x of [s * .58, s * .82]) { const t = cylinder(g, .048, .1, [x, .51, -2.44], materials.chrome, 'z'); t.scale.set(1, 1, 1.4); const d = cylinder(g, .04, .1, [x, .51, -2.46], materials.black, 'z'); d.scale.set(1, 1, 1.4); }
  }
  path(g, [[-.72, 1.175, -2.48], [0, 1.18, -2.49], [.72, 1.175, -2.48]], .012, materials.tail);
  audiBadge(g, 0, 1.06, -2.49, .8); plate(g, true, 2.51, 'RS Q8'); plate(g, false, -2.48, 'RS Q8');
  rounded(g, [1.74, .065, .24], [0, 1.42, -1.97], materials.black, .025);
  groundShadow(g, 5.05, 2.35);
  return bake(g);
}

function makeTesla() {
  const g = new THREE.Group(); g.name = 'Tesla Model X · pearl white'; const body = paint('#e6e6e1');
  shell(g, refine([[-2.48, .72, .97], [-2.27, .98, 1.19], [-1.62, 1.02, 1.29], [-.55, 1.01, 1.28], [.65, 1.0, 1.26], [1.44, 1.0, 1.18], [2.06, .93, 1.05], [2.48, .75, .94]]), body, .43);
  rounded(g, [1.88, .13, 4.35], [0, .46, 0], materials.black, .06); crossoverWindows(g, 'tesla', body);
  for (const s of [-1, 1]) for (const z of [-1.47, 1.46]) { wheel(g, s, z, .43, 'tesla'); arch(g, s, z, .43, body); }
  for (const s of [-1, 1]) {
    const lamp = [[s * .49, 1.06, 2.37], [s * .87, 1.1, 2.1], [s * .92, 1.02, 2.12], [s * .59, .98, 2.37]];
    panel(g, lamp, materials.black); path(g, [[s * .52, 1.057, 2.39], [s * .81, 1.09, 2.19], [s * .89, 1.05, 2.14]], .016, materials.led);
    rounded(g, [.17, .04, .04], [s * .79, .68, 2.21], materials.led, .012);
    path(g, [[s * .63, 1.245, 1.07], [s * .57, 1.22, 1.5], [s * .38, 1.09, 2.11]], .007, materials.chrome);
    path(g, [[s * .97, 1.1, -2.2], [s * .74, 1.14, -2.42], [s * .3, 1.14, -2.46]], .029, materials.tail);
    path(g, [[s * .93, 1.04, -2.23], [s * .72, 1.065, -2.43]], .012, materials.tail);
  }
  // Charge-port flap on the rear-left quarter (the scene cable plugs in here).
  rounded(g, [.012, .1, .09], [.775, .98, -2.3], materials.black, .01);
  rounded(g, [.012, .09, .08], [.783, .98, -2.3], body, .008);
  rounded(g, [1.3, .13, .07], [0, .61, 2.43], materials.black, .045);
  teslaBadge(g, 0, 1.045, 2.45, .7); teslaBadge(g, 0, 1.23, -2.41, .6);
  path(g, [[-.77, 1.045, -2.45], [0, 1.06, -2.49], [.77, 1.045, -2.45]], .015, materials.chrome);
  rounded(g, [1.65, .06, .2], [0, 1.31, -2.02], body, .025); text(g, 'M O D E L   X', .46, .07, [.52, .85, -2.46]).rotation.y = Math.PI;
  plate(g, true, 2.47, 'MODEL X'); plate(g, false, -2.49, 'MODEL X');
  groundShadow(g, 5.0, 2.25);
  return bake(g);
}

function makeMercedes() {
  const g = new THREE.Group(); g.name = 'Mercedes-Benz G-Class · forest green'; const body = paint('#173e32');
  rounded(g, [1.94, .67, 4.5], [0, .94, -.02], body, .075); rounded(g, [1.98, .17, 4.55], [0, .53, -.02], materials.black, .045);
  rounded(g, [1.78, .77, 2.83], [0, 1.55, -.55], body, .04); rounded(g, [1.86, .075, 2.94], [0, 1.97, -.55], body, .03);
  rounded(g, [1.82, .16, 1.25], [0, 1.35, 1.53], body, .045);
  for (const s of [-1, 1]) {
    for (const z of [-1.4, 1.4]) { wheel(g, s, z, .44, 'mercedes'); arch(g, s, z, .44, body); rounded(g, [.22, .13, 1.13], [s * .98, 1.02, z], body, .035); }
    rounded(g, [.035, .56, .85], [s * .908, 1.58, .2], materials.glass, .025);
    rounded(g, [.035, .56, .77], [s * .908, 1.58, -.7], materials.glass, .022);
    rounded(g, [.035, .56, .52], [s * .908, 1.58, -1.43], materials.glass, .022);
    rounded(g, [.035, .055, 3.7], [s * .985, 1.08, -.05], materials.black, .014);
    path(g, [[s * .999, 1.1, -1.87], [s * .999, 1.1, 1.8]], .009, materials.chrome);
    rounded(g, [.26, .085, 2.42], [s * 1.05, .43, -.05], materials.chrome, .025);
    for (const z of [-.18, -1.03]) { rounded(g, [.065, .06, .23], [s * .956, 1.22, z], materials.black, .012); seam(g, s, [[z + .38, 1.93, .935], [z + .38, .65, .985], [z - .45, .65, .985], [z - .45, 1.92, .935]]); }
    // Exposed door hinges on the forward edge of each door — a G-Class signature.
    for (const zz of [.17, -.62]) for (const y of [.82, 1.74]) { rounded(g, [.055, .36, .05], [s * .995, y, zz], materials.chrome, .016); }
    for (const z of [.6, -.28]) for (const y of [.86, 1.26]) rounded(g, [.085, .075, .15], [s * .985, y, z], body, .012);
    mirror(g, s, 1.43, .69, body);
    rounded(g, [.19, .085, .18], [s * .77, 1.49, 1.95], materials.amber, .025);
    rounded(g, [.34, .14, .08], [s * .7, .74, -2.3], materials.tail, .025);
    for (const z of [-.84, -1.08]) { cylinder(g, .065, .25, [s * 1.1, .36, z], materials.chrome); cylinder(g, .048, .26, [s * 1.11, .36, z], materials.black); }
    path(g, [[s * .82, 2.04, -1.85], [s * .82, 2.04, .79]], .026, materials.black);
  }
  rounded(g, [1.61, .59, .03], [0, 1.6, .886], materials.glass, .025);
  box(g, [.035, .62, .04], [0, 1.6, .908], body);
  rounded(g, [1.54, .55, .04], [0, 1.58, -1.99], materials.glass, .025);
  for (const x of [-.39, .36]) path(g, [[x - .2, 1.34, .93], [x + .16, 1.37, .94]], .011, materials.black);
  rounded(g, [1.06, .45, .07], [0, 1.13, 2.27], materials.black, .045);
  for (let x = -.44; x < .46; x += .11) rounded(g, [.026, .36, .03], [x, 1.13, 2.315], materials.chrome, .01);
  mercedesBadge(g, 0, 1.15, 2.35, 1.1);
  for (const s of [-1, 1]) { cylinder(g, .22, .06, [s * .72, 1.15, 2.28], materials.black, 'z'); ring(g, .225, .012, [s * .72, 1.15, 2.33], materials.chrome); ring(g, .17, .018, [s * .72, 1.15, 2.335], materials.led); cylinder(g, .12, .063, [s * .72, 1.15, 2.3], materials.glass, 'z'); rounded(g, [.55, .21, .09], [s * .66, .7, 2.3], materials.black, .025); }
  rounded(g, [1.97, .2, .24], [0, .56, 2.27], body, .04); plate(g, true, 2.402, 'G 63');
  cylinder(g, .48, .24, [0, 1.18, -2.42], materials.rubber, 'z'); cylinder(g, .43, .26, [0, 1.18, -2.44], body, 'z'); ring(g, .43, .025, [0, 1.18, -2.579], materials.chrome);
  mercedesBadge(g, 0, 1.18, -2.583, .9); text(g, 'AMG', .25, .08, [-.65, 1.02, -2.29]).rotation.y = Math.PI; plate(g, false, -2.3, 'G 63');
  groundShadow(g, 4.6, 2.25);
  return bake(g);
}

export function createVehicles(parent, obstacle) {
  const definitions = [{ id: 'audi', name: 'Audi RS Q8', factory: makeAudi, x: -18, z: 5, rotation: .12 }, { id: 'tesla', name: 'Tesla Model X', factory: makeTesla, x: 26, z: 13.5, rotation: -Math.PI / 2 }, { id: 'mercedes', name: 'Mercedes-Benz G-Class', factory: makeMercedes, x: 8, z: 10, rotation: -.5 }];
  return definitions.map(d => { const group = d.factory(); group.position.set(d.x, .04, d.z); group.rotation.y = d.rotation; group.userData = { vehicle: d.id, displayName: d.name, source: 'Original geometry reconstructed from user reference' }; parent.add(group); const s = Math.abs(Math.sin(d.rotation)), c = Math.abs(Math.cos(d.rotation)); obstacle(d.x, d.z, 2.4 * c + 5.2 * s, 5.2 * c + 2.4 * s); return { ...d, group }; });
}
