import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Faint peach-fuzz: N shells of a LOW-RES copy of the mesh, pushed along the normals, alpha from a cheap object-space hash.
 *  All shells are merged into ONE mesh with a per-vertex layer attribute (1 draw call, 1 material). High tier only.
 *  Low frequency + soft alpha so it does not shimmer. Returns a Group; panda.dispose() frees geometry + material. */
export function makeFuzzShells(sourceMesh, { shells = 6, length = 0.018, color = '#FFF6EA', density = 90, opacity = 0.07 } = {}) {
  const geos = [];
  for (let i = 1; i <= shells; i++) {
    const g = sourceMesh.geometry.clone(); g.deleteAttribute('uv'); g.deleteAttribute('color');
    const n = g.attributes.position.count; g.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(n).fill(i / shells), 1)); geos.push(g);
  }
  const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uLen: { value: length }, uColor: { value: new THREE.Color(color) }, uDen: { value: density }, uOp: { value: opacity } },
    vertexShader: `uniform float uLen; attribute float aK; varying float vK; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ vK = aK; vP = position; vec3 p = position + normal * uLen * aK; vec4 mv = modelViewMatrix * vec4(p,1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uDen, uOp; uniform vec3 uColor; varying float vK; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      float h(vec3 c){ return fract(sin(dot(c, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){
        float r = h(floor(vP * uDen + vK * 7.0)); float a = smoothstep(vK * 0.85, 1.0, r) * (1.0 - vK);
        float fr = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 1.5);
        float al = a * uOp * (0.4 + 0.6 * fr); if (al < 0.003) discard;
        gl_FragColor = vec4(uColor, al);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(merged, mat); mesh.name = 'fuzz'; mesh.renderOrder = 5; mesh.castShadow = false;
  const group = new THREE.Group(); group.name = 'fuzzShells'; group.add(mesh); group.userData.materials = [mat];
  return group;
}
