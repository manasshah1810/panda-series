import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KNIFE } from '../props/knife/knife.js';
import { STICK_POINT, LAND_TILT_DEG, EMBED } from '../props/knife/knifeAnimations.js';
import { TITLE } from '../timeline/beats.js';

/**
 * 3D bamboo title "What if Panda was a Chef?" built only from code: stroke glyphs -> rounded bamboo tubes (no font files).
 * The 'i' of "if" is NOT built: the knife is its stem. Only the i's dot is made (it drops onto the knife handle); the 'f' is a normal letter.
 *
 * All the letters are merged into ONE mesh (1 draw call). Per-letter build animation runs in the vertex shader as a pure function of
 * the single uniform `uT` (master-timeline seconds): scrub-safe by construction, no tweens, no state.
 */
export const TITLE_TEXT = 'What if Panda was a Chef?';

// ---- glyph table. Units: x-height = 1. y up. k: 'L' polyline (sharp joints), 'C' smooth curve. `adv` = advance. ----
const circle = (cx, cy, r, n = 18) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2 + Math.PI), cy + r * Math.sin((i / n) * Math.PI * 2 + Math.PI)]);
const arch = [[0.1, 0.62], [0.24, 0.93], [0.48, 1.0], [0.68, 0.84], [0.72, 0.0]];
export const GLYPHS = {
  W: { adv: 1.3, s: [{ k: 'L', p: [[0.06, 1.45], [0.3, 0], [0.62, 1.0], [0.94, 0], [1.18, 1.45]] }] },
  h: { adv: 1.0, s: [{ k: 'L', p: [[0.1, 0], [0.1, 1.6]] }, { k: 'C', p: arch }] },
  a: { adv: 1.0, s: [{ k: 'C', closed: true, p: circle(0.4, 0.5, 0.4) }, { k: 'L', p: [[0.8, 0.9], [0.8, 0]] }] },
  t: { adv: 0.72, s: [{ k: 'C', p: [[0.3, 1.38], [0.3, 0.3], [0.38, 0.05], [0.58, 0.0]] }, { k: 'L', p: [[0.04, 0.98], [0.56, 0.98]] }] },
  i: { adv: 0.4, s: [{ k: 'L', p: [[0.1, 0], [0.1, 0.98]] }, { k: 'L', p: [[0.1, 1.38], [0.1, 1.4]] }] },
  f: { adv: 0.72, s: [{ k: 'L', p: [[0.3, 0], [0.3, 1.3]] }, { k: 'C', p: [[0.3, 1.3], [0.36, 1.52], [0.56, 1.6], [0.72, 1.52]] }, { k: 'L', p: [[0.04, 1.0], [0.58, 1.0]] }] },
  P: { adv: 0.95, s: [{ k: 'L', p: [[0.1, 0], [0.1, 1.45]] }, { k: 'C', p: [[0.1, 1.45], [0.4, 1.45], [0.64, 1.3], [0.64, 1.05], [0.4, 0.86], [0.1, 0.86]] }] },
  n: { adv: 1.0, s: [{ k: 'L', p: [[0.1, 0], [0.1, 0.98]] }, { k: 'C', p: arch }] },
  d: { adv: 1.0, s: [{ k: 'C', closed: true, p: circle(0.4, 0.5, 0.4) }, { k: 'L', p: [[0.8, 1.6], [0.8, 0]] }] },
  w: { adv: 1.15, s: [{ k: 'L', p: [[0.05, 1.0], [0.28, 0], [0.52, 0.72], [0.76, 0], [0.98, 1.0]] }] },
  s: { adv: 0.78, s: [{ k: 'C', p: [[0.62, 0.86], [0.48, 0.99], [0.28, 1.0], [0.12, 0.88], [0.16, 0.68], [0.38, 0.52], [0.58, 0.36], [0.58, 0.14], [0.4, 0.01], [0.16, 0.04], [0.04, 0.16]] }] },
  e: { adv: 0.92, s: [{ k: 'L', p: [[0.06, 0.5], [0.76, 0.5]] }, { k: 'C', p: [[0.76, 0.5], [0.74, 0.8], [0.5, 0.99], [0.26, 0.95], [0.06, 0.7], [0.05, 0.34], [0.24, 0.05], [0.52, 0.0], [0.76, 0.2]] }] },
  C: { adv: 0.95, s: [{ k: 'C', p: [[0.82, 1.2], [0.68, 1.4], [0.44, 1.46], [0.2, 1.32], [0.05, 1.0], [0.05, 0.55], [0.2, 0.2], [0.44, 0.04], [0.68, 0.06], [0.82, 0.26]] }] },
  '?': { adv: 0.8, s: [{ k: 'C', p: [[0.08, 1.12], [0.14, 1.4], [0.38, 1.5], [0.6, 1.4], [0.66, 1.15], [0.56, 0.96], [0.38, 0.82], [0.36, 0.52]] }, { k: 'L', p: [[0.36, 0.05], [0.36, 0.07]] }] },
};
export const SPACE = 0.5;

