import { startTimeline, rotBy, moveBy, scaleTo, EASE, restOf } from './_util.js';
/** Add `cycles` breaths starting at t0. Slow chest + belly rise, shoulders lift. Ends exactly at rest. */
export function addBreathe(tl, panda, t0 = 0, cycles = 2, cycle = 3.6, amp = 1) {
  const half = cycle / 2, bs = restOf(panda, 'belly').s;
  for (let i = 0; i < cycles; i++) {
    const t = t0 + i * cycle;
    moveBy(tl, panda, 'chest', { y: 0.012 * amp }, t, half, EASE.breathe); moveBy(tl, panda, 'chest', { y: 0 }, t + half, half, EASE.breathe);
    scaleTo(tl, panda, 'belly', { x: bs[0] * (1 + 0.02 * amp), y: bs[1] * (1 + 0.035 * amp), z: bs[2] * (1 + 0.03 * amp) }, t, half, EASE.breathe);
    scaleTo(tl, panda, 'belly', { x: bs[0], y: bs[1], z: bs[2] }, t + half, half, EASE.breathe);
    for (const s of ['L', 'R']) { moveBy(tl, panda, 'shoulder' + s, { y: 0.008 * amp }, t, half, EASE.breathe); moveBy(tl, panda, 'shoulder' + s, { y: 0 }, t + half, half, EASE.breathe); }
    rotBy(tl, panda, 'spine', { x: -0.012 * amp }, t, half, EASE.breathe); rotBy(tl, panda, 'spine', { x: 0 }, t + half, half, EASE.breathe);
  }
  return tl;
}
/** Slow breathing loop. options: { loop = true, cycles = 2, cycle = 3.6, amp = 1 } */
export function breathe(panda, { loop = true, cycles = 2, cycle = 3.6, amp = 1 } = {}) { return addBreathe(startTimeline(panda, { loop }), panda, 0, cycles, cycle, amp); }
