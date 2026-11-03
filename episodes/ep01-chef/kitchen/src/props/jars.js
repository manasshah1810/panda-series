import * as THREE from 'three';
import { lathe } from './helpers.js';
/** Jars (ceramic body + wood lid) on the shelves, and the two cookware pots with lids on the back counter. Static, merged. */
export function buildJars(ctx, list) {
  const { B, m, T } = ctx, rad = T.rad;
  for (const [x, y, z, h, r] of list) {
    B.add(m.ceramic, lathe([[0.001, 0], [r * 0.95, 0], [r, 0.012], [r, h - 0.03], [r * 0.82, h - 0.012], [r * 0.7, h], [r * 0.6, h], [r * 0.6, h - 0.01], [0.001, h - 0.01]], rad), { p: [x, y, z] }, null, 'jar');
    B.add(m.wood, new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.024, rad), { p: [x, y + h + 0.008, z] }, { s: 3, grain: 'x', o: [x, y] }, 'jar');
    B.add(m.wood, new THREE.SphereGeometry(0.012, 8, 6), { p: [x, y + h + 0.026, z] }, { s: 3 }, 'jar');
    ctx.placements.push({ name: 'jar', box: new THREE.Box3(new THREE.Vector3(x - r, y, z - r), new THREE.Vector3(x + r, y + h + 0.03, z + r)), supportY: y });
  }
}
export function buildPots(ctx, specs) {
  const { B, m, T } = ctx, rad = T.rad;
  for (const [x, y, z, r, h, mat] of specs) {
    const M = m[mat];
    B.add(M, lathe([[0.001, 0], [r * 0.92, 0], [r, 0.012], [r, h - 0.01], [r + 0.006, h], [r - 0.012, h], [r - 0.012, h - 0.014], [r - 0.006, 0.012], [0.001, 0.008]], rad), { p: [x, y, z] }, { s: 1.4, grain: 'y' }, 'pot');
    B.add(M, lathe([[0.001, h + 0.052], [r * 0.35, h + 0.046], [r * 0.9, h + 0.014], [r + 0.012, h + 0.004], [r + 0.012, h], [r * 0.9, h + 0.006], [0.001, h + 0.04]], rad), { p: [x, y, z] }, { s: 1.4 }, 'pot');
    B.add(m.brass, new THREE.SphereGeometry(0.017, 10, 8), { p: [x, y + h + 0.06, z] }, null, 'pot');
    for (const s of [-1, 1]) B.add(m.brass, new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), { p: [x + s * (r + 0.01), y + h - 0.045, z], r: [0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2] }, null, 'pot');
    ctx.placements.push({ name: 'pot', box: new THREE.Box3(new THREE.Vector3(x - r, y, z - r), new THREE.Vector3(x + r, y + h + 0.075, z + r)), supportY: y });
  }
}
