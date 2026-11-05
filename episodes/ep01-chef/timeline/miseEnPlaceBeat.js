import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CAMERA_MARKS } from '../kitchen/src/cameraMarks.js';
import { DROP, INGREDIENT_ORDER } from '../props/ingredients/rawIngredients.js';

/**
 * Beat 2 -- The Mise en Place Drop. Directly after the hero tease's steam wash: cream wash clears, camera settles from M12 to the locked
 * top-down M13 over the board, the Panda's paws drop five vegetarian ingredients (squash-and-stretch) with floating pill tags, then the
 * camera tilts 5 degrees as the paws hover over the bamboo shoot.
 *
 * One paused GSAP timeline of length MISE_DURATION seconds (timeline progress t = time / MISE_DURATION). The timeline only tweens plain
 * progress scalars; `apply()` (called from onUpdate) is a pure function of those scalars + timeline time, assigning ABSOLUTE values to the camera,
 * overlay, lights, ingredients, paws and tags. No physics, no accumulation, no Math.random: scrubbing in any order gives identical frames.
 */
export const MISE_DURATION = 10;
/** sub-beat ranges as fractions of the beat (spec). */
export const MISE_RANGES = Object.freeze({ settle: [0, 0.15], drops: [[0.15, 0.3], [0.3, 0.45], [0.45, 0.6], [0.6, 0.75], [0.75, 0.9]], hold: [0.9, 1.0] });
export const TAG_TEXT = Object.freeze({ bamboo_shoot: '01. FRESH BAMBOO', noodle_dough: '02. HAND-PULLED DOUGH', shiitake_mushrooms: '03. SHIITAKE', baby_bok_choy: '04. BABY BOK CHOY', chili_oil_jar: '05. SESAME CHILI OIL' });
export const WASH_COLOR = '#F5F0E8';
export const PREP_TILT_DEG = 5;
/** The spec marks are authored for a board centred at (0, 1.05, 1.1); they are translated by (board origin - this). */
export const MARK_BOARD_ORIGIN = Object.freeze([0, 1.05, 1.1]);

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const E = (n) => gsap.parseEase(n);
const E_CAM = E('power2.out'), E_PREP = E('sine.inOut'), E_IN = E('power2.in');
const DIR = { L: new THREE.Vector3(-0.5, 0, -0.866).normalize(), R: new THREE.Vector3(0.5, 0, -0.866).normalize() };   // outward arm axis: arms enter from the top edge, fanning out to the flanks (never from the bottom corners)
const PAW_CLEAR = 0.12, RETREAT_END = 0.8;

/**
 * Two chubby panda paws (panda-kit proportions): soft charcoal mitten paw (#1A1A1F) with a rounded thumb pad and toe bumps, a thick forearm
 * (r 0.13), a thick warm-white chef cuff with a bevelled hem (#F7F4EE, r 0.19) and a long jacket sleeve (r 0.21 -> 0.22). Arm axis = local +z
 * (towards the shoulder); local -z is the way the paw faces. Each paw is placed by the beat.
 */
