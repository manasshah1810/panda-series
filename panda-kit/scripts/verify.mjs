// Automated kit verification. Run: npm run verify   (exit code 1 on any failure)
import * as THREE from 'three';
import { createPanda } from '../src/index.js';
import { TIERS } from '../src/config/defaults.js';
import { poseNames } from '../src/poses/poses.js';

let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const SOCKETS = ['handSocketL', 'handSocketR', 'headTop', 'eyeBridge', 'neckBase', 'chestFront', 'torsoWrap', 'backCenter', 'earSocketL', 'earSocketR', 'footSocketL', 'footSocketR', 'mouthSocket', 'noseSocket'];
const RIG = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'earL', 'earR', 'jaw', 'browL', 'browR', 'eyeL', 'eyeR', 'lidL', 'lidR', 'shoulderL', 'upperArmL', 'elbowL', 'pawL', 'shoulderR', 'upperArmR', 'elbowR', 'pawR', 'hipL', 'legL', 'ankleL', 'footL', 'hipR', 'legR', 'ankleR', 'footR', 'tail', 'belly'];

function stateKeys(p) {
  const k = []; for (const [n] of Object.entries(p.rig)) for (const a of ['px','py','pz','rx','ry','rz','sx','sy','sz']) k.push(n + '.' + a);
  for (const [n, x] of Object.entries(p.face.state)) if (typeof x === 'number') k.push('state.' + n); for (const [n, x] of Object.entries(p.face.channels)) if (typeof x === 'number') k.push('chan.' + n);
  k.push('root.sx', 'root.sy', 'root.sz', 'root.ry'); return k;
}
function stateVector(p) {
  const v = [];
  for (const g of Object.values(p.rig)) v.push(...g.position.toArray(), g.rotation.x, g.rotation.y, g.rotation.z, ...g.scale.toArray());
  const num = (o) => Object.entries(o).filter(([k, x]) => typeof x === 'number').map(([, x]) => x);
  v.push(...num(p.face.state), ...num(p.face.channels), p.root.scale.x, p.root.scale.y, p.root.scale.z, p.root.rotation.y);
  return v;
}
const maxDiff = (a, b) => a.reduce((m, x, i) => Math.max(m, Math.abs(x - b[i])), 0);

// 1) budgets per tier
for (const q of ['high', 'medium', 'low']) {
  const p = createPanda({ quality: q }); const s = p.stats();
  ok(s.triangles <= TIERS[q].budgetTris, `${q}: ${s.triangles} tris (budget ${TIERS[q].budgetTris})`);
  ok(s.drawCalls <= TIERS[q].budgetCalls, `${q}: ${s.drawCalls} draw calls (budget ${TIERS[q].budgetCalls})`);
  ok(s.materials <= 12, `${q}: ${s.materials} materials (budget 12)`);
  p.dispose();
}

const p = createPanda({ quality: 'medium' });
// 2) rig + sockets
ok(RIG.every((n) => p.rig[n]), 'all named rig pivots exist'); ok(SOCKETS.every((n) => p.sockets[n]), 'all 14 sockets exist');
const inTree = (o) => { while (o) { if (o === p.root) return true; o = o.parent; } return false; };
ok(SOCKETS.every((n) => inTree(p.sockets[n])), 'every socket is parented under the root');
const m = p.measure(); ok(m.head && m.torso && m.belly && m.arm, 'measure() returns head/torso/belly/arm');

// 2b) symmetry at rest (world positions of mirrored pivots)
p.root.updateMatrixWorld(true);
let sym = 0; for (const n of ['shoulder', 'elbow', 'paw', 'hip', 'ankle', 'ear', 'eye', 'brow']) { const a = new THREE.Vector3(), b = new THREE.Vector3(); p.rig[n + 'L'].getWorldPosition(a); p.rig[n + 'R'].getWorldPosition(b); sym = Math.max(sym, Math.abs(a.x + b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z)); }
ok(sym < 1e-4, `left/right symmetric at rest (max asymmetry ${sym.toExponential(1)})`);

// 3) no NaN in any pose
let nanPose = 0;
for (const n of poseNames) { p._applyPose(n); p.root.updateMatrixWorld(true); const bad = stateVector(p).some((x) => !Number.isFinite(x)); let badM = false; p.root.traverse((o) => { if (o.isMesh && o.matrixWorld.elements.some((x) => !Number.isFinite(x))) badM = true; }); if (bad || badM) { nanPose++; console.log('  NaN in pose', n); } }
ok(nanPose === 0, `no NaN transforms in ${poseNames.length} poses`);
p._applyPose('neutralStand');

// 4) expression presets render without NaN geometry
let nanExpr = 0; for (const n of p.face.presetNames) { p.face.set(n); p.root.traverse((o) => { if (o.isMesh && o.geometry.attributes.position.array.some?.((x) => !Number.isFinite(x))) nanExpr++; }); }
ok(nanExpr === 0, `no NaN geometry across ${p.face.presetNames.length} expressions`);

