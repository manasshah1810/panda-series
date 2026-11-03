// Shared: starts a Vite dev server on the demo folder and a headless Chromium (SwiftShader) with the review API ready.
import { createRequire } from 'node:module'; import { execSync } from 'node:child_process'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)); export const root = path.resolve(here, '..'); const repo = path.resolve(root, '../../..');
export async function start({ query = '', size = [900, 900], port = 5199 } = {}) {
  const { createServer } = await import(pathToFileURL(path.join(repo, 'panda-kit/node_modules/vite/dist/node/index.js')).href);
  let pw; try { pw = createRequire(import.meta.url)('playwright'); } catch { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
  const server = await createServer({ root: path.join(root, 'demo'), server: { port, fs: { strict: false } }, logLevel: 'warn', clearScreen: false }); await server.listen();
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 300)); });
  await page.goto(server.resolvedUrls.local[0] + query); await page.waitForFunction(() => window.__kr, null, { timeout: 120000 });
  await page.addStyleTag({ content: '#ui{display:none!important}' }); await page.evaluate(() => window.__kr.setSize(...arguments[0] ?? [900, 900]), size).catch(() => {});
  await page.evaluate((s) => window.__kr.setSize(s[0], s[1]), size);
  const save = async (out, name) => { const d = await page.evaluate(() => window.__kr.frame()); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', path.relative(root, path.join(out, name + '.png'))); };
  return { page, save, close: async () => { await browser.close(); await server.close(); } };
}
