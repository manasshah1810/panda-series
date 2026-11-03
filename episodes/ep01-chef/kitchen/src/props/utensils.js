import * as THREE from 'three';
import { lathe, mat4, boxUV } from './helpers.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// Hanging prototypes: origin = the hook, the item hangs along -Y, its face points +Z. Each returns one merged non-indexed geometry (position/normal/uv).
const part = (g, xf) => { const x = g.index ? g.toNonIndexed() : g; x.deleteAttribute?.('tangent'); if (xf) x.applyMatrix4(mat4(xf)); return x; };
const fin = (list) => { const g = mergeGeometries(list.map((x) => { if (!x.attributes.uv) x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); return x; }), false); list.forEach((x) => x.dispose()); g.computeBoundingBox(); return g; };
const cyl = (r, h, rad) => new THREE.CylinderGeometry(r, r, h, rad);

export function ladleGeometry(rad) {
  const bowl = lathe([[0.001, 0], [0.026, 0.006], [0.046, 0.026], [0.05, 0.04], [0.046, 0.04], [0.042, 0.028], [0.024, 0.012], [0.001, 0.007]], rad);
  return fin([part(cyl(0.0065, 0.3, 8), { p: [0, -0.15, 0.02] }), part(new THREE.SphereGeometry(0.011, 8, 6), { p: [0, 0, 0.02] }), part(bowl, { p: [0, -0.35, 0.0], r: [Math.PI / 2, 0, 0] }), part(cyl(0.0075, 0.06, 8), { p: [0, -0.31, 0.014], r: [0.35, 0, 0] })]);
}
export function spatulaGeometry(rad, seg) {
  const g = fin([part(cyl(0.008, 0.24, 8), { p: [0, -0.12, 0.012] }), part(new THREE.BoxGeometry(0.07, 0.11, 0.008), { p: [0, -0.295, 0.012] }), part(new THREE.SphereGeometry(0.012, 8, 6), { p: [0, 0, 0.012] })]);
  const n = g.clone(); boxUV(n, { s: 2, grain: 'y' }); g.dispose(); return n;
}
export function whiskGeometry(rad) {
  const parts = [part(cyl(0.0095, 0.15, 8), { p: [0, -0.075, 0.03] }), part(new THREE.SphereGeometry(0.014, 8, 6), { p: [0, 0, 0.03] }), part(cyl(0.012, 0.025, 8), { p: [0, -0.16, 0.03] })];
  for (let k = 0; k < 6; k++) parts.push(part(new THREE.TorusGeometry(0.036, 0.0024, 3, Math.max(8, rad)), { p: [0, -0.275, 0.03], r: [0, (k * Math.PI) / 6, 0], s: [1, 3.2, 1] }));
  return fin(parts);
}
