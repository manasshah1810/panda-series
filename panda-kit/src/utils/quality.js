import { TIERS } from '../config/defaults.js';
export const tierNames = Object.keys(TIERS);
/** Pick a sensible default tier from the device. Pure heuristic; always overridable. */
export function guessTier(nav = typeof navigator !== 'undefined' ? navigator : {}) {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(nav.userAgent || ''); const cores = nav.hardwareConcurrency || 4;
  if (mobile) return cores >= 8 ? 'medium' : 'low'; return cores >= 6 ? 'high' : 'medium';
}
