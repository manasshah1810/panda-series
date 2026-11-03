// Episode-local helpers (kept out of the kit on purpose: only the public API is used).
import * as THREE from 'three';
import { fitRing, torsoSurfaceZ } from '@panda-series/panda-kit/outfits/fit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { fitRing, torsoSurfaceZ };
export function socketBaseY(panda, name) { panda.root.updateMatrixWorld(true); const v = new THREE.Vector3(); panda.sockets[name].getWorldPosition(v); return v.y / panda.options.scale; }
export const std = (color, rough = 0.95, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...extra });
/** Flat ribbon lofted along `pts` (Vector3[]) with per-point `normals`; half-width w(u), thickness t(u). Closed optional. */
export function ribbon(pts, normals, w, t, closed = false, rs = 8) {
  const n = pts.length, pos = [], idx = [], up = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), tan = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize(), nr = normals[i], side = new THREE.Vector3().crossVectors(tan, nr).normalize(); up.crossVectors(nr, side).normalize();
    for (let j = 0; j < rs; j++) { const a = (j / rs) * Math.PI * 2, cw = Math.cos(a) * w(u), ct = Math.sin(a) * t(u); pos.push(...pts[i].clone().addScaledVector(side, cw).addScaledVector(nr, ct).toArray()); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < rs; j++) { const a = i * rs + j, b = i * rs + (j + 1) % rs, c = a + rs, d = b + rs; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** Normal of the torso surface at (x,y) by finite differences. */
export function surfNormal(x, y) {
  const e = 0.01, z = (a, b) => torsoSurfaceZ(a, b), dx = (z(x + e, y) - z(x - e, y)) / (2 * e), dy = (z(x, y + e) - z(x, y - e)) / (2 * e);
  return new THREE.Vector3(-(isFinite(dx) ? dx : 0), -(isFinite(dy) ? dy : 0), 1).normalize();
}
/** Point on the torso surface (+ offset along the normal), local to a socket at world height yS. */
export function onSurface(x, y, off, yS) { const z = torsoSurfaceZ(x, y), n = surfNormal(x, y); return new THREE.Vector3(x, y, isFinite(z) ? z : 0).addScaledVector(n, off).sub(new THREE.Vector3(0, yS, 0)); }
export const merge = (gs) => mergeGeometries(gs, false);
