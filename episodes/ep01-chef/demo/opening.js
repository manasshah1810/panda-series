import * as THREE from 'three';
import { createKitchen } from '../kitchen/src/index.js';
import { createPanda } from '../../../panda-kit/src/index.js';
import chefOutfit from '../outfit/chefOutfit.js';
import { createKnife } from '../props/knife/knife.js';
import { createWoodenTitle } from '../title/woodenTitle.js';
import { createOpening } from '../timeline/openingTimeline.js';
import { OPENING_END } from '../timeline/beats.js';
import { createRamenBowl } from '../props/ramen-bowl/ramenBowl.js';
import { createHeroTeaseTimeline, createHeroSpot, HERO_TIMES } from '../timeline/heroTeaseBeat.js';
import { createRawIngredients } from '../props/ingredients/rawIngredients.js';
import { createMiseEnPlaceTimeline, createPandaPaws, MISE_DURATION, MARK_BOARD_ORIGIN } from '../timeline/miseEnPlaceBeat.js';
import { createSliceableBamboo } from '../props/ingredients/sliceableBamboo.js';
import { createAsmrChopTimeline, CHOP_TIMES } from '../timeline/asmrChopBeat.js';
import { CAMERA_MARKS, M14_FRAMING_NUDGE } from '../kitchen/src/cameraMarks.js';
import marks from '../review/openingMarks.json';

