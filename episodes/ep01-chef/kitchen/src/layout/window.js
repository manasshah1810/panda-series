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
  B.add(m.sky, new THREE.PlaneGeometry(W.width, W.height), { p: [R.rightWallX + 0.04, yc, zc], r: [0, -Math.PI / 2, 0] });
  ctx.collide('windowSill', [R.rightWallX - 0.26, y0 - 0.04, zc - W.width / 2 - 0.05, R.rightWallX, y0, zc + W.width / 2 + 0.05]);
}
