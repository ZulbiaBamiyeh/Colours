// Item models, the character, and the offscreen studio that renders icons and turntables.
// Every item model is built along +Y and faces the camera (+Z).
import * as THREE from 'three';

const PI = Math.PI;

/* ---------------- Materials ---------------- */
const TOON = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 165, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

export function materialFactory(style) {
  const m = (hex, o = {}) => {
    const glow = o.glow || 0;
    let mat;
    if (style === 'pixel') {
      mat = new THREE.MeshToonMaterial({
        color: hex, gradientMap: TOON, vertexColors: !!o.vc,
        emissive: glow ? hex : 0x000000, emissiveIntensity: glow * 0.8,
      });
    } else {
      const c = new THREE.Color(hex);
      const hsl = {};
      c.getHSL(hsl, THREE.SRGBColorSpace);
      c.setHSL(hsl.h, hsl.s * 0.55, Math.min(1, hsl.l * 0.88 + 0.02), THREE.SRGBColorSpace);
      mat = new THREE.MeshLambertMaterial({
        color: c, flatShading: true, vertexColors: !!o.vc,
        emissive: glow ? c : 0x000000, emissiveIntensity: glow * 0.45,
      });
    }
    if (o.double) mat.side = THREE.DoubleSide;
    if (o.back) mat.side = THREE.BackSide;
    return mat;
  };
  m.style = style;
  return m;
}
export const MS = materialFactory('smooth');
const hslHex = (h, s, l) => new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace).getHex(THREE.SRGBColorSpace);

/* ---------------- Geometry helpers ---------------- */
export function mesh(geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = null) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(...p);
  o.rotation.set(...r);
  if (s) o.scale.set(...s);
  return o;
}
function extrude(shape, depth, bevel = 0.015) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}
function shapeFrom(points, sx = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(points[0][0] * sx, points[0][1]);
  for (let i = 1; i < points.length; i++) sh.lineTo(points[i][0] * sx, points[i][1]);
  sh.closePath();
  return sh;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 8, open = false, ts = 0, tl = PI * 2) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open, ts, tl);
const sph = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const torus = (r, t, rs = 6, ts = 16, arc = PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
const octa = r => new THREE.OctahedronGeometry(r);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const tetra = r => new THREE.TetrahedronGeometry(r);
const lathe = (pts, segs = 14) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs);
function rod(mat, a, b, r = 0.02) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const o = new THREE.Mesh(cyl(r, r, len, 5), mat);
  o.position.copy(va).add(vb).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return o;
}
function rainbow(geo, s, l, phase = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count / 3;
  const cols = [];
  for (let f = 0; f < n; f++) {
    const c = new THREE.Color().setHSL((f / n + phase) % 1, s, l, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return g;
}
const rb = (m) => m.style === 'pixel' ? [0.9, 0.62] : [0.5, 0.56];
const WING = [[0, 0], [0.16, 0.06], [0.34, 0.2], [0.5, 0.48], [0.37, 0.37], [0.43, 0.27], [0.29, 0.23], [0.31, 0.13], [0.15, 0.1]];
const HEART = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.22);
  s.bezierCurveTo(-0.05, -0.15, -0.26, -0.04, -0.24, 0.1);
  s.bezierCurveTo(-0.22, 0.24, -0.05, 0.26, 0, 0.14);
  s.bezierCurveTo(0.05, 0.26, 0.22, 0.24, 0.24, 0.1);
  s.bezierCurveTo(0.26, -0.04, 0.05, -0.15, 0, -0.22);
  return s;
})();
function star(points, ro, ri) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = PI / 2 + (i * PI) / points;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/* ---------------- Hand-built models from the first prototypes ---------------- */
function cinder(m) {
  const g = new THREE.Group();
  const blade = new THREE.Shape();
  blade.moveTo(-0.11, 0);
  blade.lineTo(0.11, 0);
  blade.quadraticCurveTo(0.16, 0.62, 0.03, 1.18);
  blade.quadraticCurveTo(-0.05, 0.72, -0.11, 0);
  g.add(mesh(extrude(blade, 0.06, 0.012), m(0x47414f), [0, 0.06, 0]));
  g.add(mesh(extrude(blade, 0.026, 0), m(0xff6a1a, { glow: 0.9 }), [0, 0.03, 0], [0, 0, 0], [1.38, 1.06, 1]));
  g.add(mesh(box(0.54, 0.09, 0.15), m(0x7d401b), [0, 0.02, 0]));
  g.add(mesh(cone(0.05, 0.17, 6), m(0xff8a2a, { glow: 0.5 }), [0.28, 0.09, 0], [0, 0, -0.55]));
  g.add(mesh(cone(0.05, 0.17, 6), m(0xff8a2a, { glow: 0.5 }), [-0.28, 0.09, 0], [0, 0, 0.55]));
  g.add(mesh(cyl(0.055, 0.062, 0.42, 8), m(0x5c2d1c), [0, -0.24, 0]));
  for (const y of [-0.11, -0.24, -0.37]) g.add(mesh(torus(0.063, 0.018, 6, 12), m(0x2c1711), [0, y, 0], [PI / 2, 0, 0]));
  g.add(mesh(octa(0.1), m(0xffa31a, { glow: 0.9 }), [0, -0.53, 0], [0, 0, 0], [1, 1.25, 1]));
  const flick = [[0.25, 0.74, 0.05], [-0.21, 0.97, 0], [0.17, 1.2, -0.03]].map(p => {
    const e = mesh(tetra(0.042), m(0xffd04a, { glow: 1 }), p);
    e.userData.base = p.slice();
    g.add(e);
    return e;
  });
  g.userData.anim = t => flick.forEach((e, i) => {
    e.position.y = e.userData.base[1] + Math.sin(t * 2.2 + i * 2) * 0.05;
    e.rotation.set(t * 2 + i, t * 1.5, 0);
  });
  return g;
}

function maul(m) {
  const g = new THREE.Group();
  const ice = m(0x7fd6ff, { glow: 0.15 });
  const shard = m(0xccf5ff, { glow: 0.2 });
  const deep = m(0x4fb2e8, { glow: 0.1 });
  const trim = m(0xc6d0e2);
  g.add(mesh(cyl(0.055, 0.065, 2.1, 8), m(0x3b4660), [0, -0.1, 0]));
  g.add(mesh(cyl(0.074, 0.074, 0.55, 8), m(0x43302b), [0, -0.8, 0]));
  for (const y of [-0.62, -0.8, -0.98]) g.add(mesh(torus(0.076, 0.018, 6, 12), m(0x24191a), [0, y, 0], [PI / 2, 0, 0]));
  g.add(mesh(octa(0.1), shard, [0, -1.2, 0], [0, 0, 0], [1, 1.4, 1]));
  g.add(mesh(cyl(0.09, 0.09, 0.12, 8), trim, [0, 0.76, 0]));
  g.add(mesh(cyl(0.24, 0.24, 0.78, 10), m(0x6a7a99), [0, 1.0, 0], [0, 0, PI / 2]));
  for (const x of [-0.22, 0.22]) g.add(mesh(torus(0.25, 0.04, 6, 14), trim, [x, 1.0, 0], [0, PI / 2, 0]));
  for (const s of [-1, 1]) {
    g.add(mesh(ico(0.33, 0), ice, [0.5 * s, 1.0, 0], [0.3, 0.2 * s, 0], [0.8, 1, 1]));
    g.add(mesh(cone(0.12, 0.52, 5), shard, [0.84 * s, 1.0, 0], [0, 0, -PI / 2 * s]));
    g.add(mesh(cone(0.08, 0.36, 5), deep, [0.5 * s, 1.33, 0.05 * s], [0, 0, -0.32 * s]));
    g.add(mesh(cone(0.07, 0.3, 5), shard, [0.55 * s, 0.7, 0.08], [0, 0, PI + 0.45 * s]));
  }
  g.add(mesh(cone(0.09, 0.42, 5), shard, [0, 1.4, 0]));
  return g;
}

function kindling(m) {
  const g = new THREE.Group();
  const gold = m(0xe9b23b);
  g.add(mesh(torus(0.52, 0.1, 8, 28), gold));
  g.add(mesh(cyl(0.17, 0.13, 0.14, 8), m(0xc48a24), [0, 0.64, 0]));
  for (const s of [-1, 1]) {
    g.add(mesh(cyl(0.028, 0.028, 0.46, 6), m(0x7a4a26), [0, 0.8, 0.06], [0, 0, 0.6 * s]));
    g.add(mesh(extrude(shapeFrom(WING, s), 0.035, 0.01), m(0xfff3dc), [0.43 * s, 0.38, 0], [0, 0, -0.5 * s], [0.55, 0.55, 1]));
  }
  g.add(mesh(octa(0.15), m(0xff5320, { glow: 0.6 }), [0, 0.82, 0], [0, 0, 0], [1, 1.2, 1]));
  for (const [x, z] of [[0.13, 0], [-0.13, 0], [0, 0.13], [0, -0.13]]) g.add(mesh(cone(0.03, 0.13, 5), gold, [x, 0.77, z]));
  const flame = mesh(cone(0.1, 0.34, 7), m(0xff9a2a, { glow: 1 }), [0, 1.1, 0]);
  const core = mesh(cone(0.05, 0.2, 6), m(0xffee88, { glow: 1 }), [0, 1.06, 0.05]);
  g.add(flame, core);
  g.userData.anim = t => {
    const k = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 5.3) * 0.05;
    flame.scale.set(1, k, 1);
    core.scale.set(1, 2 - k, 1);
  };
  return g;
}

function haloHelm(m) {
  const g = new THREE.Group();
  const gold = m(0xe8b73a);
  g.add(mesh(new THREE.SphereGeometry(0.6, 16, 9, 0, PI * 2, 0, PI / 2), m(0xf3eedc), [0, 0, 0], [0, 0, 0], [1, 1.05, 1]));
  g.add(mesh(cyl(0.6, 0.64, 0.34, 18, true, 0.6, PI * 2 - 1.2), m(0xe6dfc8, { double: true }), [0, -0.17, 0]));
  g.add(mesh(box(0.08, 0.3, 0.06), gold, [0, -0.12, 0.61]));
  g.add(mesh(torus(0.6, 0.065, 6, 26), gold, [0, 0, 0], [PI / 2, 0, 0]));
  g.add(mesh(torus(0.62, 0.045, 6, 20, PI), gold, [0, 0, 0], [0, PI / 2, 0]));
  g.add(mesh(octa(0.1), m(0x7fd0ff, { glow: 0.4 }), [0, 0.2, 0.6], [0, 0, 0], [1, 1.3, 0.6]));
  for (const s of [-1, 1]) g.add(mesh(extrude(shapeFrom(WING, s), 0.04, 0.012), m(0xffffff), [0.56 * s, 0.12, -0.05], [0, -0.5 * s, 0], [1.05, 1.05, 1]));
  const halo = mesh(torus(0.42, 0.045, 6, 28), m(0xffe27a, { glow: 0.9 }), [0, 0.98, 0], [PI / 2 - 0.35, 0, 0]);
  g.add(halo);
  g.userData.anim = t => { halo.position.y = 0.98 + Math.sin(t * 2) * 0.04; };
  return g;
}

function prismStaff(m) {
  const g = new THREE.Group();
  const silver = m(0xd5dbe8);
  g.add(mesh(cyl(0.05, 0.06, 2.0, 7), m(0x4a3550)));
  for (const y of [-0.4, 0.3]) g.add(mesh(torus(0.064, 0.022, 6, 12), silver, [0, y, 0], [PI / 2, 0, 0]));
  g.add(mesh(cone(0.07, 0.18, 6), silver, [0, -1.08, 0], [PI, 0, 0]));
  g.add(mesh(cyl(0.11, 0.07, 0.16, 8), silver, [0, 1.04, 0]));
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = i * PI * 2 / 3;
    arm.add(mesh(cyl(0.022, 0.03, 0.44, 6), silver, [0.15, 1.28, 0], [0, 0, -0.32]));
    arm.add(mesh(sph(0.04, 8, 6), silver, [0.22, 1.5, 0]));
    g.add(arm);
  }
  const [s, l] = rb(m);
  const gem = mesh(rainbow(octa(0.24), s, l), m(0xffffff, { vc: true }), [0, 1.44, 0], [0, 0, 0], [1, 1.7, 1]);
  g.add(gem);
  const orbiters = [0, 1, 2].map(i => {
    const o = mesh(tetra(0.07), m(hslHex(i / 3 + 0.02, 0.85, 0.62), { glow: 0.5 }));
    o.userData.a0 = i * PI * 2 / 3;
    g.add(o);
    return o;
  });
  g.userData.anim = t => {
    gem.rotation.y = t * 0.8;
    orbiters.forEach((o, i) => {
      const a = o.userData.a0 + t * 1.4;
      o.position.set(Math.cos(a) * 0.42, 1.44 + Math.sin(a * 2 + i) * 0.08, Math.sin(a) * 0.42);
      o.rotation.set(t * 2 + i, t * 3, 0);
    });
  };
  return g;
}

/* ---------------- Shared recipes ---------------- */
function hilt(g, m, p, len = 0.4) {
  g.add(mesh(cyl(0.055, 0.062, len), m(p.grip ?? 0x4a2e20), [0, -len / 2 - 0.03, 0]));
  for (let i = 1; i <= 3; i++) g.add(mesh(torus(0.063, 0.017, 6, 12), m(p.wrap ?? 0x2a1a12), [0, -0.03 - (len * i) / 4, 0], [PI / 2, 0, 0]));
  g.add(mesh(octa(0.09), m(p.gem ?? 0xd8c070, { glow: p.gemGlow ?? 0.4 }), [0, -len - 0.1, 0], [0, 0, 0], [1, 1.25, 1]));
}
function drips(g, m, color, pts) {
  for (const [x, y, z] of pts) {
    g.add(mesh(sph(0.045, 8, 6), m(color, { glow: 0.4 }), [x, y, z]));
    g.add(mesh(cone(0.045, 0.09, 6), m(color, { glow: 0.4 }), [x, y + 0.06, z]));
  }
}
function flames(g, m, x, y, z, s = 1) {
  g.add(mesh(cone(0.12 * s, 0.4 * s, 7), m(0xff8a2a, { glow: 1 }), [x, y + 0.2 * s, z]));
  g.add(mesh(cone(0.06 * s, 0.24 * s, 6), m(0xffe27a, { glow: 1 }), [x, y + 0.14 * s, z + 0.05 * s]));
}
function snowflake(g, m, color, x, y, z, r = 0.2) {
  const mat = m(color, { glow: 0.4 });
  for (let i = 0; i < 3; i++) g.add(mesh(box(r * 2, 0.04, 0.04), mat, [x, y, z], [0, 0, (i * PI) / 3]));
  g.add(mesh(octa(r * 0.3), mat, [x, y, z]));
}
function clover(g, m, color, x, y, z, r = 0.08) {
  const mat = m(color, { glow: 0.3 });
  for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) g.add(mesh(sph(r * 0.95, 8, 6), mat, [x + dx, y + dy, z], [0, 0, 0], [1, 1, 0.4]));
  g.add(mesh(cyl(0.012, 0.012, r * 2), mat, [x + r * 0.6, y - r * 1.4, z], [0, 0, 0.5]));
}

