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
