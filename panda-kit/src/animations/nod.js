import { startTimeline, rotBy, expr, EASE } from './_util.js';
/** Nod with anticipation (a tiny lift before each dip). */
export function nod(panda, { count = 2, amp = 1 } = {}) {
  const tl = startTimeline(panda); let t = 0;
  for (let i = 0; i < count; i++) { rotBy(tl, panda, 'head', { x: -0.07 * amp }, t, 0.14, EASE.anticipate); rotBy(tl, panda, 'head', { x: 0.24 * amp }, t + 0.14, 0.26, EASE.body); rotBy(tl, panda, 'head', { x: 0 }, t + 0.4, 0.34, EASE.settle); rotBy(tl, panda, 'spine', { x: 0.03 * amp }, t + 0.14, 0.3, EASE.body); rotBy(tl, panda, 'spine', { x: 0 }, t + 0.44, 0.34, EASE.settle); t += 0.72; }
  return tl;
}
