import { startTimeline, rotBy, earFlop, EASE } from './_util.js';
import { addBreathe } from './breathe.js'; import { addWeightShift } from './weightShift.js'; import { addBlink } from './blink.js';
/** Calm, heavy idle: breathe + weight shift + tail sway + blinks + a rare ear twitch. 7.2 s seamless loop. */
export function idle(panda, { loop = true, amp = 1 } = {}) {
  const tl = startTimeline(panda, { loop }); const D = 7.2;
  addBreathe(tl, panda, 0, 2, 3.6, amp); addWeightShift(tl, panda, 0, D, amp);
  rotBy(tl, panda, 'tail', { y: 0.22 * amp }, 0, 1.8, 'sine.inOut'); rotBy(tl, panda, 'tail', { y: -0.22 * amp }, 1.8, 3.6, 'sine.inOut'); rotBy(tl, panda, 'tail', { y: 0 }, 5.4, 1.8, 'sine.inOut');
  rotBy(tl, panda, 'head', { y: 0.05 * amp }, 1.0, 2.0, 'sine.inOut'); rotBy(tl, panda, 'head', { y: -0.04 * amp }, 3.0, 2.4, 'sine.inOut'); rotBy(tl, panda, 'head', { y: 0 }, 5.4, 1.8, 'sine.inOut');
  addBlink(tl, panda, 2.4); addBlink(tl, panda, 5.7); earFlop(tl, panda, 4.3, 0.35, 0.9);
  return tl;
}
