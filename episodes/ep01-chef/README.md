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

## Opening motion (B1-B6, 0-8 s)
One master GSAP timeline, scrub-safe: `timeline/openingTimeline.js` (`createOpening`) applies camera, knife, title and kitchen time as pure functions of master time; the Panda is one reset timeline.
- Files: `props/knife/` (prop + flight/wobble maths), `title/woodenTitle.js` (one merged mesh, shader-driven build, knife = stem of the i in "if", its dot drops onto the handle), `timeline/beats.js`, `review/openingMarks.json`, `demo/index.html + opening.js (player: autoplay, play/pause, scrub bar; adaptive resolution 0.6x-1.5x to hold ~60 fps, shadows refreshed every 2nd frame while playing; ?capture = harness mode)`.
- Run: `node episodes/ep01-chef/scripts/frames.mjs after` (frames), `node episodes/ep01-chef/scripts/checks.mjs` (scrub test, landing, wobble, draw calls, separation -> `review/checks.json`).
- Status: see the final report in the session; the four panda-kit bug fixes are NOT done yet.


## Iteration 9-10 (feedback round)
- Camera and Panda now turn the SAME way (through his right / screen-left); the orbit starts with the turn.
- Opening is 10.8 s (draw onward shifted by `SHIFT` = 2.8 s). Turn is slow and happy (smile / grin, no angry brows; `startTimeline` takes a `restFace` option).
- Clumsy beat: pirouette -> wobble, windmilling arms, scrambling feet -> topples onto his side (camera thud) -> dazed -> pops back up grinning.
- Cutting board no longer wobbles; the stuck knife quivers for ~0.55 s (3.2 deg, damped).
- Title is bamboo: canvas texture with node rings placed by stroke arc length; Panda sidesteps so the title clears him.
