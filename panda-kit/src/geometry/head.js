import { PROPORTIONS as P, PALETTE as C } from '../config/defaults.js';
import { part, ellipsoidGeo, mergeParts, M4, ratio } from './helpers.js';

const rel = (c, o) => [c[0] - o[0], c[1] - o[1], c[2] - o[2]];

/** Head shell + muzzle merged into ONE mesh (muzzle = vertex-colour cream). */
export function buildHeadShell(tier, mats) {
  const parts = [
    { geo: ellipsoidGeo(P.head.radii, Math.max(tier.seg, 14), Math.max(tier.rad, 24)), matrix: M4(rel(P.head.center, P.joints.head)) },
    { geo: ellipsoidGeo(P.muzzle.radii, tier.small + 6, tier.small + 10), matrix: M4(rel(P.muzzle.center, P.joints.head)), color: ratio(C.furCreamBelly, C.furWhite) },
  ];
  // cheek tufts: two soft wedges per side that break the perfect egg outline (big one low and back, small one above)
  for (const s of [1, -1]) for (const [c, r, rz] of tier.lite ? P.tufts.slice(0, 1) : P.tufts) parts.push({ geo: ellipsoidGeo(r, tier.lite ? 5 : 7, tier.lite ? 8 : 10), matrix: M4(rel([s * c[0], c[1], c[2]], P.joints.head), [0, s * 0.35, s * rz]) });
  return part(mergeParts(parts, mats.head, 'head'), 'head');
}
