import * as THREE from 'three';
import gsap from 'gsap';
import { CAMERA_MARKS, MARK_POT_ORIGIN, MARK_TOPDOWN_UP } from '../kitchen/src/cameraMarks.js';
import { POT } from '../props/stove/stockpot.js';

/**
 * Beat 4 -- The Broth Build. Directly after the Panda's knife flourish + wink: the camera whip-pans from his close-up to the stockpot on the stove
 * (M15_stove_approach), arcs up into a locked top-down view (M16_topdown_pot), and the prepped vegetarian ingredients (shiitake, fanned bamboo,
 * garlic, scallions, then a chilli-oil stream) fly in from the screen edges on parabolic arcs and drop into the boiling broth. Every impact sinks the
 * piece and fires a deterministic splash (ripple + amber droplets). After the last chilli-oil drop a dense steam burst scales up, the camera
 * dives into it (M17_steam_wipe) and the screen washes to #F5F0E8, which hides the reset for the noodle pull.
 *
 * ANIMATION CONTRACT. One paused GSAP timeline (BROTH_DURATION s). It only tweens plain progress scalars (whip, arc, dive, steam, wash, and per-piece
 * x / yUp / yDown / sink). `apply()` -- called from onUpdate -- is a PURE function of those scalars: it assigns ABSOLUTE values to the camera, lights,
 * overlay, every flying piece, the chilli stream, the steam planes and the pot (stockpot.update()). No physics, no accumulation, no Math.random, no per-frame
 * state: scrubbing forwards, backwards or randomly gives identical frames, and the parabolas and splashes retrace themselves in reverse.
 */
export const BROTH_TIMES = Object.freeze({
  whip: [0, 0.7], arc: [0.7, 1.9], light: [0.5, 1.9],
  dropStart: 1.5, stride: 0.36, flight: 0.8, upFrac: 0.4, sink: 0.16,     // ten ingredient drops, one every `stride` s; each flight is split into a rising (power1.out) and a falling (power2.in) phase
  chiliStart: 5.0, chiliStride: 0.07, chiliBlobs: 8,                       // the chilli-oil stream: 8 blobs, the last one lands at chiliStart + 7 * 0.07 + flight = 6.29 s
  steam: [6.3, 7.4], dive: [6.55, 7.75], wash: [7.1, 7.9], duration: 8.3,
});
export const WASH_COLOR = '#F5F0E8';
/** Drop order (ingredient kinds): 3 shiitake, 3 fanned bamboo, 2 garlic, 2 scallions. */
export const DROP_KINDS = Object.freeze(['shiitake', 'bamboo', 'garlic', 'scallion', 'bamboo', 'shiitake', 'garlic', 'bamboo', 'scallion', 'shiitake']);
const SOURCE = { shiitake: 'shiitake_mushrooms', garlic: 'garlic_bulb', scallion: 'scallion_bundle' };
const SIZE = { shiitake: 0.085, bamboo: 0.075, garlic: 0.07, scallion: 0.16 };   // flying-piece size (longest side, metres): chunky toy scale, readable from 1.4 m up

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (a) => new THREE.Vector3(...a);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Warm spotlight over the pot (intensity 0 until the beat drives it). Add it to the scene BEFORE the first render: adding a light later recompiles every material. */
export function createPotSpot(focusWorld, { peak = 1.0 } = {}) {
  const f = focusWorld.clone(), spot = new THREE.SpotLight('#FFE0B0', 0, 3.0, 0.5, 0.9, 2);
  spot.name = 'potSpot'; spot.position.set(f.x + 0.15, f.y + 0.95, f.z + 0.45); spot.target.position.copy(f); spot.userData.peak = peak; return spot;
}

/**
 * Dense steam: ONE InstancedMesh of horizontal soft planes stacked above the pot. A pure function of two scalars: `burst` (0..1, the big cloud) and
 * `idle` (a faint standing wisp). Per-instance alpha / seed attributes; the swirl in the fragment shader is a function of the plane's seed only.
 */
