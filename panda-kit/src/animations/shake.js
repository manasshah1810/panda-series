import { startTimeline, rotBy, earFlop, EASE } from './_util.js';
/** Head shake "no". */
export function shake(panda, { count = 3, amp = 1 } = {}) {
  const tl = startTimeline(panda); let t = 0;
  rotBy(tl, panda, 'head', { y: 0.08 * amp }, 0, 0.12, EASE.anticipate); t = 0.12;
  for (let i = 0; i < count; i++) { rotBy(tl, panda, 'head', { y: -0.34 * amp * (i % 2 ? -1 : 1) * -1 * (i % 2 ? 1 : -1), z: 0.04 * (i % 2 ? 1 : -1) }, t, 0.2, EASE.body); t += 0.2; }
  rotBy(tl, panda, 'head', { y: 0, z: 0 }, t, 0.4, EASE.settle); earFlop(tl, panda, 0.5, 0.4, 0.9);
  return tl;
}
