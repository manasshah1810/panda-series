import * as THREE from 'three';
import { PROPORTIONS as P } from '../config/defaults.js';
import { part, ellipsoid } from './helpers.js';

/** Pear torso (lathe from a Catmull-Rom profile) + separate belly bump. Geometry is authored in WORLD space
 *  then shifted so it hangs under the `spine` pivot. */
export function buildTorso(tier, mats, spineY) {
  const pts = [new THREE.Vector2(0.0, P.torso.bottomY), new THREE.Vector2(0.26, P.torso.bottomY + 0.005),
    ...P.torso.profile.map(([y, r]) => new THREE.Vector2(r, y)), new THREE.Vector2(0.2, P.torso.topY - 0.01), new THREE.Vector2(0, P.torso.topY)];
  const curve = new THREE.SplineCurve(pts);
  const prof = curve.getPoints(tier.seg);
  prof[0].x = 0; prof[prof.length - 1].x = 0;
  const g = new THREE.LatheGeometry(prof, tier.rad);
  g.scale(1, 1, P.torso.zScale);
  g.translate(0, -spineY, 0);
  g.computeVertexNormals();
  return part(new THREE.Mesh(g, mats.torso), 'torso');
}

export function buildBelly(tier, mats, spineY) {
  const m = ellipsoid(P.belly.radii, tier.small + 4, tier.small + 8, mats.belly, 'belly');
  m.position.set(P.belly.center[0], P.belly.center[1] - spineY, P.belly.center[2]);
  blendBellyNormals(m.geometry);
  return part(m, 'bellyMesh');
}

const prof = P.torso.profile;
const torsoR = (y) => { if (y <= prof[0][0]) return prof[0][1]; for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const t = (y - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0]); return prof[i - 1][1] + (prof[i][1] - prof[i - 1][1]) * t; } return prof[prof.length - 1][1]; };
/** Where the belly bump meets the torso, rotate its normals to the torso's so no shading seam shows. */
function blendBellyNormals(g) {
  const pos = g.attributes.position, nor = g.attributes.normal, c = P.belly.center; const n = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + c[0], y = pos.getY(i) + c[1], z = pos.getZ(i) + c[2];
    const rt = torsoR(y), tz = rt * P.torso.zScale * Math.sqrt(Math.max(0, 1 - (x / rt) ** 2));
    const w = THREE.MathUtils.smoothstep(z - tz, 0.0, 0.04);
    n.fromBufferAttribute(nor, i); t.set(x / (rt * rt), 0.12, z / ((rt * P.torso.zScale) ** 2)).normalize();
    n.lerpVectors(t, n, w).normalize(); nor.setXYZ(i, n.x, n.y, n.z);
  }
}
