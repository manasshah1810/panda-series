// Headless verification for Beat 3 (ASMR chop): boot, mount, pivot rigging, strike / shake / fleck contracts, flourish + wink, scrub-safety, budget.  -> review/chop/chop-checks.json
//   node scripts/chop-checks.mjs            (Q=low|medium|high, default medium)
import { start } from './_h.mjs'; import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../review/chop'); fs.mkdirSync(out, { recursive: true });
const h = await start({ size: [480, 270], port: 5392, query: 'quality=' + (process.env.Q || 'medium') });
const R = {}, hash = async (t) => crypto.createHash('sha256').update(await h.page.evaluate((x) => window.__op.frame(x), t)).digest('hex').slice(0, 16);
const { C0, D, N, IMPACTS, times } = await h.page.evaluate(() => { const o = window.__op, c = o.chopTl.chop; return { C0: o.CHOP_START, D: o.CHOP_DURATION, N: c.impacts.length, IMPACTS: c.impacts, times: c.times }; });
const EPS = 1e-4;

// 1. boot: no console errors / warnings, no GL error, shaders compiled
R.boot = await h.page.evaluate(([c0]) => { const o = window.__op; o.seek(c0 + 3); return { glError: o.renderer.getContext().getError(), programs: o.renderer.info.programs.length }; }, [C0]); R.boot.consoleErrors = h.errors; R.boot.pass = R.boot.glError === 0 && h.errors.length === 0;

// 2. sequence + mount: Beat 1 -> 1b -> 2 -> 3 on ONE master timeline; the sliceable bamboo hangs off the cutting-board frame, the solid cone is hidden during the chop and back before it
R.stitch = await h.page.evaluate(([c0, d]) => { const o = window.__op; const cone = o.raw.ingredientsMap.get('bamboo_shoot').parts[0].root; const r = {};
  r.beats = { openingEnd: o.OPENING_END, heroDuration: o.HERO_TIMES.duration, miseStart: o.MISE_START, miseDuration: o.MISE_DURATION, chopStart: c0, chopDuration: d, masterDuration: o.op.master.duration() };
  r.contiguous = Math.abs(o.MISE_START - (o.OPENING_END + o.HERO_TIMES.duration)) < 1e-9 && Math.abs(c0 - (o.MISE_START + o.MISE_DURATION)) < 1e-9 && Math.abs(o.op.master.duration() - (c0 + d)) < 1e-6;
  r.mountedOnBoardFrame = o.sliceable.group.parent === o.raw.group;
  o.seek(c0 - 0.5); r.beforeChop = { cone: cone.visible, sliceable: o.sliceable.group.visible };
  o.seek(c0 + 3); r.duringChop = { cone: cone.visible, sliceable: o.sliceable.group.visible };
  o.seek(c0 - 0.5); r.backAgain = { cone: cone.visible, sliceable: o.sliceable.group.visible };
  r.sliceCount = o.sliceable.count; r.pass = r.contiguous && r.mountedOnBoardFrame && r.beforeChop.cone && !r.beforeChop.sliceable && !r.duringChop.cone && r.duringChop.sliceable && r.backAgain.cone && !r.backAgain.sliceable && r.sliceCount >= 8 && r.sliceCount <= 10; return r; }, [C0, D]);

