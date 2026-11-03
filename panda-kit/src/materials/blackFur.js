import { makeFurMaterial } from './furMaterial.js';
import { PALETTE as C } from '../config/defaults.js';
/** Soft black fur: never pure black; lifted floor keeps the form readable in shadow. */
export const blackFur = (color = C.furBlack) => makeFurMaterial(color, { rim: 0.55, rimColor: C.blackSheen, floor: C.furBlackLifted, noise: 0.10, tintVar: 0.2 });
