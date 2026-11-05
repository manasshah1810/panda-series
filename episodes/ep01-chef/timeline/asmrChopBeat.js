import * as THREE from 'three';
import gsap from 'gsap';
import { CAMERA_MARKS, M14_FRAMING_NUDGE } from '../kitchen/src/cameraMarks.js';
import { resolve as resolveFace } from '../../../panda-kit/src/face/expressions.js';
import { OPENING_END } from './beats.js';
import { PREP_TILT_DEG, MARK_BOARD_ORIGIN } from './miseEnPlaceBeat.js';

/**
 * Beat 3 -- The ASMR Scroll-Chop. Directly after the mise-en-place hover: the camera whips down from the top-down M13 to the low macro side
 * angle M14, the kitchen softens (light dim + warm haze + vignette = cheap depth of field), the Panda's right paw raises and strikes the board
 * nine times, and on every strike frame ONE bamboo slice tips 90 degrees forward (bouncing flat onto the board), the camera takes a -0.01 y bump
 * and a cluster of four golden bamboo flecks arcs out and fades. After the last slice the camera swings round to a medium close-up: slow-motion
 * knife spin in his paw (local Z), then the wink.
 *
 * ANIMATION CONTRACT. One paused GSAP timeline (CHOP_DURATION s). It only tweens plain progress scalars (whip, focus, knife raise, per-chop tip /
 * burst / shake progress, flourish ...). `apply()` -- called from onUpdate -- is a PURE function of those scalars: it assigns ABSOLUTE values
 * to the camera, lights, fog, slices, flecks, knife, Panda joints and face. No physics, no accumulation, no Math.random, no per-frame state:
 * seeking forwards, backwards or randomly gives identical frames, and scrubbing back makes every slice stand up and the knife retrace its path.
 * The Panda arm is solved NUMERICALLY AT BUILD TIME into joint-angle tables (inverse kinematics); the table lookup at runtime is pure.
 */
export const CHOP_COUNT = 9;
export const CHOP_TIMES = Object.freeze({
  whip: [0, 0.7], focusIn: [0.45, 1.25], pandaIn: 0.3,       // whip-down, depth-of-field focus pull, Panda + knife pop in while the camera is mid-whip
  firstStrike: 1.3, stride: 0.62, strike: 0.09, rest: 0.09, raise: 0.34,   // chop cycle: strike (fast) -> rest on board -> raise (+ slide to next kerf) -> dwell
  tip: 0.55, burst: 0.6, shake: 0.22,                          // per-impact windows
  flourish: [6.62, 7.4], sweep: [6.7, 7.3], focusOut: [6.9, 8.1], look: [7.0, 8.0], smirk: [7.0, 8.4], spin: [7.5, 9.3], wink: [9.0, 9.2], duration: 10.6,
});
/** Master-clock helper: impact (strike frame) time of chop i, in beat seconds. */
export const impactTime = (i) => CHOP_TIMES.firstStrike + CHOP_TIMES.stride * i + CHOP_TIMES.strike;
export const SHAKE_Y = -0.01;                                   // spec: Y-axis bump of -0.01 units, returning to 0
export const FLECKS_PER_CHOP = 4;
const KNIFE_POSE = Object.freeze({ yaw: 62 * Math.PI / 180, pitchDown: 8 * Math.PI / 180, pitchUp: 40 * Math.PI / 180, lift: 0.17, contactY: 0.31 });
/** Panda stance, relative to the board-frame origin (board surface centre): he stands at the far (-x) end of the log FACING THE LENS (+x); the log lies along board +x exactly like the solid cone it replaces (tip towards the lens), and his blade lies across it, pointing to his right. */
export const STANCE = Object.freeze({ dx: -0.55, dz: -0.85, yaw: Math.PI / 2 });
/** Chest twist / spine lean candidates; the build keeps the pair with the smallest worst-case IK error. */
const POSTURES = [[0, 0], [0.3, 0], [0.6, 0], [0, 0.2], [0.3, 0.2], [0.6, 0.2]];
/** Flourish grip (Panda root-local, facing +z): paw out to his right side, blade pointing up beside the head. */
const FLOURISH_HAND = Object.freeze([-0.72, 1.5, 0.38]);
const TABLE_ANCHORS = [0, 1, 2, 3, 4, 5, 6, 7, 8], TABLE_SAMPLES = 13;   // one IK row per kerf, 13 knife heights: bilinear lookup in between stays within a millimetre of the true solution

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const E = (n) => gsap.parseEase(n);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (a) => new THREE.Vector3(...a);