function crescent(g, m, color, x, y, z, r = 0.2, glow = 0.5) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, PI * 0.5, PI * 1.5, false);
  s.absarc(r * 0.38, 0, r * 0.8, PI * 1.5, PI * 0.5, true);
  g.add(mesh(extrude(s, r * 0.3, r * 0.06), m(color, { glow }), [x, y, z], [0, 0, -0.35]));
}
function rose(g, m, color, x, y, z, r = 0.12) {
  const mat = m(color, { glow: 0.25 });
  for (let i = 0; i < 6; i++) {
    const a = (i * PI) / 3;
    g.add(mesh(sph(r * 0.55, 7, 5), mat, [x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, z], [0, 0, a], [1.2, 0.8, 0.5]));
  }
  g.add(mesh(sph(r * 0.5, 8, 6), m(color, { glow: 0.4 }), [x, y, z + r * 0.2], [0, 0, 0], [1, 1, 0.8]));
  g.add(mesh(torus(r * 0.25, r * 0.08, 4, 10), m(0x7a1e3e), [x, y, z + r * 0.42]));
}
// Scatter thorn spikes over a finished model, pointing out along the surface. Deterministic per seed.
function addSpikes(g, m, o) {
  g.updateMatrixWorld(true);
  const cand = [];
  const nm = new THREE.Matrix3();
  g.traverse(obj => {
    const geo = obj.geometry;
    if (!obj.isMesh || !geo.attributes.normal) return;
    nm.getNormalMatrix(obj.matrixWorld);
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      const n = new THREE.Vector3().fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      if (o.front && n.z < 0.15) continue;
      if (o.minY != null && v.y < o.minY) continue;
      cand.push([v, n]);
    }
  });
  if (!cand.length) return;
  let seed = (o.seed ?? 1) * 9301 + 49297;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const picked = [cand[Math.floor(rnd() * cand.length)]];
  const pool = cand.length > 700 ? Array.from({ length: 700 }, () => cand[Math.floor(rnd() * cand.length)]) : cand;
  const dist = pool.map(([v]) => v.distanceTo(picked[0][0]));
  while (picked.length < o.n) {
    let bi = 0;
    for (let i = 1; i < pool.length; i++) if (dist[i] > dist[bi]) bi = i;
    if (dist[bi] < 1e-3) break;
    picked.push(pool[bi]);
    for (let i = 0; i < pool.length; i++) dist[i] = Math.min(dist[i], pool[i][0].distanceTo(pool[bi][0]));
  }
  const mat = m(o.color);
  const size = o.size ?? 0.08;
  const geo = cone(size * 0.32, size, 4);
  const up = new THREE.Vector3(0, 1, 0);
  for (const [v, n] of picked) {
    const c = new THREE.Mesh(geo, mat);
    c.position.copy(v).addScaledVector(n, size * 0.42);
    c.quaternion.setFromUnitVectors(up, n);
    g.add(c);
  }
}
function whip(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.06, 0.07, 0.5, 7), m(p.grip), [0, -0.3, 0]));
  g.add(mesh(sph(0.08, 7, 5), m(p.grip), [0, -0.58, 0]));
  g.add(mesh(torus(0.07, 0.025, 5, 10), m(0xc48a24), [0, -0.04, 0], [PI / 2, 0, 0]));
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector3(Math.sin(t * 5.5) * 0.3 * t, t * 1.45, Math.cos(t * 5.5) * 0.12 * t));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.035, 5), m(p.vine)));
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const at = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const side = new THREE.Vector3(0, 0, 1).cross(tan).normalize().multiplyScalar(i % 2 ? 1 : -1);
    const c = mesh(cone(0.022, 0.09, 4), m(p.thorn));
    c.position.copy(at).addScaledVector(side, 0.05);
    c.quaternion.setFromUnitVectors(up, side);
    g.add(c);
  }
  for (const t of [0.3, 0.62]) {
    const at = curve.getPointAt(t);
    g.add(mesh(sph(0.07, 6, 4), m(0x6f8a3a), [at.x + 0.08, at.y, at.z], [0, 0, 0.6], [1.4, 0.5, 0.3]));
  }
  rose(g, m, p.bloom, 0, 0.04, 0.02, 0.09);
  return g;
}

/* Weapons */
function dagger(m, p) {
  const g = new THREE.Group();
  const L = p.len ?? 1.12, cv = p.curve ?? 0.03;
  const s = new THREE.Shape();
  s.moveTo(-0.1, 0);
  s.lineTo(0.1, 0);
  s.quadraticCurveTo(0.13 + cv, L * 0.55, 0.02 + cv, L);
  s.quadraticCurveTo(-0.05 + cv, L * 0.62, -0.1, 0);
  g.add(mesh(extrude(s, 0.06, 0.012), m(p.blade), [0, 0.06, 0]));
  if (p.edge) g.add(mesh(extrude(s, 0.026, 0), m(p.edge, { glow: p.glow ?? 0.7 }), [0, 0.03, 0], [0, 0, 0], [1.36, 1.05, 1]));
  g.add(mesh(box(0.48, 0.08, 0.14), m(p.guard), [0, 0.02, 0]));
  if (p.drip) drips(g, m, p.drip, [[0.12, 0.55, 0.03], [-0.06, 0.32, 0.03]]);
  hilt(g, m, p, 0.4);
  return g;
}
function sword(m, p) {
  const g = new THREE.Group();
  const L = p.len ?? 1.45, w = p.w ?? 0.085, cv = p.curve ?? 0;
  const s = new THREE.Shape();
  if (cv) {
    s.moveTo(-w, 0); s.lineTo(w, 0);
    s.quadraticCurveTo(w + cv * 1.4, L * 0.6, cv * 0.9, L);
    s.quadraticCurveTo(-w + cv, L * 0.55, -w, 0);
  } else {
    s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, L - 0.2); s.lineTo(0, L); s.lineTo(-w, L - 0.2); s.closePath();
  }
  g.add(mesh(extrude(s, 0.05, 0.012), m(p.blade), [0, 0.05, 0]));
  if (p.edge) g.add(mesh(extrude(s, 0.022, 0), m(p.edge, { glow: p.glow ?? 0.5 }), [0, 0.03, 0], [0, 0, 0], [1.4, 1.03, 1]));
  if (p.fuller) g.add(mesh(box(w * 0.55, L * 0.6, 0.066), m(p.fuller, { glow: 0.7 }), [cv * 0.25, L * 0.4, 0]));
  if (p.rapier) {
    g.add(mesh(torus(0.16, 0.025, 6, 16), m(p.guard), [0, 0.04, 0.02], [0, PI / 2, 0]));
    g.add(mesh(box(0.36, 0.05, 0.08), m(p.guard), [0, 0.02, 0]));
  } else {
    g.add(mesh(box(p.guardW ?? 0.56, 0.09, 0.16), m(p.guard), [0, 0.02, 0]));
  }
  if (p.tips) for (const k of [-1, 1]) g.add(mesh(cone(0.055, 0.2, 6), m(p.tips, { glow: 0.4 }), [0.3 * k, 0.09, 0], [0, 0, -0.6 * k]));
  if (p.frost) for (const [x, y] of [[0.1, 0.5], [-0.09, 0.9], [0.08, 1.2]]) g.add(mesh(cone(0.04, 0.16, 5), m(p.frost, { glow: 0.3 }), [x, y, 0.03], [0, 0, x > 0 ? -0.8 : 0.8]));
  if (p.coin) g.add(mesh(cyl(0.07, 0.07, 0.07, 14), m(p.coin, { glow: 0.3 }), [0, 0.02, 0.07], [PI / 2, 0, 0]));
  hilt(g, m, p, p.hilt ?? 0.4);
  return g;
}
function mace(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.05, 0.06, 1.15), m(p.haft)));
  g.add(mesh(cyl(0.07, 0.07, 0.36), m(p.grip ?? 0x4a2e20), [0, -0.38, 0]));
  g.add(mesh(sph(0.08), m(p.flange), [0, -0.6, 0]));
  g.add(mesh(ico(0.2, 0), m(p.head), [0, 0.64, 0]));
  for (let i = 0; i < 6; i++) {
    const a = (i * PI) / 3;
    g.add(mesh(box(0.17, 0.34, 0.05), m(p.flange), [Math.cos(a) * 0.19, 0.64, Math.sin(a) * 0.19], [0, -a, 0]));
  }
  g.add(mesh(cone(0.06, 0.22, 6), m(p.flange), [0, 0.9, 0]));
  if (p.gem) g.add(mesh(octa(0.07), m(p.gem, { glow: 0.5 }), [0, 0.64, 0.24]));
  return g;
}
function hammer(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.055, 0.065, 2.1), m(p.haft), [0, -0.1, 0]));
  g.add(mesh(cyl(0.074, 0.074, 0.55), m(p.grip ?? 0x4a2e20), [0, -0.8, 0]));
  g.add(mesh(octa(0.1), m(p.face), [0, -1.2, 0], [0, 0, 0], [1, 1.3, 1]));
  g.add(mesh(box(0.86, 0.42, 0.42), m(p.head), [0, 1.0, 0]));
  for (const x of [-0.45, 0.45]) g.add(mesh(cyl(0.2, 0.2, 0.06, 14), m(p.face, { glow: 0.45 }), [x, 1.0, 0], [0, 0, PI / 2]));
  g.add(mesh(torus(0.25, 0.04, 6, 4), m(p.face), [0, 1.0, 0], [0, PI / 2, PI / 4]));
  g.add(mesh(cone(0.08, 0.32, 6), m(p.face), [0, 1.36, 0]));
  return g;
}
function axe(m, p) {
  const g = new THREE.Group();
  const H = p.two ? 2.0 : 1.35;
  g.add(mesh(cyl(0.05, 0.06, H), m(p.haft)));
  g.add(mesh(cyl(0.068, 0.068, 0.4), m(p.grip ?? 0x3a2418), [0, -H / 2 + 0.28, 0]));
  g.add(mesh(octa(0.08), m(p.gem ?? p.blade, { glow: 0.4 }), [0, -H / 2 - 0.06, 0], [0, 0, 0], [1, 1.3, 1]));
  const top = H / 2 - 0.28;
  const s = new THREE.Shape();
  s.moveTo(0, 0.16);
  s.quadraticCurveTo(0.32, 0.26, 0.56, 0.44);
  s.quadraticCurveTo(0.72, 0, 0.56, -0.44);
  s.quadraticCurveTo(0.32, -0.26, 0, -0.16);
  s.closePath();
  const geo = extrude(s, 0.06, 0.015);
  g.add(mesh(geo, m(p.blade), [0.04, top, 0]));
  if (p.edge) g.add(mesh(extrude(s, 0.024, 0), m(p.edge, { glow: 0.5 }), [0.06, top, 0], [0, 0, 0], [1.08, 1.08, 1]));
  if (p.double) {
    g.add(mesh(geo, m(p.blade), [-0.04, top, 0], [0, PI, 0]));
    if (p.edge) g.add(mesh(extrude(s, 0.024, 0), m(p.edge, { glow: 0.5 }), [-0.06, top, 0], [0, PI, 0], [1.08, 1.08, 1]));
  }
  g.add(mesh(box(0.15, 0.42, 0.15), m(p.socket ?? 0x2a1a1e), [0, top, 0]));
  g.add(mesh(cone(0.06, 0.24, 6), m(p.socket ?? 0x2a1a1e), [0, top + 0.32, 0]));
  return g;
}
function cleaver(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.05, 0.06, 1.9), m(p.haft)));
  g.add(mesh(cyl(0.07, 0.07, 0.5), m(p.grip ?? 0x24543e), [0, -0.6, 0]));
  g.add(mesh(octa(0.09), m(p.coin, { glow: 0.4 }), [0, -1.0, 0]));
  const s = shapeFrom([[0, -0.36], [0.62, -0.3], [0.7, 0.46], [0, 0.42]]);
  g.add(mesh(extrude(s, 0.06, 0.015), m(p.blade), [0.04, 0.62, 0]));
  g.add(mesh(extrude(shapeFrom([[0.58, -0.3], [0.66, -0.3], [0.74, 0.46], [0.66, 0.46]]), 0.03, 0), m(p.edge, { glow: 0.4 }), [0.04, 0.62, 0]));
  g.add(mesh(cyl(0.13, 0.13, 0.08, 16), m(p.coin, { glow: 0.4 }), [0.38, 0.66, 0], [PI / 2, 0, 0]));
  clover(g, m, p.clover, 0.38, 0.66, 0.05, 0.05);
  g.add(mesh(box(0.13, 0.84, 0.13), m(p.coin), [0, 0.66, 0]));
  return g;
}
function scythe(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.048, 0.06, 2.1), m(p.haft)));
  g.add(mesh(cyl(0.068, 0.068, 0.4), m(p.grip ?? 0x2e3a22), [0, -0.5, 0]));
  g.add(mesh(sph(0.1, 8, 6), m(p.bone), [0, -1.08, 0], [0, 0, 0], [1, 1.2, 1]));
  const s = new THREE.Shape();
  s.moveTo(0, 0.07);
  s.quadraticCurveTo(0.6, 0.28, 1.05, -0.18);
  s.quadraticCurveTo(0.55, 0.0, 0, -0.08);
  s.closePath();
  g.add(mesh(extrude(s, 0.05, 0.012), m(p.blade), [0.02, 0.98, 0]));
  g.add(mesh(extrude(s, 0.02, 0), m(p.edge, { glow: 0.6 }), [0.03, 0.96, 0], [0, 0, 0], [1.04, 1.12, 1]));
  g.add(mesh(box(0.16, 0.24, 0.14), m(p.bone), [0, 0.98, 0]));
  drips(g, m, p.edge, [[0.7, 0.86, 0.03], [0.4, 0.88, 0.03]]);
  return g;
}
function glaive(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.048, 0.06, 2.0), m(p.haft)));
  g.add(mesh(cyl(0.07, 0.07, 0.4), m(p.grip ?? 0x6a4424), [0, -0.5, 0]));
  g.add(mesh(cone(0.06, 0.2, 6), m(p.trim), [0, -1.1, 0], [PI, 0, 0]));
  const s = new THREE.Shape();
  s.moveTo(-0.08, 0);
  s.lineTo(0.09, 0);
  s.quadraticCurveTo(0.26, 0.42, 0.04, 0.82);
  s.quadraticCurveTo(-0.02, 0.42, -0.08, 0);
  g.add(mesh(extrude(s, 0.05, 0.012), m(p.blade), [0, 1.02, 0]));
  g.add(mesh(cyl(0.1, 0.07, 0.14, 8), m(p.trim), [0, 0.98, 0]));
  g.add(mesh(cone(0.07, 0.34, 6), m(p.tassel), [-0.12, 0.8, 0.05], [0, 0, 0.3]));
  g.add(mesh(octa(0.06), m(p.gem, { glow: 0.5 }), [0.02, 1.2, 0.04]));
  return g;
}

