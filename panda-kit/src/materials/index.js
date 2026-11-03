import * as THREE from 'three';
import { PALETTE as C, PROPORTIONS as P } from '../config/defaults.js';
import { whiteFur, headFur, headPatchSpec, bandSpec } from './whiteFur.js';
import { blackFur } from './blackFur.js';
import { glossyEye, glossyNose } from './glossy.js';
import { makeFuzzMaterial } from './fuzzShells.js';
import { makeGradientMap, toonMaterial, makeOutlineMaterial } from './toon.js';

/** Builds the material set for a style. `softClay` = patched MeshStandardMaterial fur. `toon` = MeshToonMaterial + outline. */
/** Soft radial falloff (procedural DataTexture, no canvas/image): blush fades to nothing instead of a hard-edged disc. */
function softDisc(n = 32) {
  const d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const r = Math.hypot((x + 0.5) / n * 2 - 1, (y + 0.5) / n * 2 - 1), v = Math.round(255 * Math.pow(Math.max(0, 1 - r), 1.4)); const i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.colorSpace = THREE.NoColorSpace; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
export function createMaterials({ style = 'softClay' } = {}) {
  const std = (color, roughness = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
  const flat = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
  const spineY = P.joints.spine[1];
  let torso, head, fur, limb;
  let gradientMap = null;
  if (style === 'toon') {
    gradientMap = makeGradientMap(4);
    const W = (band) => toonMaterial(C.furWhite, gradientMap, { band });
    torso = W(bandSpec([0, P.torso.belly.y, 0])); head = toonMaterial(C.furWhite, gradientMap, { patch: headPatchSpec() }); fur = W(null);
    limb = toonMaterial(C.furBlack, gradientMap);
  } else {
    torso = whiteFur(bandSpec([0, P.torso.belly.y, 0])); head = headFur(); fur = whiteFur();
    limb = blackFur();
  }
  const mats = {
    torso, head, fur, muzzle: head, tail: fur, limb, earOuter: limb,
    lid: limb, brow: limb,                       // patch / lids / brows / ears share one black so blinks read cleanly
    eyeball: glossyEye(), nose: glossyNose(),
    shine: flat('#FFF4E4', { toneMapped: false }),
    mouth: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    blush: flat(C.blush, { transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, alphaMap: softDisc() }),
  };
  const outline = style === 'toon' ? makeOutlineMaterial() : null;
  const fuzzWhite = style === 'softClay' ? makeFuzzMaterial('#FFF6EA', { opacity: 0.085 }) : null, fuzzBlack = style === 'softClay' ? makeFuzzMaterial('#4a4a55', { opacity: 0.16 }) : null;
  const all = [...new Set([...Object.values(mats), outline, fuzzWhite, fuzzBlack].filter(Boolean))];
  return { mats, all, style, outline, fuzzWhite, fuzzBlack, gradientMap, dispose() { all.forEach((m) => m.dispose()); gradientMap?.dispose(); mats.blush.alphaMap?.dispose(); } };
}
