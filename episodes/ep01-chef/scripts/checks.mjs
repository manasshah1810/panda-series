import { start } from './_h.mjs'; import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review'); const h = await start({ size: [480, 270] });
const R = {};
const hash = async (t) => crypto.createHash('sha256').update(await h.page.evaluate((x) => window.__op.frame(x), t)).digest('hex').slice(0, 16);
// 1. scrub test: 0->8 then 8->0 in 0.1 s steps (+ a random-order jump pass), hashes per time must match
const steps = Array.from({ length: 109 }, (_, i) => +(i / 10).toFixed(1)), fwd = {}, bwd = {}, jmp = {};
for (const t of steps) fwd[t] = await hash(t); for (const t of [...steps].reverse()) bwd[t] = await hash(t);
for (const t of [...steps].sort((a, b) => ((a * 7.3) % 1) - ((b * 7.3) % 1))) jmp[t] = await hash(t);
const bad = steps.filter((t) => fwd[t] !== bwd[t] || fwd[t] !== jmp[t]);
R.scrub = { frames: steps.length, mismatches: bad, pass: bad.length === 0 };
// 2. landing + wobble
R.landing = await h.page.evaluate(() => { const o = window.__op, T = o.THREE; o.seek(7.8); const tip = o.op.knifeTip(), want = new T.Vector3(1.35, 1.10, 1.1); const tipDown = new T.Vector3(-Math.sin(15 * Math.PI / 180), -Math.cos(15 * Math.PI / 180), 0).multiplyScalar(0.06 / Math.cos(15 * Math.PI / 180)); want.add(tipDown); return { tip: tip.toArray(), want: want.toArray(), err: tip.distanceTo(want) }; });
R.wobble = await h.page.evaluate(() => { const o = window.__op, T = o.THREE, res = []; const ang = (t) => { o.seek(t); const d = new T.Vector3(0, -1, 0).applyQuaternion(o.knife.quaternion); return Math.atan2(d.z, Math.hypot(d.x, d.y)) * 180 / Math.PI; }; const base = ang(9.3);
  for (const tau of [0, 0.1, 0.25, 0.5, 1.0]) { const t = 7.8 + tau, A = tau >= 0.55 ? 0 : 3.2 * Math.exp(-5 * tau) * Math.sin(2 * Math.PI * 3 * tau) * (tau > 0.43 ? 1 - (3 * ((tau - 0.43) / 0.12) ** 2 - 2 * ((tau - 0.43) / 0.12) ** 3) : 1); res.push({ tau, measuredDeg: +(ang(t) - base).toFixed(4), formulaDeg: +A.toFixed(4) }); } return res; });
// 3. draw calls (main pass only vs incl. shadow pass)
R.drawCalls = await h.page.evaluate(() => { const o = window.__op, r = {}; for (const t of [0, 7.2, 10.8]) { o.renderer.shadowMap.enabled = false; o.scene.traverse((m) => { if (m.material) m.material.needsUpdate = false; }); const a = o.info().calls; o.renderer.shadowMap.enabled = true; r['t' + t] = { mainPass: a, withShadows: (o.seek(t), o.info().calls) }; } return r; });
// 4. panda separation: with vs without panda
R.separation = await h.page.evaluate(() => { const o = window.__op, res = {}, lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
  const read = () => { o.renderer.render(o.scene, o.camera); const c = document.createElement('canvas'); c.width = o.renderer.domElement.width; c.height = o.renderer.domElement.height; const x = c.getContext('2d'); x.drawImage(o.renderer.domElement, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  for (const t of [0, 2, 6.4, 7, 7.8, 9.8]) { o.seek(t); const f = read(); o.panda.root.visible = false; const b = read(); o.panda.root.visible = true; const fur = [], bg = []; for (let i = 0; i < f.length; i += 4) if (Math.abs(f[i] - b[i]) + Math.abs(f[i + 1] - b[i + 1]) + Math.abs(f[i + 2] - b[i + 2]) > 30) { const l = lum(f, i); if (l > 0.35) fur.push(l); bg.push(lum(b, i)); }
    fur.sort((a, c) => a - c); bg.sort((a, c) => a - c); const med = (a) => a.length ? a[a.length >> 1] : null; res['t' + t] = { pandaPx: bg.length, brightFurMedian: med(fur), bgMedianBehindPanda: med(bg), ok: !fur.length || !bg.length || Math.abs(med(fur) - med(bg)) > 0.12 }; } return res; });
fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await h.close();