/* Offhands */
function buckler(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.56, 0.56, 0.08, 20), m(p.a), [0, 0, 0], [PI / 2, 0, 0]));
  for (const x of [-0.2, 0.2]) g.add(mesh(box(0.02, 1.0, 0.09), m(p.line ?? 0x3c2a1c), [x, 0, 0]));
  g.add(mesh(torus(0.56, 0.05, 6, 28), m(p.b)));
  g.add(mesh(sph(0.14, 10, 8), m(p.c), [0, 0, 0.05], [0, 0, 0], [1, 1, 0.6]));
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4;
    g.add(mesh(sph(0.03, 6, 4), m(p.b), [Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0.05]));
  }
  return g;
}
function tome(m, p) {
  const g = new THREE.Group();
  g.add(mesh(box(0.78, 1.0, 0.22), m(p.a)));
  g.add(mesh(box(0.72, 0.94, 0.18), m(0xf1e6cc), [0.05, 0, 0]));
  g.add(mesh(cyl(0.11, 0.11, 1.0, 8, false, PI, PI), m(p.a), [-0.39, 0, 0]));
  for (const [x, y] of [[0.36, 0.47], [0.36, -0.47]]) g.add(mesh(box(0.1, 0.1, 0.24), m(p.b), [x, y, 0]));
  g.add(mesh(cyl(0.17, 0.17, 0.04, 16), m(p.c, { glow: 0.6 }), [0, 0.06, 0.12], [PI / 2, 0, 0]));
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4;
    g.add(mesh(box(0.04, 0.12, 0.03), m(p.c, { glow: 0.5 }), [Math.cos(a) * 0.27, 0.06 + Math.sin(a) * 0.27, 0.12], [0, 0, a - PI / 2]));
  }
  g.add(mesh(box(0.14, 0.18, 0.26), m(p.b), [0.38, -0.05, 0]));
  return g;
}
function censer(m, p) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [0.24, 0.02], [0.32, 0.15], [0.3, 0.3], [0.22, 0.36], [0, 0.36]]), m(p.a), [0, -0.3, 0]));
  g.add(mesh(cone(0.26, 0.28, 8), m(p.b), [0, 0.2, 0]));
  for (let i = 0; i < 5; i++) {
    const a = (i * PI * 2) / 5;
    g.add(mesh(sph(0.05, 6, 4), m(p.glow, { glow: 1 }), [Math.cos(a) * 0.29, -0.08, Math.sin(a) * 0.29]));
  }
  const chain = m(p.b);
  for (let i = 0; i < 3; i++) {
    const a = (i * PI * 2) / 3 + 0.4;
    g.add(rod(chain, [Math.cos(a) * 0.26, 0.04, Math.sin(a) * 0.26], [0, 0.95, 0], 0.016));
  }
  g.add(mesh(torus(0.08, 0.02, 6, 12), chain, [0, 1.0, 0]));
  flames(g, m, 0, 0.3, 0, 0.6);
  return g;
}
function brazier(m, p) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [0.42, 0.04], [0.5, 0.2], [0.46, 0.26], [0.4, 0.22]]), m(p.a), [0, 0, 0]));
  for (let i = 0; i < 3; i++) {
    const a = (i * PI * 2) / 3;
    g.add(rod(m(p.b), [Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3], [Math.cos(a) * 0.42, -0.5, Math.sin(a) * 0.42], 0.03));
  }
  for (const [x, z] of [[0.12, 0.05], [-0.14, 0], [0, -0.12], [0.02, 0.14]]) g.add(mesh(ico(0.09, 0), m(0x3a2418), [x, 0.22, z]));
  flames(g, m, 0, 0.22, 0, 1.2);
  flames(g, m, -0.18, 0.2, 0.04, 0.7);
  flames(g, m, 0.18, 0.2, -0.02, 0.8);
  return g;
}
function lantern(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.28, 0.32, 0.1, 8), m(p.a), [0, -0.45, 0]));
  g.add(mesh(cone(0.34, 0.26, 8), m(p.a), [0, 0.42, 0]));
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2 + PI / 4;
    g.add(rod(m(p.a), [Math.cos(a) * 0.25, -0.42, Math.sin(a) * 0.25], [Math.cos(a) * 0.25, 0.3, Math.sin(a) * 0.25], 0.025));
  }
  g.add(mesh(ico(0.16, 1), m(p.glow, { glow: 1 }), [0, -0.05, 0]));
  for (const [x, r] of [[0.1, -0.4], [-0.1, 0.4]]) g.add(mesh(cone(0.05, 0.28, 5), m(p.b, { glow: 0.5 }), [x, -0.12, 0.05], [0, 0, r]));
  g.add(mesh(torus(0.14, 0.025, 6, 14, PI), m(p.a), [0, 0.55, 0]));
  return g;
}
function bell(m, p) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0.55], [0.12, 0.54], [0.2, 0.44], [0.24, 0.24], [0.3, 0.02], [0.4, -0.14], [0.42, -0.2], [0, -0.2]], 16), m(p.a)));
  g.add(mesh(sph(0.08, 8, 6), m(p.b), [0, -0.24, 0]));
  g.add(mesh(cyl(0.05, 0.06, 0.3), m(0x5b3a24), [0, 0.7, 0]));
  g.add(mesh(sph(0.07, 8, 6), m(p.b), [0, 0.88, 0]));
  g.add(mesh(torus(0.3, 0.05, 6, 18), m(0xffffff), [0, 0.06, 0], [PI / 2, 0, 0]));
  snowflake(g, m, p.b, 0, 0.18, 0.27, 0.11);
  return g;
}
function pouch(m, p) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, -0.42], [0.3, -0.36], [0.42, -0.1], [0.38, 0.14], [0.2, 0.3], [0.13, 0.36], [0.22, 0.5], [0.18, 0.52]]), m(p.a)));
  g.add(mesh(torus(0.15, 0.035, 6, 14), m(p.b), [0, 0.34, 0], [PI / 2, 0, 0]));
  g.add(mesh(cone(0.14, 0.12, 8), m(p.c), [0, 0.54, 0]));
  for (const [x, y] of [[0.24, 0.3], [0.32, 0.12], [0.36, -0.06]]) g.add(mesh(sph(0.04, 6, 4), m(p.c), [x, y, 0.22]));
  g.add(rod(m(p.b), [0.15, 0.34, 0.05], [0.3, 0.1, 0.25], 0.018));
  return g;
}
function coin(m, p) {
  const g = new THREE.Group();
  if (p.rainbow) {
    const [s, l] = rb(m);
    g.add(mesh(rainbow(cyl(0.48, 0.48, 0.1, 24), s, l), m(0xffffff, { vc: true }), [0, 0, 0], [PI / 2, 0, 0]));
  } else {
    g.add(mesh(cyl(0.48, 0.48, 0.1, 24), m(p.a), [0, 0, 0], [PI / 2, 0, 0]));
  }
  g.add(mesh(torus(0.4, 0.03, 6, 26), m(p.b), [0, 0, 0.05]));
  if (p.star) g.add(mesh(extrude(star(5, 0.26, 0.11), 0.04, 0.01), m(p.c, { glow: 0.6 }), [0, 0, 0.06]));
  else clover(g, m, p.c, 0, 0.03, 0.06, 0.1);
  return g;
}

/* Helms */
function hood(m, p) {
  // An open-faced hood: a closed crown, sides and back with a face opening, a lining,
  // a trim that follows the opening, a pointed tip and a drape over the shoulders.
  const g = new THREE.Group();
  const R = 0.56, gap = 0.95, capT = PI * 0.3, sideT = PI * 0.42;
  const outer = m(p.a), inner = m(p.lining ?? 0x24170f, { back: true });
  const ps = PI / 2 + gap, pl = PI * 2 - gap * 2;
  for (const [r, mat] of [[R, outer], [R * 0.97, inner]]) {
    g.add(mesh(new THREE.SphereGeometry(r, 20, 6, 0, PI * 2, 0, capT), mat));
    g.add(mesh(new THREE.SphereGeometry(r, 20, 8, ps, pl, capT, sideT), mat));
  }
  const bottomY = R * Math.cos(capT + sideT), bottomR = R * Math.sin(capT + sideT);
  g.add(mesh(cyl(bottomR, 0.76, 0.34, 20, true, gap * 0.85, PI * 2 - gap * 1.7), m(p.a, { double: true }), [0, bottomY - 0.17, 0]));
  g.add(mesh(torus(0.76, 0.03, 5, 28, PI * 2 - gap * 1.7), m(p.b), [0, bottomY - 0.34, 0], [PI / 2, 0, PI / 2 + gap * 0.85]));
  const pt = (phi, theta, k = 1.01) => new THREE.Vector3(
    -R * k * Math.cos(phi) * Math.sin(theta), R * k * Math.cos(theta), R * k * Math.sin(phi) * Math.sin(theta));
  const edge = [];
  const bottom = capT + sideT;
  for (let i = 0; i <= 6; i++) edge.push(pt(PI / 2 + gap, bottom - (sideT * i) / 6));
  for (let i = 1; i < 6; i++) edge.push(pt(PI / 2 + gap - (gap * 2 * i) / 6, capT));
  for (let i = 0; i <= 6; i++) edge.push(pt(PI / 2 - gap, capT + (sideT * i) / 6));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 60, 0.035, 6, false), m(p.b)));
  g.add(mesh(cone(0.15, 0.46, 8), m(p.a), [0, 0.36, -0.36], [-1.15, 0, 0]));
  if (p.gem) g.add(mesh(octa(0.08), m(p.gem, { glow: 0.6 }), [0, R * Math.cos(capT - 0.06) + 0.02, R * Math.sin(capT - 0.06) + 0.03], [0, 0, 0], [1, 1.3, 0.7]));
  if (p.collar) {
    g.add(mesh(cyl(0.5, 0.66, 0.5, 18, true, PI * 0.35, PI * 1.3), m(p.collar, { double: true }), [0, bottomY - 0.05, -0.02]));
    for (const k of [-1, 1]) g.add(mesh(cone(0.05, 0.22, 5), m(p.b), [0.42 * k, bottomY + 0.24, -0.2], [-0.3, 0, -0.5 * k]));
  }
  if (p.card) {
    g.add(mesh(box(0.2, 0.28, 0.02), m(0xf4ecd8), [0.5, 0.18, 0.08], [0, 1.2, -0.25]));
    g.add(mesh(sph(0.04, 6, 4), m(0xd8344f), [0.51, 0.18, 0.1]));
  }
  return g;
}
function crown(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.5, 0.52, 0.24, 18, true), m(p.a, { double: true })));
  for (const y of [-0.12, 0.12]) g.add(mesh(torus(0.51, 0.035, 6, 24), m(p.a), [0, y, 0], [PI / 2, 0, 0]));
  for (let i = 0; i < 9; i++) {
    const a = (i * PI * 2) / 9;
    const h = i % 2 ? 0.34 : 0.5;
    g.add(mesh(cone(0.07, h, 5), m(p.b, { glow: 0.35 }), [Math.sin(a) * 0.48, 0.12 + h / 2, Math.cos(a) * 0.48], [0.18 * Math.cos(a), 0, -0.18 * Math.sin(a)]));
  }
  g.add(mesh(octa(0.09), m(p.c, { glow: 0.6 }), [0, 0, 0.53], [0, 0, 0], [1, 1.3, 0.6]));
  return g;
}
function mask(m, p) {
  const g = new THREE.Group();
  g.add(mesh(sph(0.5, 14, 10), m(p.a), [0, 0, 0], [0, 0, 0], [1, 1.08, 1]));
  g.add(mesh(cone(0.17, 0.78, 8), m(p.b), [0, -0.14, 0.72], [PI / 2 + 0.25, 0, 0]));
  for (const x of [-0.19, 0.19]) {
    g.add(mesh(torus(0.11, 0.035, 6, 14), m(p.trim), [x, 0.1, 0.46]));
    g.add(mesh(cyl(0.1, 0.1, 0.03, 14), m(p.c, { glow: 0.8 }), [x, 0.1, 0.45], [PI / 2, 0, 0]));
  }
  g.add(mesh(cyl(0.68, 0.68, 0.04, 20), m(p.hat), [0, 0.36, 0]));
  g.add(mesh(cyl(0.38, 0.42, 0.36, 16), m(p.hat), [0, 0.55, 0]));
  g.add(mesh(torus(0.41, 0.03, 6, 18), m(p.trim), [0, 0.42, 0], [PI / 2, 0, 0]));
  return g;
}
function wrap(m, p) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.52, 14, 8, 0, PI * 2, 0, PI / 2), m(p.a)));
  const rings = [[0.52, 0.0, 0.0], [0.5, 0.12, 0.2], [0.46, 0.24, -0.15], [0.38, 0.35, 0.18]];
  rings.forEach(([r, y, tilt], i) => g.add(mesh(torus(r, 0.1, 8, 20), m(i % 2 ? p.b : p.a), [0, y, 0], [PI / 2 + tilt * 0.4, tilt * 0.3, 0])));
  g.add(mesh(octa(0.1), m(p.c, { glow: 0.6 }), [0, 0.18, 0.56], [0, 0, 0], [1, 1.3, 0.7]));
  g.add(mesh(box(0.22, 0.5, 0.05), m(p.b), [0.12, -0.2, -0.5], [0.2, 0, 0.1]));
  g.add(mesh(cyl(0.52, 0.5, 0.2, 16, true, PI * 0.7, PI * 0.6), m(p.a, { double: true }), [0, -0.12, 0]));
  return g;
}
function goggles(m, p) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.54, 14, 8, 0, PI * 2, 0, PI / 2), m(p.a)));
  g.add(mesh(torus(0.55, 0.06, 6, 24), m(p.b), [0, 0.1, 0], [PI / 2, 0, 0]));
  const [s, l] = rb(m);
  for (const x of [-0.2, 0.2]) {
    g.add(mesh(torus(0.15, 0.045, 6, 16), m(p.b), [x, 0.12, 0.5]));
    g.add(mesh(rainbow(cyl(0.14, 0.14, 0.05, 12), s, l, x > 0 ? 0.5 : 0), m(0xffffff, { vc: true }), [x, 0.12, 0.5], [PI / 2, 0, 0]));
  }
  g.add(mesh(box(0.1, 0.06, 0.1), m(p.b), [0, 0.12, 0.5]));
  return g;
}

