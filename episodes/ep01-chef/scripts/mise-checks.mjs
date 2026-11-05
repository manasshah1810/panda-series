// Headless verification for Beat 2 (mise en place): boot, bounds, scrub determinism, budget, vegetarian audit. -> review/mise-checks.json
import { start } from './_h.mjs'; import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review'); const h = await start({ size: [480, 270], port: 5340, query: 'quality=' + (process.env.Q || 'high') });
const R = {}, hash = async (t) => crypto.createHash('sha256').update(await h.page.evaluate((x) => window.__op.frame(x), t)).digest('hex').slice(0, 16);
const t0 = await h.page.evaluate(() => window.__op.MISE_START), D = await h.page.evaluate(() => window.__op.MISE_DURATION);
R.boot = await h.page.evaluate(() => { const o = window.__op; o.seek(o.MISE_START + 5); return { glError: o.renderer.getContext().getError(), programs: o.renderer.info.programs.length }; }); R.boot.consoleErrors = h.errors.length; R.boot.pass = R.boot.glError === 0 && h.errors.length === 0;
// bounds: every ingredient's resting footprint (board-local) lies inside the 0.9 x 0.6 board
R.bounds = await h.page.evaluate(() => { const o = window.__op; o.seek(o.MISE_START + 9.5); o.raw.group.updateMatrixWorld(true); const res = {}; let ok = true;
  for (const [id, e] of o.raw.ingredientsMap) { const b = new o.THREE.Box3(); for (const p of e.parts) b.union(new o.THREE.Box3().setFromObject(p.root)); const inv = o.raw.group.worldToLocal; const lo = o.raw.group.worldToLocal(b.min.clone()), hi = o.raw.group.worldToLocal(b.max.clone()); const inside = lo.x >= -0.45 && hi.x <= 0.45 && lo.z >= -0.3 && hi.z <= 0.3; ok &&= inside; res[id] = { x: [+lo.x.toFixed(3), +hi.x.toFixed(3)], z: [+lo.z.toFixed(3), +hi.z.toFixed(3)], inside }; } void 0; res.pass = ok; return res; });
// scrub determinism: forward / backward / shuffled passes over the beat give identical frames; plus a numeric state hash (positions, scales, camera, wash)
const steps = [...Array(41).keys()].map((i) => +(i * 0.25).toFixed(2)), st = (t) => h.page.evaluate((x) => { const o = window.__op; o.seek(x); const a = []; o.raw.group.traverse((m) => { if (m.name.endsWith('_part')) a.push(...m.position.toArray(), ...m.scale.toArray(), m.rotation.y, m.visible ? 1 : 0); }); a.push(...o.camera.position.toArray(), ...o.camera.quaternion.toArray(), o.camera.fov, +document.getElementById('wash').style.opacity); return a.map((v) => v.toFixed(7)).join(','); }, x);
const F = {}, B = {}, J = {}, SF = {}, SJ = {};
for (const t of steps) { F[t] = await hash(t0 + t); SF[t] = await st(t0 + t); }
for (const t of [...steps].reverse()) B[t] = await hash(t0 + t);
for (const t of [...steps].sort((a, b) => ((a * 7.3) % 1) - ((b * 7.3) % 1))) { J[t] = await hash(t0 + t); SJ[t] = await st(t0 + t); }
const bad = steps.filter((t) => F[t] !== B[t] || F[t] !== J[t] || SF[t] !== SJ[t]);
// also a long excursion through the whole opening and back must not drift
const a0 = await hash(t0 + 7.3); await h.page.evaluate((s) => { for (const t of [0, 3, 8, 12, s + 2, 5, s + 9, 1]) window.__op.seek(t); }, t0); const a1 = await hash(t0 + 7.3);
R.scrub = { frames: steps.length, distinctFrames: new Set(Object.values(F)).size, mismatches: bad, excursionDrift: a0 !== a1, pass: bad.length === 0 && a0 === a1 };
// budget: new content alone (ingredients + paws + tags), and the whole scene
R.budget = await h.page.evaluate(() => { const o = window.__op, res = {}; o.seek(o.MISE_START + 9.5); const mine = new Set(); for (const g of [o.raw.group]) g.traverse((x) => mine.add(x));
  const vis = new Map(); o.scene.traverse((x) => { if (x.isMesh || x.isPoints || x.isLine) { vis.set(x, x.visible); if (!mine.has(x)) x.visible = false; } });
  o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.newContentWithShadowsAndGlassPass = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles };
  o.renderer.shadowMap.enabled = false; o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.newContentMainPass = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; o.renderer.shadowMap.enabled = true;
  vis.forEach((v, x) => { x.visible = v; }); res.own = o.raw.stats();
  o.seek(o.MISE_START + 9.5); o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.fullSceneAtLineup = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles };
  res.pass = res.newContentMainPass.calls <= 50 && res.newContentMainPass.triangles <= 28000; return res; });
R.vegetarian = await h.page.evaluate(() => { const names = []; window.__op.raw.group.traverse((x) => { if (x.isMesh) names.push(x.name); }); const ok = ['bambooCore', 'bambooSheaths', 'doughBall', 'shiitakeCap', 'shiitakeStem', 'bokChoy', 'jarGlass', 'chiliOil', 'jarLid', 'tag']; return { names, pass: names.every((n) => ok.includes(n)) }; });
R.pass = ['boot', 'bounds', 'scrub', 'budget', 'vegetarian'].every((k) => R[k].pass);
fs.writeFileSync(path.join(out, 'mise-checks.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await h.close(); process.exit(R.pass ? 0 : 1);
