import * as THREE from 'three';
import { buildCuttingBoard } from './cuttingBoard.js';
import { buildHangers } from './pans.js';
import { buildDishes } from './plates.js';
import { buildJars, buildPots } from './jars.js';
import { buildPlants } from './plants.js';
import { buildTap } from './sink.js';
import { buildPandaHome } from './pandaHome.js';
import { buildPandaDetails } from './pandaDetails.js';

/** Unique + instanced props. The board is always built; everything else from stage 3. Stylist rules: odd counts, height variety, nothing touching, island clean zone kept empty. */
export function buildProps(ctx, content, props, stage) {
  buildCuttingBoard(ctx, props.cuttingBoard);
  if (stage < 3) return;
  const { cfg } = ctx, S = cfg.shelves, zb = cfg.room.backWallZ, top = (i) => S.levels[i] + S.thick / 2, sz = zb + 0.19;
  buildPandaHome(ctx); buildPandaDetails(ctx);
  buildHangers(ctx, props.hangingPans); buildTap(ctx, props.tap); buildPlants(ctx, props.plants);
  const bays = ctx.world.bays, z = bays[0].z;
  // island open shelf (3 bays x 2 levels)
  const island = [
    ['plate', bays[0].cx - 0.2, bays[0].lowY, z, 7, 1, 0], ['bowl', bays[0].cx + 0.26, bays[0].lowY, z, 3, 1, 1],
    ['bowl', bays[1].cx - 0.2, bays[1].lowY, z, 5, 1.0, 2], ['plate', bays[1].cx + 0.25, bays[1].lowY, z, 3, 0.85, 0],
    ['plate', bays[2].cx - 0.2, bays[2].lowY, z, 5, 1, 1], ['bowl', bays[2].cx + 0.26, bays[2].lowY, z, 3, 1, 3],
    ['plate', bays[0].cx, bays[0].midY, z, 5, 1, 0], ['bowl', bays[1].cx - 0.22, bays[1].midY, z, 3, 1, 1], ['bowl', bays[1].cx + 0.22, bays[1].midY, z, 3, 1, 2], ['plate', bays[2].cx, bays[2].midY, z, 7, 1, 2],
  ];
  buildDishes(ctx, content, island, 'islandDishes');
  // wall shelves
  buildDishes(ctx, content, [['bowl', 0.55, top(0), sz, 3, 1, 0], ['bowl', 2.15, top(0), sz, 2, 1.3, 1], ['bowl', 2.0, top(1), sz, 4, 1, 2], ['plate', 3.1, top(1), sz, 5, 0.85, 3]], 'shelfDishes');
  buildJars(ctx, [[1.25, top(0), sz, 0.14, 0.05], [1.42, top(0), sz + 0.02, 0.19, 0.055], [1.6, top(0), sz, 0.12, 0.048], [3.55, top(0), sz, 0.2, 0.055], [2.65, top(1), sz, 0.16, 0.05], [2.83, top(1), sz + 0.02, 0.21, 0.052]]);
  buildPots(ctx, [[2.35, cfg.backCounter.topY, zb + 0.4, 0.15, 0.2, 'steel'], [2.8, cfg.backCounter.topY, zb + 0.38, 0.115, 0.14, 'copper']]);
}
