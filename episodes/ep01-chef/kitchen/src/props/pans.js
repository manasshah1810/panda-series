import * as THREE from 'three';
import { lathe, mat4, instanced, mulberry32 } from './helpers.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ladleGeometry, spatulaGeometry, whiskGeometry } from './utensils.js';

function panGeometry(r, Lh, rad) {
  const hgt = 0.045, body = lathe([[0.001, 0], [r * 0.85, 0], [r, hgt], [r - 0.005, hgt], [r * 0.85 - 0.005, 0.005], [0.001, 0.005]], rad), parts = [];
  const add = (g, xf) => { const x = g.index ? g.toNonIndexed() : g; x.applyMatrix4(mat4(xf)); parts.push(x); };
  add(body, { p: [0, -(Lh + r), 0], r: [Math.PI / 2, 0, 0] });
  add(new THREE.CylinderGeometry(0.011, 0.009, Lh + 0.02, 8), { p: [0, -Lh / 2 + 0.01, hgt * 0.55] });
  add(new THREE.TorusGeometry(0.014, 0.004, 6, 12), { p: [0, -0.006, hgt * 0.55], r: [0, 0, 0] });
  const g = mergeGeometries(parts, false); parts.forEach((x) => x.dispose()); g.computeBoundingBox(); return g;
}
const SPECS = { panS: [0.11, 0.2], panM: [0.14, 0.24], panL: [0.17, 0.27] };

/** Hanging pans, ladles, spatulas and whisks on the brass rail: 6 instanced meshes with a deterministic sway (function of setTime). */
export function buildHangers(ctx, group) {
  const { cfg, m, T, B } = ctx, rail = cfg.rail, steel = new THREE.Color(cfg.palette.steel), tint = (hex) => { const c = new THREE.Color(hex); return new THREE.Color(c.r / steel.r, c.g / steel.g, c.b / steel.b); };
  const tints = { steel: new THREE.Color(1, 1, 1), copper: tint(cfg.palette.copper), brass: tint(cfg.palette.brass), wood: new THREE.Color(1, 1, 1) };
  const kinds = { panS: [], panM: [], panL: [], ladle: [], whisk: [], spatula: [] }, rng = mulberry32(ctx.seed ?? 1);
  cfg.hangers.forEach(([x, kind, c], i) => { kinds[kind].push({ x, tint: tints[c], phase: rng() * 6.283, freq: 0.14 + rng() * 0.08, amp: 0.012 + rng() * 0.012, i });
    B.add(m.brass, new THREE.TorusGeometry(0.0155, 0.0035, 6, 12), { p: [x, rail.y, rail.z], r: [0, Math.PI / 2, 0] }); });   // little ring on the rail for every item
  const geos = { panS: panGeometry(SPECS.panS[0], SPECS.panS[1], T.rad), panM: panGeometry(SPECS.panM[0], SPECS.panM[1], T.rad), panL: panGeometry(SPECS.panL[0], SPECS.panL[1], T.rad), ladle: ladleGeometry(T.rad), whisk: whiskGeometry(T.rad), spatula: spatulaGeometry(T.rad) };
  const meshes = [], top = rail.y - 0.012, tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  for (const [kind, list] of Object.entries(kinds)) {
    if (!list.length) continue;
    const mat = kind === 'spatula' ? m.wood : m.steel, im = instanced(geos[kind], mat, list.map(() => new THREE.Matrix4()), list.map((l) => l.tint), 'hang_' + kind); group.add(im); meshes.push(im);
    const upd = (t) => { list.forEach((l, k) => { tmpE.set(-0.045, 0, l.amp * Math.sin(6.2832 * l.freq * t + l.phase)); tmpQ.setFromEuler(tmpE); tmpM.compose(new THREE.Vector3(l.x, top, rail.z + 0.012), tmpQ, one); im.setMatrixAt(k, tmpM); }); im.instanceMatrix.needsUpdate = true; };
    upd(0); ctx.anim.push(upd);
  }
  return meshes;
}
