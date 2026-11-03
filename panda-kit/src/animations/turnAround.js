import gsap from 'gsap';
import { startTimeline, rotBy, moveBy, squashTo, bellyJiggle, earFlop, EASE } from './_util.js';
/** Heavy turn with anticipation, head leading, belly counter-swing and a foot-pivot step. options: { degrees = 180, duration = 2 } */
export function turnAround(panda, { degrees = 180, duration = 2.0, direction = 1 } = {}) {
  const tl = startTimeline(panda); const base = panda.root.rotation.y, a = (degrees * Math.PI) / 180 * direction;
  const yaw = (v) => ({ y: base + v });
  tl.set(panda.root.rotation, { y: base }, 0);                                         // root is not part of the generic reset
  squashTo(tl, panda, 0.04, 0, 0.3, EASE.anticipate);                                  // anticipation: sink into the legs
  tl.to(panda.root.rotation, { ...yaw(-0.14 * direction), duration: 0.3, ease: EASE.anticipate }, 0);
  rotBy(tl, panda, 'head', { y: 0.55 * direction }, 0.15, 0.45, EASE.body);              // head leads
  tl.to(panda.root.rotation, { ...yaw(a), duration: duration * 0.7, ease: EASE.heavy }, 0.3);
  squashTo(tl, panda, -0.01, 0.35, 0.4, EASE.body);
  rotBy(tl, panda, 'head', { y: 0 }, 0.5, duration * 0.6, EASE.body);
  rotBy(tl, panda, 'belly', { y: -0.28 * direction }, 0.35, 0.5, EASE.body); rotBy(tl, panda, 'belly', { y: 0 }, 0.9, 1.0, EASE.softJiggle);
  rotBy(tl, panda, 'hipL', { x: -0.35 }, 0.35, 0.4, EASE.body); rotBy(tl, panda, 'hipL', { x: 0 }, 0.75, 0.4, EASE.settle);
  rotBy(tl, panda, 'hipR', { x: -0.28 }, 0.8, 0.4, EASE.body); rotBy(tl, panda, 'hipR', { x: 0 }, 1.2, 0.4, EASE.settle);
  for (const s of ['L', 'R']) { rotBy(tl, panda, 'shoulder' + s, { z: (s === 'L' ? 1 : -1) * 0.22 }, 0.4, 0.6, EASE.body); rotBy(tl, panda, 'shoulder' + s, { z: 0 }, 1.1, 0.9, EASE.settle); }
  const end = 0.3 + duration * 0.7;
  squashTo(tl, panda, 0.03, end - 0.05, 0.12, EASE.anticipate); squashTo(tl, panda, 0, end + 0.07, 0.6, EASE.jiggle);   // settle
  rotBy(tl, panda, 'spine', { x: 0.04 }, end - 0.05, 0.12, EASE.body); rotBy(tl, panda, 'spine', { x: 0 }, end + 0.07, 0.6, EASE.settle);
  bellyJiggle(tl, panda, end, 1, 1.2); earFlop(tl, panda, end, 0.7, 1.2); rotBy(tl, panda, 'tail', { y: 0.5 * direction }, 0.3, 0.6, EASE.body); rotBy(tl, panda, 'tail', { y: 0 }, end, 1.0, EASE.softJiggle);
  return tl;
}
