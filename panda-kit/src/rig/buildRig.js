import * as THREE from 'three';
import { PROPORTIONS as P, REST } from '../config/defaults.js';

const W = (x, y, z) => new THREE.Vector3(x, y, z);

/** Builds the named pivot hierarchy. Each pivot is a Group positioned at its joint; meshes hang beneath.
 *  root > hips > spine > chest > neck > head > (earL, earR, jaw, browL, browR, eyeL, eyeR, lidL, lidR)
 *  chest > shoulderX > upperArmX > elbowX > pawX ; hips > hipX > legX > ankleX > footX ; hips > tail ; spine > belly */
export function buildRig() {
  const rig = {};
  const root = new THREE.Group(); root.name = 'pandaRoot';
  const mk = (name, parent, worldPos, parentWorld) => {
    const g = new THREE.Group(); g.name = name;
    g.position.copy(worldPos).sub(parentWorld);
    parent.add(g); rig[name] = g;
    return g;
  };
  const J = P.joints;
  const jw = (k) => W(...J[k]);
  rig.root = root;
  mk('hips', root, jw('hips'), W(0, 0, 0));
  mk('spine', rig.hips, jw('spine'), jw('hips'));
  mk('chest', rig.spine, jw('chest'), jw('spine'));
  mk('neck', rig.chest, jw('neck'), jw('chest'));
  mk('head', rig.neck, jw('head'), jw('neck'));
  mk('belly', rig.spine, W(...P.belly.center), jw('spine'));
  for (const n of ['jaw', 'browL', 'browR', 'eyeL', 'eyeR', 'lidL', 'lidR']) {
    const g = new THREE.Group(); g.name = n; rig.head.add(g); rig[n] = g;
  }
  // ears get their own pivots from geometry/ears.js (positioned there); placeholders replaced in createPanda
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const sw = W(s * P.shoulder.x, P.shoulder.y, 0);
    mk('shoulder' + side, rig.chest, sw, jw('chest'));
    mk('upperArm' + side, rig['shoulder' + side], sw, sw);
    const elbowW = sw.clone().add(W(0, -P.arm.upperLen, 0));
    mk('elbow' + side, rig['upperArm' + side], elbowW, sw);
    const wristW = elbowW.clone().add(W(0, -P.arm.foreLen, 0));
    mk('paw' + side, rig['elbow' + side], wristW, elbowW);
    const hw = W(s * P.hip.x, P.hip.y, 0);
    mk('hip' + side, rig.hips, hw, jw('hips'));
    mk('leg' + side, rig['hip' + side], hw, hw);
    const aw = hw.clone().add(W(0, -0.38, 0));
    mk('ankle' + side, rig['leg' + side], aw, hw);
    mk('foot' + side, rig['ankle' + side], aw, aw);
    // rest pose: arms slightly out, elbows soft, feet turned out
    rig['shoulder' + side].rotation.z = s * REST.armOut;
    rig['elbow' + side].rotation.x = -REST.elbowBend;
    rig['foot' + side].rotation.y = s * REST.footOut;
    rig['hip' + side].rotation.z = 0;
  }
  mk('tail', rig.hips, W(0, P.tail.center[1] - 0.04, P.tail.center[2] + 0.06), jw('hips'));
  return rig;
}

/** Snapshot of rest transforms, for pose reset and verification. */
export function snapshotRig(rig) {
  const snap = {};
  for (const [k, g] of Object.entries(rig)) snap[k] = { p: g.position.toArray(), r: [g.rotation.x, g.rotation.y, g.rotation.z], s: g.scale.toArray() };
  return snap;
}
export function restoreRig(rig, snap) {
  for (const [k, v] of Object.entries(snap)) { const g = rig[k]; g.position.fromArray(v.p); g.rotation.set(...v.r); g.scale.fromArray(v.s); }
}
