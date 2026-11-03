import { makeFurMaterial } from './furMaterial.js';
import { PALETTE as C, PROPORTIONS as P } from '../config/defaults.js';
/** Warm white fur. `band` enables the black shoulder band (torso/belly only). */
export const whiteFur = (band = null, rim = 0.55, extra = {}) => makeFurMaterial(C.furWhite, { rim, shadowTint: C.furWhiteShadow, band, noise: 0.05, ...extra });
/** Head-shell material: same white + the painted teardrop eye patches. */
export const headPatchSpec = () => ({ x: P.patch.x, y: P.patch.y - P.joints.head[1], A: P.patch.radii[1], W: P.patch.radii[0], theta: P.patch.tilt, soft: 0.05, hc: [P.head.center[0], P.head.center[1] - P.joints.head[1], P.head.center[2]], hr: P.head.radii });
export const headFur = () => whiteFur(null, 0.55, { patch: headPatchSpec() });
export const bandSpec = (offset) => ({ offset, edge: 0.98 });
