import gsap from 'gsap';
import { POSES } from './poses.js';
import { resolve } from '../face/expressions.js';

export const GRIPS = { // thumb rot z (L, mirrored for R), thumb scale, paw squash
  open: { t: 0.7, ts: 1.0, p: [1, 1, 1] }, relaxed: { t: 0.2, ts: 1.0, p: [1, 1, 1] }, fist: { t: -0.35, ts: 1.45, p: [0.93, 0.93, 1.06] },
  pinch: { t: -0.15, ts: 1.25, p: [0.85, 0.9, 1.0] }, point: { t: -0.4, ts: 1.4, p: [0.82, 1.15, 0.9] }, flatPalm: { t: 0.5, ts: 0.9, p: [1.08, 0.92, 0.9] }, hold: { t: -0.2, ts: 1.3, p: [0.97, 0.95, 1.05] },
};

/** Tween a paw to a grip preset. Mitten paws can't grip, so this curls the thumb bump and squashes the paw. */
export function gripPose(panda, side, name, duration = 0.3, tl = null, at = 0) {
  const g = GRIPS[name]; if (!g) throw new Error('Unknown grip: ' + name);
  const s = side === 'L' ? 1 : -1; const th = panda.rig['thumb' + side], pm = panda.rig['pawMesh' + side];
  const vars = [[th.rotation, { z: s * g.t }], [th.scale, { x: g.ts, y: g.ts, z: g.ts }], [pm.scale, { x: g.p[0], y: g.p[1], z: g.p[2] }]];
  const out = tl || gsap.timeline();
  for (const [o, v] of vars) out.to(o, { ...v, duration, ease: 'power2.out' }, at);
  return out;
}

/** Absolute rotations for every rig pivot a pose mentions; everything else returns to rest. */
export function poseTargets(panda, name) {
  const P = POSES[name]; if (!P) throw new Error('Unknown pose: ' + name);
  const out = {};
  for (const [k, v] of Object.entries(panda.restSnapshot)) {
    if (k === 'root' || !panda.rig[k]) continue;
    if (!/^(hips|spine|chest|neck|head|shoulder|upperArm|elbow|paw[LR]|hip[LR]|leg|ankle|foot|tail)/.test(k)) continue;
    const rot = P[k] ? { x: P[k][0], y: P[k][1], z: P[k][2] } : { x: v.r[0], y: v.r[1], z: v.r[2] };
    // pose values are ABSOLUTE for arms/spine/head but ADDITIVE on top of rest for the arm pivots' rest bias (armOut etc. are in the pose itself)
    const pos = P.pos && P.pos[k] ? { x: v.p[0] + P.pos[k][0], y: v.p[1] + P.pos[k][1], z: v.p[2] + P.pos[k][2] } : { x: v.p[0], y: v.p[1], z: v.p[2] };
    out[k] = { rot, pos };
  }
  return out;
}

/** Tween to a named pose. Returns a GSAP timeline (so it can be placed in other timelines). */
export function poseTween(panda, name, duration = 0.8, tl = null) {
  const T = poseTargets(panda, name), P = POSES[name]; const out = tl || gsap.timeline({ onUpdate: () => panda.face.apply() });
  for (const [k, t] of Object.entries(T)) {
    out.to(panda.rig[k].rotation, { ...t.rot, duration, ease: 'power2.inOut' }, 0);
    out.to(panda.rig[k].position, { ...t.pos, duration, ease: 'power2.inOut' }, 0);
  }
  out.to(panda.face.state, { ...resolve(P.expr || 'calmSmirk'), duration, ease: 'power2.inOut' }, 0);
  const grips = P.grip || {};
  for (const side of ['L', 'R']) gripPose(panda, side, grips[side] || 'relaxed', duration, out);
  return out;
}

/** Instantly apply a pose (used by verify + screenshots). */
export function applyPose(panda, name) { poseTween(panda, name, 0).progress(1); panda.face.apply(); return panda; }
