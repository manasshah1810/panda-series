import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Beat 2 raw ingredients (Episode 1, "Mise en Place"): twelve plant-based components for a ramen prep counter. NO egg, meat, fish or seafood.
 *   centrepiece  01 bamboo shoot
 *   fresh        02 hand-pulled dough ball (flour + water, no egg) - 03 baby bok choy - 04 shiitake duo
 *   aromatics    05 garlic bulb - 06 ginger root - 07 scallion bundle - 08 dried kombu
 *   condiments   09 sesame chili-oil jar - 10 corn bowl - 11 toasted sesame bowl - 12 crispy shallot-chip bowl
 * Fully procedural: lathes, boxes, spheres, vertex colours, InstancedMesh for repeated bits (garlic lobes, corn, sesame, chips). No files, no textures
 * (the soft contact shadows use one canvas-drawn radial gradient).
 *
 * Coordinates: `group` is the BOARD FRAME. Its origin is the centre of the cutting-board surface, +y is up, x/z are board-local metres.
 *
 * `setDropProgress(id, p)` is a PURE function of p in [0, 1] (the ingredient's own drop window): it assigns absolute transforms, never accumulates,
 * never reads the previous frame and never calls Math.random (a seeded PRNG builds the heaps). Phases inside p:
 *   0 .. release   carried in by a paw (slides in along the paw's arm axis to hover height H above its resting spot)
 *   release .. impact   released: gravity fall with a little stretch
 *   impact .. 1    squash on impact, then rebound (elastic.out / thud) and settle
 */
export const DROP = Object.freeze({ release: 0.4, impact: 0.56 });
/** Drop order = paw alternation (even = left paw, odd = right paw). */
export const INGREDIENT_ORDER = Object.freeze(['bamboo_shoot', 'noodle_dough', 'baby_bok_choy', 'shiitake_mushrooms', 'garlic_bulb', 'chili_oil_jar', 'ginger_root', 'corn_bowl', 'scallion_bundle', 'sesame_bowl', 'kombu_sheet', 'shallot_chip_bowl']);
export const BOARD_HALF = Object.freeze({ x: 0.45, z: 0.3 });   // the cutting board is 0.9 x 0.6 (kitchenConfig.cuttingBoard.size)

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (n) => gsap.parseEase(n);
const E_INOUT = ease('power3.inOut'), E_ELASTIC = ease('elastic.out(1,0.42)'), E_THUD = ease('power4.out'), E_BACK = ease('back.out(1.8)'), E_EXPO = ease('expo.out');

function paint(geo, hex) { const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);
const place = (geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
/** Box3 of an object tree that, unlike Box3.setFromObject, includes every InstancedMesh instance. */
function bboxOf(obj) {
  obj.updateWorldMatrix(true, true); const b = new THREE.Box3(), t = new THREE.Box3(), m = new THREE.Matrix4();
  obj.traverse((o) => { if (!o.isMesh || o.userData.noBounds) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); b.union(t.copy(o.geometry.boundingBox).applyMatrix4(m).applyMatrix4(o.matrixWorld)); } else b.union(t.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); });
  return b;
}
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function createRawIngredients({ quality = 'high', envMap = null } = {}) {
  const Q = { high: { seg: 28, sph: [28, 18] }, medium: { seg: 20, sph: [20, 14] }, low: { seg: 12, sph: [12, 8] } }[quality];
  if (!Q) throw new Error('createRawIngredients: unknown quality ' + quality);
  const disposables = [];
  const std = (o) => { const m = new THREE.MeshStandardMaterial({ envMap, envMapIntensity: 0.22, ...o }); disposables.push(m); return m; };
  const NO_CAST = new Set(['garlicBulb', 'gingerRoot', 'scallionStalks', 'kombuSheet', 'shiitakeStems', 'jarLid', 'bowlCeramic']);
  const mesh = (geo, mat, name, parent) => { disposables.push(geo); const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = !NO_CAST.has(name); m.receiveShadow = true; parent.add(m); return m; };

  const group = new THREE.Group(); group.name = 'rawIngredients';
  const ingredientsMap = new Map();

  /** One droppable piece: root (position / yaw / squash scale) > tilt (tumble) > body (grounded geometry). */
  function makePart(ing, { body, side, rest, yaw = 0, entry, H, sq, settle = 'elastic' }) {
    const root = new THREE.Group(), tilt = new THREE.Group(); root.name = ing + '_part'; root.add(tilt); tilt.add(body);
    const bb = bboxOf(body), c = bb.getCenter(new THREE.Vector3());
    body.position.set(-c.x, -bb.min.y, -c.z);
    const size = bboxOf(body).getSize(new THREE.Vector3());
    root.position.set(rest[0], 0, rest[1]); root.rotation.y = yaw; root.visible = false;
    return { root, tilt, body, side, rest, yaw, entry: new THREE.Vector3(...entry), H, sq, settle, height: size.y, size, p: 0, attached: false, shadow: null };
  }
  const entryFor = (side, D = 1.3) => (side === 'L' ? [-0.5 * D, 0.22, -0.866 * D] : [0.5 * D, 0.22, -0.866 * D]);   // along the paw's arm axis (from the top edge, fanning to the flanks)

  // ============ 01. fresh bamboo shoot: segmented tapered cone, beveled flat cut base, overlapping tan sheaths, curved tip ============
  function buildBamboo() {
    const H = 0.3, R = 0.062, rc = (y) => R * (1 - 0.93 * (y / H));
    const body = new THREE.Group(), seg = Q.seg;
    const core = [[0, 0], [R - 0.008, 0], [R, 0.006]]; for (const y of [0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.3]) core.push([rc(y), y]); core.push([0.004, 0.312], [0, 0.314]);
    const sheaths = []; for (let i = 0; i < 5; i++) { const y0 = 0.03 + 0.052 * i, y1 = y0 + 0.085; sheaths.push(lathe([[rc(y0) + 0.001, y0 - 0.004], [rc(y0) + 0.012, y0], [rc(y0 + 0.015) + 0.0125, y0 + 0.016], [rc(y0 + 0.05) + 0.008, y0 + 0.05], [rc(y1) + 0.002, y1], [rc(y1) - 0.001, y1 + 0.003]], seg)); }
    const geoCore = lathe(core, seg), geoSh = mergeGeometries(sheaths);
    for (const g of [geoCore, geoSh]) { const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) + 0.05 * (y / H) ** 2); } pos.needsUpdate = true; }   // slightly curved tip
    for (const m of [mesh(geoCore, std({ color: '#E8D8B0', roughness: 0.45 }), 'bambooCore', body), mesh(geoSh, std({ color: '#BFA06E', roughness: 0.45 }), 'bambooSheaths', body)]) m.castShadow = false;   // grounded by its contact shadow (the spot's own shadow smeared a big dark blob)
    body.rotation.set(0, 0, -Math.PI / 2 + 0.06); body.scale.setScalar(1.1);   // lies on the board, tip curving up; the large centrepiece
    return body;
  }

  // ============ 02. hand-pulled dough: plump flour-dusted sphere (squash and stretch is applied to its wrapper) ============
  function buildDough() {
    const g = new THREE.SphereGeometry(0.082, Q.sph[0], Q.sph[1]), pos = g.attributes.position, rng = mulberry32(7);
    const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 1 + 0.035 * Math.sin(3 * x / 0.082 + ph[0]) * Math.cos(2 * z / 0.082 + ph[1]) + 0.025 * Math.sin(4 * y / 0.082 + ph[2]); pos.setXYZ(i, x * k, y * k * 0.9, z * k); }
    const body = new THREE.Group(); mesh(g, std({ color: '#F6EEDB', roughness: 0.55 }), 'doughBall', body); return body;
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
    body.rotation.set(0, 0, -Math.PI / 2 + 0.12); body.scale.setScalar(1.15); return body;
  }

  // ============ 03. shiitake duo: two curved lathe dome caps (velvety umber, pale crack pattern), cream gill undersides, stout stems; merged to 2 meshes ============
  function buildShiitakeDuo() {
    const R = 0.072, Hc = 0.04, seg = Q.seg, prof = [[R - 0.006, 0], [R, 0.003], [R + 0.002, 0.008], [R, 0.012]];
    for (let i = 1; i <= 9; i++) { const a = (Math.PI / 2) * (1 - i / 9); prof.push([R * Math.sin(a), 0.012 + Hc * Math.cos(a) ** 0.8]); }
    const dark = new THREE.Color('#382216'), tan = new THREE.Color('#8A6A4A'), c = new THREE.Color(), caps = [], creams = [];
    for (const [cx, cz, lean, spin] of [[-0.082, 0.012, -0.45, 0.4], [0.082, -0.012, 0.45, 2.1]]) {
      const cap = lathe(prof, seg), cp = cap.attributes.position, col = new Float32Array(cp.count * 3);
      for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), z = cp.getZ(i), r = Math.hypot(x, z) / R, th = Math.atan2(z, x), crack = Math.pow(Math.abs(Math.sin(5 * th + 2.2 * r)), 8) * Math.sin(Math.PI * Math.min(1, r * 1.05)) * 0.55; c.copy(dark).lerp(tan, crack); col.set([c.r, c.g, c.b], i * 3); }
      cap.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const gills = lathe([[0, 0.008], [R - 0.007, 0.001]], seg), stem = new THREE.CylinderGeometry(0.0125, 0.0105, 0.05, 10, 1); place(stem, { p: [0, -0.012, 0] });
      const cream = mergeGeometries([gills, stem]); gills.dispose(); stem.dispose(); paint(cream, '#EADBCE');
      for (const g of [cap, cream]) place(g, { p: [cx, 0.02, cz], r: [0, spin, lean] });
      caps.push(cap); creams.push(cream);
    }
    const body = new THREE.Group(); mesh(mergeGeometries(caps), std({ color: '#FFFFFF', vertexColors: true, roughness: 0.4 }), 'shiitakeCaps', body); mesh(mergeGeometries(creams), std({ color: '#FFFFFF', vertexColors: true, roughness: 0.4 }), 'shiitakeStems', body);
    return body;
  }

  // ============ 05. whole garlic bulb: seven instanced ivory lobes leaning to a papery tip, core, tan root disc ============
  function buildGarlic() {
    const body = new THREE.Group(), N = 7, lobes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), std({ color: '#FFFFFF', roughness: 0.5 }), N); lobes.name = 'garlicLobes'; disposables.push(lobes.geometry);
    const m = new THREE.Matrix4(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), col = new THREE.Color(), ivory = ['#F2EDE2', '#EBE3D2', '#F6F1E6'];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.3; qa.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); qb.setFromAxisAngle(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), 0.3);
      m.compose(new THREE.Vector3(Math.cos(a) * 0.03, 0.05, Math.sin(a) * 0.03), qb.multiply(qa), new THREE.Vector3(0.024, 0.052, 0.034)); lobes.setMatrixAt(i, m); lobes.setColorAt(i, col.set(ivory[i % 3]));
    }
    lobes.castShadow = false; lobes.receiveShadow = true; body.add(lobes);
    const core = paint(new THREE.SphereGeometry(0.036, 14, 10), '#EFE8D8'); place(core, { p: [0, 0.052, 0], s: [1, 1.2, 1] });
    const tip = paint(new THREE.ConeGeometry(0.012, 0.05, 8, 1), '#D8C9AA'); place(tip, { p: [0.003, 0.125, 0], r: [0, 0, -0.18] });
    const base = paint(new THREE.CylinderGeometry(0.016, 0.02, 0.008, 10, 1), '#B8A27A'); place(base, { p: [0, 0.002, 0] });
    mesh(mergeGeometries([core, tip, base]), std({ color: '#FFFFFF', vertexColors: true, roughness: 0.55 }), 'garlicBulb', body); [core, tip, base].forEach((g) => g.dispose());
    return body;
  }

  // ============ 06. ginger root: knobby chain of squashed lumps, darker growth rings, pale knob tips ============
  function buildGinger() {
    const base = new THREE.Color('#C29B63'), ring = new THREE.Color('#A57F49'), tipc = new THREE.Color('#D6B27E'), c = new THREE.Color(), geos = [];
    const lumps = [[-0.075, 0, 0, 0.032, 0.026, 0.026], [-0.025, 0.002, 0.004, 0.04, 0.03, 0.03], [0.032, 0, -0.002, 0.036, 0.028, 0.028], [0.082, 0.002, 0.004, 0.028, 0.022, 0.022], [-0.04, 0.012, 0.034, 0.022, 0.018, 0.02], [0.05, 0.008, -0.03, 0.02, 0.017, 0.019], [0.112, 0.004, 0.012, 0.016, 0.013, 0.014], [-0.1, 0.006, -0.022, 0.016, 0.014, 0.015]];
    for (const [x, y, z, rx, ry, rz] of lumps) {
      const g = new THREE.SphereGeometry(1, 11, 8), p = g.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const wx = p.getX(i) * rx + x, wy = p.getY(i); c.copy(base).lerp(ring, 0.55 * (0.5 + 0.5 * Math.sin(wx * 110))).lerp(tipc, Math.max(0, wy) * 0.35); col.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); place(g, { p: [x, y, z], s: [rx, ry, rz] }); geos.push(g);
    }
    const body = new THREE.Group(); mesh(mergeGeometries(geos), std({ color: '#FFFFFF', vertexColors: true, roughness: 0.62 }), 'gingerRoot', body); geos.forEach((g) => g.dispose()); return body;
  }

  // ============ 07. scallion bundle: seven tapered stalks (white base -> jade leaf, slightly fanned) tied with a twine band ============
  function buildScallion() {
    const L = 0.22, white = new THREE.Color('#F1F4E6'), light = new THREE.Color('#8FC27A'), jade = new THREE.Color('#2F7A3E'), c = new THREE.Color(), geos = [];
    const offs = [[0, 0], [0.013, 0], [-0.013, 0], [0.0065, 0.0115], [-0.0065, 0.0115], [0.0065, -0.0115], [-0.0065, -0.0115]];
    for (const [oy, oz] of offs) {
      const g = new THREE.CylinderGeometry(0.0075, 0.0085, L, 7, 6), p = g.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const u = p.getY(i) / L + 0.5; if (u < 0.3) c.copy(white); else c.copy(light).lerp(jade, clamp01((u - 0.45) / 0.45)); col.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); place(g, { p: [0, 0.012 + oy, oz], r: [0, oz * 3.2, Math.PI / 2 + oy * 1.5] }); geos.push(g);
    }
    const body = new THREE.Group(); mesh(mergeGeometries(geos), std({ color: '#FFFFFF', vertexColors: true, roughness: 0.45 }), 'scallionStalks', body); geos.forEach((g) => g.dispose());
    const twine = new THREE.TorusGeometry(0.0235, 0.0045, 6, 18); place(twine, { p: [-0.035, 0.012 + 0.004, 0], r: [0, Math.PI / 2, 0] });
    const tm = mesh(twine, std({ color: '#B8955A', roughness: 0.9 }), 'scallionTwine', body); tm.castShadow = false; return body;
  }

  // ============ 08. dried kombu: three folded layers of dark matte olive-slate strip with salty frost ============
  function buildKombu() {
    const base = new THREE.Color('#1D241E'), frost = new THREE.Color('#3E483F'), c = new THREE.Color(), geos = [], rng = mulberry32(23), W = 0.07, Lx = 0.17;
    const layer = (y, dx) => { const g = new THREE.BoxGeometry(Lx, 0.011, W, 10, 1, 3), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.0022 * Math.sin(p.getX(i) * 70 + y * 90 + p.getZ(i) * 40)); g.computeVertexNormals(); return place(g, { p: [dx, y, 0] }); };
    geos.push(layer(0.006, 0), layer(0.0225, 0.012), layer(0.039, 0));
    for (const [x, y] of [[0.0925, 0.0143], [-0.0805, 0.0307]]) { const r = new THREE.CylinderGeometry(0.0095, 0.0095, W, 10, 1, true); place(r, { p: [x, y, 0], r: [Math.PI / 2, 0, 0] }); geos.push(r); }
    for (const g of geos) { const p = g.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const n = (Math.sin(p.getX(i) * 311 + p.getZ(i) * 177 + p.getY(i) * 91) * 0.5 + 0.5); c.copy(base).lerp(frost, n * n * 0.55 * (0.6 + 0.4 * rng())); col.set([c.r, c.g, c.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
    const body = new THREE.Group(); mesh(mergeGeometries(geos), std({ color: '#FFFFFF', vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), 'kombuSheet', body); geos.forEach((g) => g.dispose()); return body;
  }

  // ============ 09. sesame chili-oil jar: faceted glass jar, glowing crimson oil (visible as a ring around the lid from above), small brass screw lid ============
  function buildJar() {
    const body = new THREE.Group(), facets = 10, Hj = 0.14;
    const jarGeo = new THREE.CylinderGeometry(0.062, 0.058, Hj, facets, 1); place(jarGeo, { p: [0, Hj / 2, 0] });
    const neck = new THREE.CylinderGeometry(0.052, 0.058, 0.016, facets, 1); place(neck, { p: [0, Hj + 0.004, 0] });
    const glassGeo = mergeGeometries([jarGeo, neck]); jarGeo.dispose(); neck.dispose();
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#E4EDE2', transparent: true, opacity: 0.16, roughness: 0.12, ior: 1.45, envMap, envMapIntensity: 0.6, flatShading: true, depthWrite: false }); disposables.push(glassMat);
    const glass = mesh(glassGeo, glassMat, 'jarGlass', body); glass.castShadow = false; glass.renderOrder = 2;
    const liquidGeo = new THREE.CylinderGeometry(0.054, 0.05, 0.128, facets, 1); place(liquidGeo, { p: [0, 0.064, 0] });
    const liquid = mesh(liquidGeo, std({ color: '#9A1409', roughness: 0.2, emissive: '#7A0E05', emissiveIntensity: 0.8 }), 'chiliOil', body); liquid.position.y = 0.008; liquid.castShadow = true;
    const lidProf = [[0, Hj + 0.005], [0.036, Hj + 0.005], [0.038, Hj + 0.009]]; for (let i = 0; i < 3; i++) { const y = Hj + 0.012 + i * 0.0065; lidProf.push([0.0395, y], [0.0365, y + 0.003]); } lidProf.push([0.038, Hj + 0.034], [0.034, Hj + 0.039], [0, Hj + 0.039]);
    mesh(lathe(lidProf, Q.seg), std({ color: '#C59B27', metalness: 0.75, roughness: 0.38 }), 'jarLid', body);
    body.userData.liquid = liquid; return body;
  }

  // ============ 10-12. ceramic pinch bowls with heaped, instanced contents (corn kernels / toasted sesame / crispy shallot chips) ============
  function buildBowl(kind) {
    const R = 0.058, Hb = 0.045, glaze = { corn: ['#E9E0CC', '#3F6B8F', '#D9A71E'], sesame: ['#9DB7A4', '#7C9A86', '#CDBF9D'], chips: ['#B7714B', '#8C5233', '#9E6A2A'] }[kind];
    const prof = [[0, 0], [0.026, 0], [0.03, 0.003], [0.04, 0.012], [0.052, 0.03], [R, Hb - 0.004], [R - 0.001, Hb], [R - 0.006, Hb], [R - 0.0085, Hb - 0.004], [0.047, 0.03], [0.03, 0.014], [0, 0.011]];
    const bowl = lathe(prof, Q.seg), bp = bowl.attributes.position, col = new Float32Array(bp.count * 3), a = new THREE.Color(glaze[0]), b = new THREE.Color(glaze[1]), c = new THREE.Color();
    for (let i = 0; i < bp.count; i++) { c.copy(a).lerp(b, clamp01((bp.getY(i) - (Hb - 0.011)) / 0.008)); col.set([c.r, c.g, c.b], i * 3); }
    bowl.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const fill = paint(new THREE.SphereGeometry(0.046, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glaze[2]); place(fill, { p: [0, 0.017, 0], s: [1, 0.5, 1] });
    const body = new THREE.Group(); mesh(mergeGeometries([bowl, fill]), std({ color: '#FFFFFF', vertexColors: true, roughness: 0.28 }), 'bowlCeramic', body); bowl.dispose(); fill.dispose();
    const cfg = { corn: { n: 56, geo: new THREE.SphereGeometry(1, 6, 4), s: [0.0085, 0.0105, 0.0085], cols: ['#F5C028', '#E8AE1C', '#F8CE4A'], name: 'cornKernels', top: 0.024 },
      sesame: { n: 150, geo: new THREE.SphereGeometry(1, 5, 3), s: [0.0072, 0.003, 0.0042], cols: ['#EADFC4', '#D8C9A6', '#9A8662'], name: 'sesameSeeds', top: 0.02 },
      chips: { n: 34, geo: new THREE.BoxGeometry(0.03, 0.0035, 0.02), s: [1, 1, 1], cols: ['#C98A33', '#B7762B', '#D9A24A'], name: 'shallotChips', top: 0.026 } }[kind];
    disposables.push(cfg.geo);
    const im = new THREE.InstancedMesh(cfg.geo, std({ color: '#FFFFFF', roughness: kind === 'chips' ? 0.55 : 0.4 }), cfg.n); im.name = cfg.name; im.castShadow = false; im.receiveShadow = true;
    const rng = mulberry32(kind === 'corn' ? 101 : kind === 'sesame' ? 202 : 303), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color(), Rm = 0.044;
    for (let i = 0; i < cfg.n; i++) {
      const r = Rm * Math.sqrt((i + 0.5) / cfg.n), th = i * 2.39996 + rng() * 0.4, y = 0.026 + cfg.top * (1 - (r / Rm) ** 2) + (kind === 'chips' ? 0.002 * rng() : 0);
      e.set((rng() - 0.5) * (kind === 'chips' ? 0.8 : 0.9), rng() * 6.283, (rng() - 0.5) * (kind === 'chips' ? 0.8 : 0.9)); q.setFromEuler(e);
      m.compose(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r), q, new THREE.Vector3(...cfg.s)); im.setMatrixAt(i, m); im.setColorAt(i, cc.set(cfg.cols[Math.floor(rng() * cfg.cols.length) % cfg.cols.length]));
    }
    body.add(im); return body;
  }

  // ---------------- assemble ----------------
  // side: which paw carries it (arms fan out from the top edge). tag: [x, z] of the floating pill, outside the board edge.
  const entries = [
    { id: 'bamboo_shoot', name: '01. Fresh Bamboo Shoot', group: 'centrepiece', label: 'BAMBOO SHOOT', body: buildBamboo(), side: 'L', rest: [0.0, 0.0], yaw: 0.12, H: 0.38, sq: { sy: 0.78, sxz: 1.1 }, tag: [0.0, -0.385] },
    { id: 'noodle_dough', name: '02. Hand-Pulled Dough', group: 'fresh', label: 'DOUGH BALL', body: buildDough(), side: 'R', rest: [0.2, -0.2], yaw: 0, H: 0.34, sq: { sy: 0.6, sxz: 1.25 }, tag: [0.3, -0.385] },
    { id: 'baby_bok_choy', name: '03. Baby Bok Choy', group: 'fresh', label: 'BABY BOK CHOY', body: buildBokChoy(), side: 'L', rest: [-0.1, -0.19], yaw: -0.1, H: 0.22, sq: { sy: 0.9, sxz: 1.05 }, tag: [-0.3, -0.385] },
    { id: 'shiitake_mushrooms', name: '04. Fresh Shiitake', group: 'fresh', label: 'SHIITAKE', body: buildShiitakeDuo(), side: 'R', rest: [0.1, 0.2], yaw: 0.05, H: 0.3, sq: { sy: 0.85, sxz: 1.08 }, tag: [0.1, 0.385] },
    { id: 'garlic_bulb', name: '05. Whole Garlic', group: 'aromatics', label: 'GARLIC', body: buildGarlic(), side: 'L', rest: [-0.35, -0.19], yaw: 0.3, H: 0.3, sq: { sy: 0.88, sxz: 1.06 }, tag: [-0.62, -0.2] },
    { id: 'chili_oil_jar', name: '09. Sesame Chili Oil', group: 'condiments', label: 'CHILI OIL', body: buildJar(), side: 'R', rest: [0.37, -0.2], yaw: 0, H: 0.36, sq: { sy: 0.94, sxz: 1.03 }, settle: 'thud', tag: [0.62, -0.2] },
    { id: 'ginger_root', name: '06. Ginger Root', group: 'aromatics', label: 'GINGER', body: buildGinger(), side: 'L', rest: [-0.3, -0.04], yaw: 0.45, H: 0.3, sq: { sy: 0.85, sxz: 1.08 }, tag: [-0.62, -0.04] },
    { id: 'corn_bowl', name: '10. Sweet Corn', group: 'condiments', label: 'SWEET CORN', body: buildBowl('corn'), side: 'R', rest: [0.37, -0.04], yaw: 0, H: 0.3, sq: { sy: 0.95, sxz: 1.03 }, settle: 'thud', tag: [0.62, -0.04] },
    { id: 'scallion_bundle', name: '07. Scallions', group: 'aromatics', label: 'SCALLION', body: buildScallion(), side: 'L', rest: [-0.3, 0.13], yaw: -0.08, H: 0.3, sq: { sy: 0.85, sxz: 1.08 }, tag: [-0.62, 0.13] },
    { id: 'sesame_bowl', name: '11. Toasted Sesame', group: 'condiments', label: 'SESAME', body: buildBowl('sesame'), side: 'R', rest: [0.36, 0.09], yaw: 0, H: 0.3, sq: { sy: 0.95, sxz: 1.03 }, settle: 'thud', tag: [0.62, 0.1] },
    { id: 'kombu_sheet', name: '08. Dried Kombu', group: 'aromatics', label: 'KOMBU', body: buildKombu(), side: 'L', rest: [-0.31, 0.24], yaw: 0.05, H: 0.3, sq: { sy: 0.9, sxz: 1.05 }, tag: [-0.62, 0.24] },
    { id: 'shallot_chip_bowl', name: '12. Crispy Shallot Chips', group: 'condiments', label: 'CRISPY SHALLOT', body: buildBowl('chips'), side: 'R', rest: [0.36, 0.22], yaw: 0, H: 0.3, sq: { sy: 0.95, sxz: 1.03 }, settle: 'thud', tag: [0.62, 0.24] },
  ];
  // soft contact shadow: one shared radial-gradient plane geometry + texture, one material (own opacity) per ingredient
  const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(59,35,18,0.85)'); gr.addColorStop(0.55, 'rgba(59,35,18,0.38)'); gr.addColorStop(1, 'rgba(59,35,18,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2); disposables.push(shadowTex, shadowGeo);
  for (const d of entries) {
    const root = new THREE.Group(); root.name = d.id; group.add(root);
    const part = makePart(d.id, { ...d, entry: entryFor(d.side) }); root.add(part.root);
    const sm = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); disposables.push(sm);
    const sh = new THREE.Mesh(shadowGeo, sm); sh.name = 'contactShadow'; sh.renderOrder = 1; sh.visible = false; sh.castShadow = false; sh.receiveShadow = false;
    sh.userData.base = new THREE.Vector2(part.size.x + 0.05, part.size.z + 0.06);   // soft oval a little wider than the footprint
    root.add(sh); part.shadow = sh;
    ingredientsMap.set(d.id, { id: d.id, name: d.name, group: d.group, label: d.label, root, parts: [part], tag: new THREE.Vector3(d.tag[0], 0.3, d.tag[1]) });
  }

  /** Pure pose of one part at its own progress p (0..1). */
  function poseAt(part, p) {
    const r = part.root; part.p = p; part.attached = p > 0 && p < DROP.release;
    r.visible = p > 0;   // not yet dropped: hidden, but its transform is still assigned (state is a pure function of p, no stale values)
    const [lx, lz] = part.rest; let x = lx, y = 0, z = lz, sy = 1, sxz = 1;
    if (p < DROP.release) {   // carried: slides in along the arm axis to hover at height H, held by the paw
      const s = E_INOUT(p / DROP.release), k = 1 - s; x = lx + part.entry.x * k; z = lz + part.entry.z * k; y = part.H + part.entry.y * k;
    } else if (p < DROP.impact) {   // released: gravity fall with a little stretch
      const f = (p - DROP.release) / (DROP.impact - DROP.release); y = part.H * (1 - f * f); sy = 1 + 0.1 * f * f; sxz = 1 - 0.05 * f * f;
    } else {   // impact, rebound, settle
      const q = (p - DROP.impact) / (1 - DROP.impact), E = part.settle === 'thud' ? E_THUD(q) : E_ELASTIC(q), k = 1 - E;
      sy = 1 - (1 - part.sq.sy) * k; sxz = 1 + (part.sq.sxz - 1) * k;
    }
    r.position.set(x, y, z); r.rotation.y = part.yaw; r.scale.set(sxz, sy, sxz); part.tilt.rotation.set(0, 0, 0);
    // contact shadow lives on the board (root-local -> board plane): fades in as the piece comes down, never floats away from the wood
    const sh = part.shadow, near = clamp01(1 - y / (part.H * 0.9)), a = near * near * (3 - 2 * near);
    sh.visible = p > 0 && a > 0.002; sh.material.opacity = 0.3 * a; sh.position.set(0, 0.0025 - y, 0); sh.scale.set(sh.userData.base.x * (1 + 0.25 * (1 - a)), 1, sh.userData.base.y * (1 + 0.25 * (1 - a)));
    sh.scale.divide(r.scale);   // cancel the squash so the shadow stays a flat oval
    const lq = part.body.userData.liquid;
    if (lq) { const q = p > DROP.impact ? (p - DROP.impact) / (1 - DROP.impact) : 0, d = Math.exp(-4.5 * q); lq.scale.y = 1 + 0.09 * d * Math.sin(19 * q); lq.rotation.z = 0.07 * d * Math.sin(17 * q + 1); lq.rotation.x = 0.05 * d * Math.sin(15 * q + 2); }
  }

  function setDropProgress(id, progress) { const e = ingredientsMap.get(id); if (!e) throw new Error('unknown ingredient ' + id); for (const part of e.parts) poseAt(part, clamp01(progress)); }
  for (const id of INGREDIENT_ORDER) setDropProgress(id, 0);

  return {
    group, ingredientsMap, ids: INGREDIENT_ORDER, setDropProgress, bboxOf,
    /** Every part's resting footprint (board-local frame), instances included. NOTE: leaves every part posed at p = 1 (test helper). */
    restBounds() { const res = {}; for (const [id, e] of ingredientsMap) { const b = new THREE.Box3(); for (const part of e.parts) { poseAt(part, 1); b.union(bboxOf(part.body)); } res[id] = b; } return res; },
    stats() { let triangles = 0, drawCalls = 0; group.traverse((o) => { if (!o.isMesh || !o.visible) return; let v = true; for (let p = o; p && p !== group; p = p.parent) if (!p.visible) v = false; if (!v) return; drawCalls++; const g = o.geometry; triangles += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); }); return { triangles, drawCalls }; },
    dispose() { for (const d of disposables) d.dispose?.(); group.removeFromParent(); },
  };
}
