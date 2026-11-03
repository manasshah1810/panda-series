import { startTimeline, rotBy, moveBy, expr, cheekWobble, earFlop, EASE } from './_util.js';
/** Lean in, sniff, savour (eyes closed), eyes widen, satisfied nod. */
export function tasteTest(panda) {
  const tl = startTimeline(panda); const st = panda.face.state;
  rotBy(tl, panda, 'spine', { x: -0.04 }, 0, 0.2, EASE.anticipate);
  rotBy(tl, panda, 'spine', { x: 0.24 }, 0.2, 0.7, EASE.heavy); rotBy(tl, panda, 'head', { x: 0.14 }, 0.3, 0.6, EASE.body); moveBy(tl, panda, 'hips', { z: -0.03 }, 0.2, 0.7, EASE.heavy);
  expr(tl, panda, 'sniff', 0.4, 0.3);
  for (let i = 0; i < 3; i++) { tl.to(st, { noseWiggle: 1, duration: 0.1, ease: 'sine.inOut' }, 0.8 + i * 0.22).to(st, { noseWiggle: 0.35, duration: 0.1, ease: 'sine.inOut' }, 0.9 + i * 0.22); }
  tl.to(st, { noseWiggle: 0, duration: 0.2 }, 1.5);
  expr(tl, panda, 'tasteSavoring', 1.6, 0.45); rotBy(tl, panda, 'head', { z: 0.14, x: 0.06 }, 1.6, 1.0, 'sine.inOut'); rotBy(tl, panda, 'head', { z: -0.1 }, 2.6, 0.8, 'sine.inOut');
  cheekWobble(tl, panda, 2.1, 0.8, 1.2);
  expr(tl, panda, 'wideEyeWow', 3.5, 0.18, EASE.pop); earFlop(tl, panda, 3.5, 0.8, 1.0); rotBy(tl, panda, 'head', { z: 0, x: -0.08 }, 3.5, 0.3, EASE.pop);
  expr(tl, panda, 'proud', 3.9, 0.4);
  for (let i = 0; i < 2; i++) { rotBy(tl, panda, 'head', { x: 0.2 }, 4.1 + i * 0.5, 0.25, EASE.body); rotBy(tl, panda, 'head', { x: -0.02 }, 4.35 + i * 0.5, 0.25, EASE.settle); }
  rotBy(tl, panda, 'spine', { x: 0 }, 5.0, 0.9, EASE.heavy); rotBy(tl, panda, 'head', { x: 0, z: 0 }, 5.1, 0.8, EASE.heavy); moveBy(tl, panda, 'hips', { z: 0 }, 5.0, 0.9, EASE.heavy);
  expr(tl, panda, 'calmSmirk', 5.1, 0.8);
  return tl;
}
