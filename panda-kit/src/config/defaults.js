// All proportions, colours and quality tiers live here. Geometry files never hard-code these numbers.
// Units ~ metres. Origin = centre of feet on ground, +Y up, Panda faces +Z.
// Naming: "L" is the Panda's anatomical LEFT = +X (viewer's right when seen from the front).

export const PROPORTIONS = {
  totalHeight: 2.0,
  torso: {
    profile: [[0.30, 0.40], [0.50, 0.56], [0.70, 0.59], [1.00, 0.51], [1.25, 0.42], [1.40, 0.34]],
    zScale: 0.9, bottomY: 0.26, topY: 1.42,
    belly: { y: 0.72, sigma: 0.2, bump: 0.06 },     // belly = smooth z-displacement of the lathe torso (no separate mesh)
  },
  belly: { center: [0, 0.72, 0.33], radii: [0.5, 0.45, 0.30] },
  head: { center: [0, 1.54, 0], radii: [0.62, 0.46, 0.54] },
  ear: { x: 0.44, y: 1.92, z: -0.05, radii: [0.185, 0.185, 0.12], tiltZ: 0.35, tiltX: -0.14, dish: 0.065 },
  patch: { x: 0.23, y: 1.575, radii: [0.165, 0.225, 0.06], tilt: 0.56 },   // teardrop painted in the head shader: half-width, half-length, slant (rad, ~30deg)
  eye: { x: 0.215, y: 1.585, radius: 0.062, lidRadius: 0.073, sink: 0.015 },
  brow: { x: 0.22, y: 1.80, length: 0.105, width: 0.024, lift: 0.004 },
  muzzle: { center: [0, 1.40, 0.50], radii: [0.22, 0.16, 0.18] },
  nose: { center: [0, 1.46, 0.635], radii: [0.10, 0.07, 0.07] },
  mouth: { y: 1.335, radius: 0.0135, halfWidth: 0.115 },
  tufts: [[[0.49, 1.40, 0.10], [0.11, 0.07, 0.11], -0.4], [[0.54, 1.50, 0.0], [0.07, 0.06, 0.08], -0.3]],   // [centre, radii, roll] per side
  cheek: { x: 0.34, y: 1.43, radius: 0.12 },
  shoulder: { x: 0.56, y: 1.19, r: [0.215, 0.2, 0.2] },
  neck: { center: [0, 1.20, 0.0], radii: [0.42, 0.25, 0.37] },
  arm: { upperLen: 0.24, foreLen: 0.21, upperR: 0.19, elbowR: 0.165, wristR: 0.135, pawR: 0.185, pawY: -0.08 },
  hip: { x: 0.30, y: 0.55 },
  leg: { hipR: 0.235, ankleR: 0.165, len: 0.38, footRadii: [0.22, 0.12, 0.30], footCenter: [0.30, 0.12, 0.08], footToe: 0.17 },
  tail: { center: [0, 0.45, -0.50], radius: 0.14 },
  joints: { // world-space pivot positions (rest pose)
    hips: [0, 0.55, 0], spine: [0, 0.75, 0], chest: [0, 1.10, 0], neck: [0, 1.28, 0], head: [0, 1.30, 0],
  },
};

export const PALETTE = {
  furWhite: '#F7F4EE', furWhiteShadow: '#EAE5DC', furCreamBelly: '#F6F2EA',
  furBlack: '#1C1C21', furBlackLifted: '#2A2A31', blackSheen: '#8B93BC',
  noseAndEyes: '#2B2B30', eyeWarmRing: '#3A2F2A', earInner: '#3C3C46', pawPads: '#3A3A40',
  eyeDark: '#1C1716', blush: '#F2B8B0', innerMouth: '#7A3340', tongue: '#C9606F', rimTint: '#FFE9CC',
  grey: '#9a9a9a',
};

// Quality tiers: segment counts + effect switches.
export const TIERS = {
  high:   { seg: 30, rad: 38, small: 10, tube: 32, fuzz: true,  fuzzShells: 6, fuzzArms: true, fuzzArmShells: 4, fuzzTier: { seg: 8, rad: 14, small: 4, lite: true }, outline: true,  shadows: true,  budgetTris: 25000, budgetCalls: 60 },
  medium: { seg: 22, rad: 30, small: 8, tube: 20, fuzz: true,  fuzzShells: 2, fuzzArms: false, fuzzTier: { seg: 7, rad: 10, small: 4, lite: true }, outline: true,  shadows: true,  budgetTris: 14000, budgetCalls: 40 },
  low:    { seg: 10, rad: 16, small: 5,  tube: 12, lite: true, fuzz: false, fuzzShells: 0, outline: false, shadows: false, budgetTris: 7000,  budgetCalls: 24 },
};

export const REST = { armOut: 0.50, elbowBend: 0.24, legOut: 0.0, footOut: 0.17 };
