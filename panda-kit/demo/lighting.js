import * as THREE from 'three';

/** Lighting presets live in the demo only; the Panda never owns lights. */
const PRESETS = {
  studio: { bg: '#3a3a44', amb: ['#c9cfe0', 0.8], lights: [['#fff1dd', 2.5, [3, 4, 4]], ['#cfe0ff', 1.5, [-4, 2, 3]], ['#ffe9cc', 2.2, [-1, 3, -4]]], env: 0.8 },
  kitchen: { bg: '#4a3a2c', amb: ['#ffe4c2', 0.55], lights: [['#ffddb4', 2.8, [2, 5, 3]], ['#ffeed8', 1.0, [-4, 2, 2]], ['#ffdcb0', 1.8, [0, 3, -4]]], env: 0.45, floor: 1.5 },
  night: { bg: '#141a2c', amb: ['#aeb2c2', 0.55], lights: [['#e4e6ee', 2.0, [-3, 4, 3]], ['#9fb0dc', 0.5, [4, 2, 2]], ['#dfe6ff', 2.6, [0, 3, -4]]], env: 0.32 },
  rim: { bg: '#17131c', amb: ['#8a7a96', 0.3], lights: [['#ffe6cc', 1.6, [2, 3, 4]], ['#cdbfe0', 0.4, [-3, 2, 4]], ['#ffd6a8', 16, [-3.6, 2.2, -1.8]]], rim2: ['#ffe0bd', 14, [3.2, 2.2, -3.2]], env: 0.18, floor: 0.08, rimBoost: 8 },
};
export const lightingNames = Object.keys(PRESETS);

export function createLighting(scene, renderer) {
  const group = new THREE.Group(); scene.add(group);
  const key = new THREE.DirectionalLight();
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.05; key.shadow.radius = 9; key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 0.5, far: 14 });
  const fill = new THREE.DirectionalLight(); const back = new THREE.DirectionalLight(); const back2 = new THREE.DirectionalLight(); back2.intensity = 0;
  const amb = new THREE.AmbientLight();
  group.add(key, fill, back, back2, amb, key.target);
  key.castShadow = true;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.ShadowMaterial({ opacity: 0.32 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshLambertMaterial({ color: '#55505c' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; floor.receiveShadow = true; group.add(floor);
  // soft contact shadow (procedural radial-gradient texture): grounds the feet and the belly. Demo-only, like all lighting.
  const cc = document.createElement('canvas'); cc.width = cc.height = 128; { const g = cc.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const contactTex = new THREE.CanvasTexture(cc);
  const contactMat = new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMat); contact.rotation.x = -Math.PI / 2; contact.position.set(0, 0.004, 0.02); contact.scale.set(1.6, 1.2, 1); contact.renderOrder = 1; group.add(contact);
  // procedural soft environment (no image files): gradient room
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const pos = room.geometry.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) / 10) * 0.5 + 0.5; const c = new THREE.Color('#6a6470').lerp(new THREE.Color('#c9c2d4'), t); cols.push(c.r, c.g, c.b); }
  room.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(room);
  scene.environment = pm.fromScene(env, 0.04).texture;
  const api = {
    floor, ground, current: 'studio',
    apply(name) {
      const p = PRESETS[name]; if (!p) return; api.current = name;
      scene.background = new THREE.Color(p.bg); floor.material.color.set(p.bg).multiplyScalar(1.15 * (p.floor ?? 1.8));
      amb.color.set(p.amb[0]); amb.intensity = p.amb[1];
      [key, fill, back].forEach((l, i) => { const [c, n, pos2] = p.lights[i]; l.color.set(c); l.intensity = n; l.position.set(...pos2); });
      if (p.rim2) { back2.color.set(p.rim2[0]); back2.intensity = p.rim2[1]; back2.position.set(...p.rim2[2]); } else back2.intensity = 0;
      scene.fog = new THREE.Fog(p.bg, 9, 34); api.onApply?.(p);
      scene.environmentIntensity = p.env;
    },
    silhouette(on) { group.visible = !on; scene.background = new THREE.Color(on ? '#ffffff' : PRESETS[api.current].bg); },
  };
  api.apply('studio');
  return api;
}
