import * as THREE from 'three';
import { createMarbles } from './marble.js';
import { createWoods } from './wood.js';
import { createSteel } from './steel.js';
import { createBrassCopper } from './brass.js';
import { createCeramics } from './ceramic.js';
import { createRoomMaterials } from './floor.js';
import { bambooTexture, handTileTexture } from './proceduralTextures.js';

/** Builds every kitchen material for a tier. stage < 2 returns one neutral grey material (greybox review) plus the glow materials. */
export function createMaterials(cfg, tier, env, stage = 4) {
  const pal = cfg.palette, size = cfg.tiers[tier].tex, glowBase = new THREE.Color(pal.light_warm);
  const glow = new THREE.MeshBasicMaterial({ color: glowBase.clone() }); glow.name = 'glow'; glow.userData.noCast = true; glow.userData.glowBase = glowBase.clone();
  const sky = new THREE.MeshBasicMaterial({ color: new THREE.Color('#EADCC2') }); sky.name = 'windowSky'; sky.userData.noCast = true; sky.userData.glowBase = sky.color.clone();
  let m;
  if (stage < 2) {
    const grey = new THREE.MeshStandardMaterial({ color: '#B9B5AE', roughness: 0.85 }); grey.name = 'greybox';
    const floor = new THREE.MeshStandardMaterial({ color: '#8E8A84', roughness: 0.9 }); floor.name = 'greyFloor'; floor.userData.noCast = true;
    m = new Proxy({}, { get: (_, k) => (k === 'floor' ? floor : k === 'glow' ? glow : k === 'sky' ? sky : grey) });
    var list = [grey, floor, glow, sky];
  } else {
    const mar = createMarbles(pal, size), wd = createWoods(pal, size), st = createSteel(pal, size), bc = createBrassCopper(pal), cr = createCeramics(pal), rm = createRoomMaterials(pal, size);
    const steelDark = st.clone(); steelDark.color.set('#7E858B'); steelDark.roughness = 0.42; steelDark.envMapIntensity = 0.5; steelDark.name = 'steelDark';
    const leaf = new THREE.MeshStandardMaterial({ color: pal.leaf_green, roughness: 0.65, side: THREE.DoubleSide, envMapIntensity: 0.3 }); leaf.name = 'leaf';
    const twig = new THREE.MeshStandardMaterial({ color: pal.twig, roughness: 0.8, envMapIntensity: 0.2 }); twig.name = 'twig';
    const water = new THREE.MeshPhysicalMaterial({ color: '#E4EEF2', roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 }); water.name = 'water'; water.userData.noCast = true;
    const frame = new THREE.MeshStandardMaterial({ color: pal.ceramic_white_warm, roughness: 0.5, envMapIntensity: 0.3 }); frame.name = 'windowFrame';
    // Panda's home: bamboo counters, sage handmade tile, clay + cast iron + red paper lantern, bamboo outside the window
    const bamboo = new THREE.MeshStandardMaterial({ map: bambooTexture(size), roughness: 0.5, envMapIntensity: 0.3 }); bamboo.name = 'bamboo';
    const tile = new THREE.MeshStandardMaterial({ map: handTileTexture(size), roughness: 0.55, envMapIntensity: 0.15 }); tile.name = 'handTile';
    const clay = new THREE.MeshStandardMaterial({ color: '#B9714A', roughness: 0.8, envMapIntensity: 0.2 }); clay.name = 'clay';
    const iron = new THREE.MeshStandardMaterial({ color: '#34322F', roughness: 0.55, metalness: 0.5, envMapIntensity: 0.5 }); iron.name = 'castIron';
    const lantern = new THREE.MeshStandardMaterial({ color: '#C2412F', emissive: '#5A150C', emissiveIntensity: 0.7, roughness: 0.6, envMapIntensity: 0.2 }); lantern.name = 'lantern';
    const stalk = new THREE.MeshBasicMaterial({ color: '#5F8A4E', side: THREE.DoubleSide }); stalk.name = 'bambooOutside'; stalk.userData.noCast = true; stalk.userData.glowBase = stalk.color.clone();
    m = { marble: bamboo, marbleBack: tile, bamboo, clay, iron, lantern, stalk, wood: wd.honey, woodDark: wd.dark, woodEnd: wd.end, steel: st, steelDark, brass: bc.brass, copper: bc.copper, ceramic: cr.white, ceramicDark: cr.dark, glass: cr.glass, floor: rm.floor, plaster: rm.plaster, leaf, twig, frame, water, glow, sky };
    list = [...new Set([...Object.values(m), mar.island, mar.back])];
  }
  const textures = new Set();
  for (const mt of list) {
    if ('envMapIntensity' in mt) { mt.userData.envBase = mt.envMapIntensity; mt.envMap = env?.texture ?? null; }
    for (const k of ['map', 'roughnessMap', 'normalMap']) if (mt[k]) textures.add(mt[k]);
  }
  return { m, list, glowMats: [glow, sky, ...(m.stalk ? [m.stalk] : [])], dispose() { list.forEach((x) => x.dispose()); textures.forEach((t) => t.dispose()); } };
}
