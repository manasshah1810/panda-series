import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * The Beat-4 stockpot: a chunky matte-enamel pot with two looped steel handles, a rolling-boil broth (custom shader, vertex displacement) and a
 * pool of amber splash droplets. Everything is procedural: no imported models, textures or HDRIs.
 *
 * ANIMATION CONTRACT. Nothing here has state that evolves by itself. The broth is a pure function of `brothUniforms.uTime / uBoil` plus one
 * progress scalar per splash; the droplets are a pure function of the same splash scalars (closed-form parabolas seeded by a hash, no
 * Math.random). `triggerSplash` only ADDS a tween of the splash's progress scalar to the caller's GSAP timeline, so seeking forwards, backwards
 * or randomly gives identical frames and a splash un-splashes when you scrub back.
 *
 * Frame: the group origin is the centre of the pot's base (it sits on the burner grate). `brothY` is the broth surface height in that frame.
 * triggerSplash(x, z) takes POT-LOCAL coordinates on the broth plane.
 */
export const POT = Object.freeze({
  radius: 0.2, height: 0.262, wall: 0.03, brothY: 0.19, brothRadius: 0.168,
  maxSplashes: 14, dropletsPerSplash: 16, splashDuration: 0.95,
  colors: { enamel: '#4A5C66', steel: '#8C9295', broth: '#8B4513', droplet: '#D98A2B' },
});
const TIERS = { high: { rad: 56, ring: 30, sph: [6, 4] }, medium: { rad: 40, ring: 22, sph: [5, 4] }, low: { rad: 24, ring: 14, sph: [4, 3] } };
const GRAVITY = 3.4, FLIGHT = 0.8;          // droplet flight lasts at most FLIGHT s of 'splash time' (the splash scalar p maps to p * FLIGHT)
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const BROTH_VERT = /* glsl */`
uniform float uTime; uniform float uBoil; uniform vec4 uImp[${POT.maxSplashes}]; uniform float uR;
varying vec3 vWorld; varying vec3 vN; varying vec2 vP; varying float vH;
float swell(vec2 p) {
  float t = uTime;
  float roll = sin(p.x * 17.0 + t * 2.1) * cos(p.y * 15.0 - t * 1.7) + 0.7 * sin(length(p - vec2(-0.05, 0.04)) * 24.0 - t * 3.3);   // slow, wide convection humps
  return (0.0042 * roll + 0.0022 * (sin(p.x * 31.0 + t * 3.1) * cos(p.y * 27.0 - t * 2.3) + 0.6 * sin((p.x + p.y) * 47.0 - t * 4.7) + 0.4 * sin(length(p - vec2(0.05, -0.04)) * 62.0 - t * 5.9))) * uBoil;
}
float ripples(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < ${POT.maxSplashes}; i++) {
    vec4 s = uImp[i]; float k = s.z;
    if (k <= 0.0 || k >= 1.0) continue;
    float d = distance(p, s.xy), front = 0.02 + k * 0.34;
    float env = smoothstep(0.0, 0.06, k) * pow(1.0 - k, 1.4);
    h += env * (0.0105 * sin((d - front) * 70.0) * exp(-abs(d - front) * 16.0) - 0.011 * exp(-d * 26.0) * (1.0 - smoothstep(0.0, 0.3, k)));
  }
  return h;
}
float height(vec2 p) {
  float r = length(p) / uR, edge = 1.0 - smoothstep(0.80, 0.995, r);
  float meniscus = 0.006 * smoothstep(0.88, 1.0, r);
  return (swell(p) + ripples(p)) * edge + meniscus;
}
void main() {
  vec2 p = position.xy; float e = 0.004;
  float h = height(p);
  vec3 n = normalize(vec3(-(height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0))) / (2.0 * e), 1.0, -(height(p + vec2(0.0, e)) - height(p - vec2(0.0, e))) / (2.0 * e)));
  vec3 pos = vec3(p.x, h, p.y);                 // geometry is built flat in the XY plane: y of the plane is the pot's z
  vP = p; vH = h; vN = normalize(mat3(modelMatrix) * n);
  vec4 w = modelMatrix * vec4(pos, 1.0); vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const BROTH_FRAG = /* glsl */`
