import * as THREE from 'three';
import { validatePropOptions } from './propContract.js';
import { gripPose } from '../poses/applyPose.js';

/** Parent `obj` to the socket with an offset/rotation/scale. Applies a grip pose to the paw when it is a hand socket. Returns detach(). */
export function attachProp(panda, obj, socketName, options = {}) {
  validatePropOptions(socketName, options);
  const sock = panda.sockets[socketName]; const prev = { parent: obj.parent, pos: obj.position.clone(), quat: obj.quaternion.clone(), scale: obj.scale.clone() };
  sock.add(obj);
  if (options.offset) obj.position.set(...options.offset);
  if (options.rotation) obj.rotation.set(...options.rotation);
  if (options.scale !== undefined) Array.isArray(options.scale) ? obj.scale.set(...options.scale) : obj.scale.setScalar(options.scale);
  const side = socketName.endsWith('L') ? 'L' : 'R'; const before = panda._grip?.[side] || 'relaxed';
  if (options.gripPose) { gripPose(panda, side, options.gripPose, 0.25); panda._grip[side] = options.gripPose; }
  return function detach({ restoreGrip = true } = {}) {
    obj.removeFromParent();
    if (options.gripPose && restoreGrip) { gripPose(panda, side, before, 0.25); panda._grip[side] = before; }
    return obj;
  };
}

/** Move `obj` under `newParent` WITHOUT moving it in world space. One-shot (not scrub-safe by itself). */
export function reparentKeepWorld(obj, newParent) { newParent.attach(obj); return obj; }

/** Scrub-safe hand-off: shows `b` and hides `a` at time `t` of a GSAP timeline (and reverses correctly when scrubbed back). */
export function visibilityHandoff(tl, t, a, b) { a.visible = true; b.visible = false; tl.set(a, { visible: false }, t).set(b, { visible: true }, t); return tl; }
