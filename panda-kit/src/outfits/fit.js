import { PROPORTIONS as P } from '../config/defaults.js';
/** Torso radius (x half-width) at world height y, interpolated from the torso profile. */
export function torsoRadiusAt(y) {
  const pr = P.torso.profile; if (y <= pr[0][0]) return pr[0][1];
  for (let i = 1; i < pr.length; i++) if (y <= pr[i][0]) { const t = (y - pr[i - 1][0]) / (pr[i][0] - pr[i - 1][0]); return pr[i - 1][1] + (pr[i][1] - pr[i - 1][1]) * t; }
  return pr[pr.length - 1][1];
}
/** Ring that hugs the torso at world height y: {rx, rz, y}. `pad` pushes it outwards (metres). Use for scarves, belts, wraps. */
export function fitRing(y, pad = 0) { const r = torsoRadiusAt(y); return { rx: r + pad, rz: r * P.torso.zScale + pad, y }; }

/** Front surface z of the torso at (x, y) INCLUDING the belly bump (same maths as geometry/body.js); -Infinity outside the torso. */
export function torsoSurfaceZ(x, y) {
  const r = torsoRadiusAt(y), t = 1 - (x / r) ** 2; if (t <= 0) return -Infinity;
  const B = P.torso.belly, ss = (v, a, b) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const z = r * P.torso.zScale * Math.sqrt(t);
  return z + B.bump * Math.exp(-(((y - B.y) / B.sigma) ** 2)) * ss(z / Math.max(0.05, Math.hypot(x, z)), 0.15, 0.9) * (1 - ss(Math.abs(x), 0.3, 0.55));
}
