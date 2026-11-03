import { PROPORTIONS as P } from '../config/defaults.js';
import { part, ellipsoidGeo, mergeParts, M4 } from './helpers.js';
/** Soft neck / jowl mass under the head: bridges head and torso so the head rests INTO the shoulders. Hangs under the `neck` pivot. */
export function buildNeck(tier, mats) {
  const n = P.neck, o = P.joints.neck;
  const m = mergeParts([{ geo: ellipsoidGeo(n.radii, tier.small + 6, tier.small + 14), matrix: M4([n.center[0] - o[0], n.center[1] - o[1], n.center[2] - o[2]]) }], mats.head, 'neck');
  return part(m, 'neck');
}
