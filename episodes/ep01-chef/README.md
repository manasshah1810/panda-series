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

## v3 polish
- Secondary motion: toque and apron bow lag and whip through the turn, fall and pop-up (sequential tweens, scrub-safe).
- Weight: crouch before the tumble, heavier landing squash.
- Contact shadow blob under Panda (widens when he tips, fades when lifted).
- Dust motes are pushed away by Panda at the stumble, thud and pop-up (shader uniform, pure function of time).
- Bamboo title has a dark outline; end frame re-framed; back counters darkened (separation passes at 4 of 6 sample times).
- Open: draw calls ~141 incl. shadows (target 120); knife handle covers the "i" of "if" in the end frame; real-GPU fps unmeasured.

## Beat 1 — The Hero Tease
`timeline/heroTeaseBeat.js` (`createHeroTeaseTimeline`) whips (0.4 s) from the Panda to the vegetarian Bamboo-Shoot Ramen from `props/ramen-bowl/ramenBowl.js`, orbits (1.2 s, spotlight up, background dims 35%) and dives into the steam (0.6 s, wash to #F5F0E8). Camera marks M7–M11 live in `kitchen/src/cameraMarks.js` and are retargeted at runtime onto the mounted bowl. Checks: `node scripts/hero-checks.mjs`; stills: `node scripts/hero-shots.mjs` (output in `review/hero/`).

## Beat 3 — The ASMR Scroll-Chop
Master order: **Beat 1 (opening, 10.8 s) -> Beat 1b (hero bowl, 2.45 s) -> Beat 2 (mise en place, 15 s) -> Beat 3 (ASMR chop, 10.6 s)**, one paused GSAP master timeline (`demo/opening.js`; chop starts at `window.__op.CHOP_START` = 28.25 s, total 38.85 s).
- `props/ingredients/sliceableBamboo.js` (`createSliceableBamboo`): nine tapered, chamfered discs (ivory `#E8D8B0` cut faces with pale growth rings, toasted tan `#BFA06E` rim sheath), one vertex-coloured mesh each (9 draw calls, ~5.2k triangles). **Each slice is a Group whose origin is its bottom-front edge**, so `rotation.x = +PI/2` tips it forward onto the board. `setSliceTip(i, u)` is a pure function of u: tip = `PI/2 * bounceOut(u)` (flat at u = 0.364, never past flat), the pivot never moves sideways or forwards (it only rises onto the pile), each slice fans about its own edge like a deck of cards and lands on top of the previous ones so nothing intersects. Mounted under the cutting-board frame (`rawIngredients.group`), lying along board +x exactly where the solid cone lay (tip towards the lens). **Only the cone (`bamboo_shoot`) is hidden during the chop; the other 11 mise-en-place ingredients stay on the board.**
- `kitchen/src/cameraMarks.js` (re-exported from `kitchen/cameraMarks.js`, the path in the brief): `M14_macro_chop_side` exactly as specified (`[0.6,1.08,1.2] -> [0,1.05,1.1]`, fov 28, board-relative like M12/M13). `M14_FRAMING_NUDGE` (0, +0.04, +0.03) shifts position and target together to centre the log + fan; `M15_panda_wink_closeup` is the finale mark (Panda-relative).
- `timeline/asmrChopBeat.js` (`createAsmrChopTimeline`): the timeline only tweens plain progress scalars; `apply()` is the single writer and a pure function of them.
  - **Whip-down & focus** 0 - 1.25 s: camera leaves the exact M13 end pose (position + quaternion slerp, so no top-down gimbal; fov punch + roll like the hero whip), the floating paws retreat, the Panda and knife pop in mid-whip, the cone and the other ingredients are cleared. "Depth of field" = kitchen lights -30 %, warm exponential haze (scene fog created at density 0 so nothing recompiles), DOM vignette (composited into the PNG frames too).
  - **Scroll-chop** 9 strikes, every 0.62 s from 1.3 s (strike 0.09 s `power3.in`, rest, 0.34 s raise that moves to the next kerf). On each strike frame: (1) one slice tips 90 degrees forward, (2) camera y bump of **-0.01** returning to exactly 0 (0.22 s), (3) a burst of **4** golden flecks (one InstancedMesh, per-instance alpha) arcs out and fades; scale / opacity / parabola of the burst progress, no physics.
  - **Flourish & wink** 6.6 - 10.6 s: the camera recovers from M14 to the medium framing M15 in a smooth 0.6 s `power2.inOut` move, the knife (a child of `handSocketR` for the whole beat; its origin never leaves the socket) blends to a raised blade-up grip beside his head and spins in the paw about its local Z (slow, ease `sine.inOut`, 1 turn + 15 degrees), the face goes `determined -> smug -> winkRight` and holds the wink. (panda-kit has `winkLeft` / `winkRight` presets, no preset called `wink`.)
  - The Panda stands behind the far (-x) end of the board FACING THE LENS; the log lies along board +x and his blade lies across it, pointing to his right. His right arm is solved by numeric IK **at build time** into joint-angle tables (9 kerf anchors x 13 knife heights + the flourish grip; the build also picks the best chest twist / lean pair, worst error ~1.4 mm). Runtime is a pure table lookup; the knife edge is pinned to the contact path, so the edge meets the board within 1.5 mm at every strike.
  - Stitching hooks: `opening.releaseKnifeAfter(t)` hands the knife transform to this beat; `miseEnPlaceBeat.js` additionally exposes `hoverPrep`, `dir`, `tagMeshes`. The Panda is re-parented under a `pandaStage` group (identity outside the beat), and every joint this beat writes is restored to its end-of-opening value outside the beat, so scrubbing back into the opening or the hero is unaffected.
- Verify: `node episodes/ep01-chef/scripts/chop-checks.mjs` -> `review/chop/chop-checks.json` (boot, stitch, rigging, strikes, flourish, follow-ups (11 ingredients stay visible, knife parented to the paw, slices tip in place, 0.6 s camera recovery), scrub, budget, no external assets). Stills: `scripts/chop-shot.mjs`, `scripts/chop-setup-shot.mjs`, free camera `scripts/chop-debug.mjs`. Video: `node episodes/ep01-chef/scripts/video.mjs` -> `review/video/ep01-full-up-to-chop.mp4`.

## Beat 4: the broth build (whip to the stove, top-down ingredient drops, steam wipe)
`timeline/brothBuildBeat.js` (`createBrothBuildTimeline`, 8.3 s) is stitched on right after the chop's flourish + wink (`BROTH_START = CHOP_START + CHOP_TIMES.duration`). `props/stove/stockpot.js` (`createStockpot`) is the pot: lathe enamel body, looped steel handles, a rolling-boil broth shader (vertex displacement, bubbles, chilli-oil slicks) and a pooled `InstancedMesh` of amber splash droplets. The pot sits on the `potPlacementPoint` burner (the kitchen is built with `wok: false` so the cast-iron wok leaves that burner free).
- Marks `M15_stove_approach`, `M16_topdown_pot`, `M17_steam_wipe` (kitchen/src/cameraMarks.js) are authored around a broth centre of (-1, 1.1, 0.4) and shifted onto the real broth. The top-down marks use world -z as screen-up.
- Ten drops (3 shiitake, 3 fanned bamboo, 2 garlic, 2 scallions, all clones of the chopped ingredients) fly in on parabolas: x/z linear, y = rise (`power1.out`) then fall (`power2.in`) as two separate scalars. Each hit sinks the piece and calls `triggerSplash`; the chilli oil is an 8-blob stream with three splashes. Then the steam cluster scales up, the camera dives M16 to M17 and the overlay tweens to #F5F0E8.
- Scrub-safe: only plain scalars are tweened; `apply()` is a pure function of them. `scripts/broth-checks.mjs` digests the camera, pieces, droplets, uniforms and overlay at 40 probe times and compares forward, backward and shuffled order (identical), and checks that scrubbing back into the chop restores the Panda, knife, board and overlay.
