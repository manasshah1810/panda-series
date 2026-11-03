import { startTimeline, rotBy, moveBy, EASE } from './_util.js';
/** Lean the torso (feet planted). options: { amount = 0.3, hold = 0.8, direction: 'forward'|'back' } */
export function lean(panda, { amount = 0.3, hold = 0.8, direction = 'forward' } = {}) {
  const tl = startTimeline(panda); const a = direction === 'back' ? -amount : amount;
  rotBy(tl, panda, 'spine', { x: -a * 0.12 }, 0, 0.2, EASE.anticipate); // anticipation
  rotBy(tl, panda, 'spine', { x: a }, 0.2, 0.7, EASE.heavy); rotBy(tl, panda, 'head', { x: -a * 0.55 }, 0.25, 0.7, EASE.heavy);
  moveBy(tl, panda, 'hips', { z: -a * 0.12 }, 0.2, 0.7, EASE.heavy);
  for (const s of ['L', 'R']) { rotBy(tl, panda, 'shoulder' + s, { x: -a * 0.5 }, 0.3, 0.7, EASE.body); rotBy(tl, panda, 'shoulder' + s, { x: 0 }, 0.9 + hold, 0.8, EASE.settle); }
  const t = 0.9 + hold;
  rotBy(tl, panda, 'spine', { x: 0 }, t, 0.8, EASE.heavy); rotBy(tl, panda, 'head', { x: 0 }, t, 0.8, EASE.heavy); moveBy(tl, panda, 'hips', { z: 0 }, t, 0.8, EASE.heavy);
  return tl;
}
