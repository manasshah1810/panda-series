import * as THREE from 'three';
import { rbox } from '../props/helpers.js';
/** Brushed-steel trapezoid hood (flat-shaded frustum) + rounded lip + chimney + emissive underside plate. */
export function buildHood(ctx) {
  const { cfg, B, m, T } = ctx, H = cfg.backCounter.hood, zb = cfg.room.backWallZ, ceil = cfg.room.ceilingY;
  const P = (x, y, z) => new THREE.Vector3(x, y, z), bx = H.bottomW / 2, tx = H.topW / 2;
  const b = [P(H.x - bx, H.bottomY, zb), P(H.x + bx, H.bottomY, zb), P(H.x + bx, H.bottomY, zb + H.bottomD), P(H.x - bx, H.bottomY, zb + H.bottomD)];
  const t = [P(H.x - tx, H.topY, zb), P(H.x + tx, H.topY, zb), P(H.x + tx, H.topY, zb + H.topD), P(H.x - tx, H.topY, zb + H.topD)];
  const centre = P(H.x, (H.bottomY + H.topY) / 2, zb + H.bottomD / 3), pos = [];
  const tri = (a, c, d) => { const n = new THREE.Vector3().crossVectors(c.clone().sub(a), d.clone().sub(a)), mid = a.clone().add(c).add(d).multiplyScalar(1 / 3).sub(centre); if (n.dot(mid) < 0) [c, d] = [d, c]; pos.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z); };
  const quad = (a, c, d, e) => { tri(a, c, d); tri(a, d, e); };
  quad(b[3], b[2], t[2], t[3]); quad(b[2], b[1], t[1], t[2]); quad(b[0], b[3], t[3], t[0]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  B.add(m.steel, g, null, { s: 1, grain: 'x' });
  B.add(m.steel, rbox(H.bottomW + 0.03, 0.06, H.bottomD + 0.02, 0.022, T.seg), { p: [H.x, H.bottomY + 0.03, zb + (H.bottomD + 0.02) / 2 - 0.0] }, { s: 1, grain: 'x' });
  B.add(m.steel, rbox(H.topW, ceil - H.topY, H.topD, 0.015, T.seg), { p: [H.x, (H.topY + ceil) / 2, zb + H.topD / 2] }, { s: 1, grain: 'y' });
  B.add(m.glow, new THREE.PlaneGeometry(H.bottomW - 0.12, H.bottomD - 0.1), { p: [H.x, H.bottomY - 0.0015, zb + H.bottomD / 2], r: [Math.PI / 2, 0, 0] });
  ctx.collide('hood', [H.x - bx, H.bottomY, zb, H.x + bx, ceil, zb + H.bottomD]);
}
