/** ALL dimensions, positions, palette and tier settings live here. Units ~ metres, +Y up, camera on +Z looking toward -Z. */
export const KITCHEN_CONFIG = {
  version: '1.0.0',
  tiers: {
    high:   { tex: 1024, seg: 2, rad: 22, leaves: 72, pods: 36, dust: 400, shadow: 2048 },
    medium: { tex: 512,  seg: 1, rad: 14, leaves: 44, pods: 22, dust: 260, shadow: 1024 },
    low:    { tex: 256,  seg: 0, rad: 6, leaves: 16, pods: 8, dust: 150, shadow: 512 },
  },
  budgets: {
    triangles: { high: 60000, medium: 35000, low: 18000 },
    drawCalls: { high: 120, medium: 80, low: 50 },
    shadowCasters: 1,
  },
  palette: {
    marble_base: '#ECE9E4', marble_vein_light: '#B9B6B2', marble_vein_dark: '#8E8C8A', backsplash_marble_base: '#DDD9D3',
    wood_honey: '#C89A62', wood_grain_dark: '#A87A45', brass: '#B58E4A', steel: '#C9CCCE', copper: '#B86F4A',
    floor_greige: '#B9AFA3', wall_plaster: '#D8D2C8', ceramic_white_warm: '#EFEAE0', ceramic_dark_vase: '#2E2B2A',
    leaf_green: '#6E8B5B', light_warm: '#FFE9CC', cooktop_glass: '#2B2927', twig: '#6B5239', groove: '#7A6A58',
  },
  room: { backWallZ: -1.9, leftWallX: -4.6, rightWallX: 4.6, ceilingY: 5.0, frontZ: 7.0, wallThickness: 0.12 },
  window: { centerZ: 1.0, width: 2.4, sillY: 1.2, height: 2.2, frame: 0.06 },
  backCounter: {
    x0: -3.8, x1: 3.8, topY: 1.0, depth: 0.8, frontZ: -1.1, slab: 0.04, toeKick: 0.1, doors: 12,
    sink: { x: 1.4, w: 0.62, d: 0.46, floorY: 0.76 },
    cooktop: { x: -1.8, w: 0.82, d: 0.54 },
    hood: { x: -1.8, bottomY: 3.3, topY: 4.6, bottomW: 1.3, topW: 0.5, bottomD: 0.85, topD: 0.35 },
  },
  backsplash: { y0: 1.0, y1: 4.0, slabs: 5, gap: 0.005 },
  rail: { y: 2.35, x0: -3.4, x1: 3.4, z: -1.78, radius: 0.014 },
  hangers: [   // x, kind, tint ; centre gap (|x| < 0.7) kept clear so the Panda's head reads against bare marble
    [-3.25, 'panL', 'copper'], [-2.85, 'ladle', 'steel'], [-2.45, 'panM', 'steel'], [-2.05, 'spatula', 'wood'], [-1.65, 'panS', 'copper'],
    [-1.25, 'whisk', 'steel'], [-0.95, 'panS', 'steel'], [0.95, 'ladle', 'brass'], [1.3, 'panS', 'steel'], [1.7, 'panL', 'copper'],
    [2.15, 'spatula', 'wood'], [2.55, 'panM', 'steel'], [2.95, 'ladle', 'steel'], [3.3, 'whisk', 'brass'],
  ],
  shelves: { levels: [2.95, 3.55], x0: 0.2, x1: 3.8, depth: 0.36, thick: 0.04 },
  tallUnit: { x0: 3.85, x1: 4.55, height: 3.3, depth: 0.78 },
  island: { x0: 1.2, x1: 4.5, z0: 0.7, z1: 2.1, topY: 1.0, slab: 0.06, overhang: 0.04, kick: 0.08, cavityDepth: 0.6 },
  cuttingBoard: { center: [1.7, 1.0, 1.1], size: [0.9, 0.6, 0.1] },
  vase: { x: 3.5, z: -1.5 },
  cleanZone: { x0: 2.4, x1: 4.4, z0: 0.9, z1: 1.9 },       // island top kept empty for the later ingredient lineup
  panda: { mark: [0, 0, 0], startRotY: 3.14159, clearance: 0.05 },
  lights: {
    window: { pos: [9.0, 3.6, 1.4], target: [0, 0.6, 0.2] },
    rim: { pos: [-4.0, 3.6, -3.0], target: [0, 1.2, 0] },
    fill: { pos: [3.5, 2.6, 6.0], target: [0, 1.2, 0] },
  },
  vignette: 0.35,
};