/* Body */
function armor(m, p) {
  const g = new THREE.Group();
  const k = p.kind;
  if (k === 'robe') {
    g.add(mesh(lathe([[0, 0.48], [0.3, 0.46], [0.4, 0.3], [0.38, -0.05], [0.5, -0.6], [0.58, -0.74], [0, -0.74]]), m(p.a)));
    g.add(mesh(torus(0.39, 0.05, 6, 18), m(p.b), [0, -0.02, 0], [PI / 2, 0, 0]));
    g.add(mesh(torus(0.3, 0.06, 6, 18), m(p.b), [0, 0.45, 0], [PI / 2, 0, 0]));
    g.add(mesh(box(0.1, 0.9, 0.05), m(p.b), [0, -0.25, 0.43], [0.12, 0, 0]));
  } else {
    g.add(mesh(cyl(0.42, 0.35, 0.9, 12), m(p.a)));
    g.add(mesh(torus(0.3, 0.05, 6, 18), m(p.b), [0, 0.45, 0], [PI / 2, 0, 0]));
    if (k === 'plate') {
      for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, PI * 2, 0, PI / 2), m(p.b), [0.44 * s, 0.38, 0], [0, 0, -0.35 * s], [1.15, 0.9, 1.1]));
      g.add(mesh(box(0.06, 0.74, 0.06), m(p.b), [0, 0.02, 0.41]));
      g.add(mesh(torus(0.37, 0.05, 6, 18), m(p.c ?? p.b), [0, -0.34, 0], [PI / 2, 0, 0]));
    } else if (k === 'mail') {
      for (let i = 0; i < 5; i++) g.add(mesh(torus(0.36 + i * 0.012, 0.028, 5, 20), m(p.rainbowBands ? hslHex(i / 5, 0.85, 0.62) : p.b), [0, 0.3 - i * 0.16, 0], [PI / 2, 0, 0]));
      for (const s of [-1, 1]) g.add(mesh(sph(0.16, 8, 6), m(p.b), [0.42 * s, 0.36, 0], [0, 0, 0], [1.2, 0.8, 1]));
    } else if (k === 'vest') {
      g.add(mesh(box(0.14, 0.88, 0.06), m(p.b), [0, 0, 0.39]));
      for (const y of [0.25, 0.05, -0.15]) g.add(mesh(sph(0.035, 6, 4), m(p.c), [0.1, y, 0.43]));
      g.add(mesh(torus(0.37, 0.04, 6, 18), m(p.b), [0, -0.34, 0], [PI / 2, 0, 0]));
    } else if (k === 'carapace') {
      for (let i = 0; i < 4; i++) g.add(mesh(cyl(0.44 - i * 0.02, 0.4 - i * 0.02, 0.12, 12), m(i % 2 ? p.b : p.a), [0, 0.3 - i * 0.2, 0.01]));
      for (const s of [-1, 1]) for (const y of [0.3, 0.12]) g.add(mesh(cone(0.06, 0.24, 5), m(p.c), [0.42 * s, y + 0.1, 0], [0, 0, -1.0 * s]));
    }
    for (const s of [-1, 1]) g.add(mesh(cyl(0.13, 0.12, 0.26), m(p.a), [0.46 * s, 0.22, 0], [0, 0, 0.55 * s]));
  }
  if (p.emblem) g.add(mesh(octa(0.1), m(p.emblem, { glow: 0.7 }), [0, 0.15, 0.44], [0, 0, 0], [1, 1.3, 0.6]));
  if (p.flame) flames(g, m, 0, 0.08, 0.44, 0.5);
  if (p.snow) snowflake(g, m, p.snow, 0, 0.15, 0.44, 0.13);
  if (p.clover) clover(g, m, p.clover, -0.16, 0.18, 0.42, 0.06);
  return g;
}

/* Gloves */
function glove(m, p) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.2, 0.25, 0.32, 10), m(p.b), [0, -0.36, 0]));
  g.add(mesh(torus(0.22, 0.035, 6, 16), m(p.trim ?? p.b), [0, -0.21, 0], [PI / 2, 0, 0]));
  g.add(mesh(box(0.38, 0.42, 0.18), m(p.a), [0, 0, 0]));
  const fingerMats = p.rainbow ? [0, 1, 2, 3].map(i => m(hslHex(i / 4, 0.85, 0.62))) : null;
  [-0.135, -0.045, 0.045, 0.135].forEach((x, i) => {
    g.add(mesh(cyl(0.045, 0.04, 0.28, 6), fingerMats ? fingerMats[i] : m(p.a), [x, 0.34, 0]));
    if (p.claws) g.add(mesh(cone(0.035, 0.12, 5), m(p.claws, { glow: 0.3 }), [x, 0.52, 0]));
  });
  g.add(mesh(cyl(0.05, 0.045, 0.24, 6), m(p.a), [0.24, 0.04, 0], [0, 0, -0.9]));
  if (p.knuckle) for (const x of [-0.135, -0.045, 0.045, 0.135]) g.add(mesh(p.spike ? cone(0.04, 0.12, 5) : sph(0.045, 6, 4), m(p.knuckle, { glow: p.knuckleGlow ?? 0.5 }), [x, 0.18, 0.12], p.spike ? [PI / 2, 0, 0] : [0, 0, 0]));
  if (p.gem) g.add(mesh(octa(0.08), m(p.gem, { glow: 0.6 }), [0, -0.02, 0.11], [0, 0, 0], [1, 1.2, 0.6]));
  if (p.drip) drips(g, m, p.drip, [[-0.1, -0.24, 0.1], [0.12, -0.3, 0.1]]);
  if (p.wraps) for (const y of [-0.12, 0.06]) g.add(mesh(box(0.42, 0.05, 0.2), m(p.wraps), [0, y, 0], [0, 0, 0.15]));
  if (p.frost) for (const x of [-0.12, 0.12]) g.add(mesh(cone(0.04, 0.18, 5), m(p.frost, { glow: 0.3 }), [x, -0.06, 0.1], [0.5, 0, x > 0 ? -0.4 : 0.4]));
  if (p.sun) g.add(mesh(cyl(0.09, 0.09, 0.03, 12), m(p.sun, { glow: 0.6 }), [0, 0, 0.1], [PI / 2, 0, 0]));
  if (p.clover) clover(g, m, p.clover, 0, 0.0, 0.1, 0.05);
  return g;
}

/* Boots */
function boot(m, p) {
  const g = new THREE.Group();
  if (p.sandal) {
    const linen = m(p.wrap ?? 0xe8dcc0);
    g.add(mesh(cyl(0.17, 0.16, 0.44, 10), linen, [0, 0.17, -0.02]));
    g.add(mesh(box(0.27, 0.17, 0.46), linen, [0, -0.08, 0.13]));
    g.add(mesh(sph(0.135, 8, 6), linen, [0, -0.08, 0.35], [0, 0, 0], [1.02, 0.65, 1]));
    g.add(mesh(box(0.34, 0.06, 0.66), m(p.b), [0, -0.19, 0.14]));
    for (const [z, r] of [[0.3, 0.5], [0.3, -0.5], [0.08, 0.5], [0.08, -0.5]]) g.add(mesh(box(0.33, 0.04, 0.06), m(p.a), [0, 0.01, z], [0, r, 0]));
    for (const y of [0.0, 0.15, 0.3]) g.add(mesh(torus(0.175, 0.025, 5, 14), m(p.a), [0, y, -0.02], [PI / 2, 0, 0]));
    g.add(mesh(torus(0.18, 0.03, 5, 14), m(p.c ?? 0xe8b73a), [0, 0.39, -0.02], [PI / 2, 0, 0]));
  } else {
    g.add(mesh(cyl(0.2, 0.18, 0.62, 10), m(p.a), [0, 0.24, -0.02]));
    g.add(mesh(box(0.3, 0.22, 0.5), m(p.a), [0, -0.06, 0.12]));
    g.add(mesh(sph(0.15, 8, 6), m(p.a), [0, -0.06, 0.36], [0, 0, 0], [1, 0.75, 1]));
    g.add(mesh(box(0.32, 0.06, 0.62), m(p.b), [0, -0.18, 0.13]));
    g.add(mesh(torus(0.21, 0.05, 6, 16), m(p.b), [0, 0.53, -0.02], [PI / 2, 0, 0]));
  }
  const e = p.extra;
  if (e === 'flames') { flames(g, m, 0, 0.52, -0.02, 0.6); flames(g, m, 0.12, -0.12, -0.18, 0.4); }
  if (e === 'fur') for (let i = 0; i < 7; i++) { const a = (i * PI * 2) / 7; g.add(mesh(ico(0.08, 0), m(0xffffff), [Math.cos(a) * 0.21, 0.52, Math.sin(a) * 0.21])); }
  if (e === 'wings') for (const s of [-1, 1]) g.add(mesh(extrude(shapeFrom(WING, s), 0.03, 0.01), m(0xffffff), [0.16 * s, 0.18, -0.08], [0, -0.4 * s, 0], [0.7, 0.7, 1]));
  if (e === 'drips') drips(g, m, p.c, [[0.14, 0.3, 0.12], [-0.12, 0.1, 0.16], [0.05, -0.02, 0.37]]);
  if (e === 'swirl') for (let i = 0; i < 3; i++) g.add(mesh(torus(0.26 + i * 0.05, 0.02, 5, 16, PI * 1.3), m(p.c), [0, 0.0 + i * 0.18, 0], [PI / 2 + 0.3, 0, i]));
  if (e === 'spikes') for (const y of [0.1, 0.3]) for (const s of [-1, 1]) g.add(mesh(cone(0.04, 0.15, 5), m(p.c), [0.2 * s, y, 0], [0, 0, -PI / 2 * s]));
  if (e === 'clover') clover(g, m, p.c, 0, 0.3, 0.19, 0.06);
  if (e === 'rainbow') for (let i = 0; i < 5; i++) g.add(mesh(torus(0.2, 0.03, 5, 16), m(hslHex(i / 5, 0.85, 0.62)), [0, 0.08 + i * 0.1, -0.02], [PI / 2, 0, 0]));
  if (p.gem) g.add(mesh(octa(0.06), m(p.gem, { glow: 0.6 }), [0, 0.53, 0.2]));
  return g;
}

/* Capes */
// A draped sheet: narrow at the shoulders, flaring and rippling towards the hem, bulging toward +Z.
function capeGeo(top, bottom, depth, ripple, rows = null) {
  const segU = 16, segV = 12;
  const pos = [], col = [], idx = [];
  const edge = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    const w = top + (bottom - top) * Math.pow(v, 0.8);
    for (let i = 0; i <= segU; i++) {
      const u = (i / segU) * 2 - 1;
      const z = depth * (1 - u * u) * (0.5 + 0.5 * v) + ripple * Math.sin(u * 7 + v * 2.5) * v;
      pos.push(u * w, 0.7 - 1.45 * v, z);
      if (rows) { const c = rows(v); col.push(c.r, c.g, c.b); }
      if (j === segV) edge.push(new THREE.Vector3(u * w, 0.7 - 1.45 * v, z + 0.01));
    }
  }
  for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
    const a = j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (rows) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, edge };
}
function cape(m, p) {
  const g = new THREE.Group();
  const rows = p.stripes ? (v => new THREE.Color().setHSL(Math.floor(v * 5.99) / 6, rb(m)[0], rb(m)[1], THREE.SRGBColorSpace)) : null;
  const { geo, edge } = capeGeo(0.3, 0.7, 0.22, 0.05, rows);
  g.add(new THREE.Mesh(geo, rows ? m(0xffffff, { vc: true }) : m(p.a)));
  const lining = new THREE.Mesh(geo, m(p.b, { back: true }));
  lining.position.z = -0.012;
  g.add(lining);
  g.add(mesh(torus(0.3, 0.065, 6, 18, PI), m(p.trim ?? p.b), [0, 0.7, 0], [PI / 2, 0, 0]));
  for (const k of [-1, 1]) g.add(mesh(sph(0.065, 8, 6), m(p.clasp ?? 0xe8b73a, { glow: 0.3 }), [0.27 * k, 0.68, 0.08]));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 40, 0.035, 5, false), m(p.hem ?? p.trim ?? p.b, { glow: p.hemGlow ?? 0 })));
  const ey = -0.05, ez = 0.2;
  if (p.emblem === 'flame') flames(g, m, 0, ey - 0.15, ez, 0.8);
  if (p.emblem === 'snow') snowflake(g, m, 0xccf5ff, 0, ey, ez, 0.2);
  if (p.emblem === 'rose') rose(g, m, 0xe86f9e, 0, ey, ez, 0.16);
  if (p.emblem === 'crescent') crescent(g, m, 0xe8ecff, 0, ey, ez, 0.2, 0.6);
  if (p.emblem === 'fang') for (const x of [-0.08, 0.08]) g.add(mesh(cone(0.06, 0.26, 5), m(0xf2ecd8), [x, ey, ez], [PI, 0, 0]));
  if (p.emblem === 'swirl') g.add(mesh(torus(0.16, 0.03, 5, 18, PI * 1.6), m(p.trim), [0, ey, ez]));
  if (p.emblem === 'sun') {
    g.add(mesh(cyl(0.13, 0.13, 0.03, 14), m(0xf2d67c, { glow: 0.6 }), [0, ey, ez], [PI / 2, 0, 0]));
    for (let i = 0; i < 8; i++) { const a = (i * PI) / 4; g.add(mesh(box(0.035, 0.1, 0.02), m(0xf2d67c, { glow: 0.5 }), [Math.cos(a) * 0.2, ey + Math.sin(a) * 0.2, ez], [0, 0, a - PI / 2])); }
  }
  if (p.emblem === 'moon') g.add(mesh(cyl(0.17, 0.17, 0.03, 18), m(0xd8344f, { glow: 0.5 }), [0, ey, ez], [PI / 2, 0, 0]));
  if (p.emblem === 'card') {
    g.add(mesh(box(0.24, 0.34, 0.02), m(0xf4ecd8), [0, ey, ez], [0, 0, 0.15]));
    clover(g, m, 0x2f8a63, 0, ey + 0.02, ez + 0.02, 0.04);
  }
  return g;
}

