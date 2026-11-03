import * as THREE from 'three';
import { PROPORTIONS as P, PALETTE as C } from '../config/defaults.js';
import { part, ellipsoidGeo, mergeParts, M4, ratio } from './helpers.js';

/** Tapered tube with round end caps, joint at y=0 (radius r0) and the far joint at y=-len (radius r1). The caps are
 *  hemispheres centred ON the joints, so a bent joint never opens a gap. `bulge` adds a soft belly to the middle. */
export function taperedTube(len, r0, r1, tier, bulge = 0) {
  const q = Math.max(3, Math.round(tier.small * 0.4)), m = Math.max(3, Math.round(tier.small * 0.5)), pts = [];
  for (let k = 0; k <= q; k++) { const a = -Math.PI / 2 + (k / q) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0, r1 * Math.cos(a)), -len + r1 * Math.sin(a))); }
  for (let k = 1; k < m; k++) { const t = k / m; pts.push(new THREE.Vector2(r1 + (r0 - r1) * t + bulge * Math.sin(Math.PI * t), -len * (1 - t))); }
  for (let k = 0; k <= q; k++) { const a = (k / q) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0, r0 * Math.cos(a)), r0 * Math.sin(a))); }
  const g = new THREE.LatheGeometry(pts, tier.lite ? 10 : tier.small + 8); g.computeVertexNormals(); return g;
}

/** Upper arm = shoulder mass (soft ellipsoid at the pivot) + tapered tube. Forearm tapers to a narrow wrist. Joints at pivots. */
export function buildArmSegments(side, tier, mats) {
  const a = P.arm, s = P.shoulder;
  const upper = mergeParts([{ geo: taperedTube(a.upperLen, a.upperR, a.elbowR, tier, 0.008) }, { geo: ellipsoidGeo(s.r, tier.small + 4, tier.small + 10), matrix: M4([0, 0.01, 0]) }], mats.limb, 'upperArm' + side);
  const fore = mergeParts([{ geo: taperedTube(a.foreLen, a.elbowR, a.wristR, tier, 0.006) }], mats.limb, 'foreArm' + side);
  return { upper: part(upper, 'upperArm' + side), fore: part(fore, 'foreArm' + side) };
}

/** Mitten paw. Body + palm pad + 3 toe beans = ONE mesh (pads are vertex-colour charcoal). The thumb is its own pivot
 *  (grip poses curl it). On the lite tier the thumb has no mesh. Small round parts keep high segment counts on every tier. */
export function buildPaw(side, tier, mats) {
  const s = side === 'L' ? 1 : -1, r = P.arm.pawR, padC = ratio(C.pawPads, C.furBlack), sm = Math.max(7, tier.small + 2);
  const g = new THREE.Group(); g.name = 'pawMesh' + side;
  const parts = [{ geo: ellipsoidGeo([r, r * 1.05, r * 0.9], sm, sm + 6) }];
  if (!tier.lite) {
    parts.push({ geo: ellipsoidGeo([r * 0.45, r * 0.35, r * 0.12], 6, 10), matrix: M4([0, -r * 0.1, r * 0.8]), color: padC });
    for (let i = -1; i <= 1; i++) parts.push({ geo: ellipsoidGeo([r * 0.17, r * 0.15, r * 0.09], 5, 8), matrix: M4([i * r * 0.42, r * 0.5, r * 0.72 - Math.abs(i) * r * 0.1]), color: padC });
  }
  g.add(part(mergeParts(parts, mats.limb, 'pawBody'), 'paw' + side));
  const thumbPivot = new THREE.Group(); thumbPivot.name = 'thumb' + side; thumbPivot.position.set(-s * r * 0.62, 0, r * 0.3); g.add(thumbPivot);
  if (!tier.lite) {
    const thumb = part(new THREE.Mesh(ellipsoidGeo([r * 0.38, r * 0.5, r * 0.34], 7, 10), mats.limb), 'thumb' + side);
    thumb.position.set(-s * r * 0.1, r * 0.1, r * 0.05); thumb.rotation.z = s * 0.4; thumbPivot.add(thumb);
  }
  return { group: g, thumb: thumbPivot };
}

/** Leg: thick hip mass tapering to the ankle, with a slightly puffy ankle where the foot meets it. Hip joint at y=0. */
export function buildLeg(side, tier, mats) {
  const l = P.leg;
  const leg = mergeParts([{ geo: taperedTube(l.len, l.hipR, l.ankleR, tier, 0.004) }, { geo: ellipsoidGeo([l.ankleR + 0.025, 0.1, l.ankleR + 0.025], 8, 14), matrix: M4([0, -l.len + 0.03, 0]) }], mats.limb, 'leg' + side);
  return { leg: part(leg, 'leg' + side) };
}

/** Foot: ellipsoid + sole + 3 toe beans merged into ONE mesh. */
export function buildFoot(side, tier, mats) {
  const l = P.leg, padC = ratio(C.pawPads, C.furBlack), sm = Math.max(7, tier.small + 2);
  const parts = [{ geo: ellipsoidGeo(l.footRadii, sm, sm + 6) }];
  if (!tier.lite) {
    parts.push({ geo: ellipsoidGeo([0.1, 0.03, 0.12], 6, 8), matrix: M4([0, -l.footRadii[1] * 0.82, -0.02]), color: padC });
    for (let i = -1; i <= 1; i++) parts.push({ geo: ellipsoidGeo([0.045, 0.02, 0.05], 5, 6), matrix: M4([i * 0.075, -l.footRadii[1] * 0.78, l.footRadii[2] * 0.62 - Math.abs(i) * 0.02]), color: padC });
  }
  return part(mergeParts(parts, mats.limb, 'footMesh'), 'foot' + side);
}
