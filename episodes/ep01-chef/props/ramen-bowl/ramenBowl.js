import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Bamboo-Shoot Ramen hero bowl (Episode 1, Beat 1). 100% plant-based: wheat noodles (egg-free), amber vegetable broth,
 * menma, braised shiitake, baby bok choy, sweet corn, scallion rings and nori. NO egg, meat, fish or seafood.
 *
 * Fully procedural (no files, no textures). Units are scene metres: the bowl is ~0.26 wide and sits with its foot on y = 0 of `group`.
 * `setTime(t)` (t in 0..1 = progress of the hero beat) is a pure function: steam, broth ripples and everything else are computed from
 * t alone in the shaders. No stateful physics, no Math.random (a seeded mulberry32 is used at build time only).
 *
 * @param {{quality?:'high'|'medium'|'low', scale?:number, envMap?:THREE.Texture|null}} [opts]
 * @returns {{group:THREE.Group, setTime:(t:number)=>void, setReveal:(k:number)=>void, dispose:()=>void, stats:()=>{triangles:number,drawCalls:number}}}
 */
export function createRamenBowl({ quality = 'high', scale = 1.0, envMap = null } = {}) {
  const Q = { high: { seg: 44, noodles: 10, nSeg: 32, corn: [14, 10, 7], rings: 16, steam: 12, leaf: [12, 7] },
              medium: { seg: 32, noodles: 8, nSeg: 24, corn: [14, 8, 6], rings: 14, steam: 10, leaf: [9, 6] },
              low: { seg: 24, noodles: 6, nSeg: 20, corn: [12, 7, 5], rings: 10, steam: 8, leaf: [7, 5] } }[quality] ?? null;
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

  // ------------------------------------------------------------------ broth: glossy amber, concentric oil ripples, depth falloff (pure function of uT)
  const brothGeo = new THREE.CircleGeometry(BROTH_R, 64); brothGeo.rotateX(-Math.PI / 2);
  const brothMat = mat({ color: '#B8671F', roughness: 0.28, metalness: 0.18, envMapIntensity: 0.45 });
  const brothU = { uT: { value: 0 }, uR: { value: BROTH_R } };
  brothMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, brothU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLoc; varying vec3 vDirW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position; vDirW = normalize(mat3(modelMatrix) * vec3(position.x, 0.0, position.z) + vec3(1e-6));');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uR; varying vec3 vLoc; varying vec3 vDirW;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float rN = clamp(length(vLoc.xz) / uR, 0.0, 1.0);
        vec3 deepC = vec3(0.30, 0.115, 0.022), shalC = vec3(0.86, 0.46, 0.12);
        vec3 brothC = mix(deepC, shalC, smoothstep(0.0, 1.05, rN * 0.9 + 0.12));       // deeper toward the middle, lighter and shallower at the wall
        float ph = rN * 5.5 - uT * 0.9;
        float ring = pow(0.5 + 0.5 * sin(ph * 6.2831853), 7.0) * (0.35 + 0.65 * smoothstep(0.1, 0.9, rN));   // thin concentric oil rings
        float ring2 = pow(0.5 + 0.5 * sin((rN * 11.0 + 0.37 - uT * 1.4) * 6.2831853), 14.0) * 0.5;
        brothC += vec3(0.95, 0.62, 0.20) * (ring * 0.38 + ring2 * 0.22);
        brothC *= 1.0 - 0.5 * smoothstep(0.86, 1.0, rN);                                // meniscus shade where the broth meets the glaze
        diffuseColor.rgb = brothC;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float gr = (cos(ph * 6.2831853) * 0.5 + cos((rN * 11.0 + 0.37 - uT * 1.4) * 6.2831853) * 0.28) * 0.07;
        vec3 nW = normalize(vec3(-vDirW.x * gr, 1.0, -vDirW.z * gr));
        normal = normalize(mat3(viewMatrix) * nW);`);
  };
  brothMat.customProgramCacheKey = () => 'ramenBroth1';
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
  const surf = (x, z) => 0.0665 + 0.019 * Math.max(0, 1 - (x * x + z * z) / (0.105 * 0.105));   // noodle mound surface height

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

  // ------------------------------------------------------------------ noodles: wavy egg-free wheat strands heaped in the middle
  { const list = [], tone = [col('#E6C98A'), col('#DDBE7C'), col('#EBD29B')];
    for (let i = 0; i < Q.noodles; i++) {
      const th0 = R(0, Math.PI * 2), dir = rng() < 0.5 ? -1 : 1, rho = R(0.0, 0.075), sweepA = R(1.6, 2.6), ph = R(0, 6.28), pts = [];
      for (let k = 0; k <= 9; k++) { const s = k / 9, th = th0 + dir * sweepA * s, rr = Math.min(0.1, Math.max(0.0, rho + 0.02 * Math.sin(s * 9 + ph))), x = Math.cos(th) * rr, z = Math.sin(th) * rr;
        pts.push([x, surf(x, z) - 0.003 + 0.006 * Math.sin(s * 14 + ph * 1.7) + R(0, 0.002), z]); }
      list.push(sweep(pts, 0.0042, { radial: 5, segs: Q.nSeg, color: tone[i % 3] }));
    }
    add(merged(list), mat({ vertexColors: true, roughness: 0.42, metalness: 0 }), 'noodles'); }

  // ------------------------------------------------------------------ menma (bamboo shoots): fan of 5 chamfered, 3-segment slices, #D4A359
  { const list = [], MENMA = col('#D4A359'), segL = 0.019, gap = 0.0016, w = 0.017, th = 0.0055;
    const shape = new THREE.Shape(), hx = segL / 2, hy = w / 2, rc = 0.0025;
    shape.moveTo(-hx + rc, -hy); shape.lineTo(hx - rc, -hy); shape.absarc(hx - rc, -hy + rc, rc, -Math.PI / 2, 0); shape.lineTo(hx, hy - rc); shape.absarc(hx - rc, hy - rc, rc, 0, Math.PI / 2); shape.lineTo(-hx + rc, hy); shape.absarc(-hx + rc, hy - rc, rc, Math.PI / 2, Math.PI); shape.lineTo(-hx, -hy + rc); shape.absarc(-hx + rc, -hy + rc, rc, Math.PI, Math.PI * 1.5);
    const seg = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0013, bevelSegments: 2, curveSegments: 3 }); seg.translate(0, 0, -th / 2); seg.rotateX(-Math.PI / 2);
    for (let k = 0; k < 5; k++) {
      const phi = Math.PI * 1.22 + (k - 2) * 0.2, rad = 0.066 + 0.002 * (k % 2), lift = 0.004 * k;   // fan around the back-left of the bowl, leaning on the wall
      const cx = Math.cos(phi) * rad, cz = Math.sin(phi) * rad, cy = surf(cx, cz) + 0.0085 + lift;
      for (let s = -1; s <= 1; s++) {
        const shade = 1 + (s === 0 ? 0.06 : -0.03) + (k % 2) * 0.03, m = M4([s * (segL + gap), 0, 0]);
        const g = part(seg, m, new THREE.Color(MENMA.r * shade, MENMA.g * shade, MENMA.b * shade));
        // slice frame: long axis radial-outward, tipped up toward the rim
        g.applyMatrix4(M4([cx, cy, cz], [0, -phi, 0.0], [1, 1, 1]).multiply(M4([0, 0, 0], [0, 0, 0.3])));
        list.push(g);
      }
    }
    seg.dispose(); add(merged(list), mat({ vertexColors: true, roughness: 0.4, metalness: 0 }), 'menma'); }

  // ------------------------------------------------------------------ braised shiitake: lathe dome, two crossed v-notches, short thick stem
  { const cap = [[0.0005, 0.0205], [0.008, 0.0202], [0.016, 0.0188], [0.023, 0.0162], [0.0285, 0.0122], [0.0318, 0.0075], [0.0328, 0.0035], [0.0305, 0.0006], [0.026, 0.0], [0.014, 0.0012], [0.0005, 0.0022]];
    const g0 = new THREE.LatheGeometry(spline2(cap.slice().reverse(), 16), Math.round(Q.seg * 1.25))   // bottom -> crown, so normals face outward; g0.translate(0, 0.0075, 0);
    const MAH = col('#3B2317'), FLESH = col('#D9B88A'), GILL = col('#B88B5E'), notchHW = 0.0062, depth = 0.0046, tmp = new THREE.Color(), ss = THREE.MathUtils.smoothstep;
    // 0..1 notch weight: two crossed V-grooves on the crown, faded out smoothly toward the cap's flank so the cut has no ragged edge
    const notch = (x, y, z, ny) => { let d = 0; for (const a of [Math.PI / 4, (3 * Math.PI) / 4]) d = Math.max(d, 1 - Math.abs(x * Math.sin(a) - z * Math.cos(a)) / notchHW); return Math.max(0, d) * ss(ny, 0.2, 0.7) * ss(y - 0.0075, 0.006, 0.012); };
    { const p = g0.attributes.position, n = g0.attributes.normal, v = new THREE.Vector3();   // carve (on the indexed lathe so normals stay smooth): push crown vertices inward along their normals
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = notch(x, y, z, n.getY(i)); if (d <= 0) continue;
        v.set(n.getX(i), n.getY(i), n.getZ(i)).multiplyScalar(-depth * d); p.setXYZ(i, x + v.x, y + v.y, z + v.z); }
      const ny0 = Float32Array.from(n.array); g0.computeVertexNormals(); g0.userData.ny0 = ny0; }
    const capG = part(g0, null, (x, y, z, nx, ny) => { const under = ny < -0.35 && y - 0.0075 < 0.006; return tmp.copy(under ? GILL : MAH).lerp(FLESH, ss(notch(x, y, z, 1), 0.5, 0.9)).clone(); });
    const stemG = part(new THREE.LatheGeometry([[0.0005, 0.0], [0.012, 0.0], [0.0135, 0.006], [0.0115, 0.0125], [0.0105, 0.016], [0.0005, 0.016]].map((p) => new THREE.Vector2(...p)), 16), M4([0.0085, -0.0075, 0.0], [0, 0, -0.25]), (x, y) => tmp.copy(FLESH).lerp(col('#A9825A'), 0.3 + y * 8).clone());
    const g = merged([capG, stemG]);
    const mush = add(g, mat({ vertexColors: true, roughness: 0.36, metalness: 0.02, envMapIntensity: 0.3 }), 'shiitake');
    mush.position.set(0.045, surf(0.045, 0.035) - 0.006, 0.035); mush.rotation.set(0.16, 0.5, 0.12, 'YXZ'); }

  // ------------------------------------------------------------------ baby bok choy: ivory curved stems flaring into jade leaves
  { const stems = [], leaves = [], IV = col('#E8ECE1'), JADE = col('#2D5A3E'), JADE2 = col('#3A6E4B'), N5 = 5, baseAng = -0.62;
    const base = new THREE.Vector3(0.03, surf(0.03, -0.02) + 0.003, -0.02);
    for (let k = 0; k < N5; k++) {
      const f = (k - (N5 - 1) / 2), ang = baseAng + f * 0.17, len = 0.052 - Math.abs(f) * 0.004, lift = 0.008 + (2 - Math.abs(f)) * 0.0035, dx = Math.cos(ang), dz = Math.sin(ang);
      const P = (s, h) => [base.x + dx * len * s + -dz * f * 0.004 * s, base.y + h, base.z + dz * len * s + dx * f * 0.004 * s];
      stems.push(sweep([P(0, 0), P(0.35, lift * 0.8), P(0.7, lift * 1.05), P(1.0, lift * 0.9)], (u) => 0.0072 - 0.0028 * u, { radial: 6, segs: 12, flat: 0.52, color: IV }));
      // leaf: continues the stem direction, cups upward and droops over the wall
      const lenL = 0.058 - Math.abs(f) * 0.005, W = 0.021 - Math.abs(f) * 0.0025, [nu, nv] = Q.leaf, pos = [], col3 = [], idx = [], sx = -dz, sz = dx;
      const tip = P(1.0, lift * 0.9);
      for (let i = 0; i <= nu; i++) { const u = i / nu, wd = W * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.9)), 0.8) * (0.25 + 0.75 * Math.sin(Math.PI * Math.pow(u, 0.7))) ;
        const cx = tip[0] + dx * lenL * u, cz = tip[2] + dz * lenL * u, cy = tip[1] + 0.012 * Math.sin(u * 2.4) - 0.016 * u * u;
        for (let j = 0; j <= nv; j++) { const v = (j / nv) * 2 - 1, cup = 0.006 * v * v * (0.4 + u), ruffle = 0.0012 * Math.sin(v * 5 + u * 9 + k) * Math.abs(v) * u;
          pos.push(cx + sx * v * wd, cy + cup + ruffle, cz + sz * v * wd); const c = JADE.clone().lerp(JADE2, Math.abs(v) * 0.7 * u + (k % 2) * 0.1); col3.push(c.r, c.g, c.b); } }
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(col3, 3)); lg.setIndex(idx); lg.computeVertexNormals();
      leaves.push(part(lg, null, null));
    }
    add(merged(stems), mat({ vertexColors: true, roughness: 0.38, metalness: 0 }), 'bokChoyStems');
    const leafMat = mat({ vertexColors: true, roughness: 0.42, metalness: 0, side: THREE.DoubleSide }); add(merged(leaves), leafMat, 'bokChoyLeaves'); }

  // ------------------------------------------------------------------ sweet corn: instanced rounded beads clustered near the rim
  { const [n, ws, hs] = Q.corn, CORN = col('#F4C430'), geo = new THREE.SphereGeometry(1, ws, hs); disposables.push(geo);
    const mesh = new THREE.InstancedMesh(geo, mat({ color: CORN, roughness: 0.3, metalness: 0, envMapIntensity: 0.3 }), n); mesh.name = 'cornBeads'; mesh.frustumCulled = false;
    const d = new THREE.Object3D(), ph = Math.PI * 0.72;   // front-left cluster
    for (let i = 0; i < n; i++) { const a = ph + R(-0.34, 0.34), rr = R(0.05, 0.096), x = Math.cos(a) * rr, z = Math.sin(a) * rr, s = R(0.0068, 0.0084);
      d.position.set(x, surf(x, z) + s * 0.55 + (rng() < 0.3 ? 0.006 : 0), z); d.scale.set(s, s * R(0.9, 1.05), s * R(0.95, 1.1)); d.rotation.set(R(0, 3), R(0, 3), 0); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); }
    mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; inner.add(mesh); disposables.push(mesh); }

  // ------------------------------------------------------------------ scallion rings: instanced thin tori, spring-green outer band, pale-white centre
  { const n = Q.rings, RR = 0.0095, TR = 0.003, tg = new THREE.TorusGeometry(RR, TR, 5, 12); tg.rotateX(Math.PI / 2);
    const GREEN = col('#4CAF50'), PALE = col('#E6EBCB'), tmp = new THREE.Color();
    const g = part(tg, null, (x, y, z) => { const d = Math.hypot(x, z); return tmp.copy(PALE).lerp(GREEN, THREE.MathUtils.smoothstep(d, RR - TR * 0.75, RR + TR * 0.1)).clone(); });
    const mesh = new THREE.InstancedMesh(g, mat({ vertexColors: true, roughness: 0.4, metalness: 0 }), n); mesh.name = 'scallionRings'; mesh.frustumCulled = false; disposables.push(g);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const a = R(0, 6.283), rr = Math.sqrt(R(0.0, 0.85)) * 0.1, x = Math.cos(a) * rr, z = Math.sin(a) * rr, s = R(0.8, 1.2);
      d.position.set(x, surf(x, z) + 0.0075 + R(0, 0.006), z); d.rotation.set(R(-0.3, 0.3), R(0, 3.14), R(-0.3, 0.3)); d.scale.set(s, s * 0.8, s); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); }
    mesh.instanceMatrix.needsUpdate = true; inner.add(mesh); disposables.push(mesh); }

  // ------------------------------------------------------------------ nori sheet: gently warped plane tucked against the back wall, standing above the rim
  { const w = 0.07, h = 0.075, nx = 8, ny = 6, g0 = new THREE.PlaneGeometry(w, h, nx, ny), p = g0.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = x / w, v = y / h + 0.5; p.setZ(i, 0.006 * Math.sin(u * 7 + v * 3) * v + 0.008 * u * u * v - 0.004 * Math.sin(v * 3.2)); p.setY(i, y + 0.002 * Math.sin(u * 9) * v); }
    g0.computeVertexNormals();
    const ang = -0.1, rb = innerR(0.07) - 0.002, lean = 0.5;   // lean the sheet along the sloping inner wall at the back (-z)
    const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(ang) * (rb - 0.006), 0.084, -Math.cos(ang) * (rb - 0.006)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-lean, ang * 0.5, 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    g0.applyMatrix4(m); g0.deleteAttribute('uv');
    add(g0, mat({ color: '#1E2621', roughness: 0.34, metalness: 0.08, envMapIntensity: 0.4, side: THREE.DoubleSide }), 'nori'); }

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
    /** t in 0..1: progress of the hero beat. Pure: only uniforms are written. */
    setTime(t) { t = Math.min(1, Math.max(0, t)); brothU.uT.value = t * 2.2; steamU.uT.value = t; steamU.uInt.value = 0.62 + 0.6 * sm(0.55, 1.0, t); },
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
