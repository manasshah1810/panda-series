import { createRequire } from 'node:module'; import { execSync } from 'node:child_process'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '..'); const repo = path.resolve(root, '../..');
export async function start({ size = [960, 540], port = 5311, query = '' } = {}) {
  const { createServer } = await import(pathToFileURL(path.join(repo, 'panda-kit/node_modules/vite/dist/node/index.js')).href);
  let pw; try { pw = createRequire(import.meta.url)('playwright'); } catch { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
  const server = await createServer({ root: path.join(root, 'demo'), server: { port, fs: { strict: false } }, logLevel: 'warn', clearScreen: false }); await server.listen();
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('CONSOLE', m.type(), m.text().slice(0, 300)); });
  await page.goto(server.resolvedUrls.local[0] + '?capture&' + query); await page.waitForFunction(() => window.__op, null, { timeout: 180000 });
  await page.evaluate((s) => window.__op.setSize(s[0], s[1]), size);
  const save = async (out, name, t) => { const d = await page.evaluate((x) => window.__op.frame(x), t); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', name); };
  return { page, save, close: async () => { await browser.close(); await server.close(); } };
}
