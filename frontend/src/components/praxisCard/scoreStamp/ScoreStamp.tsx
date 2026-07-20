import type { PraxisCardOut } from "../../../api/praxis";
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
export interface ScoreStampProps {
  praxis: PraxisCardOut;
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
