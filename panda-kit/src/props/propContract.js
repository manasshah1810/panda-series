/**
 * PROP CONTRACT: any THREE.Object3D can be a prop.
 *   panda.attachProp(object3D, socketName, { offset:[x,y,z], rotation:[x,y,z], scale:number|[x,y,z], gripPose:'hold' })  -> detach()
 * Hand sockets: local Y runs along the grip, +Z points out of the palm. gripPose presets: open, relaxed, fist, pinch, point, flatPalm, hold.
 * Hand-off (prop moves hand -> table -> hand): `reparentKeepWorld(obj, newParent)` keeps the world transform for ONE-SHOT moves;
 * for SCRUBBED timelines use `visibilityHandoff()` (two copies, GSAP `set` on `visible` is reversible, so scrubbing stays correct).
 */
import { SOCKET_NAMES } from '../outfits/outfitContract.js';
import { GRIPS } from '../poses/applyPose.js';
export function validatePropOptions(socketName, o = {}) {
  const errs = [];
  if (!SOCKET_NAMES.includes(socketName)) errs.push(`unknown socket "${socketName}"`);
  if (o.gripPose && !GRIPS[o.gripPose]) errs.push(`unknown gripPose "${o.gripPose}" (valid: ${Object.keys(GRIPS).join(', ')})`);
  if (o.gripPose && !/^handSocket/.test(socketName)) errs.push('gripPose only applies to handSocketL / handSocketR');
  if (errs.length) throw new Error('attachProp: ' + errs.join('; '));
}
