import * as THREE from 'three';
import { lathe, tube, instanced, mulberry32, mat4 } from './helpers.js';

function leafGeometry() {
  const g = new THREE.PlaneGeometry(0.075, 0.15, 2, 5); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = Math.min(1, Math.max(0, p.getY(i) / 0.15 + 0.5)), w = Math.sin(Math.PI * Math.pow(v, 0.75)); p.setX(i, p.getX(i) * w * 1.1); p.setZ(i, 0.045 * v * v - Math.abs(p.getX(i)) * 0.25); p.setY(i, v * 0.15); }
  g.computeVertexNormals(); g.computeBoundingBox(); return g;
}
const GREENS = ['#6E8B5B', '#7C9A66', '#5F7E50', '#86A06E'].map((c) => new THREE.Color(c));

/** Two shelf plants (leafy + trailing) as one leaf InstancedMesh, and the dark vase with a dried branch (tube twigs + instanced pods). Leaves sway as a pure function of t. */
export function buildPlants(ctx, group) {
  const { cfg, m, B, T } = ctx, rng = mulberry32((ctx.seed ?? 1) + 77), zb = cfg.room.backWallZ, S = cfg.shelves, rad = T.rad, shelfTop = (i) => S.levels[i] + S.thick / 2;
  const potGeo = (r, h) => lathe([[0.001, 0], [r * 0.7, 0], [r, h], [r + 0.008, h], [r - 0.01, h], [r - 0.01, 0.014], [0.001, 0.014]], rad);
  const leaves = [], total = T.leaves, nTrail = Math.ceil(total * 0.55), nLeafy = total - nTrail, up = new THREE.Vector3(0, 1, 0);
  // small leafy plant on the lower shelf (x 3.05)
  const lx = 3.05, lz = zb + 0.17, ly = shelfTop(0); B.add(m.ceramic, potGeo(0.065, 0.1), { p: [lx, ly, lz] }, null, 'plantPot'); ctx.placements.push({ name: 'leafyPot', box: new THREE.Box3(new THREE.Vector3(lx - 0.07, ly, lz - 0.07), new THREE.Vector3(lx + 0.07, ly + 0.1, lz + 0.07)), supportY: ly });
  for (let i = 0; i < nLeafy; i++) { const a = (i / nLeafy) * 6.283 * 2.0 + rng(), tilt = 0.35 + rng() * 0.75, h = 0.5 + (i % 3) * 0.28; const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
    leaves.push({ p: new THREE.Vector3(lx + Math.cos(a) * 0.02, ly + 0.095 + (i % 3) * 0.012, lz + Math.sin(a) * 0.02), dir, s: 0.9 + rng() * 0.5 + h * 0.2, roll: rng() * 6.28, ph: rng() * 6.28, f: 0.2 + rng() * 0.15, amp: 0.05 + rng() * 0.04 }); }
  // trailing plant on the upper shelf (x 1.0): vines spill over the front edge and hang
  const tx = 1.0, tz = zb + 0.16, ty = shelfTop(1); B.add(m.ceramic, potGeo(0.07, 0.1), { p: [tx, ty, tz] }, null, 'plantPot'); ctx.placements.push({ name: 'trailPot', box: new THREE.Box3(new THREE.Vector3(tx - 0.07, ty, tz - 0.07), new THREE.Vector3(tx + 0.07, ty + 0.1, tz + 0.07)), supportY: ty });
  const vines = 3, per = Math.ceil(nTrail / vines), frontZ = zb + S.depth - 0.02;
  for (let v = 0; v < vines; v++) { const vx = tx + (v - 1) * 0.07, pts = [[vx, ty + 0.1, tz], [vx + 0.02, ty + 0.13, tz + 0.08], [vx, ty + 0.04, frontZ - 0.05], [vx - 0.015, ty - 0.12, frontZ + 0.0], [vx + 0.01, ty - 0.3 - v * 0.05, frontZ + 0.01]];
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))); B.add(m.leaf, tube(pts, 0.0025, 18, 4), null, null, null);
    for (let i = 0; i < per && leaves.length < total; i++) { const u = (i + 0.5) / per, P = curve.getPoint(u), tg = curve.getTangent(u), side = i % 2 ? 1 : -1; const dir = new THREE.Vector3(side * 0.9, -0.15, 0.35 + rng() * 0.3).normalize().add(tg.clone().multiplyScalar(-0.2)).normalize();
      leaves.push({ p: P, dir, s: 0.75 + rng() * 0.35, roll: rng() * 6.28, ph: rng() * 6.28, f: 0.18 + rng() * 0.12, amp: 0.06 + rng() * 0.04 }); } }
  const lg = leafGeometry(), tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion(), qs = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  const leafMesh = instanced(lg, m.leaf, leaves.map(() => new THREE.Matrix4()), leaves.map(() => GREENS[Math.floor(rng() * GREENS.length)]), 'leaves'); group.add(leafMesh);
  const upd = (t) => { leaves.forEach((l, i) => { q.setFromUnitVectors(up, l.dir); qr.setFromAxisAngle(up, l.roll); e.set(l.amp * Math.sin(6.283 * l.f * t + l.ph), 0, l.amp * 0.7 * Math.cos(6.283 * l.f * t + l.ph * 1.3)); qs.setFromEuler(e); q.multiply(qr).multiply(qs); sc.setScalar(l.s); tmp.compose(l.p, q, sc); leafMesh.setMatrixAt(i, tmp); }); leafMesh.instanceMatrix.needsUpdate = true; };
  upd(0); ctx.anim.push(upd);
  // ---- dark vase with a dried branch ----
  const vx = cfg.vase.x, vz = cfg.vase.z, vy = cfg.backCounter.topY, vh = 0.34;
  B.add(m.ceramicDark, lathe([[0.001, 0], [0.07, 0], [0.095, 0.08], [0.085, 0.2], [0.05, 0.3], [0.04, vh], [0.032, vh], [0.032, vh - 0.01], [0.001, vh - 0.01]], rad), { p: [vx, vy, vz] }, null, 'vase');
  ctx.placements.push({ name: 'vase', box: new THREE.Box3(new THREE.Vector3(vx - 0.095, vy, vz - 0.095), new THREE.Vector3(vx + 0.095, vy + vh, vz + 0.095)), supportY: vy });
  const pods = [], nb = 5, podPer = Math.ceil(T.pods / nb);
  for (let b = 0; b < nb; b++) { const a = (b / nb) * 6.283 + 0.4, lean = 0.12 + b * 0.05, len = 0.75 + (b % 3) * 0.18, pts = []; for (let k = 0; k <= 4; k++) { const u = k / 4; pts.push([vx + Math.cos(a) * lean * u * len * 1.4 + (rng() - 0.5) * 0.03, vy + vh - 0.01 + u * len, vz + Math.sin(a) * lean * u * len * 0.8 + (rng() - 0.5) * 0.03]); }
    B.add(m.twig, tube(pts, 0.0048, 14, 5), null, null, 'branch'); const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    for (let i = 0; i < podPer && pods.length < T.pods; i++) { const u = 0.35 + 0.65 * ((i + 0.5) / podPer), P = curve.getPoint(u), s = 0.8 + rng() * 0.7; const side = new THREE.Vector3(Math.cos(a + (i % 2 ? 1.2 : -1.2)), 0.5, Math.sin(a + (i % 2 ? 1.2 : -1.2))).normalize(); pods.push({ p: P.clone().addScaledVector(side, 0.03 * s), q: new THREE.Quaternion().setFromUnitVectors(up, side), s }); } }
  const podGeo = new THREE.SphereGeometry(0.014, 8, 6); podGeo.scale(0.8, 1.9, 0.8); const olive = ['#7A7A52', '#8F8560', '#6B6A48'].map((c) => new THREE.Color(c));
  const pm = instanced(podGeo, m.leaf, pods.map((p) => { const mm = new THREE.Matrix4(); mm.compose(p.p, p.q, new THREE.Vector3(p.s, p.s, p.s)); return mm; }), pods.map(() => olive[Math.floor(rng() * 3)]), 'pods'); group.add(pm);
  ctx.placements.push({ name: 'branch', box: new THREE.Box3(new THREE.Vector3(vx - 0.1, vy + vh - 0.01, vz - 0.1), new THREE.Vector3(vx + 0.3, vy + vh + 1.0, vz + 0.2)), supportY: vy + vh - 0.01 });
}
