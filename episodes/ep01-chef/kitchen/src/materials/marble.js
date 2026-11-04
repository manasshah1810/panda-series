import * as THREE from 'three';
import { marbleTexture, softMarbleTexture } from './proceduralTextures.js';
const make = (map, color, env = 0.5, cc = 0.3) => new THREE.MeshPhysicalMaterial({ map, color, roughness: 0.3, clearcoat: cc, clearcoatRoughness: 0.25, envMapIntensity: env });
/** Two different marbles: island + counters (light) and backsplash (light greige-cream with soft thin veins; kept clearly darker than the Panda's fur). */
export function createMarbles(pal, size) {
  const island = make(softMarbleTexture(size, pal, { seed: 4, base: pal.marble_base, vein: pal.marble_vein_light, freq: 3, dir: [1, 1], contrast: 1.15 }), new THREE.Color('#EAE6DF'), 0.45, 0.25);
  const back = make(softMarbleTexture(size, pal), new THREE.Color('#A7A29A'), 0.18, 0.15);
  island.name = 'marbleIsland'; back.name = 'marbleBack'; return { island, back };
}
