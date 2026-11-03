import { PROPORTIONS as P } from '../config/defaults.js';
import { part, ellipsoid } from './helpers.js';
export function buildTail(tier, mats) {
  const r = P.tail.radius;
  return part(ellipsoid([r, r, r * 0.95], tier.small + 4, tier.small + 8, mats.tail, 'tail'), 'tailMesh');
}