/* Rings */
function ring(m, p) {
  const g = new THREE.Group();
  const style = p.style ?? 'band';
  const b2 = p.band2 ?? p.band;
  if (style === 'twist') {
    // Two strands twisted around the band like rope.
    for (const [phase, mat] of [[0, m(p.band)], [PI, m(b2)]]) {
      const pts = [];
      for (let i = 0; i < 72; i++) {
        const u = (i / 72) * PI * 2;
        const r = 0.5 + 0.045 * Math.cos(u * 7 + phase);
        pts.push(new THREE.Vector3(Math.cos(u) * r, Math.sin(u) * r, 0.045 * Math.sin(u * 7 + phase)));
      }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 144, 0.055, 6, true), mat));
    }
  } else if (style === 'flat') {
    g.add(mesh(lathe([[0.44, -0.1], [0.56, -0.1], [0.58, 0], [0.56, 0.1], [0.44, 0.1], [0.44, -0.1]], 32), m(p.band), [0, 0, 0], [PI / 2, 0, 0]));
    g.add(mesh(torus(0.575, 0.025, 5, 32), m(b2, { glow: 0.15 })));
  } else if (style === 'double') {
    g.add(mesh(torus(0.5, 0.07, 6, 28), m(p.band), [0, 0, -0.06]));
    g.add(mesh(torus(0.5, 0.07, 6, 28), m(b2), [0, 0, 0.06]));
  } else {
    g.add(mesh(torus(0.5, 0.1, 8, 28), m(p.band)));
    if (p.band2) g.add(mesh(torus(0.5, 0.06, 6, 28), m(p.band2), [0, 0, 0.05]));
  }
  g.add(mesh(cyl(0.16, 0.12, 0.13, 8), m(p.setting ?? p.band), [0, 0.6, 0]));
  const gy = 0.76;
  const gemMat = m(p.gem, { glow: p.glow ?? 0.55 });
  const shape = p.shape ?? 'octa';
  if (shape === 'octa') g.add(mesh(octa(0.15), gemMat, [0, gy, 0], [0, 0, 0], [1, 1.2, 1]));
  else if (shape === 'sphere') g.add(mesh(sph(0.15, 12, 10), gemMat, [0, gy, 0]));
  else if (shape === 'cube') g.add(mesh(box(0.22, 0.22, 0.22), gemMat, [0, gy + 0.02, 0], [0.5, 0.6, 0.2]));
  else if (shape === 'heart') g.add(mesh(extrude(HEART, 0.1, 0.02), gemMat, [0, gy + 0.04, 0], [0, 0, 0], [0.7, 0.7, 1]));
  else if (shape === 'opal') {
    const [s, l] = rb(m);
    g.add(mesh(rainbow(ico(0.16, 1), s, l), m(0xffffff, { vc: true }), [0, gy, 0], [0, 0, 0], [1, 1.1, 1]));
  }
  for (const [x, z] of [[0.13, 0], [-0.13, 0], [0, 0.13], [0, -0.13]]) g.add(mesh(cone(0.03, 0.13, 5), m(p.setting ?? p.band), [x, 0.71, z]));
  const d = p.deco;
  const dy = 0.98;
  if (d === 'flame') flames(g, m, 0, 0.86, 0, 0.55);
  if (d === 'snow') snowflake(g, m, 0xccf5ff, 0, dy, 0, 0.14);
  if (d === 'drop') { g.add(mesh(sph(0.07, 8, 6), m(p.decoColor ?? 0x8bd34a, { glow: 0.5 }), [0, dy, 0])); g.add(mesh(cone(0.07, 0.14, 6), m(p.decoColor ?? 0x8bd34a, { glow: 0.5 }), [0, dy + 0.1, 0])); }
  if (d === 'wings') for (const s of [-1, 1]) g.add(mesh(extrude(shapeFrom(WING, s), 0.035, 0.01), m(0xfff3dc), [0.43 * s, 0.38, 0], [0, 0, -0.5 * s], [0.55, 0.55, 1]));
  if (d === 'fangs') for (const s of [-1, 1]) g.add(mesh(cone(0.04, 0.18, 5), m(0xf2ecd8), [0.2 * s, 0.56, 0.05], [PI, 0, 0.3 * s]));
  if (d === 'spikes') for (let i = 0; i < 6; i++) { const a = (i * PI) / 3; g.add(mesh(cone(0.04, 0.16, 5), m(p.decoColor ?? 0xccf5ff, { glow: 0.3 }), [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0], [0, 0, a - PI / 2])); }
  if (d === 'sand') for (const [x, y] of [[0.3, 0.45], [-0.32, 0.42], [0.42, 0.2]]) g.add(mesh(sph(0.05, 6, 4), m(0xdbb470), [x, y, 0.1]));
  if (d === 'clover') clover(g, m, 0x4fc79c, 0, dy, 0, 0.06);
  if (d === 'swirl') g.add(mesh(torus(0.62, 0.025, 5, 24, PI * 1.2), m(p.decoColor ?? 0x7fcaf0, { glow: 0.3 }), [0, 0, 0.04], [0, 0, 0.3]));
  if (d === 'eye') { g.add(mesh(sph(0.08, 8, 6), m(0xffffff), [0, gy, 0.12], [0, 0, 0], [1, 1, 0.5])); g.add(mesh(cyl(0.04, 0.04, 0.02, 10), m(0x1b120c), [0, gy, 0.16], [PI / 2, 0, 0])); }
  if (d === 'vessel') { g.add(mesh(lathe([[0, 0], [0.06, 0.01], [0.03, 0.08], [0.03, 0.14], [0.1, 0.2], [0.11, 0.3], [0, 0.28]], 10), m(p.band), [0, 0.86, 0])); g.add(mesh(sph(0.07, 8, 6), m(0xf2d67c, { glow: 0.8 }), [0, 1.14, 0])); }
  return g;
}

/* Amulets */
function amulet(m, p) {
  const g = new THREE.Group();
  g.add(mesh(torus(0.48, 0.025, 5, 26, PI), m(p.chain ?? 0xc9a24a), [0, 0.62, 0], [0, 0, PI]));
  g.add(mesh(torus(0.06, 0.02, 5, 12), m(p.chain ?? 0xc9a24a), [0, 0.12, 0], [0, PI / 2, 0]));
  const s = p.shape;
  const c = p.color;
  if (s === 'flame') {
    g.add(mesh(torus(0.22, 0.04, 6, 20), m(0xe8b73a), [0, -0.14, 0]));
    flames(g, m, 0, -0.32, 0.02, 0.85);
    flames(g, m, -0.08, -0.3, -0.02, 0.5);
  } else if (s === 'core') {
    g.add(mesh(ico(0.19, 0), m(0xff7a2a, { glow: 1 }), [0, -0.12, 0]));
    for (let i = 0; i < 6; i++) { const a = (i * PI) / 3; g.add(mesh(tetra(0.1), m(0x2a1a14), [Math.cos(a) * 0.2, -0.12 + Math.sin(a) * 0.2, 0.02], [i, i * 2, 0])); }
  } else if (s === 'snowflake') {
    snowflake(g, m, 0xbdf0ff, 0, -0.14, 0, 0.26);
    for (let i = 0; i < 6; i++) { const a = (i * PI) / 3; g.add(mesh(octa(0.05), m(0xe8fbff, { glow: 0.6 }), [Math.cos(a) * 0.26, -0.14 + Math.sin(a) * 0.26, 0])); }
  } else if (s === 'serpent') {
    g.add(mesh(new THREE.TorusKnotGeometry(0.15, 0.045, 48, 6, 2, 3), m(0x5aa83a), [0, -0.14, 0]));
    g.add(mesh(sph(0.07, 8, 6), m(0x3f7a2a), [0.14, 0.02, 0.1], [0, 0, 0], [1.3, 1, 1]));
    for (const x of [0.17, 0.11]) g.add(mesh(sph(0.018, 5, 4), m(0xffe066, { glow: 1 }), [x, 0.05, 0.16]));
  } else if (s === 'eye') {
    const almond = new THREE.Shape();
    almond.moveTo(-0.28, 0); almond.quadraticCurveTo(0, 0.24, 0.28, 0); almond.quadraticCurveTo(0, -0.24, -0.28, 0);
    g.add(mesh(extrude(almond, 0.06, 0.015), m(0xe8b73a), [0, -0.14, 0]));
    g.add(mesh(sph(0.11, 12, 10), m(0xf6f0e0), [0, -0.14, 0.04], [0, 0, 0], [1.2, 1, 0.5]));
    g.add(mesh(cyl(0.07, 0.07, 0.02, 14), m(0x4fb2e8, { glow: 0.7 }), [0, -0.14, 0.09], [PI / 2, 0, 0]));
    g.add(mesh(cyl(0.03, 0.03, 0.02, 10), m(0x14100c), [0, -0.14, 0.1], [PI / 2, 0, 0]));
  } else if (s === 'reliquary') {
    g.add(mesh(box(0.3, 0.32, 0.16), m(0xe8b73a), [0, -0.18, 0]));
    g.add(mesh(cone(0.24, 0.16, 4), m(0xc48a24), [0, 0.04, 0], [0, PI / 4, 0]));
    g.add(mesh(box(0.16, 0.2, 0.02), m(0xfff3c4, { glow: 0.9 }), [0, -0.18, 0.08]));
  } else if (s === 'shield') {
    const sh = shapeFrom([[-0.22, 0.18], [0.22, 0.18], [0.22, -0.02], [0, -0.3], [-0.22, -0.02]]);
    g.add(mesh(extrude(sh, 0.06, 0.02), m(0x9aa6b8), [0, -0.1, 0]));
    g.add(mesh(box(0.05, 0.4, 0.07), m(0xe8b73a), [0, -0.14, 0.01]));
    g.add(mesh(box(0.4, 0.05, 0.07), m(0xe8b73a), [0, 0.0, 0.01]));
  } else if (s === 'chalice') {
    g.add(mesh(lathe([[0, -0.4], [0.14, -0.38], [0.04, -0.3], [0.04, -0.18], [0.16, -0.1], [0.2, 0.05], [0.18, 0.06], [0, -0.04]], 14), m(0xc48a24)));
    g.add(mesh(cyl(0.17, 0.17, 0.02, 14), m(0xd8344f, { glow: 0.6 }), [0, 0.03, 0]));
    g.add(mesh(octa(0.05), m(0xd8344f, { glow: 0.6 }), [0, -0.1, 0.14]));
  } else if (s === 'star') {
    g.add(mesh(extrude(star(5, 0.27, 0.12), 0.06, 0.015), m(0xf2c14e, { glow: 0.5 }), [0, -0.16, 0]));
    g.add(mesh(box(0.11, 0.11, 0.11), m(0xf4ecd8), [0, -0.16, 0.07], [0.5, 0.6, 0.2]));
  } else if (s === 'prismHeart') {
    const [sat, lit] = rb(m);
    g.add(mesh(rainbow(extrude(HEART, 0.12, 0.03), sat, lit), m(0xffffff, { vc: true }), [0, -0.12, 0]));
  } else if (s === 'moon') {
    g.add(mesh(cyl(0.24, 0.24, 0.05, 24), m(0x2c3050), [0, -0.14, -0.02], [PI / 2, 0, 0]));
    g.add(mesh(torus(0.24, 0.03, 6, 26), m(0xc6d0e2), [0, -0.14, 0]));
    crescent(g, m, 0xe8ecff, 0.02, -0.14, 0.03, 0.17, 0.8);
    for (const [x, y] of [[0.12, -0.04], [0.14, -0.22], [0.06, -0.3]]) g.add(mesh(octa(0.025), m(0x9aa8ff, { glow: 1 }), [x, y, 0.04]));
  } else if (s === 'rose') {
    rose(g, m, 0xd83a6a, 0, -0.14, 0.02, 0.2);
    const vine = new THREE.CatmullRomCurve3([[-0.26, -0.3, -0.02], [-0.2, -0.02, 0.0], [0, 0.12, 0], [0.22, -0.04, 0.0], [0.26, -0.32, -0.02]].map(v => new THREE.Vector3(...v)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(vine, 24, 0.022, 5), m(0x4f6a2a)));
    for (const t of [0.12, 0.3, 0.7, 0.88]) {
      const at = vine.getPointAt(t);
      g.add(mesh(cone(0.02, 0.08, 4), m(0xe9d9b0), [at.x * 1.12, at.y, at.z], [0, 0, at.x > 0 ? -1.2 : 1.2]));
    }
    for (const k of [-1, 1]) g.add(mesh(sph(0.07, 6, 4), m(0x6f8a3a), [0.2 * k, -0.24, 0.04], [0, 0, 0.7 * k], [1.4, 0.55, 0.3]));
  } else if (s === 'phoenix') {
    g.add(mesh(extrude(HEART, 0.1, 0.02), m(0xd8344f, { glow: 0.4 }), [0, -0.12, 0]));
    for (const k of [-1, 1]) g.add(mesh(extrude(shapeFrom(WING, k), 0.03, 0.01), m(0xffb04a, { glow: 0.3 }), [0.16 * k, -0.12, -0.02], [0, 0, -0.2 * k], [0.55, 0.55, 1]));
    flames(g, m, 0, -0.06, 0.06, 0.4);
  }
  if (c) g.add(mesh(octa(0.04), m(c, { glow: 0.6 }), [0, 0.18, 0]));
  return g;
}