// 3. rigging: every slice pivots about its BOTTOM-FRONT edge; rotation.x = +90deg tips it forward onto the board, flat, never below the surface (all u)
R.rigging = await h.page.evaluate(() => { const o = window.__op, T = o.THREE, sl = o.sliceable, res = []; let ok = true; o.seek(o.CHOP_START + 3); o.raw.group.updateMatrixWorld(true);
  for (let i = 0; i < sl.count; i++) { const s = sl.slices[i], mesh = s.children[0]; sl.setSliceTip(i, 0); s.updateMatrixWorld(true);
    const b0 = new T.Box3().setFromObject(mesh), inv = o.raw.group.matrixWorld.clone().invert(); b0.applyMatrix4(inv);
    const pivotY = s.position.y, pivotZ = s.position.z, thick = sl.BAMBOO.thickness;
    const standing = { bottomY: +b0.min.y.toFixed(4), frontZ: +b0.max.x.toFixed(4), pivotZ: +pivotZ.toFixed(4), rotX: s.rotation.x };
    let minY = Infinity; for (let k = 0; k <= 200; k++) { sl.setSliceTip(i, k / 200); s.updateMatrixWorld(true); const b = new T.Box3().setFromObject(mesh).applyMatrix4(inv); minY = Math.min(minY, b.min.y); }
    sl.setSliceTip(i, 1); s.updateMatrixWorld(true); const b1 = new T.Box3().setFromObject(mesh).applyMatrix4(inv), l = sl.landing(i);
    const flat = { rotX: +s.rotation.x.toFixed(6), minY: +b1.min.y.toFixed(4), height: +(b1.max.y - b1.min.y).toFixed(4), restsOnTier: Math.abs(b1.min.y - l.y) < 0.002, forward: (b1.min.x + b1.max.x) / 2 > l.z + 0.2 * sl.slices[i].userData.rF };
    const pass = Math.abs(standing.bottomY) < 0.008 && Math.abs(standing.frontZ - standing.pivotZ) < 0.003 && Math.abs(standing.rotX) < 1e-12 && Math.abs(flat.rotX - Math.PI / 2) < 1e-4 && flat.restsOnTier && flat.forward && flat.height < thick + 0.012 && minY > -0.0015; ok &&= pass; res.push({ i, standing, flat, minYOverAllU: +minY.toFixed(5), pass }); sl.setSliceTip(i, 0); }
  return { slices: res, pass: ok }; });

// 4. choreography: 8-10 strikes, one slice tips per strike frame; the knife edge is ON the board at every strike; micro camera shake -0.01 y and back to 0; 4 flecks per burst
R.strikes = await h.page.evaluate(([c0, imp]) => { const o = window.__op, T = o.THREE, sl = o.sliceable, cam = o.camera, M14y = o.chopTl.chop.marks.M14.p.y, dbg = o.chopTl.chop.debug, res = []; let ok = true; const boardY = o.raw.group.getWorldPosition(new T.Vector3()).y;
  const tipOf = (i) => sl.slices[i].rotation.x, flecksLive = (i) => { let n = 0; const a = o.chopTl.chop.flecks.mesh.instanceMatrix.array; for (let j = 0; j < 4; j++) { const k = (i * 4 + j) * 16; if (Math.hypot(a[k], a[k + 1], a[k + 2]) > 1e-6) n++; } return n; };   // (raw buffer: decompose() of a zero-scale matrix reports 1)
  for (let i = 0; i < imp.length; i++) { const I = imp[i];
    o.seek(c0 + I - 0.02); const before = sl.slices.map((s) => s.rotation.x), fallenBefore = before.filter((x) => x > 1e-9).length, f0 = flecksLive(i);
    o.seek(c0 + I); const edgeAtImpact = dbg.edge.clone(), contact = dbg.contact.clone(), camAtImpact = cam.position.y - M14y;
    o.seek(c0 + I + 0.05); const after = sl.slices.map((s) => s.rotation.x), movedNow = after.map((x, k) => x > before[k] + 1e-9 ? k : -1).filter((k) => k >= 0);
    // shake: sample the window
    let minBump = 0; for (let k = 0; k <= 44; k++) { o.seek(c0 + I + k * 0.005); minBump = Math.min(minBump, cam.position.y - M14y); } o.seek(c0 + I + 0.3); const bumpAfter = cam.position.y - M14y;
    o.seek(c0 + I + 0.2); const f1 = flecksLive(i); o.seek(c0 + I + 0.7); const f2 = flecksLive(i);
    const r = { i, impact: I, fallenBeforeStrike: fallenBefore, sliceMovedAtImpact: movedNow, edgeToContactMM: +(edgeAtImpact.distanceTo(contact) * 1000).toFixed(2), edgeAboveBoardMM: +((edgeAtImpact.y - boardY) * 1000).toFixed(2), camBumpAtImpact: +camAtImpact.toFixed(6), minBump: +minBump.toFixed(5), bumpAfter: Math.abs(bumpAfter) < 1e-9, flecks: [f0, f1, f2] };
    r.pass = fallenBefore === i && movedNow.length === 1 && movedNow[0] === i && r.edgeToContactMM < 1.5 && Math.abs(r.edgeAboveBoardMM) < 1.5 && Math.abs(camAtImpact) < 1e-9 && Math.abs(minBump + 0.01) < 0.0006 && r.bumpAfter && f0 === 0 && f1 === 4 && f2 === 0; ok &&= r.pass; res.push(r); }
  return { count: imp.length, perStrike: res, pass: ok && imp.length >= 8 && imp.length <= 10 }; }, [C0, IMPACTS]);