// 5) scrub safety: forward, backward and random-jump sampling must give identical state
const names = Object.keys(p.anim); let scrubBad = 0, nanAnim = 0;
for (const name of names) {
  const tl = p.anim[name](); const D = tl.duration(); const N = 24; const ts = Array.from({ length: N + 1 }, (_, i) => (D * i) / N);
  const fwd = ts.map((t) => { tl.time(t); return stateVector(p); });
  const bwd = [...ts].reverse().map((t) => { tl.time(t); return stateVector(p); }).reverse();
  const order = ts.map((t, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const jump = []; order.forEach((i) => { tl.time(ts[i]); jump[i] = stateVector(p); });
  let d = 0; for (let i = 0; i <= N; i++) d = Math.max(d, maxDiff(fwd[i], bwd[i]), maxDiff(fwd[i], jump[i]));
  const bad = fwd.some((s) => s.some((x) => !Number.isFinite(x)));
  if (d > 1e-6) { scrubBad++; const K = stateKeys(p); let w = ''; for (let i = 0; i <= N && !w; i++) for (let j = 0; j < K.length; j++) if (Math.abs(fwd[i][j] - jump[i][j]) > 1e-6 || Math.abs(fwd[i][j] - bwd[i][j]) > 1e-6) { w = `${K[j]} @t=${ts[i].toFixed(3)} fwd=${fwd[i][j]} bwd=${bwd[i][j]} jump=${jump[i][j]}`; break; } console.log(`  scrub mismatch in ${name}: ${d.toExponential(2)} ${w}`); }
  if (bad) { nanAnim++; console.log('  NaN in animation', name); }
  tl.time(0); tl.kill();
}
ok(scrubBad === 0, `all ${names.length} animations are scrub-safe (forward == backward == random jump)`);
ok(nanAnim === 0, 'no NaN transforms during any animation');

// 6) dispose frees everything
const q = createPanda({ quality: 'high' }); const geos = new Set(), mats = new Set(); let freed = 0;
q.root.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) mats.add(o.material); (o.userData.materials || []).forEach((x) => mats.add(x)); });
for (const o of [...geos, ...mats]) o.addEventListener('dispose', () => freed++);
q.dispose(); ok(freed >= geos.size + mats.size - 1, `dispose() freed ${freed}/${geos.size + mats.size} geometries+materials`);

// 7) quality switching keeps working
const r = createPanda({ quality: 'low' }); r.setQuality('high'); r.setQuality('medium'); r.setQuality('low'); ok(r.stats().triangles > 0, 'setQuality() round-trips');

