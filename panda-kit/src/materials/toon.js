import * as THREE from 'three';
import { patchMaterial } from './furMaterial.js';

/** 4-step gradient map generated on a canvas (no image files). */
export function makeGradientMap(steps = 4) {
  const c = document.createElement('canvas'); c.width = steps; c.height = 1; const g = c.getContext('2d');
  for (let i = 0; i < steps; i++) { const v = Math.round(70 + (185 * i) / (steps - 1)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i, 0, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
export const toonMaterial = (color, gradientMap, opts = {}) => patchMaterial(new THREE.MeshToonMaterial({ color, gradientMap, vertexColors: true }), { ...opts, rim: 0 });

/** Inverted-hull outline: back faces extruded along normals, thickness ~constant in screen space. */
export function makeOutlineMaterial(color = '#2a2022', thickness = 0.0065) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uColor: { value: new THREE.Color(color) }, uThick: { value: thickness } },
    vertexShader: `uniform float uThick; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal);
      mv.xyz += n * uThick * -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor,1.0);
#include <colorspace_fragment>
}`,
  });
}
