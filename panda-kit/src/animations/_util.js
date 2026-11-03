import gsap from 'gsap';
import { resolve } from '../face/expressions.js';
import { EASE } from '../utils/easing.js';
import { squashScale } from '../rig/constraints.js';

export { EASE };
const REST_FACE = 'calmSmirk';

/** Start a paused, deterministic timeline. Every rig pivot + the face are SET to their rest values at t=0, so the same
 *  progress always gives the same pose whatever came before (scrub-safe). opts: { loop, reset:false } */
export function startTimeline(panda, { loop = false, reset = true } = {}) {
  const tl = gsap.timeline({ paused: true, repeat: loop ? -1 : 0, onUpdate: () => panda.face.apply() });
  tl.userData = { panda };
  if (reset) {
    for (const [k, v] of Object.entries(panda.restSnapshot)) {
      if (k === 'root') continue; const g = panda.rig[k]; if (!g) continue;
      tl.set(g.rotation, { x: v.r[0], y: v.r[1], z: v.r[2] }, 0).set(g.position, { x: v.p[0], y: v.p[1], z: v.p[2] }, 0).set(g.scale, { x: v.s[0], y: v.s[1], z: v.s[2] }, 0);
    }
    const b = panda.options.scale;
    tl.set(panda.root.scale, { x: b, y: b, z: b }, 0);
    tl.set(panda.face.state, { ...resolve(REST_FACE) }, 0).set(panda.face.channels, { blink: 0, talk: 0, lookX: 0, lookY: 0, saccX: 0, saccY: 0 }, 0);
  }
  panda.face.apply(); // set()s render immediately; re-derive face-driven transforms (brows, ears...) from the reset state
  return tl;
}
export const restOf = (panda, name) => panda.restSnapshot[name];

/** Rotate pivot BY a delta from its rest rotation (axes given). */
export function rotBy(tl, panda, name, d, t, dur = 0.5, ease = EASE.body) {
  const r = restOf(panda, name).r, v = {};
  if (d.x !== undefined) v.x = r[0] + d.x; if (d.y !== undefined) v.y = r[1] + d.y; if (d.z !== undefined) v.z = r[2] + d.z;
  return tl.to(panda.rig[name].rotation, { ...v, duration: dur, ease }, t);
}
export function moveBy(tl, panda, name, d, t, dur = 0.5, ease = EASE.body) {
  const p = restOf(panda, name).p, v = {};
  if (d.x !== undefined) v.x = p[0] + d.x; if (d.y !== undefined) v.y = p[1] + d.y; if (d.z !== undefined) v.z = p[2] + d.z;
  return tl.to(panda.rig[name].position, { ...v, duration: dur, ease }, t);
}
export const scaleTo = (tl, panda, name, s, t, dur = 0.4, ease = EASE.body) => tl.to(panda.rig[name].scale, { ...s, duration: dur, ease }, t);
/** Expression tween (inside the timeline). Gaze (lookX/lookY) is NOT touched so look tweens never overlap it. */
export function expr(tl, panda, name, t, dur = 0.35, ease = EASE.body) { const { lookX, lookY, ...rest } = resolve(name); return tl.to(panda.face.state, { ...rest, duration: dur, ease }, t); }
/** Volume-preserving squash tween on the root. */
export function squashTo(tl, panda, a, t, dur = 0.25, ease = EASE.settle) { return tl.to(panda.root.scale, { ...squashScale(a, panda.options.scale), duration: dur, ease }, t); }

/** Elastic secondary motion, built from FROM-TO tweens (deterministic). */
export function bellyJiggle(tl, panda, t, amp = 1, dur = 1.3) {
  const b = panda.rig.belly, r = restOf(panda, 'belly');
  tl.fromTo(b.scale, { x: r.s[0] * (1 + 0.07 * amp), y: r.s[1] * (1 - 0.06 * amp), z: r.s[2] * (1 + 0.08 * amp) }, { x: r.s[0], y: r.s[1], z: r.s[2], duration: dur, ease: EASE.jiggle, immediateRender: false }, t);
  tl.fromTo(b.position, { y: r.p[1] - 0.03 * amp }, { y: r.p[1], duration: dur, ease: EASE.jiggle, immediateRender: false }, t);
  return tl;
}
export function earFlop(tl, panda, t, amp = 1, dur = 1.1) {
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const f = panda.rig['earFlop' + side]; const r = restOf(panda, 'earFlop' + side);
    tl.fromTo(f.rotation, { z: r.r[2] + s * 0.5 * amp, x: r.r[0] - 0.25 * amp }, { z: r.r[2], x: r.r[0], duration: dur, ease: EASE.jiggle, immediateRender: false }, t + (side === 'R' ? 0.04 : 0));
  }
  return tl;
}
export function tailWag(tl, panda, t, amp = 1, dur = 0.9, count = 3) {
  const tail = panda.rig.tail, r = restOf(panda, 'tail').r;
  for (let i = 0; i < count; i++) tl.to(tail.rotation, { y: r[1] + (i % 2 ? -1 : 1) * 0.5 * amp * (1 - i / (count + 1)), duration: dur / count / 1.4, ease: 'sine.inOut' }, t + (i * dur) / count);
  tl.to(tail.rotation, { y: r[1], duration: 0.25, ease: EASE.settle }, t + dur);
  return tl;
}
export function cheekWobble(tl, panda, t, amp = 1, dur = 0.9) {
  tl.fromTo(panda.face.state, { cheekPuff: Math.min(1, 0.5 * amp) }, { cheekPuff: 0, duration: dur, ease: EASE.jiggle, immediateRender: false }, t);
  return tl;
}
export const nonNaN = (tl) => tl;