/* Consumables (upgrades.js) */
function scrollRoll(m, p) {
  const g = new THREE.Group();
  // A half-unrolled sheet between two rods, tied with a ribbon and sealed.
  const sheetGeo = box(0.62, 0.78, 0.02);
  if (p.rainbow) {
    const [s, l] = rb(m);
    g.add(mesh(rainbow(sheetGeo, s * 0.7, Math.min(0.8, l + 0.12)), m(0xffffff, { vc: true }), [0, 0, 0]));
  } else {
    g.add(mesh(sheetGeo, m(p.paper, { glow: p.glow ? p.glow * 0.4 : 0 }), [0, 0, 0]));
  }
  for (const y of [0.42, -0.42]) {
    g.add(mesh(cyl(0.075, 0.075, 0.74, 10), m(p.paper), [0, y, 0.02], [0, 0, PI / 2]));
    for (const x of [-0.4, 0.4]) g.add(mesh(sph(0.05, 6, 5), m(p.ribbon), [x, y, 0.02]));
  }
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.4 - (i % 2) * 0.12, 0.03, 0.01), m(p.ink), [-0.02 - (i % 2) * 0.06, 0.24 - i * 0.12, 0.016]));
  g.add(mesh(box(0.08, 0.84, 0.015), m(p.ribbon), [0.16, 0, 0.022]));
  g.add(mesh(cyl(0.1, 0.1, 0.04, 12), m(p.seal, { glow: p.glow ?? 0.25 }), [0.16, -0.2, 0.04], [PI / 2, 0, 0]));
  if (p.rainbow) for (let i = 0; i < 5; i++) g.add(mesh(octa(0.035), m(hslHex(i / 5, 0.8, 0.6), { glow: 0.8 }), [-0.24 + i * 0.12, -0.26, 0.03]));
  return g;
}
function goldHammer(m) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.035, 0.04, 0.8, 7), m(0x8a5a32), [0, -0.12, 0]));
  g.add(mesh(box(0.5, 0.2, 0.2), m(0xf2c14e, { glow: 0.35 }), [0, 0.32, 0]));
  g.add(mesh(cyl(0.11, 0.11, 0.08, 8), m(0xfff0b0, { glow: 0.5 }), [0.27, 0.32, 0], [0, 0, PI / 2]));
  g.add(mesh(cone(0.09, 0.16, 4), m(0xfff0b0, { glow: 0.5 }), [-0.32, 0.32, 0], [0, 0, PI / 2]));
  g.add(mesh(torus(0.05, 0.02, 5, 10), m(0xf2c14e), [0, -0.52, 0], [PI / 2, 0, 0]));
  g.add(mesh(extrude(star(4, 0.1, 0.04), 0.02, 0), m(0xffffff, { glow: 1 }), [0.12, 0.5, 0.12]));
  return g;
}
function cubeItem(m, p) {
  const g = new THREE.Group();
  const c = new THREE.Group();
  c.add(mesh(box(0.56, 0.56, 0.56), m(p.a, { glow: p.mirror ? 0.15 : 0 })));
  for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (const r of [[0, 0, 0], [PI / 2, 0, 0], [0, 0, PI / 2]]) {
      const e = mesh(box(0.06, 0.6, 0.06), m(p.edge));
      e.rotation.set(...r);
      e.position.set(...(r[0] ? [x * 0.28, y * 0.28, 0] : r[2] ? [0, x * 0.28, y * 0.28] : [x * 0.28, 0, y * 0.28]));
      c.add(e);
    }
  }
  c.add(mesh(octa(0.2), m(p.core, { glow: 1 }), [0, 0, 0.3]));
  if (p.mirror) c.add(mesh(box(0.4, 0.4, 0.01), m(0xffffff, { glow: 0.7 }), [0, 0, 0.29]));
  c.rotation.set(0.5, 0.7, 0);
  g.add(c);
  g.userData.anim = t => { c.rotation.y = 0.7 + Math.sin(t * 1.4) * 0.25; };
  return g;
}
function lockstone(m) {
  const g = new THREE.Group();
  g.add(mesh(ico(0.34, 0), m(0x6f7f95), [0, -0.08, 0], [0.3, 0.4, 0], [1.1, 0.85, 0.8]));
  g.add(mesh(box(0.3, 0.24, 0.1), m(0xf2c14e), [0, -0.06, 0.26]));
  g.add(mesh(torus(0.1, 0.03, 5, 12, PI), m(0xf2c14e), [0, 0.06, 0.26]));
  g.add(mesh(cyl(0.03, 0.03, 0.02, 8), m(0x1a1020), [0, -0.06, 0.32], [PI / 2, 0, 0]));
  g.add(mesh(octa(0.06), m(0x9fe2ff, { glow: 0.9 }), [0.22, 0.2, 0.05]));
  return g;
}

// A cut gem. cut: round (brilliant), oval, drop (pear), hex (step cut) or star; cursed gems are dark with a violet glow.
function gemStone(m, p) {
  const g = new THREE.Group();
  const col = p.cursed ? 0x2a1838 : p.color;
  const glow = p.cursed ? 0 : 0.08;
  const sides = { round: 8, oval: 8, drop: 6, hex: 6, star: 5 }[p.cut] ?? 8;
  // Lighter crown and table, darker pavilion: the contrast is what reads as a cut stone at icon size.
  const tint = k => new THREE.Color(col).lerp(new THREE.Color(k > 0 ? 0xffffff : 0x000000), Math.abs(k)).getHex();
  const crown = mesh(cyl(0.26, 0.42, 0.16, sides), m(tint(0.04), { glow }), [0, 0.08, 0]);
  const table = mesh(cyl(0.25, 0.25, 0.02, sides), m(tint(0.3), { glow: glow + 0.15 }), [0, 0.17, 0]);
  const girdle = mesh(cyl(0.43, 0.43, 0.04, sides), m(tint(0.12), { glow }), [0, -0.02, 0]);
  const pav = mesh(cone(0.43, 0.46, sides), m(tint(-0.35), { glow: glow * 0.6 }), [0, -0.27, 0], [PI, 0, 0]);
  const gem = new THREE.Group();
  gem.add(crown, table, girdle, pav);
  if (p.cut === 'oval') gem.scale.set(1.25, 1, 0.85);
  if (p.cut === 'drop') { gem.scale.set(0.9, 1.25, 0.9); gem.add(mesh(cone(0.18, 0.3, 6), m(col, { glow }), [0, 0.38, 0])); }
  if (p.cut === 'star') for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Group();
    spoke.rotation.y = (i / 5) * PI * 2;
    spoke.add(mesh(cone(0.08, 0.26, 4), m(p.cursed ? 0xa25cff : col, { glow: p.cursed ? 0.9 : 0.5 }), [0.48, 0, 0], [0, 0, -PI / 2]));
    gem.add(spoke);
  }
  gem.rotation.set(0.55, 0, 0.18);
  g.add(gem);
  g.add(mesh(octa(0.06), m(0xffffff, { glow: 1 }), [0.16, 0.2, 0.32]));
  if (p.cursed) g.add(mesh(octa(0.1), m(0xa25cff, { glow: 1 }), [0, 0, 0.36]));
  g.userData.anim = t => { gem.rotation.y = Math.sin(t * 1.2) * 0.35; };
  return g;
}

// Trinkets: small charms, one shape each.
function trinket(m, p) {
  const g = new THREE.Group();
  const A = m(p.a), Bg = m(p.b, { glow: 0.6 });
  switch (p.shape) {
    case 'hourglass': {
      for (const y of [0.42, -0.42]) g.add(mesh(cyl(0.34, 0.34, 0.08, 10), A, [0, y, 0]));
      for (const x of [-0.27, 0.27]) g.add(mesh(cyl(0.035, 0.035, 0.84, 6), A, [x, 0, 0.12]));
      g.add(mesh(cone(0.24, 0.38, 10), m(0xd8f0ff, { glow: 0.2 }), [0, 0.2, 0], [PI, 0, 0]));
      g.add(mesh(cone(0.24, 0.38, 10), m(0xd8f0ff, { glow: 0.2 }), [0, -0.2, 0]));
      g.add(mesh(cone(0.16, 0.2, 10), Bg, [0, -0.28, 0]));
      g.add(mesh(cyl(0.012, 0.012, 0.3, 4), Bg, [0, -0.02, 0]));
      break;
    }
    case 'shard': {
      const c = mesh(octa(0.3), Bg, [0, 0, 0], [0, 0, 0.25], [0.7, 1.7, 0.7]);
      g.add(c);
      g.add(mesh(octa(0.12), m(p.a, { glow: 0.5 }), [0.32, -0.3, 0.05], [0, 0, -0.4], [0.7, 1.4, 0.7]));
      g.add(mesh(torus(0.42, 0.018, 4, 28), m(p.b, { glow: 0.8 }), [0, 0, 0], [1.2, 0.3, 0]));
      break;
    }
    case 'anchor': {
      g.add(mesh(cyl(0.05, 0.05, 0.8, 8), A, [0, 0.02, 0]));
      g.add(mesh(torus(0.11, 0.035, 6, 14), A, [0, 0.5, 0]));
      g.add(mesh(box(0.42, 0.06, 0.08), A, [0, 0.28, 0]));
      g.add(mesh(torus(0.32, 0.05, 6, 16, PI), A, [0, -0.06, 0], [PI, 0, 0]));
      for (const k of [-1, 1]) g.add(mesh(cone(0.07, 0.16, 4), A, [0.33 * k, -0.06, 0], [0, 0, -0.9 * k]));
      for (let i = 0; i < 3; i++) g.add(mesh(torus(0.07, 0.022, 5, 10), m(p.b, { glow: 0.4 }), [0.2 + i * 0.1, 0.62 + i * 0.07, 0], [i % 2 ? PI / 2 : 0, 0, 0.6]));
      break;
    }
    case 'pearl': {
      const shell = mesh(new THREE.SphereGeometry(0.42, 12, 6, 0, PI * 2, 0, PI / 2), m(p.b), [0, -0.12, 0], [PI, 0, 0], [1, 0.45, 1]);
      g.add(shell);
      g.add(mesh(new THREE.SphereGeometry(0.42, 12, 6, 0, PI * 2, 0, PI / 2), m(p.b), [0, 0.02, -0.26], [-1.1, 0, 0], [1, 0.45, 1]));
      g.add(mesh(sph(0.2, 16, 12), m(p.a, { glow: 0.35 }), [0, 0.06, 0.05]));
      break;
    }
    case 'heart': {
      g.add(mesh(ico(0.36, 0), A, [0, 0, 0], [0.3, 0.5, 0], [1, 1.1, 0.9]));
      for (const [x, y, z] of [[0.12, 0.1, 0.3], [-0.15, -0.05, 0.28], [0.02, -0.2, 0.3], [0.2, -0.15, 0.2], [-0.05, 0.22, 0.26]]) g.add(mesh(octa(0.06), Bg, [x, y, z]));
      g.add(mesh(cone(0.08, 0.22, 6), m(0xffb04a, { glow: 1 }), [0, 0.44, 0]));
      break;
    }
    case 'totem': {
      g.add(mesh(box(0.32, 0.3, 0.3), A, [0, -0.26, 0]));
      g.add(mesh(box(0.36, 0.32, 0.32), m(p.a), [0, 0.06, 0]));
      g.add(mesh(box(0.3, 0.26, 0.28), A, [0, 0.36, 0]));
      for (const k of [-1, 1]) {
        g.add(mesh(box(0.06, 0.05, 0.02), Bg, [0.08 * k, 0.1, 0.17]));
        g.add(mesh(cone(0.05, 0.24, 5), m(0xe8dcc0), [0.22 * k, 0.5, 0], [0, 0, -0.6 * k]));
      }
      g.add(mesh(box(0.18, 0.04, 0.02), m(0x2a1a12), [0, -0.02, 0.17]));
      break;
    }
    case 'prism': {
      g.add(mesh(cyl(0.3, 0.3, 0.6, 3), m(p.a, { glow: 0.3 }), [0, 0, 0], [0, 0.4, 0]));
      [0xff6a6a, 0xffd36a, 0x7fe07f, 0x6ab0ff, 0xc58cff].forEach((c, i) => g.add(mesh(box(0.55, 0.035, 0.02), m(c, { glow: 0.9 }), [0.46, 0.12 - i * 0.06, 0.1], [0, 0, -0.25 + i * 0.12])));
      break;
    }
  }
  return g;
}

const RECIPES = {
  cinder: (m) => cinder(m), maul: (m) => maul(m), kindling: (m) => kindling(m), haloHelm: (m) => haloHelm(m), prismStaff: (m) => prismStaff(m),
  dagger, sword, mace, hammer, axe, cleaver, scythe, glaive,
  buckler, tome, censer, brazier, lantern, bell, pouch, coin,
  hood, crown, mask, wrap, goggles,
  armor, glove, boot, cape, ring, amulet,
  scrollRoll, goldHammer, cubeItem, lockstone, whip, gemStone, trinket,
};

export function buildItemModel(def, m = MS) {
  const r = RECIPES[def.model.t];
  if (!r) throw new Error(`No recipe ${def.model.t} for ${def.id}`);
  const g = r(m, def.model);
  if (def.model.spikes) addSpikes(g, m, def.model.spikes);
  return g;
}

/* Icon poses by slot: [rx, ry, rz], yaw */
const D45 = -PI / 4;
export function poseFor(def) {
  if (def.model.pose) return def.model.pose;
  const s = def.slot;
  if (s === 'use') return def.model.t === 'goldHammer' ? { rot: [0, 0, D45], yaw: 0.35 } : { rot: [0.1, 0, 0.12], yaw: 0.4 };
  if (s === 'weapon' || def.dual) return { rot: [0, 0, D45], yaw: 0.35 };
  if (s === 'ring') return { rot: [-0.28, 0.55, 0], yaw: 0 };
  if (s === 'amulet') return { rot: [0, 0, 0], yaw: 0.35 };
  if (s === 'boots') return { rot: [0, 0, 0], yaw: 0.9 };
  if (s === 'gloves') return { rot: [0, 0, 0.25], yaw: 0.45 };
  if (s === 'helm') return { rot: [0.1, 0, 0], yaw: 0.5 };
  return { rot: [0.08, 0, 0], yaw: 0.5 };
}

