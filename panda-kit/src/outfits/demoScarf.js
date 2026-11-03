import * as THREE from 'three';
import gsap from 'gsap';
import { fitRing } from './fit.js';

/** Tiny neutral example outfit: a knitted scarf at the neck with one hanging tail that sways (elastic, scrub-safe). */
export default {
  id: 'demoScarf', version: '1.0.0', anchors: ['neckBase'],
  build(panda) {
    const m = panda.measure(), group = new THREE.Group();
    const wool = new THREE.MeshStandardMaterial({ color: '#C8553D', roughness: 0.95 });
    const stripe = new THREE.MeshStandardMaterial({ color: '#F2E3C6', roughness: 0.95 });
    const holder = new THREE.Group(); holder.userData.socket = 'neckBase'; holder.name = 'scarf';
    const r = fitRing(m.torso.maxY - 0.24, 0.025);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 12, 48), wool); ring.scale.set(r.rx, r.rz, 1); ring.rotation.x = Math.PI / 2; ring.position.y = -0.02;
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.078, 12, 48, Math.PI / 3), stripe); band.scale.copy(ring.scale); band.rotation.copy(ring.rotation); band.position.copy(ring.position); band.rotation.z = 0.4;
    // hanging tail, pivoting at the knot
    const tail = new THREE.Group(); tail.name = 'scarfTail'; tail.position.set(r.rx * 0.55, -0.02, r.rz * 0.7);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.34, 6, 12), wool); body.position.y = -0.2; body.scale.set(1.2, 1, 0.45);
    tail.add(body); holder.add(ring, band, tail); group.add(holder);
    group.userData.tail = tail; return group;
  },
  animate(panda) { // call-once timeline: nudge the tail with elastic follow-through
    const tail = panda.sockets.neckBase.getObjectByName('scarfTail'); const tl = gsap.timeline({ paused: true });
    if (tail) tl.fromTo(tail.rotation, { z: 0.35, x: -0.2 }, { z: 0, x: 0, duration: 1.4, ease: 'elastic.out(1,0.3)', immediateRender: false });
    return tl;
  },
};