uniform float uTime; uniform float uBoil; uniform float uR; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform vec3 uOil; uniform vec3 uKeyDir; uniform float uOilAmt;
varying vec3 vWorld; varying vec3 vN; varying vec2 vP; varying float vH;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h22(vec2 p) { return vec2(h21(p), h21(p + 17.31)); }
// one bubble per cell: it swells from nothing, bright rim, then pops (each cell has its own phase)
vec2 bubbles(vec2 p, float scale, float speed, float seed) {
  vec2 q = p * scale, id = floor(q), f = fract(q); vec2 c = 0.3 + 0.4 * h22(id + seed);
  float ph = fract(uTime * speed * (0.6 + 0.8 * h21(id + seed + 5.0)) + h21(id + seed + 9.0));
  float rad = (0.06 + 0.2 * h21(id + seed + 3.0)) * smoothstep(0.0, 0.7, ph) * (1.0 - smoothstep(0.86, 1.0, ph));
  float d = distance(f, c);
  float ring = smoothstep(rad, rad - 0.06, d) - smoothstep(rad - 0.06, rad - 0.16, d);   // thin bright rim
  float fill = smoothstep(rad, rad - 0.02, d) * 0.35;
  return vec2(ring, fill);
}
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main() {
  float r = length(vP) / uR; if (r > 1.0) discard;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vWorld);
  // body colour: deep amber in the middle, lighter and frothier towards the wall, slow swirling convection
  vec2 sw = vP + 0.02 * vec2(sin(uTime * 0.9 + vP.y * 14.0), cos(uTime * 0.8 + vP.x * 12.0)) * uBoil;
  float cv = noise(sw * 9.0 + uTime * 0.35) * 0.6 + noise(sw * 21.0 - uTime * 0.5) * 0.4;
  vec3 col = mix(uDeep, uShallow, smoothstep(0.0, 1.0, r * 0.65 + cv * 0.45));
  // chilli-oil slicks: orange-red patches that drift on the surface
  float slick = smoothstep(0.62, 0.78, noise(sw * 6.0 + vec2(uTime * 0.12, -uTime * 0.09)));
  col = mix(col, uOil, slick * 0.55 * uOilAmt);
  // bubbles (two sizes) + foam at the wall
  vec2 b1 = bubbles(vP, 46.0, 0.55 * uBoil, 1.0), b2 = bubbles(vP + 0.13, 78.0, 0.8 * uBoil, 7.0);
  float foam = smoothstep(0.82, 1.0, r) * (0.55 + 0.45 * noise(vP * 70.0 + uTime));
  col += uFoam * (0.55 * (b1.x + b2.x * 0.7) + 0.16 * (b1.y + b2.y)) * uBoil + uFoam * foam * 0.55;
  // gloss (roughness ~0.1): sharp key-light highlight on the displaced normal + warm sky fresnel, then a tiny bit of fake subsurface warmth
  vec3 Hh = normalize(normalize(uKeyDir) + V);
  float spec = pow(max(dot(N, Hh), 0.0), 220.0) * 1.6 + pow(max(dot(N, Hh), 0.0), 40.0) * 0.12;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  col = col * (0.82 + 0.18 * dot(N, normalize(uKeyDir))) + vec3(1.0, 0.93, 0.8) * spec + vec3(0.62, 0.45, 0.28) * fres * 0.5;
  col += uShallow * 0.12 * (1.0 - r) * (0.5 + 0.5 * sin(uTime * 1.7));   // faint warm glow from the depths
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Polar grid on the XY plane: `rings` rings x `segs` segments (flat, normal +z); the vertex shader lays it on XZ and displaces it. */
function polarDisc(radius, rings, segs) {
  const pos = [], idx = [];
  pos.push(0, 0, 0);
  for (let i = 1; i <= rings; i++) for (let j = 0; j < segs; j++) { const a = (j / segs) * Math.PI * 2, r = radius * (i / rings); pos.push(Math.cos(a) * r, Math.sin(a) * r, 0); }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + j, 1 + ((j + 1) % segs));
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) { const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + ((j + 1) % segs), c = a + segs, d = b + segs; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}

/**
 * @param {{quality?: 'high'|'medium'|'low', envMap?: THREE.Texture|null}} [opts]
 * @returns {{ group: THREE.Group, brothUniforms: object, triggerSplash: (timeline: gsap.core.Timeline, timeOffset: number, positionX: number, positionZ: number) => number,
 *   update: () => void, brothWorld: () => THREE.Vector3, POT: object, stats: () => object, dispose: () => void }}
 */
