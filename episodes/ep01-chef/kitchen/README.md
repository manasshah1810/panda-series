# Episode 1 kitchen set (procedural, Three.js)

A stylised marble-and-wood chef's kitchen that stages the Panda for the Chef opening. No GLB/images/HDRI: everything is generated in code (geometry, canvas textures, RoomEnvironment via PMREM).

## Run
```bash
npm install                  # at the repo root
cd episodes/ep01-chef/kitchen
npm run dev                  # demo: orbit, camera marks, lights-on slider, mood, quality, Panda toggle, wireframe, Screenshot All Marks
npm run verify               # node scripts/verify-kitchen.mjs  (headless Chromium, prints measured numbers)
node scripts/screenshots.mjs <iteration> marks,closeups,lights,moods,shaft,tiers   # -> review/iteration-N/
```

## Quick start
```js
import * as THREE from 'three'; import gsap from 'gsap';
import { createKitchen } from './kitchen/src/index.js';
import { createPanda } from '@panda-series/panda-kit';
import chef from './outfit/chefOutfit.js';

renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const kitchen = createKitchen({ quality: 'high', mood: 'morning', renderer });   // renderer is needed once for reflections
scene.add(kitchen.root);
const panda = createPanda({ quality: 'high' }); panda.equip(chef); scene.add(panda.root);
panda.root.position.copy(kitchen.anchors.pandaMark.position); panda.root.rotation.y = Math.PI;   // back to the camera
const M = kitchen.cameraMarks, set = (m) => { camera.position.set(...m.position); camera.lookAt(...m.lookAt); camera.fov = m.fov; camera.updateProjectionMatrix(); };
const s = { t: 0 }; set(M.M1_establish_back);
gsap.to(camera.position, { x: M.M2_dolly_in_apron.position[0], y: M.M2_dolly_in_apron.position[1], z: M.M2_dolly_in_apron.position[2], duration: 3, onUpdate: () => camera.lookAt(...M.M2_dolly_in_apron.lookAt) });
gsap.to(s, { t: 1, duration: 2, onUpdate: () => kitchen.setLightsOn(s.t) });   // scrub-safe: same t = same image
```
Every frame: `kitchen.setTime(seconds)` (dust, drip, pan/leaf sway). Panda caveat: its fur has a self-lit rim that ignores scene lights; set `kitchen.onLightsChange = (k) => scaleRim(k)` (see `demo/main.js`) so t=0 is dark.

## API (`createKitchen({quality, mood, seed, renderer, stage})`)
`root`, `anchors`, `props {cuttingBoard, tap, hangingPans, plants}`, `cameraMarks`, `setLightsOn(t)`, `setMood('morning'|'warmEvening')`, `setTime(t)`, `setBoardWobble(t, amp)`, `setQuality(tier)` (rebuilds; handles stay valid), `setRenderer(r)`, `stats()`, `update()`, `dispose()`, `colliders`, `placements`, `vignette`, `focusAnchor`, `lightsLevel`, `onLightsChange`. `stage` (1 greybox .. 4 full) exists for review only.

Anchors: pandaMark, boardCenter, knifeStickPoint (+Y normal), islandTopCenter, sinkTap, hoodLight, windowLight, brassRail, shelfLeft, shelfRight, plantVase, ingredientLineStart/End, potPlacementPoint, bowlPlacementPoint.

Camera marks: `M1_establish_back .. M8_fourth_wall` (`position`, `lookAt`, `fov`, `note`); `MARK_PANDA_ROT_Y` gives the Panda facing per mark. Panda faces -Z (rotY pi) for M1-M3, +Z after the turn.

## Quality tiers (measured, kitchen only)
| tier | tris | draws | textures | shadow map |
|---|---|---|---|---|
| high | 52 662 | 32 | 1024 | 2048 |
| medium | 33 638 | 32 | 512 | 1024 |
| low | 17 814 | 32 | 256 | 512 |
(Stage 4 adds the shaft + dust: 2 draws, ~24 tris; see `review/iteration-4/verify.txt` for the final run.)

## Notes / troubleshooting
- File map differs slightly from the brief: `props/pans.js` + `utensils.js` build the hanging items, `props/jars.js` also holds the pots, the cooktop lives in `layout/backCounter.js`, ceiling discs in `layout/room.js`.
- Black Panda at t=0 is intended; faint eye highlights remain (kit-side).
- Use `PCFShadowMap` (r187 removed the soft variant).
- All dimensions are in `src/config/kitchenConfig.js`; see `KITCHEN_BIBLE.md` for the rules.
