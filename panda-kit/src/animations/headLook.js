import { startTimeline, rotBy, EASE } from './_util.js';
import { lookAngles } from '../rig/constraints.js';
/** Eyes lead, head follows, shoulders last. target: THREE.Vector3 (world) | {yaw, pitch} radians. */
export function headLook(panda, { target, duration = 1.0, hold = 0.5, recentre = true } = {}) {
  const tl = startTimeline(panda); const a = target && target.isVector3 ? (({ x, y }) => ({ yaw: y, pitch: x }))(lookAngles(panda, target)) : { yaw: target?.yaw ?? 0.6, pitch: target?.pitch ?? 0 };
  const lx = Math.max(-1, Math.min(1, (a.yaw * 1.15) / 0.436)), ly = Math.max(-1, Math.min(1, (-a.pitch * 1.15) / 0.436));
  const st = panda.face.state;
  tl.to(st, { lookX: lx, lookY: ly, duration: 0.18, ease: 'power2.out' }, 0);
  rotBy(tl, panda, 'head', { y: a.yaw, x: a.pitch }, 0.12, duration, EASE.body);
  rotBy(tl, panda, 'chest', { y: a.yaw * 0.25 }, 0.3, duration, EASE.heavy);
  tl.to(st, { lookX: lx * 0.3, lookY: ly * 0.3, duration: duration * 0.7, ease: 'power2.inOut' }, 0.5);
  if (recentre) { const t = duration + 0.12 + hold; rotBy(tl, panda, 'head', { y: 0, x: 0 }, t, duration, EASE.body); rotBy(tl, panda, 'chest', { y: 0 }, t + 0.1, duration, EASE.heavy); tl.to(st, { lookX: 0, lookY: 0, duration: 0.4 }, t); }
  return tl;
}
