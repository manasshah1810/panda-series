import * as THREE from 'three';

/**
 * Beat 3 prop -- the SLICEABLE bamboo shoot (Episode 1, "ASMR Chop"). Replaces the solid bamboo cone from the mise-en-place drop.
 * Fully procedural (revolved profiles + vertex colours, no files, no textures).
 *
 * Layout (group frame = BOARD FRAME: origin on the board surface, +y up). The shoot lies on the board with its axis along +z, tip END (smallest
 * radius) towards +z ("front"). Nine chunky, tapered, chamfered discs are stacked back-to-front with a hairline gap, ready to be chopped from the tip.
 *
 * RIGGING: every slice is ONE Group whose origin (its pivot) sits on its BOTTOM-FRONT EDGE (y = 0 on the board, z = the slice's front face).
 * The disc geometry hangs from that pivot (axis at y = radius, extending back along -z), so `slice.rotation.x = +PI/2` tips it FORWARD
 * about the pivot and it lands flat on the board (front face down). Euler order is 'YXZ', so the optional landing yaw happens in the
 * board plane before the tip.
 *
 * `setSliceTip(i, u)` is a PURE function of u in [0, 1] (the slice's own time since the knife hit it): it assigns ABSOLUTE transforms,
 * reads no previous state, uses no Math.random and no physics. u = 0 is the exact rest pose, so scrubbing backwards stands every slice back up.
 *   rotation.x = PI/2 * bounceOut(u)      thud: falls, hits the board at u ~ 0.36, rebounds twice (never beyond flat, so never into the board)
 *   rise/fan   = easeOutCubic(u / 0.36)   the pivot only rises onto the pile (never slides sideways) while the slice fans about it
 */
export const BAMBOO = Object.freeze({
  count: 9, thickness: 0.024, gap: 0.008, rTip: 0.022, rBase: 0.058, zFront: 0.14,
  fan: Object.freeze({ step: 0.24, yaw: 1.0, lift: 1.04 }),
  colors: Object.freeze({ core: '#E8D8B0', ring: '#D6C38E', pith: '#DCC892', sheath: '#BFA06E', sheathHi: '#CDB07A' }),
});

const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** Penner bounce-out (never exceeds 1). */
const bounceOut = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; };
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const TIP_LAND_U = 0.364;   // where bounceOut first reaches 1: the thud instant inside the tip window

