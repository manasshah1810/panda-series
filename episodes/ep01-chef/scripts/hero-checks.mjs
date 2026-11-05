// Headless verification for Beat 1 (hero tease): boot, anchor mount, scrub determinism, draw-call / triangle budget.
import { start } from './_h.mjs'; import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review'); const h = await start({ size: [480, 270], port: 5315, query: 'quality=high' });
const R = {}, hash = async (t) => crypto.createHash('sha256').update(await h.page.evaluate((x) => window.__op.frame(x), t)).digest('hex').slice(0, 16);
// 1. boot: no console errors / warnings (incl. shader compile errors) so far, and no GL error
R.boot = await h.page.evaluate(() => { const gl = window.__op.renderer.getContext(); window.__op.seek(12); return { glError: gl.getError(), programs: window.__op.renderer.info.programs.length }; }); R.boot.consoleErrors = h.errors; R.boot.pass = R.boot.glError === 0 && h.errors.length === 0;
// 2. the bowl is mounted on the kitchen anchor 'bowlPlacementPoint' (and its foot sits on the island top)
R.anchor = await h.page.evaluate(() => { const o = window.__op, T = o.THREE, a = o.kitchen.anchors.bowlPlacementPoint.getWorldPosition(new T.Vector3()), b = o.ramen.group.getWorldPosition(new T.Vector3()); return { anchor: a.toArray(), bowl: b.toArray(), err: a.distanceTo(b), islandTopY: o.kitchen.config.island.topY, parentIsAnchor: o.ramen.group.parent === o.kitchen.anchors.bowlPlacementPoint }; }); R.anchor.pass = R.anchor.err < 1e-9 && R.anchor.parentIsAnchor && Math.abs(R.anchor.bowl[1] - R.anchor.islandTopY) < 1e-9;
// 3. scrub determinism over the end of the opening + the whole hero beat: forward, backward and a shuffled jump pass must hash identically
const END = await h.page.evaluate(() => window.__op.OPENING_END), steps = [...Array(35).keys()].map((i) => +(END - 0.4 + i * 0.1).toFixed(2)).concat([...Array(22).keys()].map((i) => +(END + 0.05 + i * 0.1).toFixed(2)));
const fwd = {}, bwd = {}, jmp = {}; for (const t of steps) fwd[t] = await hash(t); for (const t of [...steps].reverse()) bwd[t] = await hash(t); for (const t of [...steps].sort((a, b) => ((a * 7.3) % 1) - ((b * 7.3) % 1))) jmp[t] = await hash(t);
const bad = steps.filter((t) => fwd[t] !== bwd[t] || fwd[t] !== jmp[t]); const distinct = new Set(Object.values(fwd)).size;
R.scrub = { frames: steps.length, distinctFrames: distinct, mismatches: bad, pass: bad.length === 0 && distinct > steps.length * 0.6 };
// 3b. direct 0 -> 1 -> 0 on the bowl itself: setTime is a pure function (same t, same uniforms)
R.bowlPure = await h.page.evaluate(() => { const b = window.__op.ramen, snap = () => b.group.getObjectByName('steam').material.uniforms.uT.value + '|' + b.group.getObjectByName('steam').material.uniforms.uInt.value; const r = []; for (const t of [0, 0.3, 1, 0.3, 0, 0.77, 0.77]) { b.setTime(t); r.push(snap()); } return { same: r[1] === r[3] && r[0] === r[4] && r[5] === r[6], samples: r }; }); R.bowlPure.pass = R.bowlPure.same;
// 4. budget: bowl alone (everything else hidden) and the whole scene, via renderer.info
R.budget = await h.page.evaluate(() => { const o = window.__op, res = {}; o.hero(1.0); const mine = new Set(); o.ramen.group.traverse((x) => mine.add(x));
  const vis = new Map(); o.scene.traverse((x) => { if (x.isMesh || x.isPoints || x.isLine) { vis.set(x, x.visible); if (!mine.has(x)) x.visible = false; } });
  o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.bowlOnly = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles, own: o.ramen.stats() };
  o.renderer.shadowMap.enabled = false; o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.bowlOnlyMainPass = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; o.renderer.shadowMap.enabled = true;
  vis.forEach((v, x) => { x.visible = v; });
  res.fullScene = {}; for (const t of [0, 1.0, 2.0]) { o.hero(t); o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.fullScene['hero' + t] = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; }
  o.seek(5); o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.fullScene.openingT5 = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; return res; });
R.budget.pass = R.budget.bowlOnly.calls <= 45 && R.budget.bowlOnly.triangles <= 25000;
// 5. vegetarian audit: every mesh in the bowl is a known plant-based part; none of the forbidden kinds exists
R.vegetarian = await h.page.evaluate(() => { const names = []; window.__op.ramen.group.traverse((x) => { if (x.isMesh) names.push(x.name); }); const ok = ['bowlBody', 'broth', 'noodles', 'menma', 'shiitake', 'bokChoyStems', 'bokChoyLeaves', 'cornBeads', 'scallionRings', 'nori', 'steam'], bad = names.filter((n) => !ok.includes(n) || /egg|chashu|pork|meat|fish|naruto|shrimp|narutomaki|prawn/i.test(n)); return { parts: names, forbidden: bad }; }); R.vegetarian.pass = R.vegetarian.forbidden.length === 0;
R.pass = ['boot', 'anchor', 'scrub', 'bowlPure', 'budget', 'vegetarian'].every((k) => R[k].pass);
fs.writeFileSync(path.join(out, 'hero-checks.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await h.close(); process.exit(R.pass ? 0 : 1);
