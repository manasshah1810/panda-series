import { start } from './_h.mjs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = process.argv[2] || 'after'; const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review', dir);
const h = await start({});
for (const t of (process.argv[3] ? process.argv[3].split(',').map(Number) : [0, 2, 3.6, 4.2, 5, 5.5, 6, 7, 8])) await h.save(out, 't' + t.toFixed(1), t);
console.log(JSON.stringify(await h.page.evaluate(() => window.__op.info())));
await h.close();
