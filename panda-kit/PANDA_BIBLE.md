# PANDA BIBLE (canonical design spec)

> Source of truth for the Panda's look. Numbers live in `src/config/defaults.js`; if you change one, change it here.

## Conventions
- Units ~ metres. Origin = centre of the feet on the ground, +Y up, Panda faces +Z. Height to top of head (ears excluded) = **2.0**.
- **L = the Panda's anatomical left = +X** (viewer's right in a front view). R = -X.

## Silhouette rules (iteration 1)
- Huge round head (46% of height, 1.24 x 0.92 x 1.08 ellipsoid), two small round puck ears, pear torso, stubby tube limbs, planted wide feet.
- No sharp or pointy shapes. Ears are thick pucks (z-radius 0.115) so they never read as spikes from the side.
- Soft white neck/jowl ellipsoid (0.42/0.25/0.37) under the head so the head rests into the shoulders. Shoulders are black ellipsoid masses (0.215/0.2/0.2).
- Arms are one continuous tube (capsule end-caps sit on the joints). **Never** put joint balls wider than the limb: they read as beads.
- Tail sits flush against the torso back (z = -0.50), not floating.
- Shoulders at x = 0.56; arms hang out 0.50 rad (29°) at rest so there is ≥0.04 m of air between arm and torso at waist height.

## Proportions
| Part | Value |
|---|---|
| Torso profile (y, r) | (0.30,0.40) (0.50,0.56) (0.70,0.59) (1.00,0.51) (1.25,0.42) (1.40,0.34), z-scale 0.9; belly = z-displacement bump 0.06, σ 0.2 at y 0.72 (no separate mesh) |
| Head | centre (0,1.54,0), radii (0.62,0.46,0.54) |
| Arm | tapered tubes: upper 0.24 (r 0.19→0.165), fore 0.21 (0.165→0.135 wrist), paw r 0.185 at y -0.08; shoulder→paw tip 0.724 = 0.362 of height; rest elbow bend 0.24 rad |
| Legs | tapered 0.38 long, hip r 0.235 → ankle 0.165 + ankle puff, hips at x = ±0.30, feet radii (0.22,0.12,0.30), turned out 10° |

## Rig
`root > hips > spine > chest > neck > head`, arms off `chest`, legs/tail off `hips`, `belly` off `spine`. Lean the **spine** (it carries the torso mesh); `chest` only moves arms/head.

## Face construction (iteration 2)
- Eye patches: flattened ellipsoids (r 0.15/0.20/0.06) projected onto the head ellipsoid by `projectToEllipsoid`, oriented to the surface normal, sunk 0.022, outer end tilted 25°. Never hand-place them.
- Eyes: r 0.062 sphere + vertex-coloured iris/pupil disc, two specular dots fixed to the head (not the rotating eyeball) so they never swim. Lid = upper hemisphere shell in patch black; angle remapped so 0.6-0.8 reads as half-lidded, > 0.88 hides the eyeball and shows a charcoal closed-eye line.
- Brows: rounded capsules, acting range via height / tilt / innerRaise. Resting brows sit slightly low (calm, confident).
- Muzzle: creamy ellipsoid; nose: tapered ellipsoid (rounded inverted triangle) with a clearcoat highlight; mouth: tube on a parametric curve projected onto the muzzle so it never floats. Open mouth = dense grid between lip curves (never a flat Shape).
- Rest face = `calmSmirk`: lids 0.3, one-sided smirk (offsetX 0.5).

## Palette and material recipes (iteration 3)
- Palette: see `PALETTE` in `config/defaults.js`. No #000 or #FFF in the base palette (the toon outline is a warm dark `#2a2022`; closed-eye line is `#3A3A40`).
- softClay: `MeshStandardMaterial`, roughness 0.88, vertex-colour AO baked from analytic occluders (chin, underarms, floor contact), shader patch adds (a) fresnel rim in `rimTint` weighted to the top, (b) warm tint lifting low-luminance whites, (c) lifted floor for blacks, (d) the shoulder band.
- Shoulder band: object-space shader mask, edge y = 0.98 + sum of 4 low-frequency sines (about ±0.04) so it is organic. Torso and belly use the SAME function of world-rest position so the band is continuous across the seam. Edge softness ±0.012.
- Belly: bump with normals rotated to the torso normal at the seam (`blendBellyNormals`) and a cream gradient that fades to warm white at the seam.
- Fuzz shells (high tier, head only): 6 shells, hash-noise alpha, opacity 0.07. Not on the torso: white fuzz over the black band reads as grey static.
- toon: `MeshToonMaterial` with canvas gradient map (4 steps) + same band + inverted-hull outline.
- Default style: **softClay** (tactile "vinyl toy" feel). Toon reads better at small sizes and is the safer choice when the Panda is under ~200 px tall.

## Rig and animation rules (iteration 4)
- Sign conventions: shoulder x < 0 raises the arm FORWARD, shoulder z > 0 (L) / z < 0 (R) raises it SIDEWAYS. Elbow x < 0 bends the forearm forward; elbow z bends it sideways/inward (use for hands-on-hips). spine/head x > 0 = lean/nod forward. head y > 0 = turn to the Panda's left (+X).
- To bring a forearm ACROSS the body (arms crossed), yaw the SHOULDER (y), not the elbow.
- Squash is applied on `root` (feet stay on the ground) with `Y *= (1-a)`, `XZ *= 1/sqrt(1-a)` (volume preserving). Never scale `spine`/`hips`: it shears rotated children.
- Secondary motion (belly jiggle, ear flop, tail wag, cheek wobble) = `fromTo` elastic tweens that start displaced and end AT REST, so they are deterministic and scrub-safe.
- Timing: anticipation before big moves, follow-through after stops (ears, belly, tail settle later), eyes lead head lead body, heavy ease (power2/3.inOut, elastic.out(1,0.3) for jiggle).
- Never put two tweens on the SAME property with overlapping time ranges: rendering order differs forward vs backward, so scrubbing breaks. `verify.mjs` catches this.

## v1.1 surface + face recipe (iterations 6-8)
- **Palette:** white `#F7F4EE` everywhere (belly ≈1-2 % warmer `#F6F2EA`), white shadow tint `#EAE5DC`, black `#1C1C21`, lifted floor `#2A2A31`, cool rim sheen `#8B93BC`, ear dish `#3C3C46`, inner mouth `#7A3340`, tongue `#C9606F`.
- **Fur recipe:** MeshStandardMaterial patched with fresnel rim, warm lifted shadows, streak noise along Y (white ±2.5 %, black ±5 %) and low-frequency tint drift; baked vertex AO (warm, de-saturated). Fuzz = shells of low-res proxies (length 0.012; 6 shells head+torso, 4 on arms, high only; 2 shells head+torso on medium).
- **Eye patches:** teardrop painted in the head shader (centre ±0.23, 1.575; half-length 0.225, half-width 0.165; slant 0.56 rad ≈ 32°; edge softness 5 %), masked off the muzzle. No geometry.
- **Brows:** tapered ribbons following the forehead (length 0.105 half, width 0.024). **Mouth:** tube r 0.0135 with tapered ends. **Ears:** one ellipsoid (0.185/0.185/0.12) with a 0.065 displaced dish. **Cheek tufts:** 2 wedges per side merged into the head shell. **Blush:** soft DataTexture falloff.
- **Default review pose:** `relaxedIdle` (hip tilt 2.3°, counter-tilted chest, head tilt 3°, asymmetric arms, weight on the right leg). `neutralStand` is the fitting pose.
