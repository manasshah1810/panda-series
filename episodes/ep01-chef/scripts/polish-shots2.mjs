// Iteration-2 stills + automated checks: camera whip / orbit / steam dive. usage: node scripts/polish-shots2.mjs
import { start } from './_h.mjs'; import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/polish'); fs.mkdirSync(out, { recursive: true });
const h = await start({ size: [1920, 1080], port: 5319, query: 'quality=medium' }); const R = {};
const png = async (name, t) => { const d = await h.page.evaluate((x) => window.__op.hero(x), t); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', name); };
await png('camera_whip_mid', 0.225); await png('camera_orbit_hero', 1.15); await png('steam_dive_entry', 2.15);
// sampled camera state (pure): position / lookAt / fov / roll / wash / dim at many times, with the camera driven only by seek
R.samples = await h.page.evaluate(() => { const o = window.__op, T = o.THREE, cam = o.camera, rows = [], H = o.HERO_TIMES, E = o.OPENING_END, fw = new T.Vector3(), up0 = new T.Vector3();
  const brothC = o.ramen.group.getWorldPosition(new T.Vector3()); brothC.y += o.ramen.brothY;
  for (let i = 0; i <= 98; i++) { const lt = +(i * H.duration / 98).toFixed(4); o.seek(E + lt); cam.getWorldDirection(fw); const eul = new T.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
    cam.updateMatrixWorld(true); const rollDeg = Math.asin(new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).y) * 180 / Math.PI;
    rows.push({ lt, pos: cam.position.toArray().map((v) => +v.toFixed(4)), dir: fw.toArray().map((v) => +v.toFixed(4)), fov: +cam.fov.toFixed(3), rollDeg: +rollDeg.toFixed(3), wash: +o.heroTl.hero.wash.toFixed(4), dim: +o.heroTl.hero.info.dimFactor.toFixed(4), distBroth: +cam.position.distanceTo(brothC).toFixed(4) }); } return rows; });
const S = R.samples, at = (t) => S.reduce((a, b) => (Math.abs(b.lt - t) < Math.abs(a.lt - t) ? b : a));
// whip: fov peak ~ +10 over the base ramp, negative roll, lands on M9 fov 32; orbit pinned; wash monotone & tied to distance; dim -35%
const W = S.filter((r) => r.lt <= 0.45); const pk = W.reduce((a, b) => (b.fov > a.fov ? b : a));
R.whip = { startFov: at(0).fov, fovPeak: pk.fov, fovPeakAt: pk.lt, minRollDeg: Math.min(...W.map((r) => r.rollDeg)), endFov: at(0.45).fov, endFovIs32: Math.abs(at(0.45).fov - 32) < 0.2 };
R.whip.pass = R.whip.endFovIs32 && R.whip.fovPeak > 52 && R.whip.minRollDeg < -1.5 && R.whip.minRollDeg > -3.6;
R.orbit = await h.page.evaluate(() => { const o = window.__op, T = o.THREE, cam = o.camera, E = o.OPENING_END, want = o.ramen.group.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.1, 0)), res = []; const ray = new T.Vector3();
  for (let i = 0; i <= 20; i++) { const lt = 0.45 + (1.4 * i) / 20; o.seek(E + lt); cam.getWorldDirection(ray); const toT = want.clone().sub(cam.position); const ang = ray.angleTo(toT) * 180 / Math.PI; res.push(+ang.toFixed(5)); } return { maxLookAtErrorDeg: Math.max(...res), want: want.toArray() }; });
R.orbit.pass = R.orbit.maxLookAtErrorDeg < 0.01;
const P = S.filter((r) => r.lt >= 1.85); let mono = true; for (let i = 1; i < P.length; i++) if (P[i].wash < P[i - 1].wash - 1e-6 || P[i].distBroth > P[i - 1].distBroth + 1e-6) mono = false;
R.plunge = { washStart: P[0].wash, washEnd: P.at(-1).wash, monotone: mono, washAtMidDistance: null, distStart: P[0].distBroth, distEnd: P.at(-1).distBroth };
// wash must be a function of distance only (same distance => same wash regardless of time)
R.plunge.washVsDistance = P.map((r) => [r.distBroth, r.wash]).filter((_, i) => i % 3 === 0); R.plunge.pass = mono && P[0].wash < 0.02 && P.at(-1).wash > 0.97;
R.dim = { before: at(0).dim, afterWhip: at(0.45).dim, final: at(2.45).dim, pass: Math.abs(at(0).dim - 1) < 1e-6 && Math.abs(at(0.45).dim - 0.65) < 1e-3 };
// knife spring: pure, +0.07 rad kick at spring start, 0 after 0.55 s
R.knife = await h.page.evaluate(() => { const o = window.__op, E = o.OPENING_END, k = o.knife, ang = (t) => { o.seek(t); return k.quaternion.clone(); }, q0 = ang(E - 0.7), qa = ang(E - 0.549), qm = ang(E - 0.3), qe = ang(E - 0.0001), qh = ang(E + 0.2), qm2 = ang(E - 0.3);
  return { settledBefore_vs_afterSpringDeg: +(q0.angleTo(qe) * 180 / Math.PI).toFixed(4), kickDeg: +(q0.angleTo(qa) * 180 / Math.PI).toFixed(3), midDeg: +(q0.angleTo(qm) * 180 / Math.PI).toFixed(3), deterministic: qm.equals(qm2), atBeatStartDeg: +(q0.angleTo(qh) * 180 / Math.PI).toFixed(4) }; });
R.knife.pass = R.knife.kickDeg > 3.5 && R.knife.kickDeg < 4.5 && R.knife.settledBefore_vs_afterSpringDeg < 0.3 && R.knife.deterministic;
// determinism: forward / backward / shuffled hash
const hash = async (t) => crypto.createHash('sha256').update(await h.page.evaluate((x) => window.__op.frame(x), t)).digest('hex').slice(0, 16);
await h.page.evaluate(() => window.__op.setSize(480, 270));
const END = await h.page.evaluate(() => window.__op.OPENING_END), steps = [...Array(14).keys()].map((i) => +(END - 0.65 + i * 0.05).toFixed(2)).concat([...Array(25).keys()].map((i) => +(END + i * 0.1).toFixed(2)));
const f = {}, b = {}, j = {}; for (const t of steps) f[t] = await hash(t); for (const t of [...steps].reverse()) b[t] = await hash(t); for (const t of [...steps].sort((a, c) => ((a * 7.3) % 1) - ((c * 7.3) % 1))) j[t] = await hash(t);
const bad = steps.filter((t) => f[t] !== b[t] || f[t] !== j[t]); R.scrub = { frames: steps.length, distinct: new Set(Object.values(f)).size, mismatches: bad, pass: bad.length === 0 };
// budget at three beat times (own geometry + renderer.info) for the full scene
R.budget = await h.page.evaluate(() => { const o = window.__op, r = {}; for (const t of [0.2, 1.1, 2.1]) { o.hero(t); o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); r['hero' + t] = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; } r.bowlOwn = o.ramen.stats(); return r; });
R.budget.pass = Object.entries(R.budget).filter(([k]) => k.startsWith('hero')).every(([, v]) => v.calls <= 45 && v.triangles <= 25000) || 'see report';
R.errors = h.errors; R.pass = ['whip', 'orbit', 'plunge', 'dim', 'knife', 'scrub'].every((k) => R[k].pass) && h.errors.length === 0;
delete R.samples; R.samples = 'omitted'; fs.writeFileSync(path.join(out, 'polish-checks-iter2.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await h.close(); process.exit(R.pass ? 0 : 1);
