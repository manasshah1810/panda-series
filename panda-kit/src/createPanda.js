import * as THREE from 'three';
import { TIERS, PROPORTIONS as P } from './config/defaults.js';
import { buildRig, snapshotRig, restoreRig } from './rig/buildRig.js';
import { buildSockets, measure } from './rig/sockets.js';
import { createMaterials } from './materials/index.js';
import { buildTorso } from './geometry/body.js';
import { buildNeck } from './geometry/neck.js';
import { buildHeadShell } from './geometry/head.js';
import { buildEar } from './geometry/ears.js';
import { buildArmSegments, taperedTube, buildPaw, buildLeg, buildFoot } from './geometry/limbs.js';
import { buildTail } from './geometry/tail.js';
import { mergeParts, M4, ellipsoidGeo } from './geometry/helpers.js';
import { buildFace } from './geometry/face.js';
import { createFaceController } from './face/faceController.js';
import { startTalk } from './face/talk.js';
import { bakeAO, ensureColor } from './geometry/ao.js';
import { poseTween, applyPose, gripPose } from './poses/applyPose.js';
import { POSES } from './poses/poses.js';
import { squash } from './rig/constraints.js';
import * as ANIMS from './animations/index.js';
import { equipOutfit } from './outfits/equip.js';
import { attachProp as attachPropImpl } from './props/socketAttach.js';
import { GRIPS } from './poses/applyPose.js';
import { makeFuzzShells } from './materials/fuzzShells.js';
import { makeOutlineMaterial } from './materials/toon.js';

const BELLY_Y = P.torso.belly.y;
const BODY_KEYS = ['hips','spine','chest','neck','head','belly','tail','shoulderL','shoulderR','upperArmL','upperArmR','elbowL','elbowR','pawL','pawR','hipL','hipR','legL','legR','ankleL','ankleR','footL','footR'];
const OUTLINE_PARTS = /^(torso|neck|head|muzzle|tailMesh|ear[LR]|upperArm|foreArm|paw[LR]|thumb|leg|foot|cheekPuff)/;

/**
 * @typedef {Object} PandaOptions
 * @property {'high'|'medium'|'low'} [quality]
 * @property {'softClay'|'toon'} [style]
 * @property {number} [scale]
 * @property {boolean} [castShadow]
 * @property {boolean} [receiveShadow]
 * @property {number} [seed]
 */
