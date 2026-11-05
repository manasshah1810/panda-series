import * as THREE from 'three';
import gsap from 'gsap';
import { CAMERA_MARKS } from '../kitchen/src/cameraMarks.js';

/**
 * Beat 1 -- The Hero Tease. Whip from the Panda to the finished vegetarian ramen bowl, buttery orbit, dive into the steam.
 * Local timeline seconds: whip 0 .. 0.4 (power3.inOut), orbit 0.4 .. 1.6 (sine.inOut), plunge 1.6 .. 2.2 (power2.in).
 * The timeline only tweens plain progress scalars (whip / orbit / plunge / wash ...). Camera, bowl, lights and overlay are then
 * set by `apply()`, a pure function of those scalars, so seeking forwards, backwards or randomly gives identical frames.
 */
export const HERO_TIMES = Object.freeze({ whip: [0, 0.4], orbit: [0.4, 1.6], plunge: [1.6, 2.2], duration: 2.2, reveal: 0.14 });
/** The marks M8..M11 were authored around this bowl position; they are shifted by (bowl world position - this). */
export const HERO_FOCUS_AUTHORED = Object.freeze([1.35, 1.0, 1.1]);
export const WASH_COLOR = '#F5F0E8';

const V = (a) => new THREE.Vector3(...a);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Quadratic through three knots at u = 0, 0.5, 1 (smooth, no overshoot problems at this scale). */
const q3 = (a, b, c, u) => a * 2 * (u - 0.5) * (u - 1) + b * -4 * u * (u - 1) + c * 2 * u * (u - 0.5);

/**
 * Warm spotlight over the bowl (intensity 0 until the beat drives it). Add the returned light to the scene BEFORE the first render:
 * adding a light later would recompile every material.
 */
export function createHeroSpot(focusWorld, { peak = 1.1 } = {}) {
  const f = focusWorld.clone(), spot = new THREE.SpotLight('#FFE0B0', 0, 3.0, 0.5, 0.9, 2);
  spot.name = 'heroBowlSpot'; spot.position.set(f.x + 0.12, f.y + 0.95, f.z + 0.5); spot.target.position.copy(f).add(new THREE.Vector3(0, 0.07, 0)); spot.userData.peak = peak;
  return spot;
}

/**
 * @param {{
 *   cameraRig: { camera: THREE.PerspectiveCamera, startPose?: {position:number[], lookAt:number[], fov:number, tilt?:number}, marks?: object },
 *   ramenBowl: { group: THREE.Object3D, setTime:(t:number)=>void, setReveal?:(k:number)=>void },
 *   kitchenLighting: { lights: object, spot?: THREE.SpotLight },
 *   overlayElement?: HTMLElement | null,
 *   hideOnReveal?: THREE.Object3D[] }} deps   // e.g. the 3D title: gone once the whip has swept past it
 * @returns {gsap.core.Timeline} paused 2.2 s timeline; `tl.hero` has { apply, state, camAt }.
 */
