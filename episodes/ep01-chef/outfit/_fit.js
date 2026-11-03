// Episode-local helpers (kept out of the kit on purpose: only the public API is used).
import * as THREE from 'three';
export function socketBaseY(panda, name) { panda.root.updateMatrixWorld(true); const v = new THREE.Vector3(); panda.sockets[name].getWorldPosition(v); return v.y / panda.options.scale; }
/** Surface of revolution following the torso profile, between world heights y0..y1, local to a socket at world height yS. */
export function shell(panda, yS, y0, y1, pad, steps = 18, seg = 40, closedTop = false) {
  const m = panda.measure(), pr = m.torso.profile; const rad = (y) => { for (let i = 1; i < pr.length; i++) if (y <= pr[i][0]) { const t = (y - pr[i - 1][0]) / (pr[i][0] - pr[i - 1][0]); return pr[i - 1][1] + (pr[i][1] - pr[i - 1][1]) * t; } return pr[pr.length - 1][1]; };
  const pts = []; for (let i = 0; i <= steps; i++) { const y = y0 + ((y1 - y0) * i) / steps; pts.push(new THREE.Vector2(rad(Math.max(y, pr[0][0])) + pad, y - yS)); }
  const g = new THREE.LatheGeometry(pts, seg); g.scale(1, 1, m.torso.radii[2] / m.torso.radii[0]); return g;
}

/** Tube along a FRONT-facing arc (angles -span..span, 0 = +Z) hugging the torso at world height y. A full ring would collide with the arms. */
export function arcTube(panda, fitRing, y, pad, span, radius, mat, yS, n = 28, zFn = null) {
  const r = fitRing(y, pad), pts = [];
  for (let i = 0; i <= n; i++) { const a = -span + (2 * span * i) / n; const x = Math.sin(a) * r.rx, z = Math.cos(a) * r.rz; pts.push(new THREE.Vector3(x, y - yS, zFn ? zFn(x, y, z) : z)); }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, radius, 8, false), mat);
}
/** Z of the belly bump surface (measure().belly ellipsoid) at x,y; -Infinity when outside it. */
export function bellyZ(m, x, y) { const b = m.belly, nx = (x - b.center[0]) / b.radii[0], ny = (y - b.center[1]) / b.radii[1], t = 1 - nx * nx - ny * ny; return t > 0 ? b.center[2] + b.radii[2] * Math.sqrt(t) : -Infinity; }