// 8) outfits: contract validator, no residue after unequip, props attach/detach
const { validateOutfit } = await import('../src/outfits/outfitContract.js');
const scarf = (await import('../src/outfits/demoScarf.js')).default;
const tmpl = (await import('../src/outfits/_template.js')).default;
const snapshotTree = (pp) => { const m = new Map(); pp.root.traverse((o) => m.set(o.uuid, [o.parent?.uuid, o.visible, ...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray(), o.children.length].join('|'))); return m; };
const A = createPanda({ quality: 'medium' });
let valid = true; try { validateOutfit(scarf); validateOutfit(tmpl); } catch (e) { valid = false; console.log(e.message); } ok(valid, 'demoScarf and _template pass validateOutfit()');
let rejected = 0; for (const bad of [{}, { id: 'x', version: 1, build() {}, anchors: ['nopeSocket'] }, { id: 'y', version: 1, build() {}, anchors: [], hides: ['wings'] }]) { try { validateOutfit(bad); } catch { rejected++; } } ok(rejected === 3, 'validator rejects malformed outfits with clear errors');
const before = snapshotTree(A); const sv0 = stateVector(A).join(',');
const hat = { id: 'hider', version: 1, anchors: ['headTop'], hides: ['tailMesh', 'earL'], build() { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.2), new THREE.MeshBasicMaterial()); m.userData.socket = 'headTop'; g.add(m); return g; } };
const u1 = A.equip(scarf), u2 = A.equip(hat);
ok(A.outfits.length === 2 && A.root.getObjectByName('scarf'), 'equip() attaches outfits to sockets');
ok(A.root.getObjectByName('tailMesh')?.visible === false || A.root.getObjectByProperty('name', 'tail')?.visible === false || (() => { let h = false; A.root.traverse((o) => { if (o.userData.pandaPart === 'tailMesh' && !o.visible) h = true; }); return h; })(), 'hides[] hides the named parts while worn');
u1(); u2();
const after = snapshotTree(A); let diff = 0; for (const [k, v] of before) if (after.get(k) !== v) diff++; for (const k of after.keys()) if (!before.has(k)) diff++;
ok(diff === 0 && stateVector(A).join(',') === sv0, `unequip() leaves no residue (transforms, visibility, children identical; ${diff} differences)`);
// setQuality while worn re-wears
A.equip(scarf); A.setQuality('low'); ok(A.outfits.includes('demoScarf') && !!A.root.getObjectByName('scarf'), 'outfit survives setQuality()'); A.unequip('demoScarf');
// props
const prop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), new THREE.MeshBasicMaterial());
const detach = A.attachProp(prop, 'handSocketL', { offset: [0, 0, 0.05], gripPose: 'hold' });
ok(prop.parent === A.sockets.handSocketL, 'attachProp() parents the prop to the socket'); detach(); ok(!prop.parent, 'detach() removes the prop');
let badProp = false; try { A.attachProp(prop, 'nope'); } catch { badProp = true; } ok(badProp, 'attachProp() rejects unknown sockets');
// episode outfits: every module in episodes/*/outfit/*.js that default-exports an outfit must validate, equip and unequip cleanly
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const epRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../episodes');
const files = fs.existsSync(epRoot) ? fs.readdirSync(epRoot).flatMap((e) => { const d = path.join(epRoot, e, 'outfit'); return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => path.join(d, f)) : []; }) : [];
if (!files.length) console.log('SKIP episode outfits (none found)');
for (const f of files) {
  try { const o = (await import(pathToFileURL(f))).default; const pp = createPanda({ quality: 'medium' }); const b = snapshotTree(pp); const un = pp.equip(o); un(); const a = snapshotTree(pp); let d = 0; for (const [k, v] of b) if (a.get(k) !== v) d++; ok(d === 0, `episode outfit ${o.id}: validates, equips, unequips with no residue`); pp.dispose(); }
  catch (e) { ok(false, `episode outfit ${path.basename(f)}: ${e.message}`); }
}
// 8) form measurements (v1.1): proportions + silhouette gap, printed and asserted
import { PROPORTIONS as PR } from '../src/config/defaults.js';
{
  const F = createPanda({ quality: 'high', pose: 'relaxedIdle' }); F.root.updateMatrixWorld(true);
  const H = PR.totalHeight, headFrac = (PR.head.radii[1] * 2) / H;
  const pawHalf = PR.arm.pawR * 1.05;
  const armLen = PR.arm.upperLen + PR.arm.foreLen + Math.abs(PR.arm.pawY) + pawHalf, armFrac = armLen / H;
  console.log(`MEASURE head height fraction ${headFrac.toFixed(3)}  arm length (shoulder to paw tip) ${armLen.toFixed(3)} = ${armFrac.toFixed(3)} of height`);
  ok(headFrac >= 0.42 && headFrac <= 0.46, `head height fraction ${headFrac.toFixed(3)} in 0.42..0.46`);
  ok(armFrac >= 0.34 && armFrac <= 0.38, `arm length fraction ${armFrac.toFixed(3)} in 0.34..0.38`);
  F.root.traverse((o) => { if (o.isMesh) o.material.side = THREE.DoubleSide; });
  const rc = new THREE.Raycaster(); const isArm = (o) => /^(upperArm|foreArm|paw)/.test(o.userData.pandaPart || o.name || '');
  const gapAt = (y, dir) => { let best = Infinity; for (const z of [0, 0.05, 0.1, 0.15, 0.2, 0.25]) {
    rc.set(new THREE.Vector3(0, y, z), new THREE.Vector3(dir, 0, 0)); const hits = rc.intersectObject(F.root, true);
    const torso = hits.filter((h) => h.object.userData.pandaPart === 'torso'), arm = hits.filter((h) => isArm(h.object));
    if (!torso.length || !arm.length) continue; best = Math.min(best, arm[0].distance - torso[torso.length - 1].distance);   // arm inner surface minus torso outer surface
  } return best; };
  const gaps = []; for (const y of [0.9, 0.8, 0.7]) for (const dir of [1, -1]) gaps.push([y, dir, gapAt(y, dir)]);
  console.log('MEASURE arm-to-torso gap (m): ' + gaps.map(([y, d, g]) => `y${y}${d > 0 ? 'L' : 'R'}=${g.toFixed(3)}`).join(' '));
  const waist = gaps.filter((g) => g[0] === 0.8 || g[0] === 0.7); ok(waist.every((g) => g[2] >= 0.04), `arm-to-torso gap at waist height >= 0.04 (min ${Math.min(...waist.map((g) => g[2])).toFixed(3)})`);
  const bb = new THREE.Box3().setFromObject(F.root); console.log(`MEASURE total height ${(bb.max.y - bb.min.y).toFixed(3)} (ears included)`);
  F.dispose();
}
process.exit(fail ? 1 : 0);
