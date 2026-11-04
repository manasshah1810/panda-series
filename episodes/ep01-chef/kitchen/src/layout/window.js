import * as THREE from 'three';
import { rbox } from '../props/helpers.js';
/** Window frame, mullions, wooden sill and the bright "sky" pane (a basic emissive plane that follows lights-on). */
export function buildWindow(ctx) {
  const { cfg, B, m, T } = ctx, R = cfg.room, W = cfg.window, f = W.frame, x = R.rightWallX - 0.02, zc = W.centerZ, yc = W.sillY + W.height / 2, y0 = W.sillY, y1 = W.sillY + W.height;
  const bar = (sz, p) => B.add(m.frame, rbox(...sz, 0.012, T.seg), { p });
  bar([0.08, f, W.width], [x, y0 + f / 2, zc]); bar([0.08, f, W.width], [x, y1 - f / 2, zc]);
  bar([0.08, W.height, f], [x, yc, zc - W.width / 2 + f / 2]); bar([0.08, W.height, f], [x, yc, zc + W.width / 2 - f / 2]);
  bar([0.06, W.height, 0.04], [x, yc, zc]); bar([0.06, 0.04, W.width], [x, yc + 0.2, zc]);
  B.add(m.wood, rbox(0.26, 0.04, W.width + 0.1, 0.012, T.seg), { p: [R.rightWallX - 0.13 + 0.02, y0 - 0.02 + 0.0, zc] }, { s: 1, grain: 'z' }, 'sill');
  B.add(m.sky, new THREE.PlaneGeometry(W.width * 1.6, W.height * 1.6), { p: [R.rightWallX + 0.6, yc, zc], r: [0, -Math.PI / 2, 0] });
  // bamboo grove outside: tall stalks with node rings and leaf blades, in front of the sky pane (unlit; follows the lights-on glow so it is dark at t=0)
  { const rad = Math.max(5, Math.min(10, T.rad)), stalks = [[0.25, 0.050, 0.0], [0.8, 0.045, 0.4], [1.3, 0.055, -0.3], [1.85, 0.045, 0.2]].slice(0, T.rad >= 14 ? 4 : 3);
    stalks.forEach(([dz, r, lean], i) => {
      const sx = R.rightWallX + 0.16 + (i % 2) * 0.12, sz = zc - W.width / 2 + dz, h = W.height + 0.7, y = y0 - 0.2;
      B.add(m.stalk, new THREE.CylinderGeometry(r, r * 1.08, h, rad), { p: [sx, y + h / 2, sz], r: [lean * 0.04, 0, 0] });
      for (let k = 1; k < 5 && T.rad >= 20; k++) B.add(m.stalk, new THREE.CylinderGeometry(r * 1.3, r * 1.3, 0.018, rad), { p: [sx, y + (h * k) / 5, sz] });
      for (let k = 0; k < 3 && T.rad >= 20; k++) { const ly = y + h * (0.45 + 0.13 * k), sd = (k + i) % 2 ? 1 : -1;
        B.add(m.stalk, new THREE.ConeGeometry(0.03, 0.4, 4), { p: [sx - 0.05, ly, sz + sd * 0.18], r: [sd * 1.2, 0, 0.3], s: [1, 1, 0.25] }); }
    }); }
  ctx.collide('windowSill', [R.rightWallX - 0.26, y0 - 0.04, zc - W.width / 2 - 0.05, R.rightWallX, y0, zc + W.width / 2 + 0.05]);
}
