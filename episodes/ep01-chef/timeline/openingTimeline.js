import * as THREE from 'three';
import gsap from 'gsap';
import { startTimeline, rotBy, moveBy, expr, squashTo, earFlop, tailWag, EASE } from '../../../panda-kit/src/animations/_util.js';
import { gripPose } from '../../../panda-kit/src/poses/applyPose.js';
import { torsoSurfaceZ } from '../outfit/_fit.js';
import { POCKET } from '../outfit/chefOutfit.js';
import { KNIFE } from '../props/knife/knife.js';
import { STICK_POINT, makeFlight, wobbledPose, wobbleAngle, wobbleTau } from '../props/knife/knifeAnimations.js';
import { SHIFT, OPENING_END, DRAW, FLICK, B4_START, ellOf, tOfEll, T_LAND, T_RELEASE } from './beats.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const V = (a) => new THREE.Vector3(...a);

/** Build-time numeric arm solve (deterministic grid + shrinking pattern search). Returns {sx, sz, ex, err}. */
function solveArm(panda, targetWorld) {
  const r = panda.rig, S = r.shoulderR, E = r.elbowR, h = new THREE.Vector3(), rs = panda.restSnapshot.shoulderR.r, re = panda.restSnapshot.elbowR.r;
  const cost = (sx, sz, ex) => { S.rotation.set(rs[0] + sx, rs[1], rs[2] + sz); E.rotation.set(re[0] + ex, re[1], re[2]); S.updateMatrixWorld(true); panda.sockets.handSocketR.getWorldPosition(h); return h.distanceTo(targetWorld); };
  let best = [0, 0, 0], bc = Infinity;
  for (let sx = -2.8; sx <= 0.4; sx += 0.2) for (let sz = -1.2; sz <= 0.2; sz += 0.2) for (let ex = -2.4; ex <= 0.2; ex += 0.2) { const c = cost(sx, sz, ex); if (c < bc) { bc = c; best = [sx, sz, ex]; } }
  for (let step = 0.1; step > 0.002; step *= 0.6) for (let it = 0; it < 40; it++) { let moved = false; for (let k = 0; k < 3; k++) for (const d of [-step, step]) { const c2 = best.slice(); c2[k] += d; const c = cost(...c2); if (c < bc) { bc = c; best = c2; moved = true; } } if (!moved) break; }
  S.rotation.set(...rs); E.rotation.set(...re); S.updateMatrixWorld(true);
  return { sx: best[0], sz: best[1], ex: best[2], err: bc };
}

/**
 * createOpening: builds the ONE master timeline (0..8 s) and `apply(t)`, a pure function of master time that sets camera, knife,
 * title, kitchen. Seek with `seek(t)`; there is no per-frame state, no random, no panda.update(dt).
 */
