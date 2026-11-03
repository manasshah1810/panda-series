# Kitchen Bible (Episode 1)

**Units** metres, +Y up, camera on +Z looking -Z. Origin = floor point at the Panda mark. Panda: 2.0 tall, **about 2.0 wide arms-down in the chef outfit** (not 1.3), 1.38 deep.

**Layout (final)** room x -4.6..4.6, back wall z -1.9, ceiling 5.0, open +Z side to z 7. Back counter x -3.8..3.8, top y 1.0, front z -1.1 (cooktop x -1.8, sink x 1.4, hood x -1.8 bottom 3.3 / top 4.6). Brass rail y 2.35. Shelves y 2.95 / 3.55, x 0.2..3.8. Tall unit x 3.85..4.55. Window in the right wall (z 1.0 centre, 2.4 x 2.2, sill 1.2). **Island x 1.2..4.5, z 0.7..2.1** (moved from 0.9 so the Panda's arms clear it), open 3-bay shelf on the -Z face, grooved panel on +Z. Cutting board centre (1.7, 1.0, 1.1), knife anchor y 1.10. Clean zone on the island x 2.4..4.4, z 0.9..1.9 stays empty.

**Palette** see `kitchenConfig.js`. No pure black/white. The backsplash marble is tinted to ~#8E8982 so the white Panda separates (measured bg/fur ratio 0.55-0.72, rule <= 0.75).

**Materials** marble (physical, two textures, per-slab offset/rotation), honey wood (grain direction via box-projected UVs), brushed steel (roughness streaks), brass/copper, warm ceramic. Reflections from RoomEnvironment assigned per material (the Panda is not affected).

**Lighting recipe** window key (directional, only shadow caster, from x=9), sky hemisphere, camera-side fill (added; not in the original brief), cool rim, hood spot, two cheap under-shelf points + emissive strips, additive light-shaft prism and dust points. Moods: `morning` default, `warmEvening`. Lights-on curve: dark to t 0.3, flicker 0.33-0.5, warm ramp to 1.

**Rules** everything animated is a pure function of `setTime`/`setLightsOn`; instance repeated props; round every visible edge; stylist-tidy props (odd counts, nothing touching); keep the centre of the rail clear (|x| < 0.7) behind the Panda's head; never put props in the island clean zone; do not modify panda-kit.
