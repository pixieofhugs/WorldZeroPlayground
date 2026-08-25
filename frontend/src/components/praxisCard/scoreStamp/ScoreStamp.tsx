import type { ScoredPraxis } from "./scoreBreakdown";
import { resolveVariant } from "../../../utils/factionDispatch";
import { surfaceMap } from "../../../factions";
import {
  UNSCORED_MODERATION_STATUSES,
  type ModerationStatus,
} from "../../../api/praxis";

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
 *
 * NO SKIN DECLARES `flex-shrink: 0`, AND THAT IS THE CONTRACT (#2114). All eight
 * did, which froze the widest of them at its cap in every mount that lays the
 * stamp beside something else — the praxis card's heading row, the composer's
 * task slip, the detail rail's centring flex — so the text next to it absorbed
 * every pixel a narrow surface was short. Unfrozen, a stamp still cannot be
 * squeezed below what it draws: `min-width` stays `auto`, whose used value is
 * the skin's own min-content size (the na plate's padding around its 96px mark,
 * Coven's 150px arch, S.N.I.D.E.'s 116px tag). That floor is per-skin, correct
 * by construction and needs no number written down anywhere. Re-adding the
 * freeze to "protect" a skin re-breaks its neighbour instead; if a skin ever
 * genuinely must not yield, give it a `min-width` and say why.
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
 * These are the only extras, verified across all eight registered stamps: every
 * skin reads `score` + the breakdown terms, plus `is_top_for_task` for the
 * crown; the dispatcher alone reads `task_faction_slug` and
 * `moderation_status`.
 */
export interface StampablePraxis extends ScoredPraxis {
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean;
  /** The task's faction: what the stamp surface dispatches on (ADR-0039). */
  task_faction_slug: string | null;
  /** Whether the total was banked at all — see the gate below (#1444). */
  moderation_status: ModerationStatus;
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
  /**
   * No stamp on a praxis that banked nothing (#1444).
   *
   * #1373 ruled and shipped that a `failed` praxis contributes 0 to its author's
   * score; `hidden` never contributed. Every skin below reads `score`, so on
   * those two states the card said "failed" in its banner and `13.6 POINTS` in
   * its stamp — a figure nobody holds. The banner is the honest signal and it
   * stays; ADR-0047's rule that a row exists only when it tells the viewer
   * something true applies a level up, to the whole mark.
   *
   * The gate is HERE, not in a card slot, because ADR-0049 made this the single
   * mount for every surface that shows a total (the nine cards, the nine
   * praxis-detail rails, the composer's waiting slip). Only `failed` and
   * `hidden` — `flagged` is awaiting a ruling and still counts, which is why
   * this reads the one shared set rather than naming a state inline.
   *
   * Nothing else about an unscored praxis changes: it keeps its place in the
   * feed, its banner, and its votes (the #1373 ruling).
   */
  if (UNSCORED_MODERATION_STATUSES.has(praxis.moderation_status)) return null;
  const Stamp = resolveVariant(
    surfaceMap("scoreStamp"),
    praxis.task_faction_slug,
  );
  return <Stamp praxis={praxis} showCrown={showCrown} />;
}
