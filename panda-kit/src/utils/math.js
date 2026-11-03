export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const deg = (d) => (d * Math.PI) / 180;
export const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);
