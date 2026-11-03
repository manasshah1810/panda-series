import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PROPORTIONS as P, PALETTE as C } from '../config/defaults.js';
import { part, ellipsoid, ellipsoidGeo, placeOnSurface, projectToEllipsoid, mergeParts, M4, Mq, ratio } from './helpers.js';

const HJ = P.joints.head;
const toHead = (v) => v.clone().sub(new THREE.Vector3(...HJ));
const H = { c: P.head.center, r: P.head.radii };
const col = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

/** Surface height of the muzzle ellipsoid at (x,y) (world); returns z. */
export function muzzleZ(x, y, lift = 0.004) {
  const m = P.muzzle, nx = (x - m.center[0]) / m.radii[0], ny = (y - m.center[1]) / m.radii[1];
  return m.center[2] + m.radii[2] * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) + lift;
}

/** Brow: a soft tapered ribbon (thick in the middle, pointed at both ends) that curves with the forehead (z follows the head
 *  curvature, a little deeper at the ends so it can never float). Lies in the brow-local XY plane, authored along +X. */
function browGeo(tier) {
  const L = P.brow.length, Wd = P.brow.width, nx = tier.lite ? 8 : 14, ny = 4, pos = [], idx = [], R = 0.55;
  for (let i = 0; i <= nx; i++) { const u = (i / nx) * 2 - 1, x = u * L, w = Wd * Math.pow(Math.max(0, 1 - Math.abs(u) ** 2.4), 0.6) + 0.0015;
    for (let j = 0; j <= ny; j++) { const v = (j / ny) * 2 - 1; pos.push(x, v * w, -(x * x) / (2 * R) + 0.0035 + 0.009 * Math.sqrt(Math.max(0, 1 - v * v)) * (1 - Math.abs(u) ** 3)); } }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const a = i * (ny + 1) + j, b = (i + 1) * (ny + 1) + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** Tapers the radius of a TubeGeometry toward both open ends (round, brush-stroke ends instead of blunt cuts). */
function taperTube(g, curve, segs, radial, ends = 0.16, min = 0.3) {
  const p = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) { const t = i / segs, e = Math.min(t, 1 - t) / ends, k = e >= 1 ? 1 : min + (1 - min) * Math.sin(e * Math.PI / 2); curve.getPointAt(t, c);
    for (let j = 0; j <= radial; j++) { const n = i * (radial + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(k).add(c); p.setXYZ(n, v.x, v.y, v.z); } }
  return g;
}

/** Builds every facial part, merged by material wherever the parts never move relative to each other. */
export function buildFace(rig, tier, mats) {
  const owned = []; const sides = {};
  const own = (parent, o) => { parent.add(o); owned.push(o); return o; };
  const blushParts = [], shineParts = [];

  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const S = {};
    // ---- eye: sphere + iris + pupil merged into ONE mesh; pivot sits on the patch surface ----
    const e = P.eye;
    const ep = projectToEllipsoid(H.c, H.r, s * e.x, e.y, 1, 0.0);
    const eyePivot = rig['eye' + side]; eyePivot.position.copy(toHead(ep.position)); eyePivot.quaternion.copy(ep.quaternion);
    const zf = (rho) => Math.sqrt(e.radius ** 2 - rho ** 2);
    const ring = new THREE.RingGeometry(e.radius * 0.40, e.radius * 0.66, 20), disc = new THREE.CircleGeometry(e.radius * 0.40, 20);
    const dots = (x, y) => [
      { geo: new THREE.SphereGeometry(e.radius * 0.26, 8, 6), matrix: M4([x - e.radius * 0.30, y + e.radius * 0.36, e.radius * 0.86]) },
      { geo: new THREE.SphereGeometry(e.radius * 0.11, 6, 5), matrix: M4([x + e.radius * 0.28, y - e.radius * 0.30, e.radius * 0.91]) },
    ];
    const eyeParts = [
      { geo: new THREE.SphereGeometry(e.radius, tier.small + 4, tier.small + 2) },
      { geo: ring, matrix: M4([0, 0, zf(e.radius * 0.66) + 0.0012]), color: ratio(C.eyeWarmRing, C.eyeDark) },
      { geo: disc, matrix: M4([0, 0, zf(e.radius * 0.40) + 0.0022]), color: [0.6, 0.6, 0.6] },
    ];
    if (tier.lite) for (const d of dots(0, 0)) eyeParts.push({ ...d, color: ratio('#FFF4E4', C.eyeDark) }); // lite: highlights ride with the eye (saves a draw call)
    const eyeMesh = part(mergeParts(eyeParts, mats.eyeball, 'eye'), 'eyeball' + side, { cast: false });
    const spin = new THREE.Group(); spin.name = 'eyeSpin' + side; eyePivot.add(spin); owned.push(spin); spin.add(eyeMesh);
    S.eyeSpin = spin;
    // highlights stay fixed to the head (stable specular). Both eyes' dots are merged into one mesh (full tiers).
    const eq = new THREE.Matrix4().compose(eyePivot.position, eyePivot.quaternion, new THREE.Vector3(1, 1, 1));
    if (!tier.lite) { const sh = mergeParts(dots(0, 0).map((d) => ({ geo: d.geo, matrix: d.matrix })), mats.shine, 'eyeShine' + side); sh.castShadow = false; sh.position.copy(eyePivot.position); sh.quaternion.copy(eyePivot.quaternion); own(rig.head, sh); S.shine = sh; }

    // ---- eyelid: hemispherical shell + charcoal closed-eye line, ONE mesh (line is vertex-coloured) ----
    const lidPivot = rig['lid' + side]; lidPivot.position.copy(eyePivot.position); lidPivot.quaternion.copy(eyePivot.quaternion);
    const arc = []; // authored in DOME-local space: the pole (+Y) faces front when the lid is closed; local +Z maps to world -Y
    for (let i = 0; i <= 10; i++) { const x = (i / 10 - 0.5) * 2 * 0.052; const yw = -0.006 - 0.01 * (1 - (x / 0.052) ** 2) + 0.012, zl = -yw; arc.push(new THREE.Vector3(x, Math.sqrt(Math.max(0, e.lidRadius ** 2 - x * x - zl * zl)) + 0.002, zl)); }
    const lidMesh = part(mergeParts([
      { geo: new THREE.SphereGeometry(e.lidRadius, tier.small + 4, tier.small, 0, Math.PI * 2, 0, Math.PI / 2) },
      { geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 10, 0.0075, 5, false), color: ratio('#52525A', C.furBlack) },
    ], mats.lid, 'lid'), 'eyelid' + side, { cast: false });
    const lidHolder = new THREE.Group(); lidHolder.add(lidMesh); lidPivot.add(lidHolder); owned.push(lidHolder); S.lid = lidHolder;

    // ---- brow: rounded capsule on a pivot oriented to the forehead; tilt group does the acting ----
    const bp = projectToEllipsoid(H.c, H.r, s * P.brow.x, P.brow.y, 1, P.brow.lift);
    const browPivot = rig['brow' + side]; browPivot.position.copy(toHead(bp.position)); browPivot.quaternion.copy(bp.quaternion);
    browPivot.userData.base = browPivot.position.clone(); browPivot.userData.normal = bp.normal.clone();
    const tilt = new THREE.Group(); tilt.name = 'browTilt' + side; browPivot.add(tilt); owned.push(tilt);
    const brow = part(new THREE.Mesh(browGeo(tier), mats.brow), 'brow' + side, { cast: false });
    tilt.add(brow); S.brow = tilt;

    // ---- cheeks: blush (merged, full tiers) + puff bump (full tiers) ----
    const cp = projectToEllipsoid(H.c, H.r, s * P.cheek.x, P.cheek.y, 1, 0.0);
    if (!tier.lite) {
      { const pg = new THREE.PlaneGeometry(P.cheek.radius * 2, P.cheek.radius * 1.5, 1, 1); pg.applyMatrix4(Mq(toHead(cp.position), cp.quaternion)); blushParts.push(pg); }
      const puff = part(ellipsoid([0.13, 0.11, 0.09], 6, 10, mats.fur, 'cheekPuff'), 'cheekPuff' + side);
      puff.position.copy(toHead(cp.position)).addScaledVector(cp.normal, -0.03); puff.quaternion.copy(cp.quaternion); puff.scale.setScalar(0.001);
      own(rig.head, puff); S.puff = puff; S.puffBase = puff.position.clone(); S.puffNormal = cp.normal.clone();
    }
    sides[side] = S;
  }
  let blush = null;
  if (blushParts.length) { blush = new THREE.Mesh(mergeGeometries(blushParts, false), mats.blush); blush.name = 'blush'; blush.castShadow = false; own(rig.head, blush); }

  // ---- nose (rounded inverted triangle) ----
  const nr = P.nose.radii;
  const ng = new THREE.SphereGeometry(1, tier.small + 4, tier.small + 2); ng.scale(nr[0], nr[1], nr[2]);
  const npos = ng.attributes.position;
  for (let i = 0; i < npos.count; i++) { const t = (npos.getY(i) / nr[1] + 1) / 2; npos.setX(i, npos.getX(i) * (0.62 + 0.38 * t)); }
  ng.computeVertexNormals();
  const nose = part(new THREE.Mesh(ng, mats.nose), 'nose', { cast: false });
  nose.position.copy(toHead(new THREE.Vector3(...P.nose.center))); own(rig.head, nose);
  if (!tier.lite) { const nShine = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), mats.shine); nShine.position.set(-0.03, 0.032, 0.058); nose.add(nShine); }

  // ---- mouth: line tube + inner fill + tongue, merged into ONE unlit vertex-coloured mesh, rebuilt when params change ----
  const mouth = { mesh: null, sig: '' };
  mouth.rebuild = (m) => {
    const sig = [m.curve, m.width, m.open, m.offsetX, m.pucker].map((v) => v.toFixed(3)).join('|');
    if (sig === mouth.sig) return; mouth.sig = sig;
    if (mouth.mesh) { mouth.mesh.removeFromParent(); mouth.mesh.geometry.dispose(); mouth.mesh = null; }
    const pk = m.pucker, hw = P.mouth.halfWidth * m.width * (1 - 0.55 * pk), my = P.mouth.y;
    const open = Math.max(m.open, pk * 0.75) * 0.085 * (1 + 0.5 * pk);
    const N = Math.max(8, tier.tube / 2 | 0), up = [];
    const yAt = (t) => {
      let y = my + m.curve * 0.05 * t * t * (1 - 0.6 * pk) - 0.011 * Math.abs(Math.sin(Math.PI * t)) * (1 - 0.8 * pk);
      if (m.offsetX) y += m.offsetX * 0.045 * Math.max(0, t) ** 2 - Math.abs(m.offsetX) * 0.008 * (1 - t) * (m.offsetX < 0 ? 1 : 0);
      return y;
    };
    for (let i = 0; i <= N; i++) { const t = (i / N) * 2 - 1; up.push(new THREE.Vector3(t * hw + m.offsetX * 0.015 * (1 - Math.abs(t)), yAt(t), 0)); }
    const lowerY = (t) => my - open * Math.pow(Math.max(0, 1 - t * t), 0.6) + m.curve * 0.02 * t * t;
    const low = []; if (open > 0.004) for (let i = N - 1; i >= 1; i--) { const t = (i / N) * 2 - 1; low.push(new THREE.Vector3(t * hw, lowerY(t), 0)); }
    const zFix = (v, lift) => { v.z = muzzleZ(v.x, v.y, lift) - HJ[2]; v.y -= HJ[1]; return v; };
    const loop = [...up, ...low];
    const phil = [new THREE.Vector3(0, P.nose.center[1] - P.nose.radii[1] * 0.9, 0), new THREE.Vector3(0, my + 0.004, 0)];
    const tube = (arr, closed, r) => { const cv = new THREE.CatmullRomCurve3(arr.map((v) => zFix(v.clone(), 0.006)), closed, 'catmullrom', 0.5), g = new THREE.TubeGeometry(cv, tier.tube, r, 6, closed); return closed ? g : taperTube(g, cv, tier.tube, 6); };
    const dark = col(C.noseAndEyes);
    const parts = [{ geo: tube(loop, open > 0.004, P.mouth.radius), color: dark }, { geo: tube(phil, false, P.mouth.radius * 0.8), color: dark }];
    const grid = (j0, j1, xs, lift, color) => {
      const R = 4, pos = [], idx = [], cl = [];
      for (let i = 0; i <= N; i++) { const t = (i / N) * 2 - 1, yU = yAt(t), yL = lowerY(t); for (let j = 0; j <= R; j++) { const v = j0 + (j1 - j0) * (j / R); const p = zFix(new THREE.Vector3(t * hw * xs, yL + (yU - yL) * v, 0), lift); pos.push(p.x, p.y, p.z); const sh = color === 'dark' ? 1 : 1 - 0.5 * Math.pow(Math.max(0, v), 1.5); cl.push(sh, sh, sh); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = (i + 1) * (R + 1) + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx);
      return { geo: g, color };
    };
    if (open > 0.004) { parts.push(grid(0, 1, 0.97, 0.0025, col(C.innerMouth))); if (open > 0.03) parts.push(grid(0, 0.36, 0.5, 0.0035, col(C.tongue))); }
    mouth.mesh = mergeParts(parts, mats.mouth, 'mouth'); mouth.mesh.castShadow = false; rig.jaw.add(mouth.mesh);
  };
  mouth.dispose = () => { mouth.sig = ''; if (mouth.mesh) { mouth.mesh.removeFromParent(); mouth.mesh.geometry.dispose(); mouth.mesh = null; } };
  return { sides, nose, mouth, owned, blush };
}
