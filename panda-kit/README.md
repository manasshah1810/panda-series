# @panda-series/panda-kit v1.1.0

A reusable, fully procedural 3D Panda (Three.js + GSAP). No GLB, no images, no fonts. One call gives you a rigged, expressive character with 20 expressions, 16 scrub-safe animations, 13 poses, an outfit system (14 sockets) and a prop system. The kit contains no role-specific code; outfits live in episode folders (see `../episodes/ep01-chef`).

## Run it
```bash
npm install            # at the repo root (npm workspaces)
cd panda-kit
npm run dev            # demo + GUI (rig sliders, expressions, animations, outfits, quality, lighting presets)
npm run verify         # 34 automated checks (budgets, rig, sockets, scrub-safety, outfits, measurements)
npm run screenshots    # headless review shots, e.g. node scripts/screenshots.mjs 9 "turnaround,lighting"
```
Equip an episode outfit in the demo: `http://localhost:5173/?outfit=/@fs/<abs path>/episodes/ep01-chef/outfit/chefOutfit.js&pose=neutralStand`

## Quick start
```js
import * as THREE from 'three'; import gsap from 'gsap';
import { createPanda } from '@panda-series/panda-kit';
import hat from './myOutfit.js';                       // see "Outfits"
const panda = createPanda({ quality: 'high', style: 'softClay', pose: 'relaxedIdle' });
scene.add(panda.root);                                  // you provide scene, lights, renderer; call panda.update(dt) every frame
const unequip = panda.equip(hat);                       // sockets + exact restore on unequip()
const detach = panda.attachProp(propMesh, 'handSocketL', { gripPose: 'hold' });
const tl = gsap.timeline().add(panda.anim.wave()).add(panda.anim.laugh(), '+=0.3');   // timelines are scrub-safe
panda.face.setExpression('smile', 0.4); panda.talk(true);
```
Conventions: metres, origin between the feet, +Y up, Panda faces +Z, body height 2.0 (ears reach ~2.2). **L = the Panda's anatomical left = +X.**

## API
| Call | Purpose |
|---|---|
| `createPanda({quality,style,scale,pose,castShadow,receiveShadow,fuzz})` | quality `high\|medium\|low`; style `softClay\|toon`; `pose` default `neutralStand` |
| `panda.root / rig / sockets` | the Group, named pivots, 14 sockets |
| `panda.pose(name, duration)` / `poseNames` | tween to one of 13 poses (`relaxedIdle` = review/default look, `neutralStand` = fitting) |
| `panda.anim.<name>(opts)` | returns a paused-safe GSAP timeline (idle, breathe, blink, weightShift, headLook, wave, nod, shake, shrug, laugh, turnAround, point, lean, surprise, tasteTest, walkInPlace) |
| `panda.face.set / setExpression / setExpressionMix / blink / look / startAutoBlink` | 20 presets: `expressionNames` |
| `panda.talk(on)` | procedural mouth flap |
| `panda.equip(outfit)` → `unequip()`; `panda.outfits` | outfit contract in `src/outfits/outfitContract.js` |
| `panda.attachProp(obj, socket, {offset,rotation,gripPose,visibilityHandoff})` → `detach()` | props |
| `panda.setQuality(tier)`, `stats()`, `measure()`, `update(dt)`, `dispose()` | utilities |

## Sockets (L = +X)
```
            headTop            eyeBridge (z+ in front of face)   earSocketL/R
  FRONT:    neckBase  (y≈1.28)   chestFront   torsoWrap (spine, y≈0.75)   backCenter (rotated 180°)
            handSocketL(+X)/R(-X) on the paw, +Y up the forearm, +Z out of the palm
            footSocketL/R   mouthSocket   noseSocket
```
Axes everywhere: Y up, Z out of the surface. Run the demo with "show pivots/sockets" to see them.

## Outfits
Copy `src/outfits/_template.js`. Rules: fit from `panda.measure()`, `fitRing(y,pad)` and `torsoSurfaceZ(x,y)` (torso incl. belly), never absolute numbers; tag each top-level child with `userData.socket`; use a small normal offset (≈0.01) plus `polygonOffset` to avoid z-fighting; `hides: ['tailMesh']` hides parts while worn. `unequip()` restores everything exactly (verified). There is no arm socket, so sleeves are not possible yet.

## Quality tiers (measured, v1.1)
| tier | tris | draw calls | materials | notes |
|---|---|---|---|---|
| high | 23 404 | 38 | 11 | fuzz shells on head, torso, arms; thumbs; toe beans |
| medium | 13 920 | 34 | 10 | 2 fuzz shells head + torso |
| low | 6 894 | 23 | 7 | no thumbs, tail merged into torso, no shadows/fuzz |

`guessTier()` suggests a tier from the device. Frame times from `npm run perf` are software-GL and relative only.

## Scroll-scrub with ScrollTrigger
```js
import { ScrollTrigger } from 'gsap/ScrollTrigger'; gsap.registerPlugin(ScrollTrigger);
const tl = panda.anim.turnAround({ degrees: 180, duration: 2 });
ScrollTrigger.create({ trigger: '#scene', start: 'top top', end: '+=1500', scrub: true, animation: tl });
```
Every animation sets its rest state at t=0 and has no overlapping tweens on one property, so scrubbing forward/back is deterministic (checked by `verify`).

## Troubleshooting
- Black/flat look: you need lights; the kit ships none (see `demo/lighting.js`).
- Whites look tan or lavender: tone mapping ACES + neutral lights; coloured lights tint the white fur directly.
- Outfit z-fights: raise the normal offset to ≥0.01 and keep `polygonOffset`.
- Over budget: `setQuality('medium')`; fuzz is the first thing dropped.
- `PCFSoftShadowMap` was removed from three r187: use `PCFShadowMap` + `light.shadow.radius`.
