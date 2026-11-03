import { startTimeline, rotBy, moveBy, squashTo, EASE } from './_util.js';
/** Heavy waddle without travelling. options: { steps = 4, stepDur = 0.7, loop }. Even `steps` ends at rest. */
export function walkInPlace(panda, { steps = 4, stepDur = 0.7, loop = false } = {}) {
  const tl = startTimeline(panda, { loop }); const h = stepDur / 2;
  for (let i = 0; i < steps; i++) {
    const t = i * stepDur, s = i % 2 ? -1 : 1, lift = s > 0 ? 'hipL' : 'hipR', plant = s > 0 ? 'hipR' : 'hipL';
    moveBy(tl, panda, 'hips', { x: 0.06 * s, y: 0.025 }, t, h, 'sine.out'); moveBy(tl, panda, 'hips', { x: 0.06 * s, y: 0 }, t + h, h, 'sine.in');
    rotBy(tl, panda, 'hips', { z: -0.07 * s }, t, stepDur, 'sine.inOut'); rotBy(tl, panda, 'spine', { z: 0.05 * s, y: 0.04 * s }, t, stepDur, 'sine.inOut'); rotBy(tl, panda, 'head', { z: 0.04 * s }, t, stepDur, 'sine.inOut');
    rotBy(tl, panda, lift, { x: -0.55 }, t, h, 'sine.out'); rotBy(tl, panda, lift, { x: 0 }, t + h, h, 'sine.in'); rotBy(tl, panda, plant, { x: 0.12 }, t, stepDur, 'sine.inOut');
    rotBy(tl, panda, 'shoulderL', { x: -0.25 * s }, t, stepDur, 'sine.inOut'); rotBy(tl, panda, 'shoulderR', { x: 0.25 * s }, t, stepDur, 'sine.inOut');
    rotBy(tl, panda, 'tail', { y: 0.3 * s }, t, stepDur, 'sine.inOut');
  }
  const e = steps * stepDur; const s = steps % 2 ? -1 : 1; void s;
  moveBy(tl, panda, 'hips', { x: 0, y: 0 }, e, 0.35, EASE.settle); rotBy(tl, panda, 'hips', { z: 0 }, e, 0.35, EASE.settle); rotBy(tl, panda, 'spine', { z: 0, y: 0 }, e, 0.35, EASE.settle); rotBy(tl, panda, 'head', { z: 0 }, e, 0.35, EASE.settle);
  for (const k of ['hipL', 'hipR', 'shoulderL', 'shoulderR']) rotBy(tl, panda, k, { x: 0 }, e, 0.35, EASE.settle); rotBy(tl, panda, 'tail', { y: 0 }, e, 0.35, EASE.settle);
  return tl;
}
