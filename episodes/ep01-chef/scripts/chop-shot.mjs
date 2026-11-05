// Stills of the chop beat: node scripts/chop-shot.mjs <outDir> t1 t2 ...   (t = seconds into the chop beat)
import { start } from './_h.mjs'; import path from 'node:path';
const out = path.resolve(process.argv[2]), ts = process.argv.slice(3).map(Number);
const h = await start({ size: [1280, 720], port: 5380, query: 'quality=' + (process.env.Q || 'medium') });
const info = await h.page.evaluate(() => ({ start: window.__op.CHOP_START, ik: window.__op.chopTl.chop.ikWorstError, edgeX: window.__op.chopTl.chop.edgeX })); console.log(JSON.stringify(info));
for (const t of ts) await h.save(out, 'chop_' + t.toFixed(2), info.start + t);
console.log('errors', h.errors); await h.close();
