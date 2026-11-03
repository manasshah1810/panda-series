import * as THREE from 'three';
import { lathe, instanced, instancedBox } from './helpers.js';

const TINTS = ['#FFFFFF', '#F3EBDD', '#E8DCC8', '#DAD4C8'].map((h) => new THREE.Color(h));
/** Stacked plates and bowls (2 instanced meshes). Stacks are described as [kind, x, y(shelf top), z, count, radiusScale]. */
export function buildDishes(ctx, content, stacks, tag = 'dishes') {
  const { m, T } = ctx, rad = T.rad;
  const plateG = lathe([[0.001, 0.0], [0.09, 0.0], [0.126, 0.018], [0.13, 0.022], [0.126, 0.022], [0.09, 0.006], [0.001, 0.006]], rad), bowlG = lathe([[0.001, 0.0], [0.04, 0.0], [0.07, 0.014], [0.098, 0.075], [0.1, 0.085], [0.095, 0.085], [0.066, 0.025], [0.001, 0.01]], rad);
  const items = { plate: [], bowl: [] }, mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), k = { plate: 0.012, bowl: 0.03 };
  stacks.forEach(([kind, x, y, z, n0, s = 1, tint = 0], si) => {
    const n = T.seg === 0 ? Math.max(2, Math.ceil(n0 * 0.7)) : n0;   // low tier: fewer dishes per stack
    for (let i = 0; i < n; i++) { P.set(x, y + i * k[kind] * s, z); S.set(s, s, s); mtx.compose(P, q.identity(), S); items[kind].push({ m: mtx.clone(), c: TINTS[(tint + (kind === 'bowl' ? i % 2 : 0)) % TINTS.length] }); }
    const top = kind === 'plate' ? 0.022 : 0.085, r = (kind === 'plate' ? 0.13 : 0.1) * s;
    ctx.placements.push({ name: `${tag}_${kind}${si}`, box: new THREE.Box3(new THREE.Vector3(x - r, y, z - r), new THREE.Vector3(x + r, y + (n - 1) * k[kind] * s + top * s, z + r)), supportY: y });
  });
  for (const [kind, geo] of [['plate', plateG], ['bowl', bowlG]]) { const l = items[kind]; if (!l.length) { geo.dispose(); continue; } content.add(instanced(geo, m.ceramic, l.map((a) => a.m), l.map((a) => a.c), tag + '_' + kind)); }
}
