import { startTimeline, rotBy, expr, EASE } from './_util.js';
import { gripPose } from '../poses/applyPose.js';
/** Eyes lead, then head, then the arm extends. options: { hand = 'L', hold = 1, yaw = 0.25 } */
export function point(panda, { hand = 'L', hold = 1.0, yaw = 0.25 } = {}) {
  const tl = startTimeline(panda); const k = hand === 'L' ? 1 : -1; const S = 'shoulder' + hand;
  tl.to(panda.face.state, { lookX: k * yaw * 2, duration: 0.2, ease: 'power2.out' }, 0);
  rotBy(tl, panda, 'head', { y: k * yaw }, 0.1, 0.5, EASE.body); expr(tl, panda, 'determined', 0.1, 0.3);
  rotBy(tl, panda, S, { x: 0.18 }, 0.25, 0.2, EASE.anticipate);                       // pull back
  rotBy(tl, panda, S, { x: -1.5, z: k * 0.05 }, 0.45, 0.5, EASE.pop); rotBy(tl, panda, 'elbow' + hand, { x: 0.3 }, 0.45, 0.5, EASE.body);
  gripPose(panda, hand, 'point', 0.35, tl, 0.45); rotBy(tl, panda, 'spine', { x: 0.06 }, 0.45, 0.5, EASE.body);
  const t = 0.95 + hold;
  rotBy(tl, panda, S, { x: 0, z: 0 }, t, 0.8, EASE.heavy); rotBy(tl, panda, 'elbow' + hand, { x: 0 }, t, 0.8, EASE.heavy); rotBy(tl, panda, 'head', { y: 0 }, t, 0.7, EASE.body); rotBy(tl, panda, 'spine', { x: 0 }, t, 0.7, EASE.body);
  gripPose(panda, hand, 'relaxed', 0.4, tl, t); expr(tl, panda, 'calmSmirk', t, 0.6); tl.to(panda.face.state, { lookX: 0, duration: 0.5 }, t);
  return tl;
}
