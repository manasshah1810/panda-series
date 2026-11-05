// Iteration 2: stills + scrub-safety + budget for Beat 4.  node scripts/broth-checks.mjs
import { start } from './_h.mjs'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.join(root, 'review/screens'), rep = path.join(root, 'review/broth'); fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(rep, { recursive: true });
const h = await start({ size: [1280, 720], port: 5340, query: 'quality=high' });
const B = await h.page.evaluate(() => ({ start: window.__op.BROTH_START, dur: window.__op.BROTH_DURATION, imp: window.__op.brothTl.broth.impacts.map((i) => i.t) }));
const save = (name, d) => fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64'));
for (const [name, lt] of [['broth_whip_mid', 0.35], ['broth_stove_approach', 0.7], ['broth_arc_up', 1.3], ['broth_topdown_lock', 1.9], ['broth_ingredient_mid_air', 3.05], ['broth_splash_impact', 3.55], ['broth_chili_stream', 5.7], ['broth_steam_burst', 6.9], ['broth_steam_wipe', 7.45], ['broth_wash_end', 8.3]]) { save(name, await h.page.evaluate((t) => window.__op.frame(t), B.start + lt)); console.log('wrote', name); }
// ---- scrub safety: a digest of everything the beat writes, taken at 40 probe times in three orders; all digests must match exactly
const res = await h.page.evaluate(({ start, dur }) => {
  const w = window.__op, { camera, brothTl, pot, scene } = w, b = brothTl.broth, wash = document.getElementById('wash');
  const digest = () => { const a = []; const push = (...v) => v.forEach((x) => a.push(Math.round(x * 1e6) / 1e6)); push(...camera.position.toArray(), ...camera.quaternion.toArray(), camera.fov);
    b.pieces.forEach((p) => push(p.obj.visible ? 1 : 0, ...p.obj.position.toArray(), p.obj.scale.x, p.obj.rotation.x, p.obj.rotation.y)); push(b.chili.visible ? 1 : 0, ...b.chili.instanceMatrix.array.slice(0, 16 * 8));
    push(...pot.drops.instanceMatrix.array); pot.brothUniforms.uImp.value.forEach((v) => push(v.x, v.y, v.z)); push(pot.brothUniforms.uTime.value, pot.brothUniforms.uBoil.value, +(wash.style.opacity || 0), w.potSpot.intensity, w.panda.root.visible ? 1 : 0, w.raw.group.visible ? 1 : 0);
    b.steam.mesh.instanceMatrix.array.forEach((x) => push(x)); return a.join(','); };
  const times = Array.from({ length: 40 }, (_, i) => +(i * dur / 39).toFixed(4)), at = (t) => { w.seek(start + t); return digest(); };
  const fwd = times.map(at), bwd = [...times].reverse().map(at).reverse(), rnd = times.map((t, i) => [hashOrder(i), t]).sort((x, y) => x[0] - y[0]).map(([, t]) => [t, at(t)]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  function hashOrder(i) { const x = Math.sin(i * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); }
  // and: after running through the beat, scrubbing back into the chop beat restores the Panda, knife, board and a clean overlay
  w.seek(start + dur); w.seek(start - 0.5); const back = { panda: w.panda.root.visible, knife: w.knife.visible, raw: w.raw.group.visible, wash: +(wash.style.opacity || 0), spot: w.potSpot.intensity };
  return { n: times.length, fwdBwd: fwd.every((d, i) => d === bwd[i]), fwdRnd: fwd.every((d, i) => d === rnd[i]), back };
}, B);
console.log('scrub', JSON.stringify(res));
// ---- budget: per beat time, main pass only (shadow pass off) and full frame (shadow pass on)
const bud = await h.page.evaluate(({ start }) => { const w = window.__op, r = w.renderer, rows = []; for (const lt of [0, 0.35, 0.7, 1.3, 1.9, 3.05, 3.55, 5.7, 6.9, 7.45, 8.3]) { w.seek(start + lt);
  r.shadowMap.autoUpdate = true; r.shadowMap.needsUpdate = true; r.render(w.scene, w.camera); const full = { calls: r.info.render.calls, tris: r.info.render.triangles };
  r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = false; r.render(w.scene, w.camera); const main = { calls: r.info.render.calls, tris: r.info.render.triangles }; r.shadowMap.autoUpdate = true;
  rows.push({ t: lt, main, full }); } return rows; }, B);
console.log('budget'); bud.forEach((r) => console.log(JSON.stringify(r)));
// beat-owned assets only (pot + flying pieces + stream + steam): worst case with the most pieces airborne
const own = await h.page.evaluate(() => { const w = window.__op, b = w.brothTl.broth, tri = (o) => { let n = 0; o.traverse((m) => { if (!m.isMesh) return; const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); }); return Math.round(n); };
  const perKind = {}; b.pieces.forEach((p) => { let c = 0; p.obj.traverse((m) => { if (m.isMesh) c++; }); perKind[p.kind] = { meshes: c, tris: tri(p.obj) }; });
  return { pot: w.pot.stats(), chiliTris: tri(b.chili), steamTris: tri(b.steam.mesh), perKind, pieces: b.pieces.length }; });
console.log('own', JSON.stringify(own));
fs.writeFileSync(path.join(rep, 'broth-checks.json'), JSON.stringify({ scrub: res, budget: bud, own, errors: h.errors }, null, 1));
console.log('errors', h.errors); await h.close();
