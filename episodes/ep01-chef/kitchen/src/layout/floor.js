import * as THREE from 'three';
export function buildFloor(ctx) {
  const { cfg, B, m } = ctx, R = cfg.room, w = R.rightWallX - R.leftWallX, d = R.frontZ - R.backWallZ;
  B.add(m.floor, new THREE.BoxGeometry(w, 0.1, d), { p: [0, -0.05, (R.backWallZ + R.frontZ) / 2] }, { s: 0.45 });
}
