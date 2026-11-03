import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Point on an axis-aligned ellipsoid (centre c, radii r) in direction (x,y) from centre, solving z.
 *  Returns {position, normal, quaternion} where quaternion maps +Z onto the surface normal. */
export function projectToEllipsoid(c, r, x, y, sign = 1, lift = 0) {
  const nx = (x - c[0]) / r[0], ny = (y - c[1]) / r[1];
  const t = Math.max(0, 1 - nx * nx - ny * ny);
  const nz = sign * Math.sqrt(t);
  const position = new THREE.Vector3(x, y, c[2] + nz * r[2]);
  const normal = new THREE.Vector3(nx / r[0], ny / r[1], nz / r[2]).normalize();
  position.addScaledVector(normal, lift);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  return { position, normal, quaternion };
}

/** Place `mesh` on ellipsoid surface, oriented to the normal, with an extra roll around the normal. */
export function placeOnSurface(mesh, c, r, x, y, { roll = 0, lift = 0 } = {}) {
  const p = projectToEllipsoid(c, r, x, y, 1, lift);
  mesh.position.copy(p.position);
  mesh.quaternion.copy(p.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
  return p;
}

export function ellipsoid(radii, seg, rad, material, name) {
  const g = new THREE.SphereGeometry(1, rad, seg);
  g.scale(radii[0], radii[1], radii[2]);
  const m = new THREE.Mesh(g, material);
  m.name = name || 'ellipsoid';
  return m;
}

/** Make a mesh, tagging it for shadow + part-name lookup. */
export function part(mesh, name, { cast = true, receive = true } = {}) {
  mesh.name = name; mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.userData.pandaPart = name;
  return mesh;
}

export const mirrorX = (v) => [-v[0], v[1], v[2]];

export function ellipsoidGeo(radii, seg, rad) { const g = new THREE.SphereGeometry(1, rad, seg); g.scale(radii[0], radii[1], radii[2]); return g; }
/** Vertex-colour multiplier that turns `base` material colour into `target` (may exceed 1 to lighten). */
export function ratio(target, base) { const t = new THREE.Color(target), b = new THREE.Color(base); return [t.r / Math.max(b.r, 1e-4), t.g / Math.max(b.g, 1e-4), t.b / Math.max(b.b, 1e-4)]; }
export function M4(pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) { return new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl)); }
export function Mq(pos, quat, scl = [1, 1, 1]) { return new THREE.Matrix4().compose(pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(...pos), quat, new THREE.Vector3(...scl)); }
/** Merge geometries (each with its own matrix + vertex-colour multiplier) into ONE mesh = one draw call. */
export function mergeParts(parts, material, name) {
  const geos = parts.map(({ geo, matrix, color = [1, 1, 1] }) => {
    const g = geo.clone(); g.deleteAttribute('uv'); if (matrix) g.applyMatrix4(matrix);
    const n = g.attributes.position.count, col = new Float32Array(n * 3), pc = g.attributes.color; for (let i = 0; i < n; i++) { const k = pc ? [pc.getX(i), pc.getY(i), pc.getZ(i)] : [1, 1, 1]; col[i * 3] = color[0] * k[0]; col[i * 3 + 1] = color[1] * k[1]; col[i * 3 + 2] = color[2] * k[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
  });
  const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose()); parts.forEach((p) => p.dispose !== false && p.geo.dispose());
  const m = new THREE.Mesh(merged, material); if (name) m.name = name; return m;
}
