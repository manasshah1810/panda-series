// Iteration-1 stills (high resolution): macro close-up and top-down of the ramen bowl. usage: node scripts/polish-shots.mjs [iter1] [w h]
import { start } from './_h.mjs'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/polish'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[2] || 'iter1', size = [+(process.argv[3] || 1920), +(process.argv[4] || 1080)];
const h = await start({ size, port: 5316, query: 'quality=high' });
const f = await h.page.evaluate(() => window.__op.ramen.group.getWorldPosition(new window.__op.THREE.Vector3()).toArray());
const save = async (name, args) => { const d = await h.page.evaluate((a) => window.__op.hero(...a), args); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', name); };
await save(`ramen_bowl_macro_${tag}`, [1.0, { position: [f[0] - 0.02, f[1] + 0.2, f[2] + 0.24], lookAt: [f[0] + 0.005, f[1] + 0.06, f[2] - 0.005], fov: 30, hide: ['steam'] }]);
await save(`ramen_bowl_topdown_${tag}`, [1.0, { position: [f[0], f[1] + 0.62, f[2] + 0.001], lookAt: [f[0], f[1] + 0.07, f[2]], up: [0, 0, -1], fov: 30, hide: ['steam'] }]);
console.log(JSON.stringify(h.errors)); await h.close();