/** Revolve a (r, z, colour) segment list about the z axis. Interior joints share smoothed normals (soft vinyl rim); each segment keeps its own colour. */
function revolve(segs, seg) {
  const n = segs.length, nrm = [];   // node normals in (r, z)
  const sn = segs.map((s) => { const dr = s.r1 - s.r0, dz = s.z1 - s.z0, l = Math.hypot(dr, dz) || 1; return [dz / l, -dr / l]; });
  for (let k = 0; k <= n; k++) { const a = sn[Math.max(0, k - 1)], b = sn[Math.min(n - 1, k)], x = a[0] + b[0], y = a[1] + b[1], l = Math.hypot(x, y) || 1; nrm.push([x / l, y / l]); }
  const pos = [], nor = [], col = [], idx = [], c = new THREE.Color();
  for (let k = 0; k < n; k++) {
    const s = segs[k], base = pos.length / 3; c.set(s.c);
    for (let e = 0; e < 2; e++) { const r = e ? s.r1 : s.r0, z = e ? s.z1 : s.z0, nn = nrm[k + e];
      for (let j = 0; j <= seg; j++) { const a = (j / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); pos.push(r * ca, r * sa, z); nor.push(nn[0] * ca, nn[0] * sa, nn[1]); col.push(c.r, c.g, c.b); } }
    for (let j = 0; j < seg; j++) { const a = base + j, b = a + seg + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  return g;
}

/** One tapered, chamfered disc: back face at z = -t, front face at z = 0. Faces carry pale growth rings; the rim is the toasted tan sheath. */
function sliceGeometry(rB, rF, t, seg) {
  const C = BAMBOO.colors, ch = 0.2 * t, bulge = 0.0035, segs = [], face = (r, z, flip) => {
    const R = (flip ? rF : rB) - ch, stops = [[0, 0.22, C.pith], [0.22, 0.6, C.core], [0.6, 0.78, C.ring], [0.78, 1, C.core]], out = [];
    for (const [a, b, col] of stops) out.push({ r0: R * a, z0: z, r1: R * b, z1: z, c: col });
    return flip ? out.reverse().map((s) => ({ r0: s.r1, z0: s.z1, r1: s.r0, z1: s.z0, c: s.c })) : out;
  };
  segs.push(...face(rB, -t, false));                                                      // back face, centre -> rim
  segs.push({ r0: rB - ch, z0: -t, r1: rB, z1: -t + ch, c: C.sheathHi });                  // back chamfer
  segs.push({ r0: rB, z0: -t + ch, r1: (rB + rF) / 2 + bulge, z1: -t / 2, c: C.sheath });  // tapered side, bulging a touch (puffy toy rim)
  segs.push({ r0: (rB + rF) / 2 + bulge, z0: -t / 2, r1: rF, z1: -ch, c: C.sheath });
  segs.push({ r0: rF, z0: -ch, r1: rF - ch, z1: 0, c: C.sheathHi });                      // front chamfer
  segs.push(...face(rF, 0, true));                                                         // front face, rim -> centre
  return revolve(segs, seg);
}

/**
 * @param {{quality?: 'high'|'medium'|'low', envMap?: THREE.Texture|null, count?: number}} [opts]
 * @returns {{group: THREE.Group, slices: THREE.Group[], count: number, setSliceTip: (i:number,u:number)=>void, restPivot: (i:number)=>THREE.Vector3,
 *            landing: (i:number)=>{x:number,y:number,z:number,yaw:number}, cutPoint: (i:number)=>THREE.Vector3, stats: ()=>{triangles:number,drawCalls:number}, dispose: ()=>void}}
 */
export function createSliceableBamboo({ quality = 'high', envMap = null, count = BAMBOO.count } = {}) {
  const seg = { high: 28, medium: 20, low: 12 }[quality]; if (!seg) throw new Error('createSliceableBamboo: unknown quality ' + quality);
  if (count < 8 || count > 10) throw new Error('createSliceableBamboo: count must be 8..10');
  const { thickness: t, gap, rTip, rBase, zFront, fan } = BAMBOO, pitch = t + gap, L = count * pitch - gap, slope = (rBase - rTip) / L;
  const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, roughness: 0.4, metalness: 0, envMap, envMapIntensity: 0.3 });
  const group = new THREE.Group(); group.name = 'sliceableBamboo';
  const slices = [], disposables = [mat], rest = [], land = [];
  for (let i = 0; i < count; i++) {
    const rF = rTip + slope * (i * pitch), rB = rF + slope * t, zF = zFront - i * pitch;
    const geo = sliceGeometry(rB, rF, t, seg); disposables.push(geo);
    geo.translate(0, Math.max(rB, (rB + rF) / 2 + 0.0035), 0);   // disc axis sits one (largest) radius above the pivot, so the rim rests exactly on the board
    const mesh = new THREE.Mesh(geo, mat); mesh.name = 'bambooSlice'; mesh.castShadow = true; mesh.receiveShadow = true;
    const pivot = new THREE.Group(); pivot.name = 'slice' + i; pivot.rotation.order = 'YXZ'; pivot.add(mesh);
    pivot.position.set(0, 0, zF); pivot.userData = { index: i, rF, rB, front: zF };
    group.add(pivot); slices.push(pivot); rest.push(new THREE.Vector3(0, 0, zF));
    // landing: the pivot NEVER moves sideways or forwards -- the slice tips about its bottom-front edge, then fans about that edge like a deck of cards.
    // Each later slice lands on top of the previous ones (stacked height), so overlapping discs never intersect.
    const th = (i - (count - 1) / 2) * fan.step;
    land.push({ x: 0, y: i * t * fan.lift, z: zF, yaw: -th * fan.yaw });
  }
  /** PURE: absolute pose of slice i, u in [0, 1] = time since its chop (0 = standing in the log, 1 = lying flat in the fan). */
  function setSliceTip(i, u) {
    const s = slices[i], p = rest[i], l = land[i], k = clamp01(u), sl = easeOutCubic(clamp01(k / TIP_LAND_U));
    s.position.set(p.x + (l.x - p.x) * sl, p.y + (l.y - p.y) * sl, p.z + (l.z - p.z) * sl);
    s.rotation.set((Math.PI / 2) * bounceOut(k), l.yaw * sl, 0);
  }
  for (let i = 0; i < count; i++) setSliceTip(i, 0);
  return {
    group, slices, count, setSliceTip, BAMBOO, length: L, pitch,
    restPivot: (i) => rest[i].clone(), landing: (i) => ({ ...land[i] }),
    /** Board-frame point in the middle of the kerf between slice i and the next one, on the board surface: where the knife edge lands. */
    cutPoint: (i) => new THREE.Vector3(0, 0, zFront - i * pitch - t - gap / 2),
    stats() { let triangles = 0, drawCalls = 0; group.traverse((o) => { if (!o.isMesh || !o.visible) return; let v = true; for (let p = o; p && p !== group.parent; p = p.parent) if (!p.visible) v = false; if (!v) return; drawCalls++; const g = o.geometry; triangles += (g.index ? g.index.count : g.attributes.position.count) / 3; }); return { triangles, drawCalls }; },
    dispose() { disposables.forEach((d) => d.dispose?.()); group.removeFromParent(); },
  };
}
