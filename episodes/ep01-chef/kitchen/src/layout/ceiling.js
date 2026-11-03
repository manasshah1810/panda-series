/** The ceiling slab and its recessed discs are built in room.js (one merged plaster mesh); this module only registers the collider. */
export function buildCeiling(ctx) { const R = ctx.cfg.room; ctx.collide('ceiling', [R.leftWallX, R.ceilingY, R.backWallZ, R.rightWallX, R.ceilingY + 0.2, R.frontZ]); }
