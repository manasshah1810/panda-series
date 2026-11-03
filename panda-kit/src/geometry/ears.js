import * as THREE from 'three';
import { PROPORTIONS as P, PALETTE as C } from '../config/defaults.js';
import { part, mergeParts, M4, ratio } from './helpers.js';

/** Ear dish: ONE smooth ellipsoid whose front face is pressed in by a smooth vertex displacement; the dish interior is
 *  vertex-coloured slightly lighter charcoal. No second disc, so no stacked-disc look and no seam. */
function earGeo(e, seg, rad, s) {
  const g = new THREE.SphereGeometry(1, rad, seg); g.scale(e.radii[0], e.radii[1], e.radii[2]);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), dark = ratio(C.earInner, C.furBlack), ss = THREE.MathUtils.smoothstep;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const d = Math.hypot(x / (e.radii[0] * 0.66), y / (e.radii[1] * 0.66)), w = (1 - ss(d, 0.35, 1.0)) * ss(z / e.radii[2], 0.1, 0.6);
    pos.setZ(i, z - w * e.dish);
    const k = (1 - ss(d, 0.55, 1.05)) * ss(z / e.radii[2], 0.0, 0.5); col[i * 3] = 1 + (dark[0] - 1) * k; col[i * 3 + 1] = 1 + (dark[1] - 1) * k; col[i * 3 + 2] = 1 + (dark[2] - 1) * k;
  }
  g.computeVertexNormals(); return { geo: g, col };
}

/** One ear: pivot (face drives z) > flop (animation channel) > tilt (static rest tilt) > ONE mesh. Small round part: high segments on every tier. */
export function buildEar(side, tier, mats) {
  const s = side === 'L' ? 1 : -1, e = P.ear;
  const pivot = new THREE.Group(); pivot.name = 'ear' + side;
  pivot.position.copy(new THREE.Vector3(s * e.x * 0.92, e.y - 0.08, e.z).sub(new THREE.Vector3(...P.joints.head)));
  const flop = new THREE.Group(); flop.name = 'earFlop' + side; pivot.add(flop); pivot.userData.flop = flop;
  const tilt = new THREE.Group(); tilt.name = 'earTilt' + side; tilt.rotation.set(e.tiltX, 0, -s * e.tiltZ); flop.add(tilt);
  const { geo, col } = earGeo(e, 12, 20, s);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, mats.earOuter); mesh.position.set(s * 0.04, 0.09, 0);
  tilt.add(part(mesh, 'ear' + side));
  return pivot;
}