/** Bamboo canvas: u runs ALONG the stalk (repeats every internode), v runs around it. Pale-green culm, dark node ring + highlight ridge, fibre streaks. */
function bambooTexture(seed) {
  if (typeof document === 'undefined') return null;
  const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grd = g.createLinearGradient(0, 0, W, 0); grd.addColorStop(0, '#8FB23A'); grd.addColorStop(0.1, '#B5D55A'); grd.addColorStop(0.55, '#C4E06A'); grd.addColorStop(0.9, '#A9CB4F'); grd.addColorStop(1, '#8FB23A');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const y = r() * H, v = r(); g.strokeStyle = v > 0.5 ? `rgba(70,110,20,${0.10 + r() * 0.16})` : `rgba(230,245,150,${0.10 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 2.2; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (r() - 0.5) * 3); g.stroke(); }
  g.fillStyle = '#5F7E1E'; g.fillRect(0, 0, 7, H); g.fillRect(W - 6, 0, 6, H);                  // the node ring (wraps across the repeat seam)
  g.fillStyle = '#E3F08F'; g.fillRect(8, 0, 3, H);                                                // light ridge just above the node
  g.fillStyle = 'rgba(40,60,10,0.5)'; g.fillRect(W - 8, 0, 2, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

/** Build the title. opts: { envMap, unit = 0.18 (x-height, metres), radius = 0.14 (stroke radius in glyph units), stick, tiltDeg } */
export function createWoodenTitle({ envMap = null, unit = 0.18, radius = 0.14, stick = STICK_POINT, tiltDeg = LAND_TILT_DEG, timing = {} } = {}) {
  const T = { hookStart: TITLE.hookStart, hookDur: 0.9, restStart: TITLE.restStart, restEnd: TITLE.restEnd, letterDur: 0.42, ...timing };
  const tan = Math.tan((tiltDeg * Math.PI) / 180), S = new THREE.Vector3(...stick), rad = radius * unit;
  const toWorld = (xu, v) => new THREE.Vector3(xu + tan * v, S.y + v, S.z);          // sheared title plane: the knife axis is the vertical line xu = S.x
  const pieces = [];   // { geo, start, dur, pivot, dir, rot, amt, tag }

  const tubeFor = (pts3, closed) => {
    const curve = new THREE.CatmullRomCurve3(pts3, closed, 'centripetal'), seg = Math.max(10, Math.round(curve.getLength() / (unit * 0.045)));
    const geo = new THREE.TubeGeometry(curve, seg, rad, 8, closed); return geo;
  };
  const NODE = unit * 1.15;   // distance between bamboo nodes (world metres)
  const setU = (g, f) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, f(uv.getX(i), uv.getY(i))); uv.needsUpdate = true; return g; };
  const strokeGeos = (stroke, place) => {
    const pts = stroke.p.map(([x, y]) => place(x, y)), geos = [], PH = 0.3;
    const cap = (g, arc) => setU(g, () => arc / NODE + PH);
    if (stroke.k === 'C') { const tg = tubeFor(pts, !!stroke.closed), L = tg.parameters.path.getLength(); geos.push(setU(tg, (u) => (u * L) / NODE + PH)); if (!stroke.closed) [[pts[0], 0], [pts.at(-1), L]].forEach(([p, arc]) => geos.push(cap(new THREE.SphereGeometry(rad, 8, 6).translate(p.x, p.y, p.z), arc))); }
    else { let acc = 0; for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b), a0 = acc; const cur = new THREE.LineCurve3(a, b); geos.push(setU(new THREE.TubeGeometry(cur, 2, rad, 8, false), (u) => (a0 + u * len) / NODE + PH));
      geos.push(cap(new THREE.SphereGeometry(rad, 8, 6).translate(a.x, a.y, a.z), a0)); acc += len; if (i === pts.length - 2) geos.push(cap(new THREE.SphereGeometry(rad, 8, 6).translate(b.x, b.y, b.z), acc));
    } }
    return geos;
  };
  const addPiece = (geos, meta) => {
    const clean = geos.map((g) => { const c = g.index ? g.toNonIndexed() : g; c.deleteAttribute('uv') ; return c; });
    // keep uv for the grain: rebuild from tube uvs when present
    const geo = mergeGeometries(geos.map((g) => { const c = g.index ? g.toNonIndexed() : g.clone(); if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2)); return c; }), false);
    clean.forEach((g) => g.dispose()); geos.forEach((g) => g.dispose());
    const bb = new THREE.Box3().setFromBufferAttribute(geo.attributes.position); meta.pivot = bb.getCenter(new THREE.Vector3()); pieces.push({ geo, ...meta });
  };

  // ---- layout: find the cursor start so that the stem of the 'i' in "if" sits exactly on the knife axis (xu = S.x) ----
  const chars = [...TITLE_TEXT]; const fStemIdx = TITLE_TEXT.indexOf('if');              // index of the knife 'i'
  const adv = (ch) => (ch === ' ' ? SPACE : GLYPHS[ch].adv);
  let before = 0; for (let i = 0; i < fStemIdx; i++) before += adv(chars[i]);
  const x0 = S.x - (before + 0.1) * unit;                                               // glyph i stem is at x = 0.1
  let cursor = 0; const letterOrder = [];
  chars.forEach((ch, i) => {
    const cx = x0 + cursor * unit; cursor += adv(ch);
    if (ch === ' ' || i === fStemIdx) return;
    letterOrder.push({ ch, i, cx });
  });
  const nLetters = letterOrder.length, stag = (T.restEnd - T.letterDur - T.restStart) / Math.max(1, nLetters - 1);
  letterOrder.forEach(({ ch, cx }, k) => {
    const place = (gx, gy) => toWorld(cx + gx * unit, gy * unit);
    const geos = GLYPHS[ch].s.flatMap((s) => strokeGeos(s, place));
    addPiece(geos, { start: T.restStart + k * stag, dur: T.letterDur, dir: new THREE.Vector3(0, -0.18, 0.12), amt: 1, rot: (k % 2 ? 1 : -1) * 0.35, tag: ch });
  });

  // ---- the i's dot, built in knife coordinates (du from the axis, v up the axis in plane height): drops onto the handle butt ----
  const c15 = Math.cos((tiltDeg * Math.PI) / 180), exposed = KNIFE.length - EMBED / c15, vTop = exposed * c15;
  const dotR = rad * 1.9, dotV = vTop + 0.04 + dotR, dc = toWorld(S.x, dotV);
  const dotGeo = new THREE.SphereGeometry(dotR, 16, 12).translate(dc.x, dc.y, dc.z); setU(dotGeo, (u) => u * 2 + 0.3);
  addPiece([dotGeo], { start: T.hookStart, dur: T.hookDur, dir: new THREE.Vector3(0.0, 0.34, 0.0), amt: 1, rot: 0, tag: 'i-dot' });

  // ---- merge to ONE mesh with per-vertex animation attributes ----
  const geos = pieces.map((p) => {
    const g = p.geo, n = g.attributes.position.count, fill = (v) => { const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(v, i * 3); return new THREE.BufferAttribute(a, 3); };
    g.setAttribute('aPivot', fill(p.pivot.toArray())); g.setAttribute('aDir', fill(p.dir.toArray()));
    g.setAttribute('aTime', fill([p.start, p.dur, p.rot])); return g;
  });
  const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
  const uniforms = { uT: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', map: bambooTexture(5), roughness: 0.42, metalness: 0, emissive: '#6E9A22', emissiveIntensity: 0.32, envMap, envMapIntensity: 0.55 });
  if (!mat.map) mat.color.set('#B5D55A');
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uniforms.uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uT; attribute vec3 aPivot, aDir, aTime;
      float backOut(float x){ float c1 = 1.9, c3 = c1 + 1.0; x = x - 1.0; return 1.0 + c3 * x * x * x + c1 * x * x; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { float pr = clamp((uT - aTime.x) / aTime.y, 0.0, 1.0); float e = backOut(pr); float ang = (1.0 - e) * aTime.z;
        vec3 d = position - aPivot; float cs = cos(ang), sn = sin(ang); d.xy = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
        float sc = pr <= 0.0 ? 0.0 : e; transformed = aPivot + d * sc + aDir * (1.0 - clamp(e, 0.0, 1.2)) * step(0.0001, pr + 0.0); if (pr <= 0.0) transformed = aPivot; }`);
  };
  mat.customProgramCacheKey = () => 'woodenTitle';
  const mesh = new THREE.Mesh(merged, mat); mesh.name = 'woodenTitle'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  const group = new THREE.Group(); group.name = 'titleGroup'; group.add(mesh);

  const info = {
    letters: nLetters, spanX: [x0, x0 + cursor * unit + tan * 1.6 * unit], baseY: S.y, z: S.z, knifeTopV: vTop, unit,
    box: new THREE.Box3().setFromBufferAttribute(merged.attributes.position),
  };
  return {
    group, mesh, info, material: mat,
    /** master-timeline seconds -> pose of every letter (pure) */
    setTime(t) { uniforms.uT.value = t; },
    setEnvMap(t) { mat.envMap = t; mat.needsUpdate = true; },
    dispose() { merged.dispose(); mat.map?.dispose(); mat.dispose(); },
  };
}

