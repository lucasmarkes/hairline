import { hull, open, poly, ringAt, rrect, run, type PrismPaths, type Projector, type Ring, type Sample } from "./core/iso";

/**
 * Slabs: the tiles, plates and frames of the graph figures, drawn whole. Not
 * in src/core, so the skill's kernel and the pages it wrote stay as they are.
 */

/**
 * A prism whose lid is drawn whole. The silhouette carries the lid's front
 * edge, so the lid reads as a face on its band, and the crease is the inset
 * ring all round, a lip.
 */
export function slab(
  P: Projector,
  front: (q: Sample) => boolean,
  ring: readonly Sample[],
  inner: readonly Sample[] | null | undefined,
  z0: number,
  z1: number,
): PrismPaths {
  return {
    sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))) + open(ringAt(P, run(ring, front), z1)),
    crease: inner ? poly(ringAt(P, inner, z1)) : "",
  };
}

/** A rounded footprint and its lip, inset by b, sampled finely enough for a large tile: eight samples per corner. */
export const lid = (x0: number, y0: number, x1: number, y1: number, r: number, b: number): [Ring, Ring] => [
  rrect(x0, y0, x1, y1, r, 8),
  rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b), 8),
];
