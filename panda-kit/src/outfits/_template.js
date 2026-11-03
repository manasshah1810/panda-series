// ─────────────────────────────────────────────────────────────────────────────────────────────
//  OUTFIT TEMPLATE: copy this file into your episode folder, rename `id`, edit build().
//  Takes ~5 minutes. Read outfitContract.js for the full contract.
//  Rules: (1) no absolute numbers: fit from panda.measure() / fitRing(); (2) never touch the Panda's meshes; (3) tag every
//  top-level child with userData.socket = '<socketName>'; (4) you own what you create (it is disposed on unequip).
// ─────────────────────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import gsap from 'gsap';
import { fitRing } from '@panda-series/panda-kit/outfits/fit.js';   // or a relative path to panda-kit/src/outfits/fit.js

export default {
  id: 'myOutfit',                       // unique
  version: '1.0.0',
  anchors: ['neckBase'],                // sockets used below
  // hides: ['tailMesh'],               // optional: Panda parts to hide while worn
  build(panda) {
    const m = panda.measure();          // head / torso / belly / arm ellipsoids
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#C8553D', roughness: 0.9 });

    // A collar ring hugging the torso. neckBase sits at world y ≈ 1.18; fitRing gives the torso half-widths there.
    const r = fitRing(m.torso.maxY - 0.22, 0.02);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 12, 40), mat);
    collar.scale.set(r.rx, r.rz, 1); collar.rotation.x = Math.PI / 2;       // lies flat; X/Z half-widths from the fit
    const holder = new THREE.Group(); holder.add(collar);
    holder.userData.socket = 'neckBase';                                      // <- attaches to this socket (Y up, Z forward)
    group.add(holder);
    return group;
  },
  // optional: return a PAUSED, scrub-safe GSAP timeline for cloth-like motion (elastic from-to tweens, no simulation)
  // animate(panda) { return gsap.timeline({ paused: true }); },
};