const q = new URLSearchParams(location.search);
const AUTO = !q.has('capture');   // ?capture = harness mode (no player loop, preserveDrawingBuffer for screenshots)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !AUTO, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#0d0c0b');
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 60);
const kitchen = createKitchen({ quality: q.get('quality') || 'medium', mood: 'morning', stage: 4, renderer });
scene.add(kitchen.root); kitchen.setLightsOn(1);
scene.fog = new THREE.FogExp2('#9a9084', 0);   // density 0 until the chop beat's depth-of-field haze (created up front so no material ever recompiles mid-film)
const panda = createPanda({ quality: q.get('quality') || 'medium', style: 'softClay', pose: 'neutralStand', receiveShadow: true, castShadow: true });
panda.equip(chefOutfit); scene.add(panda.root);
for (const l of kitchen.lights?.strips ?? []) l.visible = false;   // two faint under-shelf points: invisible at this framing, but they cost every pixel
// small props (dishes, utensils, pods) barely register in the shadow map: skip them in the shadow pass (fewer draw calls)
{ const bb = new THREE.Box3(), sz = new THREE.Vector3(); kitchen.root.traverse((o) => { if (!o.isMesh || !o.castShadow) return; if (o.isInstancedMesh) { o.castShadow = false; return; } bb.setFromObject(o).getSize(sz); if (Math.max(sz.x, sz.y, sz.z) < 1.5) o.castShadow = false; }); }
// back counters sit behind Panda in the opening shots: a touch darker so his white fur separates from them
{ const bb = new THREE.Box3(), c = new THREE.Vector3(); kitchen.root.traverse((o) => { if (!o.isMesh || o.isInstancedMesh) return; bb.setFromObject(o); bb.getCenter(c); if (bb.max.z < 0.3 && c.y < 1.2 && o.material?.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.72); } }); }
const env = scene.environment ?? null;
const knife = createKnife({ envMap: env });
{ const kenv = kitchen._state?.env?.texture ?? null; if (kenv) knife.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.metalness > 0.3) { m.envMap = kenv; m.envMapIntensity = 0.7; } }); }); }   // steel needs something to reflect in the macro shots
const title = createWoodenTitle({ envMap: env }); scene.add(title.group);
const op = createOpening({ scene, camera, kitchen, panda, knife, title, marks, renderer });
// ---- Beat 1: the hero tease (vegetarian Bamboo-Shoot Ramen on the island anchor, whip -> orbit -> steam plunge) ----
const ramen = createRamenBowl({ quality: q.get('quality') || 'medium', scale: 1, envMap: kitchen._state?.env?.texture ?? null });
kitchen.anchors.bowlPlacementPoint.add(ramen.group);
const heroSpot = createHeroSpot(kitchen.anchors.bowlPlacementPoint.getWorldPosition(new THREE.Vector3())); scene.add(heroSpot, heroSpot.target);
const wash = document.getElementById('wash');
const endPose = op.camAt(OPENING_END);
const heroTl = createHeroTeaseTimeline({
  cameraRig: { camera, startPose: { position: endPose.slice(0, 3), lookAt: endPose.slice(3, 6), fov: endPose[6], tilt: (marks.tiltUp.deg * Math.PI) / 180 } },
  ramenBowl: ramen, kitchenLighting: { lights: kitchen.lights, spot: heroSpot }, overlayElement: wash, hideOnReveal: [title.group],
});
op.attachHero(heroTl);
// ---- Beat 2: the mise en place drop (five vegetarian ingredients on the cutting board, top-down), straight after the steam wash ----
const boardCfg = kitchen.config.cuttingBoard, raw = createRawIngredients({ quality: q.get('quality') === 'low' ? 'low' : q.get('quality') === 'medium' ? 'medium' : 'high', envMap: kitchen._state?.env?.texture ?? null });
raw.group.position.set(boardCfg.center[0], boardCfg.center[1] + boardCfg.size[2], boardCfg.center[2]); scene.add(raw.group);   // board frame: origin on the board surface
const paws = createPandaPaws();
const miseTl = createMiseEnPlaceTimeline({ cameraRig: { camera }, rawIngredients: raw, pandaPaws: paws, overlayElement: wash, lighting: { lights: kitchen.lights, spot: heroSpot }, hideDuringBeat: [knife, panda.root, ramen.group] });
op.attachBeat(miseTl, OPENING_END + HERO_TIMES.duration);
// ---- Beat 3: the sliceable bamboo is mounted on the cutting board (board frame = raw.group). It stays hidden until the chop beat swaps it in for the solid cone.
const sliceable = createSliceableBamboo({ quality: q.get('quality') === 'low' ? 'low' : q.get('quality') === 'medium' ? 'medium' : 'high', envMap: kitchen._state?.env?.texture ?? null });
raw.group.add(sliceable.group); sliceable.group.rotation.y = Math.PI / 2; sliceable.group.visible = false;   // lies along board +x (tip towards the lens) exactly where the solid cone lay; it clears the bok choy / shiitake / dough
const render = () => renderer.render(scene, camera);
// ---- Beat 3: the ASMR scroll-chop, stitched on after the mise-en-place beat: Beat 1 (opening) -> 1b (hero bowl) -> 2 (mise en place) -> 3 (chop)
const vignette = document.getElementById('vignette'), CHOP_START = OPENING_END + HERO_TIMES.duration + MISE_DURATION;
const chopTl = createAsmrChopTimeline({ cameraRig: { camera }, sliceable, rawIngredients: raw, miseTimeline: miseTl, panda, knife, opening: op, scene, lighting: { lights: kitchen.lights, spot: heroSpot }, fog: scene.fog, vignetteElement: vignette });
op.releaseKnifeAfter(CHOP_START); op.attachBeat(chopTl, CHOP_START);
{ const gv = sliceable.group.visible, fv = chopTl.chop.flecks.mesh.visible; sliceable.group.visible = true; chopTl.chop.flecks.mesh.visible = true; renderer.compile(scene, camera); sliceable.group.visible = gv; chopTl.chop.flecks.mesh.visible = fv; }   // warm the shaders so the first chop never hitches
window.__op = {
  THREE, op, scene, camera, renderer, kitchen, panda, knife, title, ramen, heroTl, heroSpot, HERO_TIMES, OPENING_END, raw, paws, miseTl, MISE_START: OPENING_END + HERO_TIMES.duration, MISE_DURATION, chopTl, CHOP_START, CHOP_DURATION: CHOP_TIMES.duration, vignette,
  setSize(w, h) { renderer.setSize(w, h); camera.aspect = w / h; },
  seek(t) { camera.aspect = renderer.domElement.width / renderer.domElement.height; op.seek(t); render(); },
  frame(t) { window.__op.seek(t); return window.__op.snap(); },
  /** canvas -> png, with the DOM steam-wash overlay composited on top (it is a DOM element in the player) */
  snap() { const w = +(wash.style.opacity || 0), vg = +(vignette?.style.opacity || 0), cv = renderer.domElement; if (!w && !vg) return cv.toDataURL('image/png'); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d'); g.drawImage(cv, 0, 0);
    if (vg) { const gr = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height / 2, Math.hypot(c.width, c.height) * 0.5); gr.addColorStop(0, 'rgba(28,18,8,0)'); gr.addColorStop(1, 'rgba(28,18,8,' + vg + ')'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); }   // composites the DOM vignette
    if (w) { g.fillStyle = 'rgba(245,240,232,' + w + ')'; g.fillRect(0, 0, c.width, c.height); } return c.toDataURL('image/png'); },
  /** hero-beat time (seconds from the start of the hero beat) -> data URL; optional free camera override for diagnostic stills */
  hero(local, cam) { const w = window.__op; camera.aspect = renderer.domElement.width / renderer.domElement.height; op.seek(OPENING_END - 1); op.seek(OPENING_END + local);   // (re-seek so a previous free-camera override is always replaced)
    if (cam) { camera.up.set(...(cam.up ?? [0, 1, 0])); camera.position.set(...cam.position); camera.fov = cam.fov; camera.lookAt(...cam.lookAt); camera.updateProjectionMatrix(); }
    const hid = (cam?.hide ?? []).map((n) => ramen.group.getObjectByName(n)).filter(Boolean); hid.forEach((o) => { o.visible = false; });
    render(); const png = w.snap(); hid.forEach((o) => { o.visible = true; }); return png; },
  sliceable,
  /** Diagnostic still: lineup finished, original solid cone hidden, sliceable bamboo shown, camera on M14 (board-relative). `tips` = per-slice tip progress. */
  chopSetup(tips = []) { const w = window.__op; w.seek(w.MISE_START + 14.6); for (const id of ['bamboo_shoot']) raw.ingredientsMap.get(id).parts.forEach((pt) => { pt.root.visible = false; if (pt.shadow) pt.shadow.visible = false; }); sliceable.group.visible = true; miseTl.mise.tags.forEach((m) => { m.visible = false; }); paws.group.visible = false;
    sliceable.slices.forEach((_, i) => sliceable.setSliceTip(i, tips[i] ?? 0));
    const o = raw.group.getWorldPosition(new THREE.Vector3()), sh = o.sub(new THREE.Vector3(...MARK_BOARD_ORIGIN)).add(new THREE.Vector3(...M14_FRAMING_NUDGE)), m = CAMERA_MARKS.M14_macro_chop_side;
    camera.up.set(0, 1, 0); camera.position.set(...m.position).add(sh); camera.fov = m.fov; camera.lookAt(new THREE.Vector3(...m.lookAt).add(sh)); camera.updateProjectionMatrix(); render(); return w.snap(); },
  stats() { return renderer.info.render; },
  info() { render(); return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; },
};
window.__op.seek(0);

