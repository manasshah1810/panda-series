import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Chef's knife prop (episode-specific, NOT in panda-kit). Procedural only: lathe blade, bolster, walnut handle with two rivets.
 *
 * Local frame: origin = `gripPoint` (centre of the handle), +Y runs from the handle towards the tip, the blade's flat faces
 * look along ±Z, the cutting edge is on the -X side, the spine on the +X side. Total length 0.55 (handle butt -> tip).
 *
 *   butt  -0.085   handle   +0.085  bolster +0.115  blade ........ +0.465 (tip)
 *
 * Returns a THREE.Group. `knife.userData.sockets = { gripPoint, tipPoint }` are Object3D children (named) for attaching things.
 */
export const KNIFE = Object.freeze({
  length: 0.55, buttY: -0.085, handleHalf: 0.085, bolsterTop: 0.115, tipY: 0.465, thickness: 0.02, bladeHalfWidth: 0.044,
  handleW: 0.032, handleT: 0.026, colors: { steel: '#B9BDC4', walnut: '#5B3A25', brass: '#C9A25A' },
});

// seeded grain so the canvas textures are identical on every run
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvasTex(w, h, paint, { repeat = [1, 1] } = {}) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4; return t;
}
/** Brushed steel: long fine streaks along the blade (used as a roughness map; tone stays mid-grey so roughness ~0.35 on average). */
function brushedRoughness(seed) {
  const t = canvasTex(64, 256, (g, w, h) => {
    const r = rng(seed); g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { const x = r() * w, l = 30 + r() * 200, y = r() * h, v = 70 + r() * 70; g.strokeStyle = `rgb(${v},${v},${v})`; g.globalAlpha = 0.25 + r() * 0.35; g.lineWidth = 0.6 + r() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y + l); g.stroke(); }
  }); if (t) t.colorSpace = THREE.NoColorSpace; return t;
}
function walnutMap(seed) {
  return canvasTex(128, 256, (g, w, h) => {
    const r = rng(seed); g.fillStyle = '#5B3A25'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = r() * w, v = r() * 40 - 20; g.strokeStyle = `rgba(${60 + v},${36 + v * 0.6},${22 + v * 0.4},${0.25 + r() * 0.35})`; g.lineWidth = 0.8 + r() * 2.4; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 14, h * 0.33, x + (r() - 0.5) * 14, h * 0.66, x + (r() - 0.5) * 8, h); g.stroke(); }
  });
}

/** Lathe blade: radius profile = half width. Squared-off cross-section (power < 1) keeps the faces flat and every edge rounded. */
function bladeGeometry() {
  const y0 = KNIFE.bolsterTop - 0.004, y1 = KNIFE.tipY, L = y1 - y0, W = KNIFE.bladeHalfWidth, pts = [], N = 28;
  for (let i = 0; i <= N; i++) {
    const s = i / N, w = W * Math.pow(Math.max(0, 1 - Math.pow(s, 2.6)), 0.78) * (0.55 + 0.45 * Math.min(1, s * 14 + 0.0)) ;   // heel narrows into the bolster, belly sweeps to the tip
    pts.push(new THREE.Vector2(Math.max(0.0016, w), y0 + s * L));
  }
  pts.push(new THREE.Vector2(0.0008, y1 + 0.0012), new THREE.Vector2(0.0, y1 + 0.0016));   // tiny rounded tip, never a needle
  const g = new THREE.LatheGeometry(pts, 20), p = g.attributes.position, tz = (KNIFE.thickness / 2) / W, e = 0.62;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i), r = Math.hypot(x, z) || 1e-9, a = Math.atan2(z, x), cx = Math.cos(a), sz = Math.sin(a);
    const w = r;                                              // squircle: flat faces, rounded spine + edge
    let nx = w * Math.sign(cx) * Math.pow(Math.abs(cx), e), nz = w * Math.sign(sz) * Math.pow(Math.abs(sz), e) * tz;
    // straight spine: shift each ring so the +X side stays on one line, the cutting edge carries the curve
    nx += (W - w) * 1.0 - W + 0.016 + 0.0;                    // spine sits at x = +0.016 (flush with the handle)
    p.setXYZ(i, nx, y, nz);
  }
  g.computeVertexNormals(); return g;
}

export function createKnife({ envMap = null, name = 'knife' } = {}) {
  const K = KNIFE, g = new THREE.Group(); g.name = name;
  const steel = new THREE.MeshStandardMaterial({ color: K.colors.steel, metalness: 0.88, roughness: 0.35, envMap, envMapIntensity: 1.1, roughnessMap: brushedRoughness(11) });
  const wood = new THREE.MeshStandardMaterial({ color: '#FFFFFF', map: walnutMap(7), roughness: 0.62, metalness: 0, envMap, envMapIntensity: 0.35 });
  const brass = new THREE.MeshStandardMaterial({ color: K.colors.brass, metalness: 0.7, roughness: 0.38, envMap, envMapIntensity: 0.8 });
  if (!wood.map) wood.color.set(K.colors.walnut);

  const blade = new THREE.Mesh(bladeGeometry(), steel); blade.name = 'blade'; blade.castShadow = true;
  const bolsterGeo = new RoundedBoxGeometry(K.handleW + 0.004, 0.034, K.handleT + 0.002, 4, 0.0095); bolsterGeo.translate(0, K.handleHalf + 0.014, 0);
  const bolster = new THREE.Mesh(bolsterGeo, steel); bolster.name = 'bolster'; bolster.castShadow = true;
  // handle: rounded box, slightly fatter in the middle (belly) so it sits in a paw
  const hGeo = new RoundedBoxGeometry(K.handleW, K.handleHalf * 2, K.handleT, 5, 0.011); const hp = hGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) { const k = 1 + 0.08 * Math.cos((hp.getY(i) / K.handleHalf) * Math.PI * 0.5); hp.setX(i, hp.getX(i) * k); hp.setZ(i, hp.getZ(i) * k); }
  hGeo.computeVertexNormals();
  const handle = new THREE.Mesh(hGeo, wood); handle.name = 'handle'; handle.castShadow = true;
  const rivets = []; for (const y of [-0.04, 0.04]) for (const s of [-1, 1]) { const r = new THREE.SphereGeometry(0.0075, 10, 8); r.scale(1, 1, 0.55); r.translate(0, y, s * (K.handleT / 2 + 0.0004)); rivets.push(r); }
  const rivetMesh = new THREE.Mesh(mergeGeometries(rivets, false), brass); rivetMesh.name = 'rivets'; rivets.forEach((r) => r.dispose());
  g.add(blade, bolster, handle, rivetMesh);

  const gripPoint = new THREE.Object3D(); gripPoint.name = 'gripPoint'; gripPoint.position.set(0, 0, 0);
  const tipPoint = new THREE.Object3D(); tipPoint.name = 'tipPoint'; tipPoint.position.set(0, K.tipY, 0);
  g.add(gripPoint, tipPoint); g.userData.sockets = { gripPoint, tipPoint }; g.userData.dims = K;
  g.userData.setEnvMap = (t) => { for (const m of [steel, wood, brass]) { m.envMap = t; m.needsUpdate = true; } };
  g.userData.dispose = () => { g.traverse((o) => o.geometry?.dispose?.()); for (const m of [steel, wood, brass]) { m.map?.dispose(); m.roughnessMap?.dispose(); m.dispose(); } };
  return g;
}
