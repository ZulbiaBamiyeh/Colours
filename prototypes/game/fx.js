// Battle effects: pooled particles, weapon slash arcs, shield bubbles, status rings and projectiles.
import * as THREE from 'three';

const PI = Math.PI;
const rand = (a, b) => a + Math.random() * (b - a);

export class Particles {
  constructor(scene, cap = 900) {
    this.cap = cap;
    this.list = [];
    this.mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.userData.fx = true;
    scene.add(this.mesh);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
  }
  emit(o) {
    if (this.list.length >= this.cap) return;
    const life = o.life ?? 0.8;
    this.list.push({
      x: o.x, y: o.y, z: o.z ?? 0, vx: o.vx ?? 0, vy: o.vy ?? 0, vz: o.vz ?? 0,
      g: o.g ?? 0, drag: o.drag ?? 0, life, max: life, size: o.size ?? 0.05,
      color: new THREE.Color(o.color ?? 0xffffff), spin: rand(-6, 6), rot: rand(0, PI),
      orbit: o.orbit ?? null, grow: o.grow ?? false,
    });
  }
  burst(x, y, z, n, color, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, PI * 2), e = rand(-0.6, 1.2), sp = rand(o.min ?? 1, o.max ?? 3);
      this.emit({
        x, y, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + (o.up ?? 0), vz: Math.sin(a) * Math.cos(e) * sp * (o.flat ?? 0.6),
        g: o.g ?? -5, drag: o.drag ?? 2.2, life: rand(o.life ?? 0.35, (o.life ?? 0.35) * 1.8),
        size: rand(o.size ?? 0.035, (o.size ?? 0.035) * 1.7), color: Array.isArray(color) ? color[i % color.length] : color,
      });
    }
  }
  update(dt) {
    const L = this.list;
    let w = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.orbit) {
        p.orbit.a += p.orbit.w * dt;
        p.x = p.orbit.cx + Math.cos(p.orbit.a) * p.orbit.r;
        p.z = Math.sin(p.orbit.a) * p.orbit.r * 0.6;
        p.y += p.vy * dt;
      } else {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k; p.vy = p.vy * k + p.g * dt; p.vz *= k;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
      p.rot += p.spin * dt;
      L[w++] = p;
    }
    L.length = w;
    const n = Math.min(w, this.cap);
    for (let i = 0; i < n; i++) {
      const p = L[i];
      const f = p.life / p.max;
      const sc = p.size * (p.grow ? Math.sin(f * PI) : Math.sqrt(f));
      this._e.set(p.rot, p.rot * 0.7, 0);
      this._q.setFromEuler(this._e);
      this._p.set(p.x, p.y, p.z);
      this._s.setScalar(Math.max(0.0001, sc));
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
      this.mesh.setColorAt(i, p.color);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.list.length = 0; this.mesh.count = 0; }
}

const addMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
});

// Per-fighter effect meshes, parented to the fighter's holder (which only translates).
export function fighterFx(dir) {
  const g = new THREE.Group();
  const slashMat = addMat(0xffffff, 0);
  const slash = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 4, 28, PI * 0.85), slashMat);
  slash.position.set(dir * 0.45, 1.15, 0.25);
  slash.rotation.z = -0.75;
  slash.scale.set(dir, 1, 1);
  slash.userData.fx = true;
  const slash2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 4, 28, PI * 0.8), slashMat);
  slash2.position.copy(slash.position);
  slash2.rotation.z = -0.65;
  slash2.scale.set(dir, 1, 1);
  g.add(slash, slash2);

  const bubbleMat = addMat(0x8fd0ff, 0);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, wireframe: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const bubbleGeo = new THREE.IcosahedronGeometry(1, 1);
  const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
  const wire = new THREE.Mesh(bubbleGeo, wireMat);
  for (const b of [bubble, wire]) { b.position.y = 0.95; b.scale.set(0.82, 1.12, 0.82); g.add(b); }

  const ring = (color) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 4, 32), addMat(color, 0));
    r.rotation.x = PI / 2;
    r.position.y = 0.04;
    g.add(r);
    return r;
  };
  const slowRing = ring(0x7fb0ff);
  const heatRing = ring(0xff8a3a);
  const clutchRing = ring(0xf4c652);
  return { group: g, slash, slash2, slashMat, bubble, bubbleMat, wire, wireMat, slowRing, heatRing, clutchRing };
}

export class Bolts {
  constructor(scene, particles) {
    this.scene = scene;
    this.particles = particles;
    this.list = [];
    this.geo = new THREE.IcosahedronGeometry(0.1, 0);
  }
  launch(from, to, t0, t1, color) {
    const mesh = new THREE.Mesh(this.geo, addMat(color, 1));
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.list.push({ mesh, from: from.clone(), to: to.clone(), t0, t1, color, done: false });
  }
  update(T, dt) {
    for (const b of this.list) {
      const k = (T - b.t0) / (b.t1 - b.t0);
      if (k < 0) { b.mesh.visible = false; continue; }
      b.mesh.visible = true;
      const c = Math.min(1, k);
      b.mesh.position.lerpVectors(b.from, b.to, c);
      b.mesh.position.y += Math.sin(c * PI) * 0.45;
      b.mesh.rotation.x += dt * 9;
      b.mesh.rotation.y += dt * 7;
      if (dt > 0) this.particles.emit({ x: b.mesh.position.x, y: b.mesh.position.y, z: b.mesh.position.z, vy: rand(-0.2, 0.3), life: 0.3, size: 0.045, color: b.color });
      if (k >= 1 && !b.done) {
        b.done = true;
        this.particles.burst(b.to.x, b.to.y, b.to.z, 10, b.color, { max: 2.2, life: 0.3 });
      }
    }
    this.list = this.list.filter(b => {
      if (b.done) { this.scene.remove(b.mesh); b.mesh.material.dispose(); return false; }
      return true;
    });
  }
  clear() { for (const b of this.list) { this.scene.remove(b.mesh); b.mesh.material.dispose(); } this.list = []; }
}