// 5. flourish: the spin is a rotation about the knife's LOCAL Z (the world direction of that axis never changes while the blade turns); wink face state at the end
R.flourish = await h.page.evaluate(([c0, t]) => { const o = window.__op, T = o.THREE, k = o.knife, z = new T.Vector3(), y = new T.Vector3(), zs = [], angs = [];
  for (let u = 0; u <= 1.0001; u += 0.1) { const tt = t.spin[0] + (t.spin[1] - t.spin[0]) * u; o.seek(c0 + tt); k.updateMatrixWorld(true); z.set(0, 0, 1).transformDirection(k.matrixWorld); y.set(0, 1, 0).transformDirection(k.matrixWorld); zs.push(z.toArray().map((v) => +v.toFixed(4))); angs.push(+Math.atan2(y.y, y.z).toFixed(3)); }
  const zDrift = Math.max(...zs.map((v) => Math.hypot(v[0] - zs[0][0], v[1] - zs[0][1], v[2] - zs[0][2]))), turned = Math.max(...angs) - Math.min(...angs);
  o.seek(c0 + t.duration); const f = o.panda.face.state, end = { lidL: +f.lidL.toFixed(3), lidR: +f.lidR.toFixed(3), mCurve: +f.mCurve.toFixed(3) }; o.seek(c0 + t.wink[0] - 0.3); const before = { lidR: +o.panda.face.state.lidR.toFixed(3) };
  return { localZDrift: zDrift, bladeAngleRangeRad: +turned.toFixed(3), wink: { before, end }, pass: zDrift < 0.01 && turned > 3 && end.lidR > 0.9 && end.lidL < 0.3 && before.lidR < 0.7 && end.mCurve > 0.4 }; }, [C0, times]);

// 5b. follow-up fixes: (a) CONTINUITY: only the solid cone is swapped, the other 11 ingredients (and their shadows) stay visible through the whole beat;
//     (b) the knife is a CHILD of handSocketR for the whole beat and its origin never leaves the socket (floating-knife bug);  (c) slices tip about their pivot: x never moves, pivot never slides;  (d) camera recovery is a 0.6 s power2.inOut move
R.followups = await h.page.evaluate(([c0, D, t, imp]) => { const o = window.__op, T = o.THREE, raw = o.raw, hand = o.panda.sockets.handSocketR, res = {}, ids = [...raw.ids], others = ids.filter((id) => id !== 'bamboo_shoot'), vis = (id) => raw.ingredientsMap.get(id).parts.every((p) => { let v = true; for (let x = p.root; x; x = x.parent) if (!x.visible) v = false; return v && (!p.shadow || p.shadow.visible); });
  const samples = []; for (let u = 0; u <= D; u += 0.2) samples.push(+u.toFixed(2)); for (const x of imp) samples.push(x + 0.05);
  let hiddenSeen = new Set(), coneInChop = false, knifeBad = [], maxOff = 0, hv = new T.Vector3(), kv = new T.Vector3();
  for (const u of samples) { o.seek(c0 + u); for (const id of others) if (!vis(id)) hiddenSeen.add(id); if (u > 1.0 && vis('bamboo_shoot')) coneInChop = true;
    if (o.knife.visible) { o.knife.updateMatrixWorld(true); hand.getWorldPosition(hv); o.knife.getWorldPosition(kv); const off = hv.distanceTo(kv); maxOff = Math.max(maxOff, off); if (o.knife.parent !== hand || off > 0.006) knifeBad.push([u, o.knife.parent?.name, +off.toFixed(4)]); } }
  o.seek(c0 - 1); const parentBefore = o.knife.parent === o.scene; o.seek(c0 + 5); o.seek(c0 - 1); const parentBack = o.knife.parent === o.scene;
  res.continuity = { otherIngredients: others.length, hiddenAtAnyTime: [...hiddenSeen], coneHiddenDuringChop: !coneInChop, pass: others.length === 11 && hiddenSeen.size === 0 && !coneInChop };
  res.knife = { parentedToHandSocketWhileVisible: knifeBad.length === 0, maxOriginOffsetFromSocketMM: +(maxOff * 1000).toFixed(2), violations: knifeBad.slice(0, 5), backInSceneBeforeBeat: parentBefore && parentBack, pass: knifeBad.length === 0 && maxOff < 0.006 && parentBefore && parentBack };
  let maxX = 0, maxDz = 0; const sl = o.sliceable; for (let i = 0; i < sl.count; i++) for (let k = 0; k <= 50; k++) { sl.setSliceTip(i, k / 50); maxX = Math.max(maxX, Math.abs(sl.slices[i].position.x)); maxDz = Math.max(maxDz, Math.abs(sl.slices[i].position.z - sl.restPivot(i).z)); sl.setSliceTip(i, 0); }
  res.slices = { maxPivotSidewaysMM: +(maxX * 1000).toFixed(3), maxPivotForwardMM: +(maxDz * 1000).toFixed(3), tipsAbout: 'bottom-front edge', pass: maxX < 1e-9 && maxDz < 1e-9 };
  const cam = o.camera, a = c0 + t.sweep[0], b = c0 + t.sweep[1]; o.seek(a - 0.01); const p0 = cam.position.clone(); o.seek(b); const p1 = cam.position.clone(); o.seek(b + 0.3); const p2 = cam.position.clone();
  res.cameraRecovery = { seconds: +(t.sweep[1] - t.sweep[0]).toFixed(3), ease: 'power2.inOut', moved: +p0.distanceTo(p1).toFixed(3), restsAfter: p1.distanceTo(p2) < 0.02, pass: Math.abs(t.sweep[1] - t.sweep[0] - 0.6) < 1e-9 && p0.distanceTo(p1) > 0.5 && p1.distanceTo(p2) < 0.02 };
  res.pass = res.continuity.pass && res.knife.pass && res.slices.pass && res.cameraRecovery.pass; return res; }, [C0, D, times, IMPACTS]);

