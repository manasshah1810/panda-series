import * as THREE from 'three';
import { PALETTE as C, PROPORTIONS as P } from '../config/defaults.js';
import { whiteFur, bandSpec } from './whiteFur.js';
import { blackFur } from './blackFur.js';
import { glossyEye, glossyNose } from './glossy.js';
import { makeGradientMap, toonMaterial, makeOutlineMaterial } from './toon.js';

/** Builds the material set for a style. `softClay` = patched MeshStandardMaterial fur. `toon` = MeshToonMaterial + outline. */
export function createMaterials({ style = 'softClay' } = {}) {
  const std = (color, roughness = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
  const flat = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
  const spineY = P.joints.spine[1];
  let torso, belly, head, limb;
  let gradientMap = null;
  if (style === 'toon') {
    gradientMap = makeGradientMap(4);
    const W = (band) => toonMaterial(C.furWhite, gradientMap, { band });
    torso = W(bandSpec([0, spineY, 0])); belly = W(bandSpec([P.belly.center[0], P.belly.center[1], P.belly.center[2]])); head = W(null);
    limb = toonMaterial(C.furBlack, gradientMap);
  } else {
    torso = whiteFur(bandSpec([0, spineY, 0])); belly = whiteFur(bandSpec(P.belly.center), 0.1); head = whiteFur();
    limb = blackFur();
  }
  const mats = {
    torso, belly, head, muzzle: head, tail: head, limb, earOuter: limb,
    patch: limb, lid: limb, brow: limb,                       // patch / lids / brows / ears share one black so blinks read cleanly
    eyeball: glossyEye(), nose: glossyNose(),
    shine: flat('#FFF4E4', { toneMapped: false }),
    mouth: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    blush: flat(C.blush, { transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  };
  const outline = style === 'toon' ? makeOutlineMaterial() : null;
  const all = [...new Set([...Object.values(mats), outline].filter(Boolean))];
  return { mats, all, style, outline, gradientMap, dispose() { all.forEach((m) => m.dispose()); gradientMap?.dispose(); } };
}
