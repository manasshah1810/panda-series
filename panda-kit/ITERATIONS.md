# ITERATIONS

## Iteration 1: Greybox, Silhouette and Proportions
Screenshots: `review/iteration-1/` (front, back, left, right, tq_*, top, low, high, sil_front, sil_left, sil_back, scale_150px, rigtest)
What I built: whole kit scaffold (package.json, config, geometry modules, rig, sockets, grey material, demo with turntable/OrbitControls/lil-gui/silhouette mode/pivot debug/Screenshot All Angles), headless screenshot script, minimal verify.mjs.
Rubric scores BEFORE fixes: silhouette 6, proportions 6, rig_and_deformation 6, consistency 8, performance 5
Flaws I found:
- Arms were a chain of beads: joint balls (r 0.17) bumpier than the 0.15 limb, wavy silhouette.
- Shoulders at x=0.60 made the upper body a rectangle, not a pear.
- Tail floated ~0.1 behind the torso (side view).
- Side-view ear looked like a spike (z-radius 0.09 too thin).
- Triangle count 39k/21k/11k vs budgets 25k/14k/7k.
Fixes applied: capsule tubes with end-caps on the joints, shoulders to 0.53, narrower upper profile, tail to z=-0.50, ear thickness 0.115, tier segments retuned (16.4k/10.3k/6.8k tris), softer rest pose (arm out 0.2, elbow 0.3).
Rubric scores AFTER fixes: silhouette 8, proportions 8, rig_and_deformation 8 (arm-up/head-turn/leg-bend test clean), consistency 8, performance 8 (tris pass; meshes 39 > low budget 24, merge in iteration 5)
Decisions: L = +X. Torso lean uses spine (torso mesh is a single lathe, not skinned). Muzzle is a big ball in side view; revisit with face in iteration 2.
Open issues: draw calls over low-tier budget; low tier only 164 tris of headroom before face parts.

## Iteration 2: Anatomy and Face
Screenshots: `review/iteration-2/` (turnaround, detail set, `expression_sheet.png` (all 20 presets already wired), expr_*.png, scale_150px, face_front, face_tq)
What I built: eye patches projected onto the head ellipsoid (hug + 25° tilt), eyes (iris ring, pupil, two fixed specular dots), hemispherical eyelids, brows (height/tilt/innerRaise), muzzle, tapered nose, mouth as a morphing tube (curve/width/open/offsetX/pucker) with a dense-grid inner mouth + tongue, blush discs, cheek puffs, ear inner dishes, paw pads, sole pads, face controller (`state` tweened by GSAP, additive blink/look/talk channels), auto-blink and micro-saccades, `startTalk`, `expressions.js` with all 20 presets (iteration 4 will tune them).
Rubric BEFORE fixes: face_readability 6, appeal 7, consistency 8, rig_and_deformation 7
Flaws found:
- Closed/lidded eyes did not read: a black lid dome bulged on the black patch and the highlight spheres poked through it (laugh, wink, taste all looked "eyes open but dull").
- Half-lid values (0.6 to 0.8) covered the whole eye, so annoyed/sleepy looked blind.
- Open mouth: ShapeGeometry fill had too few vertices, the muzzle poked through as red scribbles/grey notch.
- Eyes a little small (r 0.052) at 150px; mouth line too thin at small size.
- Ear inner dish was buried inside the ear (front 0.09 < ear front 0.115).
- Detail cameras for paw/ear/tail were mis-aimed (belly blocked the paw).
Fixes applied: lid flattens (scale z) and the eyeball + highlights hide once lid > 0.88, lighter charcoal closed-eye line on the lid, non-linear lid-angle remap so 0.6 to 0.8 reads as half-lidded, parametric grid inner mouth/tongue, eye radius 0.062, mouth tube 0.0115, ear dish moved forward, paw views use a display pose.
Rubric AFTER fixes: face_readability 8, appeal 8, consistency 8, rig_and_deformation 8
Decisions: highlights are fixed to the head (not the rotating eyeball) so they stay stable like real specular. Closed-eye line is a separate tube because a closed black lid on a black patch is invisible. Blush uses one shared material, so L/R blush are always equal.
Open issues: paw has no finger-ridge bumps (only pad + thumb); belly seam and chin/head seam are hard edges (shader work, iteration 3); mesh count 64 vs low budget 24 (iteration 5 merge); no band on shoulders yet.

