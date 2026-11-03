import * as THREE from 'three';
import { mat4 } from '../props/helpers.js';

/** Back wall, side walls, right wall with the window opening, ceiling with recessed light discs. */
export function buildRoom(ctx) {
  const { cfg, B, m } = ctx, R = cfg.room, W = cfg.window, t = R.wallThickness, h = R.ceilingY, zb = R.backWallZ, zf = R.frontZ, uv = { s: 0.35 };
  const box = (w, hh, d) => new THREE.BoxGeometry(w, hh, d);
  B.add(m.plaster, box(R.rightWallX - R.leftWallX + 2 * t, h, t), { p: [0, h / 2, zb - t / 2] }, uv);
  B.add(m.plaster, box(t, h, zf - zb), { p: [R.leftWallX - t / 2, h / 2, (zb + zf) / 2] }, uv);
  // right wall around the window
  const x = R.rightWallX + t / 2, z0 = W.centerZ - W.width / 2, z1 = W.centerZ + W.width / 2, y0 = W.sillY, y1 = W.sillY + W.height;
  const piece = (za, zb2, ya, yb) => B.add(m.plaster, box(t, yb - ya, zb2 - za), { p: [x, (ya + yb) / 2, (za + zb2) / 2] }, uv);
  piece(zb, z0, 0, h); piece(z1, zf, 0, h); piece(z0, z1, 0, y0); piece(z0, z1, y1, h);
  // ceiling
  B.add(m.plaster, box(R.rightWallX - R.leftWallX + 2 * t, t, zf - zb + t), { p: [0, h + t / 2, (zb + zf) / 2 - t / 2] }, uv);
  // recessed light discs (emissive)
  const disc = new THREE.CircleGeometry(0.17, ctx.T.rad);
  for (const [dx, dz] of [[-2.8, -0.6], [0, -0.6], [2.8, -0.6], [-2.8, 2.2], [0, 2.2], [2.8, 2.2]]) B.add(m.glow, disc, { p: [dx, h - 0.004, dz], r: [Math.PI / 2, 0, 0] });
  ctx.world.bounds = new THREE.Box3(new THREE.Vector3(R.leftWallX, 0, zb), new THREE.Vector3(R.rightWallX, h, zf));
}
