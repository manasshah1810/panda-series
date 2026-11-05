// Iteration 1 stills: the stockpot (geometry + rolling-boil shader) on the stove.  node scripts/pot-shot.mjs
import { start } from './_h.mjs'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/screens'); fs.mkdirSync(out, { recursive: true });
const h = await start({ size: [1280, 720], port: 5330, query: 'quality=high' });
const shot = async (name, cam, uTime = 2.3) => { const d = await h.page.evaluate(({ cam, uTime }) => { const w = window.__op, { THREE, camera, pot } = w; w.seek(0);
  const b = pot.brothWorld(); pot.brothUniforms.uTime.value = uTime; camera.up.set(...(cam.up ?? [0, 1, 0])); camera.position.copy(b).add(new THREE.Vector3(...cam.off)); camera.fov = cam.fov; camera.lookAt(b.clone().add(new THREE.Vector3(...(cam.look ?? [0, 0, 0])))); camera.updateProjectionMatrix(); w.renderer.render(w.scene, camera); return w.renderer.domElement.toDataURL('image/png'); }, { cam, uTime });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', name); };
await shot('stockpot_boil_shader', { off: [0.28, 0.42, 0.62], fov: 34, look: [0, -0.06, 0] });
await shot('stockpot_boil_topdown', { off: [0, 0.75, 0], fov: 32, up: [0, 0, -1] });
await shot('stockpot_boil_topdown_t2', { off: [0, 0.75, 0], fov: 32, up: [0, 0, -1] }, 5.1);
await shot('stockpot_side', { off: [0.0, 0.12, 0.9], fov: 30, look: [0, -0.05, 0] });
console.log(JSON.stringify(await h.page.evaluate(() => ({ pot: window.__op.pot.stats(), frame: window.__op.info() }))), h.errors);
await h.close();
