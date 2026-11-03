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
