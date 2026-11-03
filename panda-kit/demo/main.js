import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { createPanda } from '../src/index.js';
import { createLighting, lightingNames } from './lighting.js';
import { installReviewApi } from './review.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 100);
camera.position.set(0, 1.3, 6.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, 0); controls.enableDamping = true; controls.update();

const lighting = createLighting(scene, renderer);
const q = new URLSearchParams(location.search);
const panda = createPanda({ quality: q.get('quality') || 'high', style: q.get('style') || 'softClay' });
scene.add(panda.root);

const state = { turntable: false, silhouette: false, debug: false, lighting: 'studio', quality: panda.quality, wireframe: false };
const helpers = new THREE.Group(); scene.add(helpers); helpers.visible = false;
function buildDebug() {
  helpers.clear();
  const seen = new Set([...Object.values(panda.rig), ...Object.values(panda.sockets)]);
  for (const o of seen) { if (o === panda.root) continue; const ax = new THREE.AxesHelper(o.name.includes('Socket') || o.name === 'headTop' || o.name === 'eyeBridge' || o.name === 'neckBase' ? 0.12 : 0.07); ax.material.depthTest = false; ax.renderOrder = 999; ax.userData.follow = o; helpers.add(ax); }
}
buildDebug();
const tmp = new THREE.Vector3(), tq = new THREE.Quaternion();

const api = { renderer, scene, camera, controls, panda, lighting, state, THREE };
installReviewApi(api);

const gui = new GUI({ title: 'Panda Kit' });
gui.add(state, 'turntable'); 
gui.add(state, 'silhouette').onChange((v) => { lighting.silhouette(v); api.setSilhouetteMaterials(v); });
gui.add(state, 'debug').name('show pivots/sockets').onChange((v) => (helpers.visible = v));
gui.add(state, 'wireframe').onChange((v) => api.setWireframe(v));
gui.add(state, 'lighting', lightingNames).onChange((v) => lighting.apply(v));
gui.add(state, 'quality', ['high', 'medium', 'low']).onChange((v) => { panda.setQuality(v); buildDebug(); api.refreshStats(); });
const stats = { tris: 0, calls: 0 }; gui.add(stats, 'tris').listen().disable(); gui.add(stats, 'calls').listen().disable();
api.refreshStats = () => { const s = panda.stats(); stats.tris = s.triangles; stats.calls = s.drawCalls; };
api.refreshStats();
const rigGui = gui.addFolder('Rig (rotations)'); rigGui.close();
for (const n of ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'shoulderR', 'elbowR', 'hipL', 'hipR', 'tail', 'earL', 'earR']) {
  const f = rigGui.addFolder(n); f.close();
  ['x', 'y', 'z'].forEach((a) => f.add(panda.rig[n].rotation, a, -3.14, 3.14, 0.01));
}
const exprGui = { expression: 'calmSmirk', autoBlink: true };
gui.add(exprGui, 'expression', panda.face.presetNames).onChange((n) => panda.face.setExpression(n, 0.4));
gui.add(exprGui, 'autoBlink').onChange((v) => (v ? panda.face.startAutoBlink() : panda.face.stopAutoBlink()));
gui.add({ blink: () => panda.face.blink() }, 'blink');
// ---- outfits: generic loader. ?outfit=/@fs/abs/path/outfit.js (comma separated) equips ANY outfit module; the kit demo contains none ----
import demoScarf from '../src/outfits/demoScarf.js';
const worn = { demoScarf: false };
gui.add(worn, 'demoScarf').name('equip demoScarf').onChange((v) => (v ? panda.equip(demoScarf) : panda.unequip('demoScarf')));
api.equipFromUrl = async (url) => { const mod = await import(/* @vite-ignore */ url); return panda.equip(mod.default); };
const outfitParam = q.get('outfit'); if (outfitParam) for (const u of outfitParam.split(',')) await api.equipFromUrl(u);
// ---- animation + pose review tools ----
const anim = { name: 'wave', progress: 0, playing: false, pose: 'neutralStand', current: null };
function buildAnim() { if (anim.current) anim.current.kill(); anim.current = panda.anim[anim.name](); anim.current.progress(anim.progress); api.currentTl = anim.current; }
const ag = gui.addFolder('Animation');
ag.add(anim, 'name', Object.keys(panda.anim)).onChange(() => { anim.progress = 0; buildAnim(); scrub.updateDisplay(); });
const scrub = ag.add(anim, 'progress', 0, 1, 0.001).name('scrub').onChange((v) => { if (!anim.current) buildAnim(); anim.current.pause().progress(v); panda.face.apply(); });
ag.add({ play() { if (!anim.current) buildAnim(); anim.current.play(0); } }, 'play');
ag.add({ pause() { anim.current?.pause(); } }, 'pause');
ag.add(anim, 'pose', panda.poseNames).onChange((n) => { anim.current?.kill(); anim.current = null; panda.pose(n, 0.8); });
api.scrubAnim = (name, p) => { panda.root.rotation.y = 0; anim.name = name; anim.progress = p; buildAnim(); panda.face.apply(); return anim.current.duration(); };
api.applyPose = (n) => { anim.current?.kill(); anim.current = null; panda._applyPose(n); };
api.resetPose = () => { anim.current?.kill(); anim.current = null; panda._applyPose('neutralStand'); };
if (api.extendGui) api.extendGui(gui);

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update(); const dt = Math.min(timer.getDelta(), 0.1);
  if (state.turntable) panda.root.rotation.y += dt * 0.5;
  panda.update(dt);
  for (const ax of helpers.children) { ax.userData.follow.getWorldPosition(tmp); ax.position.copy(tmp); ax.userData.follow.getWorldQuaternion(tq); ax.quaternion.copy(tq); }
  controls.update();
  renderer.render(scene, camera);
});
