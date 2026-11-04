# Kitchen build log (Episode 1)

## Iteration 1: Blockout, scale and camera marks
Screenshots: `review/iteration-1/contact_marks_greybox.png` (all 8 marks, greybox), `layout_topdown.png`, `turn_sequence.png` (0/60/120/180 deg), `mark_M1..M8.png`, `verify.json`.
What I built: config + helpers, room/floor/ceiling/window, back counter (carcass, 12 doors, marble top with sink cut-out, basin, cooktop), hood, backsplash slabs, island (open 3-bay shelf + grooved panel), shelves, brass rail, tall unit, cutting board with wobble hook, 15 anchors, 8 camera marks, demo page, headless screenshot + verify scripts. Everything is one neutral grey material (`stage: 1`).
Rubric scores BEFORE fixes: composition 6, scale_and_fit 4, panda_separation n/a (greybox), others n/a.
Flaws I found:
- **Scale conflict (big):** the brief says the Panda is ~1.3 wide, but measured with the chef outfit the arms-down pose is **1.99 wide** (bbox x -1.0..1.0, depth 1.38). With the island at x = 0.9 (top edge 0.86) the 180 deg turn penetrated the island by 4.5 cm.
- Top-down render was blocked by the ceiling slab (review tooling, fixed with a clipping plane).
- Greybox is very washed out, so separation cannot be judged yet (expected; iteration 2).
Fixes applied: island moved to x 1.2..4.5 (top edge 1.16), board centre moved to (1.7, 1.0, 1.1), clean zone to x 2.4..4.4, anchors and marks M5/M6 retargeted. Turn clearance is now 0.103 m (closest: back counter at 80 deg); reach test dy 0.22 (limit 0.25).
Rubric scores AFTER fixes: composition 7, scale_and_fit 8.
Decisions: kept the brief's 0.8 deep back counter and 1.8 aisle (the Panda needs 1.38 in z); kept island 3.3 long (still fits 2.0 x 1.0 clean zone).
Open issues carried forward: M3 is mostly ceiling/hood with the Panda cropped (intended tilt-up, re-judge with materials); M6 shows only a grey board until materials exist.

## Iteration 2: Materials and environment
Screenshots: `review/iteration-2/contact_marks.png`, `closeups.png`, `grazing.png`, `textures.png`, `mark_M*.png`.
What I built: canvas procedural marble (warped sine-ridge veins, 2 textures, per-slab offset/rotation/mirror), honey wood (grain direction via box-projected UVs), end-grain board, brushed steel roughness map, brass/copper, ceramic, terrazzo floor, plaster; RoomEnvironment/PMREM assigned per material.
Rubric BEFORE fixes: material_quality 5, panda_separation 3, lighting 4, stylization 6.
Flaws found: first marble looked like swirling fluid art, far too busy; whole set overexposed (white floor and walls); backsplash luminance 0.77-0.85 vs fur 0.66 (rule needs <= 0.75x fur).
Fixes: re-wrote marble as warped sine ridges; cut window/hemi/fill intensities and env reflection on floor/backsplash; backsplash tint to #8E8982; fill light added so fur reads (~0.73).
Rubric AFTER: material_quality 8, panda_separation 9 (ratio 0.55-0.74), lighting 6, stylization 8.
Decisions: backsplash is a mid grey-taupe, not white marble. It is the only way to pass the 25% rule; an art director may want a lighter wall plus a darker Panda grade instead.
Open: wood looks slightly flat/orange; no normal maps.

## Iteration 3: Props and set dressing
Screenshots: `review/iteration-3/contact_marks.png`, `verify.txt`.
What I built: instanced hanging pans/ladles/spatulas/whisks with deterministic sway, instanced plates and bowls (island bays + shelves), jars, 2 pots, leafy + trailing plants, dark vase with dried branch, tap with deterministic drip/ripple.
Rubric BEFORE: composition 7, prop_quality 7, performance 4 (high 61k / medium 43k / low 32k tris, over budget).
Fixes: lowered radial segments per tier, low tier uses flat boxes, 6-sided lathes, ~70% dish counts, fewer leaves.
Rubric AFTER: performance 8 (52.7k / 33.6k / 17.8k tris; 32 draws), prop_quality 8.
Open: low tier loses bevels and looks blocky up close; the rail centre is deliberately bare behind the head, which makes M1 a little symmetrical and empty; repetition of pans is visible (only 3 sizes).

## Iteration 4: Lighting, atmosphere and integration
Screenshots: `review/iteration-4/lights_sequence.png` (t 0/.25/.4/.6/1 + warmEvening), `shaft_dust.png`, `verify.txt`.
What I built: window key (shadow caster), hemi, fill, rim, hood spot, under-shelf points, additive light-shaft prism, 400/260/150 dust points, `setLightsOn` curve, moods, `onLightsChange` hook, README, bible.
Flaws found: shelf point lights made hot spots; Panda fur self-lit rim kept him visible at t=0; dispose() missed the two shader materials.
Fixes: lights moved off the wall and dimmed; demo scales the kit's `uRim` with the lights level; shader materials now disposed.
Verification: see `review/iteration-4/verify.txt` (separation M1 0.58, M2 0.63, M4 0.74, M8 0.62; scrub diff 0; turn clearance 0.10 m; reach dy 0.22).
Known limitations / what a picky art director would reject:
- Backsplash reads as grey stone, not white marble; M4 separation is only just inside the rule (0.74).
- Panda faint eye highlights and fur rim remain at t=0 (kit-side).
- No sun patch is visible on the floor; window light mostly reads as fill.
- No post-processing/vignette (only the value is exposed); the open +Z side is not hidden.
- Kitchen was only judged under software GL; no real fps measurement.
- Low tier is blocky. Panda separation is only checked on the head region.
Suggested next: knife prop and opening timeline using the anchors and marks; fur-rim control in panda-kit; a lighter marble with a Panda-side grade.

## v1.1 WIP: "Panda's home" pass (art-direction change)
The set read as a modern showroom. It now reads as a panda's own cosy kitchen:
- bamboo butcher-block counter and island tops (procedural bamboo strips) replace white marble;
- sage handmade tile backsplash replaces the marble slabs (darkened so the Panda still separates: bg/fur about 0.57-0.60);
- terracotta clay range hood with a cast-iron lip and a duct to the ceiling;
- bamboo steamer stack and cast-iron wok on the cooktop, clay teapot, basket of bamboo shoots, two red paper lanterns;
- a bamboo grove outside the window (unlit, follows lights-on; the sky pane moved 0.6 m out so the stalks sit in front of it).
Budgets held by tier-scaling the new props and thinning dish stacks on medium/low: 59.6k / 34.7k / 17.8k triangles, 39 draw calls, 1 shadow caster.
Still open from the fix pass: steps 4-6 and 8 (window light shaft, plaster, floor, t=0 black, M5/M7/M8 framing, end-grain variation).
