import * as THREE from 'three';
export function createCeramics(pal) {
  const white = new THREE.MeshPhysicalMaterial({ color: pal.ceramic_white_warm, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
  const dark = new THREE.MeshPhysicalMaterial({ color: pal.ceramic_dark_vase, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: pal.cooktop_glass, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.45 });
  white.name = 'ceramic'; dark.name = 'ceramicDark'; glass.name = 'cooktopGlass'; return { white, dark, glass };
}
