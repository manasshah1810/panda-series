import * as THREE from 'three';
import { KITCHEN_CONFIG } from './config/kitchenConfig.js';
import { CAMERA_MARKS } from './cameraMarks.js';
import { buildAnchors } from './anchors.js';
import { createMaterials } from './materials/index.js';
import { createEnvironment } from './materials/environment.js';
import { Batch, mulberry32, instancedBox } from './props/helpers.js';
import { buildRoom } from './layout/room.js';
import { buildFloor } from './layout/floor.js';
import { buildCeiling } from './layout/ceiling.js';
import { buildWindow } from './layout/window.js';
import { buildBacksplash } from './layout/backsplash.js';
import { buildHood } from './layout/hood.js';
import { buildBackCounter } from './layout/backCounter.js';
import { buildIsland } from './layout/island.js';
import { buildShelving } from './layout/shelving.js';
import { buildProps } from './props/index.js';
import { createLights } from './lighting/kitchenLights.js';
import { MOODS } from './lighting/moods.js';
import { lightsCurve } from './lighting/lightsOn.js';
import { createLightShaft } from './lighting/lightShaft.js';
import { createDust } from './fx/dust.js';

/**
 * Create the Episode-1 kitchen set.
 * @param {{quality?:'high'|'medium'|'low', mood?:'morning'|'warmEvening', seed?:number, renderer?:THREE.WebGLRenderer, stage?:1|2|3|4}} [opts]
 *   renderer: needed once for PMREM reflections (or call kitchen.setRenderer(r) later). stage: review option (1 greybox .. 4 full, default 4).
 */
export function createKitchen({ quality = 'high', mood = 'morning', seed = 1, renderer = null, stage = 4 } = {}) {
  const cfg = KITCHEN_CONFIG, root = new THREE.Group(); root.name = 'kitchen';
  const anchors = buildAnchors(cfg, root);
  const props = { cuttingBoard: new THREE.Group(), tap: new THREE.Group(), hangingPans: new THREE.Group(), plants: new THREE.Group() };
  props.cuttingBoard.name = 'cuttingBoard'; props.tap.name = 'tap'; props.hangingPans.name = 'hangingPans'; props.plants.name = 'plants';
  Object.values(props).forEach((g) => root.add(g));
  const lights = createLights(cfg, root);
  const state = { quality, mood, seed, time: 0, lightsT: 1, k: 1, env: null, mats: null, content: null, ctx: null, fx: null, tap: null };
  const api = { root, anchors, props, cameraMarks: CAMERA_MARKS, config: cfg, lights, vignette: cfg.vignette, onLightsChange: null, get lightsLevel() { return state.k; }, focusAnchor: anchors.pandaMark, colliders: [], placements: [], get quality() { return state.quality; }, get mood() { return state.mood; } };

  function clearContent() {
    for (const g of Object.values(props)) { g.traverse((o) => { o.geometry?.dispose?.(); o.dispose?.(); }); g.clear(); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); }
    if (state.content) { state.content.traverse((o) => { o.geometry?.dispose?.(); o.dispose?.(); if (o.material?.isShaderMaterial) o.material.dispose(); }); root.remove(state.content); state.content = null; }
    state.mats?.dispose(); state.mats = null;
  }
  function build() {
    clearContent();
    const T = cfg.tiers[state.quality]; state.mats = createMaterials(cfg, state.quality, state.env, stage);
    const ctx = { cfg, T, tier: state.quality, B: new Batch(), m: state.mats.m, rng: mulberry32(state.seed), colliders: [], placements: [], world: {}, anim: [], fx: {},
      collide(name, [x0, y0, z0, x1, y1, z1]) { this.colliders.push({ name, box: new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)) }); } };
    state.ctx = ctx; state.content = new THREE.Group(); state.content.name = 'static'; root.add(state.content);
    buildRoom(ctx); buildFloor(ctx); buildCeiling(ctx); buildWindow(ctx); buildBacksplash(ctx); buildHood(ctx); buildBackCounter(ctx); buildIsland(ctx); buildShelving(ctx);
    ctx.seed = state.seed; buildProps(ctx, state.content, props, stage);
    ctx.B.build(state.content);
    if (stage >= 4) {
      const dir = new THREE.Vector3(...lights.sun.target.position.toArray()).sub(new THREE.Vector3(...MOODS[state.mood].window.pos)).normalize();
      const shaft = createLightShaft(cfg, dir), dust = createDust(T.dust, shaft, state.seed, mulberry32);
      state.content.add(shaft.mesh, dust.points); ctx.fx = { shaft, dust };
    }
    api.colliders = ctx.colliders; api.placements = ctx.placements; lights.setShadow(T.shadow);
    applyLights(); applyTime();
  }
  function applyLights() {
    const k = (state.k = lightsCurve(state.lightsT)), m = MOODS[state.mood]; lights.apply(m, k); api.onLightsChange?.(k);
    if (!state.mats) return;
    for (const mt of state.mats.list) if (mt.userData.envBase !== undefined) mt.envMapIntensity = mt.userData.envBase * k * m.env;
    for (const g of state.mats.glowMats) g.color.copy(g.userData.glowBase).multiplyScalar(k * m.glow);
    const fx = state.ctx?.fx; if (fx?.shaft) { fx.shaft.mat.uniforms.uOpacity.value = 0.09 * k * m.shaft; fx.dust.mat.uniforms.uK.value = k * m.shaft; fx.shaft.mat.uniforms.uColor.value.set(m.window.color); }
  }
  function applyTime() { const t = state.time; state.ctx?.anim.forEach((f) => f(t)); const d = state.ctx?.fx?.dust; if (d) d.mat.uniforms.uTime.value = t; }

  Object.assign(api, {
    /** Deterministic lights-on sequence, t in 0..1 (0 pitch dark, flicker ~0.33-0.5, warm ramp to 1). */
    setLightsOn(t) { state.lightsT = t; applyLights(); },
    setMood(name) { if (!MOODS[name]) throw new Error('unknown mood ' + name); state.mood = name; applyLights(); },
    /** Single scrub-safe time value (seconds) driving dust, tap drip, pan + leaf sway. */
    setTime(t) { state.time = t; applyTime(); },
    /** Board wobble hook for the later knife-impact animation: t = seconds since impact (t<0 rest). */
    setBoardWobble(t, amp) { props.cuttingBoard.userData.wobble?.(t, amp); },
    setQuality(tier) { if (!cfg.tiers[tier]) throw new Error('unknown tier ' + tier); state.quality = tier; build(); },
    setRenderer(r) { if (state.env) return; state.env = createEnvironment(r); state.mats?.list.forEach((mt) => { if ('envMapIntensity' in mt) { mt.envMap = state.env.texture; mt.needsUpdate = true; } }); },
    update() {},
    /** Triangles and draw calls of the kitchen alone (instances counted, shadow pass excluded). */
    stats() {
      let tris = 0, calls = 0, casters = 0; root.traverse((o) => { if (o.isLight && o.castShadow) casters++; if (!(o.isMesh || o.isPoints) || !o.visible) return; calls++; if (o.isPoints) return;
        const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); });
      return { triangles: Math.round(tris), drawCalls: calls, shadowCasters: casters, quality: state.quality, materials: state.mats?.list.length ?? 0 };
    },
    dispose() {
      clearContent(); lights.sun.shadow.map?.dispose(); state.env?.dispose(); state.env = null;
      root.traverse((o) => o.dispose?.()); root.clear();
    },
    /** internal handles for verification */ _state: state,
  });
  if (renderer) state.env = createEnvironment(renderer);
  build();
  return api;
}
