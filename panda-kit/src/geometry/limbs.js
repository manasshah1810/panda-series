import * as THREE from 'three';
import { PROPORTIONS as P, PALETTE as C } from '../config/defaults.js';
import { part, ellipsoidGeo, mergeParts, M4, ratio, ellipsoid } from './helpers.js';

/** Upper arm / forearm: capsules whose end-cap centres sit exactly on the joint pivots (one smooth tube, no gaps when bent). */
function tube(r, len, tier, mat, name) {
  const m = part(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, tier.small + 6), mat), name);
  m.position.y = -len / 2; return m;
}
export function buildArmSegments(side, tier, mats) {
  const a = P.arm;
  return { upper: tube(a.upperR, a.upperLen, tier, mats.limb, 'upperArm' + side), fore: tube(a.foreR, a.foreLen, tier, mats.limb, 'foreArm' + side) };
}

/** Mitten paw. Body + palm pad + 3 toe beans = ONE mesh (pads are vertex-colour charcoal). The thumb is its own pivot
 *  (grip poses curl it). On the lite tier the thumb has no mesh. */
export function buildPaw(side, tier, mats) {
  const s = side === 'L' ? 1 : -1, r = P.arm.pawR, padC = ratio(C.pawPads, C.furBlack);
  const g = new THREE.Group(); g.name = 'pawMesh' + side;
  const parts = [{ geo: ellipsoidGeo([r, r * 1.05, r * 0.9], tier.small + 2, tier.small + 6) }];
  if (!tier.lite) {
    parts.push({ geo: ellipsoidGeo([r * 0.45, r * 0.35, r * 0.12], 6, 10), matrix: M4([0, -r * 0.1, r * 0.8]), color: padC });
    for (let i = -1; i <= 1; i++) parts.push({ geo: ellipsoidGeo([r * 0.17, r * 0.15, r * 0.09], 5, 8), matrix: M4([i * r * 0.42, r * 0.5, r * 0.72 - Math.abs(i) * r * 0.1]), color: padC });
  }
  g.add(part(mergeParts(parts, mats.limb, 'pawBody'), 'paw' + side));
  const thumbPivot = new THREE.Group(); thumbPivot.name = 'thumb' + side; thumbPivot.position.set(-s * r * 0.62, 0, r * 0.3); g.add(thumbPivot);
  if (!tier.lite) {
    const thumb = part(ellipsoid([r * 0.38, r * 0.5, r * 0.34], tier.small - 2, tier.small + 2, mats.limb, 'thumb'), 'thumb' + side);
    thumb.position.set(-s * r * 0.1, r * 0.1, r * 0.05); thumb.rotation.z = s * 0.4; thumbPivot.add(thumb);
  }
  return { group: g, thumb: thumbPivot };
}

export function buildLeg(side, tier, mats) {
  const l = P.leg; const leg = tube(l.radius, l.len, tier, mats.limb, 'leg' + side); leg.position.y = -l.len / 2 - 0.02; return { leg };
}

/** Foot: ellipsoid + sole + 3 toe beans merged into ONE mesh. */
export function buildFoot(side, tier, mats) {
  const l = P.leg, padC = ratio(C.pawPads, C.furBlack);
  const parts = [{ geo: ellipsoidGeo(l.footRadii, tier.small + 2, tier.small + 6) }];
  if (!tier.lite) {
    parts.push({ geo: ellipsoidGeo([0.1, 0.03, 0.12], 6, 8), matrix: M4([0, -l.footRadii[1] * 0.82, -0.02]), color: padC });
    for (let i = -1; i <= 1; i++) parts.push({ geo: ellipsoidGeo([0.045, 0.02, 0.05], 5, 6), matrix: M4([i * 0.075, -l.footRadii[1] * 0.78, l.footRadii[2] * 0.62 - Math.abs(i) * 0.02]), color: padC });
  }
  return part(mergeParts(parts, mats.limb, 'footMesh'), 'foot' + side);
}
