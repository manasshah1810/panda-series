import { makeFurMaterial } from './furMaterial.js';
import { PALETTE as C } from '../config/defaults.js';
/** Soft black fur: never pure black; lifted floor keeps the form readable in shadow. */
export const blackFur = (color = C.furBlack) => makeFurMaterial(color, { rim: 0.4, floor: C.furBlackLifted });
