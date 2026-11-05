// Deterministic video: seek the master timeline frame by frame, screenshot, encode with ffmpeg (real-time playback regardless of GPU speed).
import { start } from './_h.mjs'; import { execSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/video'), fr = path.join(out, 'frames'), FPS = 24, W = 1280, H = 720;
fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr, { recursive: true });
const h = await start({ size: [W, H] }); const N = 8 * FPS + 24;   // 8 s + 1 s hold on the end frame
for (let i = 0; i < N; i++) await h.save(fr, 'f' + String(i).padStart(4, '0'), Math.min(8, i / FPS));
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${fr}/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 ${out}/ep01-opening.mp4`);
fs.rmSync(fr, { recursive: true, force: true }); console.log('done'); await h.close();
