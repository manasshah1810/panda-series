import * as THREE from 'three';
import { fitRing } from '@panda-series/panda-kit/outfits/fit.js';
import { socketBaseY, arcTube, bellyZ } from './_fit.js';

const std = (color, rough = 0.95, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

/** Chef outfit: toque (headTop), apron + waist tie + pocket (torsoWrap), neckerchief (neckBase). Public API only. */
export default {
  id: 'chefOutfit', version: '1.0.0', anchors: ['headTop', 'torsoWrap', 'neckBase'],
  build(panda) {
    const m = panda.measure(), group = new THREE.Group();
    const cloth = std('#F3EFE6'), navy = std('#2F4B6E'), red = std('#C8553D');

    // ---- toque: banded cylinder + puffy crown (lathe) sized from the head ellipsoid ----
    const hr = m.head.radii[0] * 0.5, hat = new THREE.Group(); hat.userData.socket = 'headTop'; hat.name = 'toque';
    const prof = [[0, 0], [hr * 1.02, 0], [hr * 1.04, 0.06], [hr * 1.0, 0.14], [hr * 1.12, 0.2], [hr * 1.35, 0.27], [hr * 1.46, 0.36], [hr * 1.36, 0.46], [hr * 1.05, 0.51], [hr * 0.5, 0.53], [0, 0.53]];
    const lathe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)).map((v, i, a) => i === 0 ? new THREE.Vector2(0.001, v.y) : v), 40);
    const crown = new THREE.Mesh(lathe, cloth); crown.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.06, hr * 1.06, 0.045, 40, 1, true), navy); band.position.y = 0.075;
    hat.add(crown, band); hat.position.y = -0.045; hat.rotation.x = -0.1; group.add(hat);

    // ---- apron: curved front panel hugging the torso (fitRing per height) + waist tie + pocket ----
    const yS = socketBaseY(panda, 'torsoWrap'), apron = new THREE.Group(); apron.userData.socket = 'torsoWrap'; apron.name = 'apron';
    const top = m.torso.maxY - 0.38, bot = m.torso.minY + 0.18, cols = 36, rows = 20, span = 1.15; // radians either side of front
    const pos = [], idx = [];
    for (let j = 0; j <= rows; j++) { const y = top + ((bot - top) * j) / rows, r = fitRing(Math.max(y, m.torso.minY + 0.02), 0.055); for (let i = 0; i <= cols; i++) { const a = (-span + (2 * span * i) / cols); const x = Math.sin(a) * r.rx; pos.push(x, y - yS, Math.max(Math.cos(a) * r.rz + 0.02, bellyZ(m, x, y) + 0.045)); } }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const panel = new THREE.Mesh(g, std('#F3EFE6', 0.95, { side: THREE.DoubleSide })); panel.castShadow = true; apron.add(panel);
    const wy = m.torso.minY + 0.32, tie = arcTube(panda, fitRing, wy, 0.07, 1.2, 0.028, navy, yS, 28, (x, y, z) => Math.max(z + 0.02, bellyZ(m, x, y) + 0.05)); apron.add(tie);
    for (const sg of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), navy); const wr = fitRing(wy, 0.07); k.position.set(sg * Math.sin(1.2) * wr.rx, wy - yS, Math.max(Math.cos(1.2) * wr.rz + 0.02, bellyZ(m, sg * Math.sin(1.2) * wr.rx, wy) + 0.05)); k.scale.set(1, 0.8, 0.8); apron.add(k); }
    const pr = fitRing(m.torso.minY + 0.5, 0.075), pocket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.17, 0.02), std('#E4DED2')); pocket.position.set(0, pr.y - yS, Math.max(pr.rz, bellyZ(m, 0, pr.y)) + 0.075); apron.add(pocket);
    group.add(apron);

    // ---- neckerchief: ring + front triangle ----
    const nk = new THREE.Group(); nk.userData.socket = 'neckBase'; nk.name = 'neckerchief';
    const ny = m.torso.maxY - 0.3, nr = fitRing(ny, 0.04), ring = arcTube(panda, fitRing, ny, 0.04, 1.15, 0.05, red, socketBaseY(panda, 'neckBase'));
    const tri = new THREE.Shape(); tri.moveTo(-0.17, 0); tri.lineTo(0.17, 0); tri.lineTo(0, -0.24); tri.closePath();
    const flap = new THREE.Mesh(new THREE.ShapeGeometry(tri), std('#C8553D', 0.95, { side: THREE.DoubleSide })); flap.position.set(0, ny - socketBaseY(panda, 'neckBase') - 0.01, nr.rz + 0.005); flap.rotation.x = -0.25;
    nk.add(ring, flap); group.add(nk);
    return group;
  },
};
