import * as THREE from 'three';
import gsap from 'gsap';

/** Yaw/pitch (radians) the head must turn to face a world point. Pure function of positions, safe for timelines. */
export function lookAngles(panda, targetWorld, { maxYaw = 1.0, maxPitch = 0.55 } = {}) {
  const head = panda.rig.head; const parent = head.parent;
  parent.updateWorldMatrix(true, false);
  const local = parent.worldToLocal(targetWorld.clone()).sub(head.position);
  return { y: THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -maxYaw, maxYaw), x: THREE.MathUtils.clamp(Math.atan2(-(local.y - 0.2), Math.hypot(local.x, local.z)), -maxPitch, maxPitch) };
}

/** Volume-preserving squash: scales root Y by (1 - a) and X/Z by 1/sqrt(1 - a). Feet stay on the ground (root origin is at the feet).
 *  Pass a base scale (the root scale when the animation was built) so it composes with `options.scale`. */
export function squashScale(a, base = 1) { const sy = 1 - a, sxz = 1 / Math.sqrt(Math.max(0.2, sy)); return { x: base * sxz, y: base * sy, z: base * sxz }; }
export function squash(panda, amount, duration = 0.25, ease = 'power2.out') {
  const base = panda.options.scale; return gsap.to(panda.root.scale, { ...squashScale(amount, base), duration, ease });
}
