import * as THREE from 'three';
import { lathe, tube } from './helpers.js';
/** "Panda's home" dressing: bamboo steamer stack and cast-iron wok on the cooktop, clay teapot, a basket of bamboo shoots, hanging red paper lanterns.
 *  All static (merged per material), tier-scaled via T.rad, no overlap with the Panda's clear zone. */
export function buildPandaHome(ctx) {
  const { cfg, B, m, T } = ctx, rad = T.rad >= 20 ? 22 : T.rad >= 14 ? 10 : 6, zb = cfg.room.backWallZ, topY = cfg.backCounter.topY, K = cfg.backCounter.cooktop, ceil = cfg.room.ceilingY;
  const pz = zb + 0.42, gy = topY + 0.006 + 0.006 + 0.048;                                         // top of the grate bars
  // ---- bamboo steamer: three baskets + lid on the front-left burner
  const sx = K.x - 0.2, sz = pz + 0.13, R = 0.155, bh = 0.075;
  const basket = lathe([[0.001, 0], [R - 0.01, 0], [R, 0.006], [R, bh], [R - 0.014, bh], [R - 0.014, 0.012], [0.001, 0.012]], rad);
  for (let i = 0; i < 3; i++) {
    B.add(m.bamboo, basket, { p: [sx, gy + i * bh, sz] }, null, 'steamer');
    if (T.rad >= 20) B.add(m.woodDark, new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.012, rad), { p: [sx, gy + i * bh + 0.02, sz] }, null, 'steamer');
    B.add(m.woodDark, new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.012, rad), { p: [sx, gy + i * bh + bh - 0.014, sz] }, null, 'steamer');
  }
  B.add(m.bamboo, lathe([[0.001, 0.05], [0.04, 0.056], [R * 0.7, 0.032], [R + 0.012, 0.0], [R + 0.012, -0.012], [0.001, -0.012]], rad), { p: [sx, gy + 3 * bh + 0.012, sz] }, null, 'steamer');
  B.add(m.woodDark, new THREE.SphereGeometry(0.022, 8, 6), { p: [sx, gy + 3 * bh + 0.066, sz] }, null, 'steamer');
  // ---- cast-iron wok on the front-right burner
  const wx = K.x + 0.2, wz = pz + 0.13, wr = 0.19, wy = gy + 0.02, prof = [];
  const wn = T.rad >= 20 ? 8 : 4;
  for (let i = 0; i <= wn; i++) { const a = (i / wn) * 1.05, r = Math.sin(a) * 0.26, y = (1 - Math.cos(a)) * 0.26; prof.push([Math.max(0.001, r), y]); }
  for (let i = wn; i >= 0; i--) { const a = (i / wn) * 1.05, r = Math.sin(a) * 0.255 - 0.006, y = (1 - Math.cos(a)) * 0.255 + 0.006; prof.push([Math.max(0.001, r), y]); }
  B.add(m.iron, lathe(prof, rad), { p: [wx, wy, wz] }, null, 'wok');
  B.add(m.iron, new THREE.CylinderGeometry(0.014, 0.012, 0.28, 8), { p: [wx + 0.34, wy + 0.16, wz], r: [0, 0, -(Math.PI / 2 - 0.35)] }, null, 'wok');
  B.add(m.wood, new THREE.CylinderGeometry(0.017, 0.015, 0.16, 8), { p: [wx + 0.49, wy + 0.2, wz], r: [0, 0, -(Math.PI / 2 - 0.35)] }, null, 'wok');
  ctx.collide('steamer', [sx - R, gy, sz - R, sx + R, gy + 3 * bh + 0.07, sz + R]); ctx.collide('wok', [wx - 0.27, wy, wz - 0.27, wx + 0.66, wy + 0.27, wz + 0.27]);
  // ---- clay teapot (left end of the counter) with a bamboo-handled lid knob
  const tx = -3.15, tz = zb + 0.38, tp = [[0.001, 0], [0.06, 0], [0.095, 0.045], [0.1, 0.1], [0.08, 0.15], [0.05, 0.175], [0.045, 0.19], [0.04, 0.186], [0.04, 0.17], [0.001, 0.17]];
  B.add(m.clay, lathe(tp, rad), { p: [tx, topY, tz] }, null, 'teapot');
  B.add(m.clay, tube([[tx + 0.09, topY + 0.07, tz], [tx + 0.17, topY + 0.12, tz], [tx + 0.19, topY + 0.2, tz]], 0.014, 10, 6), null, null, 'teapot');
  B.add(m.bamboo, new THREE.TorusGeometry(0.06, 0.009, 6, Math.max(10, rad)), { p: [tx - 0.075, topY + 0.115, tz], r: [0, Math.PI / 2, 0] }, null, 'teapot');
  B.add(m.woodDark, new THREE.SphereGeometry(0.016, 8, 6), { p: [tx, topY + 0.205, tz] }, null, 'teapot');
  // ---- basket of fresh bamboo shoots
  const bx = -2.72, bz = zb + 0.4, br = 0.12;
  B.add(m.bamboo, lathe([[0.001, 0], [br - 0.03, 0], [br, 0.15], [br - 0.01, 0.15], [br - 0.04, 0.02], [0.001, 0.02]], rad), { p: [bx, topY, bz] }, null, 'basket');
  for (const [dx, dz, h, tilt] of [[-0.03, 0.0, 0.26, 0.08], [0.035, 0.02, 0.2, -0.12], [0.0, -0.035, 0.17, 0.2]]) B.add(m.ceramic, new THREE.ConeGeometry(0.036, h, 8), { p: [bx + dx, topY + 0.11 + h / 2 * 0.9, bz + dz], r: [tilt, 0, -tilt] }, null, 'basket');
  ctx.collide('teapot', [tx - 0.1, topY, tz - 0.1, tx + 0.2, topY + 0.21, tz + 0.1]); ctx.collide('basket', [bx - br, topY, bz - br, bx + br, topY + 0.38, bz + br]);
  // ---- red paper lanterns on cords from the ceiling
  for (const [lx, ly, lz, s] of [[-3.35, 3.55, -1.05, 1], [-2.85, 3.95, -0.85, 0.8]]) {
    B.add(m.woodDark, new THREE.CylinderGeometry(0.004, 0.004, ceil - ly, 5), { p: [lx, (ceil + ly) / 2, lz] });
    B.add(m.lantern, new THREE.SphereGeometry(0.15 * s, rad, Math.max(5, rad >> 1)), { p: [lx, ly, lz], s: [1, 0.82, 1] }, null, 'lantern');
    for (const dy of [-1, 1]) B.add(m.brass, new THREE.CylinderGeometry(0.06 * s, 0.07 * s, 0.03, rad), { p: [lx, ly + dy * 0.124 * s, lz] });
    if (T.rad >= 20) B.add(m.lantern, new THREE.ConeGeometry(0.02, 0.14, 6), { p: [lx, ly - 0.215 * s, lz], r: [Math.PI, 0, 0] });
    if (T.rad >= 20) B.add(m.brass, new THREE.TorusGeometry(0.15 * s, 0.003, 3, rad), { p: [lx, ly, lz], r: [Math.PI / 2, 0, 0] });
  }
}
