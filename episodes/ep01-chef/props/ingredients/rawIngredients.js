import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Beat 2 raw ingredients (Episode 1, "Mise en Place"). 100% plant-based: bamboo shoot, flour dough (no egg), shiitake, baby bok choy and a
 * sesame chili-oil jar. NO egg, meat, fish or seafood anywhere. Fully procedural: lathes, boxes, spheres, swept tubes, vertex colours. No files, no textures.
 *
 * Coordinates: `group` is the BOARD FRAME. Its origin is the centre of the cutting-board surface, +y is up, x/z are board-local metres
 * (the spec's [x, y, z] targets are x = spec.x, z = spec.z - 1.1 relative to the board centre; y = 0 is the board surface).
 *
 * `setDropProgress(id, p)` is a PURE function of p in [0, 1] (the ingredient's own drop sub-beat): it assigns absolute transforms, never accumulates,
 * never reads the previous frame and never calls Math.random. Phases inside p:
 *   0 .. release   carried in by a paw (slides in along the paw's arm axis to hover height H above its resting spot)
 *   release .. impact   released: gravity fall with a little stretch
 *   impact .. 1    squash on impact, then rebound (elastic.out) and settle; per-ingredient extras (tumble, slide, slosh)
 */
export const DROP = Object.freeze({ release: 0.4, impact: 0.56 });
export const INGREDIENT_ORDER = Object.freeze(['bamboo_shoot', 'noodle_dough', 'shiitake_mushrooms', 'baby_bok_choy', 'chili_oil_jar']);
/** Board-local rest positions: the spec targets with the board centre (1.1) subtracted from z. */
export const SPEC_TARGETS = Object.freeze({ bamboo_shoot: [-0.35, 1.05, 1.1], noodle_dough: [0.35, 1.05, 1.1], shiitake_mushrooms: [-0.25, 1.04, 1.3], baby_bok_choy: [0.25, 1.04, 1.3], chili_oil_jar: [0.0, 1.07, 0.95] });
export const BOARD_HALF = Object.freeze({ x: 0.45, z: 0.3 });   // the cutting board is 0.9 x 0.6 (kitchenConfig.cuttingBoard.size)

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (n) => gsap.parseEase(n);
const E_INOUT = ease('power3.inOut'), E_ELASTIC = ease('elastic.out(1,0.42)'), E_THUD = ease('power4.out'), E_BACK = ease('back.out(1.8)'), E_EXPO = ease('expo.out');

function paint(geo, hex) { const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);
const place = (geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function createRawIngredients({ quality = 'high', envMap = null } = {}) {
  const Q = { high: { seg: 28, sph: [28, 18], glass: true }, medium: { seg: 20, sph: [20, 14], glass: false }, low: { seg: 12, sph: [12, 8], glass: false } }[quality];
  if (!Q) throw new Error('createRawIngredients: unknown quality ' + quality);
  const disposables = [];
  const std = (o) => { const m = new THREE.MeshStandardMaterial({ envMap, envMapIntensity: 0.22, ...o }); disposables.push(m); return m; };
  const mesh = (geo, mat, name, parent) => { disposables.push(geo); const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  const group = new THREE.Group(); group.name = 'rawIngredients';
  const ingredientsMap = new Map();

  /** One droppable piece: root (position / yaw / squash scale) > tilt (tumble) > body (grounded geometry). */
  function makePart(ing, { body, side, rest, yaw = 0, entry, H, sq, settle = 'elastic', tumble = null, slide = null, delay = 0, extra = null }) {
    const root = new THREE.Group(), tilt = new THREE.Group(); root.name = ing + '_part'; root.add(tilt); tilt.add(body);
    body.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(body), c = bb.getCenter(new THREE.Vector3());
    body.position.set(-c.x, -bb.min.y, -c.z); body.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
    root.position.set(rest[0], 0, rest[1]); root.rotation.y = yaw; root.visible = false;
    return { root, tilt, body, side, rest, yaw, entry: new THREE.Vector3(...entry), H, sq, settle, tumble, slide, delay, extra, height: size.y, size, p: 0, attached: false };
  }
  const entryFor = (side, D = 1.3) => (side === 'L' ? [-0.82 * D, 0.22, -0.57 * D] : [0.82 * D, 0.22, -0.57 * D]);   // along the paw's arm axis, from the upper corner

  // ============ 01. fresh bamboo shoot: segmented tapered cone, beveled flat cut base, overlapping tan sheaths, curved tip ============
  function buildBamboo() {
    const H = 0.3, R = 0.062, rc = (y) => R * (1 - 0.93 * (y / H));
    const body = new THREE.Group(), seg = Q.seg;
    const core = [[0, 0], [R - 0.008, 0], [R, 0.006]]; for (const y of [0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.3]) core.push([rc(y), y]); core.push([0.004, 0.312], [0, 0.314]);
    const sheaths = []; for (let i = 0; i < 5; i++) { const y0 = 0.03 + 0.052 * i, y1 = y0 + 0.085; sheaths.push(lathe([[rc(y0) + 0.001, y0 - 0.004], [rc(y0) + 0.012, y0], [rc(y0 + 0.015) + 0.0125, y0 + 0.016], [rc(y0 + 0.05) + 0.008, y0 + 0.05], [rc(y1) + 0.002, y1], [rc(y1) - 0.001, y1 + 0.003]], seg)); }
    const geoCore = lathe(core, seg), geoSh = mergeGeometries(sheaths);
    for (const g of [geoCore, geoSh]) { const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) + 0.05 * (y / H) ** 2); } pos.needsUpdate = true; }   // slightly curved tip
    mesh(geoCore, std({ color: '#E8D8B0', roughness: 0.45 }), 'bambooCore', body); mesh(geoSh, std({ color: '#BFA06E', roughness: 0.45 }), 'bambooSheaths', body);
    body.rotation.set(0, 0, -Math.PI / 2 + 0.06);   // lies on the board, tip curving up
    return body;
  }

  // ============ 02. hand-pulled dough: plump flour-dusted sphere (squash and stretch is applied to its wrapper) ============
  function buildDough() {
    const g = new THREE.SphereGeometry(0.082, Q.sph[0], Q.sph[1]), pos = g.attributes.position, rng = mulberry32(7);
    const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 1 + 0.035 * Math.sin(3 * x / 0.082 + ph[0]) * Math.cos(2 * z / 0.082 + ph[1]) + 0.025 * Math.sin(4 * y / 0.082 + ph[2]); pos.setXYZ(i, x * k, y * k * 0.9, z * k); }
    const body = new THREE.Group(); mesh(g, std({ color: '#F6EEDB', roughness: 0.55 }), 'doughBall', body); return body;
  }

  // ============ 03. shiitake: curved lathe dome cap (velvety umber, pale crack pattern), cream gill underside, stout stem ============
  function buildShiitake(lean) {
    const R = 0.072, Hc = 0.04, seg = Q.seg, prof = [[R - 0.006, 0], [R, 0.003], [R + 0.002, 0.008], [R, 0.012]];
    for (let i = 1; i <= 9; i++) { const a = (Math.PI / 2) * (1 - i / 9); prof.push([R * Math.sin(a), 0.012 + Hc * Math.cos(a) ** 0.8]); }
    const cap = lathe(prof, seg), cp = cap.attributes.position, col = new Float32Array(cp.count * 3), dark = new THREE.Color('#382216'), tan = new THREE.Color('#8A6A4A'), c = new THREE.Color();
    for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), z = cp.getZ(i), r = Math.hypot(x, z) / R, th = Math.atan2(z, x), crack = Math.pow(Math.abs(Math.sin(5 * th + 2.2 * r)), 8) * Math.sin(Math.PI * Math.min(1, r * 1.05)) * 0.55; c.copy(dark).lerp(tan, crack); col.set([c.r, c.g, c.b], i * 3); }
    cap.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const gills = lathe([[0, 0.008], [R - 0.007, 0.001]], seg), stem = new THREE.CylinderGeometry(0.0125, 0.0105, 0.05, 10, 1);
    place(stem, { p: [0, -0.012, 0] });
    const cream = mergeGeometries([gills, stem]);
    const body = new THREE.Group(); mesh(cap, std({ color: '#FFFFFF', vertexColors: true, roughness: 0.4 }), 'shiitakeCap', body); mesh(cream, std({ color: '#EADBCE', roughness: 0.4 }), 'shiitakeStem', body);
    body.rotation.z = lean; return body;
  }

  // ============ 04. baby bok choy: tube stems flaring into smooth jade leaf paddles (one vertex-coloured mesh) ============
  function buildBokChoy() {
    const parts = [], TOT = 0.27, N = 4, rs = Q.seg > 16 ? 12 : 8, nu = Q.seg > 16 ? 18 : 10, nv = Q.seg > 16 ? 8 : 5;
    const white = new THREE.Color('#EDF2E8'), pale = new THREE.Color('#CFE3C4'), jade = new THREE.Color('#2B6E47'), rib = new THREE.Color('#8DBF9B');
    for (let k = 0; k < N; k++) {
      const phi = k * (Math.PI * 2 / N) + 0.5, rad = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi)), side = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi));
      const P = (s) => { const rho = 0.010 + 0.075 * s ** 1.5; return new THREE.Vector3(rad.x * rho, TOT * s * (1 - 0.15 * s), rad.z * rho); };
      // stem: elliptical tube along P(s), s in 0 .. 0.52
      const pos = [], nor = [], uv = [], colr = [], idx = [], ns = 12;
      for (let i = 0; i <= ns; i++) {
        const s = 0.52 * i / ns, c0 = P(s), t = P(s + 0.01).sub(P(Math.max(0, s - 0.01))).normalize(), n1 = side.clone(), n2 = new THREE.Vector3().crossVectors(t, n1).normalize();
        const a = 0.0155 + 0.007 * s, b = 0.0075 - 0.002 * s, cc = white.clone().lerp(pale, clamp01((s - 0.3) / 0.22));
        for (let j = 0; j <= rs; j++) { const th = (j / rs) * Math.PI * 2, ct = Math.cos(th), st = Math.sin(th), p = c0.clone().addScaledVector(n1, a * ct).addScaledVector(n2, b * st), n = n1.clone().multiplyScalar(ct / a).addScaledVector(n2, st / b).normalize(); pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(j / rs, s); colr.push(cc.r, cc.g, cc.b); }
      }
      for (let i = 0; i < ns; i++) for (let j = 0; j < rs; j++) { const A = i * (rs + 1) + j, B = A + rs + 1; idx.push(A, B, A + 1, B, B + 1, A + 1); }
      const base = pos.length / 3; { const c0 = P(0); pos.push(c0.x, c0.y, c0.z); nor.push(0, -1, 0); uv.push(0.5, 0); colr.push(white.r, white.g, white.b); for (let j = 0; j < rs; j++) idx.push(base, j + 1, j); }
      const stemG = new THREE.BufferGeometry(); stemG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); stemG.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); stemG.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); stemG.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); stemG.setIndex(idx); parts.push(stemG);
      // leaf paddle: grid over (u along, v across), cupped towards the axis with a gentle ruffle
      const lp = [], lc = [], lu = [], li = [], s0 = 0.46;
      for (let i = 0; i <= nu; i++) { const u = i / nu, s = s0 + (1 - s0) * u, c0 = P(s), hw = 0.012 * (1 - u ** 3) + 0.05 * Math.sin(Math.PI * u ** 0.75) ** 0.9;
        for (let j = 0; j <= nv; j++) { const v = (j / nv) * 2 - 1, p = c0.clone().addScaledVector(side, v * hw).addScaledVector(rad, -(0.014 * v * v * (hw / 0.05)) + 0.004 * Math.sin(u * 17 + k * 1.7) * v * v);
          lp.push(p.x, p.y, p.z); lu.push(v, u); const m = clamp01((u - 0.05) / 0.4), cc = pale.clone().lerp(jade, m * m * (3 - 2 * m)); if (Math.abs(v) < 0.14 && u > 0.1) cc.lerp(rib, 0.5 * (1 - u)); lc.push(cc.r, cc.g, cc.b); } }
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const A = i * (nv + 1) + j, B = A + nv + 1; li.push(A, B, A + 1, B, B + 1, A + 1); }
      const leafG = new THREE.BufferGeometry(); leafG.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); leafG.setAttribute('uv', new THREE.Float32BufferAttribute(lu, 2)); leafG.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3)); leafG.setIndex(li); leafG.computeVertexNormals();
      parts.push(leafG);
    }
    const merged = mergeGeometries(parts);
    const body = new THREE.Group(); mesh(merged, std({ color: '#FFFFFF', vertexColors: true, roughness: 0.35, side: THREE.DoubleSide }), 'bokChoy', body);
    body.rotation.set(0, 0, -Math.PI / 2 + 0.12); return body;
  }

  // ============ 05. sesame chili-oil jar: faceted glass jar (transmission), glowing crimson oil, brushed-brass screw lid ============
  function buildJar() {
    const body = new THREE.Group(), facets = 10, Hj = 0.14;
    const jarGeo = new THREE.CylinderGeometry(0.062, 0.058, Hj, facets, 1); place(jarGeo, { p: [0, Hj / 2, 0] });
    const neck = new THREE.CylinderGeometry(0.044, 0.05, 0.016, facets, 1); place(neck, { p: [0, Hj + 0.004, 0] });
    const glassGeo = mergeGeometries([jarGeo, neck]); jarGeo.dispose(); neck.dispose();
    const glassMat = Q.glass ? new THREE.MeshPhysicalMaterial({ color: '#E4EDE2', transmission: 0.85, roughness: 0.15, ior: 1.45, thickness: 0.02, envMap, envMapIntensity: 0.6, flatShading: true })
      : new THREE.MeshPhysicalMaterial({ color: '#E4EDE2', transparent: true, opacity: 0.3, roughness: 0.15, ior: 1.45, envMap, envMapIntensity: 0.6, flatShading: true, depthWrite: false });
    disposables.push(glassMat);
    const glass = mesh(glassGeo, glassMat, 'jarGlass', body); glass.castShadow = true; glass.renderOrder = 1;
    const liquidGeo = new THREE.CylinderGeometry(0.052, 0.049, 0.108, facets, 1); place(liquidGeo, { p: [0, 0.054, 0] });
    const liquid = mesh(liquidGeo, std({ color: '#9A1409', roughness: 0.2, emissive: '#5C0A04', emissiveIntensity: 0.55 }), 'chiliOil', body); liquid.position.y = 0.008; liquid.castShadow = false;
    const lidProf = [[0, Hj + 0.005], [0.049, Hj + 0.005], [0.051, Hj + 0.009]]; for (let i = 0; i < 4; i++) { const y = Hj + 0.012 + i * 0.0065; lidProf.push([0.0525, y], [0.0495, y + 0.003]); } lidProf.push([0.051, Hj + 0.04], [0.047, Hj + 0.045], [0, Hj + 0.045]);
    const lid = mesh(lathe(lidProf, Q.seg), std({ color: '#C59B27', metalness: 0.75, roughness: 0.38 }), 'jarLid', body);
    body.userData.liquid = liquid; return body;
  }

  // ---------------- assemble ----------------
  const entries = [
    ['bamboo_shoot', '01. Fresh Bamboo Shoot', [{ body: buildBamboo(), side: 'L', rest: [-0.27, 0.0], yaw: 0.25, H: 0.4, sq: { sy: 0.75, sxz: 1.12 } }]],
    ['noodle_dough', '02. Hand-Pulled Dough', [{ body: buildDough(), side: 'R', rest: [0.32, 0.0], yaw: 0.0, H: 0.4, sq: { sy: 0.6, sxz: 1.25 } }]],
    ['shiitake_mushrooms', '03. Fresh Shiitake', [
      { body: buildShiitake(-0.5), side: 'L', rest: [-0.31, 0.2], yaw: 0.1, H: 0.4, sq: { sy: 0.85, sxz: 1.08 }, tumble: { axis: 'z', a0: 1.1 } },
      { body: buildShiitake(0.5), side: 'R', rest: [-0.17, 0.2], yaw: 0.1, H: 0.4, sq: { sy: 0.85, sxz: 1.08 }, tumble: { axis: 'z', a0: -1.1 }, delay: 0.06 }]],
    ['baby_bok_choy', '04. Baby Bok Choy', [{ body: buildBokChoy(), side: 'R', rest: [0.25, 0.2], yaw: -0.25, H: 0.14, sq: { sy: 0.9, sxz: 1.05 }, slide: { dx: 0.07, dz: -0.02, dyaw: 0.55 } }]],
    ['chili_oil_jar', '05. Sesame Chili Oil', [{ body: buildJar(), side: 'L', rest: [0.0, -0.14], yaw: 0.0, H: 0.45, sq: { sy: 0.94, sxz: 1.03 }, settle: 'thud' }]],
  ];
  const tagLocal = { bamboo_shoot: [-0.35, 0.3, -0.22], noodle_dough: [0.33, 0.3, -0.22], shiitake_mushrooms: [-0.25, 0.3, 0.38], baby_bok_choy: [0.28, 0.3, 0.38], chili_oil_jar: [0.0, 0.3, -0.38] };
  for (const [id, name, defs] of entries) {
    const root = new THREE.Group(); root.name = id; group.add(root);
    const parts = defs.map((d) => { const part = makePart(id, { ...d, entry: entryFor(d.side) }); root.add(part.root); return part; });
    ingredientsMap.set(id, { id, name, root, parts, tag: new THREE.Vector3(...tagLocal[id]) });
  }

  /** Pure pose of one part at its own progress p (0..1). */
  function poseAt(part, pRaw) {
    const p = clamp01((pRaw - part.delay) / (1 - part.delay)), r = part.root;
    part.p = p; part.attached = p > 0 && p < DROP.release;
    if (p <= 0) { r.visible = false; return; }
    r.visible = true;
    const [rx, rz] = part.rest, sl = part.slide, lx = rx + (sl ? sl.dx : 0), lz = rz + (sl ? sl.dz : 0);
    let x = lx, y = 0, z = lz, sy = 1, sxz = 1, yaw = part.yaw + (sl ? sl.dyaw : 0), tum = 0;
    if (p < DROP.release) {   // carried: slides in along the arm axis to hover at height H, held by the paw
      const s = E_INOUT(p / DROP.release), k = 1 - s; x = lx + part.entry.x * k; z = lz + part.entry.z * k; y = part.H + part.entry.y * k;
      tum = part.tumble ? part.tumble.a0 : 0;
    } else if (p < DROP.impact) {   // released: gravity fall with a little stretch
      const f = (p - DROP.release) / (DROP.impact - DROP.release); y = part.H * (1 - f * f); sy = 1 + 0.1 * f * f; sxz = 1 - 0.05 * f * f;
      if (part.tumble) tum = part.tumble.a0;
    } else {   // impact, rebound, settle
      const q = (p - DROP.impact) / (1 - DROP.impact), E = part.settle === 'thud' ? E_THUD(q) : E_ELASTIC(q), k = 1 - E;
      sy = 1 - (1 - part.sq.sy) * k; sxz = 1 + (part.sq.sxz - 1) * k;
      if (sl) { const m = 1 - E_EXPO(q); x = rx + sl.dx * m; z = rz + sl.dz * m; yaw = part.yaw + sl.dyaw * m; }
    }
    if (part.tumble && p >= DROP.release) tum = part.tumble.a0 * (1 - E_BACK(clamp01((p - DROP.release) / (0.86 - DROP.release))));
    r.position.set(x, y, z); r.rotation.y = yaw; r.scale.set(sxz, sy, sxz);
    part.tilt.rotation.set(0, 0, part.tumble ? tum : 0);
    const lq = part.body.userData.liquid;
    if (lq) { const q = p > DROP.impact ? (p - DROP.impact) / (1 - DROP.impact) : 0, d = Math.exp(-4.5 * q); lq.scale.y = 1 + 0.09 * d * Math.sin(19 * q); lq.rotation.z = 0.07 * d * Math.sin(17 * q + 1); lq.rotation.x = 0.05 * d * Math.sin(15 * q + 2); }
  }

  function setDropProgress(id, progress) { const e = ingredientsMap.get(id); if (!e) throw new Error('unknown ingredient ' + id); for (const part of e.parts) poseAt(part, progress); }
  for (const id of INGREDIENT_ORDER) setDropProgress(id, 0);

  return {
    group, ingredientsMap, ids: INGREDIENT_ORDER, setDropProgress,
    /** World-space-free footprint check: every part's resting footprint (board-local) */
    restBounds() {   // NOTE: leaves every part posed at p = 1 (test helper)
    const res = {}; for (const [id, e] of ingredientsMap) { const b = new THREE.Box3(); for (const part of e.parts) { poseAt(part, 1); part.root.updateMatrixWorld(true); b.union(new THREE.Box3().setFromObject(part.root)); } res[id] = b; } return res; },
    stats() { let triangles = 0, drawCalls = 0; group.traverse((o) => { if (!o.isMesh || !o.visible) return; let v = true; for (let p = o; p && p !== group; p = p.parent) if (!p.visible) v = false; if (!v) return; drawCalls++; const g = o.geometry; triangles += (g.index ? g.index.count : g.attributes.position.count) / 3; }); return { triangles, drawCalls }; },
    dispose() { for (const d of disposables) d.dispose?.(); group.removeFromParent(); },
  };
}
