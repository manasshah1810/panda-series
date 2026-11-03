import * as THREE from 'three';
import { steelRoughnessTexture } from './proceduralTextures.js';
/** Brushed steel (also used, tinted per instance, for copper pans: metal colour tints the reflection). */
export function createSteel(pal, size) {
  const m = new THREE.MeshStandardMaterial({ color: pal.steel, metalness: 1, roughness: 0.55, roughnessMap: steelRoughnessTexture(size), envMapIntensity: 0.9 });
  m.name = 'steel'; return m;
}
