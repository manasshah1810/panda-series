import * as THREE from 'three';
import { marbleTexture } from './proceduralTextures.js';
const make = (map, color, env = 0.5, cc = 0.3) => new THREE.MeshPhysicalMaterial({ map, color, roughness: 0.3, clearcoat: cc, clearcoatRoughness: 0.25, envMapIntensity: env });
/** Two different marbles: island + counters (light) and backsplash (greyer, so the white Panda separates from it). */
export function createMarbles(pal, size) {
  const island = make(marbleTexture(size, pal, { seed: 4, base: pal.marble_base, freq: 3, dir: [1, 1] }), 0xffffff, 0.5, 0.3);
  const back = make(marbleTexture(size, pal, { seed: 21, base: pal.backsplash_marble_base, veinStrength: 1.0, freq: 3, dir: [1, 2] }), new THREE.Color('#8E8982'), 0.18, 0.15);
  island.name = 'marbleIsland'; back.name = 'marbleBack'; return { island, back };
}
