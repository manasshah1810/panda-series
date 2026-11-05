import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Bamboo-Shoot Ramen hero bowl (Episode 1, Beat 1). 100% plant-based: wheat noodles (egg-free), amber vegetable broth
 * (opaque base + transmissive surface, noodles 60% submerged), menma, braised shiitake, baby bok choy, sweet corn, scallion rings, nori and chili-oil droplets. NO egg, meat, fish or seafood.
 *
 * Fully procedural (no files, no textures). Units are scene metres: the bowl is ~0.26 wide and sits with its foot on y = 0 of `group`.
 * `setTime(t)` (t in 0..1 = progress of the hero beat) is a pure function: steam, broth ripples and everything else are computed from
 * t alone in the shaders. No stateful physics, no Math.random (a seeded mulberry32 is used at build time only).
 *
 * @param {{quality?:'high'|'medium'|'low', scale?:number, envMap?:THREE.Texture|null}} [opts]
 * @returns {{group:THREE.Group, setTime:(t:number)=>void, setReveal:(k:number)=>void, dispose:()=>void, stats:()=>{triangles:number,drawCalls:number}}}
 */
export function createRamenBowl({ quality = 'high', scale = 1.0, envMap = null } = {}) {
  const Q = { high: { seg: 40, cap: 72, noodles: 12, deep: 6, nSeg: 20, stem: 10, leaf: [12, 7], bead: [8, 6], scal: 7, oil: 22, steam: 12 },
              medium: { seg: 32, cap: 48, noodles: 9, deep: 4, nSeg: 16, stem: 8, leaf: [8, 5], bead: [7, 5], scal: 7, oil: 18, steam: 10 },
              low: { seg: 24, cap: 36, noodles: 7, deep: 3, nSeg: 12, stem: 6, leaf: [6, 4], bead: [6, 4], scal: 6, oil: 12, steam: 8 } }[quality] ?? null;
  const BROTH_OPTICS = { thickness: 0.03, attenuationDistance: 0.05 };   // spec asked for 0.4: at bowl scale (0.26 m wide) that samples the table behind the bowl, so it is scaled to the bowl
  if (!Q) throw new Error('createRamenBowl: unknown quality ' + quality);

  const rng = mulberry32(20240611), R = (a, b) => a + (b - a) * rng();
  const col = (hex) => new THREE.Color(hex);
  const UP = new THREE.Vector3(0, 1, 0);

  const root = new THREE.Group(); root.name = 'ramenBowl'; root.scale.setScalar(scale);
  const inner = new THREE.Group(); inner.name = 'ramenBowlInner'; root.add(inner);   // reveal scale lives here, the outer scale stays the caller's
  const disposables = [];
  const mat = (params) => { const m = new THREE.MeshStandardMaterial({ envMap, envMapIntensity: 0.22, ...params }); disposables.push(m); return m; };
  const add = (geo, material, name, { cast = false } = {}) => { disposables.push(geo); const m = new THREE.Mesh(geo, material); m.name = name; m.castShadow = cast; m.receiveShadow = false; inner.add(m); return m; };

  // ------------------------------------------------------------------ bowl body (Lathe: thick flared wall + recessed foot ring)
  const spline2 = (pts, n) => new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(...p))).getPoints(n);
  const GLAZE = col('#C4573A'), CREAM = col('#EBDCBC'), UNGLAZED = col('#D6B58A');
  const prof = [];   // [r, y, color]
  const push = (r, y, c) => prof.push([r, y, c]);
  push(0.0015, 0.0085, UNGLAZED); push(0.040, 0.0085, UNGLAZED); push(0.046, 0.0008, UNGLAZED); push(0.0485, 0.0, UNGLAZED); push(0.058, 0.0, UNGLAZED); push(0.0625, 0.0035, UNGLAZED);   // recessed foot ring
  for (const p of spline2([[0.0625, 0.0035], [0.074, 0.016], [0.095, 0.036], [0.115, 0.062], [0.1275, 0.086]], 9).slice(1)) push(p.x, p.y, p.y > 0.083 ? CREAM : GLAZE);   // outer wall: glazed, cream band near the lip
  for (const [r, y] of [[0.1305, 0.0925], [0.1305, 0.0955], [0.1275, 0.0985], [0.1235, 0.0985], [0.1205, 0.0955]]) push(r, y, CREAM);   // rounded rim
  const innerWall = spline2([[0.1205, 0.0955], [0.1165, 0.0800], [0.1040, 0.0560], [0.0820, 0.0340], [0.0520, 0.0215], [0.0250, 0.0185]], 9);
  for (const p of innerWall.slice(1)) push(p.x, p.y, CREAM);   // inner wall
  push(0.0015, 0.0178, CREAM);
  const bodyGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), Q.seg);
  { const n = prof.length, c = new Float32Array(bodyGeo.attributes.position.count * 3); for (let i = 0; i < c.length / 3; i++) { const k = prof[i % n][2]; c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; } bodyGeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const bodyMat = mat({ vertexColors: true, roughness: 0.34, metalness: 0.04, envMapIntensity: 0.3 });
  const body = add(bodyGeo, bodyMat, 'bowlBody', { cast: true });

  // inner wall radius at height y (for broth + toppings that lean on the wall)
  const innerR = (y) => { for (let i = 1; i < innerWall.length; i++) { const a = innerWall[i - 1], b = innerWall[i]; if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) return a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y)); } return innerWall[0].x; };
  const BROTH_Y = 0.0645, BROTH_R = innerR(BROTH_Y) + 0.0025;

  // ------------------------------------------------------------------ polar layout of the toppings (angle a measured from +x towards +z, radius r from the bowl axis)
  const P2 = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  const D2R = Math.PI / 180;
  const LAY = { menma: 190 * D2R, bok: -38 * D2R, corn: -112 * D2R, nori: -95 * D2R, shiitake: 52 * D2R };
  /** ripple sources [x, z, radius]: the broth shader draws concentric chili-oil ripples around each one (max 8) */
  const RIP = [[...P2(LAY.shiitake, 0.082), 0.037], [...P2(LAY.menma, 0.078), 0.034], [...P2(LAY.bok, 0.05), 0.02], [...P2(LAY.bok, 0.088), 0.026],
               [...P2(LAY.corn, 0.058), 0.03], [...P2(LAY.nori, 0.099), 0.03]];

  // ------------------------------------------------------------------ broth, layer 1: deep amber-brown base disc (what the submerged noodles rest on)
  const BASE_Y = 0.040;
  { const g = new THREE.CircleGeometry(innerR(BASE_Y) - 0.0008, 40); g.rotateX(-Math.PI / 2);
    add(g, mat({ color: '#3D1E0B', roughness: 0.2, metalness: 0, envMapIntensity: 0.3 }), 'brothBase').position.y = BASE_Y; }

  // ------------------------------------------------------------------ broth, layer 2: transmissive surface (MeshPhysicalMaterial) + procedural ripples around the toppings
  const brothGeo = new THREE.CircleGeometry(BROTH_R, 64); brothGeo.rotateX(-Math.PI / 2);
  const brothMat = new THREE.MeshPhysicalMaterial({ color: '#9A5A22', roughness: 0.15, metalness: 0, transmission: 0.45, ior: 1.33, thickness: BROTH_OPTICS.thickness,
    attenuationColor: new THREE.Color('#8B4513'), attenuationDistance: BROTH_OPTICS.attenuationDistance, envMap, envMapIntensity: 0.4, specularIntensity: 1 });
  disposables.push(brothMat);
  const brothU = { uT: { value: 0 }, uR: { value: BROTH_R }, uRip: { value: Array.from({ length: 8 }, (_, i) => new THREE.Vector3(...(RIP[i] ?? [0, 0, 0]))) } };
  brothMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, brothU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLoc; varying vec3 vTx; varying vec3 vBz; varying vec3 vNy;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLoc = position; vTx = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vBz = normalize(normalMatrix * vec3(0.0, 0.0, 1.0)); vNy = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uR; uniform vec3 uRip[8]; varying vec3 vLoc; varying vec3 vTx; varying vec3 vBz; varying vec3 vNy;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float rN = clamp(length(vLoc.xz) / uR, 0.0, 1.0);
        vec2 dR = vLoc.xz / (length(vLoc.xz) + 1e-5);
        float ph = rN * 5.5 - uT * 0.9;
        float ring = pow(0.5 + 0.5 * sin(ph * 6.2831853), 7.0) * (0.3 + 0.7 * smoothstep(0.1, 0.9, rN));   // thin concentric oil rings
        // concentric ripples radiating from every topping: height h = exp(-k e) sin(w e - t); we need its gradient for the normal
        vec2 rg = vec2(0.0); float crest = 0.0;
        for (int i = 0; i < 8; i++) {
          vec3 c = uRip[i]; if (c.z < 1e-4) continue;
          vec2 d = vLoc.xz - c.xy; float r = length(d) + 1e-5, e = max(r - c.z, 0.0);
          float env = exp(-e * 70.0) * smoothstep(0.0, 0.004, e), arg = e * 520.0 - uT * 5.0, s = sin(arg);
          rg += (d / r) * env * (520.0 * cos(arg) - 70.0 * s); crest += env * s;
        }
        vec3 deepC = vec3(0.34, 0.13, 0.03), shalC = vec3(0.66, 0.32, 0.08);
        vec3 brothC = mix(deepC, shalC, smoothstep(0.0, 1.05, rN * 0.9 + 0.12));
        brothC += vec3(0.95, 0.60, 0.20) * (ring * 0.22 + max(crest, 0.0) * 0.16);
        brothC *= 1.0 - 0.45 * smoothstep(0.86, 1.0, rN);                       // meniscus shade where the broth meets the glaze
        diffuseColor.rgb = brothC;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 slope = rg * 0.00026 + dR * cos(ph * 6.2831853) * 0.028;
        normal = normalize(vNy - slope.x * vTx - slope.y * vBz);`);
  };
  brothMat.customProgramCacheKey = () => 'ramenBrothPhys2';
  const broth = add(brothGeo, brothMat, 'broth'); broth.position.y = BROTH_Y;

  // ------------------------------------------------------------------ helpers for merged procedural parts
  /** position+normal (+color) only, non-indexed, transformed. color: THREE.Color | (x,y,z,nx,ny,nz)=>Color */
  const part = (g0, matrix, color) => {
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(k === 'color' && !color)) g.deleteAttribute(k);
    if (color) { const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const k = color.isColor ? color : color(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    if (matrix) g.applyMatrix4(matrix);
    return g;
  };
  const merged = (list) => { const g = mergeGeometries(list); list.forEach((x) => x.dispose()); return g; };
  const M4 = (p, e = [0, 0, 0], s = [1, 1, 1]) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...e, 'YXZ')), new THREE.Vector3(...s));
  const ss = THREE.MathUtils.smoothstep;
  /** smooth the normals of coincident vertices (lathe seams, poles): computeVertexNormals alone leaves a visible lighter/darker seam line */
  const weld = (g) => { const p = g.attributes.position, n = g.attributes.normal, map = new Map(), key = (i) => Math.round(p.getX(i) * 1e5) + ',' + Math.round(p.getY(i) * 1e5) + ',' + Math.round(p.getZ(i) * 1e5);
    for (let i = 0; i < p.count; i++) { const k = key(i), a = map.get(k) ?? [0, 0, 0, []]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); a[3].push(i); map.set(k, a); }
    for (const [x, y, z, ids] of map.values()) { const l = Math.hypot(x, y, z) || 1; for (const i of ids) n.setXYZ(i, x / l, y / l, z / l); } return g; };

  /** tapered tube with an elliptical cross-section: broad axis = horizontal side vector, thin axis = the other. */
  function sweep(points, radius, { radial = 6, segs = 16, flat = 1, color = null } = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const pos = [], idx = [], P = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs; curve.getPointAt(u, P); curve.getTangentAt(u, T);
      S.crossVectors(T, UP); if (S.lengthSq() < 1e-8) S.set(1, 0, 0); S.normalize(); N.crossVectors(S, T).normalize();
      const r = typeof radius === 'function' ? radius(u) : radius;
      for (let j = 0; j < radial; j++) { const a = (j / radial) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r * flat; pos.push(P.x + S.x * c + N.x * s, P.y + S.y * c + N.y * s, P.z + S.z * c + N.z * s); }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return part(g, null, color);
  }

  // ------------------------------------------------------------------ noodles: warm ivory-yellow tubes, the top layer 60% submerged in the transmissive broth, deeper layers fully under it
  const NOODLE_R = 0.0048, NOODLE_SUBMERGED = 0.6;
  { const list = [], tone = [col('#F3E5AB'), col('#EDDC9F'), col('#F7EBB7')];
    const cap = (u) => NOODLE_R * Math.sqrt(1 - (1 - Math.min(1, u / 0.07, (1 - u) / 0.07)) ** 2);   // rounded, closed strand ends
    const info = [], strand = (yBase, amp, i, color, chord = false, layer = 'top') => {
      const th0 = R(0, Math.PI * 2), dir = rng() < 0.5 ? -1 : 1, rho = R(0.026, 0.074), sweepA = R(1.8, 2.8), ph = R(0, 6.28), pts = [];
      for (let k = 0; k <= 8; k++) { const s = k / 8; let x, z;
        if (chord) { const a = th0 + (s - 0.5) * 2.6 * dir, rr = 0.074 * (1 - 0.55 * Math.sin(Math.PI * s)), l = 0.012 * Math.sin(s * 6.3 + ph); x = Math.cos(a) * rr - Math.sin(a) * l; z = Math.sin(a) * rr + Math.cos(a) * l; }
        else { const th = th0 + dir * sweepA * s, rr = Math.min(0.09, Math.max(0.02, rho + 0.012 * Math.sin(s * 7 + ph))); x = Math.cos(th) * rr; z = Math.sin(th) * rr; }
        pts.push([x, yBase + amp * Math.sin(s * 11 + ph * 1.7), z]); }
      const g = sweep(pts, cap, { radial: 6, segs: Q.nSeg, color }); list.push(g); info.push({ layer, n: g.attributes.position.count });
    };
    // surface layer: tube centre sits 0.1 diameter below the plane, i.e. 60% of the tube is under the surface (+-0.0013 of wave so some coils dip, some peek)
    const yTop = BROTH_Y - (NOODLE_SUBMERGED - 0.5) * 2 * NOODLE_R;
    for (let i = 0; i < Q.noodles; i++) strand(yTop, 0.0013, i, tone[i % 3], i % 3 === 2);   // every third strand is a chord that crosses the middle of the bowl
    for (let i = 0; i < Q.deep; i++) strand(BROTH_Y - 0.0068 - 0.0042 * (i % 3), 0.0012, i, tone[(i + 1) % 3].clone().multiplyScalar(0.92), false, 'deep');
    const ng = merged(list); ng.userData.strands = info; ng.userData.radius = NOODLE_R;   // per-strand vertex ranges, read by the verification script
    add(ng, mat({ vertexColors: true, roughness: 0.35, metalness: 0, envMapIntensity: 0.3 }), 'noodles'); }

  // ------------------------------------------------------------------ menma: 4 overlapping bevelled slices fanned in an arc, horizontal ridge striations
  { const list = [], MENMA = col('#C89D5C'), L = 0.05, W = 0.016, T = 0.0045, nx = 20, nz = 4, bev = 0.0035, per = 0.0095, amp = 0.0004;
    /** closed bevelled slab: top/bottom height fields h(x,z) (rounded edge) + ridges across the length; border vertices are shared so the bevel shades smoothly */
    const slab = () => {
      const pos = [], idx = [], top = [], bot = [], hh = (x, z) => { const e = Math.min(L / 2 - Math.abs(x), W / 2 - Math.abs(z)), t = Math.min(1, Math.max(0, e / bev)); return { h: (T / 2) * Math.sqrt(1 - (1 - t) * (1 - t)), t }; };
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -L / 2 + (L * i) / nx, z = -W / 2 + (W * j) / nz, { h, t } = hh(x, z); top.push(pos.length / 3); pos.push(x, h + amp * t * Math.sin((2 * Math.PI * x) / per), z); }
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -L / 2 + (L * i) / nx, z = -W / 2 + (W * j) / nz, { h, t } = hh(x, z); if (i === 0 || i === nx || j === 0 || j === nz) bot.push(top[j * (nx + 1) + i]); else { bot.push(pos.length / 3); pos.push(x, -h + 0.4 * amp * t * Math.sin((2 * Math.PI * x) / per), z); } }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(top[a], top[c], top[b], top[b], top[c], top[d]); idx.push(bot[a], bot[b], bot[c], bot[b], bot[d], bot[c]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    const base = slab(), tmp = new THREE.Color(), lean = 12 * D2R, r0 = 0.056;
    for (let k = 0; k < 4; k++) {
      const a = LAY.menma + (k - 1.5) * 0.21, [dx, dz] = [Math.cos(a), Math.sin(a)], shade = 0.94 + 0.05 * (k % 2) + 0.02 * k, cx = dx * (r0 + (L / 2) * Math.cos(lean)), cz = dz * (r0 + (L / 2) * Math.cos(lean));
      const cy = BROTH_Y - 0.0008 + k * 0.0014 + (L / 2) * Math.sin(lean);
      const colorFn = (x) => tmp.setRGB(MENMA.r * shade, MENMA.g * shade, MENMA.b * shade).multiplyScalar(1 - 0.075 * (0.5 + 0.5 * Math.cos((2 * Math.PI * x) / per))).clone();   // darker valleys = striations
      list.push(part(base, M4([cx, cy, cz], [0, -a, lean]), colorFn));
    }
    base.dispose(); add(merged(list), mat({ vertexColors: true, roughness: 0.4, metalness: 0, envMapIntensity: 0.3 }), 'menma'); }

  // ------------------------------------------------------------------ braised shiitake: mahogany dome, two crossing recessed notches (+) with lighter braised flesh inside, tilted against the rim
  const SHI = { R: 0.0328, notchHW: 0.0043, depth: 0.0019 };
  { const cap = [[0, 0.0205], [0.008, 0.0202], [0.016, 0.0188], [0.023, 0.0162], [0.0285, 0.0122], [0.0318, 0.0075], [0.0328, 0.0035], [0.0305, 0.0006], [0.026, 0.0], [0.014, 0.0012], [0, 0.0022]];
    const g0 = new THREE.LatheGeometry(spline2(cap.slice().reverse(), 14), Q.cap);   // bottom -> crown so the normals face outward
    const MAH = col('#331B10'), FLESH = col('#704832'), GILL = col('#4A2C1B'), tmp = new THREE.Color();
    // groove weight 0..1: two perpendicular V-ish grooves (along x and z), stopping smoothly before the flank
    const groove = (x, z, y, ny) => { const w = Math.max(Math.max(0, 1 - Math.abs(z) / SHI.notchHW), Math.max(0, 1 - Math.abs(x) / SHI.notchHW)); return w * (1 - ss(Math.hypot(x, z), 0.0225, 0.0275)) * ss(ny, 0.62, 0.9); };
    { const p = g0.attributes.position, n = g0.attributes.normal, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = n.getY(i), w = groove(x, z, y, ny);
        tmp.copy(ny < -0.3 && y < 0.007 ? GILL : MAH); c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b;
        if (w > 0) { const d = SHI.depth * ss(w, 0.0, 0.5); p.setXYZ(i, x - n.getX(i) * d, y - ny * d, z - n.getZ(i) * d); } }
      g0.setAttribute('color', new THREE.BufferAttribute(c, 3)); g0.computeVertexNormals(); weld(g0); }
    const g1 = part(g0, null, null);
    const shiMat = mat({ vertexColors: true, roughness: 0.34, metalness: 0.02, envMapIntensity: 0.3 });
    shiMat.onBeforeCompile = (sh) => {   // the two crossing notches are painted per pixel (exact straight edges) on top of the carved geometry
      sh.uniforms.uFlesh = { value: FLESH.clone() };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCap;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCap = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFlesh; varying vec3 vCap;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float gx = 1.0 - smoothstep(${(SHI.notchHW * 0.82).toFixed(5)}, ${SHI.notchHW.toFixed(5)}, abs(vCap.x)), gz = 1.0 - smoothstep(${(SHI.notchHW * 0.82).toFixed(5)}, ${SHI.notchHW.toFixed(5)}, abs(vCap.z));
          float gm = max(gx, gz) * (1.0 - smoothstep(0.0225, 0.0275, length(vCap.xz))) * smoothstep(0.011, 0.014, vCap.y);
          float ex = smoothstep(${(SHI.notchHW * 0.55).toFixed(5)}, ${SHI.notchHW.toFixed(5)}, abs(vCap.x)) * gx, ez = smoothstep(${(SHI.notchHW * 0.55).toFixed(5)}, ${SHI.notchHW.toFixed(5)}, abs(vCap.z)) * gz;
          float wall = (gx > 0.0 && gz > 0.0) ? min(ex, ez) : max(ex, ez);       // shaded walls of the cut (not where the two grooves cross)
          diffuseColor.rgb = mix(diffuseColor.rgb, uFlesh, gm) * (1.0 - 0.4 * wall * (1.0 - smoothstep(0.0225, 0.0275, length(vCap.xz))));`);
    };
    shiMat.customProgramCacheKey = () => 'ramenShiitake1';
    const mush = add(g1, shiMat, 'shiitake');
    const [sx, sz] = P2(LAY.shiitake, 0.082), tang = new THREE.Vector3(-Math.sin(LAY.shiitake), 0, Math.cos(LAY.shiitake)), rad = new THREE.Vector3(Math.cos(LAY.shiitake), 0, Math.sin(LAY.shiitake));
    let qt = new THREE.Quaternion().setFromAxisAngle(tang, 12 * D2R); if (rad.clone().applyQuaternion(qt).y < 0) qt = new THREE.Quaternion().setFromAxisAngle(tang, -12 * D2R);   // outer edge UP (resting on the rim), inner edge dips into the broth
    mush.quaternion.copy(qt).multiply(new THREE.Quaternion().setFromAxisAngle(UP, 0.35)); mush.position.set(sx, BROTH_Y + 0.0036, sz); }

  // ------------------------------------------------------------------ baby bok choy: thick ivory S-curved stems dipped in the broth, jade leaf blades curling over the rim
  { const stems = [], leaves = [], IV = col('#E8ECE1'), JADE = col('#2A5A3B'), JADE2 = col('#3C7650'), N5 = 5, tmp = new THREE.Color();
    const sS = [0.034, 0.05, 0.066, 0.08, 0.092], sY = [0.0535, 0.0585, 0.0685, 0.0765, 0.082];                       // stem centreline (s = distance from the axis, y)
    const lS = [0.092, 0.106, 0.1205, 0.1275, 0.1335, 0.142, 0.15], lY = [0.082, 0.0915, 0.0997, 0.1002, 0.099, 0.0925, 0.082];   // leaf centreline: over the rim lip, then drooping outside
    for (let k = 0; k < N5; k++) {
      const f = k - (N5 - 1) / 2, ang = LAY.bok + f * 0.12, dx = Math.cos(ang), dz = Math.sin(ang), sx = -dz, sz = dx;
      const lat = (s) => f * (0.0042 + 0.0032 * (s - 0.034) / 0.058) + 0.0042 * Math.sin(((s - 0.034) / 0.058) * Math.PI * 2);   // plan-view S-curve
      const at = (s, y, l = lat(s)) => [dx * s + sx * l, y, dz * s + sz * l];
      stems.push(sweep(sS.map((s, i) => at(s, sY[i] + 0.0008 * (2 - Math.abs(f)) * (i / 4))), (u) => 0.0082 - 0.0036 * u, { radial: 6, segs: Q.stem, flat: 0.52, color: (x, y) => tmp.copy(IV).lerp(JADE2, 0.4 * ss(y, 0.07, 0.086)).clone() }));
      // leaf blade: spoon-shaped ribbon continuing the stem, cupped, ruffled at the edge
      const spl = new THREE.CatmullRomCurve3(lS.map((s, i) => new THREE.Vector3(s, lY[i], 0)), false, 'centripetal'), [nu, nv] = Q.leaf, pos = [], c3 = [], idx = [], Wm = 0.0175 - Math.abs(f) * 0.0018, P = new THREE.Vector3();
      for (let i = 0; i <= nu; i++) { const u = i / nu; spl.getPointAt(u, P); const s = P.x, wd = Wm * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.6), l0 = lat(0.092) + f * 0.003 * u;
        for (let j = 0; j <= nv; j++) { const v = (j / nv) * 2 - 1, cup = 0.0055 * v * v * (0.4 + u), ruf = 0.0009 * Math.sin(v * 5 + u * 9 + k) * Math.abs(v) * u * (1 - u), [px, , pz] = at(s, 0, l0 + v * wd);
          pos.push(px, P.y + cup + ruf, pz); const c = JADE.clone().lerp(JADE2, Math.abs(v) * 0.7 * u + (k % 2) * 0.1); c3.push(c.r, c.g, c.b); } }
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(c3, 3)); lg.setIndex(idx); lg.computeVertexNormals();
      leaves.push(part(lg, null, null));
    }
    add(merged(stems), mat({ vertexColors: true, roughness: 0.38, metalness: 0, envMapIntensity: 0.3 }), 'bokChoyStems');
    add(merged(leaves), mat({ vertexColors: true, roughness: 0.42, metalness: 0, side: THREE.DoubleSide }), 'bokChoyLeaves'); }

  // ------------------------------------------------------------------ sweet corn: 12-16 golden beads, cluster nestled between the menma and the bok choy (second layer sits in the gaps of the first)
  const CORN = { n: 14 };
  { const geo = new THREE.SphereGeometry(1, Q.bead[0], Q.bead[1]); disposables.push(geo);
    const mesh = new THREE.InstancedMesh(geo, mat({ color: '#F5C028', roughness: 0.3, metalness: 0, envMapIntensity: 0.3 }), CORN.n); mesh.name = 'cornBeads'; mesh.frustumCulled = false;
    const [cx, cz] = P2(LAY.corn, 0.058), L1 = [], d = new THREE.Object3D(), sp = 0.0132;
    for (let gz = -3; gz <= 3 && L1.length < 10; gz++) for (let gx = -3; gx <= 3 && L1.length < 10; gx++) { const x = gx * sp + (gz & 1 ? sp / 2 : 0), z = gz * sp * 0.87; if ((x * x) / 0.032 ** 2 + (z * z) / 0.021 ** 2 <= 1.0) L1.push([x + R(-0.0012, 0.0012), z + R(-0.0012, 0.0012), R(0.0068, 0.0078)]); }
    const place = (i, x, y, z, s) => { d.position.set(cx + x, y, cz + z); d.scale.set(s, s * R(0.92, 1.0), s * R(0.96, 1.04)); d.rotation.set(R(0, 3), R(0, 3), 0); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); };
    L1.forEach(([x, z, s], i) => place(i, x, BROTH_Y + s * 0.35, z, s));   // layer 1: about 65% above the surface, bead bottoms submerged
    for (let i = L1.length; i < CORN.n; i++) { const a = L1[(i * 3) % L1.length], b = L1[(i * 3 + 2) % L1.length], x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, s = R(0.0062, 0.0072), dd = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2;
      place(i, x, BROTH_Y + a[2] * 0.35 + Math.sqrt(Math.max(1e-8, (a[2] + s) ** 2 - dd * dd)) * 0.92, z, s); }   // layer 2: resting in the dip between two layer-1 beads
    mesh.instanceMatrix.needsUpdate = true; inner.add(mesh); disposables.push(mesh); }

  // ------------------------------------------------------------------ scallion rings: 7 double-ring cuts (spring-green rim, pale inner ring + core)
  { const n = Q.scal, RR = 0.0082, TR = 0.002, GREEN = col('#43A047'), PALE = col('#D4E4AE'), CORE = col('#E6EFC8');
    const outer = new THREE.TorusGeometry(RR, TR, 4, 10); outer.rotateX(Math.PI / 2); const innerR2 = new THREE.TorusGeometry(RR * 0.55, TR * 0.65, 4, 8); innerR2.rotateX(Math.PI / 2);
    const disc = new THREE.CircleGeometry(RR * 0.55, 8); disc.rotateX(-Math.PI / 2); disc.translate(0, -0.0003, 0);
    const g = merged([part(outer, null, GREEN), part(innerR2, null, PALE), part(disc, null, CORE)]); disposables.push(g);
    const mesh = new THREE.InstancedMesh(g, mat({ vertexColors: true, roughness: 0.4, metalness: 0 }), n); mesh.name = 'scallionRings'; mesh.frustumCulled = false;
    const d = new THREE.Object3D(), put = [], free = (x, z) => RIP.every(([rx, rz, rr]) => rr < 1e-4 || Math.hypot(x - rx, z - rz) > rr + RR + 0.004) && put.every(([px, pz]) => Math.hypot(x - px, z - pz) > 2.6 * RR);
    for (let i = 0, tries = 0; i < n && tries < 400; tries++) { const a = R(0, 6.283), rr = Math.sqrt(R(0.04, 1.0)) * 0.092, x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (!free(x, z)) continue;
      const onNoodles = rr < 0.07; d.position.set(x, BROTH_Y + (onNoodles ? 0.0046 : 0.0012), z); d.rotation.set(R(-0.1, 0.1), R(0, 3.14), R(-0.1, 0.1)); d.scale.setScalar(R(0.85, 1.1)); d.updateMatrix(); put.push([x, z]); mesh.setMatrixAt(i++, d.matrix); }
    mesh.instanceMatrix.needsUpdate = true; inner.add(mesh); disposables.push(mesh); }

  // ------------------------------------------------------------------ nori: dark toasted olive-black, matte, tucked vertically into the back rim at a 20 degree jaunt
  { const w = 0.07, h = 0.082, g0 = new THREE.PlaneGeometry(w, h, 7, 6), p = g0.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = x / w, v = y / h + 0.5; p.setZ(i, 0.0035 * Math.sin(u * 8 + v * 3) * v - (x * x) / (2 * 0.112)); p.setY(i, y + 0.0015 * Math.sin(u * 9) * v); }
    g0.computeVertexNormals(); g0.deleteAttribute('uv');
    const A = LAY.nori, lean = 20 * D2R, rb = 0.1005, yb = 0.056, o = [Math.cos(A), Math.sin(A)];
    g0.applyMatrix4(M4([o[0] * rb + o[0] * Math.sin(lean) * h / 2, yb + Math.cos(lean) * h / 2, o[1] * rb + o[1] * Math.sin(lean) * h / 2], [lean, Math.PI / 2 - A, 0]));
    add(g0, mat({ color: '#1A211B', roughness: 0.7, metalness: 0, envMapIntensity: 0.12, side: THREE.DoubleSide }), 'nori'); }

  // ------------------------------------------------------------------ chili-oil droplets: tiny crimson lens-shaped beads floating on the broth around the toppings
  { const n = Q.oil, geo = new THREE.SphereGeometry(1, 8, 5); disposables.push(geo);
    const mesh = new THREE.InstancedMesh(geo, mat({ color: '#A91B0D', roughness: 0.1, metalness: 0, envMapIntensity: 0.9 }), n); mesh.name = 'oilBeads'; mesh.frustumCulled = false;
    const d = new THREE.Object3D(), src = RIP.filter((r) => r[2] > 1e-4);
    for (let i = 0, tries = 0; i < n && tries < 600; tries++) { const [rx, rz, rr] = src[Math.floor(R(0, src.length))], a = R(0, 6.283), dist = rr * R(1.05, 1.6) + 0.004, x = rx + Math.cos(a) * dist, z = rz + Math.sin(a) * dist;
      if (Math.hypot(x, z) > BROTH_R - 0.012 || src.some(([ox, oz, or2]) => Math.hypot(x - ox, z - oz) < or2 + 0.003)) continue;
      const s = R(0.0021, 0.0042); d.position.set(x, BROTH_Y + s * 0.18, z); d.scale.set(s, s * 0.5, s); d.rotation.set(0, R(0, 3), 0); d.updateMatrix(); mesh.setMatrixAt(i++, d.matrix); }
    mesh.instanceMatrix.needsUpdate = true; inner.add(mesh); disposables.push(mesh); }

  // ------------------------------------------------------------------ steam: instanced soft billow planes, everything from one uniform (t)
  const steamGeo = new THREE.InstancedBufferGeometry(); steamGeo.copy(new THREE.PlaneGeometry(1, 1)); steamGeo.instanceCount = Q.steam; disposables.push(steamGeo);
  { const seeds = new Float32Array(Q.steam * 4);
    for (let i = 0; i < Q.steam; i++) { seeds[i * 4] = (i + R(0.0, 0.6)) / Q.steam; seeds[i * 4 + 1] = R(-1, 1); seeds[i * 4 + 2] = R(-1, 1); seeds[i * 4 + 3] = rng(); }
    steamGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4)); }
  const steamU = { uT: { value: 0 }, uCycles: { value: 1.4 }, uRise: { value: 0.42 }, uInt: { value: 0.8 }, uBaseY: { value: 0.1 }, uColor: { value: col('#F4EDE0') } };
  const steamMat = new THREE.ShaderMaterial({ uniforms: steamU, transparent: true, depthWrite: false, toneMapped: true,
    vertexShader: `uniform float uT, uCycles, uRise, uInt, uBaseY; attribute vec4 aSeed; varying vec2 vUv; varying float vA; varying float vS;
      void main() {
        float life = fract(aSeed.x + uT * uCycles);
        float env = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.45, 1.0, life));
        vec3 c = vec3(aSeed.y * 0.06, uBaseY + life * uRise, aSeed.z * 0.06);
        float sw = life * 6.2831853 + aSeed.w * 6.2831853;
        c.x += sin(sw) * 0.028 * life; c.z += cos(sw * 0.8) * 0.022 * life; c.xz *= 1.0 + 0.7 * life;
        float size = (0.09 + 0.17 * life) * (0.8 + 0.45 * aSeed.w);
        float sc = length(modelMatrix[0].xyz);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * size * sc;
        gl_Position = projectionMatrix * mv;
        vA = env * uInt * smoothstep(0.02, 0.07, -mv.z); vUv = position.xy * 2.0; vS = aSeed.w;
      }`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying float vA; varying float vS;
      void main() {
        float d = length(vUv), ang = atan(vUv.y, vUv.x);
        float edge = 1.0 + 0.16 * sin(ang * 3.0 + vS * 20.0) + 0.09 * sin(ang * 5.0 - vS * 13.0);
        float a = 1.0 - smoothstep(0.12 * edge, edge, d);
        gl_FragColor = vec4(uColor, a * vA * 0.95);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  disposables.push(steamMat);
  const steam = new THREE.Mesh(steamGeo, steamMat); steam.name = 'steam'; steam.frustumCulled = false; steam.renderOrder = 5; steam.castShadow = false; inner.add(steam);

  // ------------------------------------------------------------------ API
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const api = {
    group: root,
    /** broth surface height in the group's local space (the steam plunge measures the camera's distance to this plane) */
    brothY: BROTH_Y,
    /** t in 0..1: progress of the hero beat. Pure: only uniforms are written. */
    setTime(t) { t = Math.min(1, Math.max(0, t)); brothU.uT.value = t * 2.45; steamU.uT.value = t; steamU.uInt.value = 0.62 + 0.6 * sm(0.55, 1.0, t); },
    /** 0 = hidden, 1 = fully shown (scale pop for the whip reveal). */
    setReveal(k) { inner.visible = k > 0.001; inner.scale.setScalar(Math.max(0.001, k)); },
    stats() { let triangles = 0, drawCalls = 0; root.traverse((o) => { if (!o.isMesh || !o.visible) return; drawCalls++; const g = o.geometry; triangles += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : (g.instanceCount ?? 1)); }); return { triangles: Math.round(triangles), drawCalls }; },
    dispose() { disposables.forEach((d) => d.dispose?.()); root.removeFromParent(); root.clear(); },
  };
  api.setTime(0);
  return api;
}

/** Small seeded PRNG (build time only). */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
