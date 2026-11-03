import * as THREE from 'three';
import { fitRing, torsoSurfaceZ, ribbon, socketBaseY } from './_fit.js';

/** Reuse proof (built from the kit's _template.js): round glasses on `eyeBridge` + a turtleneck shell and rolled collar on `neckBase`. */
export default {
  id: 'glassesTurtleneck', version: '1.1.0', anchors: ['eyeBridge', 'neckBase'],
  build(panda) {
    const m = panda.measure(), group = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: '#4A3326', roughness: 0.45, metalness: 0.2 });
    const lens = new THREE.MeshStandardMaterial({ color: '#E8F1FA', roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false });
    const wool = new THREE.MeshStandardMaterial({ color: '#8A5A44', roughness: 0.97, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

    const g = new THREE.Group(); g.userData.socket = 'eyeBridge'; g.name = 'glasses';
    const spacing = m.head.radii[0] * 0.35, R = m.head.radii[0] * 0.17;
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.009, 10, 36), frame); rim.position.set(s * spacing, 0, 0.115);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(R, 28), lens); glass.position.copy(rim.position);
      const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), frame); temple.rotation.set(Math.PI / 2, 0, s * -0.12); temple.position.set(s * (spacing + R * 1.25), 0, -0.09);
      g.add(rim, glass, temple);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(spacing * 0.42, 0.008, 8, 16, Math.PI), frame); bridge.position.set(0, 0.015, 0.115); g.add(bridge);
    group.add(g);

    // turtleneck: shell following the torso incl. belly bump (full revolution, y 0.6..1.4) + thick rolled collar. Sleeves are not
    // possible with the public socket set (no arm sockets) -> documented limitation.
    const yS = socketBaseY(panda, 'neckBase'), nb = new THREE.Group(); nb.userData.socket = 'neckBase'; nb.name = 'turtleneck';
    const rows = 20, cols = 48, pos = [], idx = [], y0 = 0.6, y1 = 1.36;
    for (let j = 0; j <= rows; j++) { const y = y0 + ((y1 - y0) * j) / rows, r = fitRing(y, 0.02);
      for (let i = 0; i <= cols; i++) { const a = (i / cols) * Math.PI * 2, x = Math.sin(a) * r.rx, zc = Math.cos(a) * r.rz; const zs = zc > 0 ? Math.max(zc, torsoSurfaceZ(Math.min(Math.abs(x), r.rx * 0.98) * Math.sign(x), y) + 0.02) : zc; pos.push(x, y - yS, zs); } }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
    const body = new THREE.Mesh(sg, wool); body.castShadow = true;
    const cp = [], cn = [], cy = 1.33, K = 48; for (let i = 0; i <= K; i++) { const a = (i / K) * Math.PI * 2, r = fitRing(cy, 0.03); cp.push(new THREE.Vector3(Math.sin(a) * (r.rx - 0.0), cy - yS + 0.02, Math.cos(a) * (r.rz + 0.015))); cn.push(new THREE.Vector3(Math.sin(a), 0.2, Math.cos(a)).normalize()); }
    const collar = new THREE.Mesh(ribbon(cp, cn, () => 0.075, () => 0.05, false, 12), wool);
    nb.add(body, collar); group.add(nb);
    return group;
  },
};
