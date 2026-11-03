import * as THREE from 'three';
import { PROPORTIONS as P, PALETTE as C } from '../config/defaults.js';
import { part, ellipsoidGeo, mergeParts, M4, ratio } from './helpers.js';

/** One ear: pivot (face drives z) > flop (animation channel) > tilt (static rest tilt) > ONE merged mesh (puck + inner dish). */
export function buildEar(side, tier, mats) {
  const s = side === 'L' ? 1 : -1, e = P.ear;
  const pivot = new THREE.Group(); pivot.name = 'ear' + side;
  pivot.position.copy(new THREE.Vector3(s * e.x * 0.92, e.y - 0.08, e.z).sub(new THREE.Vector3(...P.joints.head)));
  const flop = new THREE.Group(); flop.name = 'earFlop' + side; pivot.add(flop); pivot.userData.flop = flop;
  const tilt = new THREE.Group(); tilt.name = 'earTilt' + side; tilt.rotation.set(e.tiltX, 0, -s * e.tiltZ); flop.add(tilt);
  const mesh = mergeParts([
    { geo: ellipsoidGeo(e.radii, Math.max(8, tier.small), Math.max(12, tier.small + 6)), matrix: M4([s * 0.04, 0.09, 0]) },
    { geo: ellipsoidGeo(e.inner, Math.max(6, tier.small), Math.max(10, tier.small + 4)), matrix: M4([s * 0.04, 0.09, 0.088]), color: ratio(C.earInner, C.furBlack) },
  ], mats.earOuter, 'ear');
  tilt.add(part(mesh, 'ear' + side));
  return pivot;
}
