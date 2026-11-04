import * as THREE from 'three';
import { rbox, mat4 } from '../props/helpers.js';
/** Open wooden shelves with under-shelf glow strips, the brass rail with brackets, the tall wooden unit on the right. */
export function buildShelving(ctx) {
  const { cfg, B, m, T, rng } = ctx, S = cfg.shelves, zb = cfg.room.backWallZ, seg = T.seg, w = S.x1 - S.x0, rail = cfg.rail, U = cfg.tallUnit;
  for (const y of S.levels) {
    B.add(m.wood, rbox(w, S.thick, S.depth, 0.01, seg), { p: [(S.x0 + S.x1) / 2, y, zb + S.depth / 2] }, { s: 1, grain: 'x', o: [rng(), rng()] }, 'shelf' + y);
    B.add(m.glow, new THREE.BoxGeometry(w - 0.12, 0.006, 0.014), { p: [(S.x0 + S.x1) / 2, y - S.thick / 2 - 0.003, zb + S.depth - 0.05] });
    ctx.collide('shelf' + y, [S.x0, y - S.thick / 2, zb, S.x1, y + S.thick / 2, zb + S.depth]);
  }
  // brass rail + wall brackets
  const rl = rail.x1 - rail.x0;
  B.add(m.brass, new THREE.CylinderGeometry(rail.radius, rail.radius, rl, Math.min(12, T.rad)), { p: [(rail.x0 + rail.x1) / 2, rail.y, rail.z], r: [0, 0, Math.PI / 2] });
  for (const x of [rail.x0, -1.7, 0, 1.7, rail.x1]) {
    B.add(m.brass, new THREE.CylinderGeometry(0.008, 0.008, rail.z - zb, Math.min(8, T.rad)), { p: [x, rail.y, (rail.z + zb) / 2], r: [Math.PI / 2, 0, 0] });
    B.add(m.brass, new THREE.CylinderGeometry(0.022, 0.022, 0.01, Math.min(12, T.rad)), { p: [x, rail.y, zb + 0.005], r: [Math.PI / 2, 0, 0] });
  }
  B.add(m.brass, new THREE.SphereGeometry(rail.radius * 1.5, Math.min(10, T.rad), Math.min(8, T.rad)), { p: [rail.x0 - 0.0, rail.y, rail.z] }); B.add(m.brass, new THREE.SphereGeometry(rail.radius * 1.5, Math.min(10, T.rad), Math.min(8, T.rad)), { p: [rail.x1, rail.y, rail.z] });
  // tall unit
  const uw = U.x1 - U.x0, uh = U.height, uz = zb + U.depth / 2;
  B.add(m.woodDark, new THREE.BoxGeometry(uw, uh, U.depth - 0.03), { p: [(U.x0 + U.x1) / 2, uh / 2, zb + (U.depth - 0.03) / 2] });
  for (const [y0, y1] of [[0.05, 1.6], [1.62, uh - 0.03]]) {
    B.add(m.wood, rbox(uw - 0.02, y1 - y0, 0.03, 0.01, seg), { p: [(U.x0 + U.x1) / 2, (y0 + y1) / 2, zb + U.depth - 0.015] }, { s: 1, grain: 'y', o: [rng(), rng()] });
    B.add(m.brass, new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8), { p: [U.x0 + 0.07, (y0 + y1) / 2 + (y1 - y0) * 0.0, zb + U.depth + 0.02] });
  }
  ctx.collide('tallUnit', [U.x0, 0, zb, U.x1, uh, zb + U.depth]);
  ctx.collide('rail', [rail.x0, rail.y - 0.02, rail.z - 0.02, rail.x1, rail.y + 0.02, rail.z + 0.02]);
}