export function createHeroTeaseTimeline({ cameraRig, ramenBowl, kitchenLighting, overlayElement = null, hideOnReveal = [] }) {
  const camera = cameraRig.camera, marks = cameraRig.marks ?? CAMERA_MARKS, T = HERO_TIMES;

  // bowl focus -> retarget the authored marks onto wherever the bowl is really mounted
  ramenBowl.group.updateWorldMatrix(true, false);
  const bowlWorld = ramenBowl.group.getWorldPosition(new THREE.Vector3()), off = bowlWorld.clone().sub(V(HERO_FOCUS_AUTHORED));
  const pose = (m, shift) => ({ p: V(m.position).add(shift), l: V(m.lookAt ?? m.target).add(shift), fov: m.fov });
  const zero = new THREE.Vector3();
  const P0 = pose(cameraRig.startPose ?? marks.M7_title_end, zero), tilt0 = cameraRig.startPose?.tilt ?? 0;
  const P8 = pose(marks.M8_whip_transit, off), P9 = pose(marks.M9_hero_bowl_orbit_start, off), P10 = pose(marks.M10_hero_bowl_orbit_end, off), P11 = pose(marks.M11_steam_plunge, off);

  // orbit is polar around the (shared) M9/M10 target: azimuth, radius, height and fov each ease from M9 to M10
  const pol = (P) => { const d = P.p.clone().sub(P.l); return { az: Math.atan2(d.x, d.z), r: Math.hypot(d.x, d.z), h: d.y }; };
  const o9 = pol(P9), o10 = pol(P10), orbitTarget = P9.l;
  const h10 = P10.l.clone().sub(P10.p).setY(0).normalize();   // horizontal view direction when the dive starts: becomes screen-up when looking straight down

  // lights
  const spot = kitchenLighting.spot ?? null;
  const dim = Object.values(kitchenLighting.lights ?? {}).flat().filter((l) => l && l.isLight && l !== spot).map((l) => ({ l, base: l.intensity }));

  // progress scalars (the ONLY state the timeline owns)
  const s = { whip: 0, orbit: 0, plunge: 0, dim: 0, spot: 0, pop: 0, wash: 0 };
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });
  const ft = (k, to, [a, b], ease) => tl.fromTo(s, { [k]: 0 }, { [k]: to, duration: b - a, ease, immediateRender: false }, a);
  ft('whip', 1, T.whip, 'power3.inOut');                                    // 1. whip pan to the bowl
  ft('orbit', 1, T.orbit, 'sine.inOut');                                    // 2. slow, buttery orbit ...
  ft('dim', 1, T.orbit, 'sine.inOut');                                      //    ... while the background dims 35% ...
  ft('plunge', 1, T.plunge, 'power2.in');                                   // 3. dive into the steam ...
  ft('wash', 1, T.plunge, 'power2.in');                                     //    ... and the screen washes to #F5F0E8
  tl.fromTo(s, { spot: 0 }, { spot: 0.35, duration: 0.4, ease: 'power2.out', immediateRender: false }, 0);
  tl.fromTo(s, { spot: 0.35 }, { spot: 1, duration: T.orbit[1] - T.orbit[0], ease: 'sine.inOut', immediateRender: false }, T.orbit[0]);   // ... the spotlight intensifies
  tl.fromTo(s, { pop: 0 }, { pop: 1, duration: 0.26, ease: 'back.out(1.5)', immediateRender: false }, T.reveal);   // bowl pops into frame as the whip sweeps past
  tl.to({}, { duration: T.duration - tl.duration() }, tl.duration());   // pad to exactly 2.2 s

  const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _up = new THREE.Vector3(), _u = new THREE.Vector3();
  const sharedState = { spotIntensity: 0, dimFactor: 1, wash: 0, pose: null };

  /** The single writer. `writeCamera` is false at local time 0 (the opening still owns the camera there). */
  function apply(localT, writeCamera = true) {
    // ---- camera
    let fov, roll = 0, tilt = 0, upBlend = 0;
    if (s.plunge > 0) {
      const u = s.plunge; _p.lerpVectors(P10.p, P11.p, u); _l.lerpVectors(P10.l, P11.l, u); fov = P10.fov + (P11.fov - P10.fov) * u; upBlend = u;
    } else if (s.orbit > 0) {
      const u = s.orbit, az = o9.az + (o10.az - o9.az) * u, r = o9.r + (o10.r - o9.r) * u, h = o9.h + (o10.h - o9.h) * u;
      _p.set(orbitTarget.x + Math.sin(az) * r, orbitTarget.y + h, orbitTarget.z + Math.cos(az) * r); _l.copy(orbitTarget); fov = P9.fov + (P10.fov - P9.fov) * u;
    } else {
      const u = s.whip;
      _p.set(q3(P0.p.x, P8.p.x, P9.p.x, u), q3(P0.p.y, P8.p.y, P9.p.y, u), q3(P0.p.z, P8.p.z, P9.p.z, u));
      _l.set(q3(P0.l.x, P8.l.x, P9.l.x, u), q3(P0.l.y, P8.l.y, P9.l.y, u), q3(P0.l.z, P8.l.z, P9.l.z, u));
      fov = q3(P0.fov, P8.fov, P9.fov, u); roll = 0.11 * Math.sin(Math.PI * u); tilt = tilt0 * (1 - sm(0, 0.6, u));   // dutch-roll punch mid-whip; the opening's 6-degree tilt-up unwinds
    }
    if (writeCamera) {
      _up.set(0, 1, 0); if (upBlend > 0) _up.multiplyScalar(1 - upBlend).addScaledVector(h10, upBlend).normalize();
      camera.up.copy(_up); camera.position.copy(_p); camera.fov = fov; camera.lookAt(_l);
      if (tilt) camera.rotateX(tilt); if (roll) camera.rotateZ(roll);
      camera.updateProjectionMatrix();
    } else camera.up.set(0, 1, 0);

    // ---- bowl (+ anything that must not be in the hero shots, e.g. the title)
    for (const o of hideOnReveal) o.visible = !(s.pop > 0.001);
    ramenBowl.setReveal?.(s.pop); ramenBowl.setTime(localT / T.duration);

    // ---- lights: absolute assignment from the captured bases (never accumulates)
    const dimF = 1 - 0.35 * s.dim; for (const d of dim) d.l.intensity = d.base * dimF;
    if (spot) spot.intensity = (spot.userData.peak ?? 1.1) * s.spot;

    // ---- overlay
    if (overlayElement) { overlayElement.style.backgroundColor = WASH_COLOR; overlayElement.style.opacity = String(s.wash); }
    sharedState.spotIntensity = spot ? spot.intensity : 0; sharedState.dimFactor = dimF; sharedState.wash = s.wash;
  }

  tl.eventCallback('onUpdate', () => apply(tl.time(), tl.time() > 0));
  tl.progress(1).progress(0); apply(0, false);
  tl.hero = { apply, state: s, info: sharedState, bowlWorld, offset: off, duration: T.duration, get wash() { return s.wash; } };
  return tl;
}
