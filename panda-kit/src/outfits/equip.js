import { validateOutfit, validateBuilt } from './outfitContract.js';
import { disposeObject } from '../utils/dispose.js';

/** Equip an outfit. Returns an `unequip()` function. Hidden parts are restored exactly. */
export function equipOutfit(panda, outfit, registry) {
  validateOutfit(outfit);
  if (registry.has(outfit.id)) throw new Error(`Outfit "${outfit.id}" is already equipped`);
  const group = outfit.build(panda); validateBuilt(outfit, group);
  const attached = [];
  for (const child of [...group.children]) {
    const sock = child.userData.socket; const parent = sock ? panda.sockets[sock] : panda.root;
    if (!parent) throw new Error(`Outfit "${outfit.id}": socket "${sock}" does not exist on this Panda`);
    parent.add(child); attached.push(child);
  }
  const hidden = [];
  if (outfit.hides?.length) panda.root.traverse((o) => { const n = o.userData.pandaPart; if (n && !o.userData.outfitOwned && outfit.hides.some((h) => n.startsWith(h)) && o.visible) { o.visible = false; hidden.push(o); } });
  const timeline = outfit.animate ? outfit.animate(panda) : null;
  const rec = { outfit, attached, hidden, timeline, unequip() {
    if (!registry.has(outfit.id)) return;
    timeline?.kill?.(); for (const o of hidden) o.visible = true;
    for (const c of attached) { c.removeFromParent(); if (!outfit.keepResources) disposeObject(c); }
    registry.delete(outfit.id);
  } };
  registry.set(outfit.id, rec);
  return rec.unequip;
}
