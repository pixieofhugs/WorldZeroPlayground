import type { PraxisCardOut } from "../../../api/praxis";

/**
 * The shared, faction-INDEPENDENT half of the score stamp (ADR-0047, ADR-0049).
 *
 * ADR-0049 splits the stamp on the logic/presentation seam: this module owns the
 * row SELECTION — which of base / mult / meta / votes / total a card may show —
 * and every faction owns what those rows look like. One selector keeps all nine
 * skins honest; a faction that disagrees with the rows here is wrong, not
 * different. Reads the #819 breakdown fields off `PraxisCardOut` and never
 * derives vote-points by subtraction (the old Merit assumption in
 * `PraxisScoreHero`).
 */

export interface ScoreBreakdown {
  base: number;
  /** The display multiplier, or null when the mult row is hidden (collab / ×1.0). */
  mult: number | null;
  /** Metatask points, or null when the meta row is hidden (`≤ 0`). */
  meta: number | null;
  votes: number;
  total: number;
}

/**
 * Resolve the rows a stamp should show (ADR-0047):
 *  - mult row only when `display_multiplier != null && !== 1.0`
 *  - meta row only when `metatask_points > 0`
 *  - votes row always (`+0` is valid)
 *  - total to 1 decimal at the render sites
 */
export function scoreBreakdown(praxis: PraxisCardOut): ScoreBreakdown {
  const rawMult = praxis.display_multiplier;
  const showMult = rawMult != null && rawMult !== 1;
  const rawMeta = praxis.metatask_points ?? 0;
  return {
    base: praxis.base_points ?? 0,
    mult: showMult ? rawMult : null,
    meta: rawMeta > 0 ? rawMeta : null,
    votes: praxis.points_from_votes ?? 0,
    total: praxis.total ?? 0,
  };
}

/** `×0.80` — two decimals, matching the ADR-0047 sample. */
export function formatMult(mult: number): string {
  return `×${mult.toFixed(2)}`;
}