/* ---------------- Studio: icons and turntables ---------------- */
export function createStudio(ITEMS) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const EL = 0.3;
  camera.position.set(0, Math.sin(EL) * 10, Math.cos(EL) * 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  function scene(style) {
    const s = new THREE.Scene();
    if (style === 'pixel') {
      s.add(new THREE.HemisphereLight(0xffffff, 0x6c7199, 1.5));
      const d = new THREE.DirectionalLight(0xffffff, 2.4);
      d.position.set(-2, 3, 4);
      s.add(d);
    } else {
      s.add(new THREE.AmbientLight(0xfff1dc, 1.15));
      const d = new THREE.DirectionalLight(0xfff3e2, 2.3);
      d.position.set(-3, 4, 2.5);
      s.add(d);
    }
    return s;
  }
  const _v = new THREE.Vector3();
  function eachVertex(root, fn) {
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) fn(_v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
    });
  }
  const rigs = { smooth: new Map(), pixel: new Map() };
  function rig(style, id) {
    const cache = rigs[style];
    if (cache.has(id)) return cache.get(id);
    const def = ITEMS[id];
    const pose = poseFor(def);
    const sc = scene(style);
    const spinner = new THREE.Group();
    const poser = new THREE.Group();
    poser.rotation.set(...pose.rot);
    const model = buildItemModel(def, materialFactory(style));
    model.userData.anim?.(0);
    poser.add(model);
    spinner.add(poser);
    sc.add(spinner);
    const bx = new THREE.Box3();
    eachVertex(spinner, v => bx.expandByPoint(v));
    model.position.sub(bx.getCenter(new THREE.Vector3()).applyQuaternion(poser.quaternion.clone().invert()));
    let radius = 0;
    eachVertex(spinner, v => { radius = Math.max(radius, v.length()); });
    spinner.rotation.y = pose.yaw;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    eachVertex(spinner, v => {
      v.applyMatrix4(camera.matrixWorldInverse);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    });
    const r = {
      yaw: pose.yaw, scene: sc, spinner, model,
      // Weapons lie on the diagonal and are thin, so they get a tighter frame to read as large as other items.
      iconFrame: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, half: (Math.max(x1 - x0, y1 - y0) / 2) * (def.weapon || def.dual ? 1.0 : 1.12) },
      previewFrame: { cx: 0, cy: 0, half: radius * 1.08 },
    };
    cache.set(id, r);
    return r;
  }

  const PX_MAX = 96, SM_MAX = 576;
  const pxR = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
  pxR.setPixelRatio(1);
  pxR.setSize(PX_MAX, PX_MAX, false);
  pxR.setClearColor(0x000000, 0);
  pxR.setScissorTest(true);
  const smR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  smR.setPixelRatio(1);
  smR.setSize(SM_MAX, SM_MAX, false);
  smR.setClearColor(0x000000, 0);
  smR.setScissorTest(true);

  function shoot(renderer, r, yaw, frame, size, t) {
    r.spinner.rotation.y = yaw;
    r.model.userData.anim?.(t);
    camera.left = frame.cx - frame.half;
    camera.right = frame.cx + frame.half;
    camera.top = frame.cy + frame.half;
    camera.bottom = frame.cy - frame.half;
    camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, size, size);
    renderer.setScissor(0, 0, size, size);
    renderer.render(r.scene, camera);
  }
  const scratch = new Map();
  function scratchFor(res) {
    if (!scratch.has(res)) {
      const c = document.createElement('canvas');
      c.width = c.height = res;
      scratch.set(res, c.getContext('2d', { willReadFrequently: true }));
    }
    return scratch.get(res);
  }
  function pixelPost(img, n) {
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
    const src = new Uint8ClampedArray(d);
    const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? -1 : (y * n + x) * 4);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = at(x, y);
        if (src[i + 3]) continue;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const j = at(x + dx, y + dy);
          if (j < 0 || !src[j + 3]) continue;
          d[i] = src[j] * 0.26 + 14;
          d[i + 1] = src[j + 1] * 0.22 + 10;
          d[i + 2] = src[j + 2] * 0.3 + 26;
          d[i + 3] = 255;
          break;
        }
      }
    }
  }
  function drawPixel(id, yawOffset, ctx, t, res = 64, framing = 'previewFrame') {
    const r = rig('pixel', id);
    shoot(pxR, r, r.yaw + yawOffset, r[framing], res, t);
    const s = scratchFor(res);
    s.clearRect(0, 0, res, res);
    s.drawImage(pxR.domElement, 0, PX_MAX - res, res, res, 0, 0, res, res);
    const img = s.getImageData(0, 0, res, res);
    pixelPost(img, res);
    s.putImageData(img, 0, 0);
    const W = ctx.canvas.width;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(s.canvas, 0, 0, res, res, 0, 0, W, W);
  }
  function drawSmooth(r, yaw, frame, size, ctx, t) {
    shoot(smR, r, yaw, frame, size, t);
    const W = ctx.canvas.width;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.shadowColor = 'rgba(16, 9, 2, 0.6)';
    ctx.shadowOffsetX = ctx.shadowOffsetY = Math.max(2, Math.round(W / 64));
    ctx.drawImage(smR.domElement, 0, SM_MAX - size, size, size, 0, 0, W, W);
    ctx.restore();
  }
  const icons = new Map();
  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = iconCanvas.height = 192;
  const iconCtx = iconCanvas.getContext('2d');
  // Icons are 192px. Pixel icons are 32px art scaled up 6x with hard edges.
  function icon(id, style = 'smooth') {
    const key = `${style}:${id}`;
    if (icons.has(key)) return icons.get(key);
    if (style === 'pixel') drawPixel(id, 0, iconCtx, 0, 32, 'iconFrame');
    else { const r = rig('smooth', id); drawSmooth(r, r.yaw, r.iconFrame, 192, iconCtx, 0); }
    const url = iconCanvas.toDataURL('image/png');
    icons.set(key, url);
    return url;
  }
  function turntable(id, style, yawOffset, ctx, t) {
    if (style === 'pixel') return drawPixel(id, yawOffset, ctx, t);
    const r = rig('smooth', id);
    drawSmooth(r, r.yaw + yawOffset, r.previewFrame, SM_MAX, ctx, t);
  }
  return { icon, turntable };
}

/* ---------------- Character ---------------- */
const SKIN = 0xf3c7a0, TUNIC = 0x5f7fa8, HAIR = 0x7a4524, PANTS = 0x5a4a3d, BOOTS = 0x4a3427;
export function buildHero(opts = {}, m = MS) {
  const skin = opts.skin ?? SKIN;
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const body = new THREE.Group();
  root.add(body);
  const parts = { tunic: [], hands: [], feet: [], skin: [] };
  const add = (list, o) => { list.push(o); body.add(o); return o; };
  for (const s of [-1, 1]) {
    body.add(mesh(cyl(0.11, 0.095, 0.42, 7), m(PANTS), [0.13 * s, 0.29, 0]));
    add(parts.feet, mesh(box(0.17, 0.12, 0.28), m(BOOTS), [0.13 * s, 0.07, 0.04]));
  }
  add(parts.tunic, mesh(cyl(0.25, 0.31, 0.6, 8), m(opts.tunic ?? TUNIC), [0, 0.78, 0]));
  add(parts.tunic, mesh(cyl(0.31, 0.37, 0.18, 8), m(opts.tunic ?? TUNIC), [0, 0.47, 0]));
  const belt = mesh(torus(0.305, 0.04, 6, 16), m(0x3a2a1c), [0, 0.53, 0], [PI / 2, 0, 0]);
  body.add(belt);
  body.add(mesh(box(0.11, 0.09, 0.05), m(0xe8b73a), [0, 0.53, 0.31]));
  add(parts.skin, mesh(cyl(0.11, 0.12, 0.08, 8), m(skin), [0, 1.11, 0]));
  const arms = {};
  for (const [side, s] of [['right', -1], ['left', 1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.33 * s, 1.0, 0);
    const sh = mesh(sph(0.1, 8, 6), m(opts.tunic ?? TUNIC));
    const arm = mesh(cyl(0.07, 0.064, 0.46, 6), m(opts.tunic ?? TUNIC), [0, -0.25, 0]);
    const hand = mesh(sph(0.085, 8, 6), m(skin), [0, -0.52, 0]);
    pivot.add(sh, arm, hand);
    parts.tunic.push(sh, arm);
    parts.hands.push(hand);
    const socket = new THREE.Group();
    socket.position.set(0, -0.53, 0.02);
    pivot.add(socket);
    body.add(pivot);
    arms[side] = { pivot, socket, s };
  }
  const head = new THREE.Group();
  head.position.set(0, 1.44, 0);
  body.add(head);
  const headMesh = mesh(ico(0.42, 1), m(skin));
  head.add(headMesh);
  parts.skin.push(headMesh);
  for (const s of [-1, 1]) {
    head.add(mesh(box(0.06, 0.11, 0.03), m(opts.eyes ?? 0x2a1d18, { glow: opts.eyesGlow ?? 0 }), [0.14 * s, -0.03, 0.395]));
    head.add(mesh(box(0.08, 0.035, 0.02), m(opts.blush ?? 0xe79a86), [0.22 * s, -0.13, 0.36]));
  }
  const hair = new THREE.Group();
  const hc = m(opts.hair ?? HAIR);
  const style = opts.hairStyle ?? 'spiky';
  const cap = () => hair.add(mesh(new THREE.SphereGeometry(0.455, 12, 8, 0, PI * 2, 0, PI * 0.5), hc, [0, 0.02, -0.02], [-0.42, 0, 0]));
  const fringe = () => hair.add(mesh(box(0.6, 0.11, 0.14), hc, [0, 0.27, 0.32], [-0.55, 0, 0]));
  const sides = (len) => { for (const s of [-1, 1]) hair.add(mesh(sph(0.17, 8, 6), hc, [0.36 * s, 0.02 - len * 0.12, -0.04], [0, 0, 0.12 * s], [0.62, 1 + len * 0.7, 1.05])); };
  if (style !== 'bald') cap();
  if (style === 'spiky') {
    for (const [x, r] of [[-0.2, 0.35], [0, 0], [0.2, -0.35]]) hair.add(mesh(cone(0.1, 0.24, 5), hc, [x, 0.2, 0.34], [PI - 0.45, 0, r * 0.6]));
  } else if (style === 'bob') {
    fringe();
    sides(1);
    hair.add(mesh(sph(0.36, 10, 6), hc, [0, -0.06, -0.14], [0, 0, 0], [1.12, 0.8, 0.9]));
  } else if (style === 'long') {
    fringe();
    sides(2.2);
    hair.add(mesh(box(0.72, 0.9, 0.2), hc, [0, -0.3, -0.3], [0.08, 0, 0]));
  } else if (style === 'pony') {
    fringe();
    hair.add(mesh(sph(0.07, 6, 5), m(0xe8b73a), [0, 0.18, -0.46]));
    hair.add(mesh(cone(0.11, 0.58, 6), hc, [0, -0.12, -0.52], [PI + 0.3, 0, 0]));
  } else if (style === 'bun') {
    fringe();
    hair.add(mesh(sph(0.17, 8, 6), hc, [0, 0.42, -0.22]));
    hair.add(mesh(torus(0.11, 0.025, 5, 10), m(0xe8b73a), [0, 0.33, -0.17], [1.1, 0, 0]));
  } else if (style === 'curly') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      hair.add(mesh(sph(0.13, 7, 5), hc, [Math.cos(a) * 0.36, 0.1 + Math.sin(i * 1.7) * 0.08, Math.sin(a) * 0.36 - 0.04]));
    }
    for (const x of [-0.18, 0, 0.18]) hair.add(mesh(sph(0.12, 7, 5), hc, [x, 0.3, 0.26]));
    hair.add(mesh(sph(0.16, 7, 5), hc, [0, 0.42, -0.02]));
  }
  head.add(hair);
  const helm = new THREE.Group();
  head.add(helm);
  const back = new THREE.Group();
  back.position.set(0, 1.08, -0.2);
  body.add(back);
  const gear = { body: new THREE.Group(), gloves: [new THREE.Group(), new THREE.Group()], boots: new THREE.Group() };
  body.add(gear.body, gear.boots);
  arms.right.pivot.add(gear.gloves[0]);
  arms.left.pivot.add(gear.gloves[1]);
  return { m, opts, root, body, arms, head, hair, helm, back, parts, gear, gearKeys: {}, base: { tunic: opts.tunic ?? TUNIC, skin, boots: BOOTS }, worn: {}, twoHanded: false, hasOff: false };
}

const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const R2H = new THREE.Vector3(-0.22, 0.62, 0.32);
const N2H = new THREE.Vector3(0.55, 0.8, 0.1).normalize();
const L2H = R2H.clone().addScaledVector(N2H, 0.35);
function aimArm(arm, target) {
  arm.pivot.quaternion.setFromUnitVectors(DOWN, target.clone().sub(arm.pivot.position).normalize());
}
// Turn a held weapon about its own length so its edge (or head) leads toward hero.aim, an angle in the
// hero's own frame: 0 is straight ahead, positive turns toward the hero's left. Weapon models are drawn
// flat-on with the leading side (an axe head, a scythe blade, a curved blade's hook) at +x; flip marks
// models that should lead with the other side.
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _vx = new THREE.Vector3(), _vz = new THREE.Vector3();
function aimHeld(hero, model, def) {
  hero.root.updateMatrixWorld(true);
  hero.root.getWorldQuaternion(_qa).invert().multiply(model.parent.getWorldQuaternion(_qb));
  _vx.set(1, 0, 0).applyQuaternion(_qa);
  _vz.set(0, 0, 1).applyQuaternion(_qa);
  const a = hero.aim ?? 0, dx = Math.sin(a), dz = Math.cos(a);
  model.rotation.y = Math.atan2(-(_vz.x * dx + _vz.z * dz), _vx.x * dx + _vx.z * dz) + (def.model.flip ? PI : 0);
}
function tint(list, hex, m) { for (const o of list) o.material = m(hex); }

