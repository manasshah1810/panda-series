/**
 * OUTFIT CONTRACT (stable public API)
 *
 *   export default {
 *     id: 'myOutfit',                   // unique string
 *     version: '1.0.0',                 // string or number
 *     anchors: ['headTop', 'torsoWrap'],// sockets this outfit attaches to (must be real socket names)
 *     hides: ['tailMesh'],              // OPTIONAL: Panda part names to hide while equipped (restored on unequip)
 *     build(panda) { ... return group; },// returns THREE.Group; each CHILD that has userData.socket = '<socketName>' is parented to
 *                                       // that socket (keep its local transform relative to the socket). Children without
 *                                       // userData.socket go under panda.root.
 *     animate(panda) { ... return tl; } // OPTIONAL: GSAP timeline for cloth-like secondary motion (paused, scrub-safe)
 *   }
 *
 * Fit rule: NEVER hard-code absolute numbers. Read panda.measure() (head / torso / belly / arm ellipsoids) and `fitRing()`.
 * Socket axes: Y up, Z forward (see README socket table).
 */
export const SOCKET_NAMES = ['handSocketL', 'handSocketR', 'headTop', 'eyeBridge', 'neckBase', 'chestFront', 'torsoWrap', 'backCenter', 'earSocketL', 'earSocketR', 'footSocketL', 'footSocketR', 'mouthSocket', 'noseSocket'];
/** Hideable part names (matched against each mesh's userData.pandaPart, prefix match). */
export const PART_NAMES = ['torso', 'neck', 'head', 'tailMesh', 'earL', 'earR', 'upperArmL', 'upperArmR', 'foreArmL', 'foreArmR', 'pawL', 'pawR', 'legL', 'legR', 'footL', 'footR', 'nose', 'brow'];

/** Throws a clear Error describing every problem. Returns the outfit when valid. */
export function validateOutfit(outfit) {
  const errs = [];
  if (!outfit || typeof outfit !== 'object') throw new Error('Outfit must be an object');
  if (typeof outfit.id !== 'string' || !outfit.id) errs.push('missing string `id`');
  if (outfit.version === undefined || !['string', 'number'].includes(typeof outfit.version)) errs.push('missing `version` (string or number)');
  if (typeof outfit.build !== 'function') errs.push('missing function `build(panda)`');
  if (!Array.isArray(outfit.anchors)) errs.push('`anchors` must be an array of socket names');
  else for (const a of outfit.anchors) if (!SOCKET_NAMES.includes(a)) errs.push(`unknown socket "${a}" in anchors (valid: ${SOCKET_NAMES.join(', ')})`);
  if (outfit.hides !== undefined) {
    if (!Array.isArray(outfit.hides)) errs.push('`hides` must be an array of part names');
    else for (const h of outfit.hides) if (!PART_NAMES.includes(h)) errs.push(`unknown part "${h}" in hides (valid: ${PART_NAMES.join(', ')})`);
  }
  if (outfit.animate !== undefined && typeof outfit.animate !== 'function') errs.push('`animate` must be a function(panda) => timeline');
  if (errs.length) throw new Error(`Invalid outfit "${outfit?.id ?? '?'}":\n - ` + errs.join('\n - '));
  return outfit;
}

/** After build(): every tagged child must reference an anchor the outfit declared. */
export function validateBuilt(outfit, group) {
  const errs = [];
  if (!group || !group.isObject3D) throw new Error(`Outfit "${outfit.id}": build() must return a THREE.Group`);
  for (const c of group.children) { const s = c.userData.socket; if (s && !outfit.anchors.includes(s)) errs.push(`child "${c.name || c.type}" targets socket "${s}" which is not in anchors`); }
  if (errs.length) throw new Error(`Outfit "${outfit.id}":\n - ` + errs.join('\n - '));
}
