/** Free geometries, materials and any textures they reference under `object`. Returns counts for verification. */
export function disposeObject(object) {
  const geos = new Set(), mats = new Set(), texs = new Set();
  object.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => mats.add(x));
  });
  mats.forEach((m) => { for (const v of Object.values(m)) if (v && v.isTexture) texs.add(v); });
  geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); texs.forEach((t) => t.dispose());
  return { geometries: geos.size, materials: mats.size, textures: texs.size };
}