## Iteration 3: Colour, Materials and Lighting
Screenshots: `review/iteration-3/` (turnaround, lighting set `light_*.png`, detail set, scale), toon comparison in `review/iteration-3t/`
What I built: fur material patch (fresnel rim, warm shadow tint, lifted-black floor), vertex-AO bake, shader shoulder band, belly normal blending, fuzz shells (head), toon style with gradient map + inverted-hull outline, four lighting presets (studio, kitchen, night, rim) with a procedural gradient environment, soft shadows.
Rubric BEFORE fixes: color_and_material 6, lighting_response 6, appeal 8, face_readability 8
Flaws found:
- Fuzz shells on the torso turned the black band into grey pixel static; shell cell size was visibly blocky.
- Belly read as a glass bubble: fresnel rim on the belly ellipsoid outlined it inside the torso; seam shading edge.
- Band edge ±0.035 smoothstep looked muddy/dirty instead of a soft clean organic edge.
- Black fur looked foggy/milky (too much rim + floor lift).
- `rim` lighting preset: face almost unlit, rim not elegant (peach cast on the white).
- Night preset: fuzz glittered.
- Shell shader failed to compile (`#include` on the same line as code); same bug in the outline shader.
Fixes applied: fuzz on head only with lower opacity/density, belly rim 0.1, band edge ±0.012, black rim 0.4 and floor x0.7, belly protrusion reduced to 0.036 + normal blend + cream gradient fading to white at the seam, rim preset rebalanced (key 1.7, fill 0.7, rim 4.2), include lines fixed.
Rubric AFTER fixes: color_and_material 8, lighting_response 8, appeal 8, face_readability 8
Honest comparison: softClay is warmer and more tactile and is the default. Toon is clearly more readable at 150 px and in the night/rim lights, and the outline hides all seams. If the Panda is small on screen, switch to toon.
Decisions: AO baked into vertex colours (cheap, deterministic, works in every tier) instead of a screen-space pass. Material count held to 12 by sharing: lid/brow/patch share black fur; pads/ear-inner/closed-eye line share charcoal; mouth line shares the nose material.
Open issues: a faint belly/torso crease low on the belly (feet close-up); black feet still slightly grey-plastic; triangle/mesh budgets now exceeded (high 31k tris, 76 meshes), to fix with merging in iteration 5; toon adds one outline mesh per body part (13 materials).

## Iteration 4: Rig, Poses, Expressions and Animation
Screenshots: `review/iteration-4/` (`pose_sheet.png`, `_fix.png` (re-done poses), `mid_frames.png`, `mid_turnAround.png`, expression sheet from iteration 2 is unchanged)
What I built: scrub-safe timeline builder (`animations/_util.js`: every pivot + face is `set` to rest at t=0, each built timeline is pre-rendered 1 -> 0), 16 animations (idle, breathe, blink, weightShift, headLook, wave, nod, shake, shrug, laugh, turnAround, point, lean, surprise, tasteTest, walkInPlace), 13 poses (plain data) + `pose()`, 7 grip presets (thumb curl + paw squash), volume-preserving root squash, belly jiggle / ear flop / tail wag / cheek wobble as elastic from-to tweens, ear-flop and thumb pivots added to the rig, demo animation scrubber + pose picker, `verify.mjs` (NaN, symmetry, scrub, sockets, dispose, budgets).
Rubric BEFORE fixes: animation_quality 5, rig_and_deformation 7, consistency 7
Flaws found (by verify.mjs and by eye):
- 5 of 16 animations were NOT scrub-safe: (a) grip tweens were all added at t=0 regardless of the intended time; (b) `expr()` tweened lookX/lookY and overlapped separate gaze tweens; (c) laugh belly jiggles and taste cheek puff overlapped the same property (order-dependent when scrubbing backwards); (d) the first built timeline's start values came from whatever pose was current.
- `armsCrossed` read as a boxer flex (swing applied on the elbow instead of shoulder yaw); `handsOnHips` did not reach the hips (needs elbow z-bend); `thinkingChin` paw nowhere near the chin.
- `turnAround` ended facing the start direction in the demo: `root.rotation` was not in the reset set so the init pass left it rotated.
- Rest face had asymmetric brows (breaks "perfect symmetry at rest").
Fixes applied: gripPose(..., at), `expr()` excludes gaze, jiggles sized to never overlap, 1->0 pre-render on every built timeline, explicit root yaw `set`, poses re-authored, brows symmetric in calmSmirk (only the mouth smirks).
Rubric AFTER fixes: animation_quality 8 (judged from mid-frames + scrub tests; I cannot judge real-time feel from stills), rig_and_deformation 8 (13 poses: no gaps/pinching visible; arms crossed shows mild interpenetration, acceptable), consistency 8
Decisions: building a timeline snaps the Panda to rest (documented). `turnAround` reads the root yaw at build time as its base (pass nothing, or build it when the root is at its intended heading). Animations reset to rest at t=0: to chain, place them sequentially in a master timeline.
Open issues: draw calls / tris / material budgets (iteration 5); no cloth/outfit secondary motion yet; walkInPlace is only checked by scrub tests, not visually.

