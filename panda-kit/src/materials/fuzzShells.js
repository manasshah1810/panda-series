import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Peach-fuzz halo: N shells of a LOW-RES copy of a mesh, pushed along the normals, alpha from a cheap object-space hash,
 *  merged into ONE mesh per body part (1 draw call). Materials are SHARED (one per colour) so the material count stays small.
 *  Low frequency + soft alpha + fresnel weighting = a soft fuzzy silhouette without shimmer. */
export function makeFuzzMaterial(color = '#FFF6EA', { length = 0.012, density = 90, opacity = 0.08 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uLen: { value: length }, uColor: { value: new THREE.Color(color) }, uDen: { value: density }, uOp: { value: opacity } },
    vertexShader: `uniform float uLen; attribute float aK; varying float vK; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ vK = aK; vP = position; vec3 p = position + normal * uLen * aK; vec4 mv = modelViewMatrix * vec4(p,1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uDen, uOp; uniform vec3 uColor; varying float vK; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      float h(vec3 c){ return fract(sin(dot(c, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){
        float r = h(floor(vP * uDen + vK * 7.0)); float a = smoothstep(vK * 0.8, 1.0, r) * (1.0 - vK * 0.8);
        float fr = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 1.3);
        float al = a * uOp * (0.25 + 0.75 * fr); if (al < 0.003) discard;
        vec3 c = uColor * (0.8 + 0.2 * normalize(vN).y);
        gl_FragColor = vec4(c, al);
        #include <colorspace_fragment>
      }`,
  });
}

/** `sourceGeo`: a low-res copy of the part (same local space as the real mesh). Returns ONE mesh holding all shells. */
export function makeFuzzShells(sourceGeo, material, { shells = 6 } = {}) {
  const geos = [];
  for (let i = 1; i <= shells; i++) {
    const g = sourceGeo.clone(); g.deleteAttribute('uv'); g.deleteAttribute('color');
    const n = g.attributes.position.count; g.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(n).fill(i / shells), 1)); geos.push(g);
  }
  const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, material); mesh.name = 'fuzz'; mesh.userData.pandaPart = 'fuzz'; mesh.renderOrder = 5; mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}
