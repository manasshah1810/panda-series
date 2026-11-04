// Pre-change baseline: the repo as it was before the opening existed. Each opening timestamp is mapped to the nearest
// existing camera mark with the Panda in its static neutral pose (there is no opening animation yet).
import { start } from '../kitchen/scripts/_harness.mjs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/baseline');
const MAP = { 0.0: 'M1_establish_back', 2.0: 'M1_establish_back', 3.6: 'M4_turn_front_low', 4.2: 'M4_turn_front_low', 5.0: 'M5_throw_side', 5.5: 'M5_throw_side', 6.0: 'M5_throw_side', 7.0: 'M7_title_lift', 8.0: 'M7_title_lift' };
const h = await start({ size: [960, 540], port: 5301 });
for (const [t, mark] of Object.entries(MAP)) {
  await h.page.evaluate((m) => { window.__kr.kitchen.setLightsOn(1); window.__kr.goMark(m); }, mark);
  await h.save(out, 't' + Number(t).toFixed(1));
}
await h.close();