---
# v1.1 refinement (iterations 6–9)
Baseline (v1.0, saved in `review/baseline-v1.0/`) honest scores: appeal 7.5, face 7.5, proportions 7, silhouette 6, colour/material 6, lighting 6.5, rig/deformation 6, consistency 6, chef 4, glasses 7, turtleneck 4 (≈6.5 overall, matching the outside review).

## Iteration 6 — Form: limbs, neck, silhouette, belly, pose
Screenshots: `review/iteration-6/` (sheet_turn.png, sheet_sil.png, sheet_poses.png, scale_150px.png; before/after `ab1.png`).
**Changes (numbers in config/defaults.js):**
- W1: arms are now `taperedTube`s with round caps on the joints (upper 0.19→0.165, forearm 0.165→0.135 wrist) plus a shoulder mass ellipsoid [0.215,0.2,0.2]; paw r 0.185. Shoulder x 0.53→0.56. Rest arm-out 0.34→0.50 rad, elbow bend 0.38→0.24 rad. Legs taper hip 0.235 → ankle 0.165 with an ankle puff.
- W3: new `geometry/neck.js` — white jowl/neck ellipsoid [0.42,0.25,0.37] under the head (own mesh on the `neck` pivot, AO-baked).
- W7: separate belly mesh REMOVED. Belly is now a smooth z-displacement of the lathe torso (bump 0.06, σ 0.2). The torso mesh hangs under the `belly` pivot (moved to the torso axis, y 0.72) so breathing/jiggle still scale it. Torso profile slimmed slightly (waist 0.62→0.59, chest 0.54→0.51) to open the arm gap. Belly cream tint is now ≈1–2 % warmer (#F6F2EA).
- W6: ears 0.17→0.185 radius.
- W10: `relaxedIdle` rewritten (hip tilt 2.3°, counter-tilted chest 2°, head tilt 3°, asymmetric arms/elbows, paw rotated, tail offset, weight on the right leg); the demo and every review shot now use it (`createPanda({pose})`, default still `neutralStand`, which outfit fitting uses).
- Shadow acne (stripes on the tapered arms) fixed with larger shadow normalBias in `demo/lighting.js`.
- verify.mjs now prints/asserts head fraction, arm fraction, arm-to-torso gap (raycast at waist heights) and tris.
**Measured:** head height 0.460 of body height (0.42–0.46 ✓); arm shoulder→paw tip 0.724 m = 0.362 of height (0.34–0.38 ✓); arm-to-torso gap y0.8: 0.043/0.044, y0.7: 0.067/0.060 (≥0.04 ✓); tris high 24 900, medium 13 912, low 6 766; draw calls unchanged (34/33/24). Note: ear tips reach 2.2 m, body (head top) 2.0 m.
**Honest critique:** much better; arms read as arms with shoulders and air. Still: the shoulder sphere reads slightly like a pauldron, a 29° arm splay is the price of the 0.04 gap with a pear torso, `armsCrossed`/`handsOnHips` poses were tuned for the old arms and read only roughly, and the front view is still a "teddy". Silhouette ≈7.5, proportions ≈7.5, rig ≈7.5.

## Iteration 7 — Surface: fur, colour, face parts, lighting
Screenshots: `review/iteration-7/` (sheet_turn.png, sheet_light.png, sheet_expr.png (20 presets), tiers.png (high/medium/low), scale.png).
**Changes**
- W2: fur-direction streak noise + low-frequency tint drift in the fur shader (white ±2.5 %, black ±5 % with tint drift, no textures). Whites unified: every white part uses the same `#F7F4EE`; belly tint now only ~1–2 % warmer; shadow tint lifted to `#EAE5DC` and baked-AO tint made less saturated (no tan patches). Blacks `#1C1C21`, lifted floor `#2A2A31`, faint cool rim sheen `#8B93BC`. Fuzz halo: shared-material shells on head + torso (white, 6 shells high / 2 medium) and arms (black, 4 shells, high only), length 0.012, using LOW-RES proxy meshes. Cheek tufts: 2 soft wedges per side merged into the head shell (small on the low tier).
- W4: brows are tapered ribbons that follow the forehead curvature (z drops toward the ends so they can't float); mouth tube 0.0115→0.0135 with brush-stroke tapered ends, darker inner mouth `#7A3340` with a darker back and a smaller tongue; ears are ONE smooth ellipsoid with a displaced inner dish (no stacked disc); open lid is hidden at lid<0.03 so no lid rim ring shows around wide eyes; blush is a soft procedural falloff instead of a hard disc; cheek-puff amplitude reduced.
- W5: eye patches are painted in the head shader as a teardrop (≈32° slant, 0.165×0.225, 5 % edge softness, slight organic wobble), masked off the muzzle. This removed 936 tris and 1 draw call and gives a fur-like soft edge.
- W8: small round parts keep ≥ 7–8 segments on all tiers (paws, feet, ears 12×20); low-tier head ellipsoid raised to 14×24.
- W9: demo lighting only: dramatic rim (two warm back lights + fur-fresnel rim boost), night preset de-saturated (whites no longer lavender), kitchen whites less yellow, procedural soft contact shadow under the feet, one large floor disc with fog (no seams / horizon band), floor is Lambert (grazing specular was making it tan), softer shadows (radius 9). Note: three r187 removed `PCFSoftShadowMap`, so PCF + radius/blurSamples is used.
**Numbers:** tris high 23 404 / medium 13 920 / low 6 894; draw calls 38 / 34 / 23; materials 11 / 10 / 7.
**Softclay vs toon:** softClay stays the default — the fuzz halo, painted patches and rim read as "soft animal"; toon (gradient + outline) is graphic and consistent but the outline fights the fuzzy silhouette. (Toon is still supported; it also gets the painted patch.)
**Honest critique:** big step up in the face (soft patches, chunky brows/mouth, no blush discs) and the whites are now one consistent warm white. Still weak: the fuzz halo is subtle (visible mostly at close range on the head edge); the black band has a slightly grainy look in extreme close-ups; the cheek tufts read as small white wedges, not full fur tufts; the rim preset gives a glint rather than a bold rim line; shoulder spheres still read a little like pauldrons; lower-lip shading under the mouth was NOT done (the mouth material is unlit vertex colour). Scores: colour/material ≈7.5, lighting ≈7.5, consistency ≈7.5, face readability ≈8.

## Iteration 8 — Outfits and acting range
Screenshots: `review/iteration-8-chef/sheet.png` (front, 3/4, back, close-up), `review/iteration-8-gt/` (glasses + turtleneck), `review/iteration-8-chefposes/sheet.png` (8 poses with the chef outfit), `review/iteration-8-expr/expression_sheet_512.png` (20 presets, 512 px cells).
**Kit additions (role-neutral):** `torsoSurfaceZ(x,y)` in `outfits/fit.js` (torso surface incl. belly bump) so any outfit can follow the body; `PART_NAMES` updated (`neck` added, `bellyMesh`/`eyePatches` gone because those meshes no longer exist).
**W11 chef (episodes/ep01-chef/outfit/chefOutfit.js v1.1):** apron is a grid that follows the torso surface (offset 0.011 + polygonOffset → no z-fight), bib narrowing to the top, curved hem, neck straps; a real extruded pocket with bevel and stitch dashes; a neckerchief ribbon on the chest with a small triangular knot; a flat waist tie all the way round with a bow at the back; a pleated toque (lathe, 12 sine pleats, snug navy band, tilted 4°, seated between the ears). Apron recoloured pale blue-grey because a white apron vanished against the white belly.
**W12:** turtleneck is a full shell following the torso (hides the band) plus a rolled collar; glasses lenses opacity 0.12, thinner rims, temples shortened. Sleeves are NOT built: the 14-socket contract has no arm socket (limitation, see handoff).
**W13:** brows/lids/mouths re-tuned for deadpan, proud, sniff. New `scripts/expr-diff.mjs` (`npm run expr-diff`) renders-and-compares every pair of the 20 presets (face region, 96 px, mean abs RGB difference). Lowest pair now 3.5 (threshold 2.0; it was 1.65 for calmSmirk/deadpan before the retune).
**Pose clipping:** chef outfit equipped in the 8 stress poses (relaxedIdle, armsCrossed, handsOnHips, pointForward, hold-two-handed, leanOnCounter, thinkingChin, waveHello): paws and forearms stay in front of or beside the apron; no visible clipping at review scale. `unequip()` residue check: verify.mjs passes for both episode outfits (0 differences).
**Search proof:** `grep -rniE "chef|apron|toque" panda-kit/src demo scripts package.json` returns 0 hits (the spec-mandated `kitchen` lighting preset name, demo-only, is the only role word left).
**Honest critique:** the chef reads clearly now; the apron is a flat-shaded sheet with no folds, the bow is simple, the waist tie shows slight waviness at the sides, the neckerchief band is partly hidden under the chin from the front. Chef ≈7.5. Turtleneck ≈7 (no sleeves, collar mostly hidden). Glasses ≈8.