export function createSteamCluster({ count = 16, origin = new THREE.Vector3(), radius = POT.brothRadius } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1), aSeed = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  for (let i = 0; i < count; i++) aSeed.setX(i, hash(i + 3) * 40); geo.setAttribute('aAlpha', aAlpha); geo.setAttribute('aSeed', aSeed);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, uniforms: { uColor: { value: new THREE.Color(WASH_COLOR) } },
    vertexShader: /* glsl */`attribute float aAlpha; attribute float aSeed; varying vec2 vUv; varying float vA; varying float vS;
      void main() { vUv = uv; vA = aAlpha; vS = aSeed; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform vec3 uColor; varying vec2 vUv; varying float vA; varying float vS;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec2 c = vUv - 0.5; float d = length(c) * 2.0; float soft = 1.0 - smoothstep(0.25, 1.0, d);
        float cloud = 0.62 + 0.38 * (n(c * 5.0 + vS) * 0.6 + n(c * 11.0 - vS) * 0.4);
        float a = vA * soft * cloud; if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count); mesh.name = 'steamCluster'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 8;
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
  const rest = Array.from({ length: count }, (_, i) => ({ h: 0.035 + 0.62 * Math.pow(i / (count - 1), 0.85) + 0.02 * hash(i + 11), dx: (hash(i + 21) - 0.5) * 0.12, dz: (hash(i + 31) - 0.5) * 0.12, sc: 0.8 + 0.5 * hash(i + 41), rot: hash(i + 51) * 6.28 }));
  /** burst, idle in 0..1; time = beat seconds (only drives the slow, deterministic idle drift). */
  function set(burst, idle, time = 0) {
    for (let i = 0; i < count; i++) {
      const r = rest[i], f = i / (count - 1), b = clamp01(burst * 1.25 - f * 0.25);   // the lower planes fill first, the cloud climbs
      const size = (radius * 1.5 + 0.95 * b * r.sc) * (b > 0 ? 1 : 0.9), rise = 0.04 * Math.sin(time * 0.8 + r.rot);
      _p.set(origin.x + r.dx * (1 + 3 * b), origin.y + r.h * (0.35 + 0.65 * b) + rise * (1 - b), origin.z + r.dz * (1 + 3 * b));
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.rot + 0.25 * b); _s.set(size, 1, size); mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      aAlpha.setX(i, idle * 0.05 * (1 - 0.6 * f) + b * (0.34 + 0.2 * (1 - f)));
    }
    mesh.instanceMatrix.needsUpdate = true; aAlpha.needsUpdate = true;
  }
  set(0, 0); mesh.visible = false;
  return { mesh, set, dispose() { geo.dispose(); mat.dispose(); mesh.removeFromParent(); } };
}

/** Wraps a clone of `src` (shared geometry + material) so its bounding box is centred on the origin and its longest side equals `size`. */
function normalised(src, size) {
  const wrap = new THREE.Group(), c = src.clone(true); wrap.add(c); wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap), ctr = box.getCenter(new THREE.Vector3()), dim = box.getSize(new THREE.Vector3());
  c.position.sub(ctr); wrap.scale.setScalar(size / Math.max(dim.x, dim.y, dim.z, 1e-6)); wrap.updateMatrixWorld(true);
  wrap.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
  return wrap;
}

/**
 * @param {{
 *   cameraRig: { camera: THREE.PerspectiveCamera, startPose: {p: THREE.Vector3, q: THREE.Quaternion, fov: number}, marks?: object },
 *   stockpot: ReturnType<typeof import('../props/stove/stockpot.js').createStockpot>,
 *   rawIngredients: object, sliceableBamboo: object, scene: THREE.Scene,
 *   overlayElement?: HTMLElement|null, lighting?: { spot?: THREE.SpotLight }, hideDuringBeat?: THREE.Object3D[] }} deps
 * @returns {gsap.core.Timeline} paused BROTH_DURATION s timeline; `tl.broth` = { apply, state, impacts, pieces, steam, marks, chili, dispose }.
 */
export function createBrothBuildTimeline({ cameraRig, stockpot, rawIngredients, sliceableBamboo, scene, overlayElement = null, lighting = null, hideDuringBeat = [] }) {
  const T = BROTH_TIMES, D = T.duration, camera = cameraRig.camera, marks = cameraRig.marks ?? CAMERA_MARKS, spot = lighting?.spot ?? null, bu = stockpot.brothUniforms;
  const root = new THREE.Group(); root.name = 'brothBuildProps'; scene.add(root);   // world-space container for the flying pieces / stream / steam (the pot may be nested anywhere)

  // ---- marks: authored around MARK_POT_ORIGIN, translated onto the real broth surface
  const brothW = stockpot.brothWorld(), shift = brothW.clone().sub(V(MARK_POT_ORIGIN)), tmp = new THREE.PerspectiveCamera();
  const pose = (m, up = [0, 1, 0]) => { const p = V(m.position).add(shift), l = V(m.lookAt ?? m.target).add(shift); tmp.up.set(...up); tmp.position.copy(p); tmp.lookAt(l); tmp.updateMatrixWorld(); return { p, l, q: tmp.quaternion.clone(), fov: m.fov }; };
  const S0 = { p: cameraRig.startPose.p.clone(), q: cameraRig.startPose.q.clone(), fov: cameraRig.startPose.fov };
  const A = pose(marks.M15_stove_approach), B = pose(marks.M16_topdown_pot, MARK_TOPDOWN_UP), C = pose(marks.M17_steam_wipe, MARK_TOPDOWN_UP);
  const whipMid = S0.p.clone().lerp(A.p, 0.55).add(new THREE.Vector3(0.3, 0.1, 0)), arcCtl = A.p.clone().lerp(B.p, 0.5).add(new THREE.Vector3(0.05, -0.1, 0.25));
  const bez = (a, m, b, u, out) => out.copy(a).multiplyScalar((1 - u) * (1 - u)).addScaledVector(m, 2 * (1 - u) * u).addScaledVector(b, u * u);

  // ---- flying pieces: clones of the chopped ingredients (shared geometry / materials), ten drops, each with its own off-screen entry and landing spot
  const raw = rawIngredients, cache = {}, pieces = [];
  const source = (kind) => kind === 'bamboo' ? sliceableBamboo.slices[0].children[0] : raw.ingredientsMap.get(SOURCE[kind]).parts[0].body;
  const R_LAND = 0.105, N = DROP_KINDS.length, entries = [[-0.95, -0.12], [0.95, 0.1], [0.12, -0.62], [-0.1, 0.62]];
  DROP_KINDS.forEach((kind, i) => {
    const o = normalised(source(kind), SIZE[kind] * (0.92 + 0.16 * hash(i + 5))); o.visible = false; root.add(o);
    const a = hash(i * 7 + 1) * Math.PI * 2, r = R_LAND * Math.sqrt(hash(i * 7 + 2)), e = entries[(i * 3 + 1) % 4];
    const lx = Math.cos(a) * r, lz = Math.sin(a) * r;                                           // pot-local landing spot on the broth
    pieces.push({ kind, obj: o, t0: T.dropStart + T.stride * i, land: [lx, lz], from: [e[0] + 0.1 * (hash(i + 9) - 0.5), e[1] + 0.1 * (hash(i + 4) - 0.5)], spin: [(hash(i + 13) - 0.5) * 9, (hash(i + 17) - 0.5) * 12, (hash(i + 19) - 0.5) * 7], yaw0: hash(i + 23) * 6.28, size: SIZE[kind] });
  });
  // ---- chilli-oil stream: ONE InstancedMesh of stretched glossy blobs arcing in from the top-right
  const nb = T.chiliBlobs, chiliGeo = new THREE.SphereGeometry(1, 8, 6), chiliMat = new THREE.MeshStandardMaterial({ color: '#C2410C', roughness: 0.18, emissive: '#7A1F05', emissiveIntensity: 0.45 });
  const chili = new THREE.InstancedMesh(chiliGeo, chiliMat, nb); chili.name = 'chiliOilStream'; chili.frustumCulled = false; chili.castShadow = false; chili.visible = false; root.add(chili);
  const blobs = Array.from({ length: nb }, (_, j) => ({ t0: T.chiliStart + T.chiliStride * j, from: [0.88 + 0.04 * hash(j + 2), -0.38 + 0.03 * hash(j + 6)], land: [0.035 * (hash(j + 8) - 0.5) + 0.02, 0.03 * (hash(j + 12) - 0.5)], size: 0.017 + 0.007 * hash(j + 1) }));
  const steam = createSteamCluster({ origin: brothW }); root.add(steam.mesh);

  // ---- timeline: plain scalars only
  const s = { whip: 0, arc: 0, light: 0, dive: 0, burst: 0, idle: 0, wash: 0 }; for (let i = 0; i < N; i++) Object.assign(s, { ['x' + i]: 0, ['u' + i]: 0, ['d' + i]: 0, ['k' + i]: 0 });
  for (let j = 0; j < nb; j++) Object.assign(s, { ['cx' + j]: 0, ['cu' + j]: 0, ['cd' + j]: 0 });
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });
  const ft = (k, from, to, a, dur, ease) => tl.fromTo(s, { [k]: from }, { [k]: to, duration: dur, ease, immediateRender: false }, a);
  ft('whip', 0, 1, T.whip[0], T.whip[1] - T.whip[0], 'power3.inOut'); ft('arc', 0, 1, T.arc[0], T.arc[1] - T.arc[0], 'power3.inOut');
  ft('light', 0, 1, T.light[0], T.light[1] - T.light[0], 'sine.inOut'); ft('idle', 0, 1, 0.3, 1.2, 'sine.inOut');
  const flight = (pfx, t0) => { const up = T.flight * T.upFrac, dn = T.flight - up;   // X / Z: linear; Y: power1.out up, then power2.in down (separate scalars, so both phases reverse exactly)
    ft(pfx.x, 0, 1, t0, T.flight, 'none'); ft(pfx.u, 0, 1, t0, up, 'power1.out'); ft(pfx.d, 0, 1, t0 + up, dn, 'power2.in'); return t0 + T.flight; };
  const impacts = [];
  pieces.forEach((pc, i) => {
    const hit = flight({ x: 'x' + i, u: 'u' + i, d: 'd' + i }, pc.t0); ft('k' + i, 0, 1, hit, T.sink, 'power2.in');
    stockpot.triggerSplash(tl, hit, pc.land[0], pc.land[1]); impacts.push({ i, t: hit, kind: pc.kind });
  });
  blobs.forEach((b, j) => {
    const hit = flight({ x: 'cx' + j, u: 'cu' + j, d: 'cd' + j }, b.t0); b.hit = hit;
    if (j === 0 || j === 3 || j === nb - 1) { stockpot.triggerSplash(tl, hit, b.land[0], b.land[1]); impacts.push({ i: N + j, t: hit, kind: 'chili' }); }
  });
  const lastDrop = T.chiliStart + T.chiliStride * (nb - 1) + T.flight;
  ft('burst', 0, 1, T.steam[0], T.steam[1] - T.steam[0], 'power2.out'); ft('dive', 0, 1, T.dive[0], T.dive[1] - T.dive[0], 'power2.in'); ft('wash', 0, 1, T.wash[0], T.wash[1] - T.wash[0], 'power1.in');
  tl.fromTo(bu.uTime, { value: 3.0 }, { value: 3.0 + D * 1.15, duration: D, ease: 'none', immediateRender: false }, 0);                      // the boil clock is a tween too: pure function of beat time
  tl.fromTo(bu.uBoil, { value: 1.0 }, { value: 1.55, duration: lastDrop - T.dropStart, ease: 'sine.inOut', immediateRender: false }, T.dropStart);   // the pot boils harder as it fills
  tl.to({}, { duration: D - tl.duration() }, tl.duration());

  // ---- the single writer
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _roll = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1), _m = new THREE.Matrix4(), _sc = new THREE.Vector3(), _e = new THREE.Euler(), _w = new THREE.Vector3();
  const toWorld = (lx, y, lz, out) => out.set(lx, y, lz).add(brothW).setY(y);   // pot-local x/z (+ absolute world y) -> world (the pot is not rotated)
  const Y_START = brothW.y + 0.3, Y_PEAK = brothW.y + 0.64, Y_HIT = brothW.y + 0.012;
  let saved = null;
  function apply() {
    const w = s.whip;
    // --- camera: whip (flourish -> M15), arc (M15 -> M16 top-down), dive (M16 -> M17)
    let fov;
    if (s.dive > 0) { _p.lerpVectors(B.p, C.p, s.dive); _q.copy(B.q); fov = B.fov + (C.fov - B.fov) * s.dive; }
    else if (s.arc > 0) { bez(A.p, arcCtl, B.p, s.arc, _p); _q.slerpQuaternions(A.q, B.q, s.arc); fov = A.fov + (B.fov - A.fov) * s.arc; }
    else { bez(S0.p, whipMid, A.p, w, _p); _q.slerpQuaternions(S0.q, A.q, w); const punch = Math.pow(Math.sin(Math.PI * sm(0.25, 0.75, w)), 2); fov = S0.fov + (A.fov - S0.fov) * w + 8 * punch; _roll.setFromAxisAngle(_z, -2.5 * Math.PI / 180 * punch); _q.multiply(_roll); }
    camera.up.set(0, 1, 0); camera.position.copy(_p); camera.quaternion.copy(_q); camera.fov = fov; camera.updateProjectionMatrix();

    // --- the Panda, knife, board and flecks are hidden once the whip has swept past them
    const gone = w > 0.5; hideDuringBeat.forEach((o, i) => { o.visible = saved ? saved.vis[i] && !gone : !gone; });
    if (spot) spot.intensity = spot.userData.peak * s.light;
    if (overlayElement) { overlayElement.style.backgroundColor = WASH_COLOR; overlayElement.style.opacity = String(s.wash); }

    // --- flying pieces: x / z linear, y = rise (power1.out) minus fall (power2.in); the hit sinks and shrinks the piece to nothing
    pieces.forEach((pc, i) => {
      const x = s['x' + i], u = s['u' + i], d = s['d' + i], k = s['k' + i], o = pc.obj;
      o.visible = x > 0 && k < 1;
      const lx = pc.from[0] + (pc.land[0] - pc.from[0]) * x, lz = pc.from[1] + (pc.land[1] - pc.from[1]) * x;
      const y = Y_START + (Y_PEAK - Y_START) * u - (Y_PEAK - Y_HIT) * d - 0.05 * k;
      toWorld(lx, y, lz, o.position); o.rotation.set(pc.spin[0] * x, pc.yaw0 + pc.spin[1] * x, pc.spin[2] * x);
      const near = 1 + 0.55 * Math.sin(Math.PI * clamp01(x)) , sc = near * (1 - k * k);   // swells a little as it passes closest to the lens, then shrinks as it sinks
      o.scale.setScalar(sc * (o.userData.base ?? (o.userData.base = o.scale.x)));
    });
    // --- chilli stream
    let live = 0;
    blobs.forEach((b, j) => {
      const x = s['cx' + j], u = s['cu' + j], d = s['cd' + j], on = x > 0 && x < 1;
      if (!on) { chili.setMatrixAt(j, _m.makeScale(0, 0, 0)); return; }
      live++;
      const lx = b.from[0] + (b.land[0] - b.from[0]) * x, lz = b.from[1] + (b.land[1] - b.from[1]) * x, y = Y_START + 0.04 + (Y_PEAK - 0.06 - Y_START) * u - (Y_PEAK - 0.06 - Y_HIT) * d;
      const x2 = Math.min(1, x + 0.02), lx2 = b.from[0] + (b.land[0] - b.from[0]) * x2, lz2 = b.from[1] + (b.land[1] - b.from[1]) * x2;   // forward difference only to orient the blob along its path (pure in x)
      toWorld(lx, y, lz, _p); toWorld(lx2, y - 0.02 * (d > 0 ? 1 : -1), lz2, _w); _q.setFromUnitVectors(_z.set(0, 1, 0), _w.sub(_p).normalize()); _z.set(0, 0, 1);
      _sc.set(b.size, b.size * 2.2, b.size); chili.setMatrixAt(j, _m.compose(_p, _q, _sc));
    });
    chili.visible = live > 0; chili.instanceMatrix.needsUpdate = true;
    // --- steam + pot
    steam.mesh.visible = s.burst > 0 || s.idle > 0; steam.set(s.burst, s.idle, tl.time());
    stockpot.update();
  }
  tl.eventCallback('onUpdate', apply);

  // --- build: evaluate the whole range once so every scalar owns its start value, then leave the world exactly as the previous beat left it
  saved = { cam: { p: camera.position.clone(), q: camera.quaternion.clone(), up: camera.up.clone(), fov: camera.fov }, vis: hideDuringBeat.map((o) => o.visible), spot: spot ? spot.intensity : 0, wash: overlayElement ? overlayElement.style.opacity : null, bg: overlayElement ? overlayElement.style.backgroundColor : null };
  tl.progress(1).progress(0); apply();
  camera.position.copy(saved.cam.p); camera.quaternion.copy(saved.cam.q); camera.up.copy(saved.cam.up); camera.fov = saved.cam.fov; camera.updateProjectionMatrix();
  if (spot) spot.intensity = saved.spot; if (overlayElement) { overlayElement.style.opacity = saved.wash ?? ''; overlayElement.style.backgroundColor = saved.bg ?? ''; }

  tl.broth = { apply, state: s, impacts, pieces, blobs, chili, steam, root, marks: { S0, A, B, C }, times: T, lastDrop, duration: D, brothWorld: brothW,
    dispose() { steam.dispose(); chiliGeo.dispose(); chiliMat.dispose(); root.removeFromParent(); } };
  return tl;
}
