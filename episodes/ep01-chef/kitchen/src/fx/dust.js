import * as THREE from 'three';
/** Dust motes drifting in the light shaft. Pure function of uTime (Lissajous paths), so scrubbing is exact. */
export function createDust(count, shaft, seed, mulberry32) {
  const rng = mulberry32(seed + 404), { c, far } = shaft.bounds, base = new Float32Array(count * 3), ph = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const s = 0.05 + rng() * 0.8, a = rng(), b = rng(), p = new THREE.Vector3();
    const near = c[0].clone().lerp(c[1], a).lerp(c[3].clone().lerp(c[2], a), b), farp = far[0].clone().lerp(far[1], a).lerp(far[3].clone().lerp(far[2], a), b);
    p.copy(near).lerp(farp, s); base.set([p.x, Math.max(0.15, p.y), p.z], i * 3); ph.set([rng() * 6.28, rng() * 6.28, rng() * 6.28, 0.5 + rng()], i * 4);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(base, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uK: { value: 1 }, uPx: { value: 600 }, uSize: { value: 0.014 } },
    vertexShader: `uniform float uTime,uPx,uSize; attribute vec4 aPh; varying float vA;
      void main(){ vec3 p=position; float t=uTime*0.35*aPh.w; p+=vec3(sin(t+aPh.x),sin(t*0.8+aPh.y)*0.7,cos(t*1.1+aPh.z))*0.18; vec4 mv=modelViewMatrix*vec4(p,1.);
        vA=0.55+0.45*sin(uTime*1.3*aPh.w+aPh.x*3.0); gl_PointSize=max(1.5,uSize*uPx/-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uK; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float a=smoothstep(0.5,0.0,length(d)); gl_FragColor=vec4(vec3(1.0,0.9,0.72)*a*vA*0.55*uK,1.0); }`,
  });
  const pts = new THREE.Points(g, mat); pts.name = 'dust'; pts.frustumCulled = false; pts.renderOrder = 6;
  pts.onBeforeRender = (r, s, cam) => { mat.uniforms.uPx.value = (r.domElement.height / 2) * cam.projectionMatrix.elements[5]; };
  return { points: pts, mat };
}
