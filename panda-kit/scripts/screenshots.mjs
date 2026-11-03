// Usage: node scripts/screenshots.mjs <iteration> <set1,set2,...> [extra query]
// Starts a Vite dev server, drives window.__review in headless Chromium, writes PNGs to review/iteration-N/.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const iter = process.argv[2] || '1';
const sets = (process.argv[3] || 'turnaround').split('|').flatMap((x) => (x.startsWith('mid:') || x.startsWith('custom:') ? [x] : x.split(',')));
const out = path.join(root, 'review', /^\d/.test(iter) ? `iteration-${iter}` : iter); fs.mkdirSync(out, { recursive: true });

const SETS = {
  turnaround: ['front', 'back', 'left', 'right', 'tq_front_left', 'tq_front_right', 'tq_back_left', 'top', 'low', 'high'],
  detail: ['face_front', 'face_tq', 'paw_palm', 'paw_back', 'ear', 'tail_back', 'belly_shoulder', 'feet'],
  silhouette: ['front', 'side:left', 'back'],
  quick: ['front', 'tq_front_left', 'face_front'],
};

const server = await createServer({ root: path.join(root, 'demo'), server: { port: 5188, fs: { strict: false } }, logLevel: 'warn', });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
page.on('requestfailed', (r) => console.log('REQFAIL', r.url()));
await page.goto(url + (process.argv[4] || ''));
await page.waitForFunction(() => window.__review);
await page.addStyleTag({ content: '.lil-gui{display:none!important}' });
const save = async (name) => { const d = await page.evaluate(() => window.__review.frame()); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', name); };

for (const s of sets) {
  if (s === 'silhouette') {
    await page.evaluate(() => { const r = window.__review; r.state.silhouette = true; r.lighting.silhouette(true); r.setSilhouetteMaterials(true); });
    for (const v of ['front', 'left', 'back']) { await page.evaluate((v) => window.__review.setView(v), v); await save('sil_' + v); }
    await page.evaluate(() => { const r = window.__review; r.lighting.silhouette(false); r.setSilhouetteMaterials(false); });
  } else if (s === 'poses') {
    const names = await page.evaluate(() => window.__review.panda.poseNames);
    await page.evaluate(() => { window.__review.setView('tq_front_left', { fov: 40 }); window.__review.camera.position.set(3.4, 1.6, 4.4); window.__review.controls.target.set(0, 1.0, 0); window.__review.controls.update(); });
    for (const n of names) { await page.evaluate((n) => window.__review.applyPose(n), n); await save('pose_' + n); }
    await page.evaluate(() => window.__review.resetPose());
  } else if (s.startsWith('mid:')) {
    // mid:anim@p1,p2,p3  -> frames of an animation at given progress values (front-left view)
    const [anim, ps] = s.slice(4).split('@');
    await page.evaluate(() => { window.__review.setView('tq_front_left', { fov: 40 }); window.__review.camera.position.set(3.4, 1.6, 4.4); window.__review.controls.target.set(0, 1.0, 0); window.__review.controls.update(); });
    for (const p of ps.split(',')) { await page.evaluate(([a, p]) => window.__review.scrubAnim(a, p), [anim, +p]); await save(`mid_${anim}_${p}`); }
    await page.evaluate(() => window.__review.resetPose());
  } else if (s === 'lighting') {
    await page.evaluate(() => window.__review.setView('tq_front_left'));
    for (const n of ['studio', 'kitchen', 'night', 'rim']) { await page.evaluate((n) => window.__review.lighting.apply(n), n); await save('light_' + n); }
    await page.evaluate(() => window.__review.lighting.apply('studio'));
  } else if (s === 'expressions') {
    const names = await page.evaluate(() => window.__review.panda.face.presetNames);
    await page.evaluate(() => window.__review.setView('face_front'));
    for (const n of names) { await page.evaluate((n) => window.__review.panda.face.set(n), n); await save('expr_' + n); }
    await page.evaluate(() => window.__review.panda.face.set('calmSmirk'));
  } else if (s === 'scale') {
    await page.evaluate(() => { const r = window.__review; r.setSize(300, 300); r.camera.fov = 32; r.setView('front'); r.camera.position.set(0, 1.0, 7); r.controls.target.set(0, 1.0, 0); r.controls.update(); r.camera.updateProjectionMatrix(); });
    await save('scale_150px'); await page.evaluate(() => window.__review.setSize(900, 900));
  } else if (s.startsWith('custom:')) {
    const code = s.slice(7); // js expression evaluated in page, must return name
    const name = await page.evaluate(code); await save(name);
  } else {
    for (const v of SETS[s] || [s]) {
      if (v.startsWith('paw')) await page.evaluate(() => { const r = window.__review.panda.rig; r.shoulderL.rotation.set(-1.3, 0, 0.1); r.elbowL.rotation.set(-0.3, 0, 0); r.paw_pose = 1; });
      await page.evaluate((v) => window.__review.setView(v), v); await save(v);
      if (v === 'paw_back') await page.evaluate(() => { const r = window.__review.panda.rig; r.shoulderL.rotation.set(0, 0, 0.2); r.elbowL.rotation.set(-0.3, 0, 0); });
    }
  }
}
await browser.close(); await server.close();
