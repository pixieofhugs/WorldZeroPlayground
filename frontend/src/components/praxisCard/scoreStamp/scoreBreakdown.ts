/**
 * The shared, faction-INDEPENDENT half of the score stamp (ADR-0049, ADR-0053).
 *
 * ADR-0049 splits the stamp on the logic/presentation seam: this module owns the
 * row SELECTION — which of base / mult / meta / votes / total a card may show —
 * and every faction owns what those rows look like. One selector keeps all nine
 * skins honest; a faction that disagrees with the rows here is wrong, not
 * different.
 *
 * ADR-0053 made this the ONLY place the breakdown is resolved. A praxis has one
 * number, `score`, and carries the terms behind it; nothing anywhere derives
 * vote-points or a multiplier by subtraction (the old Merit assumption).
 */

/**
 * The score fields every praxis payload carries — structural, so both
 * `PraxisCardOut` (cards) and `PraxisOut` (detail) satisfy it (ADR-0053).
 */
export interface ScoredPraxis {
  task_point_value: number;
  metatask_points: number;
  display_multiplier: number;
  points_from_votes: number;
  score: number;
}

export interface ScoreBreakdown {
  base: number;
  /** The display multiplier, or null when the mult row is hidden (×1.0). */
  mult: number | null;
  /** Metatask points, or null when the meta row is hidden (`≤ 0`). */
  meta: number | null;
  votes: number;
  total: number;
}

/**
 * Resolve the rows a stamp should show (ADR-0053):
 *  - mult row only when `display_multiplier !== 1`
 *  - meta row only when `metatask_points > 0`
 *  - votes row always (`+0` is valid)
 *  - total to 1 decimal at the render sites
 *
 * A duel side's multiplier is live and provisional (ADR-0052) — a side that is
 * currently behind legitimately shows a loss modifier, ×0.0 for Snide.
 */
export function scoreBreakdown(praxis: ScoredPraxis): ScoreBreakdown {
  const rawMult = praxis.display_multiplier ?? 1;
  const rawMeta = praxis.metatask_points ?? 0;
  return {
    base: praxis.task_point_value ?? 0,
    mult: rawMult !== 1 ? rawMult : null,
    meta: rawMeta > 0 ? rawMeta : null,
    votes: praxis.points_from_votes ?? 0,
    total: praxis.score ?? 0,
  };
}

/** `×0.80` — two decimals, matching the ADR-0047 sample. */
export function formatMult(mult: number): string {
  return `×${mult.toFixed(2)}`;
}