/** Golden bamboo flecks: ONE InstancedMesh (1 draw call) with a per-instance alpha attribute; every instance is placed by scale / opacity / a parabola of its progress. */
export function createBambooFlecks({ chops = CHOP_COUNT, per = FLECKS_PER_CHOP } = {}) {
  const n = chops * per, geo = new THREE.OctahedronGeometry(1, 0); geo.scale(1, 0.38, 0.62);
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute('aAlpha', alpha);
  const mat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthWrite: false, toneMapped: false });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vFleckA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFleckA = aAlpha;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFleckA;').replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= vFleckA;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.name = 'bambooFlecks'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 5; mesh.visible = false;
  const pal = ['#F4C542', '#E8A93A', '#F7E1A0'], c = new THREE.Color(), table = [];
  for (let i = 0; i < chops; i++) for (let j = 0; j < per; j++) {
    const k = i * per + j, a = (j - (per - 1) / 2) * 0.62 + (hash(k + 1) - 0.5) * 0.4;   // fan around +z (the way the slice falls)
    table.push({ a, r: 0.075 + 0.05 * hash(k + 7), peak: 0.03 + 0.035 * hash(k + 13), size: 0.0065 + 0.0045 * hash(k + 21), w: [2 + 5 * hash(k + 31), 3 + 4 * hash(k + 41), 2 + 4 * hash(k + 51)], ph: hash(k + 61) * 6.28 });
    mesh.setColorAt(k, c.set(pal[k % 3]));
  }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  /** PURE: place burst `i` (origin = kerf point in board frame) at progress u in [0, 1]. u outside (0, 1) hides it (scale 0, alpha 0). */
  function setBurst(i, origin, u) {
    for (let j = 0; j < per; j++) {
      const k = i * per + j, f = table[k], live = u > 0 && u < 1, uu = clamp01(u);
      const out = 1 - (1 - uu) * (1 - uu), size = live ? f.size * sm(0, 0.14, uu) * (1 - 0.45 * sm(0.6, 1, uu)) : 0;
      p.set(origin.x + Math.sin(f.a) * f.r * out, origin.y + 0.006 + f.peak * 4 * uu * (1 - uu), origin.z + (Math.cos(f.a) * 0.8 + 0.25) * f.r * out);
      e.set(f.ph + f.w[0] * uu, f.w[1] * uu, f.w[2] * uu); q.setFromEuler(e); sc.setScalar(size); M.compose(p, q, sc); mesh.setMatrixAt(k, M);
      alpha.setX(k, live ? 1 - sm(0.55, 1, uu) : 0);
    }
    mesh.instanceMatrix.needsUpdate = true; alpha.needsUpdate = true;
  }
  return { mesh, setBurst, count: n, perChop: per, dispose() { geo.dispose(); mat.dispose(); mesh.removeFromParent(); } };
}

/**
 * @param {object} deps
 * @param {{camera: THREE.PerspectiveCamera}} deps.cameraRig
 * @param {ReturnType<import('../props/ingredients/sliceableBamboo.js').createSliceableBamboo>} deps.sliceable   mounted under rawIngredients.group (the board frame), hidden until this beat swaps it in
 * @param {ReturnType<import('../props/ingredients/rawIngredients.js').createRawIngredients>} deps.rawIngredients
 * @param {gsap.core.Timeline} deps.miseTimeline  the mise-en-place timeline (start camera pose, paw + tag state)
 * @param {object} deps.panda            panda-kit Panda (chef outfit equipped)
 * @param {THREE.Object3D} deps.knife
 * @param {ReturnType<import('./openingTimeline.js').createOpening>} deps.opening  master owner: used to read the end-of-opening Panda pose and to take over the knife
 * @param {THREE.Scene} deps.scene
 * @param {{lights?: object, spot?: THREE.SpotLight}} [deps.lighting]
 * @param {THREE.FogExp2|null} [deps.fog]               scene fog created with density 0 (so no shader recompile); this beat drives its density (the warm haze)
 * @param {HTMLElement|null} [deps.vignetteElement]     DOM vignette; opacity written absolutely
 * @returns {gsap.core.Timeline} paused, CHOP_DURATION s. `tl.chop` = { apply, state, impacts, ... }
 */