// 6. scrub-safety: frames + numeric state are bit-identical forward / backward / shuffled; reversing really stands the slices back up; long excursions do not drift
const steps = [...Array(Math.round(D / 0.25) + 1).keys()].map((i) => +(i * 0.25).toFixed(2)); for (const x of [0.02, 0.3, 1.39, 1.41, 1.5, 6.35, 6.4]) steps.push(x);
const st = (t) => h.page.evaluate((x) => { const o = window.__op, a = []; o.seek(x); const c = o.camera, P = o.panda; a.push(...c.position.toArray(), ...c.quaternion.toArray(), c.fov);
  for (const s of o.sliceable.slices) a.push(...s.position.toArray(), s.rotation.x, s.rotation.y, s.visible ? 1 : 0); a.push(o.sliceable.group.visible ? 1 : 0, o.knife.visible ? 1 : 0); if (o.knife.visible) a.push(...o.knife.position.toArray(), ...o.knife.quaternion.toArray());   // an invisible knife's transform is not observable
  for (const k of ['chest', 'spine', 'shoulderR', 'elbowR', 'head']) a.push(...P.rig[k].rotation.toArray().slice(0, 3)); for (const k of Object.keys(P.face.state)) a.push(P.face.state[k]);
  a.push(...o.chopTl.chop.flecks.mesh.instanceMatrix.array.slice(0, 36 * 16)); a.push(o.scene.fog.density, +document.getElementById('vignette').style.opacity, P.root.visible ? 1 : 0);
  return a.map((v) => String(Math.round(v * 1e6) / 1e6 + 0)).join(','); }, t);
