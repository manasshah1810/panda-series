import * as THREE from 'three';
import { createKitchen } from '../kitchen/src/index.js';
import { createPanda } from '../../../panda-kit/src/index.js';
import chefOutfit from '../outfit/chefOutfit.js';
import { createKnife } from '../props/knife/knife.js';
import { createWoodenTitle } from '../title/woodenTitle.js';
import { createOpening } from '../timeline/openingTimeline.js';
import marks from '../review/openingMarks.json';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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
