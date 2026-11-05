// Iteration-1 automated checks for the ramen bowl. usage: node scripts/polish-checks.mjs
import { start } from './_h.mjs'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/polish');
const h = await start({ size: [960, 540], port: 5317, query: 'quality=' + (process.env.Q || 'high') }); const R = {};
const f = await h.page.evaluate(() => window.__op.ramen.group.getWorldPosition(new window.__op.THREE.Vector3()).toArray());
// 1. GL / console errors
R.errors = await h.page.evaluate(() => { window.__op.hero(1.0); return window.__op.renderer.getContext().getError(); }); R.errors = { gl: R.errors, console: h.errors, pass: R.errors === 0 && h.errors.length === 0 };
// 2. geometry budget
R.budget = await h.page.evaluate(() => { const o = window.__op; o.hero(1.0); const mine = new Set(); o.ramen.group.traverse((x) => mine.add(x)); const vis = new Map();
  o.scene.traverse((x) => { if (x.isMesh || x.isPoints || x.isLine) { vis.set(x, x.visible); if (!mine.has(x)) x.visible = false; } });
  const own = o.ramen.stats(); o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); const full = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles };
  o.renderer.shadowMap.enabled = false; o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); const noShadow = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; o.renderer.shadowMap.enabled = true;
  vis.forEach((v, x) => { x.visible = v; }); return { own, rendererInfoBowlOnly: full, rendererInfoNoShadow: noShadow }; });
R.budget.pass = R.budget.own.drawCalls <= 45 && R.budget.own.triangles <= 25000;
// 3. noodle submersion + geometry sanity
R.noodles = await h.page.evaluate(() => { const o = window.__op, T = o.THREE, g = o.ramen.group, n = g.getObjectByName('noodles'), by = o.ramen.brothY, ud = n.geometry.userData, pos = n.geometry.attributes.position; n.updateWorldMatrix(true, false);
  let off = 0, res = {}; const strands = ud.strands ?? []; let under = 0, tot = 0, topUnder = 0, topTot = 0;
  for (const s of strands) { for (let i = 0; i < s.n; i++) { const y = pos.getY(off + i); tot++; if (y < by) under++; if (s.layer === 'top') { topTot++; if (y < by) topUnder++; } } off += s.n; }
  return { strands: strands.length, vertsTotal: pos.count, vertsCounted: off, submergedVertexFraction: +(under / tot).toFixed(3), topLayerSubmergedFraction: +(topUnder / topTot).toFixed(3), radius: ud.radius, brothY: by, note: 'top layer centreline sits 0.1 diameter below plane => 60% of tube height submerged' }; });
R.noodles.pass = R.noodles.topLayerSubmergedFraction >= 0.5 && R.noodles.vertsCounted === R.noodles.vertsTotal;
// 4. floating geometry: every part's lowest vertex region must overlap another part / the bowl; check bounding boxes touch bowl body or broth volume
R.floating = await h.page.evaluate(() => { const o = window.__op, T = o.THREE, g = o.ramen.group; g.updateWorldMatrix(true, true); const boxes = {}; g.traverse((x) => { if (x.isMesh && x.name !== 'steam') boxes[x.name] = new T.Box3().setFromObject(x); });
  const body = boxes.bowlBody, res = {}; res.leafStemConnected = boxes.bokChoyLeaves.clone().expandByScalar(0.002).intersectsBox(boxes.bokChoyStems); for (const [k, b] of Object.entries(boxes)) { if (k === 'bowlBody') continue; const e = b.clone().expandByScalar(0.002); res[k] = { insideBowlXZ: body.min.x - 0.001 <= b.min.x && b.max.x <= body.max.x + 0.001 && body.min.z - 0.001 <= b.min.z && b.max.z <= body.max.z + 0.001, touchesBody: e.intersectsBox(body) }; }
  // instanced parts: each instance centre must be within the rim radius and above the base disc
  const inst = {}; g.traverse((x) => { if (x.isInstancedMesh) { const m = new T.Matrix4(), p = new T.Vector3(), c = g.getWorldPosition(new T.Vector3()); let maxR = 0, minY = 9, maxY = -9; for (let i = 0; i < x.count; i++) { x.getMatrixAt(i, m); p.setFromMatrixPosition(m).applyMatrix4(x.matrixWorld.clone().multiply(new T.Matrix4()).identity()); p.setFromMatrixPosition(m); x.localToWorld(p); maxR = Math.max(maxR, Math.hypot(p.x - c.x, p.z - c.z)); minY = Math.min(minY, p.y - c.y); maxY = Math.max(maxY, p.y - c.y); } inst[x.name] = { count: x.count, maxRadius: +maxR.toFixed(4), minY: +minY.toFixed(4), maxY: +maxY.toFixed(4) }; } });
  return { parts: res, instanced: inst, bodyBox: [body.min.toArray(), body.max.toArray()] }; });
