// Usage: node scripts/expr-diff.mjs <dir with expr_*.png> [minMeanDiff]  -> pairwise mean abs pixel difference of the face region.
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright'); import fs from 'node:fs';
const dir = process.argv[2], min = +(process.argv[3] || 1.2);
const names = fs.readdirSync(dir).filter((f) => f.startsWith('expr_')).sort();
const b = await chromium.launch(); const pg = await b.newPage();
const res = await pg.evaluate(async ([files, min]) => {
  const px = []; for (const f of files) { const img = new Image(); img.src = f.data; await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.drawImage(img, 150, 120, 600, 520, 0, 0, 96, 96); px.push(g.getImageData(0, 0, 96, 96).data); }
  const out = []; for (let i = 0; i < px.length; i++) for (let j = i + 1; j < px.length; j++) { let s = 0; for (let k = 0; k < px[i].length; k += 4) s += Math.abs(px[i][k] - px[j][k]) + Math.abs(px[i][k + 1] - px[j][k + 1]) + Math.abs(px[i][k + 2] - px[j][k + 2]); out.push([files[i].name, files[j].name, s / (96 * 96 * 3)]); }
  return out; }, [names.map((n) => ({ name: n.replace('expr_', '').replace('.png', ''), data: 'data:image/png;base64,' + fs.readFileSync(dir + '/' + n).toString('base64') })), min]);
res.sort((a, b) => a[2] - b[2]); console.log('lowest pairs:'); res.slice(0, 8).forEach((r) => console.log(' ', r[0], r[1], r[2].toFixed(2)));
const bad = res.filter((r) => r[2] < min); console.log(bad.length ? `FAIL ${bad.length} pairs below ${min}` : `PASS all ${res.length} pairs >= ${min}`); await b.close(); process.exit(bad.length ? 1 : 0);
