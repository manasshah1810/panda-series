import * as THREE from 'three';
import { rbox, lathe } from '../props/helpers.js';
/** Back counter: carcass, 12 honey-wood doors with brass bar handles, marble top with the sink cut-out, basin, 4-burner cooktop. */
export function buildBackCounter(ctx) {
  const { cfg, B, m, T, rng } = ctx, C = cfg.backCounter, zb = cfg.room.backWallZ, zf = C.frontZ, S = C.sink, K = C.cooktop, topY = C.topY, sl = C.slab, seg = T.seg;
  const L = C.x1 - C.x0, carcassFront = zf - 0.04;
  // carcass + toe kick
  B.add(m.woodDark, new THREE.BoxGeometry(L, topY - sl - C.toeKick, carcassFront - zb), { p: [(C.x0 + C.x1) / 2, C.toeKick + (topY - sl - C.toeKick) / 2, (zb + carcassFront) / 2] });
  B.add(m.woodDark, new THREE.BoxGeometry(L, C.toeKick, carcassFront - zb - 0.07), { p: [(C.x0 + C.x1) / 2, C.toeKick / 2, (zb + carcassFront - 0.07) / 2] });
  // doors
  const n = C.doors, dw = L / n, dh = topY - sl - C.toeKick - 0.012, dz = carcassFront + 0.014;
  for (let i = 0; i < n; i++) {
    const x = C.x0 + dw * (i + 0.5), y = C.toeKick + 0.006 + dh / 2;
    B.add(m.wood, rbox(dw - 0.012, dh, 0.028, 0.01, seg), { p: [x, y, dz] }, { s: 1, grain: 'y', o: [rng(), rng()], flip: rng() < 0.5 });
    const hy = C.toeKick + dh - 0.1, hz = dz + 0.014 + 0.022, hx = x + (i % 2 ? -1 : 1) * (dw / 2 - 0.07);
    B.add(m.brass, new THREE.CylinderGeometry(0.008, 0.008, 0.2, Math.min(8, T.rad)), { p: [hx, hy, hz], r: [0, 0, 0] });
    for (const dy of [-0.07, 0.07]) B.add(m.brass, new THREE.CylinderGeometry(0.0055, 0.0055, 0.024, 5), { p: [hx, hy + dy, hz - 0.012], r: [Math.PI / 2, 0, 0] });
  }
  // marble top with the sink cut-out
  const sx0 = S.x - S.w / 2, sx1 = S.x + S.w / 2, sz0 = zb + 0.12, sz1 = sz0 + S.d, uvm = () => ({ s: 1 / 2.2, o: [rng(), rng()], rot: Math.floor(rng() * 4), flip: rng() < 0.5 });
  const slab = (x0, x1, z0, z1) => B.add(m.marble, rbox(x1 - x0, sl, z1 - z0, 0.014, seg), { p: [(x0 + x1) / 2, topY - sl / 2, (z0 + z1) / 2] }, uvm());
  slab(C.x0, sx0, zb, zf); slab(sx1, C.x1, zb, zf); slab(sx0, sx1, zb, sz0); slab(sx0, sx1, sz1, zf);
  // basin (steel walls + floor + drain)
  const bh = topY - sl - S.floorY + sl, t = 0.01, bw = sx1 - sx0, bd = sz1 - sz0, by = S.floorY + bh / 2 - sl / 2;
  const steelUV = { s: 1.2, grain: 'x' };
  B.add(m.steel, new THREE.BoxGeometry(bw, t, bd), { p: [S.x, S.floorY, (sz0 + sz1) / 2] }, steelUV);
  B.add(m.steel, new THREE.BoxGeometry(bw, bh, t), { p: [S.x, by, sz0 + t / 2] }, steelUV); B.add(m.steel, new THREE.BoxGeometry(bw, bh, t), { p: [S.x, by, sz1 - t / 2] }, steelUV);
  B.add(m.steel, new THREE.BoxGeometry(t, bh, bd), { p: [sx0 + t / 2, by, (sz0 + sz1) / 2] }, steelUV); B.add(m.steel, new THREE.BoxGeometry(t, bh, bd), { p: [sx1 - t / 2, by, (sz0 + sz1) / 2] }, steelUV);
  B.add(m.ceramicDark, new THREE.CylinderGeometry(0.03, 0.03, 0.004, T.rad), { p: [S.x, S.floorY + 0.007, (sz0 + sz1) / 2] });
  ctx.world.basin = { x: S.x, y: S.floorY + 0.01, z: (sz0 + sz1) / 2, zTap: zb + 0.35 };
  // cooktop: dark glass plate, burners, low grates
  const kz = zb + 0.4 + 0.0 + 0.075, kz0 = kz - K.d / 2 + 0.0, plateY = topY + 0.006;
  const cz = (zb + zf) / 2 - 0.08 + 0.0, plateZ = zb + 0.4 + 0.0; // plate centre z
  const pz = zb + 0.42, py = topY + 0.006;
  B.add(m.glass, rbox(K.w, 0.012, K.d, 0.005, seg), { p: [K.x, py, pz] });
  const bpos = [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13]];
  for (const [dx, dz] of bpos) {
    B.add(m.steel, new THREE.CylinderGeometry(0.085, 0.085, 0.008, T.rad), { p: [K.x + dx, py + 0.01, pz + dz] }, { s: 1 });
    B.add(m.steel, new THREE.CylinderGeometry(0.058, 0.062, 0.016, T.rad), { p: [K.x + dx, py + 0.016, pz + dz] }, { s: 1 });
    B.add(m.glass, new THREE.CylinderGeometry(0.03, 0.03, 0.02, T.rad), { p: [K.x + dx, py + 0.02, pz + dz] });
  }
  const gy = py + 0.036;
  for (const dz of [-0.2, 0.0, 0.2]) B.add(m.steel, rbox(K.w - 0.04, 0.012, 0.016, 0.004, 1), { p: [K.x, gy, pz + dz] }, { s: 1, grain: 'x' });
  for (const dx of [-0.38, -0.2, 0.0, 0.2, 0.38]) B.add(m.steel, rbox(0.014, 0.012, 0.42, 0.004, 1), { p: [K.x + dx, gy, pz] }, { s: 1, grain: 'z' });
  for (const dx of [-0.38, 0.38]) for (const dz of [-0.2, 0.2]) B.add(m.steel, new THREE.CylinderGeometry(0.009, 0.009, 0.03, 8), { p: [K.x + dx, py + 0.021, pz + dz] });
  ctx.world.cooktop = { x: K.x, y: gy + 0.006, z: pz };
  ctx.collide('backCounter', [C.x0, 0, zb, C.x1, topY, zf]);
}
