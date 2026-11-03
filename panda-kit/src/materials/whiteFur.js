import { makeFurMaterial } from './furMaterial.js';
import { PALETTE as C, PROPORTIONS as P } from '../config/defaults.js';
/** Warm white fur. `band` enables the black shoulder band (torso/belly only). */
export const whiteFur = (band = null, rim = 0.55) => makeFurMaterial(C.furWhite, { rim, shadowTint: C.furWhiteShadow, band });
export const bandSpec = (offset) => ({ offset, edge: 0.98 });
