// Usage: node scripts/screenshots.mjs <iteration> <set,set,...> [stage]   sets: marks, layout, turn, closeups, grazing, tiers, lights, moods, shaft
import path from 'node:path'; import { start, root } from './_harness.mjs';
const iter = process.argv[2] || '1', sets = (process.argv[3] || 'marks').split(','), stage = process.argv[4] ?? '4';
const out = path.join(root, 'review', `iteration-${iter}`);
const h = await start({ query: `?stage=${stage}&panda=1`, size: [1280, 720] }); const { page, save } = h;
const ev = (f, a) => page.evaluate(f, a);
const marks = await ev(() => Object.keys(window.__kr.CAMERA_MARKS));
for (const s of sets) {
  if (s === 'marks') for (const m of marks) { await ev((m) => window.__kr.goMark(m), m); await save(out, 'mark_' + m.split('_')[0]); }
  if (s === 'marks_nopanda') for (const m of marks) { await ev((m) => window.__kr.goMark(m, { panda: false }), m); await save(out, 'nopanda_' + m.split('_')[0]); }
  if (s === 'layout') { await ev(() => { const k = window.__kr; k.setPandaVisible(true); k.placePanda(Math.PI); k.setCam([0.5, 14, 1.2], [0.5, 0, 0.6], 40); k.camera.up.set(0, 0, -1); k.camera.lookAt(0.5, 0, 0.6); k.renderer.clippingPlanes = [new k.THREE.Plane(new k.THREE.Vector3(0, -1, 0), 4.85)]; }); await save(out, 'layout_topdown'); await ev(() => { window.__kr.camera.up.set(0, 1, 0); window.__kr.renderer.clippingPlanes = []; }); }
  if (s === 'turn') for (const [i, a] of [0, 60, 120, 180].entries()) { await ev((a) => { const k = window.__kr; k.setPandaVisible(true); k.setCam([0, 6.2, 3.6], [0, 0.6, -0.2], 45); k.placePanda(Math.PI - (a * Math.PI) / 180); }, a); await save(out, `turn_${i}_${a}deg`); }
  if (s === 'closeups') for (const [n, p, l, f] of [['island', [3.0, 2.4, 3.4], [2.7, 1.0, 1.4], 36], ['backsplash', [-2.0, 1.8, 0.8], [-2.0, 2.2, -1.9], 40], ['cabinet', [-3.2, 1.2, 0.2], [-3.2, 0.6, -1.1], 40], ['hood', [-1.8, 2.6, 1.6], [-1.8, 3.8, -1.7], 40], ['rail', [-1.4, 2.0, 0.9], [-1.8, 2.1, -1.8], 38], ['shelves', [2.0, 2.6, 0.6], [2.0, 3.3, -1.8], 38], ['sink', [1.4, 1.6, -0.2], [1.4, 1.1, -1.7], 30], ['vase', [3.2, 1.6, 0.4], [3.5, 1.3, -1.6], 36], ['board', [1.1, 1.5, 2.0], [1.35, 1.0, 1.1], 30], ['islandOpen', [2.7, 1.1, -0.6], [2.7, 0.6, 0.9], 40]]) { await ev(([p, l, f]) => { window.__kr.setPandaVisible(false); window.__kr.setCam(p, l, f); }, [p, l, f]); await save(out, 'close_' + n); }
  if (s === 'grazing') for (const [n, p, l] of [['island', [0.2, 1.12, 2.6], [3.4, 1.0, 1.4]], ['backsplash', [-4.4, 2.0, 1.5], [0, 2.2, -1.9]], ['floor', [0, 0.35, 5.5], [0, 0, 0]]]) { await ev(([p, l]) => { window.__kr.setPandaVisible(false); window.__kr.setCam(p, l, 40); }, [p, l]); await save(out, 'graze_' + n); }
  if (s === 'tiers') for (const t of ['high', 'medium', 'low']) { await ev((t) => { window.__kr.kitchen.setQuality(t); window.__kr.goMark('M1_establish_back'); }, t); await save(out, 'tier_' + t); } 
  if (s === 'lights') for (const t of [0, 0.25, 0.4, 0.6, 1]) { await ev((t) => { window.__kr.kitchen.setLightsOn(t); window.__kr.goMark('M4_turn_front_low'); }, t); await save(out, 'lights_' + t); }
  if (s === 'moods') for (const mo of ['morning', 'warmEvening']) { await ev((mo) => { window.__kr.kitchen.setMood(mo); window.__kr.goMark('M1_establish_back'); }, mo); await save(out, 'mood_' + mo); }
  if (s === 'shaft') { await ev(() => { const k = window.__kr; k.setPandaVisible(false); k.kitchen.setTime(2.3); k.setCam([-3.6, 1.6, 3.2], [1.6, 1.4, 0.6], 42); }); await save(out, 'shaft_dust'); }
}
await h.close();