export function createPanda(options = {}) {
  const opts = { quality: 'high', style: 'softClay', scale: 1, castShadow: true, receiveShadow: true, seed: 1, pose: 'neutralStand', ...options };
  const rig = buildRig();
  const sockets = buildSockets(rig);
  const root = rig.root;
  root.scale.setScalar(opts.scale);
  const bodyRest = snapshotRig(rig);
  let restSnapshot = null;
  let tierName = opts.quality;
  let matsBundle = createMaterials(opts);
  let owned = []; // meshes created by populate(), removed on setQuality
  const ears = {};
  const outfits = new Map(); // id -> record (see outfits/equip.js)
  let faceParts = null;
  const face = createFaceController(rig, () => faceParts);

  function add(parent, obj) { parent.add(obj); owned.push(obj); return obj; }

  function populate() {
    const tier = TIERS[tierName]; const mats = matsBundle.mats;
    const spineY = BELLY_Y;
    if (tier.lite) { // lite: tail baked into the torso (no tail wag) to save a draw call
      const t = buildTorso(tier, mats, spineY), tl = buildTail(tier, mats);
      const merged = mergeParts([{ geo: t.geometry }, { geo: tl.geometry, matrix: M4([P.tail.center[0], P.tail.center[1] - spineY, P.tail.center[2]]) }], mats.torso, 'torso'); merged.userData.pandaPart = 'torso';
      add(rig.belly, merged);
    } else add(rig.belly, buildTorso(tier, mats, spineY));
    add(rig.neck, buildNeck(tier, mats));
    add(rig.head, buildHeadShell(tier, mats));
    for (const side of ['L', 'R']) {
      const ear = add(rig.head, buildEar(side, tier, mats)); ears[side] = ear; rig['ear' + side] = ear; rig['earFlop' + side] = ear.userData.flop;
      { const o = new THREE.Object3D(); o.name = 'earSocket' + side; ear.userData.flop.children[0].add(o); sockets[o.name] = o; }
      const arm = buildArmSegments(side, tier, mats);
      add(rig['upperArm' + side], arm.upper); add(rig['elbow' + side], arm.fore);
      const paw = buildPaw(side, tier, mats); paw.group.position.y = P.arm.pawY; add(rig['paw' + side], paw.group); rig['pawMesh' + side] = paw.group; rig['thumb' + side] = paw.thumb;
      add(rig['leg' + side], buildLeg(side, tier, mats).leg);
      const foot = buildFoot(side, tier, mats); foot.position.set(0, -0.05, 0.08); add(rig['foot' + side], foot);
    }
    if (faceParts) faceParts.mouth.dispose();
    faceParts = buildFace(rig, tier, mats); owned.push(...faceParts.owned);
    if (!tier.lite) { const t = buildTail(tier, mats); t.position.set(0, 0, -0.1); add(rig.tail, t); }
    finishMaterials(tier);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow && opts.castShadow && tier.shadows; o.receiveShadow = opts.receiveShadow; } });
  }
  function finishMaterials(tier) {
    // 1) bake AO + colour attribute on vertex-coloured fur parts (evaluated in REST pose)
    const cur = snapshotRig(rig); const sub = {}; for (const k of BODY_KEYS) sub[k] = bodyRest[k];
    restoreRig(rig, sub); root.updateMatrixWorld(true);
    const rootInv = root.matrixWorld.clone().invert();
    const cream = [0.985, 0.961, 0.929];
    root.traverse((o) => {
      if (!o.isMesh || !o.material.vertexColors) return;
      const n = o.userData.pandaPart || '';
      if (!/^(torso|neck|head|tailMesh|upperArm|foreArm|paw[LR]|thumb|leg|foot[LR])/.test(n)) return;
      const kind = n === 'torso' || n === 'neck' ? 'torso' : n === 'head' ? 'head' : n === 'tailMesh' ? 'tail' : 'limb';
      bakeAO(o, kind, { rootInv, cream: n === 'torso' ? cream : null });
    });
    for (const k of BODY_KEYS) { const g = rig[k]; const c = cur[k]; g.position.fromArray(c.p); g.rotation.set(...c.r); g.scale.fromArray(c.s); }
    root.traverse((o) => o.isMesh && o.material.vertexColors && ensureColor(o));
    // 2) toon: inverted-hull outline; softClay/high: fuzz shells
    if (matsBundle.outline && tier.outline && opts.outline !== false) {
      const targets = []; root.traverse((o) => { if (o.isMesh && OUTLINE_PARTS.test(o.userData.pandaPart || '')) targets.push(o); });
      for (const t of targets) { const ol = new THREE.Mesh(t.geometry, matsBundle.outline); ol.name = 'outline'; ol.userData.isOutline = true; t.add(ol); owned.push(ol); }
    }
    if (tier.fuzzShells > 0 && opts.fuzz !== false && matsBundle.style === 'softClay') {
      // fuzz halo: low-res copies of head/torso (white) and arms (black); shared materials so the material count stays small
      const T = tier.fuzzTier, white = matsBundle.fuzzWhite, black = matsBundle.fuzzBlack, nul = { head: null, fur: null, torso: null, limb: null };
      const put = (parent, geo, mat, pos) => { const m = makeFuzzShells(geo, mat, { shells: tier.fuzzShells }); if (pos) m.position.copy(pos); parent.add(m); owned.push(m); };
      const hg = ellipsoidGeo(P.head.radii, T.seg, T.rad); hg.translate(P.head.center[0] - P.joints.head[0], P.head.center[1] - P.joints.head[1], P.head.center[2] - P.joints.head[2]);
      put(rig.head, hg, white);
      put(rig.belly, buildTorso(T, nul, BELLY_Y).geometry, white);
      if (tier.fuzzArms) for (const side of ['L', 'R']) {
        const aT = { small: 3, lite: true }, f = (len, r0, r1) => taperedTube(len, r0, r1, aT), ak = { shells: tier.fuzzArmShells };
        for (const [parent, g] of [[rig['upperArm' + side], f(P.arm.upperLen, P.arm.upperR, P.arm.elbowR)], [rig['elbow' + side], f(P.arm.foreLen, P.arm.elbowR, P.arm.wristR)]]) { const m = makeFuzzShells(g, black, ak); parent.add(m); owned.push(m); }
      }
    }
  }
  const mats0 = () => ({ torso: null, head: null });
  function clear() {
    for (const o of owned) { o.removeFromParent(); o.traverse((c) => { if (c.userData.isOutline) return; c.geometry && c.geometry.dispose(); }); if (o.userData.materials) o.userData.materials.forEach((m) => m.dispose()); }
    owned = [];
  }
  populate();
  face.apply();
  restSnapshot = snapshotRig(rig);
  const panda = {
    root, rig, sockets, options: opts,
    get quality() { return tierName; },
    measure,
    setQuality(tier) {
      if (!TIERS[tier]) throw new Error('Unknown quality tier ' + tier);
      const worn = [...outfits.values()].map((r) => r.outfit); worn.forEach((o) => outfits.get(o.id).unequip());   // ear sockets are rebuilt, so re-wear after
      tierName = tier; clear(); populate(); face.apply(); worn.forEach((o) => panda.equip(o)); return panda;
    },
    equip(outfit) { return equipOutfit(panda, outfit, outfits); },
    unequip(id) { outfits.get(id)?.unequip(); },
    get outfits() { return [...outfits.keys()]; },
    attachProp(object3D, socketName, options) { return attachPropImpl(panda, object3D, socketName, options); },
    _grip: { L: 'relaxed', R: 'relaxed' },
    stats() {
      let tris = 0, meshes = 0; const mats = new Set();
      root.traverse((o) => { if (o.isMesh && o.visible) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; mats.add(o.material); } });
      return { triangles: Math.round(tris), drawCalls: meshes, materials: mats.size };
    },
    face, poseNames: Object.keys(POSES),
    pose(name, duration = 0.8) { return poseTween(panda, name, duration); },
    _applyPose(name) { return applyPose(panda, name); },
    gripPose(side, name, duration = 0.3) { panda._grip[side] = name; return gripPose(panda, side, name, duration); },
    squash(amount, duration) { return squash(panda, amount, duration); },
    anim: null,
    talk(source) { return startTalk(face, source); },
    update(dt) { face.update(dt, rig.head); },
    dispose() { [...outfits.values()].forEach((r) => r.unequip()); if (faceParts) faceParts.mouth.dispose(); clear(); matsBundle.dispose(); root.removeFromParent(); },
    get restSnapshot() { return restSnapshot; },
  };
  // each built timeline is rendered once to 1 and back to 0 so every tween start value is captured from the rest state
  panda.anim = Object.fromEntries(Object.entries(ANIMS).filter(([, f]) => typeof f === 'function').map(([n, f]) => [n, (o) => { const tl = f(panda, o); tl.progress(1, true).progress(0, true); panda.face.apply(); return tl; }]));
  if (opts.pose && opts.pose !== 'neutralStand') panda._applyPose(opts.pose);
  return panda;
}
