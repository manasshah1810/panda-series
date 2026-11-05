import * as THREE from 'three';
/** Window key (the only shadow caster), hemisphere fill, camera-side fill, cool rim, hood spot, two cheap under-shelf points. */
export function createLights(cfg, root) {
  const L = cfg.lights, S = cfg.shelves, zb = cfg.room.backWallZ, H = cfg.backCounter.hood;
  const sun = new THREE.DirectionalLight('#FFE9CC', 2.6); sun.name = 'windowLight'; sun.position.set(...L.window.pos); sun.target.position.set(...L.window.target);
  sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -6.5, right: 6.5, top: 5, bottom: -5, near: 1, far: 26 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  const hemi = new THREE.HemisphereLight('#EEE8DE', '#92867A', 0.62); hemi.name = 'skyFill';
  const fill = new THREE.DirectionalLight('#FFF1DE', 0.7); fill.name = 'cameraFill'; fill.position.set(...L.fill.pos); fill.target.position.set(...L.fill.target);
  const rim = new THREE.DirectionalLight('#DCE7F4', 1.1); rim.name = 'rimLight'; rim.position.set(...L.rim.pos); rim.target.position.set(...L.rim.target);
  const hood = new THREE.SpotLight('#FFD9A8', 5, 4.5, 1.0, 1.0, 2); hood.name = 'hoodLight'; hood.position.set(H.x, H.bottomY - 0.06, zb + H.bottomD / 2); hood.target.position.set(H.x, 1.0, zb + H.bottomD / 2 - 0.05);
  const strips = [0, 1].map((i) => { const p = new THREE.PointLight('#FFDDB0', 0.5, 4, 2); p.name = 'shelfStrip' + i; p.position.set(2.0, S.levels[i] - 0.3, zb + S.depth + 0.25); return p; });
  const spot = (name, c, i, d) => { const l = new THREE.SpotLight(c, i, d.distance, d.angle, d.penumbra, 2); l.name = name; l.position.set(...d.pos); l.target.position.set(...d.target); return l; };
  const pFront = spot('pandaFront', '#FFF6EA', 80, L.pandaFront), pRim = spot('pandaRim', '#EEF3FF', 20, L.pandaRim);
  const all = [pFront, pFront.target, pRim, pRim.target, sun, sun.target, hemi, fill, fill.target, rim, rim.target, hood, hood.target, ...strips]; all.forEach((o) => root.add(o));
  return {
    sun, hemi, fill, rim, hood, strips, pFront, pRim,
    /** mood preset m, lights-on level k (0..1) */
    apply(m, k) {
      sun.color.set(m.window.color); sun.intensity = m.window.intensity * k; sun.position.set(...m.window.pos);
      hemi.color.set(m.hemi.sky); hemi.groundColor.set(m.hemi.ground); hemi.intensity = m.hemi.intensity * k;
      fill.color.set(m.fill.color); fill.intensity = m.fill.intensity * k; rim.color.set(m.rim.color); rim.intensity = m.rim.intensity * k;
      pFront.color.set(m.pandaFront.color); pFront.intensity = m.pandaFront.intensity * k; pRim.color.set(m.pandaRim.color); pRim.intensity = m.pandaRim.intensity * k;
      hood.color.set(m.hood.color); hood.intensity = m.hood.intensity * k; strips.forEach((s) => { s.color.set(m.strip.color); s.intensity = m.strip.intensity * k; });
    },
    setShadow(size) { sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null; },
  };
}
