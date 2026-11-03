import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Rounded box; falls back to a plain box when radius or segments are 0. */
export function rbox(w, h, d, r = 0, seg = 1) {
  if (r <= 0 || seg <= 0) return new THREE.BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
}
export function mat4({ p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
  const m = new THREE.Matrix4(); const sc = typeof s === 'number' ? [s, s, s] : s;
  return m.compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...sc));
}
/** Lathe from [[r,y],...] (closed solid profile: out along the base, up the outer wall, over the rim, down the inner wall). */
export function lathe(points, seg = 24) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
export function tube(points, radius, tubular = 24, radial = 8, closed = false) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed), tubular, radius, radial, closed); }

/** World-space box projection UVs: texture coordinates come from the dominant normal axis, so slabs of any size keep a constant
 *  texel density. `grain` ('x'|'y'|'z') makes u run along that axis on every face that contains it (wood grain direction).
 *  `o` offset, `rot` quarter turns, `flip` mirror: used per slab to hide tiling. */
export function boxUV(g, { s = 0.5, grain = null, o = [0, 0], rot = 0, flip = false } = {}) {
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, gi = grain ? 'xyz'.indexOf(grain) : -1;
  const ang = (rot * Math.PI) / 2, c = Math.cos(ang), sn = Math.sin(ang), co = [0, 0, 0];
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i));
    co[0] = P.getX(i); co[1] = P.getY(i); co[2] = P.getZ(i);
    const dom = nx >= ny && nx >= nz ? 0 : ny >= nz ? 1 : 2;
    const axes = dom === 0 ? [2, 1] : dom === 1 ? [0, 2] : [0, 1];
    let u = co[axes[0]], v = co[axes[1]];
    if (gi >= 0 && dom !== gi) { const other = axes[0] === gi ? axes[1] : axes[0]; u = co[gi]; v = co[other]; }
    if (flip) u = -u;
    U.setXY(i, (u * c - v * sn) * s + o[0], (u * sn + v * c) * s + o[1]);
  }
  U.needsUpdate = true;
}

/** Collects static geometry per material and merges it into one mesh per material (few draw calls). */
export class Batch {
  constructor() { this.map = new Map(); this.boxes = new Map(); }
  add(mat, geo, xf = null, uv = null, tag = null) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (xf) g.applyMatrix4(xf.isMatrix4 ? xf : mat4(xf));
    if (uv) boxUV(g, uv);
    if (tag) { g.computeBoundingBox(); const b = this.boxes.get(tag); if (b) b.union(g.boundingBox); else this.boxes.set(tag, g.boundingBox.clone()); }
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
  }
  build(parent) {
    const meshes = [];
    for (const [mat, list] of this.map) {
      const g = mergeGeometries(list, false); list.forEach((x) => x.dispose());
      const m = new THREE.Mesh(g, mat); m.name = 'static_' + (mat.name || 'mat');
      m.castShadow = !mat.userData.noCast; m.receiveShadow = !mat.userData.noReceive; parent.add(m); meshes.push(m);
    }
    this.map.clear(); return meshes;
  }
}

/** Instanced mesh helper: transforms is an array of Matrix4, colors optional array of THREE.Color. */
export function instanced(geo, mat, transforms, colors = null, name = '') {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length); im.name = name;
  transforms.forEach((m, i) => im.setMatrixAt(i, m));
  if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; return im;
}
/** World bounding box of an instanced mesh (for placement checks). */
export function instancedBox(im) {
  const box = new THREE.Box3(), gb = im.geometry.boundingBox ?? (im.geometry.computeBoundingBox(), im.geometry.boundingBox), m = new THREE.Matrix4(), b = new THREE.Box3();
  for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); b.copy(gb).applyMatrix4(m); box.union(b); } return box;
}
