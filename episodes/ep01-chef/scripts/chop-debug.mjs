// Free-camera diagnostic stills of the chop beat: node scripts/chop-debug.mjs <outDir> <t> then camera specs "name:px,py,pz:lx,ly,lz:fov" ...
import { start } from './_h.mjs'; import fs from 'node:fs'; import path from 'node:path';
const out = path.resolve(process.argv[2]), t = +process.argv[3], cams = process.argv.slice(4);
const h = await start({ size: [1280, 720], port: 5381, query: 'quality=' + (process.env.Q || 'medium') });
for (const c of cams) { const [name, p, l, fov] = c.split(':'); const d = await h.page.evaluate(([t, p, l, fov]) => { const o = window.__op; o.seek(o.CHOP_START + t); const P = p.split(',').map(Number), L = l.split(',').map(Number); o.camera.up.set(0, 1, 0); o.camera.position.set(...P); o.camera.fov = +fov; o.camera.lookAt(...L); o.camera.updateProjectionMatrix(); o.renderer.render(o.scene, o.camera); return o.snap(); }, [t, p, l, fov]);
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', name); }
console.log('errors', h.errors); await h.close();
