import { start } from './_h.mjs'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/hero'); const size = [960, 540];
const h = await start({ size, port: 5312, query: 'quality=high' }); fs.mkdirSync(out, { recursive: true });
const save = async (name, args) => { const d = await h.page.evaluate((a) => window.__op.hero(...a), args); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', name); };
const L = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
if (L) for (const t of L) await save('t' + t.toFixed(2), [t]);
else {
  const f = await h.page.evaluate(() => window.__op.ramen.group.getWorldPosition(new window.__op.THREE.Vector3()).toArray());
  await save('hero_bowl_topdown', [1.0, { position: [f[0], f[1] + 0.62, f[2] + 0.001], lookAt: [f[0], f[1] + 0.07, f[2]], up: [0, 0, -1], fov: 30, hide: ['steam'] }]);
  await save('hero_bowl_45deg_orbit', [1.0]);
  await save('detail_shiitake', [1.0, { position: [f[0] + 0.05, f[1] + 0.2, f[2] + 0.1], lookAt: [f[0] + 0.045, f[1] + 0.08, f[2] + 0.035], up: [0, 0, -1], fov: 30 }]);
  await save('steam_dive_frame', [1.95]);
  for (const t of [0, 0.15, 0.3, 0.4, 1.6, 2.2]) await save('seq_t' + t.toFixed(2), [t]);
}
console.log(JSON.stringify(await h.page.evaluate(() => window.__op.info()))); await h.close();
