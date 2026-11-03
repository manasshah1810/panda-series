import * as THREE from 'three';

/** Camera views + screenshot helpers. Used by the GUI button and by scripts/screenshots.mjs through window.__review. */
export const VIEWS = {
  front: [0, 1.1, 6.5, 0, 1.0, 0], back: [0, 1.1, -6.5, 0, 1.0, 0], left: [6.5, 1.1, 0, 0, 1.0, 0], right: [-6.5, 1.1, 0, 0, 1.0, 0],
  tq_front_left: [4.6, 1.5, 4.6, 0, 1.0, 0], tq_front_right: [-4.6, 1.5, 4.6, 0, 1.0, 0], tq_back_left: [4.6, 1.5, -4.6, 0, 1.0, 0],
  top: [0, 7.5, 0.01, 0, 1.0, 0], low: [0, 0.15, 5.5, 0, 1.3, 0], high: [0, 4.6, 4.4, 0, 0.9, 0],
  face_front: [0, 1.55, 2.6, 0, 1.5, 0], face_tq: [1.45, 1.7, 2.3, 0, 1.5, 0],
  paw_palm: [1.0, 2.5, 2.0, 0.56, 1.15, 0.9, 20], paw_back: [1.0, 0.1, 2.0, 0.56, 1.15, 0.9, 20],
  ear: [1.4, 2.45, 2.5, 0.42, 1.95, -0.05, 14], tail_back: [0.8, 0.9, -2.8, 0, 0.5, -0.55, 18],
  belly_shoulder: [0.9, 1.6, 4.2, 0, 1.0, 0.2, 26], feet: [1.4, 0.5, 3.2, 0, 0.12, 0.1, 20],
};

export function installReviewApi(api) {
  const { camera, controls, renderer, scene, panda, state } = api;
  const silMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // review-only flat fill (not part of the kit palette)
  const saved = new Map();
  api.setSilhouetteMaterials = (on) => {
    panda.root.traverse((o) => { if (!o.isMesh) return; if (on) { saved.set(o, o.material); o.material = silMat; } else if (saved.has(o)) o.material = saved.get(o); });
    if (!on) saved.clear();
  };
  api.setWireframe = (on) => panda.root.traverse((o) => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = on; });
  api.setView = (name, opts = {}) => {
    const v = VIEWS[name]; if (!v) throw new Error('unknown view ' + name);
    const fov = opts.fov ?? v[6] ?? 32;
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.position.set(v[0], v[1], v[2]); controls.target.set(v[3], v[4], v[5]); controls.update();
  };
  api.setSize = (w, h) => { renderer.setPixelRatio(1); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  api.frame = () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); };
  window.__review = api; window.__views = Object.keys(VIEWS);
  api.extendGui = (gui) => {
    gui.add({ shot() {
      for (const n of Object.keys(VIEWS)) { api.setView(n); const a = document.createElement('a'); a.href = api.frame(); a.download = `panda_${n}.png`; a.click(); }
    } }, 'shot').name('Screenshot All Angles');
    gui.add({ v: 'front' }, 'v', Object.keys(VIEWS)).name('camera view').onChange((n) => api.setView(n));
  };
}
