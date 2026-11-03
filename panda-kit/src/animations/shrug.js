import { startTimeline, rotBy, moveBy, expr, EASE } from './_util.js';
export function shrug(panda, { hold = 0.7 } = {}) {
  const tl = startTimeline(panda);
  for (const s of ['L', 'R']) { const k = s === 'L' ? 1 : -1;
    moveBy(tl, panda, 'shoulder' + s, { y: -0.015 }, 0, 0.12, EASE.anticipate); moveBy(tl, panda, 'shoulder' + s, { y: 0.085 }, 0.12, 0.3, EASE.body); moveBy(tl, panda, 'shoulder' + s, { y: 0 }, 0.42 + hold, 0.5, EASE.settle);
    rotBy(tl, panda, 'shoulder' + s, { z: k * 0.35 }, 0.12, 0.35, EASE.body); rotBy(tl, panda, 'shoulder' + s, { z: 0 }, 0.47 + hold, 0.5, EASE.settle);
    rotBy(tl, panda, 'elbow' + s, { x: -0.7 }, 0.12, 0.35, EASE.body); rotBy(tl, panda, 'elbow' + s, { x: 0 }, 0.47 + hold, 0.5, EASE.settle); }
  rotBy(tl, panda, 'head', { z: 0.12, x: 0.03 }, 0.15, 0.35, EASE.body); rotBy(tl, panda, 'head', { z: 0, x: 0 }, 0.5 + hold, 0.5, EASE.settle);
  expr(tl, panda, 'smug', 0.15, 0.3); expr(tl, panda, 'calmSmirk', 0.5 + hold, 0.5);
  return tl;
}