export function createPandaPaws() {
  const group = new THREE.Group(); group.name = 'pandaPaws'; const disposables = [], paws = {};
  const felt = new THREE.MeshStandardMaterial({ color: '#1A1A1F', roughness: 0.88 }), cloth = new THREE.MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }); disposables.push(felt, cloth);
  const xf = (g, p, r = [0, 0, 0], s = [1, 1, 1]) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
  // cuff + sleeve: one lathe (axis y, rotated onto z); colour by height along the arm
  const sleeveGeo = () => {
    const prof = [[0.136, 0], [0.156, 0.002], [0.176, 0.012], [0.19, 0.03], [0.193, 0.06], [0.193, 0.1], [0.187, 0.106], [0.196, 0.116], [0.207, 0.17], [0.215, 0.5], [0.222, 1.0]].map((p) => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.LatheGeometry(prof, 28), pos = g.attributes.position, col = new Float32Array(pos.count * 3), cuff = new THREE.Color('#F7F4EE'), seam = new THREE.Color('#E2DACA'), slv = new THREE.Color('#EEE8DA'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y <= 0.1) c.copy(cuff); else if (y < 0.14) c.copy(seam); else c.copy(slv).lerp(cuff, Math.max(0, 1 - (y - 0.14) / 0.2) * 0.5); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return xf(g, [0, 0, 0.2], [Math.PI / 2, 0, 0]);
  };
  for (const side of ['L', 'R']) {
    const th = side === 'L' ? -1 : 1;   // thumb towards the board's centre line (palm down)
    const pawG = [xf(new THREE.SphereGeometry(1, 20, 14), [0, 0, 0], [0, 0, 0], [0.105, 0.085, 0.115])];   // soft palm mass
    pawG.push(xf(new THREE.SphereGeometry(1, 14, 10), [th * 0.088, -0.006, -0.045], [0, th * 0.35, 0], [0.046, 0.04, 0.068]));   // rounded thumb pad
    for (const x of [-0.058, 0, 0.058]) pawG.push(xf(new THREE.SphereGeometry(1, 10, 8), [x, -0.012, -0.1], [0, 0, 0], [0.036, 0.034, 0.036]));   // toe bumps along the front edge
    pawG.push(xf(new THREE.CapsuleGeometry(0.13, 0.1, 6, 20), [0, 0, 0.1], [Math.PI / 2, 0, 0]));   // forearm / wrist
    const root = new THREE.Group(); root.name = 'paw' + side; root.rotation.order = 'YXZ';
    const a = new THREE.Mesh(mergeGeometries(pawG), felt), b = new THREE.Mesh(sleeveGeo(), cloth); a.name = 'pawPad'; b.name = 'pawSleeve';
    for (const m of [a, b]) { m.castShadow = true; m.receiveShadow = true; disposables.push(m.geometry); root.add(m); }
    pawG.forEach((g) => g.dispose());
    root.visible = false; group.add(root); paws[side] = { root };
  }
  return { group, left: paws.L, right: paws.R, dispose() { disposables.forEach((d) => d.dispose?.()); group.removeFromParent(); } };
}

/** Pill tag: cream badge, warm charcoal bold text, soft drop shadow, drawn to a canvas (no image files). */
function makeTagMesh(text) {
  const W = 1024, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const pill = () => { g.beginPath(); g.roundRect(40, 34, W - 80, 150, 75); };
  g.shadowColor = 'rgba(40,28,18,0.32)'; g.shadowBlur = 26; g.shadowOffsetY = 12; g.fillStyle = '#FAF7EE'; pill(); g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 3; g.strokeStyle = 'rgba(120,96,64,0.22)'; pill(); g.stroke();
  let size = 92; const face = (s) => `800 ${s}px "Trebuchet MS","DejaVu Sans","Helvetica Neue",Arial,sans-serif`; g.font = face(size); while (g.measureText(text).width > W - 190 && size > 30) { size -= 3; g.font = face(size); }
  g.fillStyle = '#1A1A1F'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, 112);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.115), mat); mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 20; mesh.name = 'tag'; mesh.visible = false; mesh.scale.setScalar(0.0001);
  mesh.userData.dispose = () => { tex.dispose(); mat.dispose(); mesh.geometry.dispose(); };
  return mesh;
}

/**
 * @param {object} deps
 * @param {{camera: THREE.PerspectiveCamera, marks?: object}} deps.cameraRig
 * @param {ReturnType<import('../props/ingredients/rawIngredients.js').createRawIngredients>} deps.rawIngredients  (its `group` is the board frame: origin = board surface centre)
 * @param {ReturnType<typeof createPandaPaws>} deps.pandaPaws
 * @param {HTMLElement|null} [deps.overlayElement]   cream wash (DOM). Opacity is written absolutely.
 * @param {THREE.Object3D} [deps.uiContainer]         parent of the 3D pill tags (default: the board frame)
 * @param {{lights?: object, spot?: THREE.SpotLight}} [deps.lighting]  continues the hero beat's dim / spot back to full
 * @param {THREE.Object3D[]} [deps.hideDuringBeat]    carry-over props from the opening that must not appear in this shot (knife, Panda, bowl)
 * @returns {gsap.core.Timeline}  paused, MISE_DURATION s. `tl.mise` = { apply, state, ... }
 */
