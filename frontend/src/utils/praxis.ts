import type { TFunction } from 'i18next'
import { UNSCORED_MODERATION_STATUSES, type PraxisCardOut } from '../api/praxis'
import {
  scoreBreakdown,
  type ScoredPraxis,
} from '../components/praxisCard/scoreStamp/scoreBreakdown'

/**
 * Praxis mode helpers (#992). A duel side is stored `type='solo'` with a
 * `duel_id` (ADR-0011), so check duel presence before `type`.
 */

export function isDuelPraxis(praxis: Pick<PraxisCardOut, 'duel_id'>): boolean {
  return praxis.duel_id != null
}

export function praxisModeLabel(
  praxis: Pick<PraxisCardOut, 'type' | 'duel_id'>,
  t: TFunction<'common'>,
): string {
  return isDuelPraxis(praxis) ? t('praxisType.duel') : t(`praxisType.${praxis.type}`)
}

/**
 * True when the mounted score stamp already prints the task's points as its
 * total, so a meta line repeating it is noise (#1833). Unscored praxes have no
 * stamp (#1444), so the meta figure stays. `base === null` is #1131's
 * `baseRestatesTotal`; once totals diverge the figure returns on its own.
 */
export function stampRestatesTaskPoints(
  praxis: ScoredPraxis & Pick<PraxisCardOut, 'moderation_status'>,
): boolean {
  if (UNSCORED_MODERATION_STATUSES.has(praxis.moderation_status)) return false
  return scoreBreakdown(praxis).base === null
}
