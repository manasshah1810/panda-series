import { startTimeline } from './_util.js';
export function addBlink(tl, panda, t, speed = 1) {
  const c = panda.face.channels;
  tl.to(c, { blink: 1, duration: 0.07 / speed, ease: 'power2.in' }, t).to(c, { blink: 0, duration: 0.13 / speed, ease: 'power2.out' }, t + 0.08 / speed);
  return tl;
}
/** Blink(s). options: { count = 1, gap = 0.28 } (count 2 = double-take blink) */
export function blink(panda, { count = 1, gap = 0.28, speed = 1 } = {}) { const tl = startTimeline(panda); for (let i = 0; i < count; i++) addBlink(tl, panda, i * gap, speed); return tl; }
