import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
/** RoomEnvironment through PMREM (no HDRI files). Kitchen materials get the texture as `envMap` explicitly, so the Panda is unaffected. */
export function createEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(), rt = pmrem.fromScene(room, 0.04);
  room.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); pmrem.dispose();
  return { texture: rt.texture, dispose: () => rt.dispose() };
}
