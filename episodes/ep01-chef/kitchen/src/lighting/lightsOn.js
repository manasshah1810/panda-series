/** Deterministic lights-on curve: 0 = pitch dark, quick double flicker around t 0.33..0.5, then a warm ramp to 1 at t = 1. Pure function of t. */
const KEYS = [[0, 0], [0.3, 0], [0.33, 0.55], [0.37, 0.6], [0.39, 0.03], [0.42, 0.03], [0.44, 0.8], [0.47, 0.85], [0.49, 0.06], [0.52, 0.1], [1, 1]];
export function lightsCurve(t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < KEYS.length; i++) {
    if (t <= KEYS[i][0]) {
      const [t0, v0] = KEYS[i - 1], [t1, v1] = KEYS[i]; let u = (t - t0) / (t1 - t0 || 1);
      if (i === KEYS.length - 1) u = u * u * (3 - 2 * u);           // warm ease-in ramp
      return v0 + (v1 - v0) * u;
    }
  }
  return 1;
}
