import { PROPORTIONS as P, PALETTE as C } from '../config/defaults.js';
import { part, ellipsoidGeo, mergeParts, M4, ratio } from './helpers.js';

const rel = (c, o) => [c[0] - o[0], c[1] - o[1], c[2] - o[2]];

/** Head shell + muzzle merged into ONE mesh (muzzle = vertex-colour cream). */
export function buildHeadShell(tier, mats) {
  const parts = [
    { geo: ellipsoidGeo(P.head.radii, tier.seg, tier.rad), matrix: M4(rel(P.head.center, P.joints.head)) },
    { geo: ellipsoidGeo(P.muzzle.radii, tier.small + 6, tier.small + 10), matrix: M4(rel(P.muzzle.center, P.joints.head)), color: ratio(C.furCreamBelly, C.furWhite) },
  ];
  return part(mergeParts(parts, mats.head, 'head'), 'head');
}
