import { PROPORTIONS as P } from '../config/defaults.js';
/** Torso radius (x half-width) at world height y, interpolated from the torso profile. */
export function torsoRadiusAt(y) {
  const pr = P.torso.profile; if (y <= pr[0][0]) return pr[0][1];
  for (let i = 1; i < pr.length; i++) if (y <= pr[i][0]) { const t = (y - pr[i - 1][0]) / (pr[i][0] - pr[i - 1][0]); return pr[i - 1][1] + (pr[i][1] - pr[i - 1][1]) * t; }
  return pr[pr.length - 1][1];
}
/** Ring that hugs the torso at world height y: {rx, rz, y}. `pad` pushes it outwards (metres). Use for scarves, belts, aprons. */
export function fitRing(y, pad = 0) { const r = torsoRadiusAt(y); return { rx: r + pad, rz: r * P.torso.zScale + pad, y }; }
