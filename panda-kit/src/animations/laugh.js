import { startTimeline, rotBy, moveBy, expr, bellyJiggle, earFlop, cheekWobble, EASE } from './_util.js';
/** Head tips back, eyes squeezed, shoulders bounce, belly jiggles. options: { bounces = 8 } */
export function laugh(panda, { bounces = 8 } = {}) {
  const tl = startTimeline(panda); const T = 0.3, per = 0.22;
  expr(tl, panda, 'laugh', 0, 0.2); rotBy(tl, panda, 'head', { x: -0.32 }, 0, 0.35, EASE.pop); rotBy(tl, panda, 'spine', { x: -0.1 }, 0, 0.35, EASE.body);
  for (const s of ['L', 'R']) rotBy(tl, panda, 'shoulder' + s, { z: (s === 'L' ? 1 : -1) * 0.15 }, 0, 0.35, EASE.body);
  for (let i = 0; i < bounces; i++) {
    const t = T + i * per, d = 1 - i / (bounces + 2);
    for (const s of ['L', 'R']) { moveBy(tl, panda, 'shoulder' + s, { y: 0.04 * d }, t, per / 2, 'sine.out'); moveBy(tl, panda, 'shoulder' + s, { y: 0 }, t + per / 2, per / 2, 'sine.in'); }
    moveBy(tl, panda, 'hips', { y: 0.012 * d }, t, per / 2, 'sine.out'); moveBy(tl, panda, 'hips', { y: 0 }, t + per / 2, per / 2, 'sine.in');
    rotBy(tl, panda, 'head', { x: -0.32 + 0.05 * (i % 2 ? 1 : -1) * d }, t, per, 'sine.inOut');
    if (i % 2 === 0) bellyJiggle(tl, panda, t, 0.8 * d, per * 2 - 0.01); // never overlaps the next jiggle
  }
  const end = T + bounces * per;
  cheekWobble(tl, panda, T, 1, 1.0); earFlop(tl, panda, T + 0.1, 0.6, 1.2);
  rotBy(tl, panda, 'head', { x: 0 }, end, 0.8, EASE.heavy); rotBy(tl, panda, 'spine', { x: 0 }, end, 0.8, EASE.heavy);
  for (const s of ['L', 'R']) rotBy(tl, panda, 'shoulder' + s, { z: 0 }, end, 0.8, EASE.heavy);
  expr(tl, panda, 'smile', end, 0.4); expr(tl, panda, 'calmSmirk', end + 0.6, 0.8);
  return tl;
}
