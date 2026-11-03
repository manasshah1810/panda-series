import * as THREE from 'three';

/** Lighting presets live in the demo only; the Panda never owns lights. */
const PRESETS = {
  studio: { bg: '#3a3a44', amb: ['#c9cfe0', 0.8], lights: [['#fff1dd', 2.5, [3, 4, 4]], ['#cfe0ff', 1.5, [-4, 2, 3]], ['#ffe9cc', 2.2, [-1, 3, -4]]], env: 0.8 },
  kitchen: { bg: '#4a3a2c', amb: ['#ffd9a8', 0.5], lights: [['#ffcf94', 3.0, [2, 5, 3]], ['#ffe3c0', 1.0, [-4, 2, 2]], ['#ffd2a0', 1.8, [0, 3, -4]]], env: 0.45 },
  night: { bg: '#10172b', amb: ['#6e86c8', 0.5], lights: [['#8fb0ff', 1.8, [-3, 4, 3]], ['#4d6fd1', 1.2, [4, 2, 2]], ['#9fc0ff', 2.4, [0, 3, -4]]], env: 0.3 },
  rim: { bg: '#1a1620', amb: ['#8a7a96', 0.4], lights: [['#ffe6cc', 1.7, [2, 3, 4]], ['#cdbfe0', 0.7, [-3, 2, 4]], ['#ffd8b0', 4.2, [-3, 3, -3.5]]], env: 0.28 },
};
export const lightingNames = Object.keys(PRESETS);

export function createLighting(scene, renderer) {
  const group = new THREE.Group(); scene.add(group);
  const key = new THREE.DirectionalLight();
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.05; key.shadow.radius = 5;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 0.5, far: 14 });
  const fill = new THREE.DirectionalLight(); const back = new THREE.DirectionalLight();
  const amb = new THREE.AmbientLight();
  group.add(key, fill, back, amb, key.target);
  key.castShadow = true;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: '#55505c', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; floor.receiveShadow = true; group.add(floor);
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
      scene.background = new THREE.Color(p.bg); floor.material.color.set(p.bg).multiplyScalar(1.15);
      amb.color.set(p.amb[0]); amb.intensity = p.amb[1];
      [key, fill, back].forEach((l, i) => { const [c, n, pos2] = p.lights[i]; l.color.set(c); l.intensity = n; l.position.set(...pos2); });
      scene.environmentIntensity = p.env;
    },
    silhouette(on) { group.visible = !on; scene.background = new THREE.Color(on ? '#ffffff' : PRESETS[api.current].bg); },
  };
  api.apply('studio');
  return api;
}
