import { startTimeline, rotBy, moveBy, expr, squashTo, bellyJiggle, earFlop, EASE } from './_util.js';
/** Quick back-lean, brows up, ears perk, belly jiggle, then a slow settle. */
export function surprise(panda, { hold = 0.9 } = {}) {
  const tl = startTimeline(panda);
  squashTo(tl, panda, 0.03, 0, 0.1, EASE.anticipate);                                   // anticipation: tiny squash
  squashTo(tl, panda, -0.02, 0.1, 0.12, EASE.settle);                                   // stretch on the launch
  rotBy(tl, panda, 'spine', { x: -0.2 }, 0.1, 0.16, 'power3.out'); rotBy(tl, panda, 'head', { x: -0.12 }, 0.1, 0.16, 'power3.out');
  moveBy(tl, panda, 'hips', { z: -0.05 }, 0.1, 0.16, 'power3.out');
  for (const s of ['L', 'R']) rotBy(tl, panda, 'shoulder' + s, { z: (s === 'L' ? 1 : -1) * 0.35, x: -0.2 }, 0.1, 0.2, EASE.pop);
  expr(tl, panda, 'surprised', 0.08, 0.12, 'power3.out'); squashTo(tl, panda, 0, 0.22, 0.4, EASE.settle);
  bellyJiggle(tl, panda, 0.25, 1.2, 1.3); earFlop(tl, panda, 0.25, 0.8, 1.0);
  const t = 0.5 + hold;
  rotBy(tl, panda, 'spine', { x: 0 }, t, 0.9, EASE.heavy); rotBy(tl, panda, 'head', { x: 0 }, t, 0.9, EASE.heavy); moveBy(tl, panda, 'hips', { z: 0 }, t, 0.9, EASE.heavy);
  for (const s of ['L', 'R']) { rotBy(tl, panda, 'shoulder' + s, { z: 0, x: 0 }, t, 0.9, EASE.heavy); }
  expr(tl, panda, 'calmSmirk', t, 0.8);
  return tl;
}
