import * as THREE from 'three';
/** Soft additive prism: the window rectangle extruded along the sun direction. Edge-faded by view angle, so it reads as a gentle shaft. */
export function createLightShaft(cfg, sunDir) {
  const R = cfg.room, W = cfg.window, x = R.rightWallX - 0.03, z0 = W.centerZ - W.width / 2, z1 = W.centerZ + W.width / 2, y0 = W.sillY, y1 = W.sillY + W.height, len = 6.5;
  const c = [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]].map((p) => new THREE.Vector3(...p)), far = c.map((p) => p.clone().addScaledVector(sunDir, len));
  const pos = [], ln = []; const quad = (a, b, d, e, la, lb) => { pos.push(...a.toArray(), ...b.toArray(), ...d.toArray(), ...a.toArray(), ...d.toArray(), ...e.toArray()); ln.push(la, la, lb, la, lb, lb); };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(c[i], c[j], far[j], far[i], 0, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aLen', new THREE.Float32BufferAttribute(ln, 1)); g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#FFE2B8') }, uOpacity: { value: 0.1 } },
    vertexShader: `attribute float aLen; varying float vLen; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ vLen=aLen; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vLen; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ float e=pow(abs(dot(normalize(vN),normalize(vV))),1.4); float a=e*smoothstep(0.0,0.12,vLen)*(1.0-smoothstep(0.35,1.0,vLen)); a*=smoothstep(0.0,0.35,vW.y)*step(vW.x,4.4)*step(-4.55,vW.x); gl_FragColor=vec4(uColor*a*uOpacity,1.0); }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.name = 'lightShaft'; mesh.frustumCulled = false; mesh.renderOrder = 5;
  return { mesh, mat, bounds: { c, far } };
}
