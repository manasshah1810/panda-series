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
  unequip = panda.equip(chefOutfit); scene.add(panda.root); scaleRim(kitchen.lightsLevel); placePanda(Math.PI); return panda;
}
// The Panda's fur shader has a self-lit fresnel rim (uRim) that ignores scene lights: scale it with the kitchen's lights-on level so t=0 is truly dark.
function scaleRim(k) { if (!panda) return; panda.root.traverse((o) => { const u = o.material?.userData?.uniforms; if (u?.uRim) { u._base ??= u.uRim.value; u.uRim.value = u._base * k; } }); }
kitchen.onLightsChange = scaleRim;
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
  /** Mean sRGB colour of the Panda's white fur vs the apron/hat cloth, sampled only where each is brightest (top half by luminance = "lit areas"). Mask pass: flat sentinel colours, kitchen hidden. */
  furStats() {
    if (!panda) return null; const w = renderer.domElement.width, h = renderer.domElement.height, full = api.readPixels().data;
    const sent = { fur: [1, 0, 1], cloth: [0, 1, 1], other: [1, 1, 0] }, saved = [], mk = Object.fromEntries(Object.entries(sent).map(([k, v]) => [k, new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...v, THREE.SRGBColorSpace), toneMapped: false })]));
    panda.root.traverse((o) => { if (!o.isMesh) return; saved.push([o, o.material, o.visible]); const m = Array.isArray(o.material) ? o.material[0] : o.material, hex = m.color?.getHexString();
      if (m.isShaderMaterial) o.visible = false; else o.material = m.userData?.uniforms?.uRim && hex === 'f7f4ee' ? mk.fur : hex === 'cfdfea' ? mk.cloth : mk.other; });
    const kv = kitchen.root.visible, bgs = scene.background; kitchen.root.visible = false; scene.background = null; renderer.setClearColor(0x000000, 1); const mask = api.readPixels().data;
    for (const [o, m, v] of saved) { o.material = m; o.visible = v; } kitchen.root.visible = kv; scene.background = bgs; Object.values(mk).forEach((m) => m.dispose());
    const cls = { fur: [], cloth: [] }, near = (a, b) => Math.abs(a - b) < 10;
    for (let i = 0; i < mask.length; i += 4) { const r = mask[i], g = mask[i + 1], b = mask[i + 2]; const c = near(r, 255) && near(g, 0) && near(b, 255) ? 'fur' : near(r, 0) && near(g, 255) && near(b, 255) ? 'cloth' : null; if (c) cls[c].push(i); }
    const lum = (i) => 0.2126 * full[i] + 0.7152 * full[i + 1] + 0.0722 * full[i + 2], out = {};
    for (const [k, idx] of Object.entries(cls)) { idx.sort((a, b) => lum(b) - lum(a)); const top = idx.slice(0, Math.max(1, idx.length >> 1)); let r = 0, g = 0, b = 0, L = 0; for (const i of top) { r += full[i]; g += full[i + 1]; b += full[i + 2]; L += lum(i); } const n = top.length; out[k] = { px: idx.length, litLum: +(L / n).toFixed(1), rgb: [r, g, b].map((x) => +(x / n).toFixed(1)) }; }
    return out;
  },
  separation() {
    const K = window.__kr, T = K.THREE, k = K.kitchen, out = [], lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    k.setLightsOn(1); k.setTime(0);
    for (const name of Object.keys(K.CAMERA_MARKS)) {
      K.goMark(name); const P = K.panda; P.root.visible = true; const full = K.readPixels(); P.root.visible = false; const bg = K.readPixels();
      // mask = pixels that differ between with/without Panda; head region = rows above the neck-base screen row
      const neck = new T.Vector3(0, 1.28, 0).project(K.camera), rowNeck = Math.round((1 - (neck.y * 0.5 + 0.5)) * full.height), top = new T.Vector3(0, 2.05, 0).project(K.camera);
      let n = 0, sumBg = 0; const furs = []; const d = full.data, b = bg.data;
      for (let y = 0; y < Math.min(rowNeck, full.height); y++) for (let x = 0; x < full.width; x++) { const i = (y * full.width + x) * 4; if (Math.abs(d[i] - b[i]) + Math.abs(d[i + 1] - b[i + 1]) + Math.abs(d[i + 2] - b[i + 2]) > 30) { n++; sumBg += lum(b, i); furs.push(lum(d, i)); } }
      furs.sort((a, c) => a - c); const fur = furs.length ? furs[Math.floor(furs.length * 0.9)] : 0, bgm = n ? sumBg / n : 0;
      out.push({ name, headPixels: n, furP90: +fur.toFixed(3), bgMean: +bgm.toFixed(3), ratio: n ? +(bgm / fur).toFixed(3) : null });
    }
    K.goMark('M1_establish_back'); return out;
  },
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