export function createStockpot({ quality = 'high', envMap = null } = {}) {
  const T = TIERS[quality]; if (!T) throw new Error('createStockpot: unknown quality ' + quality);
  const { radius: R, height: H, brothY, brothRadius, maxSplashes: NS, dropletsPerSplash: ND } = POT;
  const group = new THREE.Group(); group.name = 'stockpot'; const disposables = [];

  // ---- pot body: one lathe (outer wall, bevelled rim, thick inner wall, floor). Heavy matte enamel.
  const prof = [[0.001, 0], [R - 0.045, 0], [R - 0.02, 0.006], [R - 0.004, 0.026], [R, 0.06], [R, H - 0.03], [R - 0.003, H - 0.012], [R - 0.012, H - 0.003], [R - 0.024, H - 0.003], [R - 0.03, H - 0.012], [R - POT.wall, H - 0.03], [R - POT.wall, 0.045], [R - POT.wall - 0.012, 0.03], [0.001, 0.03]].map((p) => new THREE.Vector2(p[0], p[1]));
  const bodyGeo = new THREE.LatheGeometry(prof, T.rad); bodyGeo.computeVertexNormals();
  const enamel = new THREE.MeshStandardMaterial({ color: POT.colors.enamel, roughness: 0.6, metalness: 0.02, envMap, envMapIntensity: 0.4 });
  const body = new THREE.Mesh(bodyGeo, enamel); body.name = 'potBody'; body.castShadow = true; body.receiveShadow = true; group.add(body);
  // ---- steel rim band (a fat torus on the lip) + two chunky looped handles with mounting bosses: ONE merged steel mesh
  const steel = new THREE.MeshStandardMaterial({ color: POT.colors.steel, roughness: 0.6, metalness: 0.35, envMap, envMapIntensity: 0.6 });
  const parts = []; const place = (g, p, r = [0, 0, 0], s = [1, 1, 1]) => { g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s))); return g; };
  parts.push(place(new THREE.TorusGeometry(R - 0.014, 0.0105, 10, T.rad), [0, H - 0.005, 0], [Math.PI / 2, 0, 0]));
  for (const sgn of [-1, 1]) {
    parts.push(place(new THREE.TorusGeometry(0.052, 0.0185, 12, 28), [sgn * (R + 0.042), H * 0.72, 0]));                                    // the loop (vertical ring, half buried in the wall)
    parts.push(place(new THREE.SphereGeometry(1, 14, 10), [sgn * (R + 0.002), H * 0.72, 0], [0, 0, 0], [0.026, 0.05, 0.05]));              // boss where it meets the wall
  }
  const steelGeo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g))); parts.forEach((g) => g.dispose());
  const steelMesh = new THREE.Mesh(steelGeo, steel); steelMesh.name = 'potSteel'; steelMesh.castShadow = true; steelMesh.receiveShadow = true; group.add(steelMesh);

  // ---- broth: polar grid + custom displacement shader (rolling boil + per-splash ripples)
  const imp = Array.from({ length: NS }, () => new THREE.Vector4(0, 0, 0, 0));
  const brothUniforms = {
    uTime: { value: 0 }, uBoil: { value: 1 }, uImp: { value: imp }, uR: { value: brothRadius }, uOilAmt: { value: 0.35 },
    uDeep: { value: new THREE.Color('#5A2A0C') }, uShallow: { value: new THREE.Color(POT.colors.broth) }, uFoam: { value: new THREE.Color('#E8B26A') }, uOil: { value: new THREE.Color('#C2410C') },
    uKeyDir: { value: new THREE.Vector3(-0.35, 0.9, 0.4) },
  };
  const brothMat = new THREE.ShaderMaterial({ uniforms: brothUniforms, vertexShader: BROTH_VERT, fragmentShader: BROTH_FRAG, side: THREE.DoubleSide });
  brothMat.toneMapped = true;
  const brothGeo = polarDisc(brothRadius, T.ring, T.rad);
  const broth = new THREE.Mesh(brothGeo, brothMat); broth.name = 'brothSurface'; broth.position.y = brothY; broth.frustumCulled = false; broth.receiveShadow = false; broth.castShadow = false;
  broth.rotation.x = 0; group.add(broth);

  // ---- splash droplets: ONE InstancedMesh, ND amber spheres per splash slot, parked at scale 0 under the surface
  const dGeo = new THREE.SphereGeometry(1, T.sph[0], T.sph[1]);
  const dMat = new THREE.MeshStandardMaterial({ color: POT.colors.droplet, roughness: 0.15, metalness: 0, emissive: '#7A3A08', emissiveIntensity: 0.5, envMap, envMapIntensity: 0.5 });
  const drops = new THREE.InstancedMesh(dGeo, dMat, NS * ND); drops.name = 'splashDroplets'; drops.frustumCulled = false; drops.castShadow = false; drops.receiveShadow = false; group.add(drops);
  // per-droplet closed-form parabola, seeded by a hash of (slot, j)
  const proto = []; for (let k = 0; k < NS; k++) for (let j = 0; j < ND; j++) { const s = k * 97 + j * 13 + 1, a = (j / ND) * Math.PI * 2 + hash(s) * 0.5, up = 0.55 + 0.55 * hash(s + 3);
    proto.push({ a, vh: 0.06 + 0.12 * hash(s + 1), vy: up, size: 0.0085 + 0.0075 * hash(s + 2), tf: (2 * up) / GRAVITY }); }
  const slots = Array.from({ length: NS }, () => ({ x: 0, z: 0, p: 0 })); let used = 0;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
  /** Single writer: every droplet matrix and every ripple uniform is an absolute function of the splash scalars. Safe to call any number of times, in any order. */
  function update() {
    for (let k = 0; k < NS; k++) {
      const sl = slots[k], active = k < used && sl.p > 0 && sl.p < 1;
      imp[k].set(sl.x, sl.z, active ? sl.p : 0, 0);
      for (let j = 0; j < ND; j++) {
        const i = k * ND + j;
        if (!active) { drops.setMatrixAt(i, HIDE); continue; }
        const d = proto[i], t = sl.p * FLIGHT;
        if (t >= d.tf) { drops.setMatrixAt(i, HIDE); continue; }
        const u = t / d.tf, s = d.size * Math.pow(Math.sin(Math.PI * u), 0.45) * (1 - 0.35 * u);     // grows out of the surface, thins as it falls back in
        const stretch = 1 + 0.6 * (1 - Math.abs(2 * u - 1));                                           // slightly stretched along its flight, round at the apex
        _p.set(sl.x + Math.cos(d.a) * d.vh * t, brothY + d.vy * t - 0.5 * GRAVITY * t * t, sl.z + Math.sin(d.a) * d.vh * t);
        _s.set(s, s * stretch, s); drops.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
      }
    }
    drops.instanceMatrix.needsUpdate = true;
  }
  for (let i = 0; i < NS * ND; i++) drops.setMatrixAt(i, HIDE); drops.instanceMatrix.needsUpdate = true;

  /** Adds ONE tween (a splash's progress scalar 0 -> 1) to `timeline` at `timeOffset`; returns the slot index. x / z are pot-local on the broth plane. */
  function triggerSplash(timeline, timeOffset, positionX, positionZ) {
    if (used >= NS) throw new Error('createStockpot: out of splash slots (max ' + NS + ')');
    const k = used++, sl = slots[k]; sl.x = positionX; sl.z = positionZ; sl.p = 0;
    timeline.fromTo(sl, { p: 0 }, { p: 1, duration: POT.splashDuration, ease: 'none', immediateRender: false, overwrite: false, onUpdate: update }, timeOffset);
    return k;
  }

  const api = {
    group, brothUniforms, triggerSplash, update, POT, splashSlots: slots, broth, body, steelMesh, drops,
    /** World position of the broth-surface centre (the origin the Beat-4 camera marks are authored around). */
    brothWorld() { group.updateWorldMatrix(true, false); return new THREE.Vector3(0, brothY, 0).applyMatrix4(group.matrixWorld); },
    stats() { let triangles = 0, drawCalls = 0; group.traverse((o) => { if (!o.isMesh || !o.visible) return; drawCalls++; const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count; triangles += (n / 3) * (o.isInstancedMesh ? o.count : 1); }); return { drawCalls, triangles }; },
    dispose() { [bodyGeo, steelGeo, brothGeo, dGeo, enamel, steel, brothMat, dMat].forEach((d) => d.dispose()); group.removeFromParent(); },
  };
  update();
  return api;
}
