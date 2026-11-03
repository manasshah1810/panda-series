import * as THREE from 'three';
/** Builds the named anchor Objects (stable names; later episodes depend on them). Positions come from the config only. */
export function buildAnchors(cfg, root) {
  const a = {}, mk = (name, p, ry = 0) => { const o = new THREE.Object3D(); o.name = name; o.position.set(p[0], p[1], p[2]); o.rotation.y = ry; root.add(o); a[name] = o; return o; };
  const B = cfg.cuttingBoard, I = cfg.island, bc = cfg.backCounter, H = bc.hood, S = cfg.shelves, W = cfg.window, R = cfg.room;
  mk('pandaMark', cfg.panda.mark, cfg.panda.startRotY);
  mk('boardCenter', B.center);
  mk('knifeStickPoint', [B.center[0], B.center[1] + B.size[2], B.center[2]]);          // normal = +Y
  mk('islandTopCenter', [(I.x0 + I.x1) / 2, I.topY, (I.z0 + I.z1) / 2]);
  mk('sinkTap', [bc.sink.x, 1.25, R.backWallZ + 0.35]);               // spout tip (drip falls from here)
  mk('hoodLight', [H.x, H.bottomY - 0.05, R.backWallZ + H.bottomD / 2]);
  mk('windowLight', [R.rightWallX, W.sillY + W.height / 2, W.centerZ]);
  mk('brassRail', [0, cfg.rail.y, cfg.rail.z]);
  mk('shelfLeft', [S.x0 + 0.45, S.levels[0] + S.thick / 2, R.backWallZ + S.depth / 2]);
  mk('shelfRight', [S.x1 - 0.45, S.levels[1] + S.thick / 2, R.backWallZ + S.depth / 2]);
  mk('plantVase', [cfg.vase.x, bc.topY, cfg.vase.z]);
  mk('ingredientLineStart', [2.9, I.topY, 1.75]);
  mk('ingredientLineEnd', [4.3, I.topY, 1.75]);
  mk('potPlacementPoint', [bc.cooktop.x + 0.2, bc.topY + 0.045, R.backWallZ + 0.4 + 0.13 + 0.075]);   // front-right burner grate
  mk('bowlPlacementPoint', [2.75, I.topY, 1.3]);
  return a;
}