const F = {}, B = {}, J = {}, SF = {}, SJ = {};
for (const t of steps) { F[t] = await hash(C0 + t); SF[t] = await st(C0 + t); }
for (const t of [...steps].reverse()) B[t] = await hash(C0 + t);
for (const t of [...steps].sort((a, b) => ((a * 7.3) % 1) - ((b * 7.3) % 1))) { J[t] = await hash(C0 + t); SJ[t] = await st(C0 + t); }
const bad = steps.filter((t) => F[t] !== B[t] || F[t] !== J[t]), badState = steps.filter((t) => SF[t] !== SJ[t]);
const a0 = await hash(C0 + 4.7); await h.page.evaluate(([c0]) => { for (const t of [0, 5, 11, 14, c0 - 1, c0 + 9, c0 + 2, 3, c0 + 0.5, c0 + 6, 1]) window.__op.seek(t); }, [C0]); const a1 = await hash(C0 + 4.7);
R.reversal = await h.page.evaluate(([c0, imp]) => { const o = window.__op, sl = o.sliceable, rx = () => sl.slices.map((s) => s.rotation.x); o.seek(c0 + 10.6); const end = rx(); o.seek(c0 + imp[4] - 0.01); const mid = rx(); o.seek(c0 + imp[0] - 0.01); const start = rx(); o.seek(c0 + 10.6); const again = rx();
  return { allFlatAtEnd: end.every((x) => x > 1.5), midStandingFrom4: mid.slice(4).every((x) => Math.abs(x) < 1e-12) && mid.slice(0, 4).every((x) => x > 1.4), allStandingAtStart: start.every((x) => Math.abs(x) < 1e-12), idempotent: JSON.stringify(end) === JSON.stringify(again) }; }, [C0, IMPACTS]); R.reversal.pass = Object.values(R.reversal).every(Boolean);
R.scrub = { frames: steps.length, distinctFrames: new Set(Object.values(F)).size, frameMismatches: bad, stateMismatches: badState, excursionDrift: a0 !== a1, reversal: R.reversal, pass: bad.length === 0 && badState.length === 0 && a0 === a1 && R.reversal.pass };
delete R.reversal;

// 7. budget: the new content alone (sliceable + flecks), the whole beat's hero frames (full scene, shadow pass included), against 65 calls / 40k triangles
R.budget = await h.page.evaluate(([c0]) => { const o = window.__op, res = {}; o.seek(c0 + 3.0); const mine = new Set(); o.sliceable.group.traverse((x) => mine.add(x)); o.chopTl.chop.flecks.mesh.traverse((x) => mine.add(x));
  const vis = new Map(); o.scene.traverse((x) => { if (x.isMesh || x.isPoints || x.isLine) { vis.set(x, x.visible); if (!mine.has(x)) x.visible = false; } });
  o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.newContentWithShadowPass = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles };
  o.renderer.shadowMap.enabled = false; o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); res.newContentMainPass = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; o.renderer.shadowMap.enabled = true; vis.forEach((v, x) => { x.visible = v; }); res.own = o.sliceable.stats();
  res.fullScene = {}; for (const t of [0.8, 2.0, 4.5, 6.45, 8.0, 10.0]) { o.seek(c0 + t); o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); const a = { withShadows: { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles } }; o.renderer.shadowMap.enabled = false; o.renderer.info.reset(); o.renderer.render(o.scene, o.camera); a.mainPass = { calls: o.renderer.info.render.calls, triangles: o.renderer.info.render.triangles }; o.renderer.shadowMap.enabled = true; res.fullScene['t' + t] = a; }
  res.pass = res.newContentWithShadowPass.calls <= 65 && res.newContentWithShadowPass.triangles <= 40000; return res; }, [C0]);
R.budget.worstFullSceneMainPassCalls = Math.max(...Object.values(R.budget.fullScene).map((v) => v.mainPass.calls)); R.budget.worstFullSceneMainPassTriangles = Math.max(...Object.values(R.budget.fullScene).map((v) => v.mainPass.triangles));
// 8. procedural only: no external image / model requests were made by the page beyond the app's own modules
R.noExternalAssets = await h.page.evaluate(() => { const r = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\.(png|jpe?g|webp|gif|hdr|exr|glb|gltf|obj|fbx|mp3|wav|ogg|mp4|webm)(\?|$)/i.test(n)); return { requested: r, pass: r.length === 0 }; });
R.pass = ['boot', 'stitch', 'rigging', 'strikes', 'flourish', 'followups', 'scrub', 'budget', 'noExternalAssets'].every((k) => R[k].pass);
fs.writeFileSync(path.join(out, 'chop-checks.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify({ pass: R.pass, ...Object.fromEntries(['boot', 'stitch', 'rigging', 'strikes', 'flourish', 'followups', 'scrub', 'budget', 'noExternalAssets'].map((k) => [k, R[k].pass])), budget: { ...R.budget, fullScene: undefined } }, null, 1)); await h.close(); process.exit(R.pass ? 0 : 1);
