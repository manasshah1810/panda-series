import * as THREE from 'three';
import { PROPORTIONS as P } from '../config/defaults.js';
import { part } from './helpers.js';

/** Pear torso: lathe from a Catmull-Rom profile, with the belly folded in as a smooth z-displacement (no second mesh, no
 *  intersection crease). Authored in world space, then shifted so it hangs under the `belly` pivot (waist, on the torso axis). */
export function buildTorso(tier, mats, pivotY) {
  const pts = [new THREE.Vector2(0.0, P.torso.bottomY), new THREE.Vector2(0.26, P.torso.bottomY + 0.005),
    ...P.torso.profile.map(([y, r]) => new THREE.Vector2(r, y)), new THREE.Vector2(0.2, P.torso.topY - 0.01), new THREE.Vector2(0, P.torso.topY)];
  const prof = new THREE.SplineCurve(pts).getPoints(tier.seg);
  prof[0].x = 0; prof[prof.length - 1].x = 0;
  const g = new THREE.LatheGeometry(prof, tier.rad);
  g.scale(1, 1, P.torso.zScale);
  const pos = g.attributes.position, B = P.torso.belly, ss = THREE.MathUtils.smoothstep;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), front = ss(z / Math.max(0.05, Math.hypot(x, z)), 0.15, 0.9);
    pos.setZ(i, z + B.bump * Math.exp(-(((y - B.y) / B.sigma) ** 2)) * front * (1 - ss(Math.abs(x), 0.3, 0.55)));
  }
  g.translate(0, -pivotY, 0);
  g.computeVertexNormals();
  return part(new THREE.Mesh(g, mats.torso), 'torso');
}
