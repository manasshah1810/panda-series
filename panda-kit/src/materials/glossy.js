import * as THREE from 'three';
import { PALETTE as C } from '../config/defaults.js';
export const glossyEye = () => new THREE.MeshPhysicalMaterial({ vertexColors: true, color: C.eyeDark, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.8 });
export const glossyNose = () => new THREE.MeshPhysicalMaterial({ color: C.noseAndEyes, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
