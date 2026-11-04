import * as THREE from 'three';
import { mulberry32 } from '../props/helpers.js';

// ---------- periodic value noise (tiles seamlessly when the lattice period divides the texture) ----------
function hash(i, j, seed) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, px, py, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed), c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, px, py, oct, seed) { let a = 0.5, s = 0, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * vnoise(x * f, y * f, px * f, py * f, seed + o * 17); n += a; a *= 0.5; f *= 2; } return s / n; }
const hex = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };   // THREE.Color converts to linear; textures are sRGB so use raw hex
const rawHex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function finish(canvas, { srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
function paint(size, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const o = (j * size + i) * 4, col = fn(i / size, j / size); d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
  ctx.putImageData(img, 0, 0); return c;
}

/** Polished marble: sweeping veins from a domain-warped sine ridge (classic marble), a thick soft layer + a thin sharp layer + faint clouding.
 *  Integer lattice frequencies keep it seamless when tiled. */
export function marbleTexture(size, pal, { seed = 1, base = pal.marble_base, veinStrength = 1, freq = 2, dir = [1, 1], warp = 0.9 } = {}) {
  const B = rawHex(base), VL = rawHex(pal.marble_vein_light), VD = rawHex(pal.marble_vein_dark), P = freq, TAU = Math.PI * 2;
  return finish(paint(size, (u, v) => {
    const x = u * P, y = v * P;
    const w1 = fbm(x, y, P, P, 4, seed) - 0.5, w2 = fbm(x + 3.1, y + 1.7, P, P, 4, seed + 5) - 0.5, w3 = fbm(x * 2 + 9, y * 2 + 4, P * 2, P * 2, 3, seed + 9) - 0.5;
    const ph1 = TAU * (dir[0] * u + dir[1] * v) + warp * 7 * w1 + warp * 2.2 * w3, ph2 = TAU * (dir[0] * 2 * u + dir[1] * 3 * v) + warp * 9 * w2 + warp * 3 * w3 + 1.3;
    const r1 = 1 - Math.abs(Math.sin(ph1 * 0.5)), r2 = 1 - Math.abs(Math.sin(ph2 * 0.5));
    const soft = Math.pow(sstep(0.9, 1.0, r1), 1.4) * veinStrength, thin = Math.pow(sstep(0.965, 1.0, r2), 1.2) * veinStrength * (0.35 + 0.9 * Math.max(0, fbm(x * 3, y * 3, P * 3, P * 3, 2, seed + 40) - 0.35));
    const halo = sstep(0.62, 0.95, r1) * 0.22 * veinStrength, cloud = fbm(x * 2, y * 2, P * 2, P * 2, 3, seed + 31);
    let c = mix(B, VL, 0.1 + 0.22 * cloud * cloud + halo);
    c = mix(c, VL, soft * 0.7); c = mix(c, VD, soft * soft * 0.35 + thin * 0.7);
    return c;
  }), { aniso: 8 });
}

/** Soft cream-greige marble for the backsplash: thin warped main veins, finer secondary veins at a second scale, and low-contrast branches that only sprout near the main veins
 *  (so it never turns into a crackle network). Veins are a few percent darker than the stone, not black lines. Integer lattice frequencies keep it seamless. */
export function softMarbleTexture(size, pal, { seed = 21, base = pal.backsplash_marble_base, vein = pal.backsplash_vein, freq = 2, dir = [1, 2], contrast = 1 } = {}) {
  const B = rawHex(base), V = rawHex(vein), warmCloud = mix(B, [B[0] * 1.02 > 255 ? 255 : B[0] * 1.02, B[1] * 1.01, B[2] * 0.97], 1), P = freq, TAU = Math.PI * 2;
  return finish(paint(size, (u, v) => {
    const x = u * P, y = v * P;
    const w1 = fbm(x, y, P, P, 4, seed) - 0.5, w2 = fbm(x + 3.1, y + 1.7, P, P, 4, seed + 5) - 0.5, w3 = fbm(x * 2 + 9, y * 2 + 4, P * 2, P * 2, 3, seed + 9) - 0.5;
    const d1 = Math.abs(Math.sin(0.5 * (TAU * (dir[0] * u + dir[1] * v) + 6.4 * w1 + 2.0 * w3)));                     // 0 on the main vein
    const d2 = Math.abs(Math.sin(0.5 * (TAU * (dir[1] * 3 * u - dir[0] * 2 * v) + 8.0 * w2 + 3.0 * w3 + 1.3)));         // second, finer scale
    const fade1 = sstep(0.25, 0.6, fbm(x * 2 + 5, y * 2 + 8, P * 2, P * 2, 2, seed + 21)), fade2 = sstep(0.3, 0.65, fbm(x * 3 + 2, y * 3 + 6, P * 3, P * 3, 2, seed + 40));
    const main = (1 - sstep(0.0, 0.05, d1)) * (0.35 + 0.65 * fade1), mainHalo = (1 - sstep(0.0, 0.28, d1)) * 0.5 * fade1;
    const fine = (1 - sstep(0.0, 0.04, d2)) * fade2 * 0.7;
    const n = fbm(x * 5 + 1, y * 5 + 7, P * 5, P * 5, 3, seed + 7), ridge = 1 - Math.abs(2 * n - 1), branch = sstep(0.92, 0.99, ridge) * (1 - sstep(0.0, 0.34, d1)) * 0.5;
    const cloud = fbm(x * 2, y * 2, P * 2, P * 2, 3, seed + 31), mott = fbm(x * 9, y * 9, P * 9, P * 9, 2, seed + 12);
    let c = mix(B, warmCloud, cloud);
    c = mix(c, [c[0] * 0.965, c[1] * 0.96, c[2] * 0.95], 0.3 * mainHalo + 0.25 * mott);
    const vv = Math.min(1, (main * 0.7 + fine * 0.85 + branch * 0.8) * contrast);
    return mix(c, V, vv);
  }), { aniso: 8 });
}

/** Wood: grain runs along u (the texture's x axis). `endGrain` gives the cutting-board block pattern. */
export function woodTexture(size, pal, { seed = 3, endGrain = false } = {}) {
  const L = rawHex(pal.wood_honey), D = rawHex(pal.wood_grain_dark), rng = mulberry32(seed + 99);
  const knots = [0, 1].map(() => ({ x: 0.15 + rng() * 0.7, y: 0.15 + rng() * 0.7, r: 0.05 + rng() * 0.03 }));
  if (endGrain) {
    const N = 8;
    return finish(paint(size, (u, v) => {
      const ci = Math.floor(u * N), cj = Math.floor(v * N), tone = hash(ci, cj, seed), lu = u * N - ci - 0.5, lv = v * N - cj - 0.5;
      const rr = Math.sqrt(lu * lu + lv * lv) * 9 + 1.6 * fbm(u * 8, v * 8, 8, 8, 2, seed), ring = 0.5 + 0.5 * Math.sin(rr * 6.0);
      const edge = Math.max(Math.abs(lu), Math.abs(lv)) > 0.46 ? 0.35 : 0;
      return mix(mix(L, D, 0.25 + 0.4 * tone), D, ring * 0.22 + edge);
    }), { aniso: 8 });
  }
  return finish(paint(size, (u, v) => {
    let vv = v; for (const k of knots) { const dx = u - k.x, dy = v - k.y, d2 = (dx * dx) / 3 + dy * dy; vv += 0.045 * Math.exp(-d2 / (k.r * k.r)) * Math.sign(dy || 1); }
    const g1 = fbm(u * 2, vv * 28, 2, 28, 3, seed), g2 = fbm(u * 3, vv * 90, 3, 90, 2, seed + 7), ring = 0.5 + 0.5 * Math.sin(vv * 60 + 6 * fbm(u * 2, vv * 4, 2, 4, 2, seed + 3));
    const t = Math.min(1, 0.2 + 0.55 * g1 + 0.25 * g2 * g2 * 2 + 0.12 * ring);
    let knot = 0; for (const k of knots) { const dx = u - k.x, dy = v - k.y; knot = Math.max(knot, Math.exp(-(dx * dx / 3 + dy * dy) / (k.r * k.r * 0.18))); }
    return mix(mix(L, D, t * 0.9), D, Math.min(1, knot * 0.7));
  }), { aniso: 8 });
}

/** Brushed steel roughness map (fine parallel streaks along u). Values stay in the mid range so the roughness uniform scales them. */
export function steelRoughnessTexture(size, { seed = 5 } = {}) {
  return finish(paint(size, (u, v) => {
    const s = 0.55 + 0.35 * hash(Math.floor(v * size), 0, seed) + 0.1 * fbm(u * 4, v * 3, 4, 3, 2, seed); const g = Math.min(255, s * 255 * 0.85); return [g, g, g];
  }), { srgb: false, aniso: 8 });
}

/** Fine terrazzo / microcement: greige with a very soft cloud and tiny chips. */
export function floorTexture(size, pal, { seed = 9 } = {}) {
  const B = rawHex(pal.floor_greige), rng = mulberry32(seed); const chipPal = [rawHex('#D4CABD'), rawHex('#9C9185'), rawHex('#C4B49E'), rawHex('#B1A89C')];
  const c = paint(size, (u, v) => { const n = fbm(u * 6, v * 6, 6, 6, 4, seed), m = fbm(u * 24, v * 24, 24, 24, 2, seed + 4); return mix(B, [B[0] * 0.9, B[1] * 0.9, B[2] * 0.9], 0.35 * n + 0.25 * m); });
  const ctx = c.getContext('2d'), chips = Math.round((size * size) / 500);
  for (let i = 0; i < chips; i++) { const col = chipPal[Math.floor(rng() * 4)], r = 0.6 + rng() * (size / 600 + 1.4); ctx.fillStyle = `rgba(${col[0]|0},${col[1]|0},${col[2]|0},${0.18 + rng() * 0.3})`; ctx.beginPath(); ctx.ellipse(rng() * size, rng() * size, r, r * (0.5 + rng() * 0.5), rng() * 3, 0, 6.3); ctx.fill(); }
  return finish(c, { aniso: 8 });
}

/** Very quiet plaster mottling for walls and ceiling. */
export function plasterTexture(size, pal, { seed = 13 } = {}) {
  const B = rawHex(pal.wall_plaster);
  return finish(paint(size, (u, v) => { const n = fbm(u * 5, v * 5, 5, 5, 4, seed); const k = 0.955 + 0.07 * n; return [B[0] * k, B[1] * k, B[2] * k]; }), { aniso: 4 });
}
export { hex };
