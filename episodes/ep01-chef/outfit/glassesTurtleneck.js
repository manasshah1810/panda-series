import * as THREE from 'three';
import { fitRing } from '@panda-series/panda-kit/outfits/fit.js';
import { shell, socketBaseY, arcTube } from './_fit.js';

/** Reuse proof (built from the kit's _template.js): round glasses on `eyeBridge` + a turtleneck shell/collar on `neckBase`. */
export default {
  id: 'glassesTurtleneck', version: '1.0.0', anchors: ['eyeBridge', 'neckBase'],
  build(panda) {
    const m = panda.measure(), group = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: '#4A3326', roughness: 0.45, metalness: 0.2 });
    const lens = new THREE.MeshStandardMaterial({ color: '#BFD3E6', roughness: 0.05, transparent: true, opacity: 0.14, depthWrite: false });
    const wool = new THREE.MeshStandardMaterial({ color: '#8A5A44', roughness: 0.97 });

    // glasses: spacing + size from the head ellipsoid, no absolute coordinates
    const g = new THREE.Group(); g.userData.socket = 'eyeBridge'; g.name = 'glasses';
    const spacing = m.head.radii[0] * 0.35, R = m.head.radii[0] * 0.17;
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 10, 36), frame); rim.position.set(s * spacing, 0, 0.115);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(R, 28), lens); glass.position.copy(rim.position);
      const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.5, 6), frame); temple.rotation.set(Math.PI / 2, 0, s * -0.12); temple.position.set(s * (spacing + R * 1.25), 0, -0.11);
      g.add(rim, glass, temple);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(spacing * 0.42, 0.01, 8, 16, Math.PI), frame); bridge.position.set(0, 0.015, 0.115); g.add(bridge);
    group.add(g);

    // turtleneck: a thin shell over the shoulders (hides the band while worn) + rolled collar
    const yS = socketBaseY(panda, 'neckBase'), nb = new THREE.Group(); nb.userData.socket = 'neckBase'; nb.name = 'turtleneck';
    const body = new THREE.Mesh(shell(panda, yS, m.torso.maxY - 0.5, m.torso.maxY - 0.04, 0.02), wool); body.castShadow = true;
    const collar = arcTube(panda, fitRing, m.torso.maxY - 0.3, 0.03, 1.25, 0.075, wool, yS);
    nb.add(body, collar); group.add(nb);
    return group;
  },
};
