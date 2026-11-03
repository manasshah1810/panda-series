import * as THREE from 'three';
export function createBrassCopper(pal) {
  const brass = new THREE.MeshStandardMaterial({ color: pal.brass, metalness: 1, roughness: 0.34, envMapIntensity: 0.9 });
  const copper = new THREE.MeshStandardMaterial({ color: pal.copper, metalness: 1, roughness: 0.38, envMapIntensity: 0.9 });
  brass.name = 'brass'; copper.name = 'copper'; return { brass, copper };
}