// Dress a hero with equipment. equip maps slot -> { uid, id } or null.
export function dressHero(hero, equip, ITEMS, freshUid = null) {
  const M = hero.m;
  const place = (key, item, parent, setup) => {
    const prev = hero.worn[key];
    if (prev && item && prev.uid === item.uid) return;
    if (prev) prev.holder.removeFromParent();
    hero.worn[key] = null;
    if (!item) return;
    const def = ITEMS[item.id];
    const holder = new THREE.Group();
    const model = buildItemModel(def, M);
    holder.add(model);
    setup(holder, model, def);
    holder.userData.base = holder.scale.x;
    holder.userData.pop = item.uid === freshUid ? 0 : 1;
    parent.add(holder);
    if (key === 'weapon' || def.dual) aimHeld(hero, model, def);
    hero.worn[key] = { uid: item.uid, holder, model };
  };
  const w = equip.weapon;
  const wdef = w && ITEMS[w.id];
  hero.twoHanded = !!(wdef && wdef.weapon?.hands === 2);
  place('weapon', w, hero.twoHanded ? hero.body : hero.arms.right.socket, (h, model, def) => {
    model.position.y = -(def.model.hand ?? -0.24);
    if (hero.twoHanded) {
      h.position.copy(R2H);
      h.quaternion.setFromUnitVectors(UP, N2H);
    } else {
      h.rotation.set(0.72, 0, 0.32);
    }
    h.scale.setScalar(def.model.hold ?? 0.8);
  });
  const off = hero.twoHanded ? null : equip.offhand;
  place('offhand', off, hero.arms.left.socket, (h, model, def) => {
    if (def.dual) {
      model.position.y = -(def.model.hand ?? -0.24);
      h.rotation.set(0.72, 0, -0.32);
      h.scale.setScalar(0.75);
    } else if (def.model.grip != null) {
      // Carried by a handle, ring or drawstring: put that point in the hand and keep the item upright,
      // undoing the arm's resting angle so it hangs (or sits) straight.
      model.position.y = -def.model.grip;
      h.position.set(0.02, -0.03, 0.05);
      h.quaternion.setFromEuler(new THREE.Euler(-0.4, 0, 0.2)).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.4, 0)));
      h.scale.setScalar(def.model.hold ?? 0.42);
    } else {
      h.position.set(0.08, 0.02, 0.1);
      h.rotation.set(0, -0.5, 0);
      h.scale.setScalar(def.model.hold ?? 0.42);
    }
  });
  if (hero.twoHanded) {
    aimArm(hero.arms.right, R2H);
    aimArm(hero.arms.left, L2H);
  } else {
    hero.arms.right.pivot.rotation.set(-0.5, 0, -0.16);
    hero.arms.left.pivot.rotation.set(off ? -0.4 : 0.12, 0, off ? 0.2 : 0.14);
  }
  place('helm', equip.helm, hero.helm, (h, model, def) => {
    const wear = def.model.wear ?? { y: 0.04, s: 0.8 };
    h.position.set(0, wear.y, 0);
    h.scale.setScalar(wear.s);
  });
  hero.hair.visible = !equip.helm;
  place('cape', equip.cape, hero.back, (h, model, def) => {
    h.rotation.set(0, PI, 0);
    h.position.set(0, -0.47, 0.04);
    h.scale.set(1.0, 0.72, 0.7);
  });
  const tintOf = (item) => item && (ITEMS[item.id].model.tint ?? ITEMS[item.id].model.a);
  tint(hero.parts.tunic, tintOf(equip.body) ?? hero.base.tunic, M);
  tint(hero.parts.hands, tintOf(equip.gloves) ?? hero.base.skin, M);
  tint(hero.parts.feet, tintOf(equip.boots) ?? hero.base.boots, M);
  hero.hasOff = !!off;
  const key = it => (it ? it.uid : 0);
  const clear = grp => { while (grp.children.length) grp.remove(grp.children[0]); };
  if (hero.gearKeys.body !== key(equip.body)) {
    hero.gearKeys.body = key(equip.body);
    clear(hero.gear.body);
    if (equip.body) {
      const p = ITEMS[equip.body.id].model;
      const trim = p.b;
      if (p.kind === 'plate' || p.kind === 'carapace' || p.kind === 'mail') {
        const r = p.kind === 'mail' ? 0.12 : 0.15;
        for (const k of [-1, 1]) {
          hero.gear.body.add(mesh(new THREE.SphereGeometry(r, 10, 6, 0, PI * 2, 0, PI / 2), M(trim), [0.34 * k, 1.03, 0], [0, 0, -0.35 * k], [1.25, 0.85, 1.2]));
          if (p.kind === 'carapace') hero.gear.body.add(mesh(cone(0.04, 0.16, 5), M(p.c ?? trim), [0.42 * k, 1.12, 0], [0, 0, -0.9 * k]));
        }
        hero.gear.body.add(mesh(torus(0.3, 0.035, 5, 16), M(trim), [0, 1.06, 0], [PI / 2, 0, 0]));
      }
      if (p.kind === 'robe') hero.gear.body.add(mesh(cyl(0.36, 0.44, 0.34, 10, true), M(p.a, { double: true }), [0, 0.3, 0]));
      if (p.emblem) hero.gear.body.add(mesh(octa(0.06), M(p.emblem, { glow: 0.7 }), [0, 0.84, 0.29], [0, 0, 0], [1, 1.3, 0.6]));
      if (p.flame) flames(hero.gear.body, M, 0, 0.78, 0.29, 0.3);
      if (p.snow) snowflake(hero.gear.body, M, p.snow, 0, 0.84, 0.29, 0.08);
      if (p.clover) clover(hero.gear.body, M, p.clover, -0.1, 0.88, 0.28, 0.035);
      if (p.spikes) {
        for (const k of [-1, 1]) for (const [x, y, rz] of [[0.36, 1.1, -0.5], [0.42, 1.0, -1.0], [0.28, 0.9, -1.3]]) {
          hero.gear.body.add(mesh(cone(0.03, 0.12, 4), M(p.spikes.color), [x * k, y, 0.05], [0, 0, rz * k]));
        }
        for (const [x, y] of [[-0.12, 0.92], [0.12, 0.74], [-0.08, 0.62]]) hero.gear.body.add(mesh(cone(0.025, 0.09, 4), M(p.spikes.color), [x, y, 0.3], [PI / 2, 0, 0]));
      }
    }
  }
  if (hero.gearKeys.gloves !== key(equip.gloves)) {
    hero.gearKeys.gloves = key(equip.gloves);
    hero.gear.gloves.forEach(clear);
    if (equip.gloves) {
      const p = ITEMS[equip.gloves.id].model;
      for (const grp of hero.gear.gloves) {
        grp.add(mesh(cyl(0.085, 0.1, 0.12, 8), M(p.b), [0, -0.42, 0]));
        if (p.spikes) for (const a of [0, 2.1, 4.2]) grp.add(mesh(cone(0.022, 0.08, 4), M(p.spikes.color), [Math.cos(a) * 0.1, -0.42, Math.sin(a) * 0.1], [Math.sin(a) * PI / 2, 0, -Math.cos(a) * PI / 2]));
        if (p.knuckle || p.gem || p.frost) grp.add(mesh(p.spike ? cone(0.025, 0.08, 5) : octa(0.035), M(p.knuckle ?? p.gem ?? p.frost, { glow: 0.5 }), [0, -0.55, 0.08], p.spike ? [PI / 2, 0, 0] : [0, 0, 0]));
      }
    }
  }
  if (hero.gearKeys.boots !== key(equip.boots)) {
    hero.gearKeys.boots = key(equip.boots);
    clear(hero.gear.boots);
    if (equip.boots) {
      const p = ITEMS[equip.boots.id].model;
      for (const k of [-1, 1]) {
        hero.gear.boots.add(mesh(cyl(0.125, 0.12, 0.26, 8), M(p.sandal ? (p.wrap ?? 0xe8dcc0) : p.a), [0.13 * k, 0.2, 0]));
        hero.gear.boots.add(mesh(torus(0.125, 0.03, 5, 12), M(p.sandal ? p.a : p.b), [0.13 * k, 0.33, 0], [PI / 2, 0, 0]));
        if (p.spikes) for (const a of [0.6, 2.5]) hero.gear.boots.add(mesh(cone(0.025, 0.09, 4), M(p.spikes.color), [0.13 * k + Math.cos(a) * 0.13 * k, 0.24, Math.sin(a) * 0.13], [Math.sin(a) * PI / 2, 0, -Math.cos(a) * k * PI / 2]));
        if (p.extra === 'fur') hero.gear.boots.add(mesh(torus(0.13, 0.05, 5, 10), M(0xffffff), [0.13 * k, 0.34, 0], [PI / 2, 0, 0]));
        if (p.extra === 'flames') flames(hero.gear.boots, M, 0.13 * k, 0.32, -0.04, 0.25);
        if (p.extra === 'wings') hero.gear.boots.add(mesh(extrude(shapeFrom(WING, k), 0.02, 0.005), M(0xffffff), [0.22 * k, 0.24, -0.03], [0, -0.4 * k, 0], [0.32, 0.32, 1]));
      }
    }
  }
}

// Attack and cast poses. s swings the weapon arm (or both arms for two-handed weapons),
// os swings the offhand arm. 0 is the resting pose.
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);
export function swingPose(hero, s = 0, os = 0) {
  if (hero.twoHanded) {
    _dir.copy(N2H).applyAxisAngle(X_AXIS, s);
    const w = hero.worn.weapon;
    if (w) w.holder.quaternion.setFromUnitVectors(UP, _dir);
    aimArm(hero.arms.right, R2H);
    aimArm(hero.arms.left, R2H.clone().addScaledVector(_dir, 0.35));
  } else {
    hero.arms.right.pivot.rotation.set(-0.5 + s, 0, -0.16);
    hero.arms.left.pivot.rotation.set((hero.hasOff ? -0.4 : 0.12) + os, 0, hero.hasOff ? 0.2 : 0.14);
  }
}

// Idle animation and equipped-item animations.
export function animateHero(hero, t, dt, reduce) {
  const bob = reduce ? 0 : Math.sin(t * 2.2);
  hero.body.position.y = bob * 0.018;
  if (!hero.twoHanded) {
    hero.arms.right.pivot.rotation.x = -0.5 + bob * 0.03;
  }
  hero.head.rotation.z = reduce ? 0 : Math.sin(t * 1.1) * 0.035;
  for (const w of Object.values(hero.worn)) {
    if (!w) continue;
    w.model.userData.anim?.(t);
    const h = w.holder;
    if (h.userData.pop < 1) {
      h.userData.pop = Math.min(1, h.userData.pop + dt * 3.2);
      const p = h.userData.pop;
      const k = reduce ? 1 : 1 + Math.sin(p * PI) * 0.35 * (1 - p) - (1 - p) * 0.6;
      h.scale.setScalar(h.userData.base * Math.max(0.05, k));
    }
  }
}

export function pedestal() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.8, 0.86, 0.16, 18), MS(0x6b6056), [0, -0.08, 0]));
  g.add(mesh(torus(0.8, 0.03, 6, 36), MS(0xc09450, { glow: 0.2 }), [0, 0, 0], [PI / 2, 0, 0]));
  const shadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  g.add(mesh(new THREE.CircleGeometry(0.42, 24), shadow, [0, 0.005, 0], [-PI / 2, 0, 0]));
  return g;
}

export function heroLights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2e24, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.3);
  key.position.set(-2.5, 4, 3.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc4ff, 1.5);
  rim.position.set(2.5, 2.2, -3);
  scene.add(rim);
}

export function iceBlock() {
  const mat = new THREE.MeshLambertMaterial({ color: 0xa8e6ff, transparent: true, opacity: 0.45, flatShading: true, emissive: 0x2a6a8a, emissiveIntensity: 0.4, depthWrite: false });
  const g = new THREE.Group();
  g.add(mesh(new THREE.IcosahedronGeometry(1.0, 0), mat, [0, 0.95, 0], [0.2, 0.4, 0], [0.75, 1.2, 0.7]));
  return g;
}

/* ---------------- Pixel pass ----------------
   Renders a scene at low resolution, outlines silhouettes and depth edges
   in a darker shade of the colour in front, then scales up with hard pixels. */
export class PixelPass {
  constructor(renderer, px = 3) {
    this.r = renderer;
    this.px = px;
    this.rt = null;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() }, cameraNear: { value: 0.1 }, cameraFar: { value: 80 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        #include <packing>
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel; uniform float cameraNear; uniform float cameraFar;
        varying vec2 vUv;
        float dist(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
        void probe(vec2 uv, vec4 c, float z, inout vec4 edge, inout float best) {
          vec4 n = texture2D(tColor, uv);
          if (n.a < 0.5) return;
          float nz = dist(uv);
          float gap = c.a < 0.5 ? 1e3 : z - nz;
          if (gap > 0.22 + nz * 0.02 && gap > best) { best = gap; edge = vec4(n.rgb * 0.22 + vec3(0.012, 0.008, 0.02), 1.0); }
        }
        void main() {
          vec4 c = texture2D(tColor, vUv);
          float z = dist(vUv);
          vec4 edge = vec4(0.0); float best = 0.0;
          probe(vUv + vec2(texel.x, 0.0), c, z, edge, best);
          probe(vUv - vec2(texel.x, 0.0), c, z, edge, best);
          probe(vUv + vec2(0.0, texel.y), c, z, edge, best);
          probe(vUv - vec2(0.0, texel.y), c, z, edge, best);
          vec4 col;
          if (best > 0.0) col = edge;
          else if (c.a >= 0.5) col = vec4(c.rgb, 1.0);
          else {
            float g = max(c.r, max(c.g, c.b));
            if (g < 0.03) discard;
            col = vec4(c.rgb, min(1.0, g));
          }
          gl_FragColor = col;
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false, transparent: true,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(cssW, cssH) {
    const w = Math.max(1, Math.round(cssW / this.px)), h = Math.max(1, Math.round(cssH / this.px));
    if (this.rt && this.rt.width === w && this.rt.height === h) return;
    this.rt?.dispose();
    this.rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(w, h),
    });
    this.mat.uniforms.tColor.value = this.rt.texture;
    this.mat.uniforms.tDepth.value = this.rt.depthTexture;
    this.mat.uniforms.texel.value.set(1 / w, 1 / h);
  }
  render(scene, camera) {
    if (!this.rt) return;
    const r = this.r;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.clear();
    this.mat.uniforms.cameraNear.value = camera.near;
    this.mat.uniforms.cameraFar.value = camera.far;
    r.render(this.scene, this.cam);
  }
}
