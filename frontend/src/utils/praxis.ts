import type { TFunction } from 'i18next'
import { UNSCORED_MODERATION_STATUSES, type PraxisCardOut } from '../api/praxis'
import {
  scoreBreakdown,
  type ScoredPraxis,
} from '../components/praxisCard/scoreStamp/scoreBreakdown'

/**
 * Praxis mode helpers (#992).
 *
 * A duel is two solo praxes linked by a `Duel` row (ADR-0011): a duel side is
 * stored `type='solo'` + a non-null `duel_id`, there is no `type='duel'` praxis.
 * So any surface that labels a praxis by `type` alone reads an accepted duel as
 * "Solo". Gate on duel presence FIRST, then fall back to the stored type.
 */

/** True when this praxis is a side of a duel — the `duel_id` is populated. */
export function isDuelPraxis(praxis: Pick<PraxisCardOut, 'duel_id'>): boolean {
  return praxis.duel_id != null
}

/**
 * The mode label for a praxis: "Duel" when it is a duel side, otherwise the
 * label for its stored type ("Solo" / "Collab"). Reads the `praxisType.*` keys
 * from the `common` catalog.
 */
export function praxisModeLabel(
  praxis: Pick<PraxisCardOut, 'type' | 'duel_id'>,
  t: TFunction<'common'>,
): string {
  return isDuelPraxis(praxis) ? t('praxisType.duel') : t(`praxisType.${praxis.type}`)
}

/**
 * True when the score stamp beside this praxis already prints the task's point
 * value as its total, so a meta line that repeats the figure says nothing
 * (#1833) — a card read `10 pts` … `10.0 POINTS`, and so did all eight
 * praxis-detail task-reference lines.
 *
 * Two clauses, and neither is a new rule:
 *
 *  - The stamp has to be MOUNTED. `ScoreStamp` renders nothing on a praxis that
 *    banked no points (#1444) and praxis detail drops the whole panel with it
 *    (`scoreWasBanked`), so on `failed`/`hidden` the meta figure is the only
 *    points readout the surface has left and it must stay.
 *  - `scoreBreakdown().base === null` IS #1131's `baseRestatesTotal`, reached
 *    through the value the selector already publishes rather than by writing
 *    the comparison a second time. The base row is null precisely when no
 *    term — multiplier, metatask, habit bonus or vote — has moved the total off
 *    the base, and `total === base` besides, so a payload whose `score` has
 *    drifted from its own terms keeps both figures legible.
 *
 * The moment the two diverge the meta figure comes back on its own, because the
 * two answer different questions: what the TASK is worth, and what THIS PRAXIS
 * scored. That self-healing is why the figure is suppressed rather than deleted.
 *
 * Lives here, beside the other cross-surface praxis facts, because the card
 * slot (`components/praxisCard/shared`) and the detail archetypes are in
 * different chunks and neither should have to import the other's module to
 * share one predicate.
 */
export function stampRestatesTaskPoints(
  praxis: ScoredPraxis & Pick<PraxisCardOut, 'moderation_status'>,
): boolean {
  if (UNSCORED_MODERATION_STATUSES.has(praxis.moderation_status)) return false
  return scoreBreakdown(praxis).base === null
}
