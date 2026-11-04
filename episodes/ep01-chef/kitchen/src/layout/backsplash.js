import * as THREE from 'three';
/** Large-format marble slabs (greyer marble). Each slab gets its own offset / quarter turn / mirror so the veining never visibly repeats. */
export function buildBacksplash(ctx) {
  const { cfg, B, m, rng } = ctx, R = cfg.room, S = cfg.backsplash, w = R.rightWallX - R.leftWallX, sw = w / S.slabs, h = S.y1 - S.y0;
  for (let i = 0; i < S.slabs; i++) {
    const x = R.leftWallX + sw * (i + 0.5), uv = { s: S.uvScale, o: [rng(), rng()], rot: [0, 0, 2, 2, 0][i % 5] + (rng() < 0.5 ? 0 : 2), flip: i % 2 === 1 };
    B.add(m.marbleBack, new THREE.BoxGeometry(sw - S.gap, h, 0.02), { p: [x, S.y0 + h / 2, R.backWallZ + 0.01] }, uv);
    if (i > 0) B.add(m.woodDark, new THREE.BoxGeometry(S.gap + 0.004, h, 0.006), { p: [R.leftWallX + sw * i, S.y0 + h / 2, R.backWallZ + 0.003] });
  }
}
