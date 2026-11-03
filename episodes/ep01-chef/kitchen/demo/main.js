import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createKitchen, CAMERA_MARKS, MARK_PANDA_ROT_Y } from '../src/index.js';
import { createPanda } from '../../../../panda-kit/src/index.js';
import * as TEX from '../src/materials/proceduralTextures.js';
import { KITCHEN_CONFIG } from '../src/index.js';
import chefOutfit from '../../outfit/chefOutfit.js';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = Number(q.get('exposure') ?? 1.0); renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#0d0c0b');
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 60);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;

const kitchen = createKitchen({ quality: q.get('quality') || 'high', mood: q.get('mood') || 'morning', stage: Number(q.get('stage') ?? 4), renderer });
scene.add(kitchen.root);

let panda = null, unequip = null, pandaOn = q.get('panda') !== '0';
function ensurePanda() {
  if (panda) return panda;
  panda = createPanda({ quality: 'high', style: 'softClay', pose: 'neutralStand', receiveShadow: true, castShadow: true });
  unequip = panda.equip(chefOutfit); scene.add(panda.root); placePanda(Math.PI); return panda;
}
function placePanda(rotY, pos = kitchen.anchors.pandaMark.position) { panda.root.position.copy(pos); panda.root.rotation.y = rotY; }
const lookAt = new THREE.Vector3();
function setCam(position, target, fov) { camera.position.set(...position); lookAt.set(...target); camera.fov = fov; camera.aspect = renderer.domElement.width / renderer.domElement.height; camera.updateProjectionMatrix(); controls.target.copy(lookAt); controls.update(); }
function goMark(name, { panda: p = true } = {}) {
  const m = CAMERA_MARKS[name]; setCam(m.position, m.lookAt, m.fov);
  if (p && pandaOn) { ensurePanda(); panda.root.visible = true; placePanda(MARK_PANDA_ROT_Y[name]); } else if (panda) panda.root.visible = false;
}
const render = () => renderer.render(scene, camera);
if (pandaOn) ensurePanda();
goMark(q.get('mark') || 'M1_establish_back');

// ---------- review / verification API (used by scripts/*.mjs and the Screenshot All Marks button) ----------
const api = {
  TEX, KITCHEN_CONFIG, THREE, renderer, scene, camera, controls, kitchen, createKitchen, createEnvironment: null, CAMERA_MARKS, MARK_PANDA_ROT_Y, goMark, setCam, ensurePanda, placePanda, render,
  get panda() { return panda; },
  setPandaVisible(v) { if (v) ensurePanda(); if (panda) panda.root.visible = v; pandaOn = v; },
  setSize(w, h) { renderer.setPixelRatio(1); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); },
  frame() { render(); return renderer.domElement.toDataURL('image/png'); },
  wireframe(on) { kitchen._state.mats.list.forEach((m) => { m.wireframe = on; }); },
  readPixels() { render(); const c = document.createElement('canvas'); c.width = renderer.domElement.width; c.height = renderer.domElement.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(renderer.domElement, 0, 0); return x.getImageData(0, 0, c.width, c.height); },
};
window.__kr = api;

// ---------- UI ----------
const ui = document.getElementById('ui');
ui.innerHTML = `<b>EP01 kitchen</b><div id="stats"></div><h4>Camera marks</h4><div id="marks"></div><h4>Lights on</h4><input id="lo" type="range" min="0" max="1" step="0.005" value="1">
<h4>Time</h4><input id="tm" type="range" min="0" max="12" step="0.01" value="0"><h4>Mood / quality</h4>
<select id="mood"><option>morning</option><option>warmEvening</option></select> <select id="qual"><option>high</option><option>medium</option><option>low</option></select>
<h4>Toggles</h4><label><input type="checkbox" id="pd" ${pandaOn ? 'checked' : ''}> Panda (chef)</label> <label><input type="checkbox" id="wf"> wireframe</label><br><button id="shots">Screenshot All Marks</button>`;
const marks = ui.querySelector('#marks');
for (const n of Object.keys(CAMERA_MARKS)) { const b = document.createElement('button'); b.textContent = n.split('_')[0]; b.title = CAMERA_MARKS[n].note; b.onclick = () => goMark(n); marks.appendChild(b); }
const upd = () => { const s = kitchen.stats(); ui.querySelector('#stats').textContent = `${s.triangles} tris · ${s.drawCalls} draws · ${s.quality}`; };
ui.querySelector('#lo').oninput = (e) => kitchen.setLightsOn(+e.target.value);
ui.querySelector('#tm').oninput = (e) => kitchen.setTime(+e.target.value);
ui.querySelector('#mood').onchange = (e) => kitchen.setMood(e.target.value);
ui.querySelector('#qual').value = kitchen.quality; ui.querySelector('#qual').onchange = (e) => { kitchen.setQuality(e.target.value); upd(); };
ui.querySelector('#pd').onchange = (e) => api.setPandaVisible(e.target.checked);
ui.querySelector('#wf').onchange = (e) => api.wireframe(e.target.checked);
ui.querySelector('#shots').onclick = async () => { for (const n of Object.keys(CAMERA_MARKS)) { goMark(n); const a = document.createElement('a'); a.href = api.frame(); a.download = `kitchen_${n}.png`; a.click(); await new Promise((r) => setTimeout(r, 250)); } };
upd(); addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const dt = clock.getDelta(); panda?.update?.(dt); kitchen.update(dt); controls.update(); render(); });
