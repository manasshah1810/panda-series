import * as THREE from 'three';
import { woodTexture } from './proceduralTextures.js';
export function createWoods(pal, size) {
  const honey = new THREE.MeshStandardMaterial({ map: woodTexture(size, pal, { seed: 3 }), roughness: 0.6, envMapIntensity: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8B6A44'), roughness: 0.75, envMapIntensity: 0.25 });
  const end = new THREE.MeshStandardMaterial({ map: woodTexture(size, pal, { seed: 8, endGrain: true }), roughness: 0.55, envMapIntensity: 0.4 });
  honey.name = 'wood'; dark.name = 'woodDark'; end.name = 'woodEnd'; return { honey, dark, end };
}
