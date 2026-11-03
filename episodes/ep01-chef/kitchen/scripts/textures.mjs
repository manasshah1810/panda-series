// Dumps the procedural texture swatches into review/<dir>/textures.png (for tuning). node scripts/textures.mjs iteration-2
import path from 'node:path'; import fs from 'node:fs'; import { start, root } from './_harness.mjs';
const h = await start({ query: '?stage=1&panda=0', size: [400, 300] });
const data = await h.page.evaluate(() => { const K = window.__kr, T = K.TEX, pal = K.KITCHEN_CONFIG.palette, S = 512, c = document.createElement('canvas'); c.width = S * 3; c.height = S * 2; const x = c.getContext('2d');
  const items = [T.marbleTexture(S, pal, { seed: 4, freq: 3, dir: [1, 1] }), T.marbleTexture(S, pal, { seed: 21, base: pal.backsplash_marble_base, freq: 3, dir: [1, 2] }), T.woodTexture(S, pal, { seed: 3 }), T.woodTexture(S, pal, { seed: 8, endGrain: true }), T.steelRoughnessTexture(S), T.floorTexture(S, pal)];
  items.forEach((t, i) => x.drawImage(t.image, (i % 3) * S, Math.floor(i / 3) * S)); return c.toDataURL('image/png'); });
const out = path.join(root, 'review', process.argv[2] || 'iteration-2'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'textures.png'), Buffer.from(data.split(',')[1], 'base64')); await h.close();
