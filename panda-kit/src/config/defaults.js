// All proportions, colours and quality tiers live here. Geometry files never hard-code these numbers.
// Units ~ metres. Origin = centre of feet on ground, +Y up, Panda faces +Z.
// Naming: "L" is the Panda's anatomical LEFT = +X (viewer's right when seen from the front).

export const PROPORTIONS = {
  totalHeight: 2.0,
  torso: {
    profile: [[0.30, 0.40], [0.50, 0.60], [0.70, 0.66], [1.00, 0.55], [1.25, 0.42], [1.40, 0.34]],
    zScale: 0.9, bottomY: 0.26, topY: 1.42,
  },
  belly: { center: [0, 0.72, 0.33], radii: [0.5, 0.45, 0.30] },
  head: { center: [0, 1.54, 0], radii: [0.62, 0.46, 0.54] },
  ear: { x: 0.44, y: 1.92, z: -0.05, radii: [0.17, 0.17, 0.115], tiltZ: 0.35, tiltX: -0.14, inner: [0.115, 0.115, 0.04] },
  patch: { x: 0.22, y: 1.58, radii: [0.15, 0.20, 0.06], tilt: 0.44 },
  eye: { x: 0.215, y: 1.585, radius: 0.062, lidRadius: 0.073, sink: 0.015 },
  brow: { x: 0.22, y: 1.80, size: [0.065, 0.015], lift: 0.02 },
  muzzle: { center: [0, 1.40, 0.50], radii: [0.22, 0.16, 0.18] },
  nose: { center: [0, 1.46, 0.635], radii: [0.10, 0.07, 0.07] },
  mouth: { y: 1.335, radius: 0.0115, halfWidth: 0.115 },
  cheek: { x: 0.40, y: 1.44, radius: 0.13 },
  shoulder: { x: 0.53, y: 1.19 },
  arm: { upperLen: 0.26, foreLen: 0.24, upperR: 0.165, foreR: 0.155, pawR: 0.17, pawOffset: 0.34 },
  hip: { x: 0.30, y: 0.55 },
  leg: { radius: 0.20, len: 0.30, footRadii: [0.22, 0.12, 0.30], footCenter: [0.30, 0.12, 0.08], footToe: 0.17 },
  tail: { center: [0, 0.45, -0.50], radius: 0.14 },
  joints: { // world-space pivot positions (rest pose)
    hips: [0, 0.55, 0], spine: [0, 0.75, 0], chest: [0, 1.10, 0], neck: [0, 1.28, 0], head: [0, 1.30, 0],
  },
};

export const PALETTE = {
  furWhite: '#F7F4EE', furWhiteShadow: '#E7E1D8', furCreamBelly: '#F3EBDD',
  furBlack: '#1A1A1F', furBlackLifted: '#26262C',
  noseAndEyes: '#2B2B30', eyeWarmRing: '#3A2F2A', earInner: '#2A2A30', pawPads: '#3A3A40',
  eyeDark: '#1C1716', blush: '#F2B8B0', innerMouth: '#8A3A45', tongue: '#D9707F', rimTint: '#FFE9CC',
  grey: '#9a9a9a',
};

// Quality tiers: segment counts + effect switches.
export const TIERS = {
  high:   { seg: 24, rad: 40, small: 10, tube: 32, fuzz: true,  fuzzShells: 7, outline: true,  shadows: true,  budgetTris: 25000, budgetCalls: 60 },
  medium: { seg: 20, rad: 30, small: 8, tube: 20, fuzz: false, fuzzShells: 0, outline: true,  shadows: true,  budgetTris: 14000, budgetCalls: 40 },
  low:    { seg: 10, rad: 16, small: 5,  tube: 12, lite: true, fuzz: false, fuzzShells: 0, outline: false, shadows: false, budgetTris: 7000,  budgetCalls: 24 },
};

export const REST = { armOut: 0.34, elbowBend: 0.38, legOut: 0.0, footOut: 0.17 };