// ---------------- player (browser only) ----------------
if (AUTO) {
  const $ = (id) => document.getElementById(id), bar = $('bar'), tl = $('tl'), btn = $('pp'), cur = $('cur'), loading = $('loading');
  const END = op.master.duration(), DPR_MAX = Math.min(devicePixelRatio || 1, 1.5), DPR_MIN = 0.6;
  let t = 0, playing = true, last = performance.now(), scale = 0.9, acc = 0, n = 0, hold = 0;
  renderer.shadowMap.autoUpdate = false; let frame = 0;   // shadows refresh every 2nd frame while playing (and on every scrub)
  const resize = () => { renderer.setPixelRatio(scale); renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; };
  addEventListener('resize', resize); resize();
  const setPlaying = (v) => { playing = v; btn.textContent = v ? '❚❚' : '▶'; last = performance.now(); };
  btn.onclick = () => { if (!playing && t >= END - 0.01) t = 0; setPlaying(!playing); };
  tl.max = END; tl.step = 0.01; tl.oninput = () => { t = +tl.value; setPlaying(false); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); btn.onclick(); } });
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = Math.max(last, now);
    if (playing) { t += dt; if (t >= END) { t = END; setPlaying(false); } }
    op.seek(Math.max(0, t)); renderer.shadowMap.needsUpdate = !playing || (frame++ & 1) === 0 || dt === 0; renderer.render(scene, camera); tl.value = t; cur.textContent = t.toFixed(1) + ' / ' + END.toFixed(0) + 's';
    // dynamic resolution: keep ~60 fps on slow GPUs, sharpen when there is headroom (hysteresis, adjusted every 20 frames)
    acc += dt * 1000; n++;
    if (n >= 20) { const ms = acc / n; acc = 0; n = 0; if (playing) { let s = scale; if (ms > 19) s = Math.max(DPR_MIN, scale * 0.85); else if (ms < 12 && scale < DPR_MAX) s = Math.min(DPR_MAX, scale * 1.1); if (Math.abs(s - scale) > 0.01) { scale = s; resize(); } } }
  };
  loading.remove(); bar.style.display = 'flex'; setPlaying(true); last = performance.now(); requestAnimationFrame(loop);
}