export function createOpening({ scene, camera, kitchen, panda, knife, title, marks, renderer }) {
  const pm = kitchen.anchors.pandaMark.position.clone(), stick = V(STICK_POINT);
  if (renderer) renderer.localClippingEnabled = true;
  panda.root.position.copy(pm); panda.root.rotation.y = Math.PI;

  // ---------- solve arm poses (panda at its mark facing +z, rest pose) ----------
  const saveRot = panda.root.rotation.y; panda.root.rotation.y = 0; panda.root.updateMatrixWorld(true);
  const sc = panda.options.scale ?? 1, loc = (x, y, z) => new THREE.Vector3(x, y, z).multiplyScalar(sc).add(pm);
  const stowZ = torsoSurfaceZ(POCKET.x, POCKET.y + POCKET.halfH) + 0.03;
  const T = {
    stow: loc(POCKET.x, POCKET.y + POCKET.halfH + 0.05, stowZ),
    hold: loc(-0.34, 1.32, 0.62),
    wind: loc(-0.55, 1.55, 0.0),
    rel: loc(-0.30, 1.50, 0.55),
  };
  const A = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, solveArm(panda, v)]));

  // knife-in-hand frame (tweak visually): blade along the forearm direction, edge down
  const HAND_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const HAND_P = new THREE.Vector3(0, 0, 0.0);
  const mHand = (a) => new THREE.Matrix4().compose(HAND_P, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a).multiply(HAND_Q), new THREE.Vector3(1, 1, 1));
  const setArm = (a, twist = 0) => { const r = panda.rig, rs = panda.restSnapshot; r.shoulderR.rotation.set(rs.shoulderR.r[0] + a.sx, rs.shoulderR.r[1], rs.shoulderR.r[2] + a.sz); r.elbowR.rotation.set(rs.elbowR.r[0] + a.ex, rs.elbowR.r[1], rs.elbowR.r[2]); r.chest.rotation.y = rs.chest.r[1] + twist; panda.root.updateMatrixWorld(true); };
  const handWorld = (a) => panda.sockets.handSocketR.matrixWorld.clone().multiply(mHand(a));
  const SNAP_TWIST = -0.35;
  setArm(A.rel, SNAP_TWIST);
  const relM = handWorld(0), relPos = new THREE.Vector3(), relQ = new THREE.Quaternion(); relM.decompose(relPos, relQ, new THREE.Vector3());
  setArm({ sx: 0, sz: 0, ex: 0 }, 0);
  panda.root.rotation.y = saveRot; panda.root.updateMatrixWorld(true);
  const flight = makeFlight({ position: relPos, quaternion: relQ }, { stick });

  // ---------- panda body timeline (one timeline, one reset, no overlapping tweens) ----------
  const body = startTimeline(panda, { restFace: 'smile' });   // happy from the first frame
  const arm = (a, t, d, ease = EASE.body, twist) => {
    const rs = panda.restSnapshot;
    body.to(panda.rig.shoulderR.rotation, { x: rs.shoulderR.r[0] + a.sx, z: rs.shoulderR.r[2] + a.sz, duration: d, ease }, t);
    body.to(panda.rig.elbowR.rotation, { x: rs.elbowR.r[0] + a.ex, duration: d, ease }, t);
    if (twist !== undefined) body.to(panda.rig.chest.rotation, { y: rs.chest.r[1] + twist, duration: d, ease }, t);
  };
  const REST = { sx: 0, sz: 0, ex: 0 };
  // B1: happy back shot (breathing sway + tail wag), then B2: a slow, proud turn that goes wrong -- Panda loses his balance and topples
  const S = SHIFT, root = panda.root, rz = (x, d, t, e = EASE.body) => body.to(root.rotation, { z: x, duration: d, ease: e }, t);
  const R = panda.rig;
  body.set(root.rotation, { x: 0, y: Math.PI, z: 0 }, 0); body.set(root.position, { y: pm.y }, 0);
  rotBy(body, panda, 'spine', { z: 0.035 }, 0.15, 0.9, 'sine.inOut'); rotBy(body, panda, 'spine', { z: -0.035 }, 1.05, 0.9, 'sine.inOut'); rotBy(body, panda, 'spine', { z: 0 }, 1.95, 0.25, 'sine.out');
  tailWag(body, panda, 0.3, 0.8, 1.2, 3);
  expr(body, panda, 'bigGrin', 1.3, 0.5);
  // wind-up: crouch + lean the wrong way, head already looking round (slow)
  squashTo(body, panda, 0.05, 2.2, 0.5, EASE.anticipate);
  body.to(root.rotation, { y: Math.PI - 0.2, duration: 0.5, ease: EASE.anticipate }, 2.2);
  rotBy(body, panda, 'head', { y: -0.5 }, 2.35, 0.5, EASE.body);
  squashTo(body, panda, 0, 2.75, 0.4, EASE.jiggle);
  // slow proud pirouette through Panda's right (screen-left), the same way the camera orbits: pi -> 2pi
  body.to(root.rotation, { y: 2 * Math.PI - 0.55, duration: 1.45, ease: 'sine.inOut' }, 2.7);
  rotBy(body, panda, 'head', { y: 0 }, 3.2, 0.9, EASE.body);
  for (const side of ['L', 'R']) { const k = side === 'L' ? 1 : -1;     // arms out for balance
    rotBy(body, panda, 'shoulder' + side, { z: k * 0.9, x: 0 }, 3.0, 0.7, EASE.body); }
  // he starts to wobble: roll side to side, arms windmilling, feet scrambling
  rz(0.1, 0.25, 3.85, 'sine.inOut'); rz(-0.16, 0.3, 4.1, 'sine.inOut'); rz(0.14, 0.28, 4.4, 'sine.inOut');
  body.to(root.rotation, { y: 2 * Math.PI + 0.15, duration: 0.8, ease: 'sine.inOut' }, 4.15);
  expr(body, panda, 'oMouth', 3.9, 0.25);
  rotBy(body, panda, 'shoulderL', { x: -1.6, z: 1.2 }, 3.85, 0.3, 'sine.inOut'); rotBy(body, panda, 'shoulderL', { x: 1.6, z: 1.1 }, 4.15, 0.3, 'sine.inOut'); rotBy(body, panda, 'shoulderL', { x: -1.4, z: 1.2 }, 4.45, 0.25, 'sine.inOut');
  rotBy(body, panda, 'shoulderR', { x: 1.6, z: -1.2 }, 3.85, 0.3, 'sine.inOut'); rotBy(body, panda, 'shoulderR', { x: -1.6, z: -1.1 }, 4.15, 0.3, 'sine.inOut'); rotBy(body, panda, 'shoulderR', { x: 1.4, z: -1.2 }, 4.45, 0.25, 'sine.inOut');
  rotBy(body, panda, 'hipL', { x: -0.55 }, 3.9, 0.2, EASE.body); rotBy(body, panda, 'hipL', { x: 0.4 }, 4.1, 0.2, EASE.body); rotBy(body, panda, 'hipL', { x: -0.4 }, 4.3, 0.2, EASE.body); rotBy(body, panda, 'hipL', { x: 0 }, 4.7, 0.2, EASE.body);
  rotBy(body, panda, 'hipR', { x: 0.5 }, 3.95, 0.2, EASE.body); rotBy(body, panda, 'hipR', { x: -0.5 }, 4.15, 0.2, EASE.body); rotBy(body, panda, 'hipR', { x: 0.3 }, 4.35, 0.2, EASE.body); rotBy(body, panda, 'hipR', { x: 0 }, 4.7, 0.2, EASE.body);
  // the topple: falls onto his side on the open floor, arms flung up
  const FALL_T = 4.62, FALL_D = 0.42, FALL_X = 1.5, LIFT = 0.45;
    body.to(root.rotation, { z: FALL_X, duration: FALL_D, ease: 'power2.in' }, FALL_T);   // tips sideways (toward the camera's left): the silhouette reads
  body.to(root.position, { y: pm.y + LIFT, duration: FALL_D, ease: 'power2.in' }, FALL_T);
  expr(body, panda, 'surprised', 4.55, 0.15);
  rotBy(body, panda, 'shoulderL', { x: -2.4, z: 0.5 }, 4.7, 0.3, EASE.body); rotBy(body, panda, 'shoulderR', { x: -2.4, z: -0.5 }, 4.7, 0.3, EASE.body);
  squashTo(body, panda, 0.17, FALL_T + FALL_D, 0.1, 'power2.out'); squashTo(body, panda, 0, FALL_T + FALL_D + 0.1, 0.5, EASE.jiggle);   // thud
  earFlop(body, panda, FALL_T + FALL_D, 1, 1.1);
  // lies there, dazed, then the ears droop and he giggles
  rotBy(body, panda, 'head', { y: 0.35, z: 0.2 }, 5.25, 0.5, 'sine.inOut'); rotBy(body, panda, 'head', { y: -0.3, z: -0.2 }, 5.75, 0.5, 'sine.inOut');
  expr(body, panda, 'sleepy', 5.2, 0.4);
  // pops back up (cartoon pivot about the feet) with a little hop and a big grin
  body.to(root.rotation, { z: 0, duration: 0.55, ease: 'back.out(1.7)' }, 6.0);
  body.to(root.position, { y: pm.y, duration: 0.55, ease: 'back.out(1.7)' }, 6.0);
  rotBy(body, panda, 'head', { y: 0, z: 0 }, 6.25, 0.15, EASE.body);
  for (const side of ['L', 'R']) rotBy(body, panda, 'shoulder' + side, { x: 0, z: 0 }, 6.05, 0.3, EASE.settle);
  squashTo(body, panda, 0.06, 5.95, 0.15, 'power2.in'); squashTo(body, panda, 0, 6.1, 0.4, EASE.jiggle);
  expr(body, panda, 'bigGrin', 6.05, 0.3);
  expr(body, panda, 'proud', DRAW.reachStart - 0.05, 0.3);
  // B3: reach, grasp, pull up, hold
  arm(A.stow, DRAW.reachStart, DRAW.grasp - DRAW.reachStart, EASE.body);
  gripPose(panda, 'R', 'fist', 0.1, body, DRAW.grasp);
  arm(A.hold, DRAW.grasp + 0.04, DRAW.upEnd - DRAW.grasp - 0.04, EASE.body);
  // B4: wind-up, snap (twist + arm), release, follow through
  const tWind = tOfEll(FLICK.windUp), tSnap = tOfEll(FLICK.snap), tRel = T_RELEASE;
  arm(A.wind, DRAW.upEnd, tWind - DRAW.upEnd, EASE.anticipate, 0.3);
  arm(A.rel, tWind, tSnap - tWind + 0.04, 'power3.in', SNAP_TWIST);
  gripPose(panda, 'R', 'open', 0.08, body, tRel);
  rotBy(body, panda, 'spine', { x: 0.12 }, tWind, tSnap - tWind, EASE.body);
  rotBy(body, panda, 'head', { y: 0.25 }, 4.2 + S, 0.4, EASE.body);
  expr(body, panda, 'bigGrin', tWind, 0.2);
  // B5: arm back to rest, deadpan shrug
  arm(REST, 4.62 + S, 0.5, EASE.settle, 0);
  rotBy(body, panda, 'spine', { x: 0 }, 4.55 + S, 0.5, EASE.settle);
  gripPose(panda, 'R', 'relaxed', 0.3, body, 4.9 + S);
  expr(body, panda, 'smile', 5.0 + S, 0.3);
  rotBy(body, panda, 'head', { y: 0.1, z: 0.12 }, 5.05 + S, 0.4, EASE.body);
  for (const s of ['L', 'R']) { const k = s === 'L' ? 1 : -1;
    moveBy(body, panda, 'shoulder' + s, { y: 0.085 }, 5.35 + S, 0.3, EASE.body); moveBy(body, panda, 'shoulder' + s, { y: 0 }, 6.1 + S, 0.5, EASE.settle);
    rotBy(body, panda, 'shoulder' + s, { z: k * 0.35 }, 5.35 + S, 0.35, EASE.body); rotBy(body, panda, 'shoulder' + s, { z: 0 }, 6.1 + S, 0.5, EASE.settle); if (s === 'L') rotBy(body, panda, 'elbowL', { x: -0.7 }, 5.35 + S, 0.35, EASE.body), rotBy(body, panda, 'elbowL', { x: 0 }, 6.1 + S, 0.5, EASE.settle); }
  // B6: look at the camera
  const camEnd = V(marks.marks.M7_title_lift.position), yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(camEnd.x - pm.x, camEnd.z - pm.z)));
  rotBy(body, panda, 'head', { y: yaw, z: 0, x: -0.04 }, 7.5 + S, 0.5, EASE.body);
  body.to(panda.face.state, { lookX: 0.5, duration: 0.2 }, 7.4 + S);
  expr(body, panda, 'bigGrin', 7.6 + S, 0.3);
  body.to(root.position, { x: pm.x - 1.15, duration: 1.2, ease: 'sine.inOut' }, 8.5 + S - 0.0 - 0.9);   // happy sidestep out of the title's way
  body.set(root.position, { x: pm.x }, 0);

  // ---------- secondary motion: toque + apron bow lag behind the body (sequential, non-overlapping tweens => scrub-safe) ----------
  const hat = panda.root.getObjectByName('toque'), bow = panda.root.getObjectByName('bow');
  const chain = (obj, axis, rest, steps) => { body.set(obj, { [axis]: rest }, 0); let end = 0; for (const [t, v, d, e] of steps) { if (t < end - 1e-6) throw new Error('secondary tweens overlap at ' + t); body.to(obj, { [axis]: v, duration: d, ease: e || 'sine.inOut' }, t); end = t + d; } };
  if (hat) {
    chain(hat.rotation, 'z', hat.rotation.z, [[2.2, -0.14, 0.5], [2.7, 0.28, 0.45], [3.15, -0.24, 0.45], [3.6, 0.2, 0.45], [4.05, -0.16, 0.45], [4.62, 0.75, 0.42, 'power2.in'], [5.04, -0.4, 0.12, 'power2.out'], [5.16, 0.04, 0.6, EASE.jiggle], [5.95, 0.05, 0.05], [6.0, 0.35, 0.15, 'power2.out'], [6.15, 0.04, 0.7, EASE.jiggle]]);
    chain(hat.rotation, 'x', hat.rotation.x, [[2.2, 0.1, 0.5], [2.75, -0.2, 0.5], [4.62, -0.35, 0.42, 'power2.in'], [5.04, 0.25, 0.12, 'power2.out'], [5.16, -0.07, 0.6, EASE.jiggle], [6.0, -0.2, 0.15, 'power2.out'], [6.15, -0.07, 0.7, EASE.jiggle]]);
  }
  if (bow) {
    chain(bow.rotation, 'z', 0, [[2.2, 0.2, 0.5], [2.7, -0.5, 0.4], [3.1, 0.55, 0.4], [3.5, -0.5, 0.4], [3.9, 0.45, 0.4], [4.3, -0.3, 0.32], [4.62, 0.7, 0.42, 'power2.in'], [5.04, -0.5, 0.12, 'power2.out'], [5.16, 0, 0.8, EASE.jiggle], [6.0, 0.5, 0.15, 'power2.out'], [6.15, 0, 0.8, EASE.jiggle]]);
    chain(bow.rotation, 'x', 0, [[2.7, -0.3, 0.4], [3.5, 0.3, 0.5], [4.62, -0.5, 0.42, 'power2.in'], [5.04, 0.5, 0.12, 'power2.out'], [5.16, 0, 0.8, EASE.jiggle]]);
  }
  // anticipation: a crouch just before the tumble, so the heavy landing reads as weight
  squashTo(body, panda, 0.08, 4.4, 0.2, 'power2.out'); squashTo(body, panda, 0, 4.62, 0.2, 'power2.in');

  // ---------- camera: Hermite path through the knots ----------
  const knots = marks.path.map((k) => { const m = marks.marks[k.mark], p = V(m.position), l = V(m.lookAt); p.lerp(l, k.push ?? 0); return { t: k.t, v: [...p.toArray(), ...l.toArray(), m.fov], speed: k.speed }; });
  knots.forEach((k, i) => { const a = knots[Math.max(0, i - 1)], b = knots[Math.min(knots.length - 1, i + 1)], dt = Math.max(1e-6, b.t - a.t); k.m = k.v.map((_, j) => (k.speed * (b.v[j] - a.v[j])) / dt); });
  const camAt = (t) => {
    t = Math.min(OPENING_END, Math.max(0, t)); let i = 0; while (i < knots.length - 2 && t > knots[i + 1].t) i++;
    const a = knots[i], b = knots[i + 1], h = b.t - a.t, s = clamp01((t - a.t) / h), s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    return a.v.map((_, j) => h00 * a.v[j] + h10 * h * a.m[j] + h01 * b.v[j] + h11 * h * b.m[j]);
  };
  const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _k = new THREE.Vector3();

  // ---------- knife state machine (pure function of t) ----------
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e4), clipActive = [clip];
  knife.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.clippingPlanes = clipActive; m.clipShadows = true; }); });
  knife.matrixAutoUpdate = true; if (knife.parent !== scene) scene.add(knife);
  const torso = panda.sockets.torsoWrap;
  let _sy = null; const socketY = () => { if (_sy === null) { const p = new THREE.Vector3(); const rr = panda.root.rotation.y; panda.root.rotation.y = 0; panda.root.updateMatrixWorld(true); torso.getWorldPosition(p); _sy = (p.y - panda.root.position.y) / (panda.options.scale ?? 1); panda.root.rotation.y = rr; panda.root.updateMatrixWorld(true); } return _sy; };
  socketY();
  const stowLocal = new THREE.Matrix4().compose(new THREE.Vector3(POCKET.x, POCKET.y + POCKET.halfH + 0.07 - socketY(), stowZ + 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI)), new THREE.Vector3(1, 1, 1));
  const M = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sP = new THREE.Vector3(), sQ = new THREE.Quaternion(), hP = new THREE.Vector3(), hQ = new THREE.Quaternion();
  const tipLocal = new THREE.Vector3(0, KNIFE.tipY, 0);
  function updateKnife(t) {
    panda.root.updateMatrixWorld(true);
    let clipOn = false;
    if (t < DRAW.blendEnd + 0.0001) {
      // stowed (follows torso) -> blended into the hand
      const stowW = torso.matrixWorld.clone().multiply(stowLocal);
      stowW.decompose(sP, sQ, _s);
      const w = sm(DRAW.grasp, DRAW.blendEnd, t);
      if (w > 0) { handWorld(Math.PI * (1 - sm(DRAW.blendEnd, DRAW.upEnd, t))).decompose(hP, hQ, _s); pos.lerpVectors(sP, hP, w); q.slerpQuaternions(sQ, hQ, w); } else { pos.copy(sP); q.copy(sQ); }
      clipOn = true;
    } else if (t < T_RELEASE) {
      const a = Math.PI * (1 - sm(DRAW.blendEnd, DRAW.upEnd, t)); handWorld(a).decompose(pos, q, _s);
      clipOn = a > 0.05;
    } else if (t < T_LAND) {
      const f = flight((ellOf(t) - FLICK.release) / (FLICK.land - FLICK.release)); pos.copy(f.position); q.copy(f.quaternion);
    } else { const f = wobbledPose(t, T_LAND, stick); pos.copy(f.position); q.copy(f.quaternion); }
    knife.position.copy(pos); knife.quaternion.copy(q); knife.updateMatrixWorld(true);
    if (clipOn) {
      const up = new THREE.Vector3(0, 1, 0).transformDirection(torso.matrixWorld), top = new THREE.Vector3(0, POCKET.y + POCKET.halfH - socketY(), 0).applyMatrix4(torso.matrixWorld);
      _k.copy(tipLocal).applyMatrix4(knife.matrixWorld);
      clip.setFromNormalAndCoplanarPoint(up, top);
      if (clip.distanceToPoint(_k) > 0.0) clip.constant = 1e4;   // tip already above the pocket plane: nothing left to clip
    } else clip.constant = 1e4;
  }

  // ---------- contact shadow: soft blob under Panda, widens when he tips and fades when he lifts ----------
  const csTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const tx = new THREE.CanvasTexture(c); return tx; })();
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: csTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  contact.rotation.x = -Math.PI / 2; contact.renderOrder = 2; contact.name = 'contactShadow'; scene.add(contact);
  const dustU = kitchen._state?.ctx?.fx?.dust?.mat.uniforms;
  function secondaryFx(t) {
    const lift = Math.max(0, root.position.y - pm.y), tip = Math.sin(Math.min(Math.abs(root.rotation.z), Math.PI / 2));
    const sc = 1.15 + 0.5 * tip; contact.position.set(root.position.x + tip * 0.3, pm.y + 0.012, root.position.z); contact.scale.set(sc * (1 + 0.8 * tip), sc, 1);
    contact.material.opacity = 0.75 * (1 - clamp01(lift / 0.7)) * (0.55 + 0.45 * (1 - tip * 0.4));
    if (dustU) { // motes get shoved by the stumble, the thud and the pop-up
      const pulse = (t0, k) => (t > t0 ? k * Math.exp(-(t - t0) * 2.6) * sm(0, 0.04, t - t0) : 0);
      dustU.uAmp.value = Math.max(pulse(5.04, 1.0), pulse(6.0, 0.5), 0.35 * sm(2.7, 3.3, t) * (1 - sm(4.4, 4.9, t)));
      dustU.uPush.value.set(root.position.x, pm.y + 0.5, root.position.z);
    }
  }

  // ---------- master ----------
  function apply(t) {
    updateKnife(t);
    const c = camAt(t); _p.set(c[0], c[1], c[2]); _l.set(c[3], c[4], c[5]);
    const kt = marks.knifeTrack; if (t > kt.from && t < kt.to) { knife.getWorldPosition(_k); _l.lerp(_k, kt.peakWeight * Math.sin(Math.PI * clamp01((t - kt.from) / (kt.to - kt.from)))); }
    camera.position.copy(_p); camera.fov = c[6]; camera.lookAt(_l);
    const tilt = (marks.tiltUp.deg * Math.PI) / 180 * sm(marks.tiltUp.from, marks.tiltUp.to, t); if (tilt) camera.rotateX(tilt);
    { const u = t - 5.04; if (u > 0 && u < 0.7) { const a = 0.05 * Math.exp(-u * 7) * Math.sin(u * 46); camera.position.y += a; camera.position.x += a * 0.4; } }   // thud shake
    camera.updateProjectionMatrix();
    secondaryFx(t); title?.setTime(t); kitchen.setTime(t);   // the board never moves: only the knife quivers
  }
  const master = gsap.timeline({ paused: true, onUpdate: () => apply(master.time()) });
  body.paused(false); master.add(body, 0); master.to({}, { duration: OPENING_END }, 0);
  master.progress(1).progress(0);
  return {
    master, apply, camAt, knife, solved: A, targets: T, flight,
    seek(t) { master.time(Math.min(OPENING_END, Math.max(0, t)), false); apply(master.time()); },
    knifeTip() { return new THREE.Vector3(0, KNIFE.tipY, 0).applyMatrix4(knife.matrixWorld); },
  };
}
