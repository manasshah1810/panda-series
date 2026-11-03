import * as THREE from 'three';
import { PROPORTIONS as P } from '../config/defaults.js';

const ss = THREE.MathUtils.smoothstep;
const v = new THREE.Vector3();
const f = (p, c, r) => Math.hypot((p.x - c[0]) / r[0], (p.y - c[1]) / r[1], (p.z - c[2]) / r[2]);
function segDist(p, a, b) { const ab = b.clone().sub(a), t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1); return p.distanceTo(a.clone().addScaledVector(ab, t)); }

/** Bake analytic ambient-occlusion into a per-vertex colour multiplier (rest-pose world space).
 *  kind: 'torso' | 'head' | 'limb' | 'belly' | 'generic'. AO tints toward warm shadow rather than grey. */
export function bakeAO(mesh, kind, { cream = null, rootInv = null } = {}) {
  const M = new THREE.Matrix4();
  const g = mesh.geometry; const pos = g.attributes.position; const prev = g.attributes.color; const col = new Float32Array(pos.count * 3);
  mesh.updateWorldMatrix(true, false); M.copy(mesh.matrixWorld); if (rootInv) M.premultiply(rootInv);
  const head = [P.head.center, P.head.radii];
  const torsoC = [0, 0.9, 0], torsoR = [0.66, 0.6, 0.6];
  const armsA = [[new THREE.Vector3(P.shoulder.x, P.shoulder.y, 0), new THREE.Vector3(P.shoulder.x + 0.09, 0.5, 0.02)], [new THREE.Vector3(-P.shoulder.x, P.shoulder.y, 0), new THREE.Vector3(-P.shoulder.x - 0.09, 0.5, 0.02)]];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(M);
    let occ = 0;
    if (kind === 'torso' || kind === 'belly') occ += ss(1.5, 1.0, f(v, ...head)) * 0.62;           // under the chin
    if (kind === 'head') occ += ss(1.32, 1.02, f(v, torsoC, torsoR)) * 0.5;                          // chin crease
    if (kind === 'torso' || kind === 'belly') for (const [a, b] of armsA) occ += ss(0.34, 0.17, segDist(v, a, b)) * 0.5; // underarm
    if (kind !== 'torso' && kind !== 'belly' && kind !== 'head') occ += ss(1.3, 1.0, f(v, torsoC, torsoR)) * 0.45;   // limbs/tail tucked against the body
    occ += ss(0.32, 0.0, v.y) * 0.5;                                                                  // contact with the floor
    occ = Math.min(occ, 0.78);
    // warm-tinted multiplier: shadow side is warmer + a bit lighter than neutral grey
    let r = 1 - occ * 0.5, gr = 1 - occ * 0.58, b = 1 - occ * 0.7;
    if (cream) { const t = ss(0.0, 0.3, (v.z - 0.54) / 0.14); r *= 1 + (cream[0] - 1) * t; gr *= 1 + (cream[1] - 1) * t; b *= 1 + (cream[2] - 1) * t; }
    const k = prev ? [prev.getX(i), prev.getY(i), prev.getZ(i)] : [1, 1, 1];
    col[i * 3] = r * k[0]; col[i * 3 + 1] = gr * k[1]; col[i * 3 + 2] = b * k[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** Default (white) colour attribute for meshes that are not AO baked, so vertexColors materials render correctly. */
export function ensureColor(mesh) { const g = mesh.geometry; if (g.attributes.color) return; const n = g.attributes.position.count; g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); }
