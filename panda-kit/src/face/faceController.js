import * as THREE from 'three';
import gsap from 'gsap';
import { NEUTRAL, resolve, PRESETS } from './expressions.js';

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Drives every facial part from ONE parameter object (`state`). Everything that animates the face tweens `state`
 * (so it is scrub-safe); `blink`/`look` live in separate additive channels. update() only adds cheap non-scrubbed life.
 */
export function createFaceController(rig, getParts) {
  const state = { ...resolve('calmSmirk') };
  const chan = { blink: 0, talk: 0, lookX: 0, lookY: 0, saccX: 0, saccY: 0 };
  let autoBlink = false, blinkIn = 2.5, saccIn = 1.2, lookTarget = null, lookDyn = { x: 0, y: 0 };
  let tw = null;

  function apply() {
    const parts = getParts(); if (!parts) return;
    const st = state;
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const S = parts.sides[side]; if (!S) continue;
      const lid = Math.min(1, Math.max(st['lid' + side], chan.blink));
      S.lid.rotation.x = lerp(-1.1, 0.5, lid) + 1.05 * THREE.MathUtils.smoothstep(lid, 0.88, 1);
      S.lid.parent.scale.z = lerp(1, 0.55, THREE.MathUtils.smoothstep(lid, 0.85, 1)); // closed lid flattens onto the patch
      S.lid.visible = lid > 0.03; S.eyeSpin.visible = lid < 0.88; if (S.shine) S.shine.visible = lid < 0.6;
      const scl = st.eyeScale; rig['eye' + side].scale.setScalar(scl); S.lid.scale.setScalar(scl);
      const lx = THREE.MathUtils.clamp(st.lookX + chan.lookX + chan.saccX, -1, 1), ly = THREE.MathUtils.clamp(st.lookY + chan.lookY + chan.saccY, -1, 1);
      S.eyeSpin.rotation.set(-ly * 0.436, lx * 0.436, 0);
      // brows: height along head-up, tilt about the surface normal (outer end down = positive tilt), inner raise adds tilt
      const bp = rig['brow' + side], h = st['brow' + side + 'h'], t = st['brow' + side + 't'], i = st['brow' + side + 'i'];
      bp.position.copy(bp.userData.base); bp.position.y += h * 0.055; bp.position.addScaledVector(bp.userData.normal, Math.abs(h) * 0.01);
      S.brow.rotation.z = s * (t * 0.5 - i * 0.45);
      if (S.puff) { const pf = st.cheekPuff * 0.5; S.puff.scale.setScalar(Math.max(0.001, pf)); S.puff.position.copy(S.puffBase).addScaledVector(S.puffNormal, pf * 0.04); }
      const ear = rig['ear' + side]; if (ear) ear.rotation.z = s * st['ear' + side] * 0.35;
    }
    if (parts.blush) { parts.blush.material.opacity = 0.55 * st.cheekBlush; parts.blush.visible = st.cheekBlush > 0.01; }
    const nose = parts.nose; nose.rotation.z = Math.sin(st.noseWiggle * 40) * 0.06 * Math.min(1, st.noseWiggle); nose.scale.setScalar(1 + 0.05 * st.noseWiggle);
    parts.mouth.rebuild({ curve: st.mCurve, width: st.mWidth, open: Math.min(1, st.mOpen + chan.talk), offsetX: st.mOffsetX, pucker: st.mPucker });
  }

  const api = {
    state, channels: chan, apply,
    /** Instantly set (no tween). */
    set(name) { Object.assign(state, resolve(name)); apply(); return api; },
    /** Returns a GSAP tween to a preset, scrub-safe when placed in a timeline. */
    to(name, duration = 0.4, vars = {}) { return gsap.to(state, { ...resolve(name), duration, ease: 'power2.inOut', onUpdate: apply, overwrite: false, ...vars }); },
    setExpression(name, duration = 0.4) { if (tw) tw.kill(); tw = api.to(name, duration); return tw; },
    /** Weighted blend of presets. Instant. */
    setExpressionMix(weights) {
      const out = { ...NEUTRAL }; let total = 0; for (const w of Object.values(weights)) total += w;
      if (!total) return api;
      for (const k of Object.keys(NEUTRAL)) { out[k] = 0; for (const [n, w] of Object.entries(weights)) out[k] += resolve(n)[k] * (w / total); }
      Object.assign(state, out); apply(); return api;
    },
    /** Quick natural blink (close fast, open slightly slower). Returns the timeline. */
    blink(speed = 1) {
      return gsap.timeline().to(chan, { blink: 1, duration: 0.07 / speed, ease: 'power2.in', onUpdate: apply })
        .to(chan, { blink: 0, duration: 0.13 / speed, ease: 'power2.out', onUpdate: apply });
    },
    setBrows({ left, right } = {}, duration = 0.25) {
      const v = {}; for (const [side, o] of [['L', left], ['R', right]]) if (o) { if (o.height !== undefined) v['brow' + side + 'h'] = o.height; if (o.tilt !== undefined) v['brow' + side + 't'] = o.tilt; if (o.innerRaise !== undefined) v['brow' + side + 'i'] = o.innerRaise; }
      return gsap.to(state, { ...v, duration, ease: 'power2.out', onUpdate: apply });
    },
    setMouth({ curve, width, open, offsetX, pucker } = {}, duration = 0.2) {
      const v = {}; if (curve !== undefined) v.mCurve = curve; if (width !== undefined) v.mWidth = width; if (open !== undefined) v.mOpen = open; if (offsetX !== undefined) v.mOffsetX = offsetX; if (pucker !== undefined) v.mPucker = pucker;
      return gsap.to(state, { ...v, duration, ease: 'power2.out', onUpdate: apply });
    },
    /** target: THREE.Vector3 (world), {x,y} in -1..1, or null to centre. Eyes follow with a little lag (in update()). */
    setLook(target) { lookTarget = target; if (!target) lookDyn = { x: 0, y: 0 }; },
    startAutoBlink() { autoBlink = true; }, stopAutoBlink() { autoBlink = false; },
    /** Cheap per-frame life: auto-blink, micro-saccades, eye-lag. Skip while scrubbing. */
    update(dt, headObj) {
      if (autoBlink) { blinkIn -= dt; if (blinkIn <= 0) { api.blink(); blinkIn = 2.5 + Math.random() * 2.5; } }
      if (autoBlink) { saccIn -= dt; if (saccIn <= 0) { chan.saccX = (Math.random() - 0.5) * 0.12; chan.saccY = (Math.random() - 0.5) * 0.08; saccIn = 0.8 + Math.random() * 2; } }
      if (lookTarget) {
        let tx, ty;
        if (lookTarget.isVector3 && headObj) { const l = headObj.worldToLocal(lookTarget.clone()); tx = Math.atan2(l.x, l.z) / 0.436; ty = Math.atan2(l.y - 0.28, Math.hypot(l.x, l.z)) / 0.436; } else { tx = lookTarget.x; ty = lookTarget.y; }
        lookDyn.x += (THREE.MathUtils.clamp(tx, -1, 1) - lookDyn.x) * Math.min(1, dt * 9); lookDyn.y += (THREE.MathUtils.clamp(ty, -1, 1) - lookDyn.y) * Math.min(1, dt * 9);
        chan.lookX = lookDyn.x; chan.lookY = lookDyn.y;
      }
      if (autoBlink || lookTarget) apply();
    },
    presetNames: Object.keys(PRESETS),
  };
  return api;
}
