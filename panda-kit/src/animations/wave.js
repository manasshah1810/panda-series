import { startTimeline, rotBy, moveBy, expr, earFlop, EASE } from './_util.js';
import { gripPose } from '../poses/applyPose.js';
/** Friendly wave with a big paw and a small head tilt. options: { hand = 'L', waves = 4 } */
export function wave(panda, { hand = 'L', waves = 4 } = {}) {
  const tl = startTimeline(panda); const k = hand === 'L' ? 1 : -1; const S = 'shoulder' + hand, E = 'elbow' + hand;
  rotBy(tl, panda, S, { x: 0.12, z: k * 0.1 }, 0, 0.18, EASE.anticipate);                 // anticipation: arm dips back
  rotBy(tl, panda, S, { x: -0.25, z: k * 2.35 }, 0.18, 0.6, EASE.pop);                      // raise
  rotBy(tl, panda, E, { x: -0.45 }, 0.18, 0.6, EASE.body);
  gripPose(panda, hand, 'open', 0.3, tl, 0.18);
  rotBy(tl, panda, 'head', { z: k * 0.12, y: k * -0.05 }, 0.2, 0.6, EASE.body); expr(tl, panda, 'smile', 0.2, 0.4);
  let t = 0.8; for (let i = 0; i < waves; i++) { rotBy(tl, panda, E, { z: k * -0.4 * (i % 2 ? -1 : 1), x: -0.45 }, t, 0.24, 'sine.inOut'); t += 0.24; }
  rotBy(tl, panda, E, { z: 0, x: -0.45 }, t, 0.2, EASE.settle);
  t += 0.25;
  rotBy(tl, panda, S, { x: 0, z: 0 }, t, 0.8, EASE.heavy); rotBy(tl, panda, E, { x: 0, z: 0 }, t, 0.8, EASE.heavy); rotBy(tl, panda, 'head', { z: 0, y: 0 }, t, 0.7, EASE.settle);
  gripPose(panda, hand, 'relaxed', 0.4, tl, t); expr(tl, panda, 'calmSmirk', t, 0.7); earFlop(tl, panda, 0.9, 0.3, 0.9);
  return tl;
}
