// Usage: node scripts/sheet.mjs <out.png> <cols> <cellPx> <file>[=label] ...   (contact sheet; A/B = pass pairs side by side)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
const [out, cols, cell, ...files] = process.argv.slice(2);
const imgs = files.map((f) => { const [p, l] = f.split('='); return `<figure><img src="data:image/png;base64,${fs.readFileSync(p).toString('base64')}"><figcaption>${l || p.split('/').pop().replace('.png', '')}</figcaption></figure>`; }).join('');
const html = `<body style="margin:0;background:#2b2b30;display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:4px"><style>figure{margin:0;position:relative}img{width:${cell}px;height:${cell}px;object-fit:cover;display:block}figcaption{position:absolute;left:6px;top:4px;font:600 13px sans-serif;color:#fff;text-shadow:0 0 3px #000}</style>${imgs}`;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: cols * cell + (cols - 1) * 4, height: 100 } });
await pg.setContent(html); await pg.waitForTimeout(300); await pg.screenshot({ path: out, fullPage: true }); await b.close();
