/** Expression parameters. Every preset is a PARTIAL overlay on NEUTRAL, so presets stay short and blendable.
 *  lid: 0 open .. 1 closed | brow h/t/i: height, tilt, innerRaise (-1..1) | mouth: curve -1..1, width .6..1.4, open 0..1, offsetX -1..1, pucker 0..1
 *  look: -1..1 | ear: -1 droop .. 1 perk */
export const NEUTRAL = {
  lidL: 0.12, lidR: 0.12, eyeScale: 1, lookX: 0, lookY: 0,
  browLh: 0, browLt: 0, browLi: 0, browRh: 0, browRt: 0, browRi: 0,
  mCurve: 0.1, mWidth: 1, mOpen: 0, mOffsetX: 0, mPucker: 0,
  cheekPuff: 0, cheekBlush: 0.25, noseWiggle: 0, earL: 0, earR: 0,
};

export const PRESETS = {
  neutral: {},
  calmSmirk: { lidL: 0.3, lidR: 0.3, browLh: -0.15, browRh: -0.15, mCurve: 0.2, mOffsetX: 0.5, cheekBlush: 0.3 },
  smile: { lidL: 0.2, lidR: 0.2, browLh: 0.15, browRh: 0.15, mCurve: 0.75, mWidth: 1.15, cheekBlush: 0.65, earL: 0.2, earR: 0.2 },
  bigGrin: { lidL: 0.4, lidR: 0.4, browLh: 0.3, browRh: 0.3, mCurve: 1, mWidth: 1.35, mOpen: 0.7, cheekBlush: 0.9, cheekPuff: 0.3, earL: 0.4, earR: 0.4 },
  laugh: { lidL: 1, lidR: 1, browLh: 0.2, browRh: 0.2, browLi: 0.3, browRi: 0.3, mCurve: 1, mWidth: 1.4, mOpen: 1, cheekBlush: 1, cheekPuff: 0.5, earL: 0.3, earR: 0.3 },
  surprised: { lidL: 0, lidR: 0, eyeScale: 1.25, browLh: 0.9, browRh: 0.9, mCurve: 0, mWidth: 0.7, mOpen: 0.6, mPucker: 0.5, earL: 1, earR: 1, cheekBlush: 0.2 },
  wideEyeWow: { lidL: 0, lidR: 0, eyeScale: 1.4, browLh: 1, browRh: 1, browLi: 0.4, browRi: 0.4, mCurve: 0.5, mWidth: 1.1, mOpen: 0.9, cheekBlush: 0.5, earL: 1, earR: 1 },
  tasteSavoring: { lidL: 1, lidR: 1, browLh: 0.2, browRh: 0.2, mCurve: 0.8, mWidth: 1.1, cheekPuff: 0.6, cheekBlush: 0.8, earL: 0.1, earR: 0.1 },
  winkLeft: { lidL: 1, lidR: 0.05, browLh: -0.3, browRh: 0.25, mCurve: 0.7, mOffsetX: -0.6, cheekBlush: 0.5 },
  winkRight: { lidL: 0.05, lidR: 1, browLh: 0.25, browRh: -0.3, mCurve: 0.7, mOffsetX: 0.7, cheekBlush: 0.5 },
  deadpan: { lidL: 0.42, lidR: 0.42, browLh: -0.2, browRh: -0.2, mCurve: -0.02, mWidth: 0.8, cheekBlush: 0.1 },
  smug: { lidL: 0.45, lidR: 0.4, browLh: -0.1, browRh: 0.35, browRi: 0.2, mCurve: 0.45, mOffsetX: 0.85, mWidth: 1.05, cheekBlush: 0.35, earL: -0.1 },
  determined: { lidL: 0.35, lidR: 0.35, browLh: -0.4, browRh: -0.4, browLt: 0.7, browRt: 0.7, browLi: -0.4, browRi: -0.4, mCurve: 0.05, mWidth: 0.85, earL: -0.2, earR: -0.2 },
  sleepy: { lidL: 0.8, lidR: 0.8, browLh: -0.1, browRh: -0.1, mCurve: 0.1, mOpen: 0.15, earL: -0.8, earR: -0.8, cheekBlush: 0.3 },
  puppyEyes: { lidL: 0, lidR: 0, eyeScale: 1.3, browLh: 0.3, browRh: 0.3, browLt: -0.9, browRt: -0.9, browLi: 0.9, browRi: 0.9, mCurve: -0.3, mWidth: 0.8, earL: -0.5, earR: -0.5, lookY: 0.3, cheekBlush: 0.4 },
  annoyed: { lidL: 0.6, lidR: 0.6, browLh: -0.45, browRh: -0.45, browLt: 0.85, browRt: 0.85, mCurve: -0.7, mWidth: 0.8, mOffsetX: -0.3, lookX: -0.4, earL: -0.4, earR: -0.4 },
  sniff: { lidL: 0.35, lidR: 0.35, browLh: 0.1, browRh: 0.1, mCurve: 0.1, noseWiggle: 1, mWidth: 0.8, lookY: 0.2, earL: 0.3, earR: 0.3 },
  oMouth: { lidL: 0.05, lidR: 0.05, eyeScale: 1.15, browLh: 0.5, browRh: 0.5, mPucker: 1, mWidth: 0.7, earL: 0.5, earR: 0.5 },
  proud: { lidL: 0.5, lidR: 0.5, browLh: 0.25, browRh: 0.25, mCurve: 0.6, mWidth: 1.1, cheekBlush: 0.55, earL: 0.5, earR: 0.5, lookY: 0.25 },
  thinking: { lidL: 0.3, lidR: 0.3, browLh: 0.45, browRh: -0.15, browRt: 0.3, mCurve: -0.05, mOffsetX: -0.8, mWidth: 0.7, lookX: 0.6, lookY: 0.5, earL: 0.2 },
};
export const expressionNames = Object.keys(PRESETS);
export const resolve = (name) => ({ ...NEUTRAL, ...(PRESETS[name] || (() => { throw new Error('Unknown expression: ' + name); })()) });
