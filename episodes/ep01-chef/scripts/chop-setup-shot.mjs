// Iteration 1 still: node scripts/chop-setup-shot.mjs <out.png> [tip0 tip1 ...]   (per-slice tip progress, default 0 = all standing)
import { start } from './_h.mjs'; import fs from 'node:fs'; import path from 'node:path';
const out = path.resolve(process.argv[2] ?? 'macro_chop_setup.png'), tips = process.argv.slice(3).map(Number);
const h = await start({ size: [1280, 720], port: 5360, query: 'quality=' + (process.env.Q || 'high') });
const d = await h.page.evaluate((t) => window.__op.chopSetup(t), tips); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
console.log('wrote', out, 'errors', h.errors); await h.close();
