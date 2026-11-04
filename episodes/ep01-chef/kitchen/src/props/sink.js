import * as THREE from 'three';
import { tube } from './helpers.js';
/** Curved steel tap + lever (static) and a deterministic drip: a drop swells at the spout, falls, and ripples in the basin. */
export function buildTap(ctx, group) {
  const { cfg, B, m, T } = ctx, x = cfg.backCounter.sink.x, zb = cfg.room.backWallZ, y0 = cfg.backCounter.topY, tipY = 1.25, tipZ = zb + 0.35, basin = ctx.world.basin;
  const pts = [[x, y0, zb + 0.06], [x, 1.2, zb + 0.06], [x, 1.4, zb + 0.08], [x, 1.5, zb + 0.17], [x, 1.49, zb + 0.28], [x, 1.37, zb + 0.35], [x, tipY + 0.03, tipZ]];
  const U = { s: 1.5, grain: 'y' };
  B.add(m.steel, tube(pts, 0.022, 40, T.rad > 12 ? 10 : 8), null, U, 'tap'); B.add(m.steel, new THREE.CylinderGeometry(0.044, 0.05, 0.045, T.rad), { p: [x, y0 + 0.0225, zb + 0.06] }, U, 'tap'); B.add(m.steelDark, new THREE.CylinderGeometry(0.056, 0.058, 0.01, T.rad), { p: [x, y0 + 0.005, zb + 0.06] }, U, 'tap');
  B.add(m.steel, new THREE.CylinderGeometry(0.03, 0.023, 0.045, T.rad), { p: [x, tipY + 0.03, tipZ] }, U, 'tap'); B.add(m.steel, new THREE.CylinderGeometry(0.011, 0.011, 0.1, 8), { p: [x + 0.065, y0 + 0.075, zb + 0.06], r: [0, 0, -1.0] }, U, 'tap');
  ctx.placements.push({ name: 'tap', box: new THREE.Box3(new THREE.Vector3(x - 0.06, y0, zb), new THREE.Vector3(x + 0.12, 1.53, tipZ + 0.03)), supportY: y0 });
  group.position.set(x, tipY, tipZ); const drop = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), m.water), ring = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.018, 20), m.water);
  ring.rotation.x = -Math.PI / 2; ring.position.y = basin.y - tipY + 0.003; drop.castShadow = false; ring.castShadow = false; group.add(drop, ring);
  const fall = basin.y - tipY - 0.01, P = 1.8;
  ctx.anim.push((t) => { const p = ((t / P) % 1 + 1) % 1; drop.visible = p < 0.8; ring.visible = p >= 0.8;
    if (p < 0.55) { const s = p / 0.55, e = s * s * (3 - 2 * s); drop.scale.set(e, e * (1 + 0.25 * e), e); drop.position.y = -0.004 - 0.006 * e; }
    else if (p < 0.8) { const u = (p - 0.55) / 0.25; drop.scale.set(0.9, 1.5, 0.9); drop.position.y = -0.012 + fall * u * u; }
    else { const u = (p - 0.8) / 0.2; ring.scale.setScalar(0.4 + 2.6 * u); } });
}
