import * as THREE from 'three';
import { createKitchen } from '../kitchen/src/index.js';
import { createPanda } from '../../../panda-kit/src/index.js';
import chefOutfit from '../outfit/chefOutfit.js';
import { createKnife } from '../props/knife/knife.js';
import { createWoodenTitle } from '../title/woodenTitle.js';
import { createOpening } from '../timeline/openingTimeline.js';
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
const panda = createPanda({ quality: q.get('quality') || 'medium', style: 'softClay', pose: 'neutralStand', receiveShadow: true, castShadow: true });
panda.equip(chefOutfit); scene.add(panda.root);
for (const l of kitchen.lights?.strips ?? []) l.visible = false;   // two faint under-shelf points: invisible at this framing, but they cost every pixel
const env = scene.environment ?? null;
const knife = createKnife({ envMap: env }); const title = createWoodenTitle({ envMap: env }); scene.add(title.group);
const op = createOpening({ scene, camera, kitchen, panda, knife, title, marks, renderer });
const render = () => renderer.render(scene, camera);
window.__op = {
  THREE, op, scene, camera, renderer, kitchen, panda, knife, title,
  setSize(w, h) { renderer.setSize(w, h); camera.aspect = w / h; },
  seek(t) { camera.aspect = renderer.domElement.width / renderer.domElement.height; op.seek(t); render(); },
  frame(t) { window.__op.seek(t); return renderer.domElement.toDataURL('image/png'); },
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
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) { t += dt; if (t >= END) { t = END; setPlaying(false); } }
    op.seek(t); renderer.shadowMap.needsUpdate = !playing || (frame++ & 1) === 0 || dt === 0; renderer.render(scene, camera); tl.value = t; cur.textContent = t.toFixed(1) + ' / ' + END.toFixed(0) + 's';
    // dynamic resolution: keep ~60 fps on slow GPUs, sharpen when there is headroom (hysteresis, adjusted every 20 frames)
    acc += dt * 1000; n++;
    if (n >= 20) { const ms = acc / n; acc = 0; n = 0; if (playing) { let s = scale; if (ms > 19) s = Math.max(DPR_MIN, scale * 0.85); else if (ms < 12 && scale < DPR_MAX) s = Math.min(DPR_MAX, scale * 1.1); if (Math.abs(s - scale) > 0.01) { scale = s; resize(); } } }
  };
  loading.remove(); bar.style.display = 'flex'; setPlaying(true); last = performance.now(); requestAnimationFrame(loop);
}
