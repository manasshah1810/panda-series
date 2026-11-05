// Quick stills of the mise-en-place beat: node scripts/mise-shot.mjs <outDir> t1 t2 ... (t = seconds into the beat)
import { start } from './_h.mjs'; import path from 'node:path';
const out = path.resolve(process.argv[2]), ts = process.argv.slice(3).map(Number);
const h = await start({ size: [1280, 720], port: 5330, query: 'quality=' + (process.env.Q || 'medium') });
const t0 = await h.page.evaluate(() => window.__op.MISE_START);
for (const t of ts) await h.save(out, 'mise_' + t.toFixed(2), t0 + t);
console.log('errors', h.errors); await h.close();
