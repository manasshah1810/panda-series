import * as THREE from 'three';
import { KNIFE } from './knife.js';

/**
 * Knife motion for the opening. EVERY function here is a pure function of its arguments (no state, no random, no integration),
 * so any frame can be reproduced by seeking the master timeline.
 *
 * World setup (see kitchen/anchors.js): the cutting board top is y = 1.10. The brief fixes the stick point at (1.35, 1.10, 1.1).
 */
export const STICK_POINT = Object.freeze([1.35, 1.10, 1.1]);   // from the brief (the kitchen anchor of the same name is the board centre, x = 1.7)
export const LAND_TILT_DEG = 15;                                  // tip down, 15 degrees off vertical, leaning "/" (handle away from Panda)
export const EMBED = 0.06;                                        // how far the tip sinks below the board top (board is 0.10 thick)
export const FLIGHT_SPIN_PITCH_DEG = 180 + LAND_TILT_DEG;         // knife flips tip-up -> tip-down while it travels (clockwise seen from +Z)
export const WOBBLE = Object.freeze({ A: (4 * Math.PI) / 180, k: 4.0, w: 2 * Math.PI * 2.2, settleFrom: 0.9 });

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** The brief's damped wobble: angle(tau) = A * exp(-k tau) * sin(w tau). Radians. */
export function wobbleFormula(tau) { return WOBBLE.A * Math.exp(-WOBBLE.k * tau) * Math.sin(WOBBLE.w * tau); }
/**
 * Wobble used on screen. Identical to the formula for tau <= settleFrom (0.9); over the last 0.1 s a smoothstep window takes it to
 * EXACTLY 0 so the knife is dead still from tau = 1.0 on (the raw formula would still be 0.07 degrees at tau = 1).
 */
export function wobbleAngle(tau) { tau = clamp01(tau); return wobbleFormula(tau) * (1 - smooth(WOBBLE.settleFrom, 1.0, tau)); }
/** tau = clamp(t - tL, 0, 1) */
export const wobbleTau = (t, tL) => clamp01(t - tL);

const TIP_DIR = new THREE.Vector3(-Math.sin((LAND_TILT_DEG * Math.PI) / 180), -Math.cos((LAND_TILT_DEG * Math.PI) / 180), 0);
export const QUAT_LAND = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -(FLIGHT_SPIN_PITCH_DEG * Math.PI) / 180);

/** Resting pose of the stuck knife (origin = gripPoint). The blade axis passes through `stick` and the tip is EMBED below it. */
export function landingPose(stick = STICK_POINT) {
  const S = new THREE.Vector3(...stick), c = Math.cos((LAND_TILT_DEG * Math.PI) / 180);
  const tip = S.clone().addScaledVector(TIP_DIR, EMBED / c);
  const position = tip.clone().addScaledVector(TIP_DIR, -KNIFE.tipY);
  return { position, quaternion: QUAT_LAND.clone(), tip, stick: S };
}

/**
 * Scripted flight. `release` = { position: Vector3, quaternion: Quaternion } of the knife origin in WORLD space at the moment it leaves the paw.
 * Returns f(u) -> { position, quaternion } for u in [0,1] (u = 0 release, u = 1 landing; clamped).
 * - position: straight line release->landing plus a parabolic arc (apex `arc` metres above the chord), so it lands exactly on the target.
 * - orientation: pitch flip about world Z (tip-up -> tip-down at 15 degrees) + exactly ONE full roll about the knife's own long axis.
 */
export function makeFlight(release, { stick = STICK_POINT, arc = 0.42 } = {}) {
  const land = landingPose(stick), p0 = release.position.clone(), p1 = land.position.clone(), q0 = release.quaternion.clone();
  const qUp = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), yAxis = new THREE.Vector3(0, 1, 0);
  const out = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() }, tmp = new THREE.Quaternion(), start = new THREE.Quaternion(), roll = new THREE.Quaternion();
  return function flight(u) {
    u = clamp01(u);
    out.position.lerpVectors(p0, p1, u); out.position.y += 4 * arc * u * (1 - u);
    const pitchE = 1 - Math.pow(1 - u, 2.2);                                    // flip finishes just before the tip bites
    start.slerpQuaternions(q0, qUp, smooth(0, 0.35, u));                        // blend whatever the paw held into "blade up"
    tmp.setFromAxisAngle(zAxis, -(FLIGHT_SPIN_PITCH_DEG * Math.PI) / 180 * pitchE);
    roll.setFromAxisAngle(yAxis, 2 * Math.PI * (u * u * (3 - 2 * u)));          // one spin about the long axis, identity again at u = 1
    out.quaternion.copy(tmp).multiply(start).multiply(roll);
    if (u >= 1) { out.position.copy(p1); out.quaternion.copy(QUAT_LAND); }
    return out;
  };
}

/** Landed knife with the wobble applied as a ROTATION about the stick point (no translation of the pivot). */
export function wobbledPose(t, tL, stick = STICK_POINT, out = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() }) {
  const land = landingPose(stick), a = wobbleAngle(wobbleTau(t, tL)), r = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);
  out.position.copy(land.position).sub(land.stick).applyQuaternion(r).add(land.stick);
  out.quaternion.copy(r).multiply(land.quaternion);
  return out;
}
