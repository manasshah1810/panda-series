import * as THREE from 'three';
import { PROPORTIONS as P } from '../config/defaults.js';

/** Socket convention: local +Y = up/along-limb-away, +Z = forward (out of the surface). Hand sockets: +Z points out of the
 *  palm, +Y along the fingers (towards the paw tip is -Y of the paw pivot, so hand sockets are flipped to keep Y "up the forearm"). */
export function buildSockets(rig) {
  const sockets = {};
  const add = (name, parent, pos, rot = [0, 0, 0]) => {
    const o = new THREE.Object3D(); o.name = name; o.position.set(...pos); o.rotation.set(...rot);
    parent.add(o); sockets[name] = o; return o;
  };
  const hz = P.head.center[1] - P.joints.head[1];
  add('handSocketL', rig.pawL, [0, -0.10, 0.1]);
  add('handSocketR', rig.pawR, [0, -0.10, 0.1]);
  add('headTop', rig.head, [0, hz + P.head.radii[1] - 0.02, -0.02]);
  add('eyeBridge', rig.head, [0, 0.285, 0.50], [-0.1, 0, 0]);
  add('neckBase', rig.chest, [0, 0.08, 0]);
  add('chestFront', rig.chest, [0, -0.06, 0.5]);
  add('torsoWrap', rig.spine, [0, 0.0, 0]);
  add('backCenter', rig.chest, [0, -0.08, -0.5], [0, Math.PI, 0]);
  add('footSocketL', rig.footL, [0, -0.05, 0.08]);
  add('footSocketR', rig.footR, [0, -0.05, 0.08]);
  add('mouthSocket', rig.head, [0, P.mouth.y - P.joints.head[1], 0.62]);
  add('noseSocket', rig.head, [0, P.nose.center[1] - P.joints.head[1], 0.68]);
  return sockets; // earSocketL/R are added by createPanda once ear pivots exist
}

/** Bounding ellipsoids so outfits can fit without absolute numbers. */
export function measure() {
  const T = P.torso;
  return {
    totalHeight: P.totalHeight,
    head: { center: P.head.center, radii: P.head.radii },
    torso: { center: [0, 0.86, 0], radii: [0.66, 0.56, 0.66 * T.zScale], minY: T.bottomY, maxY: T.topY, profile: T.profile },
    belly: { center: P.belly.center, radii: P.belly.radii },
    arm: { upperLen: P.arm.upperLen, foreLen: P.arm.foreLen, radius: P.arm.upperR },
    leg: { radius: P.leg.radius, hipY: P.hip.y },
  };
}
