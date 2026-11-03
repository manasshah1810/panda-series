import * as THREE from 'three';
import { PALETTE as C } from '../config/defaults.js';

const lin = (hex) => new THREE.Color(hex); // THREE.Color converts sRGB hex to linear working space for us

/** Shared shader patches. `fur` = soft fresnel rim + warm shadow tint + lifted floor. `band` = organic black shoulder band.
 *  Everything is procedural: no textures. Works on any MeshStandardMaterial / MeshToonMaterial. */
export function patchMaterial(mat, { rim = 0, shadowTint = null, floor = null, band = null } = {}) {
  const U = {
    uRimColor: { value: lin(C.rimTint) }, uRim: { value: rim },
    uShadowTint: { value: lin(shadowTint || '#FFFFFF') }, uShadowAmt: { value: shadowTint ? 1 : 0 },
    uFloor: { value: lin(floor || '#000000') }, uFloorAmt: { value: floor ? 1 : 0 },
    uBandColor: { value: lin(C.furBlack) }, uBandOn: { value: band ? 1 : 0 },
    uBandOffset: { value: new THREE.Vector3(...(band?.offset || [0, 0, 0])) }, uBandEdge: { value: band?.edge ?? 0.98 },
  };
  mat.userData.uniforms = U;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vObjPos;
uniform vec3 uRimColor; uniform float uRim; uniform vec3 uShadowTint; uniform float uShadowAmt; uniform vec3 uFloor; uniform float uFloorAmt;
uniform vec3 uBandColor; uniform float uBandOn; uniform vec3 uBandOffset; uniform float uBandEdge;`)
      .replace('#include <color_fragment>', `
      if (uBandOn > 0.5) {
        vec3 wp = vObjPos + uBandOffset;
        float wob = 0.030 * sin(wp.x * 7.0 + 1.3) + 0.018 * sin(wp.x * 17.0 + 0.4) + 0.016 * sin(wp.z * 9.0 + wp.x * 3.0) + 0.010 * sin(wp.y * 31.0 + wp.x * 5.0);
        float edge = uBandEdge + wob;
        float b = smoothstep(edge - 0.012, edge + 0.012, wp.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, uBandColor, b);
      }
      #include <color_fragment>`)
      .replace('#include <opaque_fragment>', `
      {
        vec3 nV = normalize(vNormal); vec3 vV = normalize(vViewPosition);
        float fr = pow(1.0 - clamp(dot(nV, vV), 0.0, 1.0), 2.6);
        vec3 upV = normalize(mat3(viewMatrix) * vec3(0.0, 1.0, 0.0));
        float topBias = 0.55 + 0.45 * clamp(dot(nV, upV), -1.0, 1.0);
        float lum = dot(outgoingLight, vec3(0.3333));
        // warm, lifted shadows (no dead grey)
        outgoingLight = mix(outgoingLight, outgoingLight * uShadowTint * 1.08 + uShadowTint * 0.012, uShadowAmt * (1.0 - smoothstep(0.08, 0.55, lum)));
        // lifted blacks so form stays readable in shade
        outgoingLight += uFloor * uFloorAmt * 0.7 * (1.0 - smoothstep(0.0, 0.12, lum)) * (0.45 + 0.55 * clamp(dot(nV, upV) * 0.5 + 0.5, 0.0, 1.0));
        outgoingLight += uRimColor * fr * topBias * uRim * (0.4 + 0.6 * clamp(diffuseColor.r * 3.0 + 0.4, 0.0, 1.0));
      }
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'fur' + (band ? 'B' : '') + (rim ? 'R' : '');
  return mat;
}

export function makeFurMaterial(color, opts = {}) {
  opts = { rim: 0.5, ...opts };
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, vertexColors: true });
  m.envMapIntensity = 0.7;
  return patchMaterial(m, opts);
}
