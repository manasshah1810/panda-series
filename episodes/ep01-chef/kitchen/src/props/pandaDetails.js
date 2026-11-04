import * as THREE from 'three';
import { lathe, tube } from './helpers.js';
/** Minute "lived-in" details: steamed momos with a dip bowl, a lucky-bamboo pot, chopsticks in a jar, tea cups, a chili string and garlic braid.
 *  Everything is static + merged per material; segment counts scale with the tier so the budgets hold. */
export function buildPandaDetails(ctx) {
  const { cfg, B, m, T } = ctx, zb = cfg.room.backWallZ, top = cfg.backCounter.topY, hi = T.rad >= 20, md = T.rad >= 14;
  const seg = hi ? 10 : md ? 8 : 6, hs = hi ? 6 : 4, cz = zb + 0.38;
  // ---- plate of steamed momos + chili dip (counter, right of the cooktop)
  const px = -1.0, pr = 0.14;
  B.add(m.ceramic, lathe([[0.001, 0], [0.07, 0], [pr, 0.016], [pr + 0.008, 0.022], [pr, 0.022], [0.07, 0.008], [0.001, 0.008]], seg + 4), { p: [px, top, cz] }, null, 'momos');
  const n = hi ? 6 : md ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const ring = i < n - 1, ang = (i / (n - 1)) * Math.PI * 2 + 0.4, x = px + (ring ? Math.cos(ang) * 0.068 : 0), z = cz + (ring ? Math.sin(ang) * 0.068 : 0);
    B.add(m.dough, new THREE.SphereGeometry(0.036, seg, hs), { p: [x, top + 0.046, z], s: [1, 0.7, 1] }, null, 'momos');
    if (hi) B.add(m.dough, new THREE.ConeGeometry(0.011, 0.026, 5), { p: [x, top + 0.082, z] }, null, 'momos');   // pleated knot on top
  }
  const dx = px + 0.2, dz = cz - 0.02;
  B.add(m.ceramicDark, lathe([[0.001, 0], [0.03, 0], [0.045, 0.03], [0.04, 0.03], [0.026, 0.006], [0.001, 0.006]], seg + 2), { p: [dx, top, dz] }, null, 'momos');
  B.add(m.lantern, new THREE.CylinderGeometry(0.034, 0.034, 0.004, seg + 2), { p: [dx, top + 0.022, dz] }, null, 'momos');                  // chili oil
  // ---- lucky-bamboo pot (three jointed stalks, a few leaf blades)
  const bx = 0.4, bz = zb + 0.3;
  B.add(m.clay, lathe([[0.001, 0], [0.05, 0], [0.065, 0.1], [0.07, 0.11], [0.06, 0.11], [0.05, 0.02], [0.001, 0.02]], seg + 4), { p: [bx, top, bz] }, null, 'luckyBamboo');
  B.add(m.woodDark, new THREE.CylinderGeometry(0.058, 0.058, 0.006, seg + 4), { p: [bx, top + 0.095, bz] }, null, 'luckyBamboo');            // soil
  [[-0.025, 0.0, 0.34, 0.03], [0.022, 0.012, 0.27, -0.06], [0.0, -0.025, 0.2, 0.1]].forEach(([ox, oz, h, tilt]) => {
    B.add(m.stalk3, new THREE.CylinderGeometry(0.009, 0.01, h, 5), { p: [bx + ox, top + 0.1 + h / 2, bz + oz], r: [0, 0, tilt] }, null, 'luckyBamboo');
    if (hi) for (const f of [0.4, 0.75]) B.add(m.stalk3, new THREE.CylinderGeometry(0.0125, 0.0125, 0.007, 5), { p: [bx + ox + tilt * h * f * -0.5, top + 0.1 + h * f, bz + oz] }, null, 'luckyBamboo');
    if (md) B.add(m.leaf, new THREE.ConeGeometry(0.012, 0.13, 4), { p: [bx + ox + 0.04, top + 0.1 + h - 0.02, bz + oz], r: [0, 0, -1.1], s: [1, 1, 0.3] }, null, 'luckyBamboo');
    if (md) B.add(m.leaf, new THREE.ConeGeometry(0.012, 0.12, 4), { p: [bx + ox - 0.04, top + 0.1 + h - 0.04, bz + oz], r: [0, 0, 1.1], s: [1, 1, 0.3] }, null, 'luckyBamboo');
  });
  // ---- chopstick jar
  const jx = 0.8, jz = zb + 0.28;
  B.add(m.ceramicDark, lathe([[0.001, 0], [0.04, 0], [0.047, 0.05], [0.045, 0.1], [0.038, 0.1], [0.036, 0.02], [0.001, 0.02]], seg + 2), { p: [jx, top, jz] }, null, 'chopsticks');
  for (let i = 0; i < (md ? 5 : 3); i++) B.add(m.bamboo, new THREE.CylinderGeometry(0.0035, 0.0028, 0.26, 4), { p: [jx + (i - 2) * 0.009, top + 0.2, jz + ((i % 2) - 0.5) * 0.01], r: [0.05 * (i - 2), 0, 0.07 * (2 - i)] }, null, 'chopsticks');
  if (md) {
  // ---- two tea cups and a bamboo trivet by the teapot
  const tx = -3.15;
  B.add(m.bamboo, new THREE.CylinderGeometry(0.1, 0.1, 0.008, seg + 4), { p: [tx, top + 0.004, zb + 0.38] }, null, 'tea');
  for (const [cx, cy] of [[-3.38, zb + 0.5], [-3.28, zb + 0.62]]) B.add(m.ceramic, lathe([[0.001, 0], [0.018, 0], [0.032, 0.045], [0.029, 0.045], [0.016, 0.006], [0.001, 0.006]], seg + 2), { p: [cx, top, cy] }, null, 'tea');
  // ---- dried chili string + garlic braid on the left wall
  const hx = -4.45, hz = zb + 0.06;
  B.add(m.woodDark, new THREE.CylinderGeometry(0.006, 0.006, 0.05, 5), { p: [hx, 3.5, hz], r: [Math.PI / 2, 0, 0] }, null, 'chili');
  B.add(m.twig, tube([[hx, 3.48, hz + 0.02], [hx + 0.01, 3.0, hz + 0.03], [hx - 0.01, 2.5, hz + 0.025]], 0.003, 6, 4), null, null, 'chili');
  const nc = hi ? 9 : 5;
  for (let i = 0; i < nc; i++) B.add(m.lantern, new THREE.ConeGeometry(0.016, 0.1, 5), { p: [hx + (i % 2 ? 0.022 : -0.022), 3.4 - i * (1.0 / nc), hz + 0.03], r: [Math.PI, 0, (i % 2 ? 0.5 : -0.5)] }, null, 'chili');
  const gx = hx + 0.35;
  B.add(m.twig, tube([[gx, 3.3, hz + 0.02], [gx, 2.7, hz + 0.03]], 0.003, 4, 4), null, null, 'chili');
  for (let i = 0; i < (hi ? 6 : 4); i++) B.add(m.dough, new THREE.SphereGeometry(0.04 - i * 0.002, Math.max(6, seg), hs), { p: [gx + (i % 2 ? 0.02 : -0.02), 3.2 - i * 0.09, hz + 0.045], s: [1, 0.85, 1] }, null, 'chili');
  }
  ctx.collide('momos', [px - pr, top, cz - pr, dx + 0.05, top + 0.08, cz + pr]); ctx.collide('luckyBamboo', [bx - 0.07, top, bz - 0.07, bx + 0.07, top + 0.5, bz + 0.07]);
}
