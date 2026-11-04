import * as THREE from 'three';
import { fitRing, torsoSurfaceZ, std, ribbon, surfNormal, onSurface, merge, socketBaseY } from './_fit.js';

/** Pocket centre on the apron (panda-local x, y). Moved to the right chest so the right paw can actually reach it. */
export const POCKET = Object.freeze({ x: -0.2, y: 0.97, halfH: 0.07 });

/** Chef outfit: pleated toque (headTop), apron + pocket + waist tie with back bow (torsoWrap), neckerchief (neckBase).
 *  Public kit API only. Everything follows the torso surface (torsoSurfaceZ) with a small normal offset, so nothing z-fights. */
export default {
  id: 'chefOutfit', version: '1.1.0', anchors: ['headTop', 'torsoWrap', 'neckBase'],
  build(panda) {
    const m = panda.measure(), group = new THREE.Group();
    const cloth = std('#CFDFEA'), navy = std('#2F4B6E'), red = std('#C8553D'), pocketM = std('#E4EEF5'), stitchM = std('#7F93A6');
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    // ---- toque: snug band + pleated puffy dome (lathe, radius modulated by vertical pleats), seated between the ears ----
    const hat = new THREE.Group(); hat.userData.socket = 'headTop'; hat.name = 'toque';
    const hr = 0.265, prof = [[0.001, -0.03], [hr, -0.03], [hr + 0.005, 0.03], [hr + 0.012, 0.08], [0.3, 0.17], [0.38, 0.26], [0.43, 0.35], [0.41, 0.44], [0.32, 0.51], [0.17, 0.545], [0.001, 0.55]];
    const lg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 72), p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = THREE.MathUtils.smoothstep(y, 0.07, 0.3) * (1 - THREE.MathUtils.smoothstep(y, 0.44, 0.55)); const f = 1 + 0.06 * Math.sin(a * 12) * k; p.setX(i, x * f); p.setZ(i, z * f * 0.9); }
    lg.computeVertexNormals();
    const crown = new THREE.Mesh(lg, cloth); crown.castShadow = true;
    const band = new THREE.Mesh(new THREE.TorusGeometry(hr + 0.004, 0.022, 10, 48), navy); band.rotation.x = Math.PI / 2; band.scale.set(1, 0.9, 1); band.position.y = 0.005;
    band.scale.set(1, 0.9, 1); hat.add(crown, band); hat.position.y = -0.005; hat.rotation.set(-0.07, 0, 0.04); group.add(hat);

    // ---- apron: grid following the torso surface, bib narrowing to the top, curved hem, rounded corners ----
    const yS = socketBaseY(panda, 'torsoWrap'), apron = new THREE.Group(); apron.userData.socket = 'torsoWrap'; apron.name = 'apron';
    const yTop = 1.2, yBot = 0.34, cols = 28, rows = 26, OFF = 0.011, pos = [], idx = [];
    const half = (y) => { const t = (yTop - y) / (yTop - yBot); return 0.2 + 0.32 * THREE.MathUtils.smoothstep(t, 0.0, 0.32) - 0.04 * Math.max(0, t - 0.7) / 0.3; };
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      for (let i = 0; i <= cols; i++) {
        const u = (i / cols) * 2 - 1, y0 = yTop + (yBot - yTop) * v, hem = 0.035 * u * u * v, y = y0 + hem * (j === rows ? 1 : v) * 0.0 + (v > 0.97 ? 0.03 * u * u : 0), x = u * half(y0);
        const q = onSurface(x, y, OFF, yS); pos.push(q.x, q.y, q.z);
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const panel = new THREE.Mesh(g, cloth); panel.castShadow = true; apron.add(panel);

    // neck straps: from the bib corners up over the shoulders
    for (const s of [-1, 1]) {
      const pts = [], nrm = []; for (let i = 0; i <= 8; i++) { const t = i / 8, x = s * (0.19 - 0.07 * t), y = yTop - 0.02 + 0.2 * t; pts.push(onSurface(x, y, OFF + 0.012, yS)); nrm.push(surfNormal(x, y)); }
      apron.add(new THREE.Mesh(ribbon(pts, nrm, () => 0.022, () => 0.007), navy));
    }
    // pocket: real thickness (extruded rounded rect) + stitch dashes, sitting on the apron surface
    const rr = new THREE.Shape(), W = 0.1, H = 0.07, R = 0.02; rr.moveTo(-W + R, -H); rr.lineTo(W - R, -H); rr.quadraticCurveTo(W, -H, W, -H + R); rr.lineTo(W, H - R); rr.quadraticCurveTo(W, H, W - R, H); rr.lineTo(-W + R, H); rr.quadraticCurveTo(-W, H, -W, H - R); rr.lineTo(-W, -H + R); rr.quadraticCurveTo(-W, -H, -W + R, -H);
    const pg = new THREE.ExtrudeGeometry(rr, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 6 });
    const pocket = new THREE.Mesh(pg, pocketM); pocket.castShadow = true;
    const px = POCKET.x, py = POCKET.y, pq = onSurface(px, py, OFF + 0.002, yS), pn = surfNormal(px, py); pocket.position.copy(pq); pocket.quaternion.setFromUnitVectors(V(0, 0, 1), pn); apron.add(pocket);
    const dashes = []; for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, d = new THREE.CapsuleGeometry(0.0026, 0.01, 2, 4); d.rotateZ(a + Math.PI / 2); d.translate(Math.cos(a) * (W - 0.012) * 1.0, Math.sin(a) * (H - 0.012), 0.018); dashes.push(d); }
    const st = new THREE.Mesh(merge(dashes), stitchM); st.position.copy(pocket.position); st.quaternion.copy(pocket.quaternion); apron.add(st);

    // waist tie: flat band all the way round the apron waist, bow at the back
    const wy = 0.74, pts = [], nrm = [], N = 56;
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2 - Math.PI, r = fitRing(wy, 0), x = Math.sin(a) * (r.rx + 0.026), z = Math.cos(a) * (r.rz + 0.026), zf = a > -Math.PI / 2 && a < Math.PI / 2 ? Math.max(z, torsoSurfaceZ(Math.min(Math.abs(x), r.rx * 0.98) * Math.sign(x), wy) + 0.034) : z; pts.push(V(x, wy - yS, zf)); nrm.push(V(Math.sin(a), 0, Math.cos(a)).normalize()); }
    apron.add(new THREE.Mesh(ribbon(pts, nrm, () => 0.03, () => 0.009), navy));
    const rb = fitRing(wy, 0.03), bowZ = -rb.rz - 0.02, bow = new THREE.Group(); bow.position.set(0, wy - yS, bowZ);
    for (const s of [-1, 1]) { const lp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), navy); lp.scale.set(1, 0.6, 0.35); lp.position.set(s * 0.06, 0.01, -0.012); lp.rotation.z = s * -0.25; const tail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.008), navy); tail.position.set(s * 0.04, -0.09, -0.012); tail.rotation.z = s * 0.28; bow.add(lp, tail); }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), navy); knot.scale.set(1, 0.9, 0.7); knot.position.z = -0.006; bow.add(knot); bow.rotation.x = 0; apron.add(bow);
    group.add(apron);

    // ---- neckerchief: soft tapered band on the neck/shoulders, small knot at the front, gentle sag ----
    const nk = new THREE.Group(); nk.userData.socket = 'neckBase'; nk.name = 'neckerchief'; const yN = socketBaseY(panda, 'neckBase');
    const np = [], nn = [], K = 30, ny = 1.1;
    for (let i = 0; i <= K; i++) { const u = (i / K) * 2 - 1, x = u * 0.38, y = ny + 0.07 * u * u; np.push(onSurface(x, y, 0.03, yN)); nn.push(surfNormal(x, y)); }
    nk.add(new THREE.Mesh(ribbon(np, nn, (u) => 0.05 - 0.02 * Math.abs(u * 2 - 1), () => 0.014), red));
    const tri = new THREE.Shape(); tri.moveTo(-0.07, 0); tri.quadraticCurveTo(0, 0.01, 0.07, 0); tri.lineTo(0.0, -0.17); tri.closePath();
    const flap = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 2 }), red);
    const fz = torsoSurfaceZ(0, ny - 0.06) + 0.05; flap.position.set(0, ny - 0.04 - yN, fz); flap.rotation.x = -0.3;
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), red); kn.scale.set(1.1, 0.8, 0.8); kn.position.set(0, ny - 0.045 - yN, fz + 0.004);
    nk.add(flap, kn); group.add(nk);
    return group;
  },
};
