/** Named camera marks (plain data) for the opening shots. Tween between them with GSAP; also used as review angles. */
export const CAMERA_MARKS = {
  M1_establish_back: { position: [0, 1.7, 4.6], lookAt: [0, 1.2, -0.5], fov: 36, note: "Wide shot, Panda's back to us at the aisle, back counter and shelves behind him" },
  M2_dolly_in_apron: { position: [0, 1.5, 3.2], lookAt: [0, 1.25, -0.5], fov: 34, note: 'End of the slow dolly while he ties his apron' },
  M3_flip_tilt_up: { position: [0.3, 1.2, 3.0], lookAt: [0, 2.8, 0], fov: 36, note: 'Tilt up to follow the knife flip toward the hood and shelves' },
  M4_turn_front_low: { position: [0.2, 0.9, 3.4], lookAt: [0, 1.2, 0], fov: 32, note: 'Low front angle after the whip-orbit, seeing his face for the first time' },
  M5_throw_side: { position: [-3.2, 1.2, 0.6], lookAt: [1.5, 1.1, 1.0], fov: 34, note: 'Side angle from the left for the slow-motion throw across the frame to the island' },
  M6_macro_board: { position: [1.2, 1.2, 2.0], lookAt: [1.7, 1.1, 1.1], fov: 28, note: 'Macro on the knife stuck in the board' },
  M7_title_lift: { position: [0, 1.4, 3.6], lookAt: [0.6, 1.9, 1.0], fov: 34, note: 'Hero framing for the title built around the knife and the lift' },
  M8_fourth_wall: { position: [0.2, 1.5, 3.0], lookAt: [0, 1.6, 0], fov: 30, note: 'Medium close-up where Panda looks into the lens' },
};
/** Which way the Panda faces for each mark during the opening (rotation about Y). */
export const MARK_PANDA_ROT_Y = { M1_establish_back: Math.PI, M2_dolly_in_apron: Math.PI, M3_flip_tilt_up: Math.PI, M4_turn_front_low: 0, M5_throw_side: 0, M6_macro_board: 0, M7_title_lift: 0, M8_fourth_wall: 0 };
