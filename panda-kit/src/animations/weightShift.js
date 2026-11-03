import { startTimeline, rotBy, moveBy, EASE } from './_util.js';
/** Slow transfer of weight foot-to-foot with a tiny hip tilt. One full L->R->centre pass = `dur` seconds. */
export function addWeightShift(tl, panda, t0 = 0, dur = 7.2, amp = 1) {
  const q = dur / 4;
  const seq = [[1, 0], [0, 1], [-1, 2], [0, 3]];
  for (const [side, i] of seq) {
    const t = t0 + i * q;
    moveBy(tl, panda, 'hips', { x: 0.045 * side * amp }, t, q, EASE.heavy);
    rotBy(tl, panda, 'hips', { z: -0.03 * side * amp }, t, q, EASE.heavy);
    rotBy(tl, panda, 'spine', { z: 0.02 * side * amp }, t, q, EASE.heavy);
    rotBy(tl, panda, 'head', { z: 0.025 * side * amp }, t, q, EASE.heavy);
    // unloaded leg lifts a hair
    rotBy(tl, panda, 'hipL', { x: side < 0 ? -0.06 * amp : 0 }, t, q, EASE.heavy); rotBy(tl, panda, 'hipR', { x: side > 0 ? -0.06 * amp : 0 }, t, q, EASE.heavy);
  }
  return tl;
}
export function weightShift(panda, { loop = true, duration = 7.2, amp = 1 } = {}) { return addWeightShift(startTimeline(panda, { loop }), panda, 0, duration, amp); }
