# Episode 1: What If Panda Was... a Chef

This folder is where everything **role-specific** lives. `panda-kit/` knows nothing about chefs.

| Belongs HERE (episode) | Belongs in panda-kit |
|---|---|
| chef hat, apron, neckerchief, knife, pans, bamboo-shoot ramen | the Panda, rig, sockets, faces, animations, poses |
| the kitchen set, lighting, camera path, GSAP scroll timeline | outfit + prop contracts, `equip()` / `attachProp()` |

## What exists so far
- `outfit/chefOutfit.js`: **proof** that the outfit contract works with a non-trivial outfit (toque, apron with waist tie and pocket, neckerchief). Uses only the public kit API.
- `outfit/glassesTurtleneck.js`: **proof** of reuse from `_template.js` (round glasses + turtleneck shell). Not chef-specific; move it to a shared folder once a second episode needs it.

## What to build next (not done)
1. `kitchen/` : set pieces as Object3D groups (counter, stove, pots), plus a lighting rig (the kit ships presets only in its demo).
2. `props/knife.js`, `props/bowl.js`: plain Object3Ds attached with `panda.attachProp(obj, 'handSocketR', { gripPose: 'hold', offset, rotation })`.
3. `timeline.js`: one master GSAP timeline: camera move + `panda.anim.*()` timelines placed with `.add(tl, time)`; drive it with ScrollTrigger `scrub`.

```js
import { createPanda } from '@panda-series/panda-kit';
import chef from './outfit/chefOutfit.js';
const panda = createPanda({ quality: 'high' });
scene.add(panda.root);
panda.equip(chef);
```