export function createMiseEnPlaceTimeline({ cameraRig, rawIngredients, pandaPaws, overlayElement = null, uiContainer = null, lighting = null, hideDuringBeat = [] }) {
  const D = MISE_DURATION, camera = cameraRig.camera, marks = cameraRig.marks ?? CAMERA_MARKS, frame = rawIngredients.group;
  frame.updateWorldMatrix(true, false);
  const origin = frame.getWorldPosition(new THREE.Vector3()), shift = origin.clone().sub(new THREE.Vector3(...MARK_BOARD_ORIGIN));
  const pose = (m) => ({ p: new THREE.Vector3(...m.position).add(shift), l: new THREE.Vector3(...(m.lookAt ?? m.target)).add(shift), fov: m.fov });
  const P12 = pose(marks.M12_topdown_board_entry), P13 = pose(marks.M13_topdown_board_lock);

  // --- tags + paws live in the board frame
  const ui = uiContainer ?? frame; if (pandaPaws.group.parent !== frame) frame.add(pandaPaws.group);
  const tags = INGREDIENT_ORDER.map((id) => { const m = makeTagMesh(TAG_TEXT[id]); m.position.copy(rawIngredients.ingredientsMap.get(id).tag); ui.add(m); return m; });
  const ing = (id) => rawIngredients.ingredientsMap.get(id);
  const assign = { L: [ing('bamboo_shoot').parts[0], ing('shiitake_mushrooms').parts[0], ing('chili_oil_jar').parts[0]], R: [ing('noodle_dough').parts[0], ing('shiitake_mushrooms').parts[1], ing('baby_bok_choy').parts[0]] };
  const bamboo = ing('bamboo_shoot').parts[0], hoverPrep = { L: new THREE.Vector3(bamboo.rest[0] - 0.2, 0.25, bamboo.rest[1] - 0.08), R: new THREE.Vector3(bamboo.rest[0] + 0.2, 0.25, bamboo.rest[1] + 0.02) };
  const IDLE = { L: hoverPrep.L.clone().addScaledVector(DIR.L, 1.5).add(new THREE.Vector3(0, 0.4, 0)), R: hoverPrep.R.clone().addScaledVector(DIR.R, 1.5).add(new THREE.Vector3(0, 0.4, 0)) };

  // --- lights (continue the hero beat's 35% fill dim and warm spot back to normal as the wash clears)
  const spot = lighting?.spot ?? null, dim = Object.values(lighting?.lights ?? {}).flat().filter((l) => l && l.isLight && l !== spot).map((l) => ({ l, base: l.intensity }));
  const spotPeak = spot ? (spot.userData.peak ?? 1.1) : 0;

  // --- progress scalars: the only state the timeline owns
  const s = { wash: 1, cam: 0, light: 0, prep: 0, shake: 0 }; INGREDIENT_ORDER.forEach((_, i) => { s['d' + i] = 0; s['tg' + i] = 0; });
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });
  const ft = (k, from, to, [a, b], ease) => tl.fromTo(s, { [k]: from }, { [k]: to, duration: (b - a) * D, ease, immediateRender: false }, a * D);
  ft('wash', 1, 0, MISE_RANGES.settle, 'power1.inOut'); ft('cam', 0, 1, MISE_RANGES.settle, 'none'); ft('light', 0, 1, MISE_RANGES.settle, 'sine.inOut');
  INGREDIENT_ORDER.forEach((id, i) => {
    const [a, b] = MISE_RANGES.drops[i]; ft('d' + i, 0, 1, [a, b], 'none');
    const impact = a + (b - a) * (DROP.impact + (id === 'shiitake_mushrooms' ? 0.03 : 0)), pop = 0.6 / D;
    ft('tg' + i, 0, 1, [impact, impact + pop], 'elastic.out(1,0.5)');
    if (id === 'chili_oil_jar') ft('shake', 0, 1, [impact, impact + 0.45 / D], 'none');
  });
  ft('prep', 0, 1, MISE_RANGES.hold, 'none');
  tl.to({}, { duration: D - tl.duration() }, tl.duration());

  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _l = new THREE.Vector3();
  /** Hand (paw centre) for one side: it carries the part behind it (towards the shoulder), follows it down, then retreats along the arm axis. At most one part per side is ever active, so each paw has one continuous, independent path. */
  function pawTarget(side) {
    for (const a of assign[side]) {
      if (!(a.p > 0 && a.p < RETREAT_END)) continue;
      const off = 0.5 * Math.hypot(a.size.x, a.size.z) * 0.9 + PAW_CLEAR, d = DIR[side];
      if (a.p < DROP.release) { const r = a.root; return _a.set(r.position.x + d.x * off, Math.max(0.12, r.position.y + 0.5 * a.height * r.scale.y + 0.05), r.position.z + d.z * off); }
      const [rx, rz] = a.rest, u = E_IN(clamp01((a.p - DROP.release) / (RETREAT_END - DROP.release)));
      return _a.set(rx + d.x * off, a.H + 0.5 * a.height + 0.05, rz + d.z * off).addScaledVector(d, 1.4 * u).addScaledVector(THREE.Object3D.DEFAULT_UP, 0.3 * u);
    }
    return null;
  }

  /** The single writer. */
  function apply() {
    const t = tl.time(), started = t > 0;
    // overlay + lights
    if (overlayElement) { overlayElement.style.backgroundColor = WASH_COLOR; overlayElement.style.opacity = String(s.wash); }
    const dimF = 1 - 0.35 * (1 - s.light); for (const d of dim) d.l.intensity = d.base * dimF; if (spot) spot.intensity = spotPeak * (1 - s.light);
    for (const o of hideDuringBeat) o.visible = !started;   // gone for the whole beat; restored at beat time 0 so scrubbing back into the hero beat is correct
    // ingredients
    INGREDIENT_ORDER.forEach((id, i) => rawIngredients.setDropProgress(id, s['d' + i]));
    // paws
    for (const side of ['L', 'R']) {
      const paw = (side === 'L' ? pandaPaws.left : pandaPaws.right).root; let tgt = pawTarget(side); const idle = tgt === null;
      if (idle) tgt = _a.copy(IDLE[side]);
      const k = E_PREP(s.prep); _b.copy(tgt);
      if (k > 0) { const bob = 0.012 * Math.sin(((t - MISE_RANGES.hold[0] * D) / 1.1) * Math.PI * 2) * k; _l.copy(hoverPrep[side]); _l.y += bob; _b.lerp(_l, k); }
      paw.position.copy(_b); paw.rotation.set(-0.2, Math.atan2(DIR[side].x, DIR[side].z), 0); paw.visible = !idle || k > 0;
    }
    // tags
    tags.forEach((m, i) => { const v = s['tg' + i]; m.visible = v > 0.001; m.scale.setScalar(Math.max(0.0001, v)); });
    // camera: M12 -> M13 settle, jar-thud shake, then a 5-degree tilt
    const c = E_CAM(s.cam); camera.up.set(0, 0, -1); camera.position.lerpVectors(P12.p, P13.p, c); _l.lerpVectors(P12.l, P13.l, c); camera.fov = P12.fov + (P13.fov - P12.fov) * c;
    const u = s.shake * 0.45, sh = s.shake > 0 && s.shake < 1 ? 0.012 * Math.exp(-9 * u) * Math.sin(70 * u) : 0; camera.position.y += sh; camera.position.x += sh * 0.4;
    camera.lookAt(_l); if (s.prep > 0) camera.rotateX((PREP_TILT_DEG * Math.PI / 180) * E_PREP(s.prep));
    camera.updateProjectionMatrix();
  }

  const saved = overlayElement ? overlayElement.style.opacity : null, savedLights = dim.map((d) => d.l.intensity), savedSpot = spot ? spot.intensity : 0, savedVis = hideDuringBeat.map((o) => o.visible), savedCam = { p: camera.position.clone(), up: camera.up.clone(), fov: camera.fov, q: camera.quaternion.clone() };
  tl.eventCallback('onUpdate', apply);
  tl.progress(1).progress(0); apply();
  // construction must not leak the beat's start state into earlier times: restore what the opening / hero beat had set
  if (overlayElement) overlayElement.style.opacity = saved ?? '0'; dim.forEach((d, i) => { d.l.intensity = savedLights[i]; }); if (spot) spot.intensity = savedSpot; hideDuringBeat.forEach((o, i) => { o.visible = savedVis[i]; });
  camera.position.copy(savedCam.p); camera.up.copy(savedCam.up); camera.fov = savedCam.fov; camera.quaternion.copy(savedCam.q); camera.updateProjectionMatrix();

  tl.mise = { apply, state: s, duration: D, ranges: MISE_RANGES, origin, tags, paws: pandaPaws, marks: { P12, P13 }, dispose() { tags.forEach((m) => { m.userData.dispose(); m.removeFromParent(); }); } };
  return tl;
}
