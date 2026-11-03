import * as THREE from 'three';
import { rbox, boxUV, Batch } from './helpers.js';
/** Thick end-grain honey-wood board with a soft juice groove. Group origin = bottom centre (sits on the island top). Exposes a wobble hook. */
export function buildCuttingBoard(ctx, group) {
  const { cfg, m, T } = ctx, c = cfg.cuttingBoard.center;   // config size = [x length, z depth, y thickness]
  const X = cfg.cuttingBoard.size[0], Z = cfg.cuttingBoard.size[1], Y = cfg.cuttingBoard.size[2];
  group.position.set(c[0], c[1], c[2]);
  const body = rbox(X, Y, Z, 0.03, Math.max(2, T.seg)); boxUV(body, { s: 1 / 0.8, o: [0.13, 0.31] });
  const mesh = new THREE.Mesh(body, m.woodEnd); mesh.position.y = Y / 2; mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'boardBody'; group.add(mesh);
  const B = new Batch(), gy = Y + 0.0008, gi = 0.075, gw = 0.009;
  B.add(m.woodDark, new THREE.BoxGeometry(X - 2 * gi, 0.0016, gw), { p: [0, gy, -(Z / 2 - gi)] }); B.add(m.woodDark, new THREE.BoxGeometry(X - 2 * gi, 0.0016, gw), { p: [0, gy, Z / 2 - gi] });
  B.add(m.woodDark, new THREE.BoxGeometry(gw, 0.0016, Z - 2 * gi), { p: [-(X / 2 - gi), gy, 0] }); B.add(m.woodDark, new THREE.BoxGeometry(gw, 0.0016, Z - 2 * gi), { p: [X / 2 - gi, gy, 0] });
  B.build(group);
  const base = group.position.clone();
  /** wobble(t, amp): t seconds since the knife hit (t<0 = rest). Damped oscillation about the board centre; pure function of t. */
  group.userData.wobble = (t, amp = 0.02) => { const a = t < 0 ? 0 : amp * Math.sin(t * 52) * Math.exp(-t * 6.5); group.rotation.set(a * 0.6, 0, a); group.position.y = base.y + (t < 0 ? 0 : Math.abs(a) * 0.15); };
  ctx.placements.push({ name: 'cuttingBoard', box: new THREE.Box3(new THREE.Vector3(c[0] - X / 2, c[1], c[2] - Z / 2), new THREE.Vector3(c[0] + X / 2, c[1] + Y, c[2] + Z / 2)), supportY: cfg.island.topY });
}
