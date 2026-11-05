/**
 * Beat table + the single time remap used by the opening. Plain data/pure functions only.
 * Times are seconds on the ONE master timeline (0 .. 8).
 */
/** Everything from the draw onwards is shifted by SHIFT seconds to make room for the slow, clumsy turn + fall. */
export const SHIFT = 2.8;
export const OPENING_END = 8.0 + SHIFT;

export const BEATS = Object.freeze([
  { id: 'B1_backShot',     time: [0.0, 2.2] },
  { id: 'B2_turnAndFall',  time: [2.2, 6.4] },
  { id: 'B3_draw',         time: [3.6 + SHIFT, 4.2 + SHIFT] },
  { id: 'B4_throw',        time: [4.2 + SHIFT, 5.0 + SHIFT] },
  { id: 'B5_landWobble',   time: [5.0 + SHIFT, 6.0 + SHIFT] },
  { id: 'B6_title',        time: [6.0 + SHIFT, 8.0 + SHIFT] },
]);
export const beatAt = (t) => BEATS.find((b) => t >= b.time[0] && t < b.time[1]) ?? BEATS.at(-1);

/**
 * B4 plays at 0.5x visually. This is encoded as a TIME REMAP of authored time (not a timeScale/speed value):
 *   authored B4 time `ell` (seconds of action) <-> master time t:   t = B4_START + ell / B4_RATE
 * Every B4 tween (the flick), the knife flight and the camera use these two functions.
 */
export const B4_START = 4.2 + SHIFT, B4_END = 5.0 + SHIFT, B4_RATE = 0.5;
export const B4_AUTHORED = (B4_END - B4_START) * B4_RATE;                 // 0.4 s of real-speed action shown over 0.8 s
export const ellOf = (t) => Math.min(B4_AUTHORED, Math.max(0, (t - B4_START) * B4_RATE));
export const tOfEll = (ell) => B4_START + ell / B4_RATE;
export const durOfEll = (dEll) => dEll / B4_RATE;

/** Authored B4 key times (seconds of authored action). Release is inside the flick; landing is the last frame of the beat. */
export const FLICK = Object.freeze({ windUp: 0.07, snap: 0.13, release: 0.14, land: B4_AUTHORED });

/** Draw (B3) key times in master seconds. */
export const DRAW = Object.freeze({ reachStart: 3.60 + SHIFT, grasp: 3.80 + SHIFT, blendEnd: 3.88 + SHIFT, upEnd: 4.12 + SHIFT });

export const T_LAND = B4_END;                  // tL in the wobble formula
export const T_RELEASE = tOfEll(FLICK.release);
export const TITLE = Object.freeze({ hookStart: 6.0 + SHIFT, hookEnd: 6.9 + SHIFT, restStart: 6.5 + SHIFT, restEnd: 7.8 + SHIFT, lookAtCamera: 7.5 + SHIFT });