R.floating.leavesOverRimByDesign = !R.floating.parts.bokChoyLeaves.insideBowlXZ; R.floating.pass = R.floating.parts.leafStemConnected !== false && Object.entries(R.floating.parts).filter(([k]) => k !== 'leafStemConnected').every(([k, p]) => p.touchesBody && (p.insideBowlXZ || k === 'bokChoyLeaves')) && Object.values(R.floating.instanced).every((i) => i.maxRadius < 0.115 && i.minY > 0.0 && i.maxY < 0.12);
// 5. vegetarian audit
R.vegetarian = await h.page.evaluate(() => { const names = []; window.__op.ramen.group.traverse((x) => { if (x.isMesh) names.push(x.name); }); const ok = ['bowlBody', 'brothBase', 'broth', 'oilBeads', 'noodles', 'menma', 'shiitake', 'bokChoyStems', 'bokChoyLeaves', 'cornBeads', 'scallionRings', 'nori', 'steam']; return { parts: names, forbidden: names.filter((n) => !ok.includes(n) || /egg|chashu|pork|meat|fish|naruto|shrimp|prawn/i.test(n)) }; }); R.vegetarian.pass = R.vegetarian.forbidden.length === 0;
// 6. pixel analyses (top-down + macro)
const shot = async (args) => Buffer.from((await h.page.evaluate((a) => window.__op.hero(...a), args)).split(',')[1], 'base64');
const top = { position: [f[0], f[1] + 0.62, f[2] + 0.001], lookAt: [f[0], f[1] + 0.07, f[2]], up: [0, 0, -1], fov: 30 };
const rgba = async (buf) => h.page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return { w: c.width, h: c.height, d: Array.from(g.getImageData(0, 0, c.width, c.height).data) }; }, buf.toString('base64'));
const base = await rgba(await shot([1.0, { ...top, hide: ['steam'] }]));
// near-white (>=235 all channels) pixels inside the broth disc (centre, radius ~ 0.8 of rim image radius)
const cx = base.w / 2, cy = base.h / 2; let rimR = 0; // estimate rim radius: pixels brighter than backdrop? use fixed projection: rim outer r=0.1m at distance 0.55m, fov30
const pxPerM = base.h / (2 * 0.55 * Math.tan(15 * Math.PI / 180)), brothR = 0.092 * pxPerM; const mask = new Uint8Array(base.w * base.h); let wht = 0;
for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) { if (Math.hypot(x - cx, y - cy) > brothR) continue; const i = (y * base.w + x) * 4, [r, g, b] = [base.d[i], base.d[i + 1], base.d[i + 2]]; if (r >= 235 && g >= 235 && b >= 235) { mask[y * base.w + x] = 1; wht++; } }
// connected components of near-white; report the biggest
let big = 0; const seen = new Uint8Array(mask.length); for (let s = 0; s < mask.length; s++) { if (!mask[s] || seen[s]) continue; let n = 0; const st = [s]; seen[s] = 1; while (st.length) { const p = st.pop(); n++; for (const q of [p - 1, p + 1, p - base.w, p + base.w]) if (q >= 0 && q < mask.length && mask[q] && !seen[q]) { seen[q] = 1; st.push(q); } } big = Math.max(big, n); }
// pure-black / pure-white anywhere in the frame
let pureW = 0, pureB = 0; for (let i = 0; i < base.d.length; i += 4) { const r = base.d[i], g = base.d[i + 1], b = base.d[i + 2]; if (r > 250 && g > 250 && b > 250) pureW++; if (r < 3 && g < 3 && b < 3) pureB++; }
R.whiteArtifacts = { nearWhitePixelsInBroth: wht, largestComponent: big, pureWhitePixels: pureW, pureBlackPixels: pureB, pass: big < 12 && pureW === 0 };
// noodles read under the broth: render noodle-only visibility changes in the top-down; compare broth surface hidden vs shown over noodle pixels
const setVis = (names, v) => h.page.evaluate(([n, vv]) => { n.forEach((k) => { const o = window.__op.ramen.group.getObjectByName(k); if (o) o.visible = vv; }); }, [names, v]);
const hero = (extra) => shot([1.0, { ...top, hide: ['steam', ...extra] }]);
const noBroth = await rgba(await hero(['broth'])), noNoodles = await rgba(await hero(['noodles'])), noBoth = await rgba(await hero(['broth', 'noodles']));
let noodlePx = 0, changed = 0, shifted = 0, sumD = 0; const dist = (a, b, i) => Math.abs(a.d[i] - b.d[i]) + Math.abs(a.d[i + 1] - b.d[i + 1]) + Math.abs(a.d[i + 2] - b.d[i + 2]);
for (let i = 0; i < base.d.length; i += 4) { const px = i / 4, x = px % base.w, y = (px / base.w) | 0; if (Math.hypot(x - cx, y - cy) > brothR * 0.8) continue;
  if (dist(noBoth, noNoodles, i) > 40) { noodlePx++; /* noodle visible with no broth */ if (dist(base, noNoodles, i) > 12) changed++; /* still visible through broth */ if (dist(base, noBroth, i) > 30) shifted++; /* tinted by the broth vs bare */ } }
R.noodlesUnderBroth = { noodlePixelsWithoutBroth: noodlePx, stillVisibleThroughBroth: changed, tintedByBroth: shifted, visibleFraction: +(changed / Math.max(1, noodlePx)).toFixed(3), tintedFraction: +(shifted / Math.max(1, noodlePx)).toFixed(3) };
R.noodlesUnderBroth.pass = noodlePx > 500 && R.noodlesUnderBroth.visibleFraction > 0.4 && R.noodlesUnderBroth.tintedFraction > 0.4;
R.pass = ['errors', 'budget', 'noodles', 'floating', 'vegetarian', 'whiteArtifacts', 'noodlesUnderBroth'].every((k) => R[k].pass);
fs.writeFileSync(path.join(out, 'polish-checks-iter1.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await h.close(); process.exit(R.pass ? 0 : 1);
