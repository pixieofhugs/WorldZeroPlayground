import type { ScoredPraxis } from "./scoreBreakdown";
import { pickVariant } from "../../../utils/factionDispatch";
import { surfaceMap } from "../../../factions";
import DefaultScoreStamp from "./DefaultScoreStamp";

/**
 * The `scoreStamp` surface dispatcher (ADR-0049).
 *
 * #821 shipped ONE presentation — a tilted bordered plate with four colour props
 * — called unconditionally by all nine archetypes, which erased every faction's
 * signature total mark (UA's ensō, Everymen's rubber-stamp roundel, the
 * Ephemerists' rubric, Snide's Anton numeral, the rainbow-clipped total). The
 * design specifies TWO objects per card: a score BOX (broadly the same shape
 * everywhere) and a total MARK (the faction's own device).
 *
 * So the stamp is now a registered faction surface, dispatched by the task's
 * faction slug exactly like `praxisCard`, with `Default*` fall-through
 * (ADR-0039). A faction that has not authored its stamp yet renders the
 * unaffiliated spectrum stamp — the normal partial-registration case, not a
 * degraded one. Per-faction stamps land with #840 / #841 / #842.
 *
 * The stamp is SIZE-AGNOSTIC: mobile renders this same component (the design's
 * mobile guidance reuses the card's score presentation unchanged), which is why
 * the invented mobile `BASE ∣ MULT ∣ VOTES ∣ TOT` strip is gone.
 */
/**
 * Everything ANY stamp reads off a praxis — structural, like the `ScoredPraxis`
 * it extends, so both `PraxisCardOut` (cards) and `PraxisOut` (detail, and the
 * composer) satisfy it without a cast (#1079).
 *
 * The score terms belong to `scoreBreakdown`'s contract; these two do not, so
 * they are declared HERE rather than pushed into `ScoredPraxis`. `ScoredPraxis`
 * is the arithmetic the shared selector performs — a crown flag and a dispatch
 * slug are presentation inputs of this surface, and a future consumer that only
 * wants the rows shouldn't have to carry them.
 *
 * These are the only two extras, verified across all eight registered stamps:
 * every skin reads `score` + the breakdown terms, plus `is_top_for_task` for the
 * crown; the dispatcher alone reads `task_faction_slug`.
 */
export interface StampablePraxis extends ScoredPraxis {
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean;
  /** The task's faction: what the stamp surface dispatches on (ADR-0039). */
  task_faction_slug: string | null;
}

export interface ScoreStampProps {
  praxis: StampablePraxis;
  /**
   * Set false when the surface draws its own TaskCrown (the faction pages, and
   * the mobile cards, whose body already floats one over the frame).
   */
  showCrown?: boolean;
}

export default function ScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const Stamp = pickVariant(
    surfaceMap("scoreStamp"),
    praxis.task_faction_slug,
    DefaultScoreStamp,
  );
  return <Stamp praxis={praxis} showCrown={showCrown} />;
}
