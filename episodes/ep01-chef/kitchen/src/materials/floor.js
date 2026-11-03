import * as THREE from 'three';
import { floorTexture, plasterTexture } from './proceduralTextures.js';
export function createRoomMaterials(pal, size) {
  const floor = new THREE.MeshStandardMaterial({ map: floorTexture(size, pal), roughness: 0.45, envMapIntensity: 0.22 });
  const plaster = new THREE.MeshStandardMaterial({ map: plasterTexture(Math.min(size, 512), pal), roughness: 0.92, envMapIntensity: 0.25 });
  floor.name = 'floor'; plaster.name = 'plaster'; floor.userData.noCast = true; return { floor, plaster };
}
