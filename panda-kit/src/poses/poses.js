/** Static pose library as plain data. Rotations are ABSOLUTE radians [x,y,z] per rig pivot (unlisted pivots go to rest).
 *  Conventions: shoulder x<0 raises the arm forward, z>0 (L) / z<0 (R) raises it sideways; elbow x<0 bends the forearm forward/up;
 *  spine/head x>0 leans/nods forward; head y>0 turns to the Panda's left (+X). `pos` = position offsets [x,y,z] added to rest.
 *  `expr` = expression preset, `grip` = {L, R} grip presets. */
const M = (v) => [v[0], -v[1], -v[2]]; // mirror a left-arm rotation to the right (x unchanged, y/z negated)
const arm = (sh, el, paw = [0, 0, 0]) => ({ shoulderL: sh, elbowL: el, pawL: paw, shoulderR: M(sh), elbowR: M(el), pawR: M(paw) });

export const POSES = {
  neutralStand: { expr: 'calmSmirk' },
  relaxedIdle: { ...arm([0.05, 0, 0.2], [-0.3, 0, 0]), hips: [0, 0, 0.02], head: [0.03, 0.05, 0.02], expr: 'calmSmirk', pos: { hips: [0.02, -0.01, 0] } },
  armsCrossed: { shoulderL: [-0.5, -1.1, 0.0], elbowL: [-1.5, 0, 0], shoulderR: [-0.3, 1.1, 0.0], elbowR: [-1.5, 0, 0], pawL: [0, 0, 0], pawR: [0, 0, 0], spine: [0.02, 0, 0], head: [0.04, 0, 0], expr: 'smug', grip: { L: 'fist', R: 'fist' } },
  handsOnHips: { ...arm([0.1, 0, 0.9], [0.0, 0, -1.85]), expr: 'proud', grip: { L: 'fist', R: 'fist' } },
  handsBehindBack: { ...arm([0.7, 0, 0.12], [-0.15, 0, 0]), spine: [-0.03, 0, 0], head: [-0.04, 0, 0], expr: 'calmSmirk' },
  armsUpCelebrate: { ...arm([-2.8, 0, 0.6], [-0.2, 0, 0]), spine: [-0.08, 0, 0], head: [-0.12, 0, 0], expr: 'bigGrin', grip: { L: 'open', R: 'open' } },
  pointForward: { shoulderL: [-1.5, 0.0, 0.05], elbowL: [-0.05, 0, 0], pawL: [0, 0, 0], shoulderR: [0.05, 0, -0.2], elbowR: [-0.3, 0, 0], head: [0.02, 0.0, 0], expr: 'determined', grip: { L: 'point' } },
  'hold-two-handed': { ...arm([-0.85, 0.5, 0.05], [-1.2, 0.3, 0]), head: [0.06, 0, 0], expr: 'calmSmirk', grip: { L: 'hold', R: 'hold' } },
  shrugPose: { ...arm([0.0, 0, 0.65], [-1.0, 0, 0]), head: [0, 0, 0.1], expr: 'smug', pos: { shoulderL: [0, 0.07, 0], shoulderR: [0, 0.07, 0] }, grip: { L: 'open', R: 'open' } },
  thinkingChin: { shoulderL: [-0.45, -1.0, 0.0], elbowL: [-1.5, 0, 0], shoulderR: [-0.75, 0.55, 0.0], elbowR: [-2.15, 0, 0], head: [0.05, -0.15, -0.1], expr: 'thinking', grip: { R: 'fist' } },
  waveHello: { shoulderL: [-0.3, 0, 2.55], elbowL: [-0.5, 0, 0], shoulderR: [0.05, 0, -0.2], elbowR: [-0.3, 0, 0], head: [0, 0, 0.1], expr: 'smile', grip: { L: 'open' } },
  leanOnCounter: { ...arm([-0.5, 0, 0.1], [-1.3, 0, 0]), spine: [0.35, 0, 0], head: [-0.2, 0, 0], expr: 'smug', pos: { hips: [0, -0.02, 0.06] } },
  tPose: { ...arm([0, 0, 1.5], [0, 0, 0]), expr: 'neutral' },
};
export const poseNames = Object.keys(POSES);
