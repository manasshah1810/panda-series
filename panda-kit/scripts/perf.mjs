// Per-tier render cost. NOTE: headless Chromium uses SOFTWARE rendering (SwiftShader), so absolute ms are NOT phone numbers;
// use them only to compare tiers (readPixels forces the GPU queue to drain). Run on a real device with the demo for real frame times.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root: path.join(root, 'demo'), server: { port: 5189, fs: { strict: false } }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
for (const q of ['high', 'medium', 'low']) {
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  await page.goto(server.resolvedUrls.local[0] + '?quality=' + q); await page.waitForFunction(() => window.__review);
  const r = await page.evaluate(() => { const a = window.__review; a.renderer.setAnimationLoop(null); const t0 = performance.now(); for (let i = 0; i < 40; i++) a.renderer.render(a.scene, a.camera); const gl = a.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); const ms = (performance.now() - t0) / 40;
    const info = a.renderer.info.render; return { ms: +ms.toFixed(1), calls: info.calls, tris: info.triangles, stats: a.panda.stats() }; });
  console.log(q.padEnd(7), `render ${r.ms} ms/frame (software GL, 600x600) | scene draw calls ${r.calls} (incl. floor+shadow pass) | panda: ${r.stats.triangles} tris, ${r.stats.drawCalls} meshes, ${r.stats.materials} materials`);
  await page.close();
}
await browser.close(); await server.close();
