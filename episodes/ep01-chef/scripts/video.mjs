// Deterministic video: seek the master timeline frame by frame (opening + hero tease + mise en place), screenshot, encode with ffmpeg.
// Frames are split across WORKERS browser processes (each seeks absolute times, so the result is identical to a single pass).
//   node scripts/video.mjs            -> review/video/ep01-opening-hero-miseenplace.mp4
import { start } from './_h.mjs'; import { execSync, spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/video'), fr = path.join(out, 'frames'), FPS = 24, W = 1280, H = 720, WORKERS = +(process.env.WORKERS || 3);
const slice = process.argv.indexOf('--slice');
if (slice > -1) {   // worker
  const idx = +process.argv[slice + 1], n = +process.argv[slice + 2], h = await start({ size: [W, H], port: 5400 + idx, query: 'quality=' + (process.env.Q || 'high') });
  const END = await h.page.evaluate(() => window.__op.op.master.duration()), N = Math.round(END * FPS) + 24;   // + 1 s hold on the last frame
  for (let i = idx; i < N; i += n) await h.save(fr, 'f' + String(i).padStart(4, '0'), Math.min(END, i / FPS));
  await h.close(); process.exit(0);
}
fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr, { recursive: true });
await Promise.all([...Array(WORKERS).keys()].map((i) => new Promise((res, rej) => { const p = spawn('node', [fileURLToPath(import.meta.url), '--slice', i, WORKERS], { stdio: 'inherit', env: process.env }); p.on('exit', (c) => (c === 0 ? res() : rej(new Error('worker ' + i + ' exit ' + c)))); })));
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${fr}/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 ${out}/ep01-opening-hero-miseenplace.mp4`);
fs.rmSync(fr, { recursive: true, force: true }); console.log('done');