export function createAsmrChopTimeline({ cameraRig, sliceable, rawIngredients, miseTimeline, panda, knife, opening, scene, lighting = null, fog = null, vignetteElement = null }) {
  const T = CHOP_TIMES, D = T.duration, camera = cameraRig.camera, marks = cameraRig.marks ?? CAMERA_MARKS, frame = rawIngredients.group, mise = miseTimeline.mise;
  frame.updateWorldMatrix(true, false);
  const O = frame.getWorldPosition(new THREE.Vector3()), shift = O.clone().sub(V(MARK_BOARD_ORIGIN));
  const LY = sliceable.group.rotation.y;   // the sliceable's own +z (tip direction) is rotated by LY about y into the board frame (PI/2 -> along board +x, like the cone it replaces)
  const N = CHOP_COUNT; if (sliceable.count < N) throw new Error('asmrChopBeat: sliceable needs ' + N + ' slices');
  const ROOT = new THREE.Vector3(O.x + STANCE.dx, 0, O.z + STANCE.dz), YAW = new THREE.Vector3(0, 1, 0);   // Panda root, world
  const toWorld = (v) => v.clone().applyAxisAngle(YAW, STANCE.yaw).add(ROOT), toLocal = (v) => v.clone().sub(ROOT).applyAxisAngle(YAW, -STANCE.yaw);   // Panda-local <-> world (stance yaw about y)

  // ------------------------------------------------------------------ cameras (poses are position + quaternion + fov, so slerps never hit the top-down gimbal)
  const tmpCam = new THREE.PerspectiveCamera();
  const poseLook = (p, l, fov, up = [0, 1, 0]) => { tmpCam.up.set(...up); tmpCam.position.copy(p); tmpCam.lookAt(l); return { p: p.clone(), q: tmpCam.quaternion.clone(), fov }; };
  const m13 = mise.marks.P13;
  const start = (() => { tmpCam.up.set(0, 0, -1); tmpCam.position.copy(m13.p); tmpCam.lookAt(m13.l); tmpCam.rotateX(PREP_TILT_DEG * Math.PI / 180); return { p: m13.p.clone(), q: tmpCam.quaternion.clone(), fov: m13.fov }; })();   // exactly where the mise beat leaves the camera
  const nudge = V(M14_FRAMING_NUDGE), m14d = marks.M14_macro_chop_side, m15d = marks.M15_panda_wink_closeup;
  const M14 = poseLook(V(m14d.position).add(shift).add(nudge), V(m14d.lookAt).add(shift).add(nudge), m14d.fov);
  const M15 = poseLook(toWorld(V(m15d.position)), toWorld(V(m15d.lookAt)), m15d.fov);
  const _qa = new THREE.Quaternion(), _p = new THREE.Vector3(), _v = new THREE.Vector3(), _roll = new THREE.Quaternion(), _zAxis = new THREE.Vector3(0, 0, 1);
  const bez = (a, m, b, u, out) => out.copy(a).multiplyScalar((1 - u) * (1 - u)).addScaledVector(m, 2 * (1 - u) * u).addScaledVector(b, u * u);
  const whipMid = start.p.clone().lerp(M14.p, 0.55).add(new THREE.Vector3(0.35, 0, 0)), sweepMid = M14.p.clone().lerp(M15.p, 0.5).add(new THREE.Vector3(0.3, 0.12, 0.0));

  // ------------------------------------------------------------------ knife geometry facts (measured, so the edge lands exactly on the board)
  knife.updateMatrixWorld(true);
  const edgeX = (() => { const inv = new THREE.Matrix4().copy(knife.matrixWorld).invert(), v = new THREE.Vector3(); let min = Infinity;
    knife.traverse((o) => { if (!o.isMesh || !o.geometry.attributes.position) return; const pos = o.geometry.attributes.position, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); if (Math.abs(v.y - KNIFE_POSE.contactY) < 0.012) min = Math.min(min, v.x); } });
    return Number.isFinite(min) ? min : -0.072; })();
  const EDGE_LOCAL = new THREE.Vector3(edgeX, KNIFE_POSE.contactY, 0);   // the point of the straight edge that meets the board (knife-local)

  // knife basis for pitch phi (tip up +) and yaw psi (about world Y): local +Y = blade direction, local -X = edge direction (down), local +Z = X x Y
  const _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3(), _m4 = new THREE.Matrix4();
  function knifeQuat(phi, psi, out) {
    _Y.set(Math.cos(phi) * Math.cos(psi), Math.sin(phi), Math.cos(phi) * Math.sin(psi));
    _X.set(-Math.sin(phi) * Math.cos(psi), Math.cos(phi), -Math.sin(phi) * Math.sin(psi));   // = -edge
    _Z.crossVectors(_X, _Y); _m4.makeBasis(_X, _Y, _Z); return out.setFromRotationMatrix(_m4);
  }
  const kerfL = (kk) => sliceable.cutPoint(0).z - sliceable.pitch * kk;   // continuous kerf coordinate along the log axis: kk = i -> the cut between slice i and i + 1
  const contactAt = (kk, ks, out) => { const zl = kerfL(clamp01(kk / (N - 1)) * (N - 1)); return out.set(O.x + Math.sin(LY) * zl, O.y + KNIFE_POSE.lift * ks, O.z + Math.cos(LY) * zl); };
  const chopQuat = (ks, out) => knifeQuat(KNIFE_POSE.pitchDown + (KNIFE_POSE.pitchUp - KNIFE_POSE.pitchDown) * ks, KNIFE_POSE.yaw, out);
  const flourishQuat = knifeQuat(Math.PI / 2, Math.PI / 2, new THREE.Quaternion());   // blade up, flat face to the finale camera (looking -x), edge towards screen-left

  // ------------------------------------------------------------------ Panda: stage wrapper, end-of-opening capture, build-time arm IK tables
  const stage = new THREE.Group(); stage.name = 'pandaStage'; stage.matrixAutoUpdate = false; scene.add(stage); stage.add(panda.root);
  const R = panda.rig, rest = panda.restSnapshot, S = R.shoulderR, Eb = R.elbowR, hand = panda.sockets.handSocketR;
  const JOINTS = ['chest', 'spine', 'shoulderR', 'elbowR', 'head'];
  opening.seek(OPENING_END);   // read the Panda exactly as the opening leaves him (forward seek from the reset state: deterministic)
  const endPose = Object.fromEntries(JOINTS.map((k) => [k, R[k].rotation.clone()])), endFace = { ...panda.face.state }, endRoot = { p: panda.root.position.clone(), r: panda.root.rotation.clone(), s: panda.root.scale.clone() };
  const hv = new THREE.Vector3();
  function solve(target, twist, lean, guess) {   // target: Panda-root-local; root sits at the origin facing +z while solving
    R.chest.rotation.y = rest.chest.r[1] + twist; R.spine.rotation.x = rest.spine.r[0] + lean;
    const cost = (sx, sz, ex) => { S.rotation.set(rest.shoulderR.r[0] + sx, rest.shoulderR.r[1], rest.shoulderR.r[2] + sz); Eb.rotation.set(rest.elbowR.r[0] + ex, rest.elbowR.r[1], rest.elbowR.r[2]); S.updateMatrixWorld(true); hand.getWorldPosition(hv); return hv.distanceTo(target); };
    let best = guess ? guess.slice() : [0, 0, 0], bc = guess ? cost(...best) : Infinity;
    if (!guess) for (let sx = -2.8; sx <= 0.4; sx += 0.2) for (let sz = -1.2; sz <= 0.2; sz += 0.2) for (let ex = -2.4; ex <= 0.2; ex += 0.2) { const c = cost(sx, sz, ex); if (c < bc) { bc = c; best = [sx, sz, ex]; } }
    for (let step = 0.1; step > 0.0015; step *= 0.6) for (let it = 0; it < 60; it++) { let moved = false; for (let k = 0; k < 3; k++) for (const d of [-step, step]) { const c2 = best.slice(); c2[k] += d; const c = cost(...c2); if (c < bc) { bc = c; best = c2; moved = true; } } if (!moved) break; }
    return { a: best, err: bc };
  }
  const gripFor = (kk, ks, out) => { const C = contactAt(kk, ks, new THREE.Vector3()), q = chopQuat(ks, new THREE.Quaternion()); return out.copy(C).sub(EDGE_LOCAL.clone().applyQuaternion(q)); };   // knife grip (world) that puts the edge point on C
  let tables = null, worstErr = Infinity, posture = POSTURES[0];
  {
    const saveRoot = { pos: panda.root.position.clone(), rot: panda.root.rotation.clone(), scale: panda.root.scale.clone() };
    panda.root.position.set(0, 0, 0); panda.root.rotation.set(0, 0, 0); panda.root.scale.setScalar(panda.options.scale ?? 1); stage.matrix.identity(); stage.updateMatrixWorld(true);
    const g = new THREE.Vector3(), build = (tw, ln) => {   // the whole table for one posture (continuation from the previous solution keeps the elbow on one branch)
      const tb = []; let worst = 0, prevI = null;
      TABLE_ANCHORS.forEach((ai, ia) => { const row = []; for (let m = 0; m < TABLE_SAMPLES; m++) { const ks = m / (TABLE_SAMPLES - 1); gripFor(ai, ks, g); const tgt = toLocal(g);
        const guess = ia > 0 ? prevI[m].a : m > 0 ? row[m - 1].a : null, r = solve(tgt, tw, ln + 0.07 * (1 - ks), guess); /* the runtime spine lean into every strike is part of the solved pose */ worst = Math.max(worst, r.err); row.push(r); } tb.push(row); prevI = row; });
      tb.worst = worst; return tb; };
    for (const [tw, ln] of POSTURES) { const tb = build(tw, ln); if (tb.worst < worstErr) { worstErr = tb.worst; tables = tb; posture = [tw, ln]; } if (worstErr < 0.004) break; }
    const fl = solve(V(FLOURISH_HAND), 0, 0, tables[0][TABLE_SAMPLES - 1].a); worstErr = Math.max(worstErr, fl.err); tables.flourish = fl;
    panda.root.position.copy(saveRoot.pos); panda.root.rotation.copy(saveRoot.rot); panda.root.scale.copy(saveRoot.scale);
  }
  opening.seek(0);   // back to the reset state (the master is rebuilt by the caller anyway)

  const angles = (kk, ks, out) => {   // pure bilinear table lookup: chop index x knife height
    const kc = Math.min(8, Math.max(0, kk)), a = Math.min(7, Math.floor(kc)), fa = kc - a, sM = clamp01(ks) * (TABLE_SAMPLES - 1), m = Math.min(TABLE_SAMPLES - 2, Math.floor(sM)), fm = sM - m;
    for (let j = 0; j < 3; j++) { const lo = tables[a][m].a[j] + (tables[a][m + 1].a[j] - tables[a][m].a[j]) * fm, hi = tables[a + 1][m].a[j] + (tables[a + 1][m + 1].a[j] - tables[a + 1][m].a[j]) * fm; out[j] = lo + (hi - lo) * fa; }
    return out;
  };

  // ------------------------------------------------------------------ scene objects this beat drives
  const flecks = createBambooFlecks(), fleckFrame = new THREE.Group(); fleckFrame.name = 'fleckFrame'; fleckFrame.rotation.y = LY; frame.add(fleckFrame); fleckFrame.add(flecks.mesh);   // same frame as the sliceable (kerf points are in log-local coordinates)
  const clearIds = ['bamboo_shoot'];   // ONLY the solid bamboo cone is swapped for the sliceable (same board coordinates); the other 11 mise-en-place ingredients stay on the board all through the chop
  const cleared = clearIds.flatMap((id) => rawIngredients.ingredientsMap.get(id).parts.flatMap((p) => [p.root, p.shadow].filter(Boolean)));
  const contact = scene.getObjectByName('contactShadow') ?? null;
  const dim = Object.values(lighting?.lights ?? {}).flat().filter((l) => l && l.isLight && l !== lighting?.spot).map((l) => ({ l, base: l.intensity }));
  const pawEnd = mise.hoverPrep, pawDir = mise.dir, pawL = mise.paws.left.root, pawR = mise.paws.right.root;
  const kidx = Array.from({ length: N }, (_, i) => sliceable.cutPoint(i));   // board-frame kerf points

  // ------------------------------------------------------------------ the timeline: plain progress scalars only
  const s = { whip: 0, focus: 0, ks: 1, kk: 0, fl: 0, cam2: 0, spin: 0, look: 0, smirk: 0, wink: 0 }; for (let i = 0; i < N; i++) { s['tp' + i] = 0; s['fx' + i] = 0; s['sh' + i] = 0; }
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });
  const ft = (k, from, to, a, dur, ease) => tl.fromTo(s, { [k]: from }, { [k]: to, duration: dur, ease, immediateRender: false }, a);
  ft('whip', 0, 1, T.whip[0], T.whip[1] - T.whip[0], 'power3.inOut');
  ft('focus', 0, 1, T.focusIn[0], T.focusIn[1] - T.focusIn[0], 'sine.inOut'); ft('focus', 1, 0, T.focusOut[0], T.focusOut[1] - T.focusOut[0], 'sine.inOut');
  for (let i = 0; i < N; i++) {
    const c = T.firstStrike + T.stride * i, I = c + T.strike;
    ft('ks', 1, 0, c, T.strike, 'power3.in');                                                         // the strike: fast, accelerating into the board
    ft('ks', 0, 1, c + T.strike + T.rest, T.raise, 'power2.out');                                     // raise (after the last chop it leads into the flourish)
    if (i < N - 1) ft('kk', i, i + 1, c + T.strike + T.rest, T.raise, 'sine.inOut');                  // ... sliding back to the next kerf
    ft('tp' + i, 0, 1, I, T.tip, 'none'); ft('fx' + i, 0, 1, I, T.burst, 'none'); ft('sh' + i, 0, 1, I, T.shake, 'none');
  }
  ft('fl', 0, 1, T.flourish[0], T.flourish[1] - T.flourish[0], 'sine.inOut');
  ft('cam2', 0, 1, T.sweep[0], T.sweep[1] - T.sweep[0], 'power2.inOut');   // smooth 0.6 s recovery: M14 macro -> medium framing for the flourish + wink
  ft('look', 0, 1, T.look[0], T.look[1] - T.look[0], 'sine.inOut'); ft('smirk', 0, 1, T.smirk[0], T.smirk[1] - T.smirk[0], 'sine.inOut');
  ft('spin', 0, 1, T.spin[0], T.spin[1] - T.spin[0], 'sine.inOut'); ft('wink', 0, 1, T.wink[0], T.wink[1] - T.wink[0], 'power2.out');
  tl.to({}, { duration: D - tl.duration() }, tl.duration());

  // ------------------------------------------------------------------ the single writer
  const FACE_KEYS = Object.keys(resolveFace('neutral')), fA = resolveFace('determined'), fB = resolveFace('smug'), fC = resolveFace('winkRight');
  const eIn = E('power2.in'), ang = [0, 0, 0], ang0 = [0, 0, 0], _cq = new THREE.Quaternion(), _fq = new THREE.Quaternion(), _spin = new THREE.Quaternion(), _C = new THREE.Vector3(), _grip = new THREE.Vector3(), _edge = new THREE.Vector3(), _stage = new THREE.Matrix4(), _T = new THREE.Matrix4(), _hq = new THREE.Quaternion(), _hs = new THREE.Vector3(), _lp = new THREE.Vector3(), knifeHome = knife.parent, knifeHomeScale = knife.scale.clone();
  const dbg = { edge: new THREE.Vector3(), contact: new THREE.Vector3(), hand: new THREE.Vector3(), wink: 0 };

  function restorePanda() {   // not in this beat (or before the Panda is on): every joint this beat writes goes back to the end-of-opening value
    stage.matrix.identity(); stage.matrixWorldNeedsUpdate = true;
    for (const k of JOINTS) R[k].rotation.copy(endPose[k]);
    Object.assign(panda.face.state, endFace); panda.face.apply();
  }

  function apply() {
    const t = tl.time(), started = t > 0, w = s.whip, f = s.focus;
    // --- mood: the kitchen dims, a warm haze swallows the far room, the vignette closes in (cheap depth of field)
    for (const d of dim) d.l.intensity = d.base * (1 - 0.3 * f);
    if (fog) fog.density = 0.32 * f;
    if (vignetteElement) vignetteElement.style.opacity = String(0.7 * f);

    // --- props: the solid cone is swapped for the sliceable bamboo mid-whip (everything else on the board stays put)
    const swapped = started && w > 0.5;
    for (const o of cleared) o.visible = !swapped;
    sliceable.group.visible = swapped; for (let i = 0; i < N; i++) sliceable.setSliceTip(i, started ? s['tp' + i] : 0);
    for (const m of mise.tagMeshes) m.visible = !started && m.material.opacity > 0.001;
    // --- floating paws from the mise beat retreat out of frame during the first 0.3 s of the whip
    const pu = started ? clamp01(t / T.pandaIn) : 0, back = eIn(pu);
    for (const [paw, side] of [[pawL, 'L'], [pawR, 'R']]) { paw.position.copy(pawEnd[side]).addScaledVector(pawDir[side], 1.5 * back).add(_p.set(0, 0.35 * back, 0)); paw.rotation.set(mise.pawEulerEnd.x, Math.atan2(pawDir[side].x, pawDir[side].z), 0); paw.visible = pu < 1; }

    // --- camera
    const shakeY = (() => { let y = 0; for (let i = 0; i < N; i++) { const u = s['sh' + i]; if (u > 0 && u < 1) y += SHAKE_Y * Math.sin(Math.PI * (1 - Math.pow(1 - u, 3))); } return y; })();   // quick dip, slow return, exactly 0 at both ends
    const u = w;   // whip progress (already eased by the tween)
    bez(start.p, whipMid, M14.p, u, _p); _qa.slerpQuaternions(start.q, M14.q, u);
    const punch = Math.pow(Math.sin(Math.PI * sm(0.25, 0.75, u)), 2);
    let fov = start.fov + (M14.fov - start.fov) * u + 8 * punch; _roll.setFromAxisAngle(_zAxis, -2.5 * Math.PI / 180 * punch); _qa.multiply(_roll);
    if (s.cam2 > 0) { const c = s.cam2; bez(M14.p, sweepMid, M15.p, c, _p); _qa.slerpQuaternions(M14.q, M15.q, c); fov = M14.fov + (M15.fov - M14.fov) * c; }   // second move: M14 -> M15 (arc round the board to face the Panda)
    camera.up.set(0, 1, 0); camera.position.copy(_p); camera.position.y += shakeY; camera.quaternion.copy(_qa); camera.fov = fov; camera.updateProjectionMatrix();

    // --- flecks
    flecks.mesh.visible = started; for (let i = 0; i < N; i++) flecks.setBurst(i, _C.set(kidx[i].x, kidx[i].y, kidx[i].z), started ? s['fx' + i] : 0);

    // --- Panda + knife
    const on = started && w > 0.3;   // the Panda + knife pop in once the whip is well under way (hidden by the motion)
    panda.root.visible = on; knife.visible = on; if (contact) contact.visible = !started;
    if (!on) { if (knife.parent !== knifeHome) { knifeHome.add(knife); knife.scale.copy(knifeHomeScale); } restorePanda(); return; }   // hidden: every joint it writes is pinned to its end-of-opening value (so hidden state is a pure function of time too)
    // stage: root world position = ROOT, facing +z, whatever the opening left in the root's own transform (stable after the opening ends)
    panda.root.updateMatrix(); _stage.copy(_T.makeTranslation(ROOT.x, ROOT.y, ROOT.z)).multiply(_T.makeRotationY(STANCE.yaw)).multiply(_T.copy(panda.root.matrix).invert()); stage.matrix.copy(_stage); stage.matrixWorldNeedsUpdate = true;
    const kk = s.kk, ks = s.ks, fl = s.fl;
    angles(kk, ks, ang); const fa = tables.flourish.a;
    R.chest.rotation.y = rest.chest.r[1] + posture[0] * (1 - fl); R.spine.rotation.x = rest.spine.r[0] + (posture[1] + 0.07 * (1 - ks)) * (1 - fl);   // leans into every strike
    S.rotation.set(rest.shoulderR.r[0] + ang[0] + (fa[0] - ang[0]) * fl, rest.shoulderR.r[1], rest.shoulderR.r[2] + ang[1] + (fa[1] - ang[1]) * fl);
    Eb.rotation.set(rest.elbowR.r[0] + ang[2] + (fa[2] - ang[2]) * fl, rest.elbowR.r[1], rest.elbowR.r[2]);
    // head: eyes on the cut, then up to the lens; face: determined -> smug smirk -> wink
    R.head.rotation.set(0.3 * (1 - s.look), -0.15 * (1 - s.look), 0);
    const fs = panda.face.state; for (const k of FACE_KEYS) { const a = fA[k] + (fB[k] - fA[k]) * s.smirk; fs[k] = a + (fC[k] - a) * s.wink; }
    fs.lookX = 0; fs.lookY = -0.55 * (1 - s.look); panda.face.apply();
    stage.updateMatrixWorld(true);
    // knife: the edge point rides the contact path exactly; the paw (FK) follows the same path to within the solver's tolerance
    hand.getWorldPosition(_grip); chopQuat(ks, _cq); contactAt(kk, ks, _C);
    _edge.copy(EDGE_LOCAL).applyQuaternion(_cq).add(_grip); _grip.addScaledVector(_edge.sub(_C), -(1 - sm(0, 0.02, fl)));   // shift the knife (not the paw) by the residual so the edge sits on the path
    _fq.copy(flourishQuat).multiply(_spin.setFromAxisAngle(_zAxis, s.spin * (Math.PI * 2 + 0.26)));
    _cq.slerp(_fq, fl);
    // the knife is a CHILD of the paw socket for the whole beat: its local position is the (sub-millimetre) edge correction, its local rotation puts the blade where the chop / flourish wants it, and the spin about local Z is baked into that rotation
    if (knife.parent !== hand) hand.add(knife);
    hand.updateWorldMatrix(true, false); hand.getWorldQuaternion(_hq).invert(); hand.getWorldScale(_hs); hand.worldToLocal(_lp.copy(_grip));
    knife.position.copy(_lp); knife.quaternion.copy(_hq.multiply(_cq)); knife.scale.set(1 / _hs.x, 1 / _hs.y, 1 / _hs.z); knife.updateMatrixWorld(true);
    dbg.edge.copy(EDGE_LOCAL).applyMatrix4(knife.matrixWorld); dbg.contact.copy(_C); dbg.hand.copy(hand.getWorldPosition(hv)); dbg.wink = s.wink;
  }

  // --- build: evaluate the whole range once so every scalar owns its start value, then leave the world exactly as the previous beat left it
  const saved = { cam: { p: camera.position.clone(), up: camera.up.clone(), fov: camera.fov, q: camera.quaternion.clone() }, vis: cleared.map((o) => o.visible), sv: sliceable.group.visible, fv: flecks.mesh.visible, pawVis: [pawL.visible, pawR.visible], pawP: [pawL.position.clone(), pawR.position.clone()], dim: dim.map((d) => d.l.intensity), fog: fog ? fog.density : 0, vig: vignetteElement ? vignetteElement.style.opacity : null, tags: mise.tagMeshes.map((m) => m.visible), pv: panda.root.visible, kv: knife.visible, kpar: knife.parent, cv: contact ? contact.visible : true, kp: knife.position.clone(), kq: knife.quaternion.clone() };
  tl.eventCallback('onUpdate', apply);
  tl.progress(1).progress(0); apply();
  cleared.forEach((o, i) => { o.visible = saved.vis[i]; }); sliceable.group.visible = saved.sv; flecks.mesh.visible = saved.fv; pawL.visible = saved.pawVis[0]; pawR.visible = saved.pawVis[1]; pawL.position.copy(saved.pawP[0]); pawR.position.copy(saved.pawP[1]);
  dim.forEach((d, i) => { d.l.intensity = saved.dim[i]; }); if (fog) fog.density = saved.fog; if (vignetteElement) vignetteElement.style.opacity = saved.vig ?? '0'; mise.tagMeshes.forEach((m, i) => { m.visible = saved.tags[i]; });
  panda.root.visible = saved.pv; knife.visible = saved.kv; if (contact) contact.visible = saved.cv; if (knife.parent !== saved.kpar) { saved.kpar.add(knife); knife.scale.copy(knifeHomeScale); } knife.position.copy(saved.kp); knife.quaternion.copy(saved.kq);
  camera.position.copy(saved.cam.p); camera.up.copy(saved.cam.up); camera.fov = saved.cam.fov; camera.quaternion.copy(saved.cam.q); camera.updateProjectionMatrix();

  tl.chop = { apply, state: s, duration: D, times: T, impacts: Array.from({ length: N }, (_, i) => impactTime(i)), debug: dbg, tables, ikWorstError: worstErr, posture, marks: { start, M14, M15 }, stage, flecks, root: ROOT, edgeX,
    dispose() { flecks.dispose(); fleckFrame.removeFromParent(); if (knife.parent !== knifeHome) { knifeHome.add(knife); knife.scale.copy(knifeHomeScale); } stage.removeFromParent(); } };
  return tl;
}