/** Flat HTML fallback ("title_flat_fallback"): same words, 3 lines, built around the projected 3D knife stem. */
export function createFlatTitle(parent = document.body) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none;font:900 clamp(30px,9.6vw,64px)/1.05 "Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif;color:#E9C48A;text-shadow:0 3px 0 #8A5A2B,0 8px 18px rgba(30,18,8,.55);letter-spacing:.01em';
  const mkLine = (html) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;white-space:nowrap'; d.innerHTML = html; el.appendChild(d); return d; };
  const l1 = mkLine('What i'), hook = document.createElement('div'), bar = document.createElement('div'), l2 = mkLine('Panda was'), l3 = mkLine('a Chef?');
  hook.style.cssText = 'position:absolute;border:solid #E9C48A;border-width:.11em .11em 0 0;border-radius:0 .5em 0 0;box-shadow:0 3px 0 #8A5A2B'; bar.style.cssText = 'position:absolute;background:#E9C48A;border-radius:.1em;box-shadow:0 3px 0 #8A5A2B'; el.append(hook, bar);
  parent.appendChild(el);
  return {
    el,
    /** knife = { x, yTop, yBottom } in CSS px of the stage (project the knife's top/bottom world points yourself). t = master seconds. */
    layout(knife, W, H, t) {
      const fs = parseFloat(getComputedStyle(l1).fontSize) || 40, h = Math.max(20, knife.yBottom - knife.yTop);
      const k = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a))), e = (x) => 1 - Math.pow(1 - x, 3);
      l1.style.left = `${knife.x - l1.offsetWidth - fs * 0.12}px`; l1.style.top = `${knife.yBottom - fs * 1.0}px`; l1.style.opacity = e(k(6.5, 7.1, t));
      hook.style.left = `${knife.x - fs * 0.03}px`; hook.style.top = `${knife.yTop - fs * 0.18}px`; hook.style.width = `${fs * 0.42}px`; hook.style.height = `${fs * 0.3}px`; hook.style.opacity = e(k(6.0, 6.7, t));
      bar.style.left = `${knife.x - fs * 0.3}px`; bar.style.top = `${knife.yBottom - h * 0.35}px`; bar.style.width = `${fs * 0.6}px`; bar.style.height = `${fs * 0.13}px`; bar.style.opacity = e(k(6.0, 6.7, t));
      l2.style.left = `${W / 2 - l2.offsetWidth / 2}px`; l2.style.top = `${knife.yBottom + fs * 0.4}px`; l2.style.opacity = e(k(6.9, 7.5, t));
      l3.style.left = `${W / 2 - l3.offsetWidth / 2}px`; l3.style.top = `${knife.yBottom + fs * 1.5}px`; l3.style.opacity = e(k(7.2, 7.8, t));
    },
    show(v) { el.style.display = v ? 'block' : 'none'; },
    dispose() { el.remove(); },
  };
}
