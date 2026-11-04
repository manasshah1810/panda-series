/** Mood presets: colour temperature + intensities. All base values; lights-on scales them. */
export const MOODS = {
  morning: {
    window: { color: '#FFF3E4', intensity: 1.9, pos: [9, 3.6, 1.4] }, hemi: { sky: '#F2EEE8', ground: '#9A9188', intensity: 0.48 },
    fill: { color: '#FFF7EE', intensity: 0.85 }, pandaFront: { color: '#FFF8F0', intensity: 80 }, pandaRim: { color: '#EEF3FF', intensity: 24 }, rim: { color: '#DCE7F4', intensity: 1.1 }, hood: { color: '#FFD9A8', intensity: 3 },
    strip: { color: '#FFDDB0', intensity: 0.5 }, glow: 1.0, shaft: 1.0, env: 1.0,
  },
  warmEvening: {
    window: { color: '#FFAE6B', intensity: 1.9, pos: [9, 2.0, 1.4] }, hemi: { sky: '#D9BFA6', ground: '#6E5D4F', intensity: 0.45 },
    fill: { color: '#FFC999', intensity: 0.5 }, pandaFront: { color: '#FFDDB8', intensity: 34 }, pandaRim: { color: '#D8E2F6', intensity: 18 }, rim: { color: '#C9D6EE', intensity: 0.9 }, hood: { color: '#FFC27F', intensity: 7 },
    strip: { color: '#FFC58A', intensity: 0.8 }, glow: 1.15, shaft: 1.3, env: 0.7,
  },
};
