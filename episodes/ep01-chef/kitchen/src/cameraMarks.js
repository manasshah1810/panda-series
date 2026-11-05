/** Named camera marks (plain data) for the opening shots. Tween between them with GSAP; also used as review angles. */
export const CAMERA_MARKS = {
  M1_establish_back: { position: [0, 1.7, 4.6], lookAt: [0, 1.2, -0.5], fov: 36, note: "Wide shot, Panda's back to us at the aisle, back counter and shelves behind him" },
  M2_dolly_in_apron: { position: [0, 1.5, 3.2], lookAt: [0, 1.25, -0.5], fov: 34, note: 'End of the slow dolly while he ties his apron' },
  M3_flip_tilt_up: { position: [0.3, 1.2, 3.0], lookAt: [0, 2.8, 0], fov: 36, note: 'Tilt up to follow the knife flip toward the hood and shelves' },
  M4_turn_front_low: { position: [0.2, 0.9, 3.4], lookAt: [0, 1.2, 0], fov: 32, note: 'Low front angle after the whip-orbit, seeing his face for the first time' },
  M5_throw_side: { position: [-3.2, 1.2, 0.6], lookAt: [1.5, 1.1, 1.0], fov: 34, note: 'Side angle from the left for the slow-motion throw across the frame to the island' },
  M6_macro_board: { position: [1.0, 1.3, 2.5], lookAt: [1.7, 1.1, 1.1], fov: 28, note: 'Macro on the knife stuck in the board' },
  M7_title_lift: { position: [0, 1.4, 3.6], lookAt: [0.6, 1.9, 1.0], fov: 34, note: 'Hero framing for the title built around the knife and the lift' },
  M8_fourth_wall: { position: [0.2, 1.5, 3.0], lookAt: [0, 1.6, 0], fov: 30, note: 'Medium close-up where Panda looks into the lens' },
  // ---- Beat 1: the Hero Tease (whip from the Panda to the finished vegetarian ramen bowl, orbit, steam plunge) ----
  // Authored around a bowl focus of (1.35, 1.0, 1.1); heroTeaseBeat.js shifts M8..M11 by (bowlPlacementPoint - focus), so the bowl sits on the 'bowlPlacementPoint' anchor.
  M7_title_end: { position: [0, 1.4, 2.8], lookAt: [0, 1.1, 0], fov: 38, note: 'Panda close-up / title lockup: where the whip starts (the opening supplies its own live end pose)' },
  M8_whip_transit: { position: [0.65, 1.35, 1.9], lookAt: [0.7, 1.15, 0.5], fov: 48, note: 'Mid-whip waypoint across the island' },
  M9_hero_bowl_orbit_start: { position: [1.15, 1.38, 1.45], lookAt: [1.35, 1.1, 1.1], fov: 32, note: 'Whip lands on the steaming ramen bowl; slow orbit starts' },
  M10_hero_bowl_orbit_end: { position: [1.55, 1.32, 1.35], lookAt: [1.35, 1.1, 1.1], fov: 30, note: 'End of the buttery orbit; the dive begins' },
  M11_steam_plunge: { position: [1.35, 1.18, 1.1], lookAt: [1.35, 1.0, 1.1], fov: 65, note: 'Straight down into the steam plume (screen wipes to #F5F0E8)' },
  // ---- Beat 2: mise en place (locked top-down over the cutting board). Authored for a board at (0, ~1.05, 1.1); miseEnPlaceBeat.js translates them onto the real board. `target` mirrors `lookAt`.
  M12_topdown_board_entry: { position: [0.0, 3.2, 1.1], lookAt: [0.0, 1.02, 1.1], target: [0.0, 1.02, 1.1], fov: 36, note: 'Top-down entry over the board while the steam wash clears', boardRelative: true },
  M13_topdown_board_lock: { position: [0.0, 2.9, 1.1], lookAt: [0.0, 1.02, 1.1], target: [0.0, 1.02, 1.1], fov: 34, note: 'Locked bird-eye view over the board for the five ingredient drops', boardRelative: true },
};
/** Which way the Panda faces for each mark during the opening (rotation about Y). */
export const MARK_PANDA_ROT_Y = { M1_establish_back: Math.PI, M2_dolly_in_apron: Math.PI, M3_flip_tilt_up: Math.PI, M4_turn_front_low: 0, M5_throw_side: 0, M6_macro_board: 0, M7_title_lift: 0, M8_fourth_wall: 0, M7_title_end: 0, M8_whip_transit: 0, M9_hero_bowl_orbit_start: 0, M10_hero_bowl_orbit_end: 0, M11_steam_plunge: 0, M12_topdown_board_entry: 0, M13_topdown_board_lock: 0 };
