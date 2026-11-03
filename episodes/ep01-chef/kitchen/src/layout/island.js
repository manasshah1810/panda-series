import * as THREE from 'three';
import { rbox } from '../props/helpers.js';
/** Island: marble top, honey-wood body, open 3-bay shelf toward the Panda (-Z face), grooved closed panelling toward the camera (+Z). */
export function buildIsland(ctx) {
  const { cfg, B, m, T, rng } = ctx, I = cfg.island, seg = T.seg, ov = I.overhang, topY = I.topY, w = I.x1 - I.x0, yb = I.kick, yt = topY - I.slab, cd = I.cavityDepth;
  const wood = (g, p, grain, mat = m.wood) => B.add(mat, g, { p }, { s: 1, grain, o: [rng(), rng()], flip: rng() < 0.5 });
  B.add(m.marble, rbox(w + 2 * ov, I.slab, I.z1 - I.z0 + 2 * ov, 0.02, seg), { p: [(I.x0 + I.x1) / 2, topY - I.slab / 2, (I.z0 + I.z1) / 2] }, { s: 1 / 2.4, o: [rng(), rng()], rot: 0 }, 'islandTop');
  // body behind the cavity (solid) + grooved front panel
  const zc = I.z0 + cd, panelT = 0.03;
  wood(new THREE.BoxGeometry(w, yt - yb, I.z1 - panelT - zc), [(I.x0 + I.x1) / 2, (yb + yt) / 2, (zc + I.z1 - panelT) / 2], 'y');
  wood(rbox(w, yt - yb, panelT, 0.008, seg), [(I.x0 + I.x1) / 2, (yb + yt) / 2, I.z1 - panelT / 2], 'y');
  const gw = 0.16; for (let x = I.x0 + gw; x < I.x1 - 0.05; x += gw) B.add(m.woodDark, new THREE.BoxGeometry(0.007, yt - yb - 0.08, 0.003), { p: [x, (yb + yt) / 2, I.z1 + 0.0015] });
  // open cavity: dark back panel, bottom, 2 dividers, middle shelf, side cheeks, toe kick
  const sideT = 0.06, ix0 = I.x0 + sideT, ix1 = I.x1 - sideT, iw = ix1 - ix0, mid = 0.5;
  B.add(m.woodDark, new THREE.BoxGeometry(iw, yt - yb - 0.06, 0.01), { p: [(ix0 + ix1) / 2, (yb + yt) / 2, zc + 0.005] });
  wood(rbox(sideT, yt - yb, cd, 0.008, seg), [I.x0 + sideT / 2, (yb + yt) / 2, I.z0 + cd / 2], 'z');
  wood(rbox(sideT, yt - yb, cd, 0.008, seg), [I.x1 - sideT / 2, (yb + yt) / 2, I.z0 + cd / 2], 'z');
  wood(rbox(w, 0.04, cd + 0.02, 0.008, seg), [(I.x0 + I.x1) / 2, yb + 0.02, I.z0 + cd / 2 - 0.01], 'x');
  wood(rbox(iw, 0.03, cd, 0.008, seg), [(ix0 + ix1) / 2, mid - 0.015 + 0.0, I.z0 + cd / 2], 'x');
  const bays = 3, bw = iw / bays; ctx.world.bays = [];
  for (let b = 0; b < bays; b++) {
    ctx.world.bays.push({ x0: ix0 + b * bw + 0.015, x1: ix0 + (b + 1) * bw - 0.015, cx: ix0 + (b + 0.5) * bw, lowY: yb + 0.04, midY: mid, z: I.z0 + cd / 2 + 0.02 });
    if (b > 0) wood(rbox(0.03, yt - yb - 0.04, cd - 0.02, 0.006, seg), [ix0 + b * bw, (yb + yt) / 2 + 0.02, I.z0 + cd / 2 - 0.01], 'y');
  }
  B.add(m.woodDark, new THREE.BoxGeometry(w - 0.1, yb, I.z1 - I.z0 - 0.12), { p: [(I.x0 + I.x1) / 2, yb / 2, (I.z0 + I.z1) / 2] });
  ctx.collide('island', [I.x0 - ov, 0, I.z0 - ov, I.x1 + ov, topY, I.z1 + ov]);
}
