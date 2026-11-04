// Usage: node scripts/verify-kitchen.mjs [stage=4] [reviewDir]   Runs every check inside headless Chromium and prints measured numbers.
import fs from 'node:fs'; import path from 'node:path'; import { start, root } from './_harness.mjs';
const stage = Number(process.argv[2] ?? 4), outDir = process.argv[3];
const h = await start({ query: `?stage=${stage}&panda=1`, size: [640, 360] }); const { page } = h;
const R = await page.evaluate(async (stage) => {
  const K = window.__kr, T = K.THREE, k = K.kitchen, res = [], rec = (name, pass, detail) => res.push({ name, pass, detail });
  const cfg = k.config, toArr = (v) => v.toArray().map((x) => +x.toFixed(3));
  // ---- 1. budgets per tier ----
  const tiers = {}; for (const t of ['high', 'medium', 'low']) { k.setQuality(t); const s = k.stats(); tiers[t] = s; rec(`budget ${t}`, s.triangles <= cfg.budgets.triangles[t] && s.drawCalls <= cfg.budgets.drawCalls[t] && s.shadowCasters <= 1, `${s.triangles} tris (max ${cfg.budgets.triangles[t]}), ${s.drawCalls} draws (max ${cfg.budgets.drawCalls[t]}), ${s.shadowCasters} shadow caster(s)`); }
  k.setQuality('high');
  // ---- 2. NaN / finite ----
  let bad = 0; k.root.traverse((o) => { if (o.matrix.elements.some((e) => !Number.isFinite(e))) bad++; if (o.geometry) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) bad++; } });
  rec('no NaN transforms / geometry', bad === 0, `${bad} bad objects`);
  // ---- 3. placements (props sit on their supports) ----
  const floating = k.placements.filter((p) => Math.abs(p.box.min.y - p.supportY) > 0.012).map((p) => `${p.name}: minY ${p.box.min.y.toFixed(3)} vs support ${p.supportY}`);
  rec('props sit on supports (no float/sink > 12 mm)', floating.length === 0, `${k.placements.length} placements checked${floating.length ? '; ' + floating.slice(0, 6).join('; ') : ''}`);
  // ---- 4. clean zone on the island ----
  const cz = cfg.cleanZone, hits = k.placements.filter((p) => p.box.max.y > cfg.island.topY + 0.01 && p.supportY >= cfg.island.topY - 0.001 && p.box.max.x > cz.x0 && p.box.min.x < cz.x1 && p.box.max.z > cz.z0 && p.box.min.z < cz.z1).map((p) => p.name);
  rec(`island clean zone ${(cz.x1 - cz.x0).toFixed(1)} x ${(cz.z1 - cz.z0).toFixed(1)} (needs >= 2.0 x 0.8)`, hits.length === 0 && cz.x1 - cz.x0 >= 2 && cz.z1 - cz.z0 >= 0.8, hits.length ? 'occupied by ' + hits.join(',') : 'empty');
  // ---- 5. palette: no pure black / white ----
  const pure = Object.entries(cfg.palette).filter(([, v]) => /^#(000000|ffffff)$/i.test(v)).map(([n]) => n); let pureMat = 0; k._state.mats.list.forEach((m) => { if (m.color && (m.color.getHex() === 0 || m.color.getHex() === 0xffffff) && !m.map) pureMat++; });
  rec('no pure black / white in palette or flat materials', pure.length === 0 && pureMat === 0, `${pure.length} palette, ${pureMat} materials`);
  // ---- 6. Panda fit + 180 turn ----
  const P = K.ensurePanda(); P.root.visible = true; K.placePanda(Math.PI); const colls = k.colliders.filter((c) => !['ceiling'].includes(c.name)), box = new T.Box3(), margins = [];
  let worst = 9, worstAt = 0, worstWith = '';
  for (let a = 0; a <= 360; a += 10) { K.placePanda(Math.PI - (a * Math.PI) / 180); P.root.updateMatrixWorld(true); box.setFromObject(P.root, true);
    for (const c of colls) { const dx = Math.max(c.box.min.x - box.max.x, box.min.x - c.box.max.x), dy = Math.max(c.box.min.y - box.max.y, box.min.y - c.box.max.y), dz = Math.max(c.box.min.z - box.max.z, box.min.z - c.box.max.z), gap = Math.max(dx, dy, dz); if (gap < worst) { worst = gap; worstAt = a; worstWith = c.name; } } }
  K.placePanda(Math.PI); P.root.updateMatrixWorld(true); box.setFromObject(P.root, true); const size = box.getSize(new T.Vector3());
  rec('Panda turns 180 deg without touching furniture', worst > 0, `min clearance ${worst.toFixed(3)} m (at ${worstAt} deg, vs ${worstWith}); body bbox ${toArr(size)}`);
  // ---- 7. reach test (island edge, hold-two-handed) ----
  P.pose('hold-two-handed', 0); P.update(0.5); P.root.updateMatrixWorld(true); K.placePanda(Math.PI / 2, new T.Vector3(0, 0, 0.9)); P.root.updateMatrixWorld(true); box.setFromObject(P.root, true);
  const isl = cfg.island, edge = isl.x0 - isl.overhang, shift = edge - 0.03 - box.max.x; P.root.position.x += shift; P.root.updateMatrixWorld(true);
  const wp = (n) => P.sockets[n].getWorldPosition(new T.Vector3()), pl = wp('handSocketL'), pr = wp('handSocketR'), py = (pl.y + pr.y) / 2;
  rec('reach: paw centre within 0.25 of island top (two-handed hold at the island edge)', Math.abs(py - isl.topY) <= 0.25, `paws y ${pl.y.toFixed(2)}/${pr.y.toFixed(2)} vs top ${isl.topY} -> dy ${(py - isl.topY).toFixed(2)}; paw x ${pl.x.toFixed(2)}/${pr.x.toFixed(2)} (island edge ${edge.toFixed(2)})`);
  P.pose('neutralStand', 0); P.update(0.5); K.placePanda(Math.PI, new T.Vector3(0, 0, 0));
  // ---- 8. camera marks: not in a collider, clear line of sight ----
  const ray = new T.Raycaster(), meshes = []; k.root.traverse((o) => { if (o.isMesh && o.visible && !o.userData.noRay) meshes.push(o); });
  for (const [name, m] of Object.entries(K.CAMERA_MARKS)) {
    const pos = new T.Vector3(...m.position), tgt = new T.Vector3(...m.lookAt); const inside = colls.filter((c) => c.box.containsPoint(pos)).map((c) => c.name), inRoom = new T.Box3(new T.Vector3(-4.6, 0, -1.9), new T.Vector3(4.6, 5, 7)).containsPoint(pos);
    const dir = tgt.clone().sub(pos), dist = dir.length(); ray.set(pos, dir.normalize()); ray.far = dist; const hit = ray.intersectObjects(meshes, false).filter((x) => !x.object.name.includes('lightShaft')); const block = hit.length && hit[0].distance < dist - 0.15 ? `${hit[0].object.name} at ${hit[0].distance.toFixed(2)}/${dist.toFixed(2)}` : '';
    // Panda occlusion: ray to the Panda's head & belly for the mark's Panda pose (position = pandaMark)
    const tgts = [new T.Vector3(0, 1.75, 0), new T.Vector3(0, 1.1, 0)], pblock = tgts.map((t) => { const d = t.clone().sub(pos), L = d.length(); ray.set(pos, d.normalize()); ray.far = L; const hh = ray.intersectObjects(meshes, false).filter((x) => !x.object.name.includes('lightShaft')); return hh.length ? hh[0].object.name : ''; }).filter(Boolean);
    rec(`camera ${name.split('_')[0]}: inside no collider, in room, clear LOS`, !inside.length && inRoom && !block && (name.startsWith('M3') || name.startsWith('M5') || name.startsWith('M6') || !pblock.length), `${inside.length ? 'INSIDE ' + inside : 'free'}; LOS ${block || 'clear'}; panda occlusion ${pblock.join(',') || 'none'}`); }
  // ---- 9. scrub safety ----
  const grab = () => { const d = K.readPixels().data; return d; }; K.goMark('M1_establish_back'); const diff = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };
  const seq = (pairs) => { for (const [t, l] of pairs) { k.setTime(t); k.setLightsOn(l); } return grab().slice(); };
  const A = seq([[0, 0], [4.2, 1], [1.7, 0.4]]), Bf = seq([[9, 0.9], [0.3, 0.1], [1.7, 0.4]]), C = seq([[1.7, 0.4]]);
  const d1 = Math.max(diff(A, Bf), diff(A, C)); k.setTime(0); k.setLightsOn(1);
  rec('scrub-safety: setTime + setLightsOn frames identical forward/backward', d1 === 0, `max pixel diff ${d1}`);
  // ---- 10. dispose frees everything ----
  const k2 = K.createKitchen({ quality: 'high', renderer: K.renderer, stage }); const geos = new Set(), mats = new Set(), texs = new Set(); k2.root.traverse((o) => { if (o.geometry) geos.add(o.geometry); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach((m) => { mats.add(m); for (const key of ['map', 'roughnessMap', 'normalMap']) if (m[key]) texs.add(m[key]); }); });
  let g = 0, m = 0, t = 0; geos.forEach((x) => x.addEventListener('dispose', () => g++)); mats.forEach((x) => x.addEventListener('dispose', () => m++)); texs.forEach((x) => x.addEventListener('dispose', () => t++));
  K.scene.add(k2.root); K.render(); K.scene.remove(k2.root); const before = K.renderer.info.memory.geometries; k2.dispose(); K.render();
  rec('dispose() frees geometries, materials, textures', g === geos.size && m === mats.size && t === texs.size, `geometries ${g}/${geos.size}, materials ${m}/${mats.size}, textures ${t}/${texs.size}`);
  return { res, tiers };
}, stage);
// ---- 11. Panda separation (luminance) done in Node-side loop via page calls ----
let sep = [];
if (stage >= 2) {
  sep = await page.evaluate(() => window.__kr.separation());
}
const failed = []; console.log(`\n=== verify-kitchen (stage ${stage}) ===`);
for (const r of R.res) { console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n        ${r.detail}`); if (!r.pass) failed.push(r.name); }
if (sep.length) { console.log('\nPanda separation: background luminance directly behind the head vs fur (p90 of head pixels); rule = bg <= 0.75 * fur'); const must = ['M1', 'M2', 'M4', 'M8'];
  for (const s of sep) { const key = s.name.split('_')[0], req = must.includes(key), ok = s.ratio === null || s.ratio <= 0.75; console.log(`${req ? (ok ? 'PASS' : 'FAIL') : 'info'}  ${key}: head px ${s.headPixels}, fur ${s.furP90}, bg ${s.bgMean}, ratio ${s.ratio}`); if (req && !ok) failed.push('separation ' + key); } }
console.log('\nTiers:', JSON.stringify(R.tiers)); if (outDir) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'verify.json'), JSON.stringify({ R, sep }, null, 1)); }
console.log(failed.length ? `\n${failed.length} FAILED: ${failed.join(' | ')}` : '\nALL CHECKS PASSED'); await h.close(); process.exit(failed.length ? 1 : 0);
